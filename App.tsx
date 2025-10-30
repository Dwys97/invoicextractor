import React, { useState, useCallback, useRef } from 'react';
import { InvoiceData, BoundingBox } from './types';
import { extractInvoiceData, reExtractTextFromImage } from './services/geminiService';
import { exportToCdsXml } from './services/xmlService';
import FileUpload from './components/FileUpload';
import ExtractedDataDisplay from './components/ExtractedDataDisplay';
import PdfViewer from './components/PdfViewer';
import { DocumentTextIcon, ArrowPathIcon, XCircleIcon, CheckCircleIcon, DocumentArrowDownIcon } from './components/Icons';
import { set } from 'lodash-es';

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [editedData, setEditedData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReExtracting, setIsReExtracting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFieldPath, setActiveFieldPath] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<BoundingBox | null>(null);
  const pdfViewerRef = useRef<{ cropAndGetDataUrl: (box: BoundingBox) => string | null }>(null);

  const handleFileSelect = (file: File) => {
    resetState();
    setImageFile(file);
  };
  
  const resetState = () => {
    setImageFile(null);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    setIsLoading(false);
    setActiveFieldPath(null);
    setSelectionBox(null);
  };

  const handleExtract = useCallback(async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    setSelectionBox(null);

    try {
      const data = await extractInvoiceData(imageFile);
      if(data) {
        setExtractedData(data);
        setEditedData(JSON.parse(JSON.stringify(data)));
      } else {
        throw new Error("Extraction returned no data. The document might be unclear or not an invoice.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Extraction Failed: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageFile]);

  const handleReExtract = async (fieldPath: string) => {
    if (!selectionBox || !pdfViewerRef.current) return;
    
    setIsReExtracting(true);
    const croppedImageBase64 = pdfViewerRef.current.cropAndGetDataUrl(selectionBox);
    
    if (croppedImageBase64) {
        try {
            const extractedText = await reExtractTextFromImage(croppedImageBase64);
            
            // Use lodash.set to update the nested property
            const newData = JSON.parse(JSON.stringify(editedData));
            set(newData, fieldPath, extractedText);
            
            // Also update the bounding box for the field
            const bboxPath = fieldPath.replace(/([^.]+)$/, 'fields.$1.boundingBox');
            set(newData, bboxPath, selectionBox);

            setEditedData(newData);
            setSelectionBox(null); // Clear selection box after extraction
        } catch (err) {
            console.error("Re-extraction failed", err);
            // Optionally set a temporary error message for the user
        }
    }
    setIsReExtracting(false);
  };
  
  const handleExportXml = () => {
    if (!editedData) return;
    const xmlString = exportToCdsXml(editedData);
    const blob = new Blob([xmlString], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CDS_invoice_${editedData.invoiceNumber || 'data'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <div className="flex flex-col h-screen">
        <header className="text-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-400">
            Customs Invoice Extractor
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI-powered data extraction with visual annotation and CDS XML export.
          </p>
        </header>

        <main className="flex-grow grid grid-cols-1 lg:grid-cols-10 gap-4 p-4 overflow-hidden">
          {/* Left Panel */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center text-slate-700 dark:text-slate-200">
              <DocumentTextIcon className="w-6 h-6 mr-2 text-blue-500"/>
              1. Upload
            </h2>
            <FileUpload onFileSelect={handleFileSelect} file={imageFile} />
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleExtract}
                disabled={!imageFile || isLoading}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors"
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Extracting...
                  </>
                ) : (
                  'Extract Data'
                )}
              </button>
               { (imageFile || extractedData || error) && (
                <button
                    onClick={resetState}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors"
                >
                    Clear
                </button>
               )}
            </div>
            {editedData && (
                <div className="mt-auto pt-4">
                     <h2 className="text-xl font-bold mb-4 flex items-center text-slate-700 dark:text-slate-200">
                        <CheckCircleIcon className="w-6 h-6 mr-2 text-teal-500"/>
                        3. Export
                    </h2>
                    <button
                        onClick={handleExportXml}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-slate-900 transition-colors"
                    >
                        <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                        Export as XML
                    </button>
                </div>
            )}
          </div>
          
          {/* Center Panel */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-800/50 p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
             <PdfViewer 
                ref={pdfViewerRef}
                file={imageFile} 
                data={editedData} 
                activeFieldPath={activeFieldPath}
                selectionBox={selectionBox}
                onSelectionBoxChange={setSelectionBox}
            />
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col">
              <h2 className="text-xl font-bold mb-4 flex items-center text-slate-700 dark:text-slate-200">
                {isLoading ? <ArrowPathIcon className="animate-spin w-6 h-6 mr-2 text-blue-500"/> : <CheckCircleIcon className="w-6 h-6 mr-2 text-blue-500"/>}
                2. Review & Edit
              </h2>
              <div className="flex-grow overflow-y-auto pr-2">
                {isLoading && (
                    <div className="flex-grow flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                        <p className="mt-3 font-semibold">Analyzing Document...</p>
                    </div>
                )}
                {error && (
                  <div className="flex-grow flex flex-col items-center justify-center text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                      <XCircleIcon className="w-10 h-10 mb-2"/>
                      <p className="text-center font-semibold">{error}</p>
                  </div>
                )}
                {!isLoading && !error && !editedData && (
                   <div className="flex-grow flex items-center justify-center">
                      <p className="text-slate-400 dark:text-slate-500 text-center p-4">
                          Upload an invoice and click "Extract Data" to see the results.
                      </p>
                   </div>
                )}
                {editedData && (
                  <ExtractedDataDisplay 
                    data={editedData} 
                    setData={setEditedData} 
                    setActiveFieldPath={setActiveFieldPath}
                    onReExtract={handleReExtract}
                    selectionBox={selectionBox}
                    isReExtracting={isReExtracting}
                  />
                )}
              </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;