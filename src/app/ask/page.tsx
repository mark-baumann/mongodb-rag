'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useChat } from 'ai/react';

import NavBar from '../component/navbar';
import { useApiKey } from '../component/ApiKeyProvider';

export default function Home() {
  const [waitingForAI, setWaitingForAI] = useState(false);
  const { apiKey } = useApiKey();

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: { apiKey: apiKey || undefined },
  });

  useEffect(() => {
    if (!isLoading) {
      setWaitingForAI(false);
    }
  }, [isLoading]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    setWaitingForAI(true);
    handleSubmit(event);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <NavBar />
      <div className="flex h-[70vh] flex-col-reverse">
        {waitingForAI && (
          <div className="flex justify-center">
            <Image src="/1484.gif" alt="Ladeanimation" width={64} height={64} />
          </div>
        )}

        {messages.length === 0 && (
          <div className="flex items-center justify-center gap-4 pb-6">
            <Image src="/MongoDB_White.svg" alt="MongoDB" width={180} height={180} className="opacity-80" />
            <span className="text-4xl font-semibold">+</span>
            <Image src="/openAI.svg" alt="OpenAI" width={100} height={100} className="opacity-80" />
          </div>
        )}

        <div className="messages flex-1 overflow-y-auto pr-4">
          {messages.map((message) => (
            <div key={message.id} className="my-4 flex flex-1 gap-3 text-sm text-gray-200">
              <span className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full" style={{ margin: '30px', marginTop: '0px' }}>
                <div className="rounded-full bg-gray-100 border p-1">
                  <Image
                    src={message.role === 'user' ? '/user.png' : '/bot.png'}
                    alt={message.role === 'user' ? 'Nutzer' : 'Bot'}
                    width={32}
                    height={32}
                  />
                </div>
              </span>
              <p className="leading-relaxed text-white">
                <span className="block font-bold">{message.role}</span>
                {message.content}
              </p>
            </div>
          ))}
        </div>

        <div className="chat-window flex items-center pt-0">
          <form className="flex w-full items-center justify-center space-x-2" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={handleInputChange}
              className="flex h-10 w-full rounded-md border border-[#e5e7eb] px-3 py-2 text-sm text-[#030712] placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ask what you have in mind"
            />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-[#f9fafb] hover:bg-[#111827E6] disabled:pointer-events-none disabled:opacity-50"
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
