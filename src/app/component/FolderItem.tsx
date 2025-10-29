'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FolderItemProps {
  folderName: string;
  children?: React.ReactNode;
  documentCount?: number;
}

export default function FolderItem({ folderName, children, documentCount = 0 }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDeleteFolder = async () => {
    if (isDeleting) return;
    const confirmMessage = documentCount > 0
      ? `Soll der Ordner "${folderName}" inklusive ${documentCount} Datei(en) wirklich gelöscht werden?`
      : `Soll der Ordner "${folderName}" wirklich gelöscht werden?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/delete-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderName }),
      });

      if (response.ok) {
        alert(`Ordner "${folderName}" wurde gelöscht.`);
        router.refresh();
      } else {
        const data = await response.json();
        alert(`Fehler beim Löschen des Ordners: ${data.message}`);
      }
    } catch (error) {
      console.error('Fehler beim Löschen des Ordners:', error);
      alert('Beim Löschen des Ordners ist ein Fehler aufgetreten.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex w-full flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-1 items-center justify-between text-left"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="text-xl" aria-hidden>📁</span>
            <div className="flex flex-col truncate">
              <span className="font-medium text-gray-800 truncate">{folderName}</span>
              <span className="text-xs text-gray-500">{documentCount} Datei(en)</span>
            </div>
          </div>
          <span className="text-gray-500 transition-transform duration-200">
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
        </button>
        <button
          type="button"
          onClick={handleDeleteFolder}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70 self-start sm:self-auto"
        >
          <Trash2 size={16} />
          Ordner löschen
        </button>
      </div>
      {isOpen && (
        <div className="border-t border-gray-200 bg-gray-50/60 px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </li>
  );
}
