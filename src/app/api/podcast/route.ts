import { NextRequest, NextResponse } from 'next/server';
import { list } from '@vercel/blob';
import pdf from 'pdf-parse';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(req: NextRequest) {
  const { documentId } = await req.json();

  if (!documentId) {
    return new NextResponse('Missing documentId', { status: 400 });
  }

  try {
    // 1. Get document content
    const blob = (await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` })).blobs[0];
    if (!blob) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const response = await fetch(blob.url);
    const buffer = await response.arrayBuffer();
    const data = await pdf(buffer);
    const text = data.text;

    // 2. Call ElevenLabs API
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
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
      return new NextResponse('Failed to generate podcast', { status: 500 });
    }

    const audio = await elevenLabsResponse.arrayBuffer();

    // 3. Return audio
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
