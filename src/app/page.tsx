import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

const DOCUMENT_PREFIX = 'documents/';

type DocumentListItem = {
  name: string;
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
        const publicUrl =
          blob.downloadUrl ??
          (blob.url.startsWith('blob:')
            ? `https://blob.vercel-storage.com${new URL(blob.url).pathname}`
            : blob.url);

        return {
          name: documentName,
          viewerUrl: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(publicUrl)}`,
        };
      });
  } catch (error) {
    console.error('Failed to list blobs', error);
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <NavBar />

      <div className='max-w-5xl mx-auto p-8'>
        <h1 className='text-3xl font-bold mb-6 text-gray-900'>📚 Dokumentenübersicht</h1>
        {documents.length > 0 ? (
          <div className='document-grid'>
            {documents.map(({ name, viewerUrl }) => (
              <a
                key={viewerUrl}
                href={viewerUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='document-card'
                title={`Open ${name} in Google Viewer`}
              >
                <span className='document-card-icon' aria-hidden='true'>
                  📄
                </span>
                <span className='document-card-title'>{name}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className='text-gray-600 mt-4'>Noch keine Dokumente hochgeladen.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
