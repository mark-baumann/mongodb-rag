"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Settings2, Mic, Menu, X as CloseIcon, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useApiKey } from './ApiKeyProvider';

const NavBar: React.FC = () => {
  const { apiKey, setApiKey, isSettingsOpen, openSettings, closeSettings } = useApiKey();
  const [draftKey, setDraftKey] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<string>('');
  const [isCreatingPodcast, setIsCreatingPodcast] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftKey(apiKey);
      void fetch('/api/auth/status')
        .then((r) => r.json())
        .then((data) => setIsAuthed(!!data?.authenticated))
        .catch(() => setIsAuthed(false));
    }
  }, [apiKey, isSettingsOpen]);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setApiKey(draftKey.trim());
    closeSettings();
  };

  const handleCreatePodcast = async () => {
    console.log("Pathname:", pathname);
    setIsCreatingPodcast(true);
    try {
      const match = pathname.match(/\/doc\/([a-fA-F0-9-]+)/);
      if (!match) {
        throw new Error('Could not extract document ID from URL');
      }
      const documentId = match[1];

      const response = await fetch('/api/podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create podcast');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error creating podcast:', error);
      alert('Failed to create podcast.');
    } finally {
      setIsCreatingPodcast(false);
    }
  };

  const handleLogin = async () => {
    setAuthMessage('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: draftPassword.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsAuthed(false);
        setAuthMessage(data?.message || 'Anmeldung fehlgeschlagen');
        return;
      }
      setIsAuthed(true);
      setDraftPassword('');
      setAuthMessage('Anmeldung erfolgreich.');
    } catch (e) {
      setIsAuthed(false);
      setAuthMessage('Netzwerkfehler bei der Anmeldung');
    }
  };

  const handleLogout = async () => {
    setAuthMessage('');
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setIsAuthed(false);
      setAuthMessage('Abgemeldet.');
    } catch {
      setAuthMessage('Abmelden fehlgeschlagen');
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-500 shadow-lg backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 text-lg text-white sm:px-6 lg:px-8 md:py-6">
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

          <div className="hidden md:flex items-center gap-4">
            {pathname.includes('/doc/') && (
              <button
                type="button"
                onClick={handleCreatePodcast}
                disabled={isCreatingPodcast}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Mic className="h-4 w-4" />
                {isCreatingPodcast ? 'Erstelle Podcast...' : 'Erstelle Podcast (Beta)'}
              </button>
            )}
            <button
              type="button"
              onClick={openSettings}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Settings2 className="h-4 w-4" />
              Einstellungen
            </button>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
              {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-emerald-600 p-4">
            <div className="flex flex-col gap-4">
              {pathname.includes('/doc/') && (
                <button
                  type="button"
                  onClick={handleCreatePodcast}
                  disabled={isCreatingPodcast}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Mic className="h-4 w-4" />
                  {isCreatingPodcast ? 'Erstelle Podcast...' : 'Erstelle Podcast (Beta)'}
                </button>
              )}
              <button
                type="button"
                onClick={openSettings}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <Settings2 className="h-4 w-4" />
                Einstellungen
              </button>
            </div>
          </div>
        )}
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

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-gray-700" />
                <h3 className="text-base font-semibold text-gray-900">Zugangs-Passwort</h3>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Gib das Zugangs-Passwort ein, um Uploads und Chat zu aktivieren.
              </p>
              <div className="mt-3 space-y-2">
                <input
                  type="password"
                  placeholder="Passwort"
                  value={draftPassword}
                  onChange={(e) => setDraftPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <div className="flex items-center justify-between">
                  <div className={"text-xs " + (isAuthed ? 'text-emerald-600' : 'text-gray-500')}>
                    Status: {isAuthed ? 'Angemeldet' : 'Nicht angemeldet'}
                  </div>
                  <div className="flex gap-2">
                    {!isAuthed ? (
                      <button
                        type="button"
                        onClick={handleLogin}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        Anmelden
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-300"
                      >
                        Abmelden
                      </button>
                    )}
                  </div>
                </div>
                {authMessage && (
                  <p className="text-xs text-gray-600">{authMessage}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
