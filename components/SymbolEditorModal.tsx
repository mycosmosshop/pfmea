

import React, { useState, useEffect } from 'react';
import type { FlowchartSymbolDef } from '../types';

export const SymbolEditorModal: React.FC<{
    symbol: Partial<FlowchartSymbolDef> & { isNew?: boolean };
    existingKeys: string[];
    onSave: (symbol: FlowchartSymbolDef) => void;
    onClose: () => void;
    onDelete?: (key: string) => void;
}> = ({ symbol, existingKeys, onSave, onClose, onDelete }) => {
    const [formData, setFormData] = useState(symbol);
    const [keyError, setKeyError] = useState('');

    useEffect(() => {
        setFormData(symbol);
    }, [symbol]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'key') {
            const newKey = value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
            if (symbol.isNew && existingKeys.includes(newKey)) {
                setKeyError('This key already exists.');
            } else if (newKey === '') {
                 setKeyError('Key cannot be empty.');
            }
            else {
                setKeyError('');
            }
            setFormData(prev => ({ ...prev, [name]: newKey }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        if (!formData.key || !formData.label || !formData.svgString || keyError) {
            alert('Please fill all fields correctly.');
            return;
        }
        onSave(formData as FlowchartSymbolDef);
    };

    const handleDelete = () => {
        if (!onDelete || !formData.key || formData.isStandard) return;
        if (window.confirm(`Are you sure you want to delete the symbol "${formData.label}"? This action cannot be undone.`)) {
            onDelete(formData.key);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[110] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-5 m-4 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-semibold">{symbol.isNew ? 'Add New Symbol' : 'Edit Symbol'}</h3>
                
                <div>
                    <label htmlFor="key" className="block text-sm font-medium text-gray-700">Symbol Key (unique ID)</label>
                    <input type="text" name="key" id="key" value={formData.key || ''} onChange={handleChange} disabled={!symbol.isNew}
                           className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm ${!symbol.isNew ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`} />
                    {keyError && <p className="text-red-500 text-xs mt-1">{keyError}</p>}
                    {!symbol.isNew && <p className="text-xs text-gray-500 mt-1">Key cannot be changed for existing symbols.</p>}
                </div>
                <div>
                    <label htmlFor="label" className="block text-sm font-medium text-gray-700">Label</label>
                    <input type="text" name="label" id="label" value={formData.label || ''} onChange={handleChange}
                           className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="svgString" className="block text-sm font-medium text-gray-700">SVG Code</label>
                    <textarea name="svgString" id="svgString" value={formData.svgString || ''} onChange={handleChange} rows={6}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono"></textarea>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div>
                        {!symbol.isNew && !symbol.isStandard && onDelete && (
                             <button type="button" onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700">
                                Delete
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100">Cancel</button>
                        <button type="button" onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};