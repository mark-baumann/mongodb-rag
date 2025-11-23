"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useApiKey } from '../component/ApiKeyProvider';
import { CheckCircle2, Lock, SlidersHorizontal, ArrowLeft, Wand2, Plus, X, Loader, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-toastify';

export default function SettingsPage() {
  const { apiKey, setApiKey } = useApiKey();
  const [draftKey, setDraftKey] = useState('');

  const [draftPassword, setDraftPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Blob Keys Management
  const [blobKeys, setBlobKeys] = useState<Array<{ id: string; key: string }>>([]);
  const [newBlobKey, setNewBlobKey] = useState('');
  const [selectedBlobKeyIndex, setSelectedBlobKeyIndex] = useState(-1);
  const [showSelectedBlobKey, setShowSelectedBlobKey] = useState(false);
  const [currentBlobKey, setCurrentBlobKey] = useState('');

  // Visual-only RAG settings
  const [chunkSize, setChunkSize] = useState(1000);
  const [chunkOverlap, setChunkOverlap] = useState(100);
  const [splitMethod, setSplitMethod] = useState<'characters' | 'sentences'>('characters');
  const [retrieverK, setRetrieverK] = useState(8);
  const [algorithm, setAlgorithm] = useState<'stuff' | 'map_reduce' | 'refine' | 'fusion'>('stuff');
  const [similarity, setSimilarity] = useState<'cosine' | 'dot' | 'euclidean'>('cosine');
  const [rerank, setRerank] = useState(false);
  const [indexName, setIndexName] = useState('vector_index');

  const loadBlobKeys = async () => {
    if (!isAuthed) return;
    try {
      const res = await fetch('/api/blob-keys');
      if (res.ok) {
        const data = await res.json();
        setBlobKeys(data || []);
        // Auto-select first key if available
        if (data && data.length > 0) {
          setSelectedBlobKeyIndex(0);
        } else {
          setSelectedBlobKeyIndex(-1);
        }
      }
    } catch (error) {
      console.error('Error loading blob keys:', error);
    }
  };

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
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        setIsAuthed(!!data?.authenticated);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setIsAuthed(false);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, [apiKey, isMounted]);

  useEffect(() => {
    if (isAuthed && !isLoading) {
      void loadBlobKeys();
    } else {
      setBlobKeys([]);
    }
  }, [isAuthed, isLoading]);

  // Update current blob key when selection changes
  useEffect(() => {
    if (selectedBlobKeyIndex >= 0 && blobKeys[selectedBlobKeyIndex]) {
      setCurrentBlobKey(blobKeys[selectedBlobKeyIndex].key);
    } else {
      setCurrentBlobKey('');
    }
  }, [selectedBlobKeyIndex, blobKeys]);

  const handleSaveAll = () => {
    // Persist API key; other settings are visual only
    setApiKey(draftKey.trim());
    setSaveMessage('Einstellungen gespeichert');
    setTimeout(() => setSaveMessage(''), 2000);
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

      {/* Loading Spinner */}
      {isMounted && isLoading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader className="h-8 w-8 animate-spin text-emerald-600" />
            <p className="text-sm font-medium text-gray-700">Wird geladen...</p>
          </div>
        </div>
      )}

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
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="sk-..."
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button
                  onClick={handleSaveAll}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Speichern
                </button>
              </div>
              <p className="text-xs text-gray-500">{saveMessage || apiKeyHint}</p>
            </div>
          </section>


          {/* BLOB READ WRITE TOKEN */}
          <section className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900">BLOB READ WRITE TOKEN</h2>
            </div>
            <p className="mb-4 text-sm text-gray-600">Verwalte deine BLOB Read Write Keys.</p>

            {/* Current Key Display */}
            {currentBlobKey && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <p className="text-sm font-medium text-emerald-800">Aktueller BLOB Key:</p>
                <p className="text-xs text-emerald-600 mt-1 font-mono break-all">
                  {currentBlobKey}
                </p>
              </div>
            )}

            {isAuthed && (
              <div className="space-y-3">
                {/* Existing Keys Dropdown */}
                {blobKeys.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">BLOB Read Write Schlüssel</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedBlobKeyIndex >= 0 ? String(selectedBlobKeyIndex) : ""}
                        onChange={(e) => {
                          const idx = parseInt(e.target.value, 10);
                          setSelectedBlobKeyIndex(idx);
                          setShowSelectedBlobKey(false);
                        }}
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      >
                        <option value="">{blobKeys.length ? "Schlüssel wählen" : "Kein Schlüssel gespeichert"}</option>
                        {blobKeys.map((k, i) => {
                          const masked = k.key.length > 8 ? `•••• ${k.key.slice(-4)}` : "••••";
                          return (
                            <option key={i} value={String(i)}>
                              {`Key ${i + 1} (${masked})`}
                            </option>
                          );
                        })}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowSelectedBlobKey(!showSelectedBlobKey)}
                        className="shrink-0 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedBlobKeyIndex < 0}
                        title={showSelectedBlobKey ? "Verbergen" : "Anzeigen"}
                      >
                        {showSelectedBlobKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedBlobKeyIndex >= 0) {
                            const keyToDelete = blobKeys[selectedBlobKeyIndex];
                            try {
                              const res = await fetch('/api/blob-keys', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: keyToDelete.id }),
                              });
                              if (res.ok) {
                                toast.success('Key gelöscht');
                                setSelectedBlobKeyIndex(-1);
                                setShowSelectedBlobKey(false);
                                await loadBlobKeys();
                              } else {
                                toast.error('Fehler beim Löschen');
                              }
                            } catch (error) {
                              toast.error(String(error));
                            }
                          }
                        }}
                        disabled={selectedBlobKeyIndex < 0}
                        className="shrink-0 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Key löschen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Show Selected Key */}
                {showSelectedBlobKey && selectedBlobKeyIndex >= 0 && (
                  <input
                    type="text"
                    value={blobKeys[selectedBlobKeyIndex]?.key || ""}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm bg-gray-50"
                  />
                )}

                {/* Add New Key */}
                <div className="border-t pt-4 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Neuen Schlüssel hinzufügen</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="BLOB Read Write Token eingeben"
                      value={newBlobKey}
                      onChange={(e) => setNewBlobKey(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const v = newBlobKey.trim();
                        if (!v) {
                          toast.error('Key erforderlich');
                          return;
                        }
                        try {
                          const res = await fetch('/api/blob-keys', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: v }),
                          });
                          if (res.ok) {
                            toast.success('Schlüssel hinzugefügt');
                            setNewBlobKey('');
                            await loadBlobKeys();
                            // The new key will be auto-selected in loadBlobKeys
                          } else {
                            toast.error('Fehler beim Speichern');
                          }
                        } catch (error) {
                          toast.error(String(error));
                        }
                      }}
                      disabled={!newBlobKey.trim()}
                      className="shrink-0 rounded-lg bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!isAuthed && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-700">
                  Melden Sie sich an, um BLOB Read Write Keys zu verwalten.
                </p>
              </div>
            )}
          </section>

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

      {/* Login Modal */}
      {isMounted && !isAuthed && !isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg max-w-md w-full mx-4">
            <div className="mb-6 flex items-center gap-3">
              <Lock className="h-6 w-6 text-emerald-600" />
              <h2 className="text-2xl font-semibold text-gray-900">Anmeldung erforderlich</h2>
            </div>
            <p className="mb-6 text-sm text-gray-600">
              Melden Sie sich an, um BLOB Read Write Keys zu verwalten.
            </p>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Passwort eingeben"
                value={draftPassword}
                onChange={(e) => setDraftPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                autoFocus
                disabled={isLoading}
              />
              {authMessage && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  {authMessage}
                </p>
              )}
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    Wird angemeldet...
                  </>
                ) : (
                  'Anmelden'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}