import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCollection, getMongoClient } from '@/utils/openai';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
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

// Helper to get API key from header or env
function getOpenAIKey(req: NextRequest): string {
  const headerKey = req.headers.get('X-OpenAI-API-Key');
  return headerKey || process.env.OPENAI_API_KEY || '';
}

function getGoogleAPIKey(req: NextRequest): string {
  const headerKey = req.headers.get('X-Google-API-Key');
  return headerKey || process.env.GOOGLE_API_KEY || '';
}

// Modell-spezifische Kontext-Limits
const contextLimits: Record<string, number> = {
  'gpt-4o': 24000,
  'gpt-4o-mini': 16000,
  'gemini-1.5-pro': 100000,
  'gemini-1.5-flash': 50000,
  'gemini-2.0-flash-exp': 50000,
  'gemini-pro-latest': 100000,
  'gemini-flash-latest': 50000,
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildPodcastPrompt(params: {
  context: string;
  persona: string;
  targetWords: number;
  minutes: number;
}): string {
  const { context, persona, targetWords, minutes } = params;

  return `Du bist ein professioneller deutschsprachiger Podcast-Autor mit jahrelanger Erfahrung in der Erstellung fesselnder Audio-Inhalte.

AUFGABE: Erstelle ein natürlich klingendes, gesprochenes Podcast-Skript auf Deutsch.

QUALITÄTSANFORDERUNGEN:
- Verwende einen gesprächigen, authentischen Ton - als würdest du direkt mit dem Hörer sprechen
- Baue eine klare Struktur auf: Einstieg → Hauptteil → Zusammenfassung
- Nutze rhetorische Fragen, um den Hörer einzubeziehen
- Verwende konkrete Beispiele und Analogien, um komplexe Konzepte zu erklären
- Variiere Satzlänge und -struktur für natürlichen Sprachfluss
- Füge gelegentlich Übergänge ein ("Schauen wir uns das genauer an...", "Interessant ist auch...")

EINSCHRÄNKUNGEN:
- Keine Aufzählungen, Überschriften oder Markdown-Formatierung
- Verwende NUR Fakten aus dem bereitgestellten Kontext
- Spekuliere nicht über fehlende Informationen
- Vermeide Füllwörter und unnötige Wiederholungen

STIL: ${persona}

Kontext (Auszug aus dem Dokument):

${context}

Erstelle ein zusammenhängendes Monolog-Skript mit ca. ${targetWords} Wörtern (≈ ${minutes.toFixed(2)} Minuten bei normaler Sprechgeschwindigkeit).`;
}

// Generiere Podcast-Skript mit dem gewählten Modell
async function generatePodcastScript(params: {
  model: string;
  context: string;
  persona: string;
  targetWords: number;
  minutes: number;
  openaiApiKey: string;
  googleApiKey: string;
}): Promise<string> {
  const { model, context, persona, targetWords, minutes, openaiApiKey, googleApiKey } = params;
  const prompt = buildPodcastPrompt({ context, persona, targetWords, minutes });

  console.log(`Generating podcast script with model request: ${model}`);

  // OpenAI Modelle
  if (model.startsWith('gpt-')) {
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    const openai = new OpenAI({ apiKey: openaiApiKey });
    try {
      const completion = await openai.chat.completions.create({
        model: model,
        temperature: 0.7,
        messages: [
          { role: 'system', content: 'Du bist ein Experte für die Erstellung ansprechender Podcast-Skripte auf Deutsch.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 4000,
      });
      const script = (completion.choices?.[0]?.message?.content ?? '').toString().trim();
      console.log(`OpenAI script generated, length: ${script.length}`);
      return script;
    } catch (error) {
      console.error(`OpenAI script generation failed for model ${model}:`, error);
      throw error;
    }
  }

  // Gemini Modelle
  if (model.startsWith('gemini-')) {
    if (!googleApiKey) {
      throw new Error('Google API key not configured');
    }
    const genAI = new GoogleGenAI({ apiKey: googleApiKey });

    // MAPPING: Übersetzt Frontend-Namen in API-Namen, die laut deinem Log existieren
    const modelMapping: Record<string, string> = {
        'gemini-1.5-pro': 'gemini-pro-latest',       // Mapping basierend auf deinen Logs
        'gemini-1.5-flash': 'gemini-flash-latest',   // Mapping basierend auf deinen Logs
        'gemini-2.0-flash-exp': 'gemini-2.0-flash',  // Mapping auf stabile Version
    };

    // Nutze den gemappten Namen oder falle auf den ursprünglichen Namen zurück
    const targetModel = modelMapping[model] || model;
    
    if (targetModel !== model) {
        console.log(`Mapped model '${model}' to available API model '${targetModel}'`);
    }

    try {
      const result = await genAI.models.generateContent({
        model: targetModel, 
        contents: prompt,
        config: {
            temperature: 0.7,
            maxOutputTokens: 8192,
        }
      });
      
      const script = result.text ? result.text.trim() : '';
      if (!script) throw new Error('Empty response from Gemini');
      
      console.log(`Gemini script generated with ${targetModel}, length: ${script.length}`);
      return script;

    } catch (error: any) {
      console.error(`Gemini generation failed for ${targetModel}:`, error.message);
      
      // FALLBACK zu FLASH (Latest), falls Pro fehlschlägt
      if (targetModel.includes('pro')) {
        console.log('--- FALLBACK: Switching to gemini-flash-latest ---');
        try {
          const resultFallback = await genAI.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: { temperature: 0.7 }
          });
          const scriptFallback = resultFallback.text ? resultFallback.text.trim() : '';
          console.log(`Gemini script generated with fallback, length: ${scriptFallback.length}`);
          return scriptFallback;
        } catch (flashError) {
             console.error('Gemini fallback also failed', flashError);
             throw error; 
        }
      }
      throw error;
    }
  }

  throw new Error(`Unsupported model: ${model}`);
}

async function* textChunker(text: string, maxChunkSize: number): AsyncGenerator<string> {
  let currentChunk = '';
  const sentences = text.split(/(?<=[.?!])\s+/g);
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxChunkSize) {
      yield currentChunk;
      currentChunk = '';
    }
    currentChunk += sentence + ' ';
  }
  if (currentChunk) {
    yield currentChunk.trim();
  }
}

