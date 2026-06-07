import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { FmeaData, FullProjectState, ProcessItem, ProcessStep, ProcessStepFunction, FailureMode, FailureEffect, FailureCause } from '../types';

type ItemType = 'ProcessItem' | 'ProcessStep' | 'ProcessStepFunction' | 'FailureMode' | 'FailureEffect' | 'FailureCause' | 'Group';

interface Hierarchy {
    parents: { [id: string]: string };
    children: { [id: string]: string[] };
}

const buildHierarchy = (data: FmeaData): Hierarchy => {
    const parents: { [id: string]: string } = {};
    const children: { [id: string]: string[] } = {};

    const addChild = (pId: string, cId: string) => {
        if (!children[pId]) children[pId] = [];
        if (!children[pId].includes(cId)) children[pId].push(cId);
        parents[cId] = pId;
    };
    
    // This function can be complex. Let's build a comprehensive one.
    (data.processItemIds || []).forEach(itemId => {
        const item = data.processItems[itemId];
        if (item) (item.stepIds || []).forEach(stepId => addChild(itemId, stepId));
    });
    Object.values(data.processSteps).forEach(step => {
        (step.functionIds || []).forEach(funcId => addChild(step.id, funcId));
    });
    Object.values(data.processStepFunctions).forEach(func => {
        (func.failureModeIds || []).forEach(modeId => {
            addChild(func.id, modeId);
            const mode = data.failureModes[modeId];
            if (mode) {
                 const wefGroupId = `${mode.id}-wef`;
                 const pfGroupId = `${mode.id}-pf`;
                 if ((mode.causeIds || []).length > 0) {
                     addChild(mode.id, wefGroupId);
                     mode.causeIds.forEach(causeId => addChild(wefGroupId, causeId));
                 }
                 if ((mode.effectIds || []).length > 0) {
                     addChild(mode.id, pfGroupId);
                     mode.effectIds.forEach(effectId => addChild(pfGroupId, effectId));
                 }
            }
        });
    });

    return { parents, children };
};


const getLabel = (type: ItemType, id: string, data: FmeaData): string => {
    switch(type) {
        case 'ProcessItem': return data.processItems[id]?.name || 'Unknown';
        case 'ProcessStep': return `[${data.processSteps[id]?.operationNumber}] ${data.processSteps[id]?.name || 'Unknown'}`;
        case 'ProcessStepFunction': return data.processStepFunctions[id]?.name || 'Unknown';
        case 'FailureMode': return data.failureModes[id]?.description || 'Unknown';
        case 'FailureEffect': const e = data.failureEffects[id]; return `[${e?.clientType || '?'}] ${e?.effectText || 'Unknown Effect'}`;
        case 'FailureCause': const c = data.failureCauses[id]; return `[${c?.processWorkElement || '?'}] ${c?.description || 'Unknown Cause'}`;
        case 'Group': return id.endsWith('-wef') ? 'Work Element Functions' : 'Process Functions';
        default: return 'Unknown';
    }
};

const getItemType = (id: string, data: FmeaData): ItemType => {
    if (data.processItems[id]) return 'ProcessItem';
    if (data.processSteps[id]) return 'ProcessStep';
    if (data.processStepFunctions[id]) return 'ProcessStepFunction';
    if (data.failureModes[id]) return 'FailureMode';
    if (data.failureEffects[id]) return 'FailureEffect';
    if (data.failureCauses[id]) return 'FailureCause';
    if (id.endsWith('-wef') || id.endsWith('-pf')) return 'Group';
    return 'ProcessItem'; // Fallback
};

