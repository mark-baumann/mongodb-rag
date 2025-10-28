import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

import DeleteAllButton from './component/DeleteAllButton';
import UploadDocuments from './component/UploadDocuments';

const DOCUMENT_PREFIX = 'documents/';

type DocumentListItem = {
  name: string;
  url: string;
  documentId: string;
  directUrl: string;
};

export const dynamic = 'force-dynamic';

const Home = async () => {
  let documents: DocumentListItem[] = [];

  try {
    const { blobs } = await list({ prefix: DOCUMENT_PREFIX });

    documents = blobs
      .filter((blob) => blob.pathname.startsWith(DOCUMENT_PREFIX))
      .map((blob) => {
        const pathParts = blob.pathname.replace(DOCUMENT_PREFIX, '').split('/');
        if (pathParts.length < 2) return null;

        const [documentId, ...nameParts] = pathParts;
        const name = nameParts.join('/');

        return {
          name,
          url: `/doc/${documentId}`,
          documentId,
          directUrl: blob.url,
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
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h1 className='text-3xl font-bold text-gray-900'>Dokumente</h1>
          <div className='flex flex-wrap items-center gap-4 justify-end'>
            <UploadDocuments />
            {documents.length > 0 && <DeleteAllButton />}
          </div>
        </div>
        {documents.length > 0 ? (
          <ul className='space-y-3'>
            {documents.map(({ name, directUrl, documentId }) => (
              <li
                key={documentId}
                className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between'
              >
                <span className='font-medium text-gray-800 truncate'>{name}</span>
                <div className='flex items-center gap-3 sm:justify-end'>
                  <a
                    href={directUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  >
                    Ansehen
                  </a>
                  <a
                    href={`/doc/${documentId}/chat`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
                  >
                    Chatten
                  </a>
                </div>
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
