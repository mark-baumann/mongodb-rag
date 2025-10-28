"use client";

import { useState } from "react";

import NavBar from "../../../component/navbar";
import ChatWithPdfClient from "./ChatWithPdfClient";

type DocumentChatShellProps = {
  viewerUrl: string;
  documentId: string;
  documentName: string;
};

const DocumentChatShell = ({ viewerUrl, documentId, documentName }: DocumentChatShellProps) => {
  const [isChatOpen, setIsChatOpen] = useState(true);

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

          {!isChatOpen && (
            <div className="absolute bottom-6 right-6 z-10 flex justify-end">
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                Chat öffnen
              </button>
            </div>
          )}
        </div>

        {isChatOpen && (
          <ChatWithPdfClient
            documentId={documentId}
            documentName={documentName}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentChatShell;
