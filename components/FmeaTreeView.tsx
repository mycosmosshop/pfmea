import React, { useLayoutEffect, useCallback, useRef, useState, useEffect } from 'react';
import type { FmeaData, ModalType, FailureEffect, ProcessItem, ProcessStep, ProcessStepFunction, FailureMode, FailureCause } from '../types';

interface FmeaTreeViewProps {
    data: FmeaData;
    onOpenModal: (modalInfo: ModalType) => void;
    onDeleteItem: (itemType: string, itemId: string) => void;
    onAddItem: (itemType: 'ProcessStep' | 'ProcessStepFunction' | 'FailureMode' | 'FailureCause' | 'FailureEffect', parentId: string, additionalInfo?: { functionId?: string }) => void;
    onOpenSeverityModal: (config: {
        targetType: 'effect' | 'cause' | 'new_effect_for_mode';
        targetId: string;
        field: 'severity' | 'revisedSeverity';
        currentValue?: number;
        onSaveOverride?: (severity: number) => void;
    }) => void;
    onOpenOccurrenceModal: (config: {
        targetId: string;
        field: 'occurrence' | 'revisedOccurrence';
        currentValue?: number;
    }) => void;
    onOpenDetectionModal: (config: {
        targetId: string;
        field: 'detection' | 'revisedDetection';
        currentValue?: number;
    }) => void;
    onReorder: (type: string, draggedId: string, targetId: string, position: 'before' | 'after') => void;
}

const Node = React.forwardRef<HTMLDivElement, { 
    title: string; 
    subtitle?: string; 
    children?: React.ReactNode; 
    color?: string; 
    onClick: () => void; 
    onDelete?: (e: React.MouseEvent) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    isDropTargetBefore?: boolean;
    isDropTargetAfter?: boolean;
}>(({ title, subtitle, children, color = 'bg-white', onClick, onDelete, draggable, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, isDropTargetBefore, isDropTargetAfter }, ref) => {
    
    const handleNodeClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.delete-button')) {
            return;
        }
        onClick();
    };
    
    return (
        <div 
            ref={ref} 
            onClick={handleNodeClick}
            draggable={draggable}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`relative p-3 rounded-lg border-2 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-500 transition-all duration-200 w-52 text-center ${color}`}
        >
            {isDropTargetBefore && <div className="absolute -top-1.5 left-0 right-0 h-1.5 bg-green-500 rounded-full z-20" />}
            {onDelete && (
                <button 
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={onDelete}
                    className="delete-button absolute top-1 right-1 text-gray-400 hover:text-red-500 transition-colors z-10 p-1 rounded-full hover:bg-red-100"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
            <h4 className="font-bold text-sm">{title}</h4>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            {children}
            {isDropTargetAfter && <div className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-green-500 rounded-full z-20" />}
        </div>
    );
});


const AddButton: React.FC<{ onClick: (e: React.MouseEvent) => void; children?: React.ReactNode; [key: string]: any; }> = ({ onClick, children, ...rest }) => (
    <button onClick={onClick} {...rest} className="mt-2 flex items-center justify-center w-full px-3 py-1.5 border border-dashed border-gray-400 rounded-md text-xs text-gray-600 hover:bg-gray-200 hover:border-gray-500 transition-colors">
        {children || 'Add New'}
    </button>
);

const CreationDropZone: React.FC<{
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    isTarget: boolean;
    children: React.ReactNode;
}> = ({ onDrop, onDragOver, onDragLeave, isTarget, children }) => (
    <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`w-52 h-24 flex items-center justify-center p-3 rounded-lg border-2 border-dashed transition-all duration-200 text-center text-sm text-gray-500 ${isTarget ? 'bg-green-100 border-green-500' : 'bg-gray-50 border-gray-400'}`}
    >
        {children}
    </div>
);

