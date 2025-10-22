'use client';

import { useRouter } from 'next/navigation';

export default function DeleteAllButton() {
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete all documents and database entries?')) {
      try {
        const response = await fetch('/api/delete-all', {
          method: 'POST',
        });

        if (response.ok) {
          alert('All documents have been deleted.');
          router.refresh();
        } else {
          const data = await response.json();
          alert(`Failed to delete documents: ${data.message}`);
        }
      } catch (error) {
        console.error('Error deleting documents:', error);
        alert('An error occurred while deleting the documents.');
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded'
    >
      Delete All
    </button>
  );
}
