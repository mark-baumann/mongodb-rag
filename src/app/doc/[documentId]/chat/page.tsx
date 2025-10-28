import { list } from '@vercel/blob';
import { notFound } from 'next/navigation';
import ChatWithPdfClient from './ChatWithPdfClient';
import NavBar from '../../../component/navbar';

const DOCUMENT_PREFIX = 'documents/';

export const dynamic = 'force-dynamic';

export default async function ChatDocumentPage({ params }: { params: { documentId: string } }) {
  const { documentId } = params;
  if (!documentId) return notFound();

  const blob = (await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` })).blobs[0];
  if (!blob) return notFound();

  const viewerUrl = blob.url;
  const documentName = blob.pathname.split('/').pop() || 'Dokument';

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <NavBar />
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="relative flex-1 bg-slate-900">
          <iframe
            src={viewerUrl}
            title={documentName}
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
        <ChatWithPdfClient documentId={documentId} documentName={documentName} />
      </div>
    </div>
  );
}
