
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pdf from 'pdf-parse';
import { getCollection, getEmbeddingsTransformer, searchArgs } from '@/utils/openai';
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas';

export async function POST(req: NextRequest) {
  try {
    const authed = cookies().get('auth')?.value === '1';
    if (!authed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { documentId } = body;

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ message: 'Invalid documentId provided' }, { status: 400 });
    }

    console.log(`Starting re-embedding process for documentId: ${documentId}`);

    const collection = getCollection();

    // 1. Find one chunk to get the file URL and name
    const existingDoc = await collection.findOne({ 'metadata.documentId': documentId });
    if (!existingDoc) {
      return NextResponse.json({ message: 'Document not found in vector store' }, { status: 404 });
    }
    const fileUrl = existingDoc.metadata?.source;
    const fileName = existingDoc.metadata?.fileName;

    if (!fileUrl || !fileName) {
        return NextResponse.json({ message: 'File source URL or name not found in document metadata' }, { status: 500 });
    }

    console.log(`Found file URL: ${fileUrl}. Deleting existing embeddings.`);

    // 2. Delete all existing embeddings for this document
    await collection.deleteMany({ 'metadata.documentId': documentId });
    console.log('Existing embeddings deleted.');

    // 3. Fetch the file from the blob store
    console.log('Fetching file from blob store...');
    const response = await fetch(fileUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch file from blob store: ${response.statusText}`);
    }
    const fileBuffer = Buffer.from(await response.arrayBuffer());
    console.log('File fetched successfully.');

    // 4. Parse, split, and re-embed the document
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
      source: fileUrl,
      fileName,
      documentId,
    }));

    console.log('Creating new embeddings and saving to MongoDB...');
    await MongoDBAtlasVectorSearch.fromTexts(
      chunks,
      metadata,
      getEmbeddingsTransformer(),
      searchArgs()
    );

