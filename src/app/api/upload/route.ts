import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

import { getEmbeddingsTransformer, searchArgs } from '@/utils/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas';
import { CharacterTextSplitter } from 'langchain/text_splitter';

const DOCUMENT_PREFIX = 'documents/';

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.\-_]/g, '');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const formValues = Array.from(formData.values());

    if (formValues.length === 0) {
      console.log('No files found.');
      return NextResponse.json({ message: 'No files found' }, { status: 400 });
    }

    const uploadedFile = formValues.find(
      (value): value is File => value instanceof File
    );

    if (!(uploadedFile instanceof File)) {
      console.log('Uploaded file is not in the expected format.');
      return NextResponse.json({ message: 'Uploaded file is not in the expected format' }, { status: 400 });
    }

    console.log('Starting upload process...');

    const documentId = randomUUID();
    const originalName = sanitizeFileName(uploadedFile.name || 'document.pdf');
    const fileName = originalName.endsWith('.pdf') ? originalName : `${originalName}.pdf`;
    const fileKey = `${DOCUMENT_PREFIX}${documentId}/${fileName}`;

    console.log(`Uploading file to Vercel Blob with key: ${fileKey}`)
    const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());

    const blob = await put(fileKey, fileBuffer, {
      access: 'public',
      contentType: uploadedFile.type || 'application/pdf',
    });
    console.log('File uploaded to Vercel Blob:', blob.url);

    console.log('Parsing PDF...');
    const { text } = await pdf(fileBuffer);
    console.log('PDF parsed successfully.');

    console.log('Splitting text into chunks...');
    const chunks = await new CharacterTextSplitter({
      separator: '\n',
      chunkSize: 1000,
      chunkOverlap: 100,
    }).splitText(text);
    console.log(`Text split into ${chunks.length} chunks.`);

    const metadata = chunks.map(() => ({
      source: blob.url,
      fileName,
      documentId,
    }));

    console.log('Creating embeddings and saving to MongoDB...');
    await MongoDBAtlasVectorSearch.fromTexts(
      chunks,
      metadata,
      getEmbeddingsTransformer(),
      searchArgs()
    );
    console.log('Embeddings created and saved to MongoDB.');

    console.log('Upload process completed successfully.');
    return NextResponse.json(
      {
        message: 'Uploaded to MongoDB and stored in Blob',
        document: {
          name: fileName,
          url: blob.url,
          pathname: blob.pathname,
          documentId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during processing.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
