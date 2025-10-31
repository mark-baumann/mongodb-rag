'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, FolderOpen, Trash2 } from 'lucide-react';
import CreatePodcastButton from './CreatePodcastButton';

interface DocumentItemProps {
  document: {
    name: string;
    documentId: string;
    pathname: string;
    folder?: string | null;
  };
  folders: string[];
}

export default function DocumentItem({ document, folders }: DocumentItemProps) {
  const router = useRouter();
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [targetFolder, setTargetFolder] = useState(document.folder ?? '');
  const folderOptionsId = `folder-options-${document.documentId}`;
  const hasFolder = Boolean(document.folder && document.folder.trim().length > 0);

  const handleDelete = async () => {
    if (window.confirm(`Bist du sicher, dass du das Dokument "${document.name}" löschen möchtest?`)) {
      try {
        const response = await fetch('/api/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ documentId: document.documentId, name: document.name }),
        });

        if (response.ok) {
          alert('Dokument wurde gelöscht.');
          router.refresh();
        } else {
          const data = await response.json();
          alert(`Fehler beim Löschen des Dokuments: ${data.message}`);
        }
      } catch (error) {
        console.error('Fehler beim Löschen des Dokuments:', error);
        alert('Beim Löschen des Dokuments ist ein Fehler aufgetreten.');
      }
    }
  };

  const handleOpenMoveModal = () => {
    setTargetFolder(document.folder ?? (folders[0] ?? ''));
    setIsMoveModalOpen(true);
  };

  const handleMoveToFolder = async () => {
    const folderName = targetFolder.trim();

    if (!folderName) {
      alert('Bitte gib einen Ordnernamen ein.');
      return;
    }

    if (!document.documentId) {
      alert('Dokument-ID nicht gefunden.');
      return;
    }

    setIsMoving(true);
    try {
      const response = await fetch('/api/move-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: document.documentId, folderName }),
      });

      if (response.ok) {
        alert(`Dokument wurde dem Ordner "${folderName}" hinzugefügt.`);
        setIsMoveModalOpen(false);
        router.refresh();
      } else {
        const data = await response.json();
        alert(`Fehler beim Verschieben des Dokuments: ${data.message}`);
      }
    } catch (error) {
      console.error('Fehler beim Verschieben des Dokuments:', error);
      alert('Beim Verschieben des Dokuments ist ein Fehler aufgetreten.');
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <li className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between relative'>
      <div className='flex flex-col sm:flex-1'>
        <span className='font-medium text-gray-800 truncate'>{document.name}</span>
        {hasFolder && (
          <span className='text-xs text-gray-500 mt-1'>Ordner: {document.folder}</span>
        )}
      </div>
      <div className='flex items-center gap-2 sm:justify-end'>
        <CreatePodcastButton documentId={document.documentId} />
        <a
          href={`/doc/${document.documentId}/chat`}
          target='_blank'
          rel='noopener noreferrer'
          title='Ansehen'
          aria-label='Ansehen'
          className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-indigo-700 shadow ring-1 ring-indigo-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-400'
        >
          <Eye className='h-4 w-4' />
        </a>
        <button
          onClick={handleOpenMoveModal}
          title={hasFolder ? 'Ordner wechseln' : 'Ordner auswählen'}
          aria-label={hasFolder ? 'Ordner wechseln' : 'Ordner auswählen'}
          className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow ring-1 ring-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400'
        >
          <FolderOpen className='h-4 w-4' />
        </button>
        <button
          onClick={handleDelete}
          title='Löschen'
          aria-label='Löschen'
          className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600 shadow ring-1 ring-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400'
        >
          <Trash2 className='h-4 w-4' />
        </button>
      </div>
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Dokument einem Ordner hinzufügen</h2>
            <label htmlFor={`folder-select-${document.documentId}`} className="block text-sm font-medium text-gray-700 mb-2">
              Ordner auswählen
            </label>
            <select
              id={`folder-select-${document.documentId}`}
              value={targetFolder}
              onChange={(event) => setTargetFolder(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="" disabled>
                Ordner auswählen
              </option>
              {folders.map((folder) => (
                <option key={folder} value={folder}>
                  {folder}
                </option>
              ))}
            </select>
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100"
                disabled={isMoving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleMoveToFolder}
                className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300"
                disabled={isMoving}
              >
                {isMoving ? 'Wird hinzugefügt…' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
