"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "ai/react";

import { useApiKey } from "../../../component/ApiKeyProvider";

type Props = {
  documentId: string;
  documentName?: string;
  onClose?: () => void;
};

export default function ChatWithPdfClient({ documentId, documentName, onClose }: Props) {
  const { apiKey } = useApiKey();
  const [waitingForAI, setWaitingForAI] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
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

  return (
    <section className="flex h-full w-full flex-1 flex-col bg-[#030712] text-white lg:max-w-lg lg:border-l lg:border-white/10">
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Dokument-Chat
          </p>
          <p className="truncate text-lg font-semibold text-white/90">{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-xs font-semibold uppercase tracking-wide text-emerald-300 transition hover:text-emerald-200"
            >
              Verlauf löschen
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/40 hover:bg-white/10"
            >
              Chat schließen
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col-reverse gap-4 overflow-hidden px-6 py-6">
        <div className="flex w-full justify-center">
          {waitingForAI && (
            <div className="loading">
              <Image src="/1484.gif" alt="Ladeanimation" width={64} height={64} />
            </div>
          )}
        </div>

        <div ref={containerRef} className="messages flex-1 overflow-y-auto pr-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center text-white/70">
              <div className="flex items-center gap-4">
                <Image
                  src="/MongoDB_White.svg"
                  alt="MongoDB"
                  width={120}
                  height={120}
                  className="opacity-80"
                />
                <span className="text-4xl font-semibold">+</span>
                <Image
                  src="/openAI.svg"
                  alt="OpenAI"
                  width={80}
                  height={80}
                  className="opacity-80"
                />
              </div>
              <p className="text-sm">
                Stelle Fragen zu deinem Dokument – die Antworten bleiben auf dieses PDF beschränkt.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className="my-4 flex gap-4 text-sm text-white"
                >
                  <span className="relative flex shrink-0 overflow-hidden rounded-full">
                    <div className="rounded-full bg-white/10 p-1">
                      <Image
                        src={isUser ? "/user.png" : "/bot.png"}
                        alt={isUser ? "Nutzer" : "Bot"}
                        width={32}
                        height={32}
                      />
                    </div>
                  </span>
                  <div className="leading-relaxed">
                    <span className="mb-1 block font-bold">
                      {isUser ? "Du" : "Assistant"}
                    </span>
                    <p className="whitespace-pre-line text-white/90">{message.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <form
        className="border-t border-white/10 px-6 py-4"
        onSubmit={onSubmit}
      >
        <div className="flex items-center justify-center gap-3">
          <input
            value={input}
            onChange={handleInputChange}
            className="flex h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/40 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
            placeholder="Frage zum Dokument eingeben..."
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-500 px-4 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-800"
          >
            Senden
          </button>
        </div>
        {!apiKey && (
          <p className="mt-2 text-xs text-amber-300">
            Kein OpenAI API-Key hinterlegt – nutze das Einstellungsmenü (Zahnrad), bevor du fragst.
          </p>
        )}
      </form>
    </section>
  );
}