function mapVoiceToOpenAI(voice: string): TTSVoice {
  if ((AllowedVoices as readonly string[]).includes(voice)) {
    return voice as TTSVoice;
  }
  const geminiToOpenAI: Record<string, TTSVoice> = {
    'Achernar': 'nova', 'Aoede': 'shimmer', 'Autonoe': 'nova', 'Callirrhoe': 'shimmer',
    'Despina': 'nova', 'Erinome': 'shimmer', 'Gacrux': 'nova', 'Kore': 'shimmer',
    'Laomedeia': 'nova', 'Leda': 'shimmer', 'Pulcherrima': 'nova', 'Schedar': 'shimmer',
    'Sulafat': 'nova', 'Vindemiatrix': 'shimmer', 'Zephyr': 'nova',
    'Achird': 'onyx', 'Algenib': 'echo', 'Algieba': 'fable', 'Alnilam': 'onyx',
    'Charon': 'echo', 'Enceladus': 'fable', 'Fenrir': 'onyx', 'Iapetus': 'echo',
    'Orus': 'fable', 'Puck': 'onyx', 'Rasalgethi': 'echo', 'Sadachbia': 'fable',
    'Sadaltager': 'onyx', 'Umbriel': 'echo', 'Zubenelgenubi': 'fable',
  };
  return geminiToOpenAI[voice] || 'alloy';
}

async function synthesizeSpeech(params: {
  text: string;
  voice: string;
  model: string;
  openaiApiKey: string;
}): Promise<Buffer> {
  const { text, voice, openaiApiKey } = params;
  if (!openaiApiKey) {
    throw new Error('OpenAI API key required for text-to-speech');
  }
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const openAIVoice = mapVoiceToOpenAI(voice);
  const speech = await openai.audio.speech.create({
    model: 'tts-1',
    voice: openAIVoice,
    input: text,
  });
  return Buffer.from(await speech.arrayBuffer());
}

