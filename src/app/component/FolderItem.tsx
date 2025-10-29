'use client';

import React, { useState } from 'react';

interface FolderItemProps {
  folderName: string;
  children?: React.ReactNode;
}

export default function FolderItem({ folderName, children }: FolderItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📁</span>
          <span className="font-medium text-gray-800">{folderName}</span>
        </div>
        <span className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>
          ▶
        </span>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </li>
  );
}