interface TreeNodeProps {
    id: string;
    type: ItemType;
    data: FmeaData;
    hierarchy: Hierarchy;
    expandedIds: Set<string>;
    onToggleExpand: (id: string) => void;
    // For main tree
    selection?: {
        selectedIds: Set<string>;
        indeterminateIds: Set<string>;
    };
    onToggleSelect?: (id: string, type: ItemType) => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent, id: string, type: ItemType) => void;
    onDragOver?: (e: React.DragEvent, id: string, type: ItemType) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, id: string, type: ItemType) => void;
    onDragEnd?: (e: React.DragEvent) => void;
    dropIndicator?: 'before' | 'after' | 'on' | null;
    dropTarget?: {
        id: string;
        type: ItemType;
        position: 'before' | 'after' | 'on';
    } | null;
    // For modal tree
    isModal?: boolean;
    onClick?: (id: string, type: ItemType) => void;
    draggedItemTypeForModal?: ItemType | null;
    modalSelectedTargetId?: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({ 
    id, type, data, hierarchy, expandedIds, onToggleExpand,
    selection, onToggleSelect,
    draggable, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd, dropIndicator, dropTarget,
    isModal, onClick, draggedItemTypeForModal, modalSelectedTargetId
}) => {
    const { selectedIds, indeterminateIds } = selection || { selectedIds: new Set(), indeterminateIds: new Set() };
    const isSelected = selectedIds.has(id);
    const isIndeterminate = indeterminateIds.has(id);
    const isExpanded = expandedIds.has(id);
    const children = hierarchy.children[id] || [];
    const label = getLabel(type, id, data);

    const isValidTargetForModal = isModal && draggedItemTypeForModal ? isValidDropTarget(draggedItemTypeForModal, type) : false;
    const isSelectedTargetInModal = isModal && modalSelectedTargetId === id;

    const nodeContent = (
        <div className="flex items-center space-x-2 py-1">
            <div className="w-6 text-center">
                {children.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); onToggleExpand(id); }} className="text-gray-500 hover:text-black">
                        {isExpanded ? '−' : '+'}
                    </button>
                )}
            </div>
            {!isModal && onToggleSelect && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    ref={el => el && (el.indeterminate = isIndeterminate)}
                    onChange={() => onToggleSelect(id, type)}
                    onClick={(e) => e.stopPropagation()}
                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
            )}
            <span className={`${isSelected ? 'font-semibold text-blue-700' : ''} ${isModal ? 'cursor-pointer' : ''} ${isSelectedTargetInModal ? 'font-bold' : ''}`}>{label}</span>
        </div>
    );

    return (
        <li className="relative">
            {dropIndicator === 'before' && <div className="absolute -top-0.5 left-0 right-0 h-2.5 bg-green-500 rounded-full z-20" />}
            <div 
                className={`rounded transition-colors border-2 ${
                    isModal ? `
                        border-transparent
                        ${isSelectedTargetInModal ? 'bg-blue-600 text-white' : ''}
                        ${isValidTargetForModal ? (isSelectedTargetInModal ? '' : 'hover:bg-blue-200') : 'text-gray-400'}
                    ` : 
                    `${dropIndicator === 'on' ? 'bg-blue-200 border-blue-400' : 'border-transparent'}`
                }`}
                draggable={draggable}
                onClick={isModal && onClick && isValidTargetForModal ? () => onClick(id, type) : undefined}
                onDragStart={draggable && onDragStart ? (e) => onDragStart(e, id, type) : undefined}
                onDragOver={draggable && onDragOver ? (e) => onDragOver(e, id, type) : undefined}
                onDragLeave={draggable && onDragLeave ? onDragLeave : undefined}
                onDrop={draggable && onDrop ? (e) => onDrop(e, id, type) : undefined}
                onDragEnd={draggable && onDragEnd ? onDragEnd : undefined}
            >
                {nodeContent}
            </div>
            {isExpanded && children.length > 0 && (
                <ul className="pl-6 border-l ml-3">
                    {children.map((childId) => {
                        const childType = getItemType(childId, data);
                        return (
                            <TreeNode
                                key={childId}
                                id={childId}
                                type={childType}
                                data={data}
                                hierarchy={hierarchy}
                                expandedIds={expandedIds}
                                onToggleExpand={onToggleExpand}
                                selection={selection}
                                onToggleSelect={onToggleSelect}
                                draggable={draggable}
                                onDragStart={onDragStart}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onDrop={onDrop}
                                onDragEnd={onDragEnd}
                                dropTarget={dropTarget}
                                dropIndicator={dropTarget?.id === childId ? dropTarget.position : null}
                                isModal={isModal}
                                onClick={onClick}
                                draggedItemTypeForModal={draggedItemTypeForModal}
                                modalSelectedTargetId={modalSelectedTargetId}
                            />
                        );
                    })}
                </ul>
            )}
            {dropIndicator === 'after' && <div className="absolute -bottom-0.5 left-0 right-0 h-2.5 bg-green-500 rounded-full z-20" />}
        </li>
    );
};

