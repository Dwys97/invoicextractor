import React, { useState, useCallback, useRef, useEffect } from 'react';
import { BoundingBox, InvoiceData, VendorTemplate, Table } from './types';
import { extractInvoiceData, preScanForVendor } from './services/apiClient';
import { exportToCdsXml } from './services/xmlService';
import * as templateService from './services/templateService';
import FileUpload from './components/FileUpload';
import ExtractedDataDisplay from './components/ExtractedDataDisplay';
import PdfViewer from './components/PdfViewer';
import { DocumentTextIcon, ArrowPathIcon, XCircleIcon, CheckCircleIcon, DocumentArrowDownIcon, CheckIcon, QuestionMarkCircleIcon, NoSymbolIcon, BookmarkSquareIcon, ArrowDownOnSquareIcon } from './components/Icons';
import WorkflowActionModal from './components/WorkflowActionModal';
import SaveTemplateModal from './components/SaveTemplateModal';
import { get, set } from 'lodash-es';

type WorkflowStatus = 'pending' | 'accepted' | 'queried' | 'rejected';
type Notification = { id: number; message: string; type: 'success' | 'info' };

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceData | null>(null);
  const [editedData, setEditedData] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPreScanning, setIsPreScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFieldPath, setActiveFieldPath] = useState<string | null>(null);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>('pending');
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowActionType, setWorkflowActionType] = useState<'query' | 'reject' | null>(null);
  const [vendorTemplates, setVendorTemplates] = useState<VendorTemplate[]>([]);
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
  const [showGridlines, setShowGridlines] = useState(true);

  const pdfViewerRef = useRef<{ zoomToBox: (box: BoundingBox) => void }>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setVendorTemplates(templateService.getTemplates());
  }, []);

  const addNotification = (message: string, type: 'success' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const handleFileSelect = async (file: File) => {
    resetState();
    setImageFile(file);
    setIsPreScanning(true);
    addNotification('Scanning for matching template...', 'info');

    try {
      const detectedVendor = await preScanForVendor(file);
      const currentTemplates = templateService.getTemplates(); // Fetch latest templates
      if (detectedVendor) {
        const matchedTemplate = currentTemplates.find(t => t.vendorName.toLowerCase() === detectedVendor.toLowerCase());
        if (matchedTemplate) {
          setLoadedTemplateId(matchedTemplate.id);
          addNotification(`Template "${matchedTemplate.vendorName}" auto-loaded.`, 'success');
        } else {
          addNotification(`No matching template found for "${detectedVendor}".`, 'info');
        }
      }
    } catch (err) {
      console.error("Vendor pre-scan failed:", err);
      addNotification("Could not scan for vendor.", 'info');
    } finally {
      setIsPreScanning(false);
    }
  };
  
  const resetState = () => {
    setImageFile(null);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    setIsLoading(false);
    setActiveFieldPath(null);
    setWorkflowStatus('pending');
    setLoadedTemplateId(null);
  };

  const handleExtract = useCallback(async () => {
    if (!imageFile) return;

    setIsLoading(true);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    setWorkflowStatus('pending');
    
    const loadedTemplate = loadedTemplateId ? vendorTemplates.find(t => t.id === loadedTemplateId) || null : null;

    try {
      const { data, templateApplied } = await extractInvoiceData(imageFile, vendorTemplates, loadedTemplate);
      if (templateApplied && !loadedTemplate) { // Show notification only if it was auto-detected, not pre-loaded
        addNotification(`Template for "${templateApplied}" applied.`, 'success');
      }
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
  }, [imageFile, vendorTemplates, loadedTemplateId]);

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
  
  const handleBoxClick = (path: string) => {
    setActiveFieldPath(path);
  };

  const handleFieldFocus = (path: string | null) => {
    setActiveFieldPath(path);
    if (path && editedData && pdfViewerRef.current) {
        // Use lodash's get to safely access the nested bounding box property.
        // This is robust and works for any valid path string provided by the child components.
        const box = get(editedData, path) as BoundingBox | undefined;

        // Ensure we found a valid box object before telling the viewer to zoom.
        // The viewer's zoomToBox function will handle the page switching and animation.
        if (box && typeof box.page === 'number') {
            pdfViewerRef.current.zoomToBox(box);
        }
    }
  };

  const handleBoxUpdate = (path: string, newBox: BoundingBox) => {
    setEditedData(prevData => {
      if (!prevData) return null;
      const newData = JSON.parse(JSON.stringify(prevData));
      set(newData, path, newBox);
      return newData;
    });
  };
  
  const handleTableUpdate = (tableIndex: number, newTableData: Table) => {
    setEditedData(prevData => {
      if (!prevData || !prevData.tables) return prevData;
      const newData = JSON.parse(JSON.stringify(prevData));
      const newTables = [...newData.tables];
      newTables[tableIndex] = newTableData;
      newData.tables = newTables;
      return newData;
    });
  };

  const handleAccept = () => setWorkflowStatus('accepted');
  const handleQuery = () => {
    setWorkflowActionType('query');
    setIsWorkflowModalOpen(true);
  };
  const handleReject = () => {
    setWorkflowActionType('reject');
    setIsWorkflowModalOpen(true);
  };

  const handleModalSubmit = (reason: string, recipient: string) => {
    if (workflowActionType === 'query') {
      setWorkflowStatus('queried');
    } else if (workflowActionType === 'reject') {
      setWorkflowStatus('rejected');
    }
    console.log(`Workflow Action: ${workflowActionType?.toUpperCase()}`);
    console.log(`Reason: ${reason}`);
    console.log(`Recipient: ${recipient}`);
    setIsWorkflowModalOpen(false);
    setWorkflowActionType(null);
  };

  const handleSaveTemplate = (vendorName: string) => {
    if (!editedData) return;
    templateService.saveTemplate(vendorName, editedData);
    setVendorTemplates(templateService.getTemplates());
    setIsSaveTemplateModalOpen(false);
    addNotification(`Template for "${vendorName}" saved successfully.`, 'success');
  };

  const handleUpdateTemplate = () => {
    if (!editedData || !loadedTemplateId) return;
    const templateName = vendorTemplates.find(t => t.id === loadedTemplateId)?.vendorName || 'the template';
    
    if (!window.confirm(`Are you sure you want to update the template for "${templateName}" with your latest changes?`)) {
        return;
    }

    templateService.updateTemplate(loadedTemplateId, editedData);
    setVendorTemplates(templateService.getTemplates());
    addNotification(`Template for "${templateName}" updated successfully.`, 'success');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if(loadedTemplateId === templateId) {
        setLoadedTemplateId(null);
    }
    templateService.deleteTemplate(templateId);
    setVendorTemplates(templateService.getTemplates());
  };
  
  const handleLoadTemplate = (templateId: string) => {
    setLoadedTemplateId(templateId);
    const templateName = vendorTemplates.find(t => t.id === templateId)?.vendorName;
    addNotification(`Template "${templateName}" loaded.`, 'info');
  };

  const handleClearTemplate = () => {
    setLoadedTemplateId(null);
    addNotification('Loaded template cleared.', 'info');
  };


  const StatusBadge: React.FC<{ status: WorkflowStatus }> = ({ status }) => {
    const statusStyles = {
        pending: { text: 'Pending Review', bg: 'bg-slate-100 dark:bg-slate-700', text_color: 'text-slate-500 dark:text-slate-300' },
        accepted: { text: 'Accepted', bg: 'bg-green-100 dark:bg-green-900/30', text_color: 'text-green-600 dark:text-green-300' },
        queried: { text: 'Queried', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text_color: 'text-yellow-600 dark:text-yellow-300' },
        rejected: { text: 'Rejected', bg: 'bg-red-100 dark:bg-red-900/30', text_color: 'text-red-600 dark:text-red-300' },
    };
    const style = statusStyles[status];
    return <span className={`ml-3 px-2.5 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text_color}`}>{style.text}</span>;
  };

  const loadedTemplateName = loadedTemplateId ? vendorTemplates.find(t => t.id === loadedTemplateId)?.vendorName : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={`flex items-center gap-3 px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-fade-in-fast ${n.type === 'success' ? 'bg-teal-500 text-white' : 'bg-blue-500 text-white'}`}>
            <CheckCircleIcon className="w-5 h-5"/> {n.message}
          </div>
        ))}
      </div>
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
              {isPreScanning && <ArrowPathIcon title="Scanning for vendor..." className="w-5 h-5 ml-2 animate-spin text-slate-400" />}
            </h2>
            <FileUpload onFileSelect={handleFileSelect} file={imageFile} />
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleExtract}
                disabled={!imageFile || isLoading || isPreScanning}
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
               { (imageFile || extractedData || error || loadedTemplateId) && (
                <button
                    onClick={resetState}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900 transition-colors"
                >
                    Clear
                </button>
               )}
            </div>
            
            <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-4">
              <h2 className="text-xl font-bold mb-3 flex items-center text-slate-700 dark:text-slate-200">
                <BookmarkSquareIcon className="w-6 h-6 mr-2 text-purple-500"/>
                Vendor Templates
              </h2>
              {loadedTemplateName && (
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-md mb-3 text-sm text-blue-800 dark:text-blue-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <span className="font-bold block">Template Loaded:</span>
                            <span className="font-medium">{loadedTemplateName}</span>
                        </div>
                        <button onClick={handleClearTemplate} title="Clear Loaded Template" className="p-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300">
                            <XCircleIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
              )}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {vendorTemplates.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No templates saved yet.</p>
                ) : (
                  vendorTemplates.map(template => (
                    <div key={template.id} className={`flex items-center justify-between p-2 rounded-md text-sm ${loadedTemplateId === template.id ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'bg-slate-100 dark:bg-slate-700/50'}`}>
                      <span className="font-medium text-slate-600 dark:text-slate-300 truncate pr-2">{template.vendorName}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleLoadTemplate(template.id)} disabled={loadedTemplateId === template.id} title="Load Template" className="p-1 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed">
                            <ArrowDownOnSquareIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => handleDeleteTemplate(template.id)} title="Delete Template" className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                            <XCircleIcon className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {editedData && (
                <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-2">
                        {workflowStatus === 'accepted' && (
                          <>
                            {loadedTemplateId ? (
                                <button
                                    onClick={handleUpdateTemplate}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
                                >
                                    <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Update Template
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsSaveTemplateModalOpen(true)}
                                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                                >
                                    <BookmarkSquareIcon className="-ml-1 mr-2 h-5 w-5" />
                                    Save as Template
                                </button>
                            )}
                          </>
                        )}
                        <button
                            onClick={handleExportXml}
                            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700"
                        >
                            <DocumentArrowDownIcon className="-ml-1 mr-2 h-5 w-5" />
                            Export as XML
                        </button>
                    </div>
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
                onBoxUpdate={handleBoxUpdate}
                onBoxClick={handleBoxClick}
                onTableUpdate={handleTableUpdate}
                showGridlines={showGridlines}
                onToggleGridlines={() => setShowGridlines(s => !s)}
            />
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col min-h-0">
              <div className="flex items-center mb-4">
                  <h2 className="text-xl font-bold flex items-center text-slate-700 dark:text-slate-200">
                    {isLoading ? <ArrowPathIcon className="animate-spin w-6 h-6 mr-2 text-blue-500"/> : <CheckCircleIcon className="w-6 h-6 mr-2 text-blue-500"/>}
                    2. Review & Edit
                  </h2>
                  {editedData && <StatusBadge status={workflowStatus} />}
              </div>
              {editedData && workflowStatus === 'pending' && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                      <button onClick={handleAccept} className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900">
                          <CheckIcon className="w-4 h-4 mr-1.5"/> Accept
                      </button>
                      <button onClick={handleQuery} className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900">
                          <QuestionMarkCircleIcon className="w-4 h-4 mr-1.5"/> Query
                      </button>
                      <button onClick={handleReject} className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">
                          <NoSymbolIcon className="w-4 h-4 mr-1.5"/> Reject
                      </button>
                  </div>
              )}
              <div ref={rightPanelRef} className="flex-grow overflow-y-auto pr-2">
                {isLoading && (
                    <div className="flex-grow flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="w-12 h-12 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
                        <p className="mt-3 font-semibold">Analyzing Document...</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Using nanonets/Nanonets-OCR2-3B Model</p>
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
                    setActiveFieldPath={handleFieldFocus}
                    activeFieldPath={activeFieldPath}
                    scrollContainerRef={rightPanelRef}
                  />
                )}
              </div>
          </div>
        </main>
        <footer className="text-center p-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-400 dark:text-slate-500">
                Notice: This is a demonstration application. For commercial or GDPR-compliant use, data processing must be performed via a secure backend to protect credentials and ensure data privacy.
            </p>
        </footer>
      </div>
      {workflowActionType && (
        <WorkflowActionModal 
            isOpen={isWorkflowModalOpen}
            actionType={workflowActionType}
            onClose={() => setIsWorkflowModalOpen(false)}
            onSubmit={handleModalSubmit}
        />
      )}
      {isSaveTemplateModalOpen && editedData && (
        <SaveTemplateModal
            isOpen={isSaveTemplateModalOpen}
            onClose={() => setIsSaveTemplateModalOpen(false)}
            onSave={handleSaveTemplate}
            defaultVendorName={editedData.shipper?.name}
        />
      )}
    </div>
  );
};

export default App;