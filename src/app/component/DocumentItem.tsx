'use client';

import { useRouter } from 'next/navigation';

interface DocumentItemProps {
  document: {
    name: string;
    documentId: string;
  };
}

export default function DocumentItem({ document }: DocumentItemProps) {
  const router = useRouter();

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

  return (
    <li className='flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between'>
      <span className='font-medium text-gray-800 truncate'>{document.name}</span>
      <div className='flex items-center gap-3 sm:justify-end'>
        <a
          href={`/doc/${document.documentId}/chat`}
          target='_blank'
          rel='noopener noreferrer'
          className='inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
        >
          Ansehen
        </a>
        <button
          onClick={handleDelete}
          className='inline-flex items-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
        >
          Löschen
        </button>
      </div>
    </li>
  );
}
