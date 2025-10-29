'use client';

import { useEffect, useState } from "react";
import { MessageSquare } from 'lucide-react';
import dynamic from 'next/dynamic';
import NavBar from "../../../component/navbar";

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });
const ChatWithPdfClient = dynamic(() => import('./ChatWithPdfClient'), { ssr: false });

type DocumentChatShellProps = {
  viewerUrl: string;
  documentId:string;
  documentName: string;
};

const DocumentChatShell = ({ viewerUrl, documentId, documentName }: DocumentChatShellProps) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isChatOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <NavBar />

      <div className="relative flex-1 bg-slate-900 overflow-y-auto">
        <PdfViewer url={viewerUrl} />

        {!isChatOpen && (
          <div className="fixed bottom-6 right-6 z-10">
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="rounded-full bg-emerald-500 p-3 text-white shadow-lg transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              <MessageSquare size={24} />
            </button>
          </div>
        )}

        {isChatOpen && (
          <div className="fixed bottom-0 right-0 z-20 w-full h-full md:h-[calc(100vh-8rem)] md:max-w-md bg-slate-900 rounded-lg shadow-2xl md:bottom-6 md:right-6">
            <ChatWithPdfClient
              documentId={documentId}
              documentName={documentName}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentChatShell;