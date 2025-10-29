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
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const loadingTask = pdfjsLib.getDocument(proxyUrl);
        const pdf = await loadingTask.promise;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    if (url) {
      loadPdf();
    }
  }, [url]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting) {
            const pageIndex = parseInt((entry.target as HTMLElement).dataset.pageNumber || '0', 10);
            if (pageIndex > 0 && pdfRef.current) {
              const pageContainer = pageRefs.current[pageIndex - 1];
              if (pageContainer && pageContainer.childElementCount === 0) { // Render only once
                const page = await pdfRef.current.getPage(pageIndex);
                const scale = 2;
                const viewport = page.getViewport({ scale, rotation: page.rotate });

                pageContainer.style.width = `${viewport.width / 2}px`;
                pageContainer.style.height = `${viewport.height / 2}px`;
                pageContainer.style.maxWidth = '100%';

                const canvas = document.createElement('canvas');
                canvas.className = 'w-full h-auto';
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
          }
        });
      },
      { rootMargin: '50px' } // Pre-load pages that are 50px away from the viewport
    );

    pageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      pageRefs.current.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [numPages]);

  return (
    <div className="p-4 flex flex-col items-center gap-8">
      {Array.from(new Array(numPages), (el, index) => (
        <div
          key={`page_${index + 1}`}
          ref={(el) => (pageRefs.current[index] = el)}
          data-page-number={index + 1}
          className="shadow-lg relative"
          style={{ direction: 'ltr' }}
        />
      ))}
    </div>
  );
};

export default PdfViewer;
