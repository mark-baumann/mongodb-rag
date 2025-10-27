import { list } from '@vercel/blob';
import { notFound } from 'next/navigation';
import ChatWithPdfClient from './ChatWithPdfClient';

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
    <div className="min-h-screen w-full bg-gray-50">
      <div className="relative h-[100svh] w-full overflow-hidden">
        <iframe
          src={viewerUrl}
          title={documentName}
          className="h-full w-full border-0"
        />
        {/* Floating chat bubble + panel handled in client component */}
        <ChatWithPdfClient documentId={documentId} documentName={documentName} />
      </div>
    </div>
  );
}