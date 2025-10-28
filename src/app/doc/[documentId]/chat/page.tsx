import { list } from '@vercel/blob';
import { notFound } from 'next/navigation';
import DocumentChatShell from './DocumentChatShell';

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
    <DocumentChatShell
      viewerUrl={viewerUrl}
      documentId={documentId}
      documentName={documentName}
    />
  );
}
