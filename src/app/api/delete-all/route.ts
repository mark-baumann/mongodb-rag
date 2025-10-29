import { del, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCollection } from '@/utils/openai';

const DOCUMENT_PREFIX = 'documents/';

export async function POST() {
  try {
    const authed = cookies().get('auth')?.value === '1';
    if (!authed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    console.log('Starting deletion process...');

    // Delete all blobs from Vercel Blob
    console.log('Listing blobs from Vercel Blob...');
    const { blobs } = await list({ prefix: DOCUMENT_PREFIX });
    const urlsToDelete = blobs.map((blob) => blob.url);
    console.log(`Found ${urlsToDelete.length} blobs to delete.`);

    if (urlsToDelete.length > 0) {
        console.log('Deleting blobs...');
        await del(urlsToDelete);
        console.log('Blobs deleted successfully.');
    }

    // Delete all documents from MongoDB
    console.log('Getting MongoDB collection...');
    const collection = getCollection();
    console.log('MongoDB collection retrieved.');

    console.log('Deleting documents from MongoDB...');
    const deleteResult = await collection.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} documents from MongoDB.`);

    console.log('Deletion process completed successfully.');
    return NextResponse.json({ message: 'All documents and database entries deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting documents:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during deletion.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
