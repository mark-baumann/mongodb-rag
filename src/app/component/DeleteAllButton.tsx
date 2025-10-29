'use client';

import { useRouter } from 'next/navigation';

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
      className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
    >
      All Löschen
    </button>
  );
}
