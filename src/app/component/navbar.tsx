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
  const [isPodcastDialogOpen, setIsPodcastDialogOpen] = useState(false);
  const [podcastTopic, setPodcastTopic] = useState('');
  const [podcastMinutes, setPodcastMinutes] = useState<number>(5);
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationLabel, setDurationLabel] = useState<string | null>(null);

  const handleOpenPodcastDialog = () => {
    setIsPodcastDialogOpen(true);
  };

  const formatSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  const startPodcastGeneration = async () => {
    console.log('Pathname:', pathname);
    setIsCreatingPodcast(true);
    setDurationLabel(null);
    try {
      const match = pathname.match(/\/doc\/([a-fA-F0-9-]+)/);
      if (!match) {
        throw new Error('Konnte die Dokument-ID nicht aus der URL lesen');
      }
      const documentId = match[1];

      const response = await fetch('/api/podcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          topic: podcastTopic.trim(),
          targetMinutes: Number.isFinite(podcastMinutes) ? podcastMinutes : 5,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Fehler beim Erstellen des Podcasts';
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

      // Optional: read estimated duration header
      const est = response.headers.get('X-Estimated-Duration');
      if (est) {
        const seconds = Number(est);
        if (Number.isFinite(seconds) && seconds > 0) {
          setDurationLabel(`ca. ${formatSeconds(seconds)}`);
        }
      }

      const reader = response.body!.getReader();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      // Accumulate full audio and then create a Blob so duration is known
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalBytes += value.byteLength;
        }
      }

      const blob = new Blob(chunks, { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      // Clean up previous URL if any
      if (audioUrl) {
        try { URL.revokeObjectURL(audioUrl); } catch {}
      }

      const audioEl = new Audio(url);
      audioEl.addEventListener('loadedmetadata', () => {
        if (!isNaN(audioEl.duration) && isFinite(audioEl.duration)) {
          setDurationLabel(formatSeconds(audioEl.duration));
        }
      });
      void audioEl.play().catch(() => {});
      setAudio(audioEl);
      setAudioUrl(url);
      setIsPodcastDialogOpen(false);
    } catch (error) {
      console.error('Error creating podcast:', error);
      const message = error instanceof Error ? error.message : 'Erstellen des Podcasts fehlgeschlagen.';
      alert(message);
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
                onClick={handleOpenPodcastDialog}
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
                {durationLabel && (
                  <span className="text-sm text-emerald-100">Dauer: {durationLabel}</span>
                )}
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
                  onClick={handleOpenPodcastDialog}
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
                  {durationLabel && (
                    <span className="text-sm text-emerald-100">Dauer: {durationLabel}</span>
                  )}
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

      {isPodcastDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md text-gray-800">
            <h2 className="text-xl font-bold mb-4">Podcast erstellen</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Thema/Beschreibung (optional)</label>
                <input
                  type="text"
                  value={podcastTopic}
                  onChange={(e) => setPodcastTopic(e.target.value)}
                  placeholder="Worüber soll gesprochen werden?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Länge (Minuten)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={podcastMinutes}
                  onChange={(e) => setPodcastMinutes(parseInt(e.target.value || '5', 10))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsPodcastDialogOpen(false)}
                className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100"
                disabled={isCreatingPodcast}
              >
                Abbrechen
              </button>
              <button
                onClick={startPodcastGeneration}
                className="px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                disabled={isCreatingPodcast}
              >
                {isCreatingPodcast ? 'Erstelle...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
