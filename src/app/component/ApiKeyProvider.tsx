'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type PodcastConfig = {
  autoGenerate: boolean;
  model: string;
  voice: string;
  targetMinutes: number;
  persona: string;
};

type ApiKeyContextValue = {
  apiKey: string;
  setApiKey: (value: string) => void;
  googleApiKey: string;
  setGoogleApiKey: (value: string) => void;
  podcastConfig: PodcastConfig;
  setPodcastConfig: (config: PodcastConfig) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const STORAGE_KEY = 'openai-api-key';
const GOOGLE_STORAGE_KEY = 'google-api-key';
const PODCAST_CONFIG_KEY = 'podcast-config';

const DEFAULT_PODCAST_CONFIG: PodcastConfig = {
  autoGenerate: false,
  model: 'gpt-4o',
  voice: 'alloy',
  targetMinutes: 5,
  persona: 'sachlich',
};

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

export const ApiKeyProvider = ({ children }: { children: React.ReactNode }) => {
  const [apiKey, internalSetApiKey] = useState('');
  const [googleApiKey, internalSetGoogleApiKey] = useState('');
  const [podcastConfig, internalSetPodcastConfig] = useState<PodcastConfig>(DEFAULT_PODCAST_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        internalSetApiKey(stored);
      }
      const googleStored = window.localStorage.getItem(GOOGLE_STORAGE_KEY);
      if (googleStored) {
        internalSetGoogleApiKey(googleStored);
      }
      const configStored = window.localStorage.getItem(PODCAST_CONFIG_KEY);
      if (configStored) {
        internalSetPodcastConfig(JSON.parse(configStored));
      }
    } catch (error) {
      console.warn('Failed to read settings from storage', error);
    }
  }, []);

  const setApiKey = useCallback((value: string) => {
    internalSetApiKey(value);
    if (typeof window === 'undefined') return;
    try {
      if (value) {
        window.localStorage.setItem(STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist API key', error);
    }
  }, []);

  const setGoogleApiKey = useCallback((value: string) => {
    internalSetGoogleApiKey(value);
    if (typeof window === 'undefined') return;
    try {
      if (value) {
        window.localStorage.setItem(GOOGLE_STORAGE_KEY, value);
      } else {
        window.localStorage.removeItem(GOOGLE_STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Failed to persist Google API key', error);
    }
  }, []);

  const setPodcastConfig = useCallback((config: PodcastConfig) => {
    internalSetPodcastConfig(config);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PODCAST_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to persist podcast config', error);
    }
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const value = useMemo(
    () => ({
      apiKey,
      setApiKey,
      googleApiKey,
      setGoogleApiKey,
      podcastConfig,
      setPodcastConfig,
      isSettingsOpen,
      openSettings,
      closeSettings,
    }),
    [apiKey, setApiKey, googleApiKey, setGoogleApiKey, podcastConfig, setPodcastConfig, isSettingsOpen, openSettings, closeSettings],
  );

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
};

export const useApiKey = (): ApiKeyContextValue => {
  const context = useContext(ApiKeyContext);
  if (!context) {
    throw new Error('useApiKey must be used within an ApiKeyProvider');
  }
  return context;
};
