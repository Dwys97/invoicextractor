import React, { useState } from 'react';
import { InvoiceData, LineItem, Party, BoundingBox } from '../types';
import { XCircleIcon, DocumentMagnifyingGlassIcon, ArrowPathIcon, Cog6ToothIcon } from './Icons';
import FieldManager from './FieldManager';
import { get } from 'lodash-es';

interface ExtractedDataDisplayProps {
  data: InvoiceData;
  setData: (data: InvoiceData) => void;
  setActiveFieldPath: (path: string | null) => void;
  onReExtract: (fieldPath: string) => void;
  selectionBox: BoundingBox | null;
  isReExtracting: boolean;
}

const ConfidenceIndicator: React.FC<{ score: number | undefined }> = ({ score }) => {
  if (score === undefined || score === null) return null;

  const getConfidenceColor = (s: number) => {
    if (s >= 0.9) return 'bg-green-500';
    if (s >= 0.7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="group relative flex items-center" title={`Confidence: ${Math.round(score * 100)}%`}>
      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(score)}`}></div>
      <div className="absolute left-4 w-max bottom-full mb-1 px-2 py-1 text-xs text-white bg-slate-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        Confidence: {Math.round(score * 100)}%
      </div>
    </div>
  );
};

const ReExtractButton: React.FC<{fieldPath: string, onReExtract: (path: string) => void, selectionBox: BoundingBox | null, isReExtracting: boolean}> = 
  ({ fieldPath, onReExtract, selectionBox, isReExtracting }) => (
  <button 
    title="Re-extract value from selection on document"
    disabled={!selectionBox || isReExtracting}
    onClick={() => onReExtract(fieldPath)}
    className="absolute -right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 disabled:text-slate-300 disabled:dark:text-slate-600 disabled:cursor-not-allowed"
  >
    {isReExtracting ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <DocumentMagnifyingGlassIcon className="w-4 h-4"/>}
  </button>
);


const InputField: React.FC<{ 
  label: string; 
  value: string | number; 
  fieldPath: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  onFocus: () => void;
  onBlur: () => void;
  onReExtract: (fieldPath: string) => void;
  selectionBox: BoundingBox | null;
  isReExtracting: boolean;
  confidenceScore?: number;
  type?: string; 
  placeholder?: string;
}> = ({ label, value, fieldPath, onChange, onFocus, onBlur, onReExtract, selectionBox, isReExtracting, confidenceScore, type = 'text', placeholder }) => (
  <div className="relative">
    <div className="flex items-center gap-1.5">
        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">{label}</label>
        <ConfidenceIndicator score={confidenceScore} />
    </div>
    <input
      type={type}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder || label}
      className="mt-1 block w-full pl-3 pr-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    />
    <ReExtractButton fieldPath={fieldPath} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
  </div>
);

const PartyEditor: React.FC<{ 
  title: string; 
  party: Party; 
  basePath: string;
  onChange: (updatedParty: Party) => void; 
  setActiveFieldPath: (path: string | null) => void;
  onReExtract: (fieldPath: string) => void;
  selectionBox: BoundingBox | null;
  isReExtracting: boolean;
}> = ({ title, party, basePath, onChange, setActiveFieldPath, onReExtract, selectionBox, isReExtracting }) => (
  <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg space-y-4">
    <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
    <InputField 
      label="Name" 
      value={party.name || ''} 
      fieldPath={`${basePath}.name`}
      onChange={(e) => onChange({ ...party, name: e.target.value })}
      onFocus={() => setActiveFieldPath(`${basePath}.fields.name.boundingBox`)}
      onBlur={() => setActiveFieldPath(null)}
      onReExtract={onReExtract}
      selectionBox={selectionBox}
      isReExtracting={isReExtracting}
      confidenceScore={get(party, 'fields.name.confidence')}
    />
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Address</label>
        <ConfidenceIndicator score={get(party, 'fields.address.confidence')} />
      </div>
      <textarea
        value={party.address || ''}
        onChange={(e) => onChange({ ...party, address: e.target.value })}
        onFocus={() => setActiveFieldPath(`${basePath}.fields.address.boundingBox`)}
        onBlur={() => setActiveFieldPath(null)}
        placeholder="Full Address"
        rows={3}
        className="mt-1 block w-full pl-3 pr-6 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      <ReExtractButton fieldPath={`${basePath}.address`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
    </div>
  </div>
);


const ExtractedDataDisplay: React.FC<ExtractedDataDisplayProps> = ({ data, setData, setActiveFieldPath, onReExtract, selectionBox, isReExtracting }) => {
  const [editingItem, setEditingItem] = useState<{ item: LineItem, index: number } | null>(null);

  const handleFieldChange = (field: keyof InvoiceData, value: any) => {
    setData({ ...data, [field]: value });
  };

  const handlePartyChange = (partyType: 'shipper' | 'consignee', updatedParty: Party) => {
    setData({ ...data, [partyType]: updatedParty });
  };
  
  const handleItemChange = (index: number, updatedItem: LineItem) => {
    const newItems = [...data.lineItems];
    newItems[index] = updatedItem;
    setData({ ...data, lineItems: newItems });
  };
  
  const handleItemFieldChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...data.lineItems];
    const itemToUpdate = { ...newItems[index] };

    if (field === 'quantity' || field === 'unitPrice' || field === 'totalPrice') {
        const numValue = parseFloat(value);
        (itemToUpdate as any)[field] = isNaN(numValue) ? 0 : numValue;
    } else {
        (itemToUpdate as any)[field] = value;
    }

    newItems[index] = itemToUpdate;
    setData({ ...data, lineItems: newItems });
  };

  const addItem = () => {
    const newItem: LineItem = { description: '', quantity: 1, unitPrice: 0, totalPrice: 0, countryOfOrigin: '', hsCode: '' };
    setData({ ...data, lineItems: [...(data.lineItems || []), newItem] });
  };

  const removeItem = (index: number) => {
    const newItems = data.lineItems.filter((_, i) => i !== index);
    setData({ ...data, lineItems: newItems });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
        <InputField label="Invoice Number" value={data.invoiceNumber || ''} fieldPath="invoiceNumber" onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)} onFocus={() => setActiveFieldPath('fields.invoiceNumber.boundingBox')} onBlur={() => setActiveFieldPath(null)} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} confidenceScore={get(data, 'fields.invoiceNumber.confidence')}/>
        <InputField label="Invoice Date" value={data.invoiceDate || ''} fieldPath="invoiceDate" onChange={(e) => handleFieldChange('invoiceDate', e.target.value)} type="date" onFocus={() => setActiveFieldPath('fields.invoiceDate.boundingBox')} onBlur={() => setActiveFieldPath(null)} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} confidenceScore={get(data, 'fields.invoiceDate.confidence')}/>
        <InputField label="Currency" value={data.currency || ''} fieldPath="currency" onChange={(e) => handleFieldChange('currency', e.target.value.toUpperCase())} placeholder="USD" onFocus={() => setActiveFieldPath('fields.currency.boundingBox')} onBlur={() => setActiveFieldPath(null)} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} confidenceScore={get(data, 'fields.currency.confidence')}/>
        <InputField label="Total Declared Value" value={data.totalDeclaredValue || 0} fieldPath="totalDeclaredValue" onChange={(e) => handleFieldChange('totalDeclaredValue', parseFloat(e.target.value) || 0)} type="number" onFocus={() => setActiveFieldPath('fields.totalDeclaredValue.boundingBox')} onBlur={() => setActiveFieldPath(null)} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} confidenceScore={get(data, 'fields.totalDeclaredValue.confidence')}/>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <PartyEditor title="Shipper" party={data.shipper} basePath="shipper" onChange={(p) => handlePartyChange('shipper', p)} setActiveFieldPath={setActiveFieldPath} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting}/>
        <PartyEditor title="Consignee" party={data.consignee} basePath="consignee" onChange={(p) => handlePartyChange('consignee', p)} setActiveFieldPath={setActiveFieldPath} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting}/>
      </div>
      
      <div>
        <h4 className="text-lg font-semibold mb-2 text-slate-700 dark:text-slate-200">Line Items</h4>
        <div className="space-y-2">
            {(data.lineItems || []).map((item, index) => (
                <div key={index} onFocus={() => setActiveFieldPath(`lineItems[${index}].boundingBox`)} onBlur={() => setActiveFieldPath(null)} className="bg-white dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="relative">
                        <div className="flex items-center gap-1.5">
                            <label className="text-xs text-slate-500">Description</label>
                            <ConfidenceIndicator score={get(item, 'fields.description.confidence')} />
                        </div>
                        <input type="text" value={item.description} onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.description.boundingBox`)} onBlur={() => setActiveFieldPath(null)} onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)} className="w-full bg-transparent p-1 rounded border border-slate-300 dark:border-slate-600 mt-0.5"/>
                        <ReExtractButton fieldPath={`lineItems[${index}].description`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                            <div className="flex items-center gap-1.5"><label className="text-xs text-slate-500">Qty</label><ConfidenceIndicator score={get(item, 'fields.quantity.confidence')} /></div>
                            <input type="number" value={item.quantity} onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.quantity.boundingBox`)} onBlur={() => setActiveFieldPath(null)} onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)} className="w-full text-right bg-transparent p-1 rounded border border-slate-300 dark:border-slate-600 mt-0.5"/><ReExtractButton fieldPath={`lineItems[${index}].quantity`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
                        </div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5"><label className="text-xs text-slate-500">Unit Price</label><ConfidenceIndicator score={get(item, 'fields.unitPrice.confidence')} /></div>
                            <input type="number" value={item.unitPrice} onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.unitPrice.boundingBox`)} onBlur={() => setActiveFieldPath(null)} onChange={(e) => handleItemFieldChange(index, 'unitPrice', e.target.value)} className="w-full text-right bg-transparent p-1 rounded border border-slate-300 dark:border-slate-600 mt-0.5"/><ReExtractButton fieldPath={`lineItems[${index}].unitPrice`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
                        </div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5"><label className="text-xs text-slate-500">Total</label><ConfidenceIndicator score={get(item, 'fields.totalPrice.confidence')} /></div>
                            <input type="number" value={item.totalPrice} onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.totalPrice.boundingBox`)} onBlur={() => setActiveFieldPath(null)} onChange={(e) => handleItemFieldChange(index, 'totalPrice', e.target.value)} className="w-full text-right bg-transparent p-1 rounded border border-slate-300 dark:border-slate-600 mt-0.5"/><ReExtractButton fieldPath={`lineItems[${index}].totalPrice`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
                        </div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5"><label className="text-xs text-slate-500">Origin</label><ConfidenceIndicator score={get(item, 'fields.countryOfOrigin.confidence')} /></div>
                            <input type="text" value={item.countryOfOrigin} onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.countryOfOrigin.boundingBox`)} onBlur={() => setActiveFieldPath(null)} onChange={(e) => handleItemFieldChange(index, 'countryOfOrigin', e.target.value)} className="w-full bg-transparent p-1 rounded border border-slate-300 dark:border-slate-600 mt-0.5"/><ReExtractButton fieldPath={`lineItems[${index}].countryOfOrigin`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
                        </div>
                        <div className="relative">
                            <div className="flex items-center gap-1.5"><label className="text-xs text-slate-500">HS Code</label><ConfidenceIndicator score={get(item, 'fields.hsCode.confidence')} /></div>
                            <input type="text" value={item.hsCode} onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.hsCode.boundingBox`)} onBlur={() => setActiveFieldPath(null)} onChange={(e) => handleItemFieldChange(index, 'hsCode', e.target.value)} className="w-full bg-transparent p-1 rounded border border-slate-300 dark:border-slate-600 mt-0.5"/><ReExtractButton fieldPath={`lineItems[${index}].hsCode`} onReExtract={onReExtract} selectionBox={selectionBox} isReExtracting={isReExtracting} />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2 gap-2">
                        <button onClick={() => setEditingItem({ item, index })} className="text-xs inline-flex items-center text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">
                           <Cog6ToothIcon className="w-4 h-4 mr-1"/> Manage
                        </button>
                        <button onClick={() => removeItem(index)} className="text-xs inline-flex items-center text-red-500 hover:text-red-700">
                            <XCircleIcon className="w-4 h-4 mr-1" /> Remove
                        </button>
                    </div>
                </div>
            ))}
        </div>
        <button
          onClick={addItem}
          className="mt-4 px-4 py-2 border border-dashed border-slate-400 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 w-full"
        >
          + Add Line Item
        </button>
      </div>

      {editingItem && (
        <FieldManager
            item={editingItem.item}
            onClose={() => setEditingItem(null)}
            onSave={(updatedItem) => {
                handleItemChange(editingItem.index, updatedItem);
                setEditingItem(null);
            }}
        />
      )}
    </div>
  );
};

export default ExtractedDataDisplay;