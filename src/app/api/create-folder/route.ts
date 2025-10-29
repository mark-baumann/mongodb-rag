'use server';
import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(request: Request) {
  try {
    const { folderName } = await request.json();

    if (!folderName) {
      return new NextResponse(JSON.stringify({ message: 'Folder name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Vercel Blob Storage does not have explicit folder creation.
    // A folder is created implicitly when a file is uploaded with a path that includes the folder name.
    // To "create a folder", we can upload an empty file (e.g., .placeholder) inside that folder.
    const placeholderPath = `${DOCUMENT_PREFIX}${folderName}/.placeholder`;

    await put(placeholderPath, 'This is a placeholder file to create the folder.', {
      access: 'public',
    });

    return NextResponse.json({ message: `Folder "${folderName}" created successfully.` }, { status: 200 });
  } catch (error) {
    console.error('Error creating folder:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during folder creation.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
