'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';

interface PdfViewerProps {
  url: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const loadingTask = pdfjsLib.getDocument(proxyUrl);
        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2;
          const viewport = page.getViewport({ scale, rotation: page.rotate });
          const pageContainer = pageRefs.current[i - 1];

          if (pageContainer) {
            pageContainer.style.width = `${viewport.width}px`;
            pageContainer.style.height = `${viewport.height}px`;

            const canvas = document.createElement('canvas');
            pageContainer.appendChild(canvas);
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (context) {
              const renderContext = {
                canvasContext: context,
                viewport: viewport,
              };
              await page.render(renderContext).promise;
            }

            const textLayerDiv = document.createElement('div');
            textLayerDiv.className = 'textLayer';
            pageContainer.appendChild(textLayerDiv);

            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({
              textContentSource: textContent,
              container: textLayerDiv,
              viewport: viewport,
              textDivs: [],
            });
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
    <div className="p-4 flex flex-col items-center">
      {Array.from(new Array(numPages), (el, index) => (
        <div
          key={`page_${index + 1}`}
          ref={(el) => (pageRefs.current[index] = el)}
          className="mb-4 shadow-lg relative"
          style={{ direction: 'ltr' }}
        />
      ))}
    </div>
  );
};

export default PdfViewer;