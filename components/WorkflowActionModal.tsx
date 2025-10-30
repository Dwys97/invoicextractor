import React, { useState } from 'react';
import { XCircleIcon } from './Icons';

interface WorkflowActionModalProps {
  isOpen: boolean;
  actionType: 'query' | 'reject';
  onClose: () => void;
  onSubmit: (reason: string, recipient: string) => void;
}

const WorkflowActionModal: React.FC<WorkflowActionModalProps> = ({ isOpen, actionType, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [recipient, setRecipient] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(reason, recipient);
  };

  const title = actionType === 'query' ? 'Query Invoice' : 'Reject Invoice';
  const description = actionType === 'query' 
    ? 'Please provide details for the query (e.g., missing information, clarification needed).'
    : 'Please provide a reason for rejecting this invoice.';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in-fast backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-slate-500 dark:text-slate-400">
              Reason / Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-slate-500 dark:text-slate-400">
              Notify Recipient (Optional)
            </label>
            <input
              type="email"
              id="recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g., accounts@example.com"
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
              Submit {actionType === 'query' ? 'Query' : 'Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkflowActionModal;