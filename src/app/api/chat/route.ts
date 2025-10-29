import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LangChainStream, Message, StreamingTextResponse } from 'ai';

import { vectorStore } from '@/utils/openai';

const formatHistory = (messages: Message[]): string =>
  messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => {
      const speaker = message.role === 'user' ? 'Human' : 'AI';
      return `${speaker}: ${message.content}`;
    })
    .join('\n');

export async function POST(req: Request) {
  try {
    const authed = cookies().get('auth')?.value === '1';
    if (!authed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const messages: Message[] = body.messages ?? [];
    const documentId: string | undefined = body.documentId;
    const question = messages[messages.length - 1]?.content?.trim();
    const providedKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiKey = providedKey || process.env.OPENAI_API_KEY;

    console.log('Received chat request', {
      documentId: documentId ?? null,
      messageCount: messages.length,
    });

    if (!question) {
      return NextResponse.json({ message: 'No question provided' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ message: 'No OpenAI API key provided' }, { status: 400 });
    }

    const { stream, handlers, writer } = LangChainStream();

    const store = vectorStore(apiKey);
    const retriever = store.asRetriever({ k: 8 });

    if (documentId) {
      const originalGetRelevantDocuments = retriever.getRelevantDocuments.bind(retriever);
      retriever.getRelevantDocuments = async (query, runManager) => {
        const docs = await originalGetRelevantDocuments(query, runManager);
        const filteredDocs = docs.filter(
          (doc) => doc.metadata?.documentId && doc.metadata.documentId === documentId,
        );

        if (filteredDocs.length > 0) {
          return filteredDocs;
        }

        const fallbackDocs = await store.similaritySearch(query, 12);
        const filteredFallback = fallbackDocs.filter(
          (doc) => doc.metadata?.documentId && doc.metadata.documentId === documentId,
        );

        return filteredFallback.length > 0 ? filteredFallback : docs;
      };
    }

    const chatHistory = formatHistory(messages.slice(0, -1));

    const answerPrompt = PromptTemplate.fromTemplate(`Du bist ein präziser Assistent, der ausschließlich Informationen aus dem bereitgestellten Dokument nutzt.
Antworte in klaren, vollständigen Sätzen auf Deutsch. Wiederhole keine Worte oder Sätze.
Wenn dir Informationen fehlen, sage ehrlich, dass sie im Dokument nicht vorhanden sind.

Frage: {question}
Kontext:
{context}

Antwort:`);

    const streamingModel = new ChatOpenAI({
      temperature: 0.2,
      streaming: true,
      callbacks: [handlers],
      openAIApiKey: apiKey,
    });

    const questionModel = new ChatOpenAI({
      temperature: 0.2,
      streaming: false,
      openAIApiKey: apiKey,
    });

    const chain = ConversationalRetrievalQAChain.fromLLM(streamingModel, retriever, {
      questionGeneratorTemplate: `Unterhalte dich ausschließlich über Inhalte aus dem Dokument.
Vorherige Unterhaltung:
{chat_history}

Frage: {question}`,
      qaChainOptions: {
        type: 'stuff',
        prompt: answerPrompt,
      },
      questionGeneratorChainOptions: {
        llm: questionModel,
      },
    });

    void chain
      .call({
        question,
        chat_history: chatHistory,
      })
      .catch(async (error) => {
        console.error('Error during chat execution:', error);
        const fallbackMessage =
          'Entschuldigung, beim Abrufen der Dokumentdaten ist ein Fehler aufgetreten. Bitte versuche es erneut.';
        try {
          await writer.ready;
          await writer.write(fallbackMessage);
          await writer.close();
        } catch (streamError) {
          console.error('Failed to send fallback message:', streamError);
          void writer.abort(error);
        }
      });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error during chat:', error);
    return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
  }
}
