'use client';

import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';

export default function CreateFolderButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      alert('Bitte gib einen Ordnernamen ein.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/create-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderName }),
      });

      if (response.ok) {
        alert(`Ordner "${folderName}" wurde erstellt.`);
        setIsModalOpen(false);
        setFolderName('');
        // Here you would typically refresh the document list
        window.location.reload(); // Simple refresh for now
      } else {
        const data = await response.json();
        alert(`Fehler beim Erstellen des Ordners: ${data.message}`);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Ordners:', error);
      alert('Beim Erstellen des Ordners ist ein Fehler aufgetreten.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        title='Ordner erstellen'
        aria-label='Ordner erstellen'
        className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-blue-700 shadow ring-1 ring-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400'
      >
        <FolderPlus className='h-4 w-4' />
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Neuen Ordner erstellen</h2>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Ordnername"
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-gray-800"
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-md text-gray-600 hover:bg-gray-100"
                disabled={isCreating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateFolder}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300"
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isCreating ? 'Erstelle…' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
