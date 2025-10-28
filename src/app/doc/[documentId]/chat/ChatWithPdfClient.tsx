"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";
import { X } from 'lucide-react';

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

export default function ChatWithPdfClient({ documentId, documentName, onClose }: Props) {
  const { apiKey } = useApiKey();
  const [waitingForAI, setWaitingForAI] = useState(false);

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
    // The form submission will be triggered by the user clicking the submit button
    // or by pressing enter in the textarea. To automatically submit, we would need
    // to call handleSubmit here, but that requires a form event.
    // For now, we just populate the input.
  };


  return (
    <section className="flex h-full w-full flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white lg:max-w-xl lg:border-l lg:border-white/10">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5 backdrop-blur">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-emerald-400">
            Dokument-Chat
          </p>
          <p className="truncate text-xl font-semibold text-white">{title}</p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <X size={24} />
          </button>
        )}
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.35),_transparent_55%)]" />
        <div className="relative flex h-full flex-col gap-4 px-6 py-6">
          <div className="flex-1 overflow-y-auto pr-2" ref={containerRef}>
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
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-lg shadow-black/20 ${
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
        </div>
      </div>

      <form
        className="border-t border-white/10 px-6 py-5 backdrop-blur pb-4"
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
              rows={3}
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
