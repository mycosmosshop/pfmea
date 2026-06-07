import React, { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import type { FmeaData, ModalType, ProcessItem, ProcessStep, ProcessStepFunction, RegistryData } from '../types';
import { ClassificationSymbol } from './ClassificationSymbol';
import { SvgIconRenderer } from './icons/Icons';

interface FlowDiagramViewProps {
  data: FmeaData;
  registryData: RegistryData;
  onDataChange: (newData: FmeaData) => void;
  onOpenModal: (modalInfo: ModalType) => void;
  onAddNewFunctionWithSymbol: (stepId: string, symbolKey: string) => void;
}

const FlowDiagramView: React.FC<FlowDiagramViewProps> = ({ data, registryData, onDataChange, onOpenModal, onAddNewFunctionWithSymbol }) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const symbolCellRefs = useRef<Record<string, HTMLElement | null>>({});
    const [lines, setLines] = useState<string[]>([]);
    
    useEffect(() => {
        const newData = JSON.parse(JSON.stringify(data));
        let changed = false;

        const guessSymbol = (text: string): string | undefined => {
            if (!text || !registryData.flowchartSymbols) return undefined;
            const lowerText = text.toLowerCase();
            
            // Try to find an exact match first
            const exactMatch = registryData.availableFlowchartSymbols.find(s => s.label.toLowerCase() === lowerText);
            if (exactMatch && registryData.flowchartSymbols.some(s => s.key === exactMatch.key)) {
                return exactMatch.key;
            }

            // Fallback to keyword matching
            const keywordMap: { [key: string]: string[] } = {
                'process': ['process', 'işlem'],
                'decision': ['decision', 'karar'],
                'data': ['data', 'veri'],
                'terminator': ['terminator', 'start', 'end', 'başla', 'bitir'],
                'document': ['document', 'doküman', 'belge'],
                'delay': ['delay', 'gecikme', 'bekleme'],
                'sort': ['sort', 'sırala'],
                'merge': ['merge', 'birleştir'],
                'extract': ['extract', 'ayıklama'],
                'manual_operation': ['manuel', 'manual'],
                'preparation': ['hazırlık', 'preparation'],
                'internal_storage': ['depolama', 'storage'],
            };

            for (const key in keywordMap) {
                if (registryData.flowchartSymbols.some(s => s.key === key)) {
                     for (const keyword of keywordMap[key]) {
                        if (lowerText.includes(keyword)) {
                            return key;
                        }
                    }
                }
            }
            return undefined;
        };

        Object.values(newData.processStepFunctions).forEach((func: ProcessStepFunction) => {
            if (!func.flowchartSymbol) {
                const description = func.processDescription || func.name || '';
                const guessedSymbol = guessSymbol(description);
                if (guessedSymbol) {
                    func.flowchartSymbol = guessedSymbol;
                    changed = true;
                }
            }
        });

        if (changed) {
            onDataChange(newData);
        }
    }, [data, onDataChange, registryData]);

    const allFunctionsInOrder = useMemo(() => {
        return Object.values(data.processItems)
            .flatMap((item: ProcessItem) => item.stepIds)
            .map(stepId => data.processSteps[stepId])
            .filter(Boolean)
            .flatMap(step => step.functionIds)
            .map(funcId => data.processStepFunctions[funcId])
            .filter(Boolean);
    }, [data]);

    const calculateAndSetLines = useCallback(() => {
        const container = tableContainerRef.current;
        if (!container) return;
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        const newLines: string[] = [];
        let prevFuncWithSymbol: ProcessStepFunction | null = null;

        allFunctionsInOrder.forEach(func => {
            if (func.flowchartSymbol) {
                if (prevFuncWithSymbol) {
                    const fromEl = symbolCellRefs.current[prevFuncWithSymbol.id];
                    const toEl = symbolCellRefs.current[func.id];

                    if (fromEl && toEl) {
                        const fromRect = fromEl.getBoundingClientRect();
                        const toRect = toEl.getBoundingClientRect();
                        
                        const startX = fromRect.left + fromRect.width / 2 - containerRect.left + scrollLeft;
                        const startY = fromRect.bottom - containerRect.top + scrollTop;
                        const endX = toRect.left + toRect.width / 2 - containerRect.left + scrollLeft;
                        const endY = toRect.top - containerRect.top + scrollTop;
                        
                        if (endY > startY) {
                            const midY = startY + (endY - startY) / 2;
                            const path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
                            newLines.push(path);
                        }
                    }
                }
                prevFuncWithSymbol = func;
            }
        });

        setLines(newLines);

    }, [allFunctionsInOrder]);
    
    useLayoutEffect(() => {
        let animationFrameId: number;
        
        const updateLoop = () => {
            calculateAndSetLines();
            animationFrameId = requestAnimationFrame(updateLoop);
        };

        animationFrameId = requestAnimationFrame(updateLoop);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [calculateAndSetLines]);
    
    const handleSymbolClick = (funcId: string, symbolKey: string) => {
        const newData = JSON.parse(JSON.stringify(data));
        const func = newData.processStepFunctions[funcId];
        if (func) {
            if (func.flowchartSymbol === symbolKey) {
                delete func.flowchartSymbol; // Toggle off
            } else {
                func.flowchartSymbol = symbolKey;
            }
            onDataChange(newData);
        }
    };
    
    const handleFuncClick = (func: ProcessStepFunction) => {
        const parentStep = (Object.values(data.processSteps) as ProcessStep[]).find(s => s.functionIds.includes(func.id));
        if (parentStep) {
            onOpenModal({ type: 'ProcessStepFunction', parentId: parentStep.id, data: func });
        }
    };
    
    const handleStepClick = (step: ProcessStep) => {
        const parentItem = (Object.values(data.processItems) as ProcessItem[]).find(pi => pi.stepIds.includes(step.id));
        if (parentItem) {
            onOpenModal({ type: 'ProcessStep', parentId: parentItem.id, data: step });
        }
    };

    const thClass = "p-1 border text-xs font-bold uppercase tracking-wider align-middle text-center";
    const tdClass = "p-0.5 border border-gray-400 text-xs align-top";

    const renderedRows = Object.values(data.processItems).flatMap((item: ProcessItem) =>
        item.stepIds.map(stepId => {
            const step = data.processSteps[stepId];
            if (!step) return null;

            const stepFunctions = step.functionIds.map(fid => data.processStepFunctions[fid]).filter(Boolean);

            if (stepFunctions.length === 0) {
                return (
                    <tr key={step.id} className="bg-gray-50/50">
                        <td className={`${tdClass} text-center align-middle font-semibold cursor-pointer hover:bg-blue-100`} onClick={() => handleStepClick(step)}>{step.operationNumber}</td>
                        {registryData.flowchartSymbols.map(symbol => (
                            <td 
                                key={symbol.key}
                                className={`${tdClass} w-16 h-20 cursor-pointer hover:bg-blue-100 transition-colors`}
                                onClick={() => onAddNewFunctionWithSymbol(step.id, symbol.key)}
                                title={`Add new function with '${symbol.label}' symbol`}
                            ></td>
                        ))}
                        <td className={`${tdClass} cursor-pointer hover:bg-blue-100`} onClick={() => handleStepClick(step)}></td>
                        <td className={`${tdClass} cursor-pointer hover:bg-blue-100`} onClick={() => handleStepClick(step)}></td>
                        <td className={`${tdClass} p-2 align-middle text-gray-500 italic cursor-pointer hover:bg-blue-100`} onClick={() => handleStepClick(step)}>
                            {step.name} (No functions defined)
                        </td>
                    </tr>
                );
            }

            const rowSpan = stepFunctions.length;
            return stepFunctions.map((func, funcIndex) => (
                <tr key={func.id} className="hover:bg-gray-50">
                    {funcIndex === 0 && (
                        <td rowSpan={rowSpan} className={`${tdClass} text-center align-middle font-semibold`}>{step.operationNumber}</td>
                    )}
                    {registryData.flowchartSymbols.map(symbol => {
                        const isSelected = func.flowchartSymbol === symbol.key;
                        return (
                            <td
                                key={symbol.key}
                                className={`${tdClass} w-16 h-20 text-center align-middle cursor-pointer hover:bg-blue-100 transition-colors`}
                                onClick={() => handleSymbolClick(func.id, symbol.key)}
                            >
                                {isSelected && (
                                    <div ref={el => { symbolCellRefs.current[func.id] = el; }} className="inline-flex items-center justify-center w-10 h-7">
                                        <SvgIconRenderer svgString={symbol.svgString} className="w-full h-full" />
                                    </div>
                                )}
                            </td>
                        );
                    })}
                    <td className={`${tdClass} text-center align-middle cursor-pointer hover:bg-blue-100`} onClick={() => handleFuncClick(func)}><ClassificationSymbol symbolKey={func.classificationSymbolBefore} registryData={registryData} /></td>
                    <td className={`${tdClass} text-center align-middle cursor-pointer hover:bg-blue-100`} onClick={() => handleFuncClick(func)}><ClassificationSymbol symbolKey={func.classificationSymbolAfter} registryData={registryData} /></td>
                    <td className={`${tdClass} p-2 align-middle cursor-pointer hover:bg-blue-100`} onClick={() => handleFuncClick(func)}>{func.processDescription || func.name}</td>
                </tr>
            ));
        })
    ).filter(Boolean);

    return (
    <div ref={tableContainerRef} className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto relative">
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#007bff" />
                </marker>
            </defs>
            {lines.map((d, i) => <path key={i} d={d} stroke="#007bff" fill="none" strokeWidth="1.5" markerEnd="url(#arrowhead)" />)}
        </svg>

        <h2 className="text-xl font-bold mb-4 text-gray-700">Flow Diagram View</h2>
        <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-400 bg-white relative z-10">
            <thead className="bg-gray-100 text-gray-700">
                <tr>
                    <th className={`${thClass} bg-gray-200`} colSpan={registryData.flowchartSymbols.length + 1}>Akış Çizelgesi</th>
                    <th className={`${thClass} bg-gray-200`} rowSpan={3}>Özel Karakteristik</th>
                    <th className={`${thClass} bg-gray-200`} rowSpan={3}>İyileştirme Sonrası Özel Karakteristik</th>
                    <th className={`${thClass} bg-gray-200`} rowSpan={3}>Proses Açıklama</th>
                </tr>
                <tr>
                    <th className={thClass} rowSpan={2}>Proses No</th>
                    {registryData.flowchartSymbols.map(s => <th key={s.key} className={thClass}>{s.label}</th>)}
                </tr>
                <tr>
                    {registryData.flowchartSymbols.map(s => (
                        <th key={s.key} className={`${thClass} p-2`}>
                             <SvgIconRenderer svgString={s.svgString} className="h-5 w-8 mx-auto" />
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {renderedRows.length > 0 ? renderedRows : (
                    <tr>
                        <td colSpan={registryData.flowchartSymbols.length + 4} className="px-6 py-10 text-center text-gray-500">No process steps to display. Add one from the Tree View.</td>
                    </tr>
                )}
            </tbody>
        </table>
        </div>
    </div>
  );
};

export default FlowDiagramView;