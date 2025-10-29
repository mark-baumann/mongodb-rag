'use server';
import { del, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getCollection } from '@/utils/openai';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(request: Request) {
  try {
    const { documentId, name } = await request.json();

    if (!documentId || !name) {
      return new NextResponse(JSON.stringify({ message: 'documentId and name are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`Starting deletion for documentId: ${documentId}`);

    const expectedPath = `${DOCUMENT_PREFIX}${documentId}/${name}`;
    const prefix = `${DOCUMENT_PREFIX}${documentId}/`;
    const urlsToDelete: string[] = [];

    console.log(`Listing blobs with prefix: ${prefix}`);
    let cursor: string | undefined;

    do {
      const response = await list({ prefix, cursor });
      response.blobs.forEach((blob) => {
        if (blob.pathname === expectedPath) {
          urlsToDelete.push(blob.url);
        }
      });
      cursor = response.cursor;
    } while (cursor);

    if (urlsToDelete.length > 0) {
      console.log(`Deleting blob: ${urlsToDelete[0]}`);
      await del(urlsToDelete);
      console.log('Blob deleted successfully.');
    } else {
      console.warn(`Blob not found for path: ${expectedPath}`);
    }

    // Delete document from MongoDB
    console.log('Getting MongoDB collection...');
    const collection = getCollection();
    console.log('MongoDB collection retrieved.');

    console.log(`Deleting document from MongoDB with documentId: ${documentId}`);
    const deleteResult = await collection.deleteMany({ 'metadata.documentId': documentId });
    console.log(`Deleted ${deleteResult.deletedCount} documents from MongoDB.`);

    console.log('Deletion process completed successfully.');
    return NextResponse.json({ message: 'Document and database entries deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during deletion.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
