import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

import DeleteAllButton from './component/DeleteAllButton';
import UploadDocuments from './component/UploadDocuments';
import CreateFolderButton from './component/CreateFolderButton';
import DraggableDocumentList from './component/DraggableDocumentList';

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
  let folders: string[] = [];

  try {
    const { blobs } = await list({ prefix: DOCUMENT_PREFIX });

    const folderPaths = new Set<string>();
    const documentBlobs: typeof blobs = [];

    for (const blob of blobs) {
      if (blob.pathname.endsWith('/.placeholder')) {
        const folderPath = blob.pathname.substring(0, blob.pathname.lastIndexOf('/'));
        folderPaths.add(folderPath.replace(DOCUMENT_PREFIX, ''));
      } else {
        documentBlobs.push(blob);
      }
    }

    folders = Array.from(folderPaths);

    documents = documentBlobs
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
          <div className='flex flex-nowrap items-center gap-4 justify-end overflow-x-auto'>
            <CreateFolderButton />
            <UploadDocuments />
            {(documents.length > 0 || folders.length > 0) && <DeleteAllButton />}
          </div>
        </div>
        {(documents.length > 0 || folders.length > 0) ? (
          <DraggableDocumentList documents={documents} folders={folders} />
        ) : (
          <p className='text-gray-600 mt-4'>Noch keine Dokumente hochgeladen.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
