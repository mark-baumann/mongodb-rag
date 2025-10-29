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

    const updatePayload = trimmedFolder
      ? { $set: { folderName: trimmedFolder } }
      : { $unset: { folderName: '' } };

    const updateResult = await collection.updateMany({ documentId }, updatePayload);

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
