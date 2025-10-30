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
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const loadingTask = pdfjsLib.getDocument({ data: e.target.result as ArrayBuffer });
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const renderPage = async (pageNum: number) => {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const container = containerRef.current;
    if (!container) return;

    const scale = container.clientWidth / viewport.width;
    setScale(scale);
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
    await page.render(renderContext).promise;
  };
  
  useImperativeHandle(ref, () => ({
    cropAndGetDataUrl: (box: BoundingBox): string | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const [x1, y1, x2, y2] = box;
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return null;

        const width = (x2 - x1) * canvas.width;
        const height = (y2 - y1) * canvas.height;
        tempCanvas.width = width;
        tempCanvas.height = height;

        tempCtx.drawImage(
            canvas,
            x1 * canvas.width,
            y1 * canvas.height,
            width,
            height,
            0,
            0,
            width,
            height
        );
        return tempCanvas.toDataURL('image/png').split(',')[1];
    }
  }));

  useEffect(() => {
    if (pdfDoc) {
      renderPage(1); // Render the first page
      const handleResize = () => renderPage(1);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [pdfDoc]);
  
  const getBoxStyle = (box: BoundingBox, isActive: boolean = false, isSelection: boolean = false) => {
      const [x1, y1, x2, y2] = box;
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

  const activeBox = activeFieldPath ? get(data, activeFieldPath) : null;
  
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setIsDrawing(true);
    setStartPoint({ x, y });
    onSelectionBoxChange([x, y, x, y]);
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
    onSelectionBoxChange([x1, y1, x2, y2]);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  const getAllBoxes = (invoiceData: InvoiceData): { path: string, box: BoundingBox }[] => {
    const boxes: { path: string, box: BoundingBox }[] = [];

    const recurse = (obj: any, path: string) => {
        if (obj && typeof obj === 'object') {
            if (obj.boundingBox && Array.isArray(obj.boundingBox)) {
                boxes.push({ path: `${path}.boundingBox`, box: obj.boundingBox });
            }
            Object.keys(obj).forEach(key => {
                if(key !== 'boundingBox') {
                   recurse(obj[key], path ? `${path}.${key}` : key);
                }
            });
        }
    };
    
    recurse(invoiceData, '');
    return boxes;
  };
  
  const allBoxes = data ? getAllBoxes(data) : [];

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-auto bg-slate-200 dark:bg-slate-900 flex items-start justify-center">
      {!file && <div className="m-auto text-slate-400 dark:text-slate-500">Document preview will appear here</div>}
      <div 
        className="relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} // Stop drawing if mouse leaves container
      >
        <canvas ref={canvasRef} />
        {data && allBoxes.map(({ path, box }) => (
            <div
                key={path}
                className="absolute"
                style={getBoxStyle(box, path === activeFieldPath)}
            />
        ))}
        {selectionBox && (
            <div
                className="absolute cursor-crosshair"
                style={getBoxStyle(selectionBox, false, true)}
            />
        )}
      </div>
    </div>
  );
});

export default PdfViewer;