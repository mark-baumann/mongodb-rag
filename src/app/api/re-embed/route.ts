import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pdf from 'pdf-parse';
import { list } from '@vercel/blob';
import {
  getCollection,
  getEmbeddingsTransformer,
  searchArgs,
  getMetadataCollection,
} from '@/utils/openai';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { MongoDBAtlasVectorSearch } from '@langchain/community/vectorstores/mongodb_atlas';

const DOCUMENT_PREFIX = 'documents/';

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

    const vectorCollection = getCollection();
    const metadataCollection = getMetadataCollection();

    // 1. Locate document metadata (fall back to blob listing if missing)
    const docMetadata = await metadataCollection.findOne({ _id: documentId as unknown as never });
    let fileUrl = docMetadata?.url as string | undefined;
    let fileName = docMetadata?.name as string | undefined;

    if (!fileUrl || !fileName) {
      console.log('Metadata incomplete or missing. Listing blob storage for fallback.');
      const blobList = await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` });
      const blob = blobList.blobs[0];

      if (!blob) {
        console.log('No blob found for document, cannot re-embed.');
        return NextResponse.json(
          { message: 'Document source not found. Please re-upload the file.' },
          { status: 404 },
        );
      }

      fileUrl = blob.url;
      fileName = blob.pathname.split('/').pop() || 'document.pdf';

      await metadataCollection.updateOne(
        { _id: documentId },
        {
          $set: {
            name: fileName,
            url: fileUrl,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
      console.log('Metadata collection updated from blob listing.');
    }

    if (!fileUrl || !fileName) {
      return NextResponse.json(
        { message: 'Document source could not be resolved for re-embedding.' },
        { status: 404 },
      );
    }

    console.log(`Found file URL: ${fileUrl}. Deleting existing embeddings.`);

    // Grab an existing document before deletion to preserve metadata such as folder assignment.
    const existingDoc =
      (await vectorCollection.findOne({ documentId })) ??
      (await vectorCollection.findOne({ 'metadata.documentId': documentId }));

    // 2. Delete all existing embeddings for this document from the vector collection
    const deleteResult = await vectorCollection.deleteMany({
      $or: [{ documentId }, { 'metadata.documentId': documentId }],
    });
    console.log('Existing embeddings deleted.', {
      documentId,
      deletedCount: deleteResult.deletedCount,
    });

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

    if (chunks.length === 0) {
      console.log('No text chunks generated from PDF; aborting re-embedding.');
      return NextResponse.json(
        {
          message: 'Das PDF enthält keinen auslesbaren Text. Embeddings konnten nicht erstellt werden.',
        },
        { status: 400 },
      );
    }

    // Preserve folder assignments and other nested metadata if they existed.
    const preservedMetadata: Record<string, unknown> =
      existingDoc && typeof existingDoc.metadata === 'object' && existingDoc.metadata !== null
        ? { ...(existingDoc.metadata as Record<string, unknown>) }
        : {};

    let folderName: string | undefined;
    if (existingDoc) {
      if (typeof existingDoc.folderName === 'string' && existingDoc.folderName.trim()) {
        folderName = existingDoc.folderName;
      } else if (
        existingDoc.metadata &&
        typeof existingDoc.metadata === 'object' &&
        typeof (existingDoc.metadata as { folderName?: unknown }).folderName === 'string'
      ) {
        const nestedFolder = (existingDoc.metadata as { folderName?: string }).folderName;
        if (nestedFolder && nestedFolder.trim()) {
          folderName = nestedFolder;
        }
      }
    }

    if (!preservedMetadata.documentId) {
      preservedMetadata.documentId = documentId;
    }
    if (folderName) {
      preservedMetadata.folderName = folderName;
    }

    const baseMetadata: Record<string, unknown> = {
      source: fileUrl,
      fileName,
      documentId,
    };

    if (folderName) {
      baseMetadata.folderName = folderName;
    }

    console.log('Re-embedding metadata preservation', {
      documentId,
      folderName: folderName ?? null,
      preservedKeys: Object.keys(preservedMetadata),
    });

    const mergedMetadata =
      Object.keys(preservedMetadata).length > 0
        ? { ...preservedMetadata, ...baseMetadata }
        : { ...baseMetadata };
    const metadata = chunks.map(() => ({ ...mergedMetadata }));

    console.log('Creating new embeddings and saving to MongoDB...');
    await MongoDBAtlasVectorSearch.fromTexts(
      chunks,
      metadata,
      getEmbeddingsTransformer(),
      searchArgs()
    );
    console.log('New embeddings created and saved.', {
      documentId,
      chunkCount: chunks.length,
    });
    const storedCount = await vectorCollection.countDocuments({
      documentId,
    });
    console.log('Embedding count after re-embed', { documentId, storedCount });

    return NextResponse.json({ message: 'Re-embedding successful' }, { status: 200 });

  } catch (error) {
    console.error('Error during re-embedding process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during re-embedding.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
