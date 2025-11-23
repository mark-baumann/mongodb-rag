import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const BLOB_KEYS_FILE = 'blob-keys.json';

type BlobKey = {
  id: string;
  key: string;
  createdAt: string;
};

async function getBlobKeysFromStorage(): Promise<BlobKey[]> {
  try {
    // Try to read from localStorage-like storage
    // For now, we'll use a simple in-memory store that persists via environment
    const stored = process.env.BLOB_KEYS_STORAGE;
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  } catch (error) {
    console.error('Error reading blob keys:', error);
    return [];
  }
}

async function saveBlobKeysToStorage(keys: BlobKey[]): Promise<void> {
  try {
    // In production, this would save to a persistent store
    // For now, we store in memory via environment variable
    process.env.BLOB_KEYS_STORAGE = JSON.stringify(keys);
  } catch (error) {
    console.error('Error saving blob keys:', error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const authed = cookies().get('auth')?.value === '1';
    if (!authed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const keys = await getBlobKeysFromStorage();
    return NextResponse.json(keys);
  } catch (error) {
    console.error('Error fetching blob keys:', error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authed = cookies().get('auth')?.value === '1';
    if (!authed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { key } = body;

    if (!key || !key.trim()) {
      return NextResponse.json(
        { message: 'Key is required' },
        { status: 400 }
      );
    }

    const keys = await getBlobKeysFromStorage();
    const newKey: BlobKey = {
      id: randomUUID(),
      key: key.trim(),
      createdAt: new Date().toISOString(),
    };

    keys.push(newKey);
    await saveBlobKeysToStorage(keys);

    return NextResponse.json(
      { id: newKey.id, key: newKey.key },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating blob key:', error);
    return NextResponse.json(
      { message: 'Error creating key' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authed = cookies().get('auth')?.value === '1';
    if (!authed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { message: 'Key ID is required' },
        { status: 400 }
      );
    }

    const keys = await getBlobKeysFromStorage();
    const initialLength = keys.length;
    const filteredKeys = keys.filter((k) => k.id !== id);

    if (filteredKeys.length === initialLength) {
      return NextResponse.json(
        { message: 'Key not found' },
        { status: 404 }
      );
    }

    await saveBlobKeysToStorage(filteredKeys);
    return NextResponse.json({ message: 'Key deleted' });
  } catch (error) {
    console.error('Error deleting blob key:', error);
    return NextResponse.json(
      { message: 'Error deleting key' },
      { status: 500 }
    );
  }
}
