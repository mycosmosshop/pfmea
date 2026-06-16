
import React, { useState } from 'react';
import { symbols } from './icons/ClassificationSymbols';
import type { RegistryData, FlowchartSymbolDef } from '../types';
import { SvgIconRenderer } from './icons/Icons';
import { SymbolEditorModal } from './SymbolEditorModal';

interface ClassificationModalProps {
    onSelectSymbol: (symbol: string) => void;
    onClose: () => void;
    registryData?: RegistryData;
    onUpdateRegistry?: (action: { type: string; payload: any }) => void;
}

const standardSymbolKeys = [
    'none', 'diamond', 'circle-triangle', 'hexagon', 'house', 'shield', 'triangle-down',
    'circle-triangle-s', 'circle-triangle-r', 'circle-triangle-sr', '(***)'
];

export const ClassificationModal: React.FC<ClassificationModalProps> = ({ onSelectSymbol, onClose, registryData, onUpdateRegistry }) => {
    const [selectionType, setSelectionType] = useState<'symbol' | 'letter'>('symbol');
    const [letterCode, setLetterCode] = useState('');
    const [editingSymbol, setEditingSymbol] = useState<(Partial<FlowchartSymbolDef> & { isNew?: boolean }) | null>(null);

    const handleSymbolClick = (key: string) => {
        onSelectSymbol(key);
    };

    const handleSetLetterCode = () => {
        if (letterCode.trim()) {
            onSelectSymbol(letterCode.trim());
        }
    };

    const handleSaveSymbol = (symbol: FlowchartSymbolDef) => {
        if (!onUpdateRegistry) return;
        const actionType = (symbol as any).isNew ? 'add_classification_symbol' : 'update_classification_symbol';
        const payload = { ...symbol };
        delete (payload as any).isNew;
        onUpdateRegistry({ type: actionType, payload });
        setEditingSymbol(null);
    };
    
    const handleDirectDeleteSymbol = (key: string, label: string) => {
        if (!onUpdateRegistry) return;
        if (window.confirm(`Are you sure you want to delete the classification symbol "${label}"? This action cannot be undone.`)) {
            onUpdateRegistry({ type: 'delete_classification_symbol', payload: { key } });
        }
    };

    const customSymbols = registryData?.classificationSymbols || [];
    const allSymbolKeys = [...standardSymbolKeys, ...customSymbols.map(s => s.key)];

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 z-[100] flex justify-center items-center" onClick={onClose}>
                <div className="bg-gray-100 rounded-lg shadow-xl w-full max-w-md p-5 m-4 flex flex-col font-sans" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center border-b pb-2 mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Classification</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="flex items-center">
                                <input type="radio" name="selectionType" value="symbol" checked={selectionType === 'symbol'} onChange={() => setSelectionType('symbol')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                <span className="ml-2 font-semibold text-gray-700">Symbol</span>
                            </label>
                            <div className={`grid grid-cols-6 gap-2 mt-2 p-2 rounded-md border ${selectionType === 'symbol' ? 'border-blue-400 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                                {standardSymbolKeys.map(key => {
                                    const SymbolComponent = symbols[key];
                                    return (
                                        <button 
                                            key={key} 
                                            onClick={() => handleSymbolClick(key)} 
                                            disabled={selectionType !== 'symbol'}
                                            className={`flex items-center justify-center w-12 h-12 rounded border-2 transition-all bg-white
                                            ${selectionType === 'symbol' ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-100' : 'cursor-not-allowed opacity-50'}
                                            border-gray-300`}
                                            title={key}
                                        >
                                            {key === 'none' ? (
                                                <span className="text-sm font-semibold text-gray-700">None</span>
                                            ) : (
                                                SymbolComponent && <SymbolComponent className={`h-8 w-8 text-black`} />
                                            )}
                                        </button>
                                    );
                                })}
                                {customSymbols.map(symbol => (
                                    <div key={symbol.key} className="relative group w-12 h-12">
                                        <button 
                                            onClick={() => handleSymbolClick(symbol.key)} 
                                            disabled={selectionType !== 'symbol'}
                                            className={`flex items-center justify-center w-full h-full rounded border-2 transition-all bg-white
                                            ${selectionType === 'symbol' ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-100' : 'cursor-not-allowed opacity-50'}
                                            border-gray-300`}
                                            title={symbol.label}
                                        >
                                            <SvgIconRenderer svgString={symbol.svgString} className="h-8 w-8 text-black" />
                                        </button>
                                        <div className="absolute -top-1.5 -right-1.5 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingSymbol(symbol);
                                                }}
                                                title={`Edit ${symbol.label}`}
                                                className="h-5 w-5 bg-white rounded-full flex items-center justify-center text-xs shadow border border-gray-300 hover:bg-blue-100 disabled:hidden"
                                                disabled={selectionType !== 'symbol'}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDirectDeleteSymbol(symbol.key, symbol.label);
                                                }}
                                                title={`Delete ${symbol.label}`}
                                                className="h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs shadow border border-red-600 hover:bg-red-600 disabled:hidden"
                                                disabled={selectionType !== 'symbol'}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button 
                                    key="plus" 
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        setEditingSymbol({ isNew: true, key: '', label: '', svgString: '<svg viewBox="0 0 24 24"></svg>' });
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={selectionType !== 'symbol'}
                                    className={`flex items-center justify-center w-12 h-12 rounded border-2 transition-all bg-white
                                    ${selectionType === 'symbol' ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-100' : 'cursor-not-allowed opacity-50'}
                                    border-dashed border-gray-400`}
                                    title="Add new custom symbol"
                                >
                                    {symbols.plus && <symbols.plus className="h-8 w-8 text-gray-400" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center">
                                <input type="radio" name="selectionType" value="letter" checked={selectionType === 'letter'} onChange={() => setSelectionType('letter')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                                <span className="ml-2 font-semibold text-gray-700">Letter code</span>
                            </label>
                            <div className={`mt-2 p-3 rounded-md border ${selectionType === 'letter' ? 'border-blue-400 bg-white' : 'border-gray-300 bg-gray-50'}`}>
                                <p className="text-sm text-gray-500 mb-2">Enter a custom code and press 'Set'.</p>
                                <div className="flex items-center">
                                    <input 
                                        type="text"
                                        value={letterCode}
                                        onChange={(e) => setLetterCode(e.target.value.toUpperCase())}
                                        disabled={selectionType !== 'letter'}
                                        placeholder="e.g., C1"
                                        className={`shadow-sm border rounded w-full py-1.5 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectionType !== 'letter' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    />
                                    <button 
                                        onClick={handleSetLetterCode}
                                        disabled={selectionType !== 'letter' || !letterCode.trim()}
                                        className="ml-2 px-4 py-1.5 border rounded-md text-sm font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {editingSymbol && onUpdateRegistry && (
                <SymbolEditorModal
                    symbol={editingSymbol}
                    existingKeys={allSymbolKeys}
                    onSave={handleSaveSymbol}
                    onClose={() => setEditingSymbol(null)}
                />
            )}
        </>
    );
};
