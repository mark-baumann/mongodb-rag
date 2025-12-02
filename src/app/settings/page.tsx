"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useApiKey } from '../component/ApiKeyProvider';
import { CheckCircle2, Lock, SlidersHorizontal, ArrowLeft, Wand2, Plus, Loader } from 'lucide-react';

export default function SettingsPage() {
  const { apiKey, setApiKey, googleApiKey, setGoogleApiKey, podcastConfig, setPodcastConfig } = useApiKey();
  const [draftKey, setDraftKey] = useState('');
  const [draftGoogleKey, setDraftGoogleKey] = useState('');
  const [draftPodcastConfig, setDraftPodcastConfig] = useState(podcastConfig);
  const [masterPassword, setMasterPassword] = useState('');

  const [draftPassword, setDraftPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);


  // Visual-only RAG settings
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [splitMethod, setSplitMethod] = useState<'characters' | 'sentences'>('characters');
  const [retrieverK, setRetrieverK] = useState(8);
  const [algorithm, setAlgorithm] = useState<'stuff' | 'map_reduce' | 'refine' | 'fusion'>('stuff');
  const [similarity, setSimilarity] = useState<'cosine' | 'dot' | 'euclidean'>('cosine');
  const [rerank, setRerank] = useState(false);
  const [indexName, setIndexName] = useState('vector_index');


  // Mount effect - only run on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize auth - only after mount
  useEffect(() => {
    if (!isMounted) return;

    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        setDraftKey(apiKey);
        setDraftGoogleKey(googleApiKey);
        setDraftPodcastConfig(podcastConfig);
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        const authed = !!data?.authenticated;
        setIsAuthed(authed);

        // If authenticated, load API keys from env
        if (authed) {
          const envKeysResponse = await fetch('/api/env-keys');
          if (envKeysResponse.ok) {
            const envKeys = await envKeysResponse.json();
            if (envKeys.openaiKey) {
              setDraftKey(envKeys.openaiKey);
              setApiKey(envKeys.openaiKey);
            }
            if (envKeys.googleKey) {
              setDraftGoogleKey(envKeys.googleKey);
              setGoogleApiKey(envKeys.googleKey);
            }
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthed(false);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [apiKey, googleApiKey, podcastConfig, isMounted]);


  const handleSaveAll = () => {
    // Persist podcast config only
    setPodcastConfig(draftPodcastConfig);
    setSaveMessage('Einstellungen gespeichert');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleMasterPasswordLogin = async () => {
    setAuthMessage('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: masterPassword.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsAuthed(false);
        setAuthMessage(data?.message || 'Anmeldung fehlgeschlagen');
        return;
      }
      setIsAuthed(true);
      setMasterPassword('');
      setAuthMessage('Anmeldung erfolgreich. API Keys aus ENV geladen.');

      // Load API keys from env
      const envKeysResponse = await fetch('/api/env-keys');
      if (envKeysResponse.ok) {
        const envKeys = await envKeysResponse.json();
        if (envKeys.openaiKey) {
          setDraftKey(envKeys.openaiKey);
          setApiKey(envKeys.openaiKey);
        }
        if (envKeys.googleKey) {
          setDraftGoogleKey(envKeys.googleKey);
          setGoogleApiKey(envKeys.googleKey);
        }
      }
    } catch (error) {
      setIsAuthed(false);
      setAuthMessage('Fehler bei der Anmeldung');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthMessage('');
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthMessage('');
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthed(false);
    setDraftKey('');
    setDraftGoogleKey('');
    setApiKey('');
    setGoogleApiKey('');
    setAuthMessage('Abgemeldet.');
  };

  const visualSave = () => {
    // purely visual confirmation
    setAuthMessage('Einstellungen gespeichert (nur visuell).');
    setTimeout(() => setAuthMessage(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/70 backdrop-blur pt-8 sm:pt-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Link>
          </div>
          <div className="text-sm text-gray-500">Einstellungen</div>
        </div>
      </header>

      {/* Loading Spinner */}
      {isMounted && isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-gray-700">Wird geladen...</p>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 pb-8">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {/* Master Password */}
          <section className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Master Passwort</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">
              Mit dem Master Passwort werden die API Keys aus den Umgebungsvariablen geladen.
            </p>
            {!isAuthed ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Master Passwort eingeben"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleMasterPasswordLogin();
                      }
                    }}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                  <button
                    onClick={handleMasterPasswordLogin}
                    disabled={isLoading}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Laden...' : 'Anmelden'}
                  </button>
                </div>
                {authMessage && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                    {authMessage}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-green-700 bg-green-50 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Angemeldet. API Keys werden aus ENV geladen.
                </p>
                <button
                  onClick={handleLogout}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Abmelden
                </button>
              </div>
            )}
          </section>

          {/* Podcast Auto-Generate Configuration - Only when authenticated */}
          {isAuthed && (
            <section className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">Podcast Auto-Generate</h2>
              </div>
              <p className="mb-4 text-sm text-gray-600">
                Aktiviere die automatische Podcast-Generierung beim Upload von PDFs.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    id="autoGenerate"
                    type="checkbox"
                    checked={draftPodcastConfig.autoGenerate}
                    onChange={(e) =>
                      setDraftPodcastConfig({ ...draftPodcastConfig, autoGenerate: e.target.checked })
                    }
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="autoGenerate" className="text-sm font-medium text-gray-700">
                    Automatisch Podcast erstellen bei PDF-Upload
                  </label>
                </div>

                {draftPodcastConfig.autoGenerate && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pl-7">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Modell</label>
                      <select
                        value={draftPodcastConfig.model}
                        onChange={(e) =>
                          setDraftPodcastConfig({ ...draftPodcastConfig, model: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="gpt-4o">ChatGPT 4o</option>
                        <option value="gpt-4o-mini">ChatGPT 4o Mini</option>
                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stimme</label>
                      <select
                        value={draftPodcastConfig.voice}
                        onChange={(e) =>
                          setDraftPodcastConfig({ ...draftPodcastConfig, voice: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Länge (Minuten): {draftPodcastConfig.targetMinutes}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={0.5}
                        value={draftPodcastConfig.targetMinutes}
                        onChange={(e) =>
                          setDraftPodcastConfig({
                            ...draftPodcastConfig,
                            targetMinutes: parseFloat(e.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stil</label>
                      <select
                        value={draftPodcastConfig.persona}
                        onChange={(e) =>
                          setDraftPodcastConfig({ ...draftPodcastConfig, persona: e.target.value })
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="sachlich">Sachlich</option>
                        <option value="erklärend">Erklärend</option>
                        <option value="freundlich">Freundlich</option>
                        <option value="analytisch">Analytisch</option>
                        <option value="humorvoll">Humorvoll</option>
                        <option value="motivierend">Motivierend</option>
                        <option value="erzählerisch">Erzählerisch</option>
                        <option value="technisch">Technisch</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveAll}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Konfiguration speichern
                  </button>
                </div>
              </div>
            </section>
          )}



          {/*
          <section className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">RAG‑Optionen (nur visuell)</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Chunk‑Größe</label>
                <input type="range" min={200} max={2000} step={50} value={chunkSize} onChange={(e) => setChunkSize(parseInt(e.target.value))} className="mt-2 w-full" />
                <div className="mt-1 text-xs text-gray-500">{chunkSize} Zeichen</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Chunk‑Overlap</label>
                <input type="range" min={0} max={500} step={10} value={chunkOverlap} onChange={(e) => setChunkOverlap(parseInt(e.target.value))} className="mt-2 w-full" />
                <div className="mt-1 text-xs text-gray-500">{chunkOverlap} Zeichen</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Split‑Methode</label>
                <div className="flex gap-4 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="split" checked={splitMethod === 'characters'} onChange={() => setSplitMethod('characters')} />
                    Zeichen
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" name="split" checked={splitMethod === 'sentences'} onChange={() => setSplitMethod('sentences')} />
                    Sätze
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Retriever Top‑K</label>
                <input type="range" min={1} max={20} step={1} value={retrieverK} onChange={(e) => setRetrieverK(parseInt(e.target.value))} className="mt-2 w-full" />
                <div className="mt-1 text-xs text-gray-500">{retrieverK} Dokumente</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RAG‑Algorithmus</label>
                <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as any)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="stuff">Stuff</option>
                  <option value="map_reduce">Map‑Reduce</option>
                  <option value="refine">Refine</option>
                  <option value="fusion">RAG‑Fusion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Similarity</label>
                <select value={similarity} onChange={(e) => setSimilarity(e.target.value as any)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="cosine">Cosine</option>
                  <option value="dot">Dot</option>
                  <option value="euclidean">Euclidean</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="rerank" type="checkbox" checked={rerank} onChange={(e) => setRerank(e.target.checked)} />
                <label htmlFor="rerank" className="text-sm text-gray-700">Reranking aktivieren</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Index‑Name</label>
                <input value={indexName} onChange={(e) => setIndexName(e.target.value)} className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>
          </section>
          */}
        </div>
      </main>

    </div>
  );
}