import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import pdf from 'pdf-parse';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(req: NextRequest) {
  console.log('Podcast generation request received');
  const { documentId } = await req.json();
  console.log(`Document ID: ${documentId}`);

  if (!documentId) {
    console.error('Missing documentId');
    return new NextResponse('Missing documentId', { status: 400 });
  }

  try {
    // 1. Get document content
    console.log('Fetching document from Vercel Blob...');
    const blob = (await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` })).blobs[0];
    if (!blob) {
      console.error('Document not found');
      return new NextResponse('Document not found', { status: 404 });
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

    // 2. Call ElevenLabs API
    console.log('Calling ElevenLabs API...');
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      console.error('ElevenLabs API key not found');
      return new NextResponse('ElevenLabs API key not found', { status: 500 });
    }

    const elevenLabsResponse = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', // voice_id for Rachel
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: text,
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
      console.error(await elevenLabsResponse.text());
      return new NextResponse('Failed to generate podcast', { status: 500 });
    }
    console.log('ElevenLabs API request successful');

    const audio = await elevenLabsResponse.arrayBuffer();
    console.log(`Audio generated, size: ${audio.byteLength}`);

    // 3. Return audio
    console.log('Returning audio...');
    return new NextResponse(audio, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Error creating podcast:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
