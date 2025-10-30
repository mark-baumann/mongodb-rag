"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Settings2, Mic, Menu, X as CloseIcon, Lock, Loader2 } from 'lucide-react';
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
  const [podcastVoice, setPodcastVoice] = useState<string>('alloy');
  const [podcastPersona, setPodcastPersona] = useState<string>('');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);
  const [ttsChunkSize, setTtsChunkSize] = useState<number>(4000);
  const [minutesPreset, setMinutesPreset] = useState<string>('5');
  const [showCustomMinutes, setShowCustomMinutes] = useState<boolean>(false);
  const [stylePreset, setStylePreset] = useState<string>('sachlich');
  const [showCustomStyle, setShowCustomStyle] = useState<boolean>(false);
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
  // no extra duration label; rely on audio controls

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
          voice: podcastVoice,
          persona: showCustomStyle ? podcastPersona.trim() : stylePreset,
          speakingRate: playbackRate === 1 ? 'normal' : playbackRate < 1 ? 'langsam' : 'schnell',
          ttsChunkSize,
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
      audioEl.playbackRate = playbackRate;
      // do not autoplay; user can start via controls
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
                {isCreatingPodcast ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Erstelle...</span>
                ) : 'Erstelle Podcast (Beta)'}
              </button>
            )}
            {audio && (
              <div className="flex items-center gap-2">
                <audio controls preload="metadata" src={audio.src}></audio>
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
                  {isCreatingPodcast ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Erstelle...</span>
                  ) : 'Erstelle Podcast (Beta)'}
                </button>
              )}
              {audio && (
                <div className="flex items-center gap-2">
                  <audio controls preload="metadata" src={audio.src}></audio>
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
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  value={minutesPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMinutesPreset(val);
                    if (val === 'custom') {
                      setShowCustomMinutes(true);
                    } else {
                      setShowCustomMinutes(false);
                      const num = parseFloat(val);
                      if (!Number.isNaN(num)) setPodcastMinutes(num);
                    }
                  }}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="4.5">4.5</option>
                  <option value="4.56">4.56</option>
                  <option value="5">5</option>
                  <option value="7.5">7.5</option>
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="custom">Benutzerdefiniert…</option>
                </select>
                {showCustomMinutes && (
                  <input
                    type="number"
                    step={0.01}
                    min={0.25}
                    max={120}
                    value={podcastMinutes}
                    onChange={(e) => {
                      const v = e.target.value.replace(',', '.');
                      const num = parseFloat(v);
                      setPodcastMinutes(Number.isFinite(num) ? num : 5);
                    }}
                    placeholder="z. B. 4.56"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stimme</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  value={podcastVoice}
                  onChange={(e) => setPodcastVoice(e.target.value)}
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stil</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  value={stylePreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStylePreset(val);
                    setShowCustomStyle(val === 'custom');
                  }}
                >
                  <option value="sachlich">Sachlich</option>
                  <option value="erklärend">Erklärend</option>
                  <option value="freundlich">Freundlich</option>
                  <option value="analytisch">Analytisch</option>
                  <option value="humorvoll">Humorvoll</option>
                  <option value="motivierend">Motivierend</option>
                  <option value="erzählerisch">Erzählerisch</option>
                  <option value="technisch">Technisch</option>
                  <option value="custom">Benutzerdefiniert…</option>
                </select>
                {showCustomStyle && (
                  <input
                    type="text"
                    value={podcastPersona}
                    onChange={(e) => setPodcastPersona(e.target.value)}
                    placeholder="Eigener Stil, z. B. journalistisch, locker, visionär"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sprechtempo</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                  value={String(playbackRate)}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                >
                  <option value="0.9">Langsam (0.9x)</option>
                  <option value="1">Normal (1.0x)</option>
                  <option value="1.1">Leicht schneller (1.1x)</option>
                  <option value="1.25">Schneller (1.25x)</option>
                  <option value="1.5">Sehr schnell (1.5x)</option>
                </select>
              </div>
              <div>
                <button
                  type="button"
                  className="text-sm text-emerald-700 hover:text-emerald-800"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                >
                  {advancedOpen ? 'Erweiterte Optionen ausblenden' : 'Erweiterte Optionen anzeigen'}
                </button>
                {advancedOpen && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-sm font-medium">Segmentgröße (fortgeschritten)</label>
                    <input
                      type="number"
                      min={1000}
                      max={8000}
                      step={100}
                      value={ttsChunkSize}
                      onChange={(e) => setTtsChunkSize(parseInt(e.target.value || '4000', 10))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500">Größe der TTS-Textsegmente. Kleinere Werte können Fehler vermeiden.</p>
                  </div>
                )}
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
                {isCreatingPodcast ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Erstelle...</span>
                ) : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default NavBar;