export async function POST(req: NextRequest) {
  console.log('Podcast generation request received');

  // Get API keys from headers or env
  const openaiApiKey = getOpenAIKey(req);
  const googleApiKey = getGoogleAPIKey(req);

  const body = await req.json();
  const {
    documentId,
    targetMinutes,
    model = 'gpt-4o',
    voice = 'alloy',
    persona = 'sachlich',
    ttsChunkSize = 4000,
  } = body;

  console.log(`Document ID: ${documentId}, Model: ${model}`);

  if (!documentId) {
    return NextResponse.json({ message: 'Missing documentId' }, { status: 400 });
  }

  // Check if we have the necessary API keys based on the model
  if (model.startsWith('gpt-') && !openaiApiKey) {
    return NextResponse.json({ message: 'OpenAI API key required for this model. Please add your API key in Settings.' }, { status: 401 });
  }
  if (model.startsWith('gemini-') && !googleApiKey) {
    return NextResponse.json({ message: 'Google API key required for this model. Please add your API key in Settings.' }, { status: 401 });
  }

  try {
    try {
      await getMongoClient().db('admin').command({ ping: 1 });
    } catch (e) {
      console.warn('MongoDB ping failed before query', e);
    }

    // 1. Get document content
    console.log('Fetching document from vector store...');
    const vectorCollection = getCollection();
    const chunks = await vectorCollection
      .find({ documentId }, { projection: { text: 1 } })
      .toArray();
    const text = chunks.map((chunk) => chunk.text).join('\n');
    console.log(`Text retrieved from vector store, length: ${text.length}`);

    if (!text.trim()) {
      return NextResponse.json(
        { message: 'Das Dokument enthält keinen auslesbaren Text für den Podcast.' },
        { status: 400 },
      );
    }

    // 2. Generate Script
    const minutes =
      typeof targetMinutes === 'number' && Number.isFinite(targetMinutes)
        ? Math.max(0.25, Math.min(120, targetMinutes))
        : 5;
    const approxWords = Math.round(minutes * 140);

    const maxContextChars = contextLimits[model] || 16000;
    const promptContext = text.length > maxContextChars ? text.slice(0, maxContextChars) : text;

    let script = '';
    try {
      console.log('Generating podcast script...');
      script = await generatePodcastScript({
        model,
        context: promptContext,
        persona,
        targetWords: approxWords,
        minutes,
        openaiApiKey,
        googleApiKey,
      });
      console.log(`Script generated successfully, length: ${script.length}`);
    } catch (scriptError) {
      console.error('Failed to generate podcast script with primary model, trying fallback...', scriptError);

      try {
        if (model !== 'gpt-4o-mini' && openaiApiKey) {
          console.log('Attempting fallback to gpt-4o-mini...');
          script = await generatePodcastScript({
            model: 'gpt-4o-mini',
            context: promptContext.slice(0, 16000),
            persona,
            targetWords: approxWords,
            minutes,
            openaiApiKey,
            googleApiKey,
          });
        } else {
          throw scriptError;
        }
      } catch (fallbackError) {
        console.error('Fallback also failed, using raw text excerpt.', fallbackError);
        script = text.slice(0, 8000);
      }
    }

    // 3. Convert to Audio with parallel processing
    console.log('Starting TTS conversion...');
    const estimatedSeconds = Math.round((script.split(/\s+/).length / 140) * 60);
    const size = typeof ttsChunkSize === 'number' && ttsChunkSize > 500 ? Math.min(ttsChunkSize, 8000) : 4000;

    // Collect all chunks first
    const ttsChunks: string[] = [];
    for await (const chunk of textChunker(script, size)) {
      if (chunk.trim()) ttsChunks.push(chunk);
    }
    console.log(`Total TTS chunks to process: ${ttsChunks.length}`);

    // Process chunks in parallel batches of 3 to respect rate limits
    const batchSize = 3;
    const buffers: Buffer[] = new Array(ttsChunks.length);

    for (let i = 0; i < ttsChunks.length; i += batchSize) {
      const batch = ttsChunks.slice(i, Math.min(i + batchSize, ttsChunks.length));
      const batchIndex = i;

      console.log(`Processing TTS batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(ttsChunks.length / batchSize)} (chunks ${i}-${i + batch.length - 1})`);

      const batchPromises = batch.map((chunk, idx) =>
        synthesizeSpeech({
          text: chunk,
          voice: voice,
          model: model,
          openaiApiKey,
        }).then(buffer => ({ buffer, index: batchIndex + idx }))
      );

      const batchResults = await Promise.all(batchPromises);
      for (const { buffer, index } of batchResults) {
        buffers[index] = buffer;
      }
    }

    const finalBuffer = Buffer.concat(buffers);
    console.log('TTS conversion completed');
    if (finalBuffer.length === 0) {
      return NextResponse.json({ message: 'Konnte keine Audiodaten generieren.' }, { status: 500 });
    }

    // 4. Persist
    const key = `podcasts/${documentId}.mp3`;
    let blobUrl: string | undefined;
    try {
      const result = await put(key, finalBuffer, {
        access: 'public',
        contentType: 'audio/mpeg',
        addRandomSuffix: false 
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
        'X-Podcast-Model': model,
        'X-Voice': mapVoiceToOpenAI(voice),
        ...(blobUrl ? { 'X-Podcast-Url': blobUrl, 'X-Podcast-Key': key } : {}),
      },
    });
  } catch (error) {
    console.error('Error creating podcast:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId');
  if (!documentId) {
    return NextResponse.json({ message: 'Missing documentId' }, { status: 400, headers: { 'cache-control': 'no-store' } });
  }
  try {
    let found: { url: string; pathname: string } | null = null;
    let cursor: string | undefined = undefined;
    do {
      const resp = await list({ prefix: 'podcasts/', cursor });
      for (const b of resp.blobs) {
        if (b.pathname.includes(documentId + '.mp3')) {
          found = { url: b.url, pathname: b.pathname };
          break;
        }
      }
      if (found) break;
      cursor = resp.cursor as string | undefined;
    } while (cursor);

    if (!found) {
      return NextResponse.json({ message: 'Not found' }, { status: 404, headers: { 'cache-control': 'no-store' } });
    }
    return NextResponse.json(found, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('Failed to list existing podcast blob', e);
    return NextResponse.json({ message: 'Lookup failed' }, { status: 500, headers: { 'cache-control': 'no-store' } });
  }
}