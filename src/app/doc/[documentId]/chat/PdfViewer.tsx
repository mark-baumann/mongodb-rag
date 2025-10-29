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
    if (!pdfRef.current || numPages === 0) {
      return;
    }

    let cancelled = false;

    const renderPage = async (pageIndex: number) => {
      if (!pdfRef.current || cancelled) return;

      let pageContainer = pageRefs.current[pageIndex - 1];
      let attempts = 0;

      while (!pageContainer && attempts < 8) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
        if (cancelled) return;
        pageContainer = pageRefs.current[pageIndex - 1];
        attempts += 1;
      }

      if (!pageContainer || pageContainer.childElementCount > 0) return;

      try {
        const page = await pdfRef.current.getPage(pageIndex);
        if (cancelled) return;

        const parentRect = pageContainer.parentElement?.getBoundingClientRect();
        const containerWidth = pageContainer.getBoundingClientRect().width || 0;
        const availableWidth = containerWidth || parentRect?.width || 0;

        const baseViewport = page.getViewport({ scale: 1, rotation: page.rotate });
        const fallbackWidth = window.innerWidth || baseViewport.width;
        const safeWidth = availableWidth > 0 ? availableWidth : fallbackWidth;
        const scale = safeWidth / baseViewport.width;
        const viewport = page.getViewport({ scale, rotation: page.rotate });
        const outputScale = window.devicePixelRatio || 1;

        pageContainer.style.position = 'relative';
        pageContainer.style.width = '100%';
        pageContainer.style.minHeight = `${viewport.height}px`;
        pageContainer.style.maxWidth = '100%';
        pageContainer.style.backgroundColor = '#ffffff';

        const canvas = document.createElement('canvas');
        canvas.className = 'w-full h-auto';
        pageContainer.appendChild(canvas);

        const context = canvas.getContext('2d');
        if (!context) {
          pageContainer.removeChild(canvas);
          return;
        }

        const scaledWidth = Math.floor(viewport.width * outputScale);
        const scaledHeight = Math.floor(viewport.height * outputScale);

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const renderContext = {
          canvasContext: context,
          viewport,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
        };

        await page.render(renderContext).promise;
        if (cancelled) {
          return;
        }

        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        textLayerDiv.style.position = 'absolute';
        textLayerDiv.style.top = '0';
        textLayerDiv.style.left = '0';
        textLayerDiv.style.transformOrigin = '0 0';
        pageContainer.appendChild(textLayerDiv);

        const textContent = await page.getTextContent();
        if (cancelled) return;

        pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textLayerDiv,
          viewport,
          textDivs: [],
        });
      } catch (error) {
        console.error(`Error rendering page ${pageIndex}:`, error);
      }
    };

    const renderAllPages = async () => {
      for (let pageIndex = 1; pageIndex <= numPages; pageIndex++) {
        if (cancelled) break;
        await renderPage(pageIndex);
      }
    };

    renderAllPages();

    return () => {
      cancelled = true;
    };
  }, [numPages]);

  return (
    <div className="p-4 sm:p-6 flex flex-col items-center gap-[5px] sm:gap-4 lg:gap-6">
      {Array.from(new Array(numPages), (el, index) => (
        <div
          key={`page_${index + 1}`}
          ref={(el) => (pageRefs.current[index] = el)}
          data-page-number={index + 1}
          className="shadow-lg relative w-full"
          style={{ direction: 'ltr' }}
        />
      ))}
    </div>
  );
};

export default PdfViewer;