const FmeaTreeView: React.FC<FmeaTreeViewProps> = ({ data, onOpenModal, onDeleteItem, onAddItem, onReorder, onOpenSeverityModal, onOpenOccurrenceModal, onOpenDetectionModal }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const [paths, setPaths] = useState<string[]>([]);
    
    const [draggedItem, setDraggedItem] = useState<{ id: string; type: string; } | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
    const [creationDropTarget, setCreationDropTarget] = useState<{ 
        parentId: string; 
        type: 'ProcessStep' | 'ProcessStepFunction' | 'FailureMode' | 'FailureCause' | 'FailureEffect'; 
    } | null>(null);

    // Clear node refs on each render to prevent stale references when data changes.
    nodeRefs.current = {};
    const setNodeRef = (id: string, el: HTMLDivElement | null) => {
        nodeRefs.current[id] = el;
    };
    
    const createDeleteHandler = (itemType: string, itemId: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete this ${itemType} and all its children?`)) {
            onDeleteItem(itemType, itemId);
        }
    };
    
    const handleDragStart = (e: React.DragEvent, id: string, type: string) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        setTimeout(() => setDraggedItem({ id, type }), 0);
    };

    const handleDragOver = (e: React.DragEvent, id: string, type: string) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.type !== type || draggedItem.id === id) {
            setDropTarget(null);
            return;
        }
        
        e.dataTransfer.dropEffect = 'move';
        
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const verticalMidpoint = rect.top + rect.height / 2;
        const position = e.clientY < verticalMidpoint ? 'before' : 'after';
        
        if (dropTarget?.id !== id || dropTarget?.position !== position) {
            setDropTarget({ id, position });
        }
    };

    const handleDragLeave = () => {
        setDropTarget(null);
    };

    const handleDrop = (e: React.DragEvent, id: string, type: string) => {
        e.preventDefault();
        if (draggedItem && dropTarget && draggedItem.id !== id && draggedItem.type === type) {
            onReorder(draggedItem.type, draggedItem.id, id, dropTarget.position);
        }
        handleDragEnd();
    };
    
    const handleDragEnd = () => {
        setDraggedItem(null);
        setDropTarget(null);
        setCreationDropTarget(null);
    };

    const handleCreationDragOver = (e: React.DragEvent, type: any, parentId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setCreationDropTarget({ parentId, type });
    };

    const handleCreationDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCreationDropTarget(null);
    };

    const handleCreateOnDrop = (e: React.DragEvent, type: any, parentId: string, additionalInfo?: any) => {
        e.preventDefault();
        e.stopPropagation();
        onAddItem(type, parentId, additionalInfo);
        handleDragEnd();
    };

    const calculateAndSetPaths = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        
        const newPaths: string[] = [];
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        const createPath = (fromId: string, toId: string) => {
            const fromEl = nodeRefs.current[fromId];
            const toEl = nodeRefs.current[toId];
            if (!fromEl || !toEl) return;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            const x1 = fromRect.right - containerRect.left + scrollLeft;
            const y1 = fromRect.top + fromRect.height / 2 - containerRect.top + scrollTop;
            const x2 = toRect.left - containerRect.left + scrollLeft;
            const y2 = toRect.top + toRect.height / 2 - containerRect.top + scrollTop;
            
            if (x2 <= x1) return; // Avoid drawing backward lines
            
            // Straight line path
            const path = `M ${x1} ${y1} L ${x2} ${y2}`;
            newPaths.push(path);
        };

        // Traverse the data hierarchy from the top down to ensure all connections are drawn
        (data.processItemIds || []).forEach(itemId => {
            const item = data.processItems[itemId];
            if (!item) return;

            (item.stepIds || []).forEach(stepId => {
                createPath(item.id, stepId); // item -> step

                const step = data.processSteps[stepId];
                if (!step) return;

                (step.functionIds || []).forEach(funcId => {
                    createPath(step.id, funcId); // step -> function

                    const func = data.processStepFunctions[funcId];
                    if (!func) return;

                    (func.failureModeIds || []).forEach(modeId => {
                        createPath(func.id, modeId); // function -> mode

                        const mode = data.failureModes[modeId];
                        if (!mode) return;

                        (mode.effectIds || []).forEach(effectId => createPath(mode.id, effectId)); // mode -> effect
                        (mode.causeIds || []).forEach(causeId => createPath(mode.id, causeId)); // mode -> cause
                    });
                });
            });
        });

        setPaths(newPaths);
    }, [data]);
    
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updatePaths = () => {
             // Defer to the next frame to allow DOM to update
            requestAnimationFrame(() => {
                calculateAndSetPaths();
            });
        };
        
        // Initial calculation
        updatePaths();

        container.addEventListener('scroll', updatePaths);
        
        const observer = new ResizeObserver(updatePaths);
        observer.observe(container);

        // Also observe all nodes for position changes
        Object.values(nodeRefs.current).forEach(node => {
            // FIX: Use `instanceof Element` as a type guard. This ensures that `node` is a valid
            // DOM element before passing it to `observer.observe`, resolving the TypeScript
            // error where `node` was inferred as `unknown`.
            if (node instanceof Element) {
                observer.observe(node);
            }
        });

        return () => {
            container.removeEventListener('scroll', updatePaths);
            observer.disconnect();
        };
    }, [calculateAndSetPaths, data]);

    const orderedProcessItems = (data.processItemIds || Object.keys(data.processItems)).map(id => data.processItems[id]).filter(Boolean);

    return (
        <div ref={containerRef} className="bg-white p-6 rounded-lg shadow-lg overflow-auto min-w-max relative">
            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                    <marker id="tree-arrowhead" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
                        <polygon points="0 0, 7 3.5, 0 7" fill="#cbd5e1" />
                    </marker>
                </defs>
                {paths.map((path, i) => (
                    <path key={i} d={path} stroke="#cbd5e1" fill="none" strokeWidth="2" markerEnd="url(#tree-arrowhead)" />
                ))}
            </svg>
             <div className="relative" style={{ zIndex: 1 }}>
                <div className="flex space-x-12 sticky top-0 bg-white py-4 z-10">
                    <div className="w-52 flex-shrink-0 text-center">
                        <div className="font-bold text-sm text-blue-800 uppercase tracking-wider pt-2">Process Item</div>
                    </div>
                    {['Process Step', 'Process Step Function', 'Failure Mode', 'Failure Effect / Cause'].map(title => (
                        <div key={title} className="w-52 flex-shrink-0 text-center font-bold text-sm text-blue-800 uppercase tracking-wider pt-2 flex items-center justify-center">{title}</div>
                    ))}
                </div>


                <div className="flex flex-col">
                    {orderedProcessItems.length > 0 ? (
                        orderedProcessItems.map((item: ProcessItem) => (
                            <div key={item.id} className="flex items-center space-x-12 py-4">
                                <div className="w-52 flex-shrink-0">
                                    <Node 
                                        ref={el => setNodeRef(item.id, el)} 
                                        title={item.name} color="bg-blue-50 border-blue-300" 
                                        onClick={() => onOpenModal({ type: 'ProcessItem', data: item })}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item.id, 'ProcessItem')}
                                        onDragOver={(e) => handleDragOver(e, item.id, 'ProcessItem')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, item.id, 'ProcessItem')}
                                        onDragEnd={handleDragEnd}
                                        isDropTargetBefore={draggedItem?.type === 'ProcessItem' && dropTarget?.id === item.id && dropTarget.position === 'before'}
                                        isDropTargetAfter={draggedItem?.type === 'ProcessItem' && dropTarget?.id === item.id && dropTarget.position === 'after'}
                                    >
                                        <AddButton onClick={(e) => { e.stopPropagation(); onAddItem('ProcessStep', item.id); }}>Add New Step</AddButton>
                                    </Node>
                                </div>

                                <div className="flex flex-col space-y-4">
                                    {item.stepIds.map(stepId => {
                                        const step = data.processSteps[stepId];
                                        if (!step) return null;
                                        return (
                                            <div key={step.id} className="flex items-center space-x-12">
                                                <div className="w-52 flex-shrink-0">
                                                    <Node 
                                                        ref={el => setNodeRef(step.id, el)} 
                                                        title={step.name} 
                                                        subtitle={`[${step.operationNumber}]`} color="bg-gray-50 border-gray-300" 
                                                        onClick={() => onOpenModal({ type: 'ProcessStep', parentId: item.id, data: step })} 
                                                        onDelete={createDeleteHandler('ProcessStep', step.id)}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, step.id, 'ProcessStep')}
                                                        onDragOver={(e) => handleDragOver(e, step.id, 'ProcessStep')}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, step.id, 'ProcessStep')}
                                                        onDragEnd={handleDragEnd}
                                                        isDropTargetBefore={draggedItem?.type === 'ProcessStep' && dropTarget?.id === step.id && dropTarget.position === 'before'}
                                                        isDropTargetAfter={draggedItem?.type === 'ProcessStep' && dropTarget?.id === step.id && dropTarget.position === 'after'}
                                                    >
                                                        <AddButton onClick={(e) => { e.stopPropagation(); onAddItem('ProcessStepFunction', step.id) }}>Add New Function</AddButton>
                                                    </Node>
                                                </div>

                                                <div className="flex flex-col space-y-4">
                                                    {step.functionIds.map(funcId => {
                                                        const func = data.processStepFunctions[funcId];
                                                        if (!func) return null;
                                                        return (
                                                            <div key={func.id} className="flex items-center space-x-12">
                                                                <div className="w-52 flex-shrink-0">
                                                                    <Node 
                                                                        ref={el => setNodeRef(func.id, el)} 
                                                                        title={func.name} 
                                                                        subtitle={func.productSpecificationTolerance} 
                                                                        color="bg-green-50 border-green-300" 
                                                                        onClick={() => onOpenModal({ type: 'ProcessStepFunction', parentId: step.id, data: func })} 
                                                                        onDelete={createDeleteHandler('ProcessStepFunction', func.id)}
                                                                        draggable
                                                                        onDragStart={(e) => handleDragStart(e, func.id, 'ProcessStepFunction')}
                                                                        onDragOver={(e) => handleDragOver(e, func.id, 'ProcessStepFunction')}
                                                                        onDragLeave={handleDragLeave}
                                                                        onDrop={(e) => handleDrop(e, func.id, 'ProcessStepFunction')}
                                                                        onDragEnd={handleDragEnd}
                                                                        isDropTargetBefore={draggedItem?.type === 'ProcessStepFunction' && dropTarget?.id === func.id && dropTarget.position === 'before'}
                                                                        isDropTargetAfter={draggedItem?.type === 'ProcessStepFunction' && dropTarget?.id === func.id && dropTarget.position === 'after'}
                                                                    >
                                                                        <AddButton onClick={(e) => { e.stopPropagation(); onAddItem('FailureMode', func.id) }}>Add New Failure Mode</AddButton>
                                                                    </Node>
                                                                </div>
                                                                
                                                                <div className="flex flex-col space-y-4">
                                                                    {func.failureModeIds.map(modeId => {
                                                                        const mode = data.failureModes[modeId];
                                                                        if (!mode) return null;
                                                                        
                                                                        const getEffectSubtitle = (eff: FailureEffect) => {
                                                                            const selectedPf = eff.selectedPFByType?.[eff.clientType || ''] || '—';
                                                                            return `S: ${eff.severity} | PF: ${selectedPf}`;
                                                                        }

                                                                        return (
                                                                            <div key={mode.id} className="flex flex-col items-start">
                                                                                <div className="flex items-center space-x-12">
                                                                                    <div className="w-52 flex-shrink-0">
                                                                                        <Node 
                                                                                            ref={el => setNodeRef(mode.id, el)} 
                                                                                            title={mode.description} 
                                                                                            color="bg-red-50 border-red-300" 
                                                                                            onClick={() => onOpenModal({ type: 'FailureMode', parentId: func.id, data: mode })} 
                                                                                            onDelete={createDeleteHandler('FailureMode', mode.id)}
                                                                                            draggable
                                                                                            onDragStart={(e) => handleDragStart(e, mode.id, 'FailureMode')}
                                                                                            onDragOver={(e) => handleDragOver(e, mode.id, 'FailureMode')}
                                                                                            onDragLeave={handleDragLeave}
                                                                                            onDrop={(e) => handleDrop(e, mode.id, 'FailureMode')}
                                                                                            onDragEnd={handleDragEnd}
                                                                                            isDropTargetBefore={draggedItem?.type === 'FailureMode' && dropTarget?.id === mode.id && dropTarget.position === 'before'}
                                                                                            isDropTargetAfter={draggedItem?.type === 'FailureMode' && dropTarget?.id === mode.id && dropTarget.position === 'after'}
                                                                                        >
                                                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                                                <AddButton onClick={(e) => { e.stopPropagation(); onAddItem('FailureEffect', mode.id, { functionId: func.id }) }}>Effect</AddButton>
                                                                                                <AddButton onClick={(e) => { e.stopPropagation(); onAddItem('FailureCause', mode.id, { functionId: func.id }) }}>Cause</AddButton>
                                                                                            </div>
                                                                                        </Node>
                                                                                    </div>

                                                                                    <div className="w-52 flex-shrink-0 flex flex-col space-y-2">
                                                                                        {(mode.effectIds || []).map(effectId => {
                                                                                            const effect = data.failureEffects[effectId];
                                                                                            if (!effect) return null;
                                                                                            return (
                                                                                                <Node 
                                                                                                    key={effect.id} 
                                                                                                    ref={el => setNodeRef(effect.id, el)} 
                                                                                                    title={effect.effectText} 
                                                                                                    subtitle={getEffectSubtitle(effect)} 
                                                                                                    color="bg-red-100 border-red-400" 
                                                                                                    onClick={() => onOpenModal({ type: 'FailureEffect', parentId: mode.id, functionId: func.id, data: effect })} 
                                                                                                    onDelete={createDeleteHandler('FailureEffect', effect.id)} 
                                                                                                    draggable 
                                                                                                    onDragStart={(e) => handleDragStart(e, effect.id, 'FailureEffect')}
                                                                                                    onDragOver={(e) => handleDragOver(e, effect.id, 'FailureEffect')}
                                                                                                    onDragLeave={handleDragLeave}
                                                                                                    onDrop={(e) => handleDrop(e, effect.id, 'FailureEffect')}
                                                                                                    onDragEnd={handleDragEnd}
                                                                                                    isDropTargetBefore={draggedItem?.type === 'FailureEffect' && dropTarget?.id === effect.id && dropTarget.position === 'before'}
                                                                                                    isDropTargetAfter={draggedItem?.type === 'FailureEffect' && dropTarget?.id === effect.id && dropTarget.position === 'after'}
                                                                                                />
                                                                                            );
                                                                                        })}
                                                                                        
                                                                                        {(mode.causeIds || []).map(causeId => {
                                                                                            const cause = data.failureCauses[causeId];
                                                                                            if (!cause) return null;

                                                                                            const effects = (mode.effectIds || [])
                                                                                                .map(id => data.failureEffects[id])
                                                                                                .filter(Boolean);

                                                                                            const highestSeverityEffect = effects.length > 0 
                                                                                                ? effects.reduce((max, current) => (current.severity || 0) > (max.severity || 0) ? current : max, effects[0])
                                                                                                : null;
                                                                                            
                                                                                            const derivedSeverity = highestSeverityEffect?.severity;
                                                                                            const isOverride = cause.severity !== undefined;
                                                                                            const displaySeverity = isOverride ? cause.severity : derivedSeverity;

                                                                                            const handleSeverityClick = (e: React.MouseEvent) => {
                                                                                                e.stopPropagation();
                                                                                                onOpenSeverityModal({
                                                                                                    targetType: 'cause',
                                                                                                    targetId: cause.id,
                                                                                                    field: 'severity',
                                                                                                    currentValue: displaySeverity,
                                                                                                });
                                                                                            };

                                                                                            const handleOccurrenceClick = (e: React.MouseEvent) => {
                                                                                                e.stopPropagation();
                                                                                                onOpenOccurrenceModal({
                                                                                                    targetId: cause.id,
                                                                                                    field: 'occurrence',
                                                                                                    currentValue: cause.occurrence
                                                                                                });
                                                                                            };

                                                                                            const handleDetectionClick = (e: React.MouseEvent) => {
                                                                                                e.stopPropagation();
                                                                                                onOpenDetectionModal({
                                                                                                    targetId: cause.id,
                                                                                                    field: 'detection',
                                                                                                    currentValue: cause.detection
                                                                                                });
                                                                                            };
                                                                                            
                                                                                            const severityTitle = isOverride
                                                                                                ? `Cause-specific severity: ${cause.severity}. Click to edit.`
                                                                                                : derivedSeverity
                                                                                                    ? `Severity inherited from effect: "${highestSeverityEffect?.effectText}". Click to set a cause-specific override.`
                                                                                                    : 'No effects defined. Click to set a cause-specific severity.';


                                                                                            return (
                                                                                                <Node 
                                                                                                    key={cause.id} 
                                                                                                    ref={el => setNodeRef(cause.id, el)} 
                                                                                                    title={cause.description}
                                                                                                    color="bg-yellow-50 border-yellow-300" 
                                                                                                    onClick={() => onOpenModal({ type: 'FailureCause', parentId: mode.id, functionId: func.id, data: cause })} 
                                                                                                    onDelete={createDeleteHandler('FailureCause', cause.id)} 
                                                                                                    draggable 
                                                                                                    onDragStart={(e) => handleDragStart(e, cause.id, 'FailureCause')}
                                                                                                    onDragOver={(e) => handleDragOver(e, cause.id, 'FailureCause')}
                                                                                                    onDragLeave={handleDragLeave}
                                                                                                    onDrop={(e) => handleDrop(e, cause.id, 'FailureCause')}
                                                                                                    onDragEnd={handleDragEnd}
                                                                                                    isDropTargetBefore={draggedItem?.type === 'FailureCause' && dropTarget?.id === cause.id && dropTarget.position === 'before'}
                                                                                                    isDropTargetAfter={draggedItem?.type === 'FailureCause' && dropTarget?.id === cause.id && dropTarget.position === 'after'}
                                                                                                >
                                                                                                    <>
                                                                                                        <div className="flex items-center justify-center text-xs text-gray-600 mt-1">
                                                                                                            <span>{cause.processWorkElement}</span>
                                                                                                        </div>
                                                                                                        <div className="text-xs text-gray-500 mt-1 flex justify-center space-x-2 divide-x divide-gray-300">
                                                                                                            <span
                                                                                                                onClick={handleSeverityClick}
                                                                                                                className="pl-2 cursor-pointer hover:text-blue-600 hover:font-bold"
                                                                                                                title={severityTitle}
                                                                                                            >
                                                                                                                S: {displaySeverity ?? '—'}
                                                                                                            </span>
                                                                                                            <span
                                                                                                                onClick={handleOccurrenceClick}
                                                                                                                className="px-2 cursor-pointer hover:text-blue-600 hover:font-bold"
                                                                                                                title="Click to edit Occurrence"
                                                                                                            >
                                                                                                                O: {cause.occurrence || '—'}
                                                                                                            </span>
                                                                                                            <span 
                                                                                                                onClick={handleDetectionClick}
                                                                                                                className="px-2 cursor-pointer hover:text-blue-600 hover:font-bold"
                                                                                                                title="Click to edit Detection"
                                                                                                            >
                                                                                                                D: {cause.detection || '—'}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    </>
                                                                                                </Node>
                                                                                            );
                                                                                        })}
                                                                                         {draggedItem?.type === 'FailureMode' && draggedItem.id === mode.id && (
                                                                                            <>
                                                                                                <CreationDropZone
                                                                                                    onDrop={(e) => handleCreateOnDrop(e, 'FailureEffect', mode.id, { functionId: func.id })}
                                                                                                    onDragOver={(e) => handleCreationDragOver(e, 'FailureEffect', mode.id)}
                                                                                                    onDragLeave={handleCreationDragLeave}
                                                                                                    isTarget={creationDropTarget?.type === 'FailureEffect' && creationDropTarget?.parentId === mode.id}
                                                                                                >
                                                                                                    + Drag to create Effect
                                                                                                </CreationDropZone>
                                                                                                <CreationDropZone
                                                                                                    onDrop={(e) => handleCreateOnDrop(e, 'FailureCause', mode.id, { functionId: func.id })}
                                                                                                    onDragOver={(e) => handleCreationDragOver(e, 'FailureCause', mode.id)}
                                                                                                    onDragLeave={handleCreationDragLeave}
                                                                                                    isTarget={creationDropTarget?.type === 'FailureCause' && creationDropTarget?.parentId === mode.id}
                                                                                                >
                                                                                                    + Drag to create Cause
                                                                                                </CreationDropZone>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                     {draggedItem?.type === 'ProcessStepFunction' && draggedItem.id === func.id && (
                                                                        <CreationDropZone
                                                                            onDrop={(e) => handleCreateOnDrop(e, 'FailureMode', func.id)}
                                                                            onDragOver={(e) => handleCreationDragOver(e, 'FailureMode', func.id)}
                                                                            onDragLeave={handleCreationDragLeave}
                                                                            isTarget={creationDropTarget?.type === 'FailureMode' && creationDropTarget?.parentId === func.id}
                                                                        >
                                                                            + Drag to create Failure Mode
                                                                        </CreationDropZone>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                     {draggedItem?.type === 'ProcessStep' && draggedItem.id === step.id && (
                                                        <CreationDropZone
                                                            onDrop={(e) => handleCreateOnDrop(e, 'ProcessStepFunction', step.id)}
                                                            onDragOver={(e) => handleCreationDragOver(e, 'ProcessStepFunction', step.id)}
                                                            onDragLeave={handleCreationDragLeave}
                                                            isTarget={creationDropTarget?.type === 'ProcessStepFunction' && creationDropTarget?.parentId === step.id}
                                                        >
                                                            + Drag to create Function
                                                        </CreationDropZone>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                     {draggedItem?.type === 'ProcessItem' && draggedItem.id === item.id && (
                                        <CreationDropZone
                                            onDrop={(e) => handleCreateOnDrop(e, 'ProcessStep', item.id)}
                                            onDragOver={(e) => handleCreationDragOver(e, 'ProcessStep', item.id)}
                                            onDragLeave={handleCreationDragLeave}
                                            isTarget={creationDropTarget?.type === 'ProcessStep' && creationDropTarget?.parentId === item.id}
                                        >
                                            + Drag to create Step
                                        </CreationDropZone>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                         <div className="flex justify-center items-center h-64 text-gray-500 italic">
                            No Process Items.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FmeaTreeView;