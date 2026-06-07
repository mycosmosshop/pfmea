import React, { useState } from 'react';

interface ClientTypeEntryModalProps {
    onSave: (clientType: string) => void;
    onClose: () => void;
}

export const ClientTypeEntryModal: React.FC<ClientTypeEntryModalProps> = ({ onSave, onClose }) => {
    const [value, setValue] = useState('');

    const handleSave = () => {
        if (value.trim()) {
            onSave(value.trim());
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5 m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Enter client type</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="flex items-center space-x-4 my-4">
                    <div className="flex-shrink-0">
                        <svg className="h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <label htmlFor="clientTypeInput" className="block text-sm font-medium text-gray-700">Enter client type</label>
                        <input
                            id="clientTypeInput"
                            type="text"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="mt-1 shadow-sm border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex justify-end mt-6 space-x-2">
                    <button onClick={handleSave} disabled={!value.trim()} className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-300 shadow-sm">OK</button>
                    <button onClick={onClose} className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-100 shadow-sm">Cancel</button>
                </div>
            </div>
        </div>
    );
};