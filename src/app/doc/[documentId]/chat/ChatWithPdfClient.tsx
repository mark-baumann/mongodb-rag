"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";
import { X } from 'lucide-react';
import { toast } from "react-toastify";

import { useApiKey } from "../../../component/ApiKeyProvider";

type Props = {
  documentId: string;
  documentName?: string;
  onClose?: () => void;
};

const suggestions = [
  "Um was geht es in dem PDF",
  "Wer hat das PDF erzeugt?",
  "Was steht auf Seite 25?",
  "Fasse jedes Kapitel zusammen",
];

const ReEmbedToast = ({ documentId, closeToast }: { documentId: string; closeToast: () => void }) => {
  const handleReEmbed = () => {
    toast.promise(
      fetch("/api/re-embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to re-embed document");
        return res.json();
      }),
      {
        pending: "Re-embedding document...",
        success: "Document re-embedded successfully! You can now ask questions about it.",
        error: "Failed to re-embed document. Please try again.",
      }
    );
    closeToast();
  };

  return (
    <div>
      <p className="mb-2">No embeddings found for this document.</p>
      <button onClick={handleReEmbed} className="px-3 py-1 text-sm text-white bg-emerald-500 rounded hover:bg-emerald-600">
        Re-generate Embeddings
      </button>
    </div>
  );
};

export default function ChatWithPdfClient({ documentId, documentName, onClose }: Props) {
  const { apiKey } = useApiKey();
  const [waitingForAI, setWaitingForAI] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setInput,
    isLoading,
  } = useChat({
    id: documentId,
    body: { documentId, apiKey: apiKey || undefined },
    onError: (error) => {
      try {
        const errorBody = JSON.parse(error.message);
        if (error.message === 'Das Dokument wird neu indiziert. Bitte versuchen Sie es in Kürze erneut.') {
          toast.info(error.message);
        } else if (errorBody.error === "NO_EMBEDDINGS_FOUND" || errorBody.allowReembed) {
          toast.error(({ closeToast }) => <ReEmbedToast documentId={documentId} closeToast={closeToast} />, {
            autoClose: false,
          });
        } else if (errorBody.error === "NO_RELEVANT_CONTEXT") {
          toast.error(errorBody.message || "Ich konnte dazu nichts im Dokument finden.");
        } else {
          toast.error("An unexpected error occurred. Please try again.");
        }
      } catch (e) {
        toast.error("An unexpected error occurred. Please try again.");
      }
    },
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!isLoading) {
      setWaitingForAI(false);
    }
  }, [isLoading]);

  const title = useMemo(() => documentName ?? "Dokument", [documentName]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    setWaitingForAI(true);
    handleSubmit(event);
  };

  const onSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => {
      formRef.current?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, 0);
  };


  return (
    <section className="flex h-full w-full flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white lg:max-w-xl lg:border-l lg:border-white/10 rounded-lg">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6 md:py-5 backdrop-blur sticky top-0 z-10 bg-slate-900">
        <div className="min-w-0">
          <p className="text-[0.6rem] md:text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Dokument-Chat
          </p>
          <p className="truncate text-lg md:text-xl font-semibold text-white">{title}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white text-2xl md:text-base"
          >
            <X size={32} />
          </button>
        )}
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 pb-4 pt-20 md:px-6 md:pb-6 md:pt-6"
        ref={containerRef}
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center text-white/70">
            <div className="inline-flex items-center gap-4 rounded-full bg-white/5 px-6 py-3 text-xs uppercase tracking-[0.35em] text-emerald-300/80">
              <span>MongoDB</span>
              <span className="text-white/40">×</span>
              <span>OpenAI</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/80">
              Stelle deine Frage zum Dokument oder starte mit „Zusammenfassung“. Die Antworten
              bleiben immer auf das ausgewählte PDF beschränkt.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSuggestionClick(suggestion)}
                  className="rounded-full bg-white/5 px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-6">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20 ${
                      isUser
                        ? "bg-emerald-500 text-emerald-50"
                        : "border border-white/15 bg-white/5 text-white/90 backdrop-blur"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/60">
                      {isUser ? "Du" : "Assistant"}
                    </p>
                    <p className="whitespace-pre-line text-[0.95rem]">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            })}
            {waitingForAI && (
              <div className="flex w-full justify-start">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span>Der Assistent denkt…</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form
        ref={formRef}
        className="border-t border-white/10 px-4 py-3 md:px-6 md:py-5 backdrop-blur pb-4"
        onSubmit={onSubmit}
      >
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="chat-input" className="sr-only">
              Frage zum Dokument
            </label>
            <textarea
              id="chat-input"
              value={input}
              onChange={handleInputChange}
              rows={2}
              onInput={(event) => {
                const target = event.currentTarget;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
              }}
              className="max-h-40 w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/40 shadow-inner shadow-black/30 transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder="Frag etwas wie „Gib mir eine Zusammenfassung…“"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-500 px-6 text-sm font-semibold uppercase tracking-wide text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800/60"
          >
            Senden
          </button>
        </div>
      </form>
    </section>
  );
}
