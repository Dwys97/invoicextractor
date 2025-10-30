import React, { useState, useEffect } from 'react';
import { InvoiceData, LineItem, Party } from '../types';
import { XCircleIcon, Cog6ToothIcon } from './Icons';
import FieldManager from './FieldManager';
import { get } from 'lodash-es';

interface ExtractedDataDisplayProps {
  data: InvoiceData;
  setData: (data: InvoiceData) => void;
  setActiveFieldPath: (path: string | null) => void;
  activeFieldPath?: string | null;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
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

const InputField: React.FC<{ 
  label: string; 
  value: string | number; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  onFocus: () => void;
  onBlur: () => void;
  confidenceScore?: number;
  type?: string; 
  placeholder?: string;
  dataPath: string;
}> = ({ label, value, onChange, onFocus, onBlur, confidenceScore, type = 'text', placeholder, dataPath }) => (
  <div>
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
      data-path={dataPath}
      className="mt-1 block w-full pl-3 pr-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
    />
  </div>
);

const PartyEditor: React.FC<{ 
  title: string; 
  party: Party; 
  basePath: string;
  onChange: (updatedParty: Party) => void; 
  setActiveFieldPath: (path: string | null) => void;
}> = ({ title, party, basePath, onChange, setActiveFieldPath }) => (
  <div className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg space-y-4">
    <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h4>
    <InputField 
      label="Name" 
      value={party.name || ''} 
      onChange={(e) => onChange({ ...party, name: e.target.value })}
      onFocus={() => setActiveFieldPath(`${basePath}.fields.name.boundingBox`)}
      onBlur={() => setActiveFieldPath(null)}
      confidenceScore={get(party, 'fields.name.confidence')}
      dataPath={`${basePath}.fields.name.boundingBox`}
    />
    <div>
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
        data-path={`${basePath}.fields.address.boundingBox`}
        className="mt-1 block w-full pl-3 pr-2 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
      />
    </div>
  </div>
);


const ExtractedDataDisplay: React.FC<ExtractedDataDisplayProps> = ({ data, setData, setActiveFieldPath, activeFieldPath, scrollContainerRef }) => {
  const [managingItem, setManagingItem] = useState<LineItem | null>(null);
  const [managingItemIndex, setManagingItemIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeFieldPath && scrollContainerRef?.current) {
        const element = scrollContainerRef.current.querySelector(`[data-path="${activeFieldPath}"]`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('shadow-outline-blue', 'ring-2', 'ring-blue-500');
            setTimeout(() => {
                element.classList.remove('shadow-outline-blue', 'ring-2', 'ring-blue-500');
            }, 1500);
        }
    }
  }, [activeFieldPath, scrollContainerRef]);

  const handlePartyChange = (partyType: 'shipper' | 'consignee', updatedParty: Party) => {
    setData({ ...data, [partyType]: updatedParty });
  };

  const handleFieldChange = (field: keyof InvoiceData, value: string | number) => {
    setData({ ...data, [field]: value });
  };
  
  const handleLineItemChange = (index: number, updatedItem: LineItem) => {
    const newLineItems = [...data.lineItems];
    newLineItems[index] = updatedItem;
    setData({ ...data, lineItems: newLineItems });
  };

  const addLineItem = () => {
    const newLineItem: LineItem = {
      description: '',
      quantity: 0,
      unitPrice: 0,
      totalPrice: 0,
      countryOfOrigin: '',
      hsCode: '',
    };
    setData({ ...data, lineItems: [...data.lineItems, newLineItem]});
  };

  const removeLineItem = (index: number) => {
    const newLineItems = data.lineItems.filter((_, i) => i !== index);
    setData({ ...data, lineItems: newLineItems });
  };

  const handleSaveManagedItem = (item: LineItem) => {
    if (managingItemIndex !== null) {
      handleLineItemChange(managingItemIndex, item);
    }
    setManagingItem(null);
    setManagingItemIndex(null);
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField 
            label="Invoice Number" 
            value={data.invoiceNumber || ''} 
            onChange={(e) => handleFieldChange('invoiceNumber', e.target.value)}
            onFocus={() => setActiveFieldPath('fields.invoiceNumber.boundingBox')}
            onBlur={() => setActiveFieldPath(null)}
            confidenceScore={get(data, 'fields.invoiceNumber.confidence')}
            dataPath="fields.invoiceNumber.boundingBox"
          />
          <InputField 
            label="Invoice Date" 
            value={data.invoiceDate || ''} 
            onChange={(e) => handleFieldChange('invoiceDate', e.target.value)}
            onFocus={() => setActiveFieldPath('fields.invoiceDate.boundingBox')}
            onBlur={() => setActiveFieldPath(null)}
            confidenceScore={get(data, 'fields.invoiceDate.confidence')}
            placeholder="YYYY-MM-DD"
            dataPath="fields.invoiceDate.boundingBox"
          />
      </div>

      <PartyEditor 
        title="Shipper / Exporter"
        party={data.shipper}
        basePath="shipper"
        onChange={(p) => handlePartyChange('shipper', p)}
        setActiveFieldPath={setActiveFieldPath}
      />
       <PartyEditor 
        title="Consignee / Importer"
        party={data.consignee}
        basePath="consignee"
        onChange={(p) => handlePartyChange('consignee', p)}
        setActiveFieldPath={setActiveFieldPath}
      />
      
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Line Items</h3>
        {data.lineItems.map((item, index) => (
          <div key={index} className="bg-slate-100 dark:bg-slate-700/50 p-4 rounded-lg space-y-4 relative group">
              <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                       <InputField 
                        label="Description"
                        value={item.description || ''}
                        onChange={(e) => handleLineItemChange(index, {...item, description: e.target.value})}
                        onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.description.boundingBox`)}
                        onBlur={() => setActiveFieldPath(null)}
                        confidenceScore={get(item, 'fields.description.confidence')}
                        dataPath={`lineItems[${index}].fields.description.boundingBox`}
                        />
                  </div>
                   <InputField 
                    label="Quantity"
                    type="number"
                    value={item.quantity || ''}
                    onChange={(e) => handleLineItemChange(index, {...item, quantity: parseFloat(e.target.value) || 0})}
                    onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.quantity.boundingBox`)}
                    onBlur={() => setActiveFieldPath(null)}
                    confidenceScore={get(item, 'fields.quantity.confidence')}
                    dataPath={`lineItems[${index}].fields.quantity.boundingBox`}
                   />
                   <InputField 
                    label="Unit Price"
                    type="number"
                    value={item.unitPrice || ''}
                    onChange={(e) => handleLineItemChange(index, {...item, unitPrice: parseFloat(e.target.value) || 0})}
                    onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.unitPrice.boundingBox`)}
                    onBlur={() => setActiveFieldPath(null)}
                    confidenceScore={get(item, 'fields.unitPrice.confidence')}
                    dataPath={`lineItems[${index}].fields.unitPrice.boundingBox`}
                   />
                   <InputField 
                    label="Total Price"
                    type="number"
                    value={item.totalPrice || ''}
                    onChange={(e) => handleLineItemChange(index, {...item, totalPrice: parseFloat(e.target.value) || 0})}
                    onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.totalPrice.boundingBox`)}
                    onBlur={() => setActiveFieldPath(null)}
                    confidenceScore={get(item, 'fields.totalPrice.confidence')}
                    dataPath={`lineItems[${index}].fields.totalPrice.boundingBox`}
                   />
                    <InputField 
                        label="Country of Origin"
                        value={item.countryOfOrigin || ''}
                        onChange={(e) => handleLineItemChange(index, {...item, countryOfOrigin: e.target.value})}
                        onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.countryOfOrigin.boundingBox`)}
                        onBlur={() => setActiveFieldPath(null)}
                        confidenceScore={get(item, 'fields.countryOfOrigin.confidence')}
                        placeholder="e.g., CN"
                        dataPath={`lineItems[${index}].fields.countryOfOrigin.boundingBox`}
                    />
                    <InputField 
                        label="HS Code"
                        value={item.hsCode || ''}
                        onChange={(e) => handleLineItemChange(index, {...item, hsCode: e.target.value})}
                        onFocus={() => setActiveFieldPath(`lineItems[${index}].fields.hsCode.boundingBox`)}
                        onBlur={() => setActiveFieldPath(null)}
                        confidenceScore={get(item, 'fields.hsCode.confidence')}
                        placeholder="e.g., 8471.30.00"
                        dataPath={`lineItems[${index}].fields.hsCode.boundingBox`}
                    />
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setManagingItem(item); setManagingItemIndex(index); }}
                    title="Manage CDS Overrides"
                    className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-500 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                      <Cog6ToothIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeLineItem(index)} 
                    title="Remove Item"
                    className="p-1.5 bg-slate-200 dark:bg-slate-600 rounded-full text-slate-500 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-300"
                  >
                      <XCircleIcon className="w-4 h-4" />
                  </button>
              </div>
          </div>
        ))}
        <button
          onClick={addLineItem}
          className="w-full text-center py-2 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
        >
          + Add Line Item
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <InputField 
            label="Currency"
            value={data.currency || ''}
            onChange={(e) => handleFieldChange('currency', e.target.value)}
            onFocus={() => setActiveFieldPath('fields.currency.boundingBox')}
            onBlur={() => setActiveFieldPath(null)}
            confidenceScore={get(data, 'fields.currency.confidence')}
            placeholder="e.g., USD"
            dataPath="fields.currency.boundingBox"
          />
           <InputField 
            label="Total Declared Value"
            type="number"
            value={data.totalDeclaredValue || ''}
            onChange={(e) => handleFieldChange('totalDeclaredValue', parseFloat(e.target.value) || 0)}
            onFocus={() => setActiveFieldPath('fields.totalDeclaredValue.boundingBox')}
            onBlur={() => setActiveFieldPath(null)}
            confidenceScore={get(data, 'fields.totalDeclaredValue.confidence')}
            dataPath="fields.totalDeclaredValue.boundingBox"
          />
      </div>

      {managingItem && (
        <FieldManager 
          item={managingItem}
          onClose={() => setManagingItem(null)}
          onSave={handleSaveManagedItem}
        />
      )}
    </div>
  );
};

export default ExtractedDataDisplay;