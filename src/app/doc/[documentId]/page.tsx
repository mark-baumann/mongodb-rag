import { list } from '@vercel/blob';
import { notFound } from 'next/navigation';

const DOCUMENT_PREFIX = 'documents/';

type DocumentPageProps = {
  params: {
    documentId: string;
  };
};

export const dynamic = 'force-dynamic';

const DocumentPage = async ({ params }: DocumentPageProps) => {
  const { documentId } = params;

  if (!documentId) {
    return notFound();
  }

  const blob = (await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` })).blobs[0];

  if (!blob) {
    return notFound();
  }

  const viewerUrl = blob.url;

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <iframe src={viewerUrl} style={{ border: 'none', height: '100%', width: '100%' }} />
    </div>
  );
};

export default DocumentPage;
