import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LangChainStream, Message, StreamingTextResponse } from 'ai';

import { Document } from '@langchain/core/documents';

import { getCollection, vectorStore } from '@/utils/openai';

const documentPostFilter = (documentId: string) => ({
  postFilterPipeline: [
    {
      $match: { documentId },
    },
  ],
});

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

    const store = vectorStore(apiKey);
    const vectorCollection = documentId ? getCollection() : null;
    let previewDocs: Document[] = [];

    // Pre-flight check for embeddings
    if (documentId && vectorCollection) {
      const embeddingsCount = await vectorCollection.countDocuments({
        documentId,
      });
      console.log('Embedding preflight check', { documentId, embeddingsCount });

      if (embeddingsCount === 0) {
        return NextResponse.json(
          {
            error: 'NO_EMBEDDINGS_FOUND',
            message:
              'Für dieses Dokument konnten keine relevanten Inhalte gefunden werden. Möglicherweise müssen die Einbettungen neu generiert werden.',
          },
          { status: 422 },
        );
      }

      // Sample a handful of chunks directly from the collection to ensure we have context even
      // when the initial similarity search struggles (e.g. very general questions).
      const seedDocsRaw = await vectorCollection
        .find(
          {
            documentId,
          },
          {
            projection: {
              text: 1,
              metadata: 1,
              source: 1,
            },
          },
        )
        .limit(5)
        .toArray();

      previewDocs = seedDocsRaw
        .map((item) => {
          const text = typeof item.text === 'string' ? item.text.trim() : '';
          if (!text) return null;

          const metadata =
            item.metadata && typeof item.metadata === 'object'
              ? item.metadata
              : ({} as Record<string, unknown>);

          if (!metadata.documentId) {
            metadata.documentId = documentId;
          }
          if (typeof item.source === 'string') {
            metadata.source = item.source;
          }

          return new Document({
            pageContent: text,
            metadata,
          });
        })
        .filter((doc): doc is Document => doc !== null);

      // Also run a similarity search for additional relevant chunks.
      const semanticPreview = await store.similaritySearch(
        question,
        20,
        documentPostFilter(documentId) as any,
      );
      previewDocs.push(...semanticPreview);
      console.log('Preview relevant docs', {
        documentId,
        previewCount: previewDocs.length,
        totalFetched: previewDocs.length,
        sampleMetadata: previewDocs.slice(0, 3).map((doc) => doc.metadata),
      });
    }

    const { stream, handlers, writer } = LangChainStream();

    const retriever = store.asRetriever(
      documentId ? { k: 8, filter: documentPostFilter(documentId) as any } : { k: 8 },
    );

    const originalGetRelevantDocuments = retriever.getRelevantDocuments.bind(retriever);
    retriever.getRelevantDocuments = async (query, runManager) => {
      const docs = await originalGetRelevantDocuments(query, runManager);
      if (docs.length > 0) {
        return docs;
      }

      if (documentId) {
        const fallbackDocs = await store.similaritySearch(
          query,
          16,
          documentPostFilter(documentId) as any,
        );
        if (fallbackDocs.length > 0) {
          console.log('Similarity fallback returned docs after initial miss', {
            documentId,
            count: fallbackDocs.length,
          });
          return fallbackDocs;
        }
      }

      if (previewDocs.length > 0) {
        console.log('Using preview docs as fallback for retriever', {
          documentId: documentId ?? null,
          fallbackCount: previewDocs.length,
        });
        return previewDocs;
      }

      if (documentId && vectorCollection) {
        const textFallback = await vectorCollection
          .find(
            {
              documentId,
            },
            {
              projection: {
                text: 1,
                metadata: 1,
                source: 1,
              },
            },
          )
          .limit(5)
          .toArray();

        if (textFallback.length > 0) {
          console.log('Fallback to raw text chunks', {
            documentId,
            chunkCount: textFallback.length,
          });
          return textFallback
            .map((item) => {
              const text = typeof item.text === 'string' ? item.text.trim() : '';
              if (!text) return null;

              const metadata =
                item.metadata && typeof item.metadata === 'object'
                  ? item.metadata
                  : ({} as Record<string, unknown>);

              if (!metadata.documentId) {
                metadata.documentId = documentId;
              }
              if (typeof item.source === 'string') {
                metadata.source = item.source;
              }

              return new Document({
                pageContent: text,
                metadata,
              });
            })
            .filter((doc): doc is Document => doc !== null);
        }
      }

      return [];
    };

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
