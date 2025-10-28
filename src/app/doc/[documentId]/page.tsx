"use client";

import { useState, useEffect } from 'react';
import { list } from '@vercel/blob';
import { notFound } from 'next/navigation';
import DocumentChatShell from './chat/DocumentChatShell';

const DOCUMENT_PREFIX = 'documents/';

export default function DocumentPage({ params }: { params: { documentId: string } }) {
  const { documentId } = params;
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);

  useEffect(() => {
    async function getDocument() {
      if (!documentId) return notFound();

      const blob = (await list({ prefix: `${DOCUMENT_PREFIX}${documentId}/` })).blobs[0];
      if (!blob) return notFound();

      setViewerUrl(blob.url);
      setDocumentName(blob.pathname.split('/').pop() || 'Dokument');
    }
    getDocument();
  }, [documentId]);

  if (!viewerUrl || !documentName) {
    return <div>Loading...</div>; // Or some other loading state
  }

  return (
    <DocumentChatShell
      viewerUrl={viewerUrl}
      documentId={documentId}
      documentName={documentName}
    />
  );
}

