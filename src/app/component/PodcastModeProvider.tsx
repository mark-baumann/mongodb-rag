"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

type Podcast = { url: string; title: string; documentId: string };

type PodcastModeContextType = {
  currentPodcast: Podcast | null;
  setCurrentPodcast: (podcast: Podcast | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playlist: Podcast[];
  setPlaylist: (list: Podcast[]) => void;
  playNext: () => void;
  playPrevious: () => void;
};

const PodcastModeContext = createContext<PodcastModeContextType | undefined>(undefined);

export function PodcastModeProvider({ children }: { children: ReactNode }) {
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playlist, setPlaylist] = useState<Podcast[]>([]);

  const playNext = () => {
    if (!currentPodcast || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((p) => p.documentId === currentPodcast.documentId);
    if (currentIndex === -1 || currentIndex === playlist.length - 1) return;

    const nextPodcast = playlist[currentIndex + 1];
    setCurrentPodcast(nextPodcast);
    setIsPlaying(true);
  };

  const playPrevious = () => {
    if (!currentPodcast || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((p) => p.documentId === currentPodcast.documentId);
    if (currentIndex === -1 || currentIndex === 0) return;

    const previousPodcast = playlist[currentIndex - 1];
    setCurrentPodcast(previousPodcast);
    setIsPlaying(true);
  };

  return (
    <PodcastModeContext.Provider
      value={{
        currentPodcast,
        setCurrentPodcast,
        isPlaying,
        setIsPlaying,
        playlist,
        setPlaylist,
        playNext,
        playPrevious,
      }}
    >
      {children}
    </PodcastModeContext.Provider>
  );
}

export function usePodcastMode() {
  const context = useContext(PodcastModeContext);
  if (!context) {
    throw new Error('usePodcastMode must be used within PodcastModeProvider');
  }
  return context;
}
