"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;

interface PdfViewerProps {
  url: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [numPages, setNumPages] = useState<number>(0);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const loadingTask = pdfjsLib.getDocument(proxyUrl);
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2, rotation: page.rotate });
          const canvas = canvasRefs.current[i - 1];

          if (canvas) {
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              await page.render(renderContext).promise;
            }
          }
        }
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    if (url) {
      loadPdf();
    }
  }, [url]);

  return (
    <div className="p-4">
      {Array.from(new Array(numPages), (el, index) => (
        <canvas
          key={`page_${index + 1}`}
          ref={(el) => (canvasRefs.current[index] = el)}
          className="w-full mb-4 shadow-lg"
        />
      ))}
    </div>
  );
};

export default PdfViewer;
