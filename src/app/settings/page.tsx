"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useApiKey } from '../component/ApiKeyProvider';
import { CheckCircle2, Lock, SlidersHorizontal, ArrowLeft, Wand2 } from 'lucide-react';

export default function SettingsPage() {
  const { apiKey, setApiKey } = useApiKey();
  const [draftKey, setDraftKey] = useState('');

  const [draftPassword, setDraftPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Visual-only RAG settings
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [splitMethod, setSplitMethod] = useState<'characters' | 'sentences'>('characters');
  const [retrieverK, setRetrieverK] = useState(8);
  const [algorithm, setAlgorithm] = useState<'stuff' | 'map_reduce' | 'refine' | 'fusion'>('stuff');
  const [similarity, setSimilarity] = useState<'cosine' | 'dot' | 'euclidean'>('cosine');
  const [rerank, setRerank] = useState(false);
  const [indexName, setIndexName] = useState('vector_index');

  useEffect(() => {
    setDraftKey(apiKey);
    void fetch('/api/auth/status')
      .then((r) => r.json())
      .then((d) => setIsAuthed(!!d?.authenticated))
      .catch(() => setIsAuthed(false));
  }, [apiKey]);

  const handleSaveAll = () => {
    // Persist API key; other settings are visual only
    setApiKey(draftKey.trim());
    setSaveMessage('Einstellungen gespeichert');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  const handleLogin = async () => {
    setAuthMessage('');
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
  };

  const handleLogout = async () => {
    setAuthMessage('');
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthed(false);
    setAuthMessage('Abgemeldet.');
  };

  const visualSave = () => {
    // purely visual confirmation
    setAuthMessage('Einstellungen gespeichert (nur visuell).');
    setTimeout(() => setAuthMessage(''), 2000);
  };

  const apiKeyHint = useMemo(() => (apiKey ? 'Ein API-Key ist hinterlegt.' : 'Kein API-Key gespeichert.'), [apiKey]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-800">
              <ArrowLeft className="h-4 w-4" /> Zurück
            </Link>
          </div>
          <div className="text-sm text-gray-500">Einstellungen</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* OpenAI API Key */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">OpenAI API‑Key</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">Wird nur lokal im Browser gespeichert.</p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="sk-..."
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <p className="text-xs text-gray-500">{apiKeyHint}</p>
            </div>
          </section>

          {/* App Password */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">Zugangs‑Passwort</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">Aktiviert Upload, Chat und Aktionen.</p>
            <div className="space-y-3">
              <input
                type="password"
                placeholder="Passwort"
                value={draftPassword}
                onChange={(e) => setDraftPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center gap-2 text-xs ${isAuthed ? 'text-emerald-600' : 'text-gray-500'}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  Status: {isAuthed ? 'Angemeldet' : 'Nicht angemeldet'}
                </div>
                <div className="flex gap-2">
                  {!isAuthed ? (
                    <button onClick={handleLogin} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Anmelden</button>
                  ) : (
                    <button onClick={handleLogout} className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300">Abmelden</button>
                  )}
                </div>
              </div>
              {authMessage && <p className="text-xs text-gray-600">{authMessage}</p>}
            </div>
          </section>

          {/* RAG Settings (visual only) */}
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
            {/* No inline save here; use global save at bottom */}
          </section>
        </div>
        {/* Global Save Bar */}
        <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-end">
          <div className="flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm md:w-auto md:gap-6">
            <span className="text-xs text-emerald-700">
              {saveMessage || 'Änderungen anwenden'}
            </span>
            <button
              onClick={handleSaveAll}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Speichern
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