interface ProjectConfigurationViewProps {
    data: FmeaData;
    projects: FullProjectState[];
    onDataUpdate: (data: FmeaData) => void;
    onCopyToProject: (items: any, targetProjectId: string, targetParentId: string) => Promise<boolean>;
}

export const ProjectConfigurationView: React.FC<ProjectConfigurationViewProps> = ({ data, projects, onDataUpdate, onCopyToProject }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [indeterminateIds, setIndeterminateIds] = useState<Set<string>>(new Set());
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    
    const [draggedItem, setDraggedItem] = useState<{ id: string, type: ItemType } | null>(null);
    const [dropTarget, setDropTarget] = useState<{ id: string, type: ItemType, position: 'before' | 'after' | 'on' } | null>(null);
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState<'selectProject' | 'selectTarget'>('selectProject');
    const [modalTargetProjectId, setModalTargetProjectId] = useState<string | null>(null);
    const [modalTargetParentId, setModalTargetParentId] = useState<string | null>(null);
    const [modalExpandedIds, setModalExpandedIds] = useState<Set<string>>(new Set());

    const hierarchy = useMemo(() => buildHierarchy(data), [data]);
    
    const modalTargetProject = useMemo(() => projects.find(p => p.id === modalTargetProjectId), [modalTargetProjectId, projects]);
    const modalTargetHierarchy = useMemo(() => modalTargetProject ? buildHierarchy(modalTargetProject.fmeaData) : null, [modalTargetProject]);

    const topLevelSelectedType = useMemo(() => {
        const topLevelIds = [...selectedIds].filter(id => !selectedIds.has(hierarchy.parents[id]));
        if (topLevelIds.length === 0) return null;
        const types = new Set(topLevelIds.map(id => getItemType(id, data)));
        // Allow copy only if all top-level selected items are of the same type
        return types.size === 1 ? Array.from(types)[0] : null;
    }, [selectedIds, hierarchy.parents, data]);


    const getAllDescendants = useCallback((startId: string, h: Hierarchy): string[] => {
        const descendants: string[] = [];
        const queue = [...(h.children[startId] || [])];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            descendants.push(currentId);
            const children = h.children[currentId] || [];
            queue.push(...children);
        }
        return descendants;
    }, []);
    
    useEffect(() => {
        const firstLevelIds = data.processItemIds.filter(id => data.processItems[id]);
        setExpandedIds(new Set(firstLevelIds));
    }, [data.processItemIds, data.processItems]);

    const handleToggleExpand = (id: string, isModal = false) => {
        const stateSetter = isModal ? setModalExpandedIds : setExpandedIds;
        stateSetter(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleExpandAll = () => {
        const allParentIds = Object.keys(hierarchy.children);
        setExpandedIds(new Set(allParentIds));
    };

    const handleCollapseAll = () => {
        setExpandedIds(new Set());
    };

    const handleToggleSelect = useCallback((id: string) => {
        setSelectedIds(prevSelected => {
            const newSelected = new Set(prevSelected);
            const isSelected = newSelected.has(id);
            const descendants = [id, ...getAllDescendants(id, hierarchy)];
            
            if (isSelected) {
                descendants.forEach(dId => newSelected.delete(dId));
            } else {
                descendants.forEach(dId => newSelected.add(dId));
            }
            return newSelected;
        });
    }, [getAllDescendants, hierarchy]);

    useEffect(() => {
        const newIndeterminate = new Set<string>();
        const processedParents = new Set<string>();
    
        const updateParentState = (childId: string): void => {
            const parentId = hierarchy.parents[childId];
            if (!parentId || processedParents.has(parentId)) return;
    
            const siblings = hierarchy.children[parentId] || [];
            if (siblings.length === 0) return;
    
            const selectedSiblingsCount = siblings.filter(id => selectedIds.has(id)).length;
            const indeterminateSiblingsCount = siblings.filter(id => newIndeterminate.has(id)).length;
    
            if (selectedSiblingsCount === siblings.length) {
                // All children selected -> parent selected
                if (!selectedIds.has(parentId)) {
                     setSelectedIds(prev => new Set(prev).add(parentId));
                }
                newIndeterminate.delete(parentId);
            } else if (selectedSiblingsCount > 0 || indeterminateSiblingsCount > 0) {
                // Some children selected/indeterminate -> parent indeterminate
                 if (selectedIds.has(parentId)) {
                    setSelectedIds(prev => { const s = new Set(prev); s.delete(parentId); return s; });
                }
                newIndeterminate.add(parentId);
            } else {
                // No children selected -> parent unselected
                if (selectedIds.has(parentId)) {
                    setSelectedIds(prev => { const s = new Set(prev); s.delete(parentId); return s; });
                }
                newIndeterminate.delete(parentId);
            }
    
            processedParents.add(parentId);
            updateParentState(parentId);
        };
    
        const leafNodes = Object.keys(hierarchy.parents).filter(id => !hierarchy.children[id]);
        leafNodes.forEach(updateParentState);
        
        // Handle root items
        data.processItemIds.forEach(id => {
            if (!hierarchy.parents[id]) {
                 updateParentState(id);
            }
        });
    
        setIndeterminateIds(newIndeterminate);
    }, [selectedIds, hierarchy.parents, hierarchy.children, data.processItemIds]);

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        const dataItemsToDelete = [...selectedIds].filter(id => !id.endsWith('-wef') && !id.endsWith('-pf'));
        const topLevelItemsToDelete = dataItemsToDelete.filter(id => !selectedIds.has(hierarchy.parents[id]));

        if (topLevelItemsToDelete.length > 0 && window.confirm(`Are you sure you want to delete the selected items and all their sub-items? This action cannot be undone.`)) {
            let newData: FmeaData = JSON.parse(JSON.stringify(data));
            
            topLevelItemsToDelete.forEach(id => {
                const type = getItemType(id, newData);
                newData = deleteItemAndChildren(id, type, newData);
            });
            onDataUpdate(newData);
            setSelectedIds(new Set());
        }
    };
    
    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, id: string, type: ItemType) => {
        e.dataTransfer.effectAllowed = 'all';
        setDraggedItem({ id, type });
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDropTarget(null);
    };
    
    const handleDragLeave = () => {
        setDropTarget(null);
    };

    const handleDragOver = (e: React.DragEvent, targetId: string, targetType: ItemType) => {
        e.preventDefault();
        if (!draggedItem) return;
        
        if (draggedItem.id === targetId || getAllDescendants(draggedItem.id, hierarchy).includes(targetId)) {
            setDropTarget(null);
            return;
        }

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const dropZoneHeight = rect.height;
        const relativeY = e.clientY - rect.top;
        
        const isReorder = draggedItem.type === targetType && hierarchy.parents[draggedItem.id] === hierarchy.parents[targetId];
        
        if (isReorder) {
            const position = relativeY < dropZoneHeight / 2 ? 'before' : 'after';
            setDropTarget({ id: targetId, type: targetType, position });
        } else if (isValidDropTarget(draggedItem.type, targetType)) {
             setDropTarget({ id: targetId, type: targetType, position: 'on' });
        } else {
            setDropTarget(null);
        }
    };
    
    const handleDrop = (e: React.DragEvent, targetId: string, targetType: ItemType) => {
        e.preventDefault();
        e.stopPropagation();

        if (!draggedItem || !dropTarget || dropTarget.id !== targetId) {
            handleDragEnd();
            return;
        }

        const isCopy = e.ctrlKey || e.altKey;
        const newData = performDropOperation(data, draggedItem, dropTarget, isCopy);

        if (newData) {
            onDataUpdate(newData);
        }

        handleDragEnd();
    };
    
    // --- Modal Handlers ---
    const handleOpenModal = () => {
        if (selectedIds.size === 0) {
            alert("Please select items to copy.");
            return;
        }
        if (!topLevelSelectedType) {
            alert("Copying items of different types at the same time is not supported. Please select items of the same type.");
            return;
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalStep('selectProject');
        setModalTargetProjectId(null);
        setModalTargetParentId(null);
        setModalExpandedIds(new Set());
    };

    const handleProjectSelectInModal = (projectId: string) => {
        setModalTargetProjectId(projectId);
        setModalStep('selectTarget');
    };
    
    const handleConfirmCopy = async () => {
         const topLevelItems = [...selectedIds].filter(id => !selectedIds.has(hierarchy.parents[id]));
        if (!modalTargetProjectId || !modalTargetParentId || topLevelItems.length === 0) return;

        const itemsToCopy: { [key: string]: any[] } & { topLevelItems: { id: string; type: string }[] } = {
            processItems: [], processSteps: [], processStepFunctions: [],
            failureModes: [], failureEffects: [], failureCauses: [],
            topLevelItems: []
        };

        topLevelItems.forEach(id => {
            const type = getItemType(id, data);
            // This is a complex operation that needs a robust deepCopy function
            const { copiedData, newTopLevelId } = deepCopyHierarchy(id, type, data);
            
            Object.keys(copiedData).forEach(key => {
                const pluralKey = key as keyof FmeaData;
                const items = Object.values((copiedData as any)[pluralKey]);
                (itemsToCopy as any)[pluralKey].push(...items);
            });

            itemsToCopy.topLevelItems.push({ id: newTopLevelId, type: type });
        });

        const success = await onCopyToProject(itemsToCopy, modalTargetProjectId, modalTargetParentId);
        if (success) {
            handleCloseModal();
        }
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-lg h-full flex flex-col font-sans">
            <h2 className="text-xl font-bold mb-2 text-gray-700">Project configurations</h2>
            <div className="border-b mb-2 pb-2 flex items-center space-x-2">
                 <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed bg-red-50 hover:bg-red-100 text-red-700 border-red-200">Delete</button>
                 <button onClick={handleOpenModal} disabled={selectedIds.size === 0} className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-gray-200">Copy to project...</button>
                 <button onClick={handleExpandAll} className="px-3 py-1 text-sm border rounded bg-gray-100 hover:bg-gray-200">Expand All</button>
                 <button onClick={handleCollapseAll} className="px-3 py-1 text-sm border rounded bg-gray-100 hover:bg-gray-200">Collapse All</button>
            </div>
            <div className="flex-grow overflow-auto">
                 <ul className="space-y-1">
                    {data.processItemIds.map((itemId) => (
                        <TreeNode
                            key={itemId}
                            id={itemId}
                            type="ProcessItem"
                            data={data}
                            hierarchy={hierarchy}
                            selection={{ selectedIds, indeterminateIds }}
                            expandedIds={expandedIds}
                            onToggleSelect={handleToggleSelect}
                            onToggleExpand={handleToggleExpand}
                            draggable={true}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            dropTarget={dropTarget}
                            dropIndicator={dropTarget?.id === itemId ? dropTarget.position : null}
                        />
                    ))}
                </ul>
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={handleCloseModal}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-3">Copy to Project</h3>
                        
                        {modalStep === 'selectProject' && (
                            <div>
                                <h4 className="text-md font-medium mb-2">1. Select destination project</h4>
                                <ul className="border rounded-md h-64 overflow-y-auto">
                                    {projects.map(p => (
                                        <li key={p.id} onClick={() => handleProjectSelectInModal(p.id)} className="p-2 hover:bg-blue-100 cursor-pointer border-b">
                                            {p.projectData.fmea.project} ({p.projectData.fmea.projectId})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {modalStep === 'selectTarget' && modalTargetProject && modalTargetHierarchy && (
                             <div>
                                <h4 className="text-md font-medium mb-2">2. Select destination parent item in '{modalTargetProject.projectData.fmea.project}'</h4>
                                <div className="border rounded-md h-96 overflow-y-auto p-2">
                                     <ul>
                                        {modalTargetProject.fmeaData.processItemIds.map(itemId => (
                                            <TreeNode
                                                key={itemId}
                                                id={itemId}
                                                type={"ProcessItem"}
                                                data={modalTargetProject.fmeaData}
                                                hierarchy={modalTargetHierarchy}
                                                expandedIds={modalExpandedIds}
                                                onToggleExpand={(id) => handleToggleExpand(id, true)}
                                                isModal={true}
                                                onClick={(id, type) => setModalTargetParentId(id)}
                                                draggedItemTypeForModal={topLevelSelectedType}
                                                modalSelectedTargetId={modalTargetParentId}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        
                        <div className="flex justify-end items-center mt-4 pt-4 border-t space-x-2">
                             {modalStep === 'selectTarget' && (
                                <button onClick={() => { setModalStep('selectProject'); setModalTargetParentId(null); }} className="px-4 py-2 bg-gray-200 rounded-md text-sm">Back</button>
                             )}
                            <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded-md text-sm">Cancel</button>
                            <button 
                                onClick={handleConfirmCopy}
                                disabled={!modalTargetParentId}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm disabled:bg-gray-400"
                            >
                                Copy Here
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Drag and Drop Data Logic ---

function isValidDropTarget(draggedType: ItemType, targetType: ItemType): boolean {
    const validParents: { [key in ItemType]?: ItemType[] } = {
        'ProcessStep': ['ProcessItem'],
        'ProcessStepFunction': ['ProcessStep'],
        'FailureMode': ['ProcessStepFunction'],
        'FailureEffect': ['Group', 'FailureMode'], // Group ID ends in -pf
        'FailureCause': ['Group', 'FailureMode'], // Group ID ends in -wef
    };

    if (draggedType === 'FailureEffect' && targetType === 'Group' && targetType.endsWith('-pf')) return true;
    if (draggedType === 'FailureCause' && targetType === 'Group' && targetType.endsWith('-wef')) return true;

    return validParents[draggedType]?.includes(targetType) ?? false;
}

function performDropOperation(
    data: FmeaData, 
    dragged: { id: string, type: ItemType }, 
    target: { id: string, type: ItemType, position: 'before' | 'after' | 'on' },
    isCopy: boolean
): FmeaData | null {
    let newData: FmeaData = JSON.parse(JSON.stringify(data));
    const hierarchy = buildHierarchy(newData);
    
    let { id: draggedId, type: draggedType } = dragged;
    
    if (isCopy) {
        const { copiedData, newTopLevelId } = deepCopyHierarchy(dragged.id, dragged.type, newData);
        Object.keys(copiedData).forEach(key => {
            const typedKey = key as keyof FmeaData;
            Object.assign((newData as any)[typedKey], (copiedData as any)[typedKey]);
        });
        draggedId = newTopLevelId;
    } else {
        const oldParentId = hierarchy.parents[draggedId];
        if (oldParentId) {
            let oldEffectiveParentId = oldParentId;
            let oldEffectiveParentType = getItemType(oldParentId, newData);
            if (oldEffectiveParentType === 'Group') {
                oldEffectiveParentId = hierarchy.parents[oldParentId];
                oldEffectiveParentType = getItemType(oldEffectiveParentId, newData);
            }
            const parentObject = (newData as any)[pluralize(oldEffectiveParentType)][oldEffectiveParentId];
            const childArrayKey = getChildArrayKeyForChild(draggedType, oldEffectiveParentType);
            if (parentObject && childArrayKey && parentObject[childArrayKey]) {
                parentObject[childArrayKey] = parentObject[childArrayKey].filter((id: string) => id !== draggedId);
            }
        } else if (draggedType === 'ProcessItem') {
            newData.processItemIds = newData.processItemIds.filter(id => id !== draggedId);
        }
    }

    if (target.position === 'on') {
        let newParentId = target.id;
        let newParentType = target.type;
        if (newParentType === 'Group') {
            newParentId = hierarchy.parents[target.id]; // The FailureMode
            newParentType = getItemType(newParentId, newData); // FailureMode
        }
        const targetObject = (newData as any)[pluralize(newParentType)][newParentId];
        const childArrayKey = getChildArrayKeyForChild(draggedType, newParentType);
        if (targetObject && childArrayKey) {
            if (!targetObject[childArrayKey]) targetObject[childArrayKey] = [];
            targetObject[childArrayKey].push(draggedId);
        } else return null;
    } else {
        const targetParentId = hierarchy.parents[target.id];
        if (targetParentId) {
            let effectiveTargetParentId = targetParentId;
            let parentType = getItemType(targetParentId, newData);
            if (parentType === 'Group') {
                effectiveTargetParentId = hierarchy.parents[targetParentId];
                parentType = getItemType(effectiveTargetParentId, newData);
            }
            const parentObject = (newData as any)[pluralize(parentType)][effectiveTargetParentId];
            const childArrayKey = getChildArrayKey(parentType);
            if (childArrayKey) {
                const siblings = parentObject[childArrayKey];
                const targetIndex = siblings.indexOf(target.id);
                siblings.splice(target.position === 'before' ? targetIndex : targetIndex + 1, 0, draggedId);
            }
        } else if (draggedType === 'ProcessItem') {
            const targetIndex = newData.processItemIds.indexOf(target.id);
            newData.processItemIds.splice(target.position === 'before' ? targetIndex : targetIndex + 1, 0, draggedId);
        }
    }

    return newData;
}

function deleteItemAndChildren(itemId: string, itemType: ItemType, data: FmeaData): FmeaData {
    const newData: FmeaData = JSON.parse(JSON.stringify(data));
    const hierarchy = buildHierarchy(newData);
    const idsToDelete = [itemId, ...getAllDescendants(itemId, hierarchy, data)];
    const itemsToDeleteByType: { [key in ItemType]?: Set<string> } = {};

    idsToDelete.forEach(id => {
        const type = getItemType(id, newData);
        if (!itemsToDeleteByType[type]) itemsToDeleteByType[type] = new Set();
        itemsToDeleteByType[type]!.add(id);
    });

    (Object.keys(itemsToDeleteByType) as ItemType[]).forEach(type => {
        if (type === 'Group') return;
        const pluralKey = pluralize(type);
        const set = itemsToDeleteByType[type]!;
        set.forEach(id => { delete (newData as any)[pluralKey][id]; });
    });
    
    if (itemsToDeleteByType.ProcessItem) {
        newData.processItemIds = newData.processItemIds.filter(id => !itemsToDeleteByType.ProcessItem!.has(id));
    }

    Object.values(newData.processItems).forEach(p => { if (p.stepIds) p.stepIds = p.stepIds.filter(id => !itemsToDeleteByType.ProcessStep?.has(id)); });
    Object.values(newData.processSteps).forEach(p => { if (p.functionIds) p.functionIds = p.functionIds.filter(id => !itemsToDeleteByType.ProcessStepFunction?.has(id)); });
    Object.values(newData.processStepFunctions).forEach(p => { if (p.failureModeIds) p.failureModeIds = p.failureModeIds.filter(id => !itemsToDeleteByType.FailureMode?.has(id)); });
    Object.values(newData.failureModes).forEach(p => {
        if (p.effectIds) p.effectIds = p.effectIds.filter(id => !itemsToDeleteByType.FailureEffect?.has(id));
        if (p.causeIds) p.causeIds = p.causeIds.filter(id => !itemsToDeleteByType.FailureCause?.has(id));
    });
    
    return newData;
}

function getAllDescendants(startId: string, h: Hierarchy, data: FmeaData): string[] {
    const descendants: string[] = [];
    const queue: string[] = [...(h.children[startId] || [])];
    while(queue.length > 0) {
        const currentId = queue.shift()!;
        descendants.push(currentId);
        const children = h.children[currentId] || [];
        queue.push(...children);
    }
    return descendants;
}

function deepCopyHierarchy(startId: string, startType: ItemType, data: FmeaData) {
    const copiedData: Partial<FmeaData> = { processItems: {}, processSteps: {}, processStepFunctions: {}, failureModes: {}, failureEffects: {}, failureCauses: {} };
    const idMap = new Map<string, string>();
    
    function copy(id: string, type: ItemType): string {
        if (idMap.has(id)) return idMap.get(id)!;
        if (type === 'Group') {
            const newId = `${copy(id.replace(/-wef|-pf/, ''), 'FailureMode')}${id.endsWith('-wef') ? '-wef' : '-pf'}`;
            idMap.set(id, newId);
            return newId;
        }

        const newId = `${getPrefix(type)}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        idMap.set(id, newId);

        const originalItem = (data as any)[pluralize(type)][id];
        if (!originalItem) return newId;

        const newItem = JSON.parse(JSON.stringify(originalItem));
        newItem.id = newId;

        const hierarchy = buildHierarchy(data); // Rebuild for this context
        const children = hierarchy.children[id] || [];
        children.forEach(childId => {
            const childType = getItemType(childId, data);
            const newChildId = copy(childId, childType);
            const childArrayKey = getChildArrayKeyForChild(childType, type);
            if(childArrayKey && newItem[childArrayKey]){
                const index = newItem[childArrayKey].indexOf(childId);
                if(index > -1) newItem[childArrayKey][index] = newChildId;
            }
        });
        
        (copiedData as any)[pluralize(type)][newId] = newItem;
        return newId;
    }

    const newTopLevelId = copy(startId, startType);
    return { copiedData, newTopLevelId };
}

function pluralize(type: ItemType): keyof Omit<FmeaData, 'processItemIds'> {
    const map: Record<ItemType, keyof Omit<FmeaData, 'processItemIds'>> = {
        'ProcessItem': 'processItems', 'ProcessStep': 'processSteps', 'ProcessStepFunction': 'processStepFunctions',
        'FailureMode': 'failureModes', 'FailureEffect': 'failureEffects', 'FailureCause': 'failureCauses',
        'Group': 'failureModes' // Placeholder
    };
    return map[type];
}

function getPrefix(type: ItemType): string {
     const map: Record<ItemType, string> = {
        'ProcessItem': 'pi', 'ProcessStep': 'ps', 'ProcessStepFunction': 'psf',
        'FailureMode': 'fm', 'FailureEffect': 'fe', 'FailureCause': 'fc',
        'Group': 'grp'
    };
    return map[type];
}

function getChildArrayKey(parentType: ItemType): 'stepIds' | 'functionIds' | 'failureModeIds' | null {
    const map: Partial<Record<ItemType, 'stepIds' | 'functionIds' | 'failureModeIds'>> = {
        'ProcessItem': 'stepIds', 'ProcessStep': 'functionIds', 'ProcessStepFunction': 'failureModeIds'
    };
    return map[parentType] || null;
}

function getChildArrayKeyForChild(childType: ItemType, parentType: ItemType): 'stepIds' | 'functionIds' | 'failureModeIds' | 'causeIds' | 'effectIds' | null {
    if (parentType === 'ProcessItem' && childType === 'ProcessStep') return 'stepIds';
    if (parentType === 'ProcessStep' && childType === 'ProcessStepFunction') return 'functionIds';
    if (parentType === 'ProcessStepFunction' && childType === 'FailureMode') return 'failureModeIds';
    if (parentType === 'FailureMode' && childType === 'FailureCause') return 'causeIds';
    if (parentType === 'FailureMode' && childType === 'FailureEffect') return 'effectIds';
    if (parentType === 'Group' && childType === 'FailureCause' && parentType.endsWith('-wef')) return 'causeIds';
    if (parentType === 'Group' && childType === 'FailureEffect' && parentType.endsWith('-pf')) return 'effectIds';
    return null;
}