"use client";

import { useEffect } from 'react';
import { usePodcastMode } from './PodcastModeProvider';

type PlaylistItem = {
  documentId: string;
  title: string;
  url: string;
};

type Props = {
  items: PlaylistItem[];
};

export default function PlaylistInitializer({ items }: Props) {
  const { setPlaylist } = usePodcastMode();

  useEffect(() => {
    console.log('Initializing playlist with', items.length, 'items');
    setPlaylist(items);
  }, [items, setPlaylist]);

  return null;
}
