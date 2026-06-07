import React, { useState } from 'react';
import { ClientTypeEntryModal } from './ClientTypeEntryModal';

interface ProcessFunctionModalProps {
    onSave: (data: { name: string; clientType: string }) => void;
    onClose: () => void;
}

const PredefinedButton = ({ text, onClick }: { text: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">{text}</button>
);

export const ProcessFunctionModal: React.FC<ProcessFunctionModalProps> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    const [clientType, setClientType] = useState('E'); // Default based on screenshot
    const [customClientTypes, setCustomClientTypes] = useState<string[]>([]);
    const [isClientTypeModalOpen, setClientTypeModalOpen] = useState(false);

    const handleSaveClick = () => {
        if (name.trim() && clientType.trim()) {
            onSave({ name, clientType });
        }
    };

    const handleAddCustomType = (newType: string) => {
        const upperCaseType = newType.toUpperCase();
        if (upperCaseType && !customClientTypes.includes(upperCaseType)) {
            setCustomClientTypes(prev => [...prev, upperCaseType]);
        }
        setClientTypeModalOpen(false);
    };

    const handleDeleteCustomType = (typeToDelete: string) => {
        setCustomClientTypes(prev => prev.filter(t => t !== typeToDelete));
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 m-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Process function</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Predefined client type</label>
                        <div className="flex flex-wrap gap-2 items-center">
                            <PredefinedButton text="I" onClick={() => setClientType('I')} />
                            <PredefinedButton text="E" onClick={() => setClientType('E')} />
                            <PredefinedButton text="U" onClick={() => setClientType('U')} />
                            <PredefinedButton text="Internal" onClick={() => setClientType('I')} />
                            <PredefinedButton text="External" onClick={() => setClientType('E')} />
                            <PredefinedButton text="User" onClick={() => setClientType('U')} />
                             {customClientTypes.map(type => (
                                <div key={type} className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => setClientType(type)}
                                        className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    >
                                        {type}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteCustomType(type); }}
                                        className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={`Delete ${type}`}
                                    >
                                        &times;
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={() => setClientTypeModalOpen(true)} className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400">+</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor="clientType">Client type:</label>
                        <input id="clientType" name="clientType" value={clientType} onChange={(e) => setClientType(e.target.value.toUpperCase())} className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-1 sr-only" htmlFor="functionDescription">Function description</label>
                        <input id="functionDescription" name="name" value={name} onChange={(e) => setName(e.target.value)} className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Function description" />
                    </div>
                </div>
                <div className="flex items-center justify-end mt-6">
                    <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm mr-2 transition-colors">
                    Cancel
                    </button>
                    <button type="button" onClick={handleSaveClick} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors">
                    OK
                    </button>
                </div>
            </div>
            {isClientTypeModalOpen && <ClientTypeEntryModal onSave={handleAddCustomType} onClose={() => setClientTypeModalOpen(false)} />}
        </div>
    );
};