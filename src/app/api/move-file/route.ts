'use server';

import { NextResponse } from 'next/server';

import { getCollection } from '@/utils/openai';

export async function POST(request: Request) {
  try {
    const { documentId, folderName } = await request.json();

    if (!documentId || typeof documentId !== 'string') {
      return new NextResponse(JSON.stringify({ message: 'documentId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const trimmedFolder = typeof folderName === 'string' ? folderName.trim() : '';
    const collection = getCollection();

    // Store folder assignment both nested and top-level for compatibility
    const updatePayload = trimmedFolder
      ? { $set: { 'metadata.folderName': trimmedFolder, folderName: trimmedFolder } }
      : { $unset: { 'metadata.folderName': '', folderName: '' } };

    // Match by nested or top-level documentId for robustness
    const primaryFilter = { $or: [ { 'metadata.documentId': documentId }, { documentId } ] } as const;
    let updateResult = await collection.updateMany(primaryFilter as any, updatePayload as any);

    // Fallback: match by blob source URL containing the documentId
    if (updateResult.matchedCount === 0) {
      const sourceRegex = new RegExp(`${documentId}`);
      const fallbackFilter = { 'metadata.source': { $regex: sourceRegex } } as const;

      // When setting a folder, also ensure metadata.documentId is written for future matches
      const fallbackUpdate = trimmedFolder
        ? { $set: { 'metadata.folderName': trimmedFolder, folderName: trimmedFolder, 'metadata.documentId': documentId } }
        : updatePayload;

      updateResult = await collection.updateMany(fallbackFilter as any, fallbackUpdate as any);
    }

    if (updateResult.matchedCount === 0) {
      return new NextResponse(JSON.stringify({ message: 'Document metadata not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const message = trimmedFolder
      ? `Ordnerzuordnung auf "${trimmedFolder}" gespeichert.`
      : 'Ordnerzuordnung entfernt.';

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error('Error updating document folder metadata:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new NextResponse(
      JSON.stringify({ message: 'An error occurred while updating metadata.', error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
