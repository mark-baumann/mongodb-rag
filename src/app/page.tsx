import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

const DOCUMENT_PREFIX = 'documents/';

type DocumentListItem = {
  name: string;
  directUrl: string;
  viewerUrl: string;
};

export const dynamic = 'force-dynamic';

const Home = async () => {
  let documents: DocumentListItem[] = [];

  try {
    const { blobs } = await list({ prefix: DOCUMENT_PREFIX });

    documents = blobs
      .filter((blob) => blob.pathname.startsWith(DOCUMENT_PREFIX))
      .map((blob) => {
        const documentName = blob.pathname.replace(DOCUMENT_PREFIX, '');
        const rawUrl = blob.url ?? blob.downloadUrl;

        if (!rawUrl) {
          return null;
        }

        let publicUrl = rawUrl;

        if (rawUrl.startsWith('blob:')) {
          try {
            const parsed = new URL(rawUrl);
            publicUrl = `https://blob.vercel-storage.com${parsed.pathname}`;
          } catch (error) {
            console.error('Failed to normalise blob URL', error);
            return null;
          }
        }

        const viewerUrl = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(publicUrl)}`;

        return {
          name: documentName,
          directUrl: publicUrl,
          viewerUrl,
        };
      })
      .filter((item): item is DocumentListItem => Boolean(item));
  } catch (error) {
    console.error('Failed to list blobs', error);
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <NavBar />

      <div className='max-w-5xl mx-auto p-8'>
        <h1 className='text-3xl font-bold mb-6 text-gray-900'>📚 Dokumentenübersicht</h1>
        {documents.length > 0 ? (
          <ul className='space-y-3'>
            {documents.map(({ name, viewerUrl, directUrl }) => (
              <li
                key={directUrl}
                className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between'
              >
                <span className='font-medium text-gray-800 truncate'>{name}</span>
                <a
                  href={viewerUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap'
                >
                  Ansehen
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-gray-600 mt-4'>Noch keine Dokumente hochgeladen.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
