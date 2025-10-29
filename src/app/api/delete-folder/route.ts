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

    const collection = getCollection();

    const documentsInFolder = await collection
      .aggregate<{ _id: string }>([
        { $match: { folderName: trimmedFolderName } },
        { $group: { _id: '$documentId' } },
      ])
      .toArray();

    const documentIds = documentsInFolder.map((doc) => doc._id).filter(Boolean);
    const urlsToDelete: string[] = [];

    const listAllBlobUrls = async (prefix: string) => {
      let cursor: string | undefined;
      do {
        const { blobs, cursor: nextCursor } = await list({ prefix, cursor });
        urlsToDelete.push(...blobs.map((blob) => blob.url));
        cursor = nextCursor;
      } while (cursor);
    };

    const folderPrefix = `${DOCUMENT_PREFIX}${trimmedFolderName}/`;
    await listAllBlobUrls(folderPrefix);

    for (const documentId of documentIds) {
      await listAllBlobUrls(`${DOCUMENT_PREFIX}${documentId}/`);
    }

    if (urlsToDelete.length > 0) {
      await del(urlsToDelete);
    }

    if (documentIds.length > 0) {
      await collection.deleteMany({ documentId: { $in: documentIds } });
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
