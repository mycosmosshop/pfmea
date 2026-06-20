import React, { useState, useEffect } from 'react';
import type { RegistryData, FlowchartSymbolDef } from '../types';
import { SvgIconRenderer } from './icons/Icons';
import { SymbolEditorModal } from './SymbolEditorModal';

interface RegistryModalProps {
    open: boolean;
    registryData: RegistryData;
    onClose: () => void;
    onUpdateRegistry: (action: { type: string; payload: any }) => void;
}

const Pill: React.FC<{text: string; onDelete?: () => void}> = ({ text, onDelete }) => (
    <span className="inline-flex items-center gap-2 bg-gray-200 border border-gray-300 py-1 px-2 rounded-full text-sm">
        {text}
        {onDelete && <span onClick={onDelete} className="cursor-pointer text-black opacity-60 hover:opacity-100">&times;</span>}
    </span>
);

export const RegistryModal: React.FC<RegistryModalProps> = ({ open, registryData, onClose, onUpdateRegistry }) => {
    const [newTypeName, setNewTypeName] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [newPfName, setNewPfName] = useState('');
    const [newPersonName, setNewPersonName] = useState('');
    const [editingSymbol, setEditingSymbol] = useState<(Partial<FlowchartSymbolDef> & { isNew?: boolean }) | null>(null);

    useEffect(() => {
        if (open && !selectedType && registryData.clientTypes.length > 0) {
            setSelectedType(registryData.clientTypes[0]);
        }
    }, [open, registryData.clientTypes, selectedType]);
    
    if (!open) return null;

    const handleAddClientType = () => {
        const trimmed = newTypeName.trim().toUpperCase();
        if (!trimmed) return;
        onUpdateRegistry({ type: 'add_client_type', payload: { name: trimmed } });
        setNewTypeName('');
    };
    
    const handleDeleteClientType = (name: string) => {
        onUpdateRegistry({ type: 'delete_client_type', payload: { name } });
        if (selectedType === name) {
            setSelectedType(registryData.clientTypes.find(ct => ct !== name) || '');
        }
    };
    
    const handleAddPf = () => {
        const trimmed = newPfName.trim();
        if (!trimmed || !selectedType) return;
        onUpdateRegistry({ type: 'add_process_function', payload: { clientType: selectedType, name: trimmed } });
        setNewPfName('');
    };

    const handleDeletePf = (name: string) => {
        if (!selectedType) return;
        onUpdateRegistry({ type: 'delete_process_function', payload: { clientType: selectedType, name } });
    };

    const handleAddPerson = () => {
        const trimmed = newPersonName.trim();
        if (!trimmed) return;
        onUpdateRegistry({ type: 'add_responsible_person', payload: { name: trimmed }});
        setNewPersonName('');
    };

    const handleDeletePerson = (name: string) => {
        onUpdateRegistry({ type: 'delete_responsible_person', payload: { name }});
    };

    const handleAddSymbolToProject = (symbol: FlowchartSymbolDef) => {
        onUpdateRegistry({ type: 'add_flowchart_symbol', payload: symbol });
    };
    
    const handleDeleteSymbolFromProject = (key: string) => {
        onUpdateRegistry({ type: 'delete_flowchart_symbol', payload: { key } });
    };
    
    const handleSaveSymbol = (symbol: FlowchartSymbolDef) => {
        const actionType = (symbol as any).isNew ? 'add_available_symbol' : 'update_available_symbol';
        const payload = { ...symbol };
        delete (payload as any).isNew;
        onUpdateRegistry({ type: actionType, payload });
        setEditingSymbol(null);
    };
    
    const handleDeleteAvailableSymbol = (key: string) => {
        onUpdateRegistry({ type: 'delete_available_symbol', payload: { key } });
        setEditingSymbol(null);
    };

    const handleRpnThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onUpdateRegistry({
            type: 'update_rpn_thresholds',
            payload: { [name]: value }
        });
    };

    const currentPfList = registryData.processFunctionsByType[selectedType] || [];
    const activeSymbolKeys = new Set(registryData.flowchartSymbols.map(s => s.key));
    const responsiblePeople = registryData.responsiblePeople || [];

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            className="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-[100] p-4"
        >
            <form
                onSubmit={(e) => e.preventDefault()}
                onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                className="w-[800px] max-w-full bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-2">
                    <strong className="text-lg">Manage Registry (Global)</strong>
                    <button type="button" onClick={onClose} aria-label="Close" className="px-3 py-1 rounded-md hover:bg-gray-100">&times;</button>
                </div>
                
                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">All Client Types</label>
                    <div className="flex gap-2 items-center">
                        <input
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            placeholder="New type (e.g., Z)"
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                        />
                        <button type="button" onClick={handleAddClientType} className="px-4 py-2 border border-gray-300 bg-gray-50 rounded-md hover:bg-gray-100">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5 p-2 border rounded-md min-h-[40px]">
                        {registryData.clientTypes.map(type => 
                            <Pill key={type} text={type} onDelete={() => handleDeleteClientType(type)} />
                        )}
                        {registryData.clientTypes.length === 0 && <span className="text-xs text-gray-500">No client types defined.</span>}
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-gray-700">Process Functions for Selected Type</label>
                    <div className="flex gap-2 items-center">
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="flex-1 p-2 border border-gray-300 rounded-md bg-white"
                        >
                             {registryData.clientTypes.map(type => <option key={type} value={type}>{type}</option>)}
                             {registryData.clientTypes.length === 0 && <option disabled>No types available</option>}
                        </select>
                        <input
                            value={newPfName}
                            onChange={(e) => setNewPfName(e.target.value)}
                            placeholder="New Process Function"
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                            disabled={!selectedType}
                        />
                        <button type="button" onClick={handleAddPf} className="px-4 py-2 border border-gray-300 bg-gray-50 rounded-md hover:bg-gray-100" disabled={!selectedType}>+</button>
                    </div>
                     <div className="flex flex-wrap gap-2 mt-1.5 p-2 border rounded-md min-h-[40px]">
                        {currentPfList.map(name => 
                            <Pill key={name} text={name} onDelete={() => handleDeletePf(name)} />
                        )}
                        {!selectedType && <span className="text-xs text-gray-500">Select a client type to see its process functions.</span>}
                        {selectedType && currentPfList.length === 0 && <span className="text-xs text-gray-500">No process functions for this type.</span>}
                     </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-4 border-t pt-4">
                    <label className="text-sm font-semibold text-gray-700">Responsible People</label>
                    <div className="flex gap-2 items-center">
                        <input
                            value={newPersonName}
                            onChange={(e) => setNewPersonName(e.target.value)}
                            placeholder="New Person's Name"
                            className="flex-1 p-2 border border-gray-300 rounded-md"
                        />
                        <button type="button" onClick={handleAddPerson} className="px-4 py-2 border border-gray-300 bg-gray-50 rounded-md hover:bg-gray-100">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5 p-2 border rounded-md min-h-[40px]">
                        {responsiblePeople.map(person =>
                            <Pill key={person} text={person} onDelete={() => handleDeletePerson(person)} />
                        )}
                        {responsiblePeople.length === 0 && <span className="text-xs text-gray-500">No responsible people defined.</span>}
                    </div>
                </div>
                
                <div className="flex flex-col gap-1.5 mt-4 border-t pt-4">
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">RPN Color Thresholds</label>
                            <p className="text-xs text-gray-500">Set the value above which RPN cells will be colored in the AIAG View.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onUpdateRegistry({
                                type: 'update_rpn_thresholds',
                                payload: { high: 100, medium: 40 }
                            })}
                            className="px-3 py-1 border border-gray-300 rounded-md text-xs text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                            Reset to Defaults
                        </button>
                    </div>
                    <div className="flex gap-4 items-center p-2 border rounded-md bg-gray-50">
                        <div>
                            <label htmlFor="rpn-high" className="block text-xs font-medium text-gray-600">High (Red) &gt;</label>
                            <input
                                type="number"
                                id="rpn-high"
                                name="high"
                                value={registryData.rpnThresholdHigh ?? ''}
                                onChange={handleRpnThresholdChange}
                                className="p-2 border border-gray-300 rounded-md w-32"
                            />
                        </div>
                        <div>
                            <label htmlFor="rpn-medium" className="block text-xs font-medium text-gray-600">Medium (Yellow) &gt;</label>
                            <input
                                type="number"
                                id="rpn-medium"
                                name="medium"
                                value={registryData.rpnThresholdMedium ?? ''}
                                onChange={handleRpnThresholdChange}
                                className="p-2 border border-gray-300 rounded-md w-32"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600">Low (Green) &le;</label>
                            <div className="p-2 border border-gray-200 rounded-md w-32 bg-green-100 text-gray-700 text-sm" title="Orta eşiğin altındaki RPN yeşil gösterilir">
                                {registryData.rpnThresholdMedium ?? 40} ve altı
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-4 border-t pt-4">
                    <label className="text-sm font-semibold text-gray-700">Available Symbols</label>
                    <p className="text-xs text-gray-500">Click a symbol to add it to your project. Use the pencil icon to edit its definition or add a new custom symbol.</p>
                    <div className="flex flex-wrap gap-2 mt-1.5 p-2 border rounded-md max-h-60 overflow-y-auto bg-gray-50">
                        {registryData.availableFlowchartSymbols.map(symbol => {
                            const isAdded = activeSymbolKeys.has(symbol.key);
                            return (
                                <div key={symbol.key} className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => handleAddSymbolToProject(symbol)}
                                        disabled={isAdded}
                                        title={isAdded ? `${symbol.label} (already in project)` : `Add ${symbol.label} to project`}
                                        className={`flex flex-col items-center justify-start p-2 border-2 rounded-md w-28 h-24 text-center transition-colors
                                            ${isAdded 
                                                ? 'bg-gray-200 border-gray-300 opacity-60 cursor-not-allowed' 
                                                : 'bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                                            }`
                                        }
                                    >
                                        <SvgIconRenderer svgString={symbol.svgString} className="h-8 w-12 flex-shrink-0" />
                                        <span className="text-[10px] mt-1 text-gray-600 leading-tight">{symbol.label}</span>
                                    </button>
                                     <button type="button" onClick={() => setEditingSymbol(symbol)} title={`Edit ${symbol.label}`} className="absolute top-1 right-1 h-6 w-6 bg-white rounded-full flex items-center justify-center shadow border border-gray-200 opacity-0 group-hover:opacity-100 hover:bg-blue-100 transition-opacity">
                                        ✏️
                                    </button>
                                </div>
                            );
                        })}
                         <button
                            type="button"
                            onClick={() => setEditingSymbol({ isNew: true, key: '', label: '', svgString: '<svg viewBox="0 0 32 20"></svg>' })}
                            title="Add a new custom symbol"
                            className="flex flex-col items-center justify-center p-2 border-2 border-dashed border-gray-400 rounded-md w-28 h-24 text-center text-gray-500 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                            <span className="text-2xl">+</span>
                            <span className="text-xs mt-1">Add New Symbol</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-sm font-semibold text-gray-700">Symbols in Use for this Project</label>
                    <div className="flex flex-wrap gap-2 mt-1.5 p-2 border rounded-md min-h-[40px]">
                        {registryData.flowchartSymbols.map(symbol => 
                             <div key={symbol.key} className="relative group p-1 border rounded-md bg-gray-50">
                                <div className="flex items-center gap-2">
                                    <SvgIconRenderer svgString={symbol.svgString} className="h-6 w-8" />
                                    <div className="text-xs">
                                        <div>{symbol.label}</div>
                                        <div className="text-gray-400 font-mono">{symbol.key}</div>
                                    </div>
                                </div>
                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => handleDeleteSymbolFromProject(symbol.key)} title="Remove from project" className="h-5 w-5 bg-red-500 text-white rounded text-xs flex items-center justify-center">X</button>
                                </div>
                            </div>
                        )}
                        {registryData.flowchartSymbols.length === 0 && <span className="text-xs text-gray-500">No symbols selected. Add from the list above.</span>}
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 bg-white rounded-md hover:bg-gray-100">Close</button>
                </div>
            </form>
            {editingSymbol && (
                <SymbolEditorModal
                    symbol={editingSymbol}
                    existingKeys={registryData.availableFlowchartSymbols.map(s => s.key)}
                    onSave={handleSaveSymbol}
                    onDelete={handleDeleteAvailableSymbol}
                    onClose={() => setEditingSymbol(null)}
                />
            )}
        </div>
    );
};