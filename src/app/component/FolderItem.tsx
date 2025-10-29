import React from 'react';

interface FolderItemProps {
  folderName: string;
}

export default function FolderItem({ folderName }: FolderItemProps) {
  return (
    <li className='flex items-center justify-between rounded-lg border border-gray-200 bg-yellow-100 px-4 py-3 shadow-sm'>
      <span className='font-medium text-gray-800'>{folderName}</span>
      {/* Drag and drop handles will be added here */}
    </li>
  );
}
