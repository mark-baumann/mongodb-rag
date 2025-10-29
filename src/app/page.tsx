import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

import DeleteAllButton from './component/DeleteAllButton';
import UploadDocuments from './component/UploadDocuments';
import DocumentItem from './component/DocumentItem';

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
            {documents.map((doc) => (
              <DocumentItem key={doc.documentId} document={doc} />
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
