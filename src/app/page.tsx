import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';

const DOCUMENT_PREFIX = 'documents/';

type DocumentListItem = {
  name: string;
  publicUrl: string;
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
          publicUrl,
          viewerUrl: `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(publicUrl)}`,
        };
      });
  } catch (error) {
    console.error('Failed to list blobs', error);
  }

  return (
    <div>
      <NavBar />
      <div className='overview-text'>
        <h1 style={{ fontWeight: 'bold', fontSize: '2em' }}>RAG QnA Chatbot</h1>
        <br />

       

        <h2 style={{ fontStyle: 'italic' }}>Available Documents</h2>
        {documents.length > 0 ? (
          <div className='document-grid'>
            {documents.map(({ name, viewerUrl, publicUrl }) => (
              <a
                key={publicUrl}
                href={viewerUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='document-card'
                title={`Open ${name} in Google Viewer`}
              >
                <div className='document-card-icon' aria-hidden='true'>
                  📄
                </div>
                <span className='document-card-title'>{name}</span>
              </a>
            ))}
          </div>
        ) : (
          <p>No documents uploaded yet.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
