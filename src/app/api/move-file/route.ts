'use server';
import { put, del, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(request: Request) {
  try {
    const { documentId, name, folderName } = await request.json();

    if (!documentId || !name || !folderName) {
      return new NextResponse(JSON.stringify({ message: 'documentId, name, and folderName are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const oldPath = `${DOCUMENT_PREFIX}${documentId}/${name}`;
    const newPath = `${DOCUMENT_PREFIX}${folderName}/${documentId}/${name}`;

    // Find the blob to move
    const { blobs } = await list({ prefix: oldPath });
    const blobToMove = blobs.find(blob => blob.pathname === oldPath);

    if (!blobToMove) {
      return new NextResponse(JSON.stringify({ message: 'File not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    // Download the blob content
    const blobContent = await fetch(blobToMove.url).then(res => res.arrayBuffer());

    // Upload to the new path
    await put(newPath, blobContent, { access: 'public' });

    // Delete the old blob
    await del(blobToMove.url);

    // Here you would also update the MongoDB metadata if the path is stored there.
    // For now, we assume the path is not in the database.

    return NextResponse.json({ message: `File "${name}" moved to "${folderName}" successfully.` }, { status: 200 });
  } catch (error) {
    console.error('Error moving file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during file move.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
