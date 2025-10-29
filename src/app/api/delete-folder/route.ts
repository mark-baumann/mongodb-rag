'use server';

import { del, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getCollection } from '@/utils/openai';

const DOCUMENT_PREFIX = 'documents/';

export async function POST(request: Request) {
  try {
    const { folderName } = await request.json();

    if (!folderName || typeof folderName !== 'string') {
      return new NextResponse(
        JSON.stringify({ message: 'folderName is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const trimmedFolderName = folderName.trim().replace(/^\/+|\/+$/g, '');

    if (!trimmedFolderName) {
      return new NextResponse(
        JSON.stringify({ message: 'folderName cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const folderPrefix = `${DOCUMENT_PREFIX}${trimmedFolderName}/`;

    const { blobs } = await list({ prefix: folderPrefix });
    const urlsToDelete = blobs.map((blob) => blob.url);

    if (urlsToDelete.length > 0) {
      await del(urlsToDelete);
    }

    const documentIds = new Set<string>();
    for (const blob of blobs) {
      const relativePath = blob.pathname.replace(DOCUMENT_PREFIX, '');
      const segments = relativePath.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];

      // Skip placeholder file entries or top-level markers
      if (lastSegment === '.placeholder' || segments.length < 3) {
        continue;
      }

      const documentId = segments[segments.length - 2];
      if (documentId) {
        documentIds.add(documentId);
      }
    }

    if (documentIds.size > 0) {
      const collection = getCollection();
      await collection.deleteMany({ documentId: { $in: Array.from(documentIds) } });
    }

    return NextResponse.json(
      { message: `Ordner "${trimmedFolderName}" und zugehörige Dateien wurden gelöscht.` },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting folder:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(
      JSON.stringify({ message: 'An error occurred during folder deletion.', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
