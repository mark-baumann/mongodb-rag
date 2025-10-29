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

    // Delete blob from Vercel Blob
    const blobPath = `${DOCUMENT_PREFIX}${documentId}/${name}`;
    console.log(`Listing blobs with prefix: ${blobPath}`)
    const { blobs } = await list({ prefix: blobPath });
    const urlsToDelete = blobs.filter(blob => blob.pathname === blobPath).map((blob) => blob.url);

    if (urlsToDelete.length > 0) {
      console.log(`Deleting blob: ${urlsToDelete[0]}`);
      await del(urlsToDelete);
      console.log('Blob deleted successfully.');
    } else {
      console.log(`Blob not found for path: ${blobPath}`);
    }

    // Delete document from MongoDB
    console.log('Getting MongoDB collection...');
    const collection = getCollection();
    console.log('MongoDB collection retrieved.');

    console.log(`Deleting document from MongoDB with documentId: ${documentId}`);
    const deleteResult = await collection.deleteMany({ documentId });
    console.log(`Deleted ${deleteResult.deletedCount} documents from MongoDB.`);

    console.log('Deletion process completed successfully.');
    return NextResponse.json({ message: 'Document and database entries deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting document:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during deletion.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
