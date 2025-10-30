import React, { useState, useEffect } from 'react';
import { LineItem } from '../types';
import { tariffData } from '../data/tariffData';
import { XCircleIcon } from './Icons';

interface FieldManagerProps {
    item: LineItem;
    onClose: () => void;
    onSave: (item: LineItem) => void;
}

const FieldManager: React.FC<FieldManagerProps> = ({ item, onClose, onSave }) => {
    const [hsCode, setHsCode] = useState(item.hsCode || '');
    const [overrides, setOverrides] = useState<string[]>(item.cdsOverrides || []);
    const [tariffInfo, setTariffInfo] = useState<{ description: string, suggestedOverrides: string[] } | null>(null);

    useEffect(() => {
        const code = hsCode.replace(/\./g, '');
        if (code in tariffData) {
            setTariffInfo(tariffData[code as keyof typeof tariffData]);
        } else {
            setTariffInfo(null);
        }
    }, [hsCode]);

    const handleToggleOverride = (code: string) => {
        setOverrides(prev => 
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleSave = () => {
        onSave({ ...item, hsCode, cdsOverrides: overrides });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in-fast">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Manage Line Item</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">HS Code</label>
                    <input
                        type="text"
                        value={hsCode}
                        onChange={(e) => setHsCode(e.target.value)}
                        placeholder="e.g., 9021.10.00"
                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                </div>

                {tariffInfo && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg space-y-3">
                        <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Commodity Information</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">{tariffInfo.description}</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Suggested CDS Overrides</h4>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tariffInfo.suggestedOverrides.map(code => (
                                    <button 
                                        key={code} 
                                        onClick={() => handleToggleOverride(code)}
                                        className={`px-3 py-1 text-sm rounded-full ${
                                            overrides.includes(code) 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-100'
                                        }`}
                                    >
                                        {code}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-200">Selected Overrides</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">These will be added to the XML export.</p>
                    <div className={`mt-2 p-3 rounded-lg border min-h-[4rem] ${overrides.length > 0 ? 'border-slate-300 dark:border-slate-600' : 'border-dashed border-slate-300 dark:border-slate-600'}`}>
                        {overrides.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {overrides.map(code => (
                                    <span key={code} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-100">
                                        {code}
                                        <button onClick={() => handleToggleOverride(code)} className="ml-1.5 flex-shrink-0 text-teal-500 hover:text-teal-700">
                                            <XCircleIcon className="w-3 h-3"/>
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                           <p className="text-sm text-slate-400 text-center py-2">No overrides selected.</p>
                        )}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default FieldManager;