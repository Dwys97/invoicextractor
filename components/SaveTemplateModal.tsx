import React, { useState } from 'react';
import { XCircleIcon } from './Icons';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendorName: string) => void;
  defaultVendorName?: string;
}

const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ isOpen, onClose, onSave, defaultVendorName }) => {
  const [vendorName, setVendorName] = useState(defaultVendorName || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (vendorName.trim()) {
      onSave(vendorName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in-fast backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Save Vendor Template</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Save the corrected layout and bounding boxes for this vendor to improve future extraction accuracy.
          </p>
          
          <div>
            <label htmlFor="vendorName" className="block text-sm font-medium text-slate-500 dark:text-slate-400">
              Vendor Name <span className="text-red-500">*</span>
            </label>
            <input
              id="vendorName"
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
              placeholder="Enter vendor name"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700">
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveTemplateModal;
