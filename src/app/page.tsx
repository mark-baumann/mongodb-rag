import React from 'react';
import { list } from '@vercel/blob';
import NavBar from './component/navbar';
import { FileText } from 'lucide-react';

const DOCUMENT_PREFIX = 'documents/';

type DocumentListItem = {
  name: string;
  size?: number;
  createdAt?: string;
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

        const uploadedAt = blob.uploadedAt
          ? typeof blob.uploadedAt === 'string'
            ? blob.uploadedAt
            : new Date(blob.uploadedAt).toISOString()
          : undefined;

        return {
          name: documentName,
          size: blob.size,
          createdAt: uploadedAt,
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
          <div className='overflow-x-auto shadow border rounded-lg bg-white'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-100'>
                <tr>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-700'>Dokument</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-700'>Größe</th>
                  <th className='px-6 py-3 text-left text-sm font-semibold text-gray-700'>Datum</th>
                  <th className='px-6 py-3 text-right text-sm font-semibold text-gray-700'>Aktion</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100'>
                {documents.map(({ name, viewerUrl, size, createdAt }) => (
                  <tr key={`${name}-${viewerUrl}`} className='hover:bg-gray-50 transition'>
                    <td className='px-6 py-4 flex items-center space-x-3'>
                      <FileText className='w-5 h-5 text-blue-500' />
                      <span className='font-medium text-gray-800'>{name}</span>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>
                      {typeof size === 'number' ? `${(size / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-600'>
                      {createdAt ? new Date(createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className='px-6 py-4 text-right'>
                      <a
                        href={viewerUrl}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:text-blue-800 font-medium'
                      >
                        Ansehen
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className='text-gray-600 mt-4'>Noch keine Dokumente hochgeladen.</p>
        )}
      </div>
    </div>
  );
};

export default Home;
