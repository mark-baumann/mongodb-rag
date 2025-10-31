import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCollection } from '@/utils/openai';
import OpenAI from 'openai';
import { list, put } from '@vercel/blob';

const AllowedVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
type TTSVoice = typeof AllowedVoices[number];
const toVoice = (v: unknown): TTSVoice => {
  if (typeof v !== 'string') return 'alloy';
  const s = v.trim().toLowerCase();
  return (AllowedVoices as readonly string[]).includes(s as any)
    ? (s as TTSVoice)
    : 'alloy';
};

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
  const {
    documentId,
    topic = '',
    targetMinutes,
    voice = 'alloy',
    persona = '',
    speakingRate = 'normal', // 'langsam' | 'normal' | 'schnell'
    ttsChunkSize = 4000,
    maxContextChars = 12000,
  } = await req.json();
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

    // 2. Build a podcast script first based on optional topic and target duration
    const minutes =
      typeof targetMinutes === 'number' && Number.isFinite(targetMinutes)
        ? Math.max(0.25, Math.min(120, targetMinutes))
        : 5;
    const approxWords = Math.round(minutes * 140); // ~140 wpm
    const promptContext = text.length > maxContextChars ? text.slice(0, maxContextChars) : text; // keep prompt bounded

    let script = '';
    try {
      console.log('Generating podcast script via Chat Completions...');
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content:
              'Du bist ein professioneller deutschsprachiger Podcast-Autor. Verfasse ein natürlich klingendes, gesprochenes Skript. Keine Aufzählungen, keine Überschriften, keine Markdown-Formatierung. Verwende nur Fakten aus dem Kontext. Wenn Informationen fehlen, spekuliere nicht.',
          },
          {
            role: 'user',
            content: [
              `Kontext (Auszug aus dem Dokument):\n\n${promptContext}`,
              '',
              topic ? `Thema/Wunschfokus: ${topic}` : '',
              persona ? `Persona/Stil: ${persona}` : '',
              speakingRate ? `Sprechtempo: ${speakingRate} (Passe den Sprachfluss im Text entsprechend an — z. B. mit Übergängen, Pausenhinweisen).` : '',
              `Bitte schreibe ein zusammenhängendes Podcast-Monolog-Skript auf Deutsch mit etwa ${approxWords} Wörtern (≈ ${minutes.toFixed(2)} Minuten bei normaler Sprechgeschwindigkeit).`
            ].filter(Boolean).join('\n')
          },
        ],
        max_tokens: 4000,
      });
      script = (completion.choices?.[0]?.message?.content ?? '').toString().trim();
      console.log(`Script length: ${script.length}`);
    } catch (scriptError) {
      console.error('Failed to generate podcast script, falling back to raw text excerpt.', scriptError);
      script = text.slice(0, 8000);
    }

    // 3. Convert the script to audio (accumulate -> persist -> respond)
    const estimatedSeconds = Math.round((script.split(/\s+/).length / 140) * 60);
    const buffers: Buffer[] = [];
    const size =
      typeof ttsChunkSize === 'number' && ttsChunkSize > 500
        ? Math.min(ttsChunkSize, 8000)
        : 4000;
    for await (const chunk of textChunker(script, size)) {
      console.log(`Processing TTS chunk of length ${chunk.length}`);
      const speech = await openai.audio.speech.create({
        model: 'tts-1',
        voice: toVoice(voice),
        input: chunk,
      });
      const buffer = Buffer.from(await speech.arrayBuffer());
      buffers.push(buffer);
    }

    const finalBuffer = Buffer.concat(buffers);
    if (finalBuffer.length === 0) {
      console.error('No audio produced by TTS');
      return NextResponse.json(
        { message: 'Konnte keine Audiodaten generieren.' },
        { status: 500 },
      );
    }

    const key = `podcasts/${documentId}.mp3`;
    let blobUrl: string | undefined;
    try {
      const result = await put(key, finalBuffer, {
        access: 'public',
        contentType: 'audio/mpeg',
      });
      blobUrl = result.url;
      console.log('Saved podcast to blob storage:', key, finalBuffer.length);
    } catch (saveErr) {
      console.error('Failed to persist podcast to blob storage', saveErr);
    }

    return new NextResponse(finalBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Estimated-Duration': String(estimatedSeconds),
        'X-Podcast-Topic': topic ? String(topic) : 'Podcast',
        'X-Voice': toVoice(voice),
        ...(blobUrl ? { 'X-Podcast-Url': blobUrl, 'X-Podcast-Key': key } : {}),
      },
    });
  } catch (error) {
    console.error('Error creating podcast:', error);
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authed = cookies().get('auth')?.value === '1';
  if (!authed) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ message: 'Missing documentId' }, { status: 400 });
  }
  try {
    const { blobs } = await list({ prefix: `podcasts/${documentId}.mp3` });
    const existing = blobs.find((b) => b.pathname.endsWith(`${documentId}.mp3`));
    if (!existing) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ url: existing.url, pathname: existing.pathname });
  } catch (e) {
    console.error('Failed to list existing podcast blob', e);
    return NextResponse.json({ message: 'Lookup failed' }, { status: 500 });
  }
}
