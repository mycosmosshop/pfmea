import React, { useState, useEffect } from 'react';
import type { FmeaAction, RegistryData, FmeaData } from '../types';
import { TaskManagerModal } from './TaskManagerModal';

interface PreventionDetectionActionModalProps {
    action: FmeaAction;
    isNew: boolean;
    onSave: (action: FmeaAction) => void;
    onClose: () => void;
    registryData?: RegistryData;
    onUpdateRegistry?: (action: { type: string; payload: any }) => void;
    allData: FmeaData;
    onOpenRegistry: () => void;
}

const LabeledInput: React.FC<{ label: string; children: React.ReactNode; }> = ({ label, children }) => (
    <div className="grid grid-cols-3 gap-4 items-center">
        <label className="text-sm font-medium text-gray-700 text-right">{label}:</label>
        <div className="col-span-2">
            {children}
        </div>
    </div>
);

export const PreventionDetectionActionModal: React.FC<PreventionDetectionActionModalProps> = ({
    action, isNew, onSave, onClose, registryData, onUpdateRegistry, allData, onOpenRegistry
}) => {
    const [formData, setFormData] = useState<FmeaAction>(action);
    const [isTaskManagerOpen, setTaskManagerOpen] = useState(false);

    useEffect(() => {
        setFormData(action);
    }, [action]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTypeChange = (type: 'prevention' | 'detection') => {
        setFormData(prev => ({ ...prev, type }));
    };

    const handleSave = () => {
        onSave(formData);
    };
    
    const handleSelectTask = (task: FmeaAction) => {
        setFormData(prev => ({
            ...prev,
            description: task.description,
            responsiblePerson: task.responsiblePerson,
            targetCompletionDate: task.targetCompletionDate,
            status: task.status,
            actionTaken: task.actionTaken,
            completionDate: task.completionDate,
        }));
        setTaskManagerOpen(false);
    };

    const inputClass = "w-full text-sm border border-gray-400 bg-white px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
    const statusOptions = ['Open', 'Pending implementation', 'Completed', 'Cancelled'];

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4" onClick={onClose}>
                <div className="bg-gray-200 rounded-sm shadow-xl w-full max-w-lg p-0 flex flex-col font-sans border border-gray-500" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center bg-gray-300 px-2 py-1 border-b border-gray-400">
                        <h3 className="text-sm font-semibold text-gray-800">Prevention Action/Detection Action</h3>
                        <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="p-4 space-y-4">
                        <div className="flex justify-end">
                            <button onClick={() => setTaskManagerOpen(true)} type="button" className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">
                                Add existing task
                            </button>
                        </div>
                        <div className="flex justify-center items-center space-x-8">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="actionType" checked={formData.type === 'prevention'} onChange={() => handleTypeChange('prevention')} />
                                <span>Prevention Action</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input type="radio" name="actionType" checked={formData.type === 'detection'} onChange={() => handleTypeChange('detection')} />
                                <span>Detection Action</span>
                            </label>
                        </div>

                        <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className={inputClass}></textarea>
                        
                        <LabeledInput label="Responsible Person's Name">
                            <div className="flex items-center space-x-2">
                                <select name="responsiblePerson" value={formData.responsiblePerson || ''} onChange={handleChange} className={inputClass}>
                                    <option value="">Choose</option>
                                    {(registryData?.responsiblePeople || []).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <button type="button" onClick={onOpenRegistry} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">Edit list</button>
                            </div>
                        </LabeledInput>
                        <LabeledInput label="Target completion date">
                            <input type="date" name="targetCompletionDate" value={formData.targetCompletionDate || ''} onChange={handleChange} className={inputClass} />
                        </LabeledInput>
                        <LabeledInput label="Status">
                            <select name="status" value={formData.status || ''} onChange={handleChange} className={inputClass}>
                                <option value="">Choose</option>
                                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </LabeledInput>
                        <LabeledInput label="Action taken with pointer to evidence">
                            <textarea name="actionTaken" value={formData.actionTaken || ''} onChange={handleChange} rows={3} className={inputClass}></textarea>
                        </LabeledInput>
                        <LabeledInput label="Completion date">
                            <input type="date" name="completionDate" value={formData.completionDate || ''} onChange={handleChange} className={inputClass} />
                        </LabeledInput>
                    </div>
                    
                    <div className="flex justify-end p-3 bg-gray-200 border-t border-gray-300">
                        <button onClick={handleSave} className="px-5 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">OK</button>
                    </div>
                </div>
            </div>
            {isTaskManagerOpen && (
                <TaskManagerModal 
                    allData={allData}
                    onClose={() => setTaskManagerOpen(false)}
                    onSelect={handleSelectTask}
                />
            )}
        </>
    );
};
