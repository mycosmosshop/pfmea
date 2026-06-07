import React, { useMemo, useState } from 'react';
import type { FmeaData, FmeaAction, FailureCause } from '../types';

// Declare global variables for CDN scripts
declare const XLSX: any;
declare const jspdf: any;

interface TaskManagerModalProps {
    allData: FmeaData;
    onClose: () => void;
    onSelect?: (action: FmeaAction) => void;
    onDataUpdate?: (updatedData: FmeaData) => void;
}

export const TaskManagerModal: React.FC<TaskManagerModalProps> = ({ allData, onClose, onSelect, onDataUpdate }) => {
    const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

    const isManagementMode = !!onDataUpdate;

    const allActions = useMemo(() => {
        const actions: FmeaAction[] = [];
        Object.values(allData.failureCauses).forEach((cause: FailureCause) => {
            if (cause.actions) {
                actions.push(...cause.actions);
            }
        });
        return actions;
    }, [allData]);

    const handleRowClick = (action: FmeaAction) => {
        if (isManagementMode) {
            setSelectedActionId(prev => prev === action.id ? null : action.id);
        }
    };

    const handleRowDoubleClick = (action: FmeaAction) => {
        if (onSelect) {
            onSelect(action);
        }
    };

    const handleRemove = () => {
        if (onDataUpdate && selectedActionId) {
            if (window.confirm("Are you sure you want to remove the selected action?")) {
                const newData = JSON.parse(JSON.stringify(allData));
                let found = false;
                for (const causeId in newData.failureCauses) {
                    const cause = newData.failureCauses[causeId];
                    const actionIndex = (cause.actions || []).findIndex(a => a.id === selectedActionId);
                    if (actionIndex > -1) {
                        cause.actions.splice(actionIndex, 1);
                        found = true;
                        break;
                    }
                }
                if (found) {
                    onDataUpdate(newData);
                }
                setSelectedActionId(null);
            }
        }
    };

    const handleRemoveUnused = () => {
        if (onDataUpdate) {
            if (window.confirm("Are you sure you want to remove all actions that have no description? This cannot be undone.")) {
                const newData = JSON.parse(JSON.stringify(allData));
                for (const causeId in newData.failureCauses) {
                    const cause = newData.failureCauses[causeId];
                    if (cause.actions) {
                        cause.actions = cause.actions.filter(a => a.description && a.description.trim() !== '');
                    }
                }
                onDataUpdate(newData);
            }
        }
    };

    const handleExportExcel = () => {
        const dataToExport = allActions.map(action => ({
            'Action type': action.type === 'prevention' ? 'Prevention Action' : 'Detection Action',
            'Recommended Actions': action.description,
            'Name': action.responsiblePerson,
            'Position': '', // No data for this
            'Department': '', // No data for this
            'Target Completion Date': action.targetCompletionDate,
            'Status': action.status,
            'Completion Date': action.completionDate,
            'Action Taken': action.actionTaken,
            'Number': action.number ?? '',
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tasks");
        XLSX.writeFile(wb, "TaskManager_Export.xlsx");
    };

    const handleExportPdf = () => {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });

        const headers = [
            "Action type", "Recommended Actions", "Name", "Position", "Department",
            "Target Completion", "Status", "Completion Date", "Action Taken", "Number"
        ];

        const body = allActions.map(action => [
            action.type === 'prevention' ? 'Prevention Action' : 'Detection Action',
            action.description || '',
            action.responsiblePerson || '',
            '', // Position
            '', // Department
            action.targetCompletionDate || '',
            action.status || '',
            action.completionDate || '',
            action.actionTaken || '',
            action.number ?? '',
        ]);

        (doc as any).autoTable({
            head: [headers],
            body: body,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [23, 54, 93] },
            didDrawPage: (data: any) => {
                doc.setFontSize(18);
                doc.text("Task Manager Export", data.settings.margin.left, 30);
            }
        });
        
        doc.save('TaskManager_Export.pdf');
    };


    const thClass = "px-4 py-2 text-left text-xs font-medium text-gray-800 uppercase tracking-wider bg-gray-200 border-b border-l border-gray-300";
    const tdClass = "px-4 py-2 whitespace-nowrap text-sm text-gray-700 border-b border-l border-gray-200";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[70] flex justify-center items-center p-4">
            <div className="bg-gray-200 rounded-sm shadow-xl w-full max-w-7xl h-[90vh] p-0 flex flex-col font-sans border-t-2 border-l-2 border-r-2 border-blue-500" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center bg-gray-300 px-2 py-1 border-b border-gray-400">
                    <div className="flex items-center space-x-2">
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACYSURBVDhPzZELCsAgCEN/0p/0J/1S/pP+zYliQ1Z96IMgCHBlg84WCCgUBwim7g1cCTyAJoRxD0Clna8A8Bl4Ase4iAEwAnfAAlx8AJAo0sbmG/Bv4ACwI5INsAasgU8yQXgCq7ACE7CKnCILsE4sgF4yRjgEHwDq9/TxA3Yf0c8sA4g7zzwA3gN3QSkYBCyAOtM2rjbz4wAAAABJRU5ErkJggg==" alt="FMEA logo" className="h-4 w-4" />
                        <h3 className="text-sm font-semibold text-gray-800">Task manager</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-800 p-1 bg-gray-200 border border-gray-400 rounded-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="bg-white px-4 pt-0 pb-4 flex-grow flex flex-col">
                    <div className="w-full py-3 bg-gradient-to-b from-yellow-50 to-yellow-200 border-b-2 border-yellow-400 flex items-center justify-center mb-4 -mx-4">
                        <h2 className="text-2xl font-bold text-blue-800">Task manager</h2>
                    </div>
                    
                    <div className="flex justify-end space-x-2 mb-2">
                        <button onClick={handleExportExcel} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">Export</button>
                        <button disabled className="px-3 py-1 text-sm border rounded bg-gray-200 border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">Import</button>
                    </div>

                    <div className="overflow-auto flex-grow border border-gray-400 bg-white">
                        <table className="min-w-full">
                            <thead className="sticky top-0">
                                <tr>
                                    <th className={thClass}>Action type</th>
                                    <th className={thClass}>Recommended Actions</th>
                                    <th className={thClass}>Name</th>
                                    <th className={thClass}>Position</th>
                                    <th className={thClass}>Department</th>
                                    <th className={thClass}>Target Completion...</th>
                                    <th className={thClass}>Status</th>
                                    <th className={thClass}>Completion Date</th>
                                    <th className={thClass}>Action Taken</th>
                                    <th className={thClass}>Number</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allActions.map((action, index) => (
                                    <tr 
                                        key={action.id + '_' + index} 
                                        onClick={() => handleRowClick(action)}
                                        onDoubleClick={() => handleRowDoubleClick(action)} 
                                        className={`cursor-pointer even:bg-white odd:bg-gray-50 ${selectedActionId === action.id ? 'bg-blue-200' : 'hover:bg-blue-100'}`}
                                    >
                                        <td className={tdClass}>{action.type === 'prevention' ? 'Prevention Action' : 'Detection Action'}</td>
                                        <td className={tdClass}>{action.description}</td>
                                        <td className={tdClass}>{action.responsiblePerson}</td>
                                        <td className={tdClass}></td> {/* Position - no data for this */}
                                        <td className={tdClass}></td> {/* Department - no data for this */}
                                        <td className={tdClass}>{action.targetCompletionDate}</td>
                                        <td className={tdClass}>{action.status}</td>
                                        <td className={tdClass}>{action.completionDate}</td>
                                        <td className={tdClass}>{action.actionTaken}</td>
                                        <td className={tdClass}>{action.number ?? ''}</td>
                                    </tr>
                                ))}
                                {allActions.length === 0 && (
                                    <tr><td colSpan={10} className="text-center py-4 text-gray-500">No actions found in project.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex items-center justify-center p-3 bg-gray-200 border-t border-gray-300 space-x-2">
                    <button onClick={handleRemoveUnused} disabled={!isManagementMode} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">Remove all unused</button>
                    <button onClick={handleRemove} disabled={!isManagementMode || !selectedActionId} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">Remove</button>
                    <button onClick={onClose} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">Close</button>
                    <button onClick={handleExportPdf} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">PDF Export</button>
                </div>
            </div>
        </div>
    );
};