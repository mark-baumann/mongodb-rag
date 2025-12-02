"use client";

import { useEffect, useState } from "react";
import { Mic, Loader2, RefreshCw, Play } from "lucide-react";
import { ClipLoader } from "react-spinners";
import { usePodcastMode } from "./PodcastModeProvider";
import { useApiKey } from "./ApiKeyProvider";
import { toast } from "react-toastify";

type Props = {
  documentId: string;
  initialUrl?: string;
  documentTitle?: string;
};

// OpenAI TTS Stimmen (verwendet für alle Modelle)
const Voices = [
  { value: 'alloy', label: 'Alloy' },
  { value: 'echo', label: 'Echo' },
  { value: 'fable', label: 'Fable' },
  { value: 'onyx', label: 'Onyx' },
  { value: 'nova', label: 'Nova' },
  { value: 'shimmer', label: 'Shimmer' },
];

export default function CreatePodcastButton({ documentId, initialUrl, documentTitle }: Props) {
  const { setCurrentPodcast, setIsPlaying, playlist, setPlaylist } = usePodcastMode();
  const { apiKey, googleApiKey } = useApiKey();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [minutesPreset, setMinutesPreset] = useState<string>("5");
  const [showCustomMinutes, setShowCustomMinutes] = useState(false);
  const [podcastMinutes, setPodcastMinutes] = useState<number>(5);
  const [podcastModel, setPodcastModel] = useState<string>("gpt-4o");
  const [podcastVoice, setPodcastVoice] = useState<string>("alloy");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [stylePreset, setStylePreset] = useState<string>("sachlich");
  const [showCustomStyle, setShowCustomStyle] = useState<boolean>(false);
  const [podcastPersona, setPodcastPersona] = useState<string>("");
  const [ttsChunkSize, setTtsChunkSize] = useState<number>(4000);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [existingUrl, setExistingUrl] = useState<string | null>(initialUrl ?? null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

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

  const openDialog = () => setIsDialogOpen(true);
  const closeDialog = () => setIsDialogOpen(false);

  const openPlayer = async () => {
    let url = existingUrl;
    if (!url) {
      // Attempt fetch once more
      try {
        const res = await fetch(`/api/podcast?documentId=${encodeURIComponent(documentId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            setExistingUrl(data.url);
            url = data.url;
          }
        }
      } catch {}
    }

    // Load into the main sticky player
    if (url) {
      const podcast = {
        url: url,
        title: documentTitle || `Dokument ${documentId}`,
        documentId,
      };

      setCurrentPodcast(podcast);
      setIsPlaying(true);

      // Update playlist: add if not already there
      const existingIndex = playlist.findIndex((p) => p.documentId === documentId);
      if (existingIndex === -1) {
        // Add to playlist maintaining current order
        setPlaylist([...playlist, podcast]);
      } else {
        // Update existing entry with latest URL
        const newPlaylist = [...playlist];
        newPlaylist[existingIndex] = podcast;
        setPlaylist(newPlaylist);
      }
    }
  };
  const closePlayer = () => setIsPlayerOpen(false);

  const startCreation = async () => {
    setIsCreating(true);
    setAudioUrl(null);
    setIsDialogOpen(false);

    const toastId = toast.loading(`Podcast wird erstellt (${podcastMinutes} Min.)...`);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };

      // Add API keys to headers if available
      if (apiKey) {
        headers["X-OpenAI-API-Key"] = apiKey;
      }
      if (googleApiKey) {
        headers["X-Google-API-Key"] = googleApiKey;
      }

      toast.update(toastId, { render: `Podcast-Skript wird mit ${podcastModel} erstellt...`, isLoading: true });

      const res = await fetch("/api/podcast", {
        method: "POST",
        headers,
        body: JSON.stringify({
          documentId,
          targetMinutes: Number.isFinite(podcastMinutes) ? podcastMinutes : 5,
          model: podcastModel,
          voice: podcastVoice,
          persona: showCustomStyle ? podcastPersona.trim() : stylePreset,
          ttsChunkSize,
        }),
      });

      if (!res.ok) {
        let message = "Fehler beim Erstellen des Podcasts";
        try {
          const data = await res.json();
          if (typeof data?.message === "string" && data.message) message = data.message;
        } catch {}
        toast.update(toastId, {
          render: message,
          type: "error",
          isLoading: false,
          autoClose: 5000
        });
        return;
      }

      toast.update(toastId, { render: 'Audio wird generiert...', isLoading: true });

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

      toast.update(toastId, {
        render: 'Podcast erfolgreich erstellt!',
        type: "success",
        isLoading: false,
        autoClose: 3000
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unbekannter Fehler";
      toast.update(toastId, {
        render: `Erstellen des Podcasts fehlgeschlagen: ${msg}`,
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
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
        {existingUrl && (
          <button
            type="button"
            onClick={openPlayer}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-emerald-700 shadow ring-1 ring-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Podcast abspielen"
            aria-label="Podcast abspielen"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
      </div>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-gray-800 shadow-xl">
            <h2 className="mb-4 text-xl font-bold">Podcast erstellen</h2>

            <div className="space-y-4">

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
                <label className="mb-1 block text-sm font-medium">Sprachmodell</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  value={podcastModel}
                  onChange={(e) => setPodcastModel(e.target.value)}
                >
                  <option value="gpt-4o">ChatGPT 4o (Empfohlen)</option>
                  <option value="gpt-4o-mini">ChatGPT 4o Mini (Schnell)</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimentell)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Stimme</label>
                <select
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  value={podcastVoice}
                  onChange={(e) => setPodcastVoice(e.target.value)}
                >
                  {Voices.map(voice => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  OpenAI TTS Stimmen
                </p>
              </div>

              <div>
                <button
                  type="button"
                  className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Erweiterte Optionen ausblenden" : "Erweiterte Optionen anzeigen"}
                </button>
                {showAdvanced && (
                  <div className="mt-3 space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
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
                      <label className="block text-sm font-medium">Segmentgröße</label>
                      <input
                        type="number"
                        min={1000}
                        max={8000}
                        step={100}
                        value={ttsChunkSize}
                        onChange={(e) => setTtsChunkSize(parseInt(e.target.value || "4000", 10))}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                      <p className="mt-1 text-xs text-gray-500">Größe der TTS-Textsegmente. Kleinere Werte können Fehler vermeiden.</p>
                    </div>
                  </div>
                )}
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

    </>
  );
}
