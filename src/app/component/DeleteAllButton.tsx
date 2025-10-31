'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

export default function DeleteAllButton() {
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm('Bist du sicher, dass du alle Dokumente und Datenbankeinträge löschen möchtest?')) {
      try {
        const response = await fetch('/api/delete-all', {
          method: 'POST',
        });

        if (response.ok) {
          alert('Alle Dokumente wurden gelöscht.');
          router.refresh();
        } else {
          const data = await response.json();
          alert(`Fehler beim Löschen der Dokumente: ${data.message}`);
        }
      } catch (error) {
        console.error('Fehler beim Löschen der Dokumente:', error);
        alert('Beim Löschen der Dokumente ist ein Fehler aufgetreten.');
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      title='Alle löschen'
      aria-label='Alle löschen'
      className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600 shadow ring-1 ring-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400'
    >
      <Trash2 className='h-4 w-4' />
    </button>
  );
}
