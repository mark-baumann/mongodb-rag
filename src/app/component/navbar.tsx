"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Settings2, Menu, X as CloseIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { useApiKey } from './ApiKeyProvider';

const NavBar: React.FC = () => {
  const { apiKey, setApiKey, isSettingsOpen, openSettings, closeSettings } = useApiKey();
  const [draftKey, setDraftKey] = useState('');
  const [draftPassword, setDraftPassword] = useState('');
  const [isAuthed, setIsAuthed] = useState<boolean>(false);
  const [authMessage, setAuthMessage] = useState<string>('');
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

  // Podcast UI removed; handled on homepage per document

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
            <Link
              href="/settings"
              title="Einstellungen"
              aria-label="Einstellungen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            >
              <Settings2 className="h-4 w-4" />
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
              <Link
                href="/settings"
                title="Einstellungen"
                aria-label="Einstellungen"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <Settings2 className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </nav>
      {isSettingsOpen && null}
    </>
  );
};

export default NavBar;
