"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";

type Props = {
  documentId: string;
  documentName?: string;
};

export default function ChatWithPdfClient({ documentId, documentName }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { documentId },
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const title = useMemo(() => documentName ?? "Dokument", [documentName]);

  return (
    <>
      {/* Floating bubble */}
      <button
        aria-label="Mit Dokument chatten"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 sm:h-16 sm:w-16"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M7.5 6h9a2.5 2.5 0 0 1 2.5 2.5V13a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3v-3H7.5A2.5 2.5 0 0 1 5 13V8.5A2.5 2.5 0 0 1 7.5 6z" />
        </svg>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity sm:bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Chat panel */}
      <div
        className={`fixed z-50 flex flex-col bg-white shadow-2xl transition-all duration-200 dark:bg-gray-900
        ${open ? "opacity-100" : "pointer-events-none opacity-0"}
        left-0 right-0 bottom-0 h-[75vh] rounded-t-2xl
        sm:left-auto sm:right-4 sm:bottom-4 sm:h-[70vh] sm:w-[400px] sm:rounded-2xl`}
        role="dialog"
        aria-modal={open}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600/10 text-indigo-700 dark:text-indigo-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M7.5 6h9a2.5 2.5 0 0 1 2.5 2.5V13a2.5 2.5 0 0 1-2.5 2.5H12l-4.5 3v-3H7.5A2.5 2.5 0 0 1 5 13V8.5A2.5 2.5 0 0 1 7.5 6z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">Chat mit PDF</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">{title}</p>
            </div>
          </div>
          <button
            aria-label="Schließen"
            onClick={() => setOpen(false)}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-gray-800 dark:text-gray-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 0 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={containerRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
              <div className="mb-2 text-sm">Stelle Fragen zum Dokument</div>
              <div className="text-xs">Antworten werden mit Inhalten aus deinem PDF belegt.</div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              const badge = isUser
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
              return (
                <div key={m.id} className="flex items-start gap-3 text-sm">
                  <div className={`rounded-md px-2 py-1 ${badge}`}>{isUser ? 'Du' : 'Bot'}</div>
                  <div className="max-w-[85%] whitespace-pre-line break-words leading-relaxed text-gray-800 dark:text-gray-200">
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-200 p-3 dark:border-gray-800"
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Frage zum PDF stellen..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoading ? '...' : 'Senden'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}