'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type ApiKeyContextValue = {
  apiKey: string;
  setApiKey: (value: string) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

const STORAGE_KEY = 'openai-api-key';

const ApiKeyContext = createContext<ApiKeyContextValue | undefined>(undefined);

export const ApiKeyProvider = ({ children }: { children: React.ReactNode }) => {
  const [apiKey, internalSetApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        internalSetApiKey(stored);
      }
    } catch (error) {
      console.warn('Failed to read API key from storage', error);
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

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);

  const value = useMemo(
    () => ({
      apiKey,
      setApiKey,
      isSettingsOpen,
      openSettings,
      closeSettings,
    }),
    [apiKey, setApiKey, isSettingsOpen, openSettings, closeSettings],
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
