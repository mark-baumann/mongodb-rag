'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';

export default function UploadDocuments() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const resetProgress = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setUploadProgress(null);
  };

  const scheduleProgressHide = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setUploadProgress(null);
      hideTimeoutRef.current = null;
    }, 1500);
  };

  const handleButtonClick = () => {
    resetProgress();
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await uploadFileWithProgress(formData);
      scheduleProgressHide();
      router.refresh();
    } catch (error) {
      console.error('Upload failed', error);
      alert('Der Upload ist fehlgeschlagen. Bitte erneut versuchen.');
      resetProgress();
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const uploadFileWithProgress = (formData: FormData) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });

  return (
    <>
      {uploadProgress !== null && (
        <div className='fixed left-1/2 top-4 z-50 w-full max-w-sm -translate-x-1/2 rounded-lg bg-white p-4 shadow-lg ring-1 ring-black/10'>
          <div className='flex items-center justify-between text-xs font-semibold uppercase text-gray-700'>
            <span>Hochladen</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className='mt-2 h-2 w-full rounded-full bg-gray-200'>
            <div
              className='h-2 rounded-full bg-black transition-all duration-150 ease-out'
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type='file'
        accept='.pdf,application/pdf'
        className='hidden'
        onChange={handleFileChange}
      />

      <button
        type='button'
        onClick={handleButtonClick}
        disabled={isUploading}
        title='Dokument hochladen'
        aria-label='Dokument hochladen'
        className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow ring-1 ring-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-60'
      >
        <Upload className='h-4 w-4' />
      </button>
    </>
  );
}
