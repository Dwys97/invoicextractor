import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { InvoiceData, BoundingBox, Table } from '../types';
import { get } from 'lodash-es';
import { MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowUturnLeftIcon, TableCellsIcon, TrashIcon } from './Icons';


// Set up the worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/build/pdf.worker.mjs';

type BboxInteractionMode = 'idle' | 'drag' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br';
interface BboxInteractionState {
    mode: BboxInteractionMode;
    path: string;
    startX: number; // Screen coordinates
    startY: number;
    startBox: BoundingBox; // PDF coordinates (0-1)
}

type GridInteractionMode = 'idle' | 'drag-row' | 'drag-col';
interface GridInteractionState {
    mode: GridInteractionMode;
    tableIndex: number;
    lineIndex: number;
    startX: number;
    startY: number;
    startTable: Table; // Store the state of the table at the beginning of the drag
}


interface PdfViewerProps {
  file: File | null;
  data: InvoiceData | null;
  activeFieldPath: string | null;
  onBoxUpdate?: (path: string, newBox: BoundingBox) => void;
  onBoxClick?: (path: string) => void;
  onTableUpdate?: (tableIndex: number, newTable: Table) => void;
  showGridlines: boolean;
  onToggleGridlines: () => void;
}

const PdfViewer = forwardRef(({ file, data, activeFieldPath, onBoxUpdate, onBoxClick, onTableUpdate, showGridlines, onToggleGridlines }: PdfViewerProps, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTask = useRef<pdfjsLib.RenderTask | null>(null);
  const pendingZoomRef = useRef<BoundingBox | null>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [bboxInteraction, setBboxInteraction] = useState<BboxInteractionState>({ mode: 'idle', path: '', startX: 0, startY: 0, startBox: { page: 0, x1: 0, y1: 0, x2: 0, y2: 0 } });
  const [gridInteraction, setGridInteraction] = useState<GridInteractionState>({ mode: 'idle', tableIndex: -1, lineIndex: -1, startX: 0, startY: 0, startTable: { boundingBox: { page:0, x1:0, y1:0, x2:0, y2:0 }, rows: [], columns: [] } });


  const performZoom = useCallback((box: BoundingBox) => {
    if (!containerRef.current || !canvasRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const baseCanvasWidth = parseFloat(canvasRef.current.style.width);
    const baseCanvasHeight = parseFloat(canvasRef.current.style.height);

    if (isNaN(baseCanvasWidth) || isNaN(baseCanvasHeight) || baseCanvasWidth === 0) return;

    const boxWidth = (box.x2 - box.x1) * baseCanvasWidth;
    const boxHeight = (box.y2 - box.y1) * baseCanvasHeight;

    const targetBoxDisplaySize = Math.min(containerWidth, containerHeight) * 0.3;
    
    const scaleX = boxWidth > 0 ? targetBoxDisplaySize / boxWidth : 1;
    const scaleY = boxHeight > 0 ? targetBoxDisplaySize / boxHeight : 1;
    const newScale = Math.min(scaleX, scaleY, 5); // Add a max zoom
    
    const boxCenterX = (box.x1 + (box.x2 - box.x1) / 2) * baseCanvasWidth;
    const boxCenterY = (box.y1 + (box.y2 - box.y1) / 2) * baseCanvasHeight;

    const newX = (containerWidth / 2) - (boxCenterX * newScale);
    const newY = (containerHeight / 2) - (boxCenterY * newScale);

    setScale(newScale);
    setTransform({ x: newX, y: newY });
  }, []);


  useImperativeHandle(ref, () => ({
    zoomToBox: (box: BoundingBox) => {
      if (box.page !== currentPage) {
        pendingZoomRef.current = box;
        setCurrentPage(box.page);
      } else {
        performZoom(box);
      }
    }
  }));

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
        try {
            const pdf = await loadingTask.promise;
            setPdfDoc(pdf);
            setNumPages(pdf.numPages);
            setCurrentPage(1);
        } catch(error) {
            console.error("Failed to load PDF:", error);
            setPdfDoc(null);
            setNumPages(0);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  }, [file]);

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    if (renderTask.current) {
      renderTask.current.cancel();
    }

    const page = await pdfDoc.getPage(pageNum);
    const container = containerRef.current;
    if (!container) return;

    const baseScale = (container.clientWidth * 2) / page.getViewport({ scale: 1 }).width;
    const scaledViewport = page.getViewport({ scale: baseScale });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.height = scaledViewport.height;
    canvas.width = scaledViewport.width;
    canvas.style.width = `${scaledViewport.width / 2}px`;
    canvas.style.height = `${scaledViewport.height / 2}px`;

    const renderContext = {
      canvasContext: context,
      viewport: scaledViewport,
    };
    renderTask.current = page.render(renderContext);
    try {
        await renderTask.current.promise;
        if (pendingZoomRef.current && pendingZoomRef.current.page === pageNum) {
          performZoom(pendingZoomRef.current);
          pendingZoomRef.current = null;
        }
    } catch(error: any) {
        if (error.name !== 'RenderingCancelled') {
            console.error("Page rendering error:", error);
        }
    }
    renderTask.current = null;
  }, [pdfDoc, performZoom]);


  const handleResetZoom = useCallback(() => {
    setScale(1);
    setTransform({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (pdfDoc) {
      const doRender = () => renderPage(currentPage);
      let timeoutId: number | null = null;
      const handleResize = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(() => {
            handleResetZoom();
            doRender();
        }, 100);
      };
      
      doRender();
      
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
        if (renderTask.current) {
            renderTask.current.cancel();
        }
      };
    }
  }, [pdfDoc, currentPage, renderPage, handleResetZoom]);
  
  const screenToPdfCoords = (screenX: number, screenY: number): { x: number, y: number } | null => {
    if (!canvasRef.current || !canvasRef.current.parentElement) return null;
    const canvas = canvasRef.current;
    const parent = canvas.parentElement;

    const rect = parent.getBoundingClientRect();
    const canvasWidth = parseFloat(canvas.style.width);
    const canvasHeight = parseFloat(canvas.style.height);

    const canvasSpaceX = (screenX - rect.left - transform.x) / scale;
    const canvasSpaceY = (screenY - rect.top - transform.y) / scale;

    const pdfX = canvasSpaceX / canvasWidth;
    const pdfY = canvasSpaceY / canvasHeight;

    if (pdfX < 0 || pdfX > 1 || pdfY < 0 || pdfY > 1) return null;

    return { x: pdfX, y: pdfY };
  };

  const handleBboxMouseDown = (e: React.MouseEvent<HTMLDivElement>, path: string, mode: BboxInteractionMode) => {
    e.preventDefault();
    e.stopPropagation();
    
    onBoxClick?.(path);

    const box = get(data, path) as BoundingBox | undefined;
    if (box) {
      setBboxInteraction({
        mode,
        path,
        startX: e.clientX,
        startY: e.clientY,
        startBox: { ...box }
      });
    }
  };
  
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>, mode: GridInteractionMode, tableIndex: number, lineIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (data?.tables?.[tableIndex]) {
        setGridInteraction({
            mode,
            tableIndex,
            lineIndex,
            startX: e.clientX,
            startY: e.clientY,
            startTable: JSON.parse(JSON.stringify(data.tables[tableIndex]))
        });
    }
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (bboxInteraction.mode !== 'idle' && onBoxUpdate && canvasRef.current) {
        const { mode, path, startX, startY, startBox } = bboxInteraction;
        const dx = (e.clientX - startX) / scale / parseFloat(canvasRef.current.style.width);
        const dy = (e.clientY - startY) / scale / parseFloat(canvasRef.current.style.height);
        
        let newBox: BoundingBox = { ...startBox };
        switch (mode) {
            case 'drag': newBox.x1 += dx; newBox.y1 += dy; newBox.x2 += dx; newBox.y2 += dy; break;
            case 'resize-tl': newBox.x1 += dx; newBox.y1 += dy; break;
            case 'resize-tr': newBox.x2 += dx; newBox.y1 += dy; break;
            case 'resize-bl': newBox.x1 += dx; newBox.y2 += dy; break;
            case 'resize-br': newBox.x2 += dx; newBox.y2 += dy; break;
        }
        if (newBox.x1 > newBox.x2) [newBox.x1, newBox.x2] = [newBox.x2, newBox.x1];
        if (newBox.y1 > newBox.y2) [newBox.y1, newBox.y2] = [newBox.y2, newBox.y1];
        onBoxUpdate(path, newBox);
      } else if (gridInteraction.mode !== 'idle' && onTableUpdate && canvasRef.current) {
          const { mode, tableIndex, lineIndex, startX, startY, startTable } = gridInteraction;
          
          let newTable = JSON.parse(JSON.stringify(startTable));
          
          if (mode === 'drag-col') {
            const dx = (e.clientX - startX) / scale / parseFloat(canvasRef.current.style.width);
            const originalCol = startTable.columns[lineIndex];
            newTable.columns[lineIndex] = Math.max(0, Math.min(1, originalCol + dx));
          } else if (mode === 'drag-row') {
            const dy = (e.clientY - startY) / scale / parseFloat(canvasRef.current.style.height);
            const originalRow = startTable.rows[lineIndex];
            newTable.rows[lineIndex] = Math.max(0, Math.min(1, originalRow + dy));
          }
          
          onTableUpdate(tableIndex, newTable);
      }
    };

    const handleMouseUp = () => {
      if (gridInteraction.mode.startsWith('drag-') && onTableUpdate && data?.tables?.[gridInteraction.tableIndex]) {
          const { tableIndex } = gridInteraction;
          const tableToFinalize = data.tables[tableIndex];
          const finalTable = JSON.parse(JSON.stringify(tableToFinalize));
          finalTable.rows.sort((a: number, b: number) => a - b);
          finalTable.columns.sort((a: number, b: number) => a - b);
          onTableUpdate(tableIndex, finalTable);
      }

      setBboxInteraction({ mode: 'idle', path: '', startX: 0, startY: 0, startBox: { page: 0, x1: 0, y1: 0, x2: 0, y2: 0 } });
      setGridInteraction({ mode: 'idle', tableIndex: -1, lineIndex: -1, startX: 0, startY: 0, startTable: { boundingBox: { page:0, x1:0, y1:0, x2:0, y2:0 }, rows: [], columns: [] } });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [bboxInteraction, gridInteraction, onBoxUpdate, onTableUpdate, scale, data]);
  
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!data?.tables || !onTableUpdate) return;
    const coords = screenToPdfCoords(e.clientX, e.clientY);
    if (!coords) return;

    for (let i = 0; i < data.tables.length; i++) {
        const table = data.tables[i];
        if (coords.x >= table.boundingBox.x1 && coords.x <= table.boundingBox.x2 &&
            coords.y >= table.boundingBox.y1 && coords.y <= table.boundingBox.y2) {
            
            const newTable = JSON.parse(JSON.stringify(table));
            if (e.altKey) { // Add column with alt key
                 newTable.columns.push(coords.x);
                 newTable.columns.sort((a: number, b: number) => a - b);
            } else { // Default to adding row
                 newTable.rows.push(coords.y);
                 newTable.rows.sort((a: number, b: number) => a - b);
            }
            onTableUpdate(i, newTable);
            return;
        }
    }
  };
  
  const handleDeleteLine = (tableIndex: number, type: 'row' | 'col', lineIndex: number) => {
      if (!data?.tables || !onTableUpdate) return;
      const table = data.tables[tableIndex];
      const newTable = JSON.parse(JSON.stringify(table));
      if (type === 'row') {
          newTable.rows.splice(lineIndex, 1);
      } else {
          newTable.columns.splice(lineIndex, 1);
      }
      onTableUpdate(tableIndex, newTable);
  };
  
  const getAllBoxes = (invoiceData: InvoiceData): { path: string, box: BoundingBox }[] => {
      const boxes: { path: string, box: BoundingBox }[] = [];
      const recurse = (current: any, path: string) => {
          if (current === null || typeof current !== 'object') return;
          
          if (current.boundingBox && typeof current.boundingBox === 'object' && 'page' in current.boundingBox) {
              const fullPath = path.endsWith('.fields') ? path.replace(/\.fields$/, `.boundingBox`) : `${path}.boundingBox`;
              boxes.push({ path: fullPath, box: current.boundingBox });
          }
          
          if (current.fields && typeof current.fields === 'object') {
             Object.keys(current.fields).forEach(key => {
                 const fieldMeta = current.fields[key];
                 if(fieldMeta && fieldMeta.boundingBox) {
                     boxes.push({ path: `${path}.fields.${key}.boundingBox`, box: fieldMeta.boundingBox});
                 }
             })
          }

          if (Array.isArray(current)) {
              current.forEach((item, index) => recurse(item, `${path}[${index}]`));
          } else {
              Object.keys(current).forEach(key => {
                  if (key !== 'boundingBox' && key !== 'fields' && key !== 'tables') {
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

  const handleZoomIn = () => setScale(s => s * 1.2);
  const handleZoomOut = () => setScale(s => Math.max(0.5, s / 1.2));
  
  const ResizeHandle: React.FC<{ onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void, cursor: string, position: {top?: string, left?: string, right?: string, bottom?: string} }> = 
    ({ onMouseDown, cursor, position }) => (
    <div 
      onMouseDown={onMouseDown}
      className="absolute w-3 h-3 bg-blue-500 border-2 border-white rounded-full -m-1.5 z-20"
      style={{ ...position, cursor }}
    />
  );

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-200 dark:bg-slate-900 flex items-start justify-center p-4" onDoubleClick={handleDoubleClick}>
      {!file && <div className="m-auto text-slate-400 dark:text-slate-500">Document preview will appear here</div>}
      <div 
        className="relative shadow-lg transition-transform duration-300 ease-in-out"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${scale})`, transformOrigin: 'top left' }}
      >
        <canvas ref={canvasRef} />
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {data && allBoxes
                .filter(({ box }) => box && box.page === currentPage)
                .map(({ path, box }) => {
                    const isActive = path === activeFieldPath;
                    const style: React.CSSProperties = {
                        left: `${box.x1 * 100}%`,
                        top: `${box.y1 * 100}%`,
                        width: `${(box.x2 - box.x1) * 100}%`,
                        height: `${(box.y2 - box.y1) * 100}%`,
                        cursor: 'move',
                        pointerEvents: 'auto',
                    };
                    return (
                        <div
                            key={path}
                            className={`absolute transition-all duration-200 ease-in-out ${isActive ? 'border-2 border-blue-500 bg-blue-500/20 z-10' : 'border border-red-500 bg-red-500/10'}`}
                            style={style}
                            onMouseDown={(e) => handleBboxMouseDown(e, path, 'drag')}
                        >
                          {isActive && (
                            <>
                              <ResizeHandle onMouseDown={(e) => handleBboxMouseDown(e, path, 'resize-tl')} cursor="nwse-resize" position={{ top: '0', left: '0' }} />
                              <ResizeHandle onMouseDown={(e) => handleBboxMouseDown(e, path, 'resize-tr')} cursor="nesw-resize" position={{ top: '0', right: '0' }} />
                              <ResizeHandle onMouseDown={(e) => handleBboxMouseDown(e, path, 'resize-bl')} cursor="nesw-resize" position={{ bottom: '0', left: '0' }} />
                              <ResizeHandle onMouseDown={(e) => handleBboxMouseDown(e, path, 'resize-br')} cursor="nwse-resize" position={{ bottom: '0', right: '0' }} />
                            </>
                          )}
                        </div>
                    );
            })}
            {data?.tables && showGridlines && data.tables.map((table, tableIndex) => {
                if(table.boundingBox.page !== currentPage) return null;
                return (
                    <div key={`table-${tableIndex}`} className="absolute top-0 left-0 w-full h-full pointer-events-none">
                        {/* Rows */}
                        {table.rows.map((rowY, rowIndex) => (
                             <div key={`row-${rowIndex}`} className="absolute w-full group" style={{ top: `${rowY * 100}%`, left: 0, height: '2px', transform: 'translateY(-1px)', pointerEvents: 'auto' }}>
                                <div className="h-full w-full bg-cyan-500/50 group-hover:bg-cyan-400 cursor-row-resize" onMouseDown={(e) => handleGridMouseDown(e, 'drag-row', tableIndex, rowIndex)}></div>
                                <button onClick={() => handleDeleteLine(tableIndex, 'row', rowIndex)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 z-20">
                                    <TrashIcon className="w-3 h-3"/>
                                </button>
                             </div>
                        ))}
                        {/* Columns */}
                         {table.columns.map((colX, colIndex) => (
                             <div key={`col-${colIndex}`} className="absolute h-full group" style={{ left: `${colX * 100}%`, top: 0, width: '2px', transform: 'translateX(-1px)', pointerEvents: 'auto' }}>
                                 <div className="h-full w-full bg-cyan-500/50 group-hover:bg-cyan-400 cursor-col-resize" onMouseDown={(e) => handleGridMouseDown(e, 'drag-col', tableIndex, colIndex)}></div>
                                 <button onClick={() => handleDeleteLine(tableIndex, 'col', colIndex)} className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 z-20">
                                    <TrashIcon className="w-3 h-3"/>
                                 </button>
                             </div>
                        ))}
                    </div>
                );
            })}
        </div>
      </div>
       {pdfDoc && (
        <>
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button onClick={handleZoomIn} title="Zoom In" className="p-2 bg-slate-800/70 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-slate-700"><MagnifyingGlassPlusIcon className="w-5 h-5"/></button>
                <button onClick={handleZoomOut} title="Zoom Out" className="p-2 bg-slate-800/70 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-slate-700"><MagnifyingGlassMinusIcon className="w-5 h-5"/></button>
                <button onClick={handleResetZoom} title="Reset View" className="p-2 bg-slate-800/70 backdrop-blur-sm text-white rounded-full shadow-lg hover:bg-slate-700"><ArrowUturnLeftIcon className="w-5 h-5"/></button>
                <button onClick={onToggleGridlines} title="Toggle Gridlines" className={`p-2 bg-slate-800/70 backdrop-blur-sm rounded-full shadow-lg hover:bg-slate-700 ${showGridlines ? 'text-cyan-400' : 'text-white'}`}>
                    <TableCellsIcon className="w-5 h-5"/>
                </button>
            </div>
            {numPages > 1 && (
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 bg-opacity-70 backdrop-blur-sm text-white rounded-full px-4 py-1.5 flex items-center gap-4 text-sm shadow-lg z-20">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                 disabled={currentPage <= 1}
                 className="disabled:opacity-50"
                >
                 ‹ Prev
               </button>
               <span>{currentPage} / {numPages}</span>
               <button 
                 onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} 
                 disabled={currentPage >= numPages}
                 className="disabled:opacity-50"
                >
                 Next ›
               </button>
             </div>
           )}
        </>
       )}
    </div>
  );
});

export default PdfViewer;