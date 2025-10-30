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

  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

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
        let errorMessage = 'Failed to create podcast';
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          try {
            const data = await response.json();
            const parts: string[] = [];
            if (typeof data?.message === 'string' && data.message.trim()) {
              parts.push(data.message.trim());
            }
            if (typeof data?.details === 'string' && data.details.trim()) {
              parts.push(data.details.trim());
            }
            if (typeof data?.status === 'number') {
              parts.push(`Status: ${data.status}`);
            }
            if (parts.length > 0) {
              errorMessage = parts.join(' | ');
            }
          } catch (parseError) {
            console.error('Failed to parse error response from /api/podcast', parseError);
          }
        } else {
          try {
            const text = await response.text();
            if (text.trim()) {
              errorMessage = text.trim();
            }
          } catch (textError) {
            console.error('Failed to read error response from /api/podcast', textError);
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body!.getReader();
      const audio = new Audio();
      setAudio(audio);
      const mediaSource = new MediaSource();
      audio.src = URL.createObjectURL(mediaSource);
      audio.play();

      mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        function push() {
          reader.read().then(({ done, value }) => {
            if (done) {
              mediaSource.endOfStream();
              return;
            }
            sourceBuffer.appendBuffer(value);
            push();
          });
        }
        push();
      });
    } catch (error) {
      console.error('Error creating podcast:', error);
      const message = error instanceof Error ? error.message : 'Failed to create podcast.';
      alert(message);
    } finally {
      setIsCreatingPodcast(false);
    }
  };

  const stopPodcast = () => {
    if (audio) {
      audio.pause();
      setAudio(null);
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
            {audio && (
              <div className="flex items-center gap-2">
                <audio controls src={audio.src}></audio>
                <button onClick={stopPodcast}>Stop</button>
              </div>
            )}
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Settings2 className="h-4 w-4" />
              Einstellungen
            </Link>
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
              {audio && (
                <div className="flex items-center gap-2">
                  <audio controls src={audio.src}></audio>
                  <button onClick={stopPodcast}>Stop</button>
                </div>
              )}
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <Settings2 className="h-4 w-4" />
                Einstellungen
              </Link>
            </div>
          </div>
        )}
      </nav>
      {isSettingsOpen && null}
    </>
  );
};

export default NavBar;
