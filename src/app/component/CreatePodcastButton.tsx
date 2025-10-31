"use client";

import { useEffect, useState } from "react";
import { Mic, Loader2, RefreshCw } from "lucide-react";
import { ClipLoader } from "react-spinners";

type Props = {
  documentId: string;
};

export default function CreatePodcastButton({ documentId }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [podcastTopic, setPodcastTopic] = useState("");
  const [minutesPreset, setMinutesPreset] = useState<string>("5");
  const [showCustomMinutes, setShowCustomMinutes] = useState(false);
  const [podcastMinutes, setPodcastMinutes] = useState<number>(5);
  const [podcastVoice, setPodcastVoice] = useState<string>("alloy");
  const [stylePreset, setStylePreset] = useState<string>("sachlich");
  const [showCustomStyle, setShowCustomStyle] = useState<boolean>(false);
  const [podcastPersona, setPodcastPersona] = useState<string>("");
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [ttsChunkSize, setTtsChunkSize] = useState<number>(4000);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Prefetch existing saved podcast on mount so play is available immediately
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/podcast?documentId=${encodeURIComponent(documentId)}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (data?.url) setExistingUrl(data.url);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const openDialog = async () => {
    setIsDialogOpen(true);
    setLoadingExisting(true);
    try {
      const res = await fetch(`/api/podcast?documentId=${encodeURIComponent(documentId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) setExistingUrl(data.url);
      } else {
        setExistingUrl(null);
      }
    } catch {
      setExistingUrl(null);
    } finally {
      setLoadingExisting(false);
    }
  };
  const closeDialog = () => setIsDialogOpen(false);

  const startCreation = async () => {
    setIsCreating(true);
    setAudioUrl(null);
    setIsDialogOpen(false);
    try {
      const res = await fetch("/api/podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          topic: podcastTopic.trim(),
          targetMinutes: Number.isFinite(podcastMinutes) ? podcastMinutes : 5,
          voice: podcastVoice,
          persona: showCustomStyle ? podcastPersona.trim() : stylePreset,
          speakingRate: playbackRate === 1 ? "normal" : playbackRate < 1 ? "langsam" : "schnell",
          ttsChunkSize,
        }),
      });

      if (!res.ok) {
        let message = "Fehler beim Erstellen des Podcasts";
        try {
          const data = await res.json();
          if (typeof data?.message === "string" && data.message) message = data.message;
        } catch {}
        alert(message);
        return;
      }

      const blob = await res.blob();
      const headerUrl = res.headers.get('X-Podcast-Url');
      if (headerUrl) {
        setExistingUrl(headerUrl);
        setAudioUrl(null);
      } else {
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        // try to resolve saved URL now
        try {
          const chk = await fetch(`/api/podcast?documentId=${encodeURIComponent(documentId)}`);
          if (chk.ok) {
            const data = await chk.json();
            if (data?.url) {
              setExistingUrl(data.url);
              try { URL.revokeObjectURL(url); } catch {}
              setAudioUrl(null);
            }
          }
        } catch {}
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      alert(`Erstellen des Podcasts fehlgeschlagen: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={isCreating}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700 shadow ring-1 ring-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        title="Podcast"
        aria-label="Podcast erstellen"
      >
        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
      </button>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-gray-800 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Podcast erstellen</h2>

            <div className="space-y-4">
              {loadingExisting ? (
                <div className="text-sm text-gray-600">Prüfe vorhandene Version…</div>
              ) : existingUrl ? (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
                  <p className="mb-2 text-sm font-semibold text-emerald-800">Gespeicherter Podcast</p>
                  <audio controls preload="metadata" src={existingUrl} className="w-full" />
                  <p className="mt-2 text-xs text-emerald-900">Diese Version ist gespeichert. Du kannst sie jederzeit wieder anhören.</p>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium">Thema/Beschreibung (optional)</label>
                <input
                  type="text"
                  value={podcastTopic}
                  onChange={(e) => setPodcastTopic(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Worüber soll gesprochen werden?"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Länge (Minuten)</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  value={minutesPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMinutesPreset(val);
                    if (val === "custom") {
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
                      const v = e.target.value.replace(",", ".");
                      const num = parseFloat(v);
                      setPodcastMinutes(Number.isFinite(num) ? num : 5);
                    }}
                    placeholder="z. B. 4.56"
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Stimme</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
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
                <label className="mb-1 block text-sm font-medium">Stil</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  value={stylePreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStylePreset(val);
                    setShowCustomStyle(val === "custom");
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
                    className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Sprechtempo</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
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
                  onClick={() => {
                    // toggle advanced options (currently only TTS chunk size)
                    const next = ttsChunkSize === 4000 ? 4001 : 4000; // force rerender on toggle area
                    setTtsChunkSize(next);
                    setTtsChunkSize(next === 4000 ? 4001 : 4000);
                  }}
                >
                  Erweiterte Optionen anzeigen/ausblenden
                </button>
                <div className="mt-2 space-y-2">
                  <label className="block text-sm font-medium">Segmentgröße (fortgeschritten)</label>
                  <input
                    type="number"
                    min={1000}
                    max={8000}
                    step={100}
                    value={ttsChunkSize}
                    onChange={(e) => setTtsChunkSize(parseInt(e.target.value || "4000", 10))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <p className="text-xs text-gray-500">Größe der TTS-Textsegmente. Kleinere Werte können Fehler vermeiden.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeDialog}
                className="rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100"
                disabled={isCreating}
              >
                Abbrechen
              </button>
              <button
                onClick={startCreation}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:bg-emerald-300"
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {isCreating ? 'Erstelle…' : existingUrl ? 'Neu generieren' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <ClipLoader size={56} color="#059669" />
        </div>
      )}

      {(existingUrl || audioUrl) && (
        <div className="ml-2 inline-flex max-w-[240px] items-center gap-2 align-middle">
          <audio controls preload="metadata" src={existingUrl || audioUrl || undefined} className="max-w-[240px]" />
        </div>
      )}
    </>
  );
}
