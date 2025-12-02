'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { useApiKey } from './ApiKeyProvider';
import { toast } from 'react-toastify';

export default function UploadDocuments() {
  const router = useRouter();
  const { podcastConfig, apiKey, googleApiKey } = useApiKey();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingPodcast, setIsGeneratingPodcast] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        setIsAuthenticated(!!data?.authenticated);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

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
    if (!isAuthenticated) {
      toast.error('Bitte zuerst einloggen');
      return;
    }
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

    let documentId: string | null = null;
    let documentName: string = '';

    const toastId = toast.loading('Datei wird hochgeladen...');

    try {
      toast.update(toastId, { render: 'PDF wird hochgeladen...', type: 'info', isLoading: true });
      const uploadResult = await uploadFileWithProgress(formData);
      documentId = uploadResult;
      documentName = file.name;

      console.log('Upload complete, documentId:', documentId);
      console.log('Auto-generate enabled:', podcastConfig.autoGenerate);

      toast.update(toastId, { render: 'PDF erfolgreich hochgeladen!', type: 'success', isLoading: false, autoClose: 2000 });
      scheduleProgressHide();
      router.refresh();

      // Auto-generate podcast if enabled
      if (podcastConfig.autoGenerate && documentId) {
        console.log('Starting auto-generate podcast for:', documentId);
        setIsGeneratingPodcast(true);
        const podcastToastId = toast.loading('Podcast-Skript wird erstellt...');

        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };

          if (apiKey) {
            headers['X-OpenAI-API-Key'] = apiKey;
          }
          if (googleApiKey) {
            headers['X-Google-API-Key'] = googleApiKey;
          }

          console.log('Calling podcast API with config:', {
            documentId,
            model: podcastConfig.model,
            targetMinutes: podcastConfig.targetMinutes,
            voice: podcastConfig.voice,
            persona: podcastConfig.persona,
          });

          toast.update(podcastToastId, { render: `Podcast-Skript wird mit ${podcastConfig.model} erstellt...`, isLoading: true });

          const res = await fetch('/api/podcast', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              documentId,
              targetMinutes: podcastConfig.targetMinutes,
              model: podcastConfig.model,
              voice: podcastConfig.voice,
              persona: podcastConfig.persona,
              ttsChunkSize: 4000,
            }),
          });

          console.log('Podcast API response status:', res.status);

          if (res.ok) {
            toast.update(podcastToastId, {
              render: 'Podcast erfolgreich erstellt!',
              type: 'success',
              isLoading: false,
              autoClose: 3000
            });
            router.refresh();
          } else {
            const data = await res.json().catch(() => ({}));
            toast.update(podcastToastId, {
              render: data.message || 'Podcast-Generierung fehlgeschlagen',
              type: 'error',
              isLoading: false,
              autoClose: 5000
            });
            console.error('Podcast API error:', data);
          }
        } catch (podcastError) {
          console.error('Podcast generation failed', podcastError);
          toast.update(podcastToastId, {
            render: 'Podcast-Generierung fehlgeschlagen',
            type: 'error',
            isLoading: false,
            autoClose: 5000
          });
        } finally {
          setIsGeneratingPodcast(false);
        }
      } else {
        console.log('Auto-generate skipped. Enabled:', podcastConfig.autoGenerate, 'DocumentId:', documentId);
      }
    } catch (error) {
      console.error('Upload failed', error);
      toast.update(toastId, {
        render: 'Upload fehlgeschlagen. Bitte erneut versuchen.',
        type: 'error',
        isLoading: false,
        autoClose: 5000
      });
      resetProgress();
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const uploadFileWithProgress = (formData: FormData) =>
    new Promise<string>((resolve, reject) => {
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
          try {
            const response = JSON.parse(xhr.responseText);
            console.log('Upload response:', response);
            const docId = response.document?.documentId || response.documentId || '';
            console.log('Extracted documentId:', docId);
            resolve(docId);
          } catch (err) {
            console.error('Failed to parse upload response:', err);
            resolve('');
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });

  if (!isAuthenticated) {
    return null;
  }

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
        disabled={isUploading || isGeneratingPodcast}
        title={isGeneratingPodcast ? 'Podcast wird generiert...' : 'Dokument hochladen'}
        aria-label='Dokument hochladen'
        className='inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-gray-900 shadow ring-1 ring-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-60 active:bg-gray-100'
      >
        <Upload className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isGeneratingPodcast ? 'animate-pulse' : ''}`} />
      </button>
    </>
  );
}
