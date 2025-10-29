'use server';
import { put, del, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(request: Request) {
  try {
    const { pathname, folderName } = await request.json();

    if (!pathname || !folderName) {
      return new NextResponse(JSON.stringify({ message: 'pathname and folderName are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Find the blob to move
    const { blobs } = await list({ prefix: pathname });
    const blobToMove = blobs.find(b => b.pathname === pathname);

    if (!blobToMove) {
      return new NextResponse(JSON.stringify({ message: 'File not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const pathParts = pathname.split('/');
    const fileName = pathParts.pop();
    const documentId = pathParts.pop();
    const newPath = `${DOCUMENT_PREFIX}${folderName}/${documentId}/${fileName}`;

    // Download the blob content
    const blobContent = await fetch(blobToMove.url).then(res => res.arrayBuffer());

    // Upload to the new path
    await put(newPath, blobContent, { access: 'public' });

    // Delete the old blob
    await del(blobToMove.url);

    return NextResponse.json({ message: `File moved to "${folderName}" successfully.` }, { status: 200 });
  } catch (error) {
    console.error('Error moving file:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(JSON.stringify({ message: 'An error occurred during file move.', error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
