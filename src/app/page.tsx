import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

import DeleteAllButton from './component/DeleteAllButton';
import UploadDocuments from './component/UploadDocuments';
import CreateFolderButton from './component/CreateFolderButton';
import DocumentItem from './component/DocumentItem';
import FolderItem from './component/FolderItem';

const DOCUMENT_PREFIX = 'documents/';

type DocumentListItem = {
  name: string;
  url: string;
  documentId: string;
  directUrl: string;
  pathname: string;
  folder: string | null;
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
      const path = blob.pathname.replace(DOCUMENT_PREFIX, '');
      const pathParts = path.split('/');

      if (blob.pathname.endsWith('/.placeholder')) {
        folderPaths.add(pathParts.slice(0, -1).join('/'));
      } else if (pathParts.length > 1) { // It's a document
        documentBlobs.push(blob);
      }
    }

    folders = Array.from(folderPaths);

    documents = documentBlobs
      .map((blob) => {
        const path = blob.pathname.replace(DOCUMENT_PREFIX, '');
        const pathParts = path.split('/');

        if (pathParts.length < 2) return null;

        const name = pathParts[pathParts.length - 1];
        const documentId = pathParts[pathParts.length - 2];
        const folder = pathParts.length > 2 ? pathParts.slice(0, -2).join('/') : null;

        return {
          name,
          url: `/doc/${documentId}`,
          documentId,
          directUrl: blob.url,
          pathname: blob.pathname,
          folder,
        };
      })
      .filter((item): item is DocumentListItem => Boolean(item));

  } catch (error) {
    console.error('Failed to list blobs', error);
  }

  const documentsByFolder: Record<string, DocumentListItem[]> = {};
  const rootDocuments: DocumentListItem[] = [];

  for (const doc of documents) {
    if (doc.folder) {
      if (!documentsByFolder[doc.folder]) {
        documentsByFolder[doc.folder] = [];
      }
      documentsByFolder[doc.folder].push(doc);
    } else {
      rootDocuments.push(doc);
    }
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
          <ul className='space-y-3'>
            {folders.map((folderName) => (
              <FolderItem key={folderName} folderName={folderName}>
                <ul className="space-y-2 pt-2">
                  {(documentsByFolder[folderName] || []).map(doc => (
                    <DocumentItem key={doc.pathname} document={doc} folders={folders} />
                  ))}
                </ul>
              </FolderItem>
            ))}
            {rootDocuments.map((doc) => (
              <DocumentItem key={doc.pathname} document={doc} folders={folders} />
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
