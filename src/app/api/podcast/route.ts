import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCollection } from '@/utils/openai';
import OpenAI from 'openai';

const openai = new OpenAI();

async function* textChunker(text: string, maxChunkSize: number): AsyncGenerator<string> {
  let currentChunk = '';
  const sentences = text.split(/(?<=[.?!])\s+/g);

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      yield currentChunk;
      currentChunk = '';
    }
    currentChunk += sentence;
  }

  if (currentChunk) {
    yield currentChunk;
  }
}

export async function POST(req: NextRequest) {
  const authed = cookies().get('auth')?.value === '1';
  if (!authed) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  console.log('Podcast generation request received');
  const { documentId } = await req.json();
  console.log(`Document ID: ${documentId}`);

  if (!documentId) {
    console.error('Missing documentId');
    return NextResponse.json({ message: 'Missing documentId' }, { status: 400 });
  }

  try {
    // 1. Get document content from embeddings
    console.log('Fetching document from vector store...');
    const vectorCollection = getCollection();
    const chunks = await vectorCollection
      .find({ documentId }, { projection: { text: 1 } })
      .toArray();
    const text = chunks.map((chunk) => chunk.text).join('\n');
    console.log(`Text retrieved from vector store, length: ${text.length}`);

    if (!text.trim()) {
      console.error('No textual content found in vector store');
      return NextResponse.json(
        { message: 'Das Dokument enthält keinen auslesbaren Text für den Podcast.' },
        { status: 400 },
      );
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of textChunker(text, 4000)) {
          console.log(`Processing chunk of length ${chunk.length}`);
          const speech = await openai.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: chunk,
          });

          const buffer = Buffer.from(await speech.arrayBuffer());
          controller.enqueue(buffer);
        }
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error creating podcast:', error);
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message }, { status: 500 });
  }
}
