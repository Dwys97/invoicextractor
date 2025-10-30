import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { InvoiceData, BoundingBox } from '../types';
import { get } from 'lodash-es';

// Set up the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';


interface PdfViewerProps {
  file: File | null;
  data: InvoiceData | null;
  activeFieldPath: string | null;
  selectionBox: BoundingBox | null;
  onSelectionBoxChange: (box: BoundingBox | null) => void;
}

const PdfViewer = forwardRef(({ file, data, activeFieldPath, selectionBox, onSelectionBoxChange }: PdfViewerProps, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTask = useRef<pdfjsLib.RenderTask | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!file) {
      setPdfDoc(null);
      setNumPages(0);
      setCurrentPage(1);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const loadingTask = pdfjsLib.getDocument({ data: e.target.result as ArrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc) return;
    if (renderTask.current) {
      renderTask.current.cancel();
    }

    const page = await pdfDoc.getPage(pageNum);
    const container = containerRef.current;
    if (!container) return;

    const scale = container.clientWidth / page.getViewport({ scale: 1 }).width;
    const scaledViewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    };
    renderTask.current = page.render(renderContext);
    await renderTask.current.promise;
    renderTask.current = null;
  };
  
  useImperativeHandle(ref, () => ({
    cropAndGetDataUrl: async (box: BoundingBox): Promise<string | null> => {
        if (!pdfDoc) return null;
        
        const page = await pdfDoc.getPage(box.page);
        // Use a higher resolution for better OCR results on the cropped image
        const viewport = page.getViewport({ scale: 2.0 });

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;

        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;

        await page.render({ canvasContext: tempCtx, viewport }).promise;

        const finalCanvas = document.createElement('canvas');
        const finalCtx = finalCanvas.getContext('2d');
        if (!finalCtx) return null;

        const { x1, y1, x2, y2 } = box;
        const width = (x2 - x1) * tempCanvas.width;
        const height = (y2 - y1) * tempCanvas.height;
        finalCanvas.width = width;
        finalCanvas.height = height;

        finalCtx.drawImage(
            tempCanvas,
            x1 * tempCanvas.width, y1 * tempCanvas.height, width, height,
            0, 0, width, height
        );
        return finalCanvas.toDataURL('image/png').split(',')[1];
    }
  }));

  useEffect(() => {
    if (pdfDoc) {
      renderPage(currentPage);
      const handleResize = () => renderPage(currentPage);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [pdfDoc, currentPage]);
  
  const getBoxStyle = (box: BoundingBox, isActive: boolean = false, isSelection: boolean = false) => {
      const { x1, y1, x2, y2 } = box;
      const baseStyle = {
          left: `${x1 * 100}%`,
          top: `${y1 * 100}%`,
          width: `${(x2 - x1) * 100}%`,
          height: `${(y2 - y1) * 100}%`,
      };
      if (isSelection) {
        return { ...baseStyle, border: '2px dashed #0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.2)' };
      }
      if (isActive) {
        return { ...baseStyle, border: '2px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.2)' };
      }
      return { ...baseStyle, border: '1px solid #ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' };
  };

  const activeBox = activeFieldPath ? get(data, activeFieldPath) as BoundingBox | undefined : null;
  if (activeBox && activeBox.page !== currentPage) {
      setCurrentPage(activeBox.page);
  }
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setIsDrawing(true);
    setStartPoint({ x, y });
    onSelectionBoxChange({ page: currentPage, x1: x, y1: y, x2: x, y2: y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;

    const x1 = Math.min(startPoint.x, currentX);
    const y1 = Math.min(startPoint.y, currentY);
    const x2 = Math.max(startPoint.x, currentX);
    const y2 = Math.max(startPoint.y, currentY);
    onSelectionBoxChange({ page: currentPage, x1, y1, x2, y2 });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  const getAllBoxes = (invoiceData: InvoiceData): { path: string, box: BoundingBox }[] => {
      const boxes: { path: string, box: BoundingBox }[] = [];
      const recurse = (current: any, path: string) => {
          if (current === null || typeof current !== 'object') {
              return;
          }
          if (current.boundingBox && typeof current.boundingBox === 'object' && 'page' in current.boundingBox) {
              boxes.push({ path: `${path}.boundingBox`, box: current.boundingBox });
          }

          if (Array.isArray(current)) {
              current.forEach((item, index) => {
                  recurse(item, `${path}[${index}]`);
              });
          } else {
              Object.keys(current).forEach(key => {
                  if (key !== 'boundingBox') {
                      const newPath = path ? `${path}.${key}` : key;
                      recurse(current[key], newPath);
                  }
              });
          }
      };
      recurse(invoiceData, '');
      return boxes;
  };
  
  const allBoxes = data ? getAllBoxes(data) : [];

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-auto bg-slate-200 dark:bg-slate-900 flex items-start justify-center p-4">
      {!file && <div className="m-auto text-slate-400 dark:text-slate-500">Document preview will appear here</div>}
      <div 
        className="relative shadow-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves container
      >
        <canvas ref={canvasRef} />
        {data && allBoxes
            .filter(({ box }) => box.page === currentPage)
            .map(({ path, box }) => (
            <div
                key={path}
                className="absolute pointer-events-none"
                style={getBoxStyle(box, path === activeFieldPath)}
            />
        ))}
        {selectionBox && selectionBox.page === currentPage && (
            <div
                className="absolute cursor-crosshair pointer-events-none"
                style={getBoxStyle(selectionBox, false, true)}
            />
        )}
      </div>
       {numPages > 1 && (
         <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 bg-opacity-70 backdrop-blur-sm text-white rounded-full px-4 py-1.5 flex items-center gap-4 text-sm shadow-lg">
           <button 
             onClick={() => setCurrentPage(p => p - 1)} 
             disabled={currentPage <= 1}
             className="disabled:opacity-50"
            >
             ‹ Prev
           </button>
           <span>{currentPage} / {numPages}</span>
           <button 
             onClick={() => setCurrentPage(p => p + 1)} 
             disabled={currentPage >= numPages}
             className="disabled:opacity-50"
            >
             Next ›
           </button>
         </div>
       )}
    </div>
  );
});

export default PdfViewer;