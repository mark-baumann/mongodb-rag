import { NextResponse } from 'next/server';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
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
    const body = await req.json();
    const messages: Message[] = body.messages ?? [];
    const documentId: string | undefined = body.documentId;
    const question = messages[messages.length - 1]?.content?.trim();
    const providedKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
    const apiKey = providedKey || process.env.OPENAI_API_KEY;

    if (!question) {
      return NextResponse.json({ message: 'No question provided' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ message: 'No OpenAI API key provided' }, { status: 400 });
    }

    const { stream, handlers } = LangChainStream();

    const retrieverOptions: Record<string, unknown> = {
      searchType: 'mmr',
      searchKwargs: { fetchK: 10, lambda: 0.25 },
    };

    if (documentId) {
      retrieverOptions.filter = { preFilter: { documentId } };
    }

    const retriever = vectorStore(apiKey).asRetriever(retrieverOptions);

    const chatHistory = formatHistory(messages.slice(0, -1));

    const model = new ChatOpenAI({
      temperature: 0.2,
      streaming: true,
      callbacks: [handlers],
      openAIApiKey: apiKey,
    });

    const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
      questionGeneratorTemplate: `Unterhalte dich ausschließlich über Inhalte aus dem Dokument.
Vorherige Unterhaltung:
{chat_history}

Frage: {question}`,
    });

    await chain.call({
      question,
      chat_history: chatHistory,
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error during chat:', error);
    return NextResponse.json({ message: 'Error processing request' }, { status: 500 });
  }
}
