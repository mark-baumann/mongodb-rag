import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { list } from '@vercel/blob';
import pdf from 'pdf-parse';

const DOCUMENT_PREFIX = 'documents/';
const MAX_TEXT_LENGTH = 10000;

async function* textChunker(text: string): AsyncGenerator<string> {
  const sentences = text.split(/(?<=[.?!])\s+/);
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > MAX_TEXT_LENGTH) {
      yield currentChunk;
      currentChunk = "";
    }
    currentChunk += sentence + " ";
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
    // 1. Get document content
    console.log('Fetching document from Vercel Blob...');
    const blob = (await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` })).blobs[0];
    if (!blob) {
      console.error('Document not found');
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }
    console.log(`Document found: ${blob.url}`);

    console.log('Fetching PDF content...');
    const response = await fetch(blob.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Parsing PDF...');
    const data = await pdf(buffer);
    const text = data.text;
    console.log(`PDF parsed, text length: ${text.length}`);

    if (!text.trim()) {
      console.error('No textual content extracted from PDF');
      return NextResponse.json(
        { message: 'Das PDF enthält keinen auslesbaren Text für den Podcast.' },
        { status: 400 },
      );
    }

    // 2. Call ElevenLabs API for each chunk
    console.log('Calling ElevenLabs API...');
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      console.error('ElevenLabs API key not found');
      return NextResponse.json(
        { message: 'ELEVENLABS_API_KEY ist nicht gesetzt. Bitte trage den Schlüssel in den Umgebungsvariablen ein.' },
        { status: 500 },
      );
    }

    const audioChunks: Buffer[] = [];
    for await (const chunk of textChunker(text)) {
      console.log(`Processing chunk of length ${chunk.length}`);
      const elevenLabsResponse = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', // voice_id for Rachel
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: chunk,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      );

      if (!elevenLabsResponse.ok) {
        console.error(`ElevenLabs API request failed with status ${elevenLabsResponse.status}`);
        let errorBody: string | undefined;
        try {
          errorBody = await elevenLabsResponse.text();
          console.error(errorBody);
        } catch {
          console.error('Failed to read ElevenLabs error body.');
        }
        return NextResponse.json(
          {
            message: 'Die ElevenLabs API hat die Anfrage abgelehnt.',
            details: errorBody,
            status: elevenLabsResponse.status,
          },
          { status: 502 },
        );
      }
      console.log('ElevenLabs API request successful for chunk');

      const audioChunk = await elevenLabsResponse.arrayBuffer();
      audioChunks.push(Buffer.from(audioChunk));
    }

    if (audioChunks.length === 0) {
      console.error('No audio chunks were generated');
      return NextResponse.json(
        { message: 'Es konnte kein Audio erzeugt werden.' },
        { status: 500 },
      );
    }

    const combinedAudio = Buffer.concat(audioChunks);
    console.log(`Audio generated, size: ${combinedAudio.length}`);

    // 3. Return audio
    console.log('Returning audio...');
    return new NextResponse(combinedAudio, {
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
