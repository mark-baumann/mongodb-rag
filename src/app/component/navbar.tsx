"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { useApiKey } from './ApiKeyProvider';

const NavBar: React.FC = () => {
  const { apiKey, setApiKey, isSettingsOpen, openSettings, closeSettings } = useApiKey();
  const [draftKey, setDraftKey] = useState('');

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftKey(apiKey);
    }
  }, [apiKey, isSettingsOpen]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setApiKey(draftKey.trim());
    closeSettings();
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 shadow-lg backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-sm text-white sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8">
              <Image src="/mongoDB.svg" alt="MongoDB Logo" fill sizes="32px" priority />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-wide">MongoDB RAG</span>
              <span className="text-[0.7rem] uppercase text-emerald-100">
                Upload · Embed · Chat
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={openSettings}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <Settings2 className="h-4 w-4" />
            Einstellungen
          </button>
        </div>
      </nav>

      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">OpenAI API-Key</h2>
              <p className="mt-1 text-sm text-gray-500">
                Hinterlege deinen persönlichen API-Key. Er wird nur lokal gespeichert.
              </p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="api-key" className="text-sm font-medium text-gray-700">
                  API-Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={draftKey}
                  onChange={(event) => setDraftKey(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                {apiKey && (
                  <p className="text-xs text-emerald-600">Ein API-Key ist hinterlegt.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSettings}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-800"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
