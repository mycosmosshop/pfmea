import React, { useState, useEffect, useMemo } from 'react';
import type { FmeaData, ModalType, RegistryData, FmeaAction, FailureCause } from '../types';
import { ClassificationModal } from './ClassificationModal';
import { SvgIconRenderer } from './icons/Icons';
import { ClassificationSymbol } from './ClassificationSymbol';
import { SeverityModal } from './SeverityModal';
import { OccurrenceModal } from './OccurrenceModal';
import { DetectionModal } from './DetectionModal';
import { PreventionDetectionActionModal } from './PreventionDetectionActionModal';

interface DataEntryModalProps {
  modalConfig: ModalType;
  allData: FmeaData;
  onSave: (data: any) => void;
  onClose: () => void;
  registryData?: RegistryData;
  onUpdateRegistry?: (action: { type: string; payload: any }) => void;
  onOpenSeverityModal: (config: {
    targetType: 'effect' | 'cause' | 'new_effect_for_mode';
    targetId: string;
    field: 'severity' | 'revisedSeverity';
    currentValue?: number;
    onSaveOverride?: (severity: number) => void;
  }) => void;
  onOpenModal?: (modalInfo: ModalType) => void;
  onOpenSodAssistantModal: () => void;
  onOpenDetectionAssistantModal: () => void;
  calculateAP: (s?: number, o?: number, d?: number) => string;
}

const getTitle = (type: string) => {
    switch(type) {
        case 'ProcessItem': return 'Process Item';
        case 'ProcessStep': return 'Process phase';
        case 'ProcessStepFunction': return 'Process Phase Function';
        case 'FailureMode': return 'Failure Mode';
        case 'FailureEffect': return 'Failure effect';
        case 'FailureCause': return 'Failure cause';
        default: return 'Edit Item';
    }
}

const Fieldset: React.FC<{legend: string, children: React.ReactNode}> = ({ legend, children }) => (
    <fieldset className="border border-gray-300 p-3 rounded-md">
        <legend className="px-2 text-sm font-semibold text-gray-600">{legend}</legend>
        <div className="space-y-4">
            {children}
        </div>
    </fieldset>
);

const LabeledInput: React.FC<{label: string, name: string, value?: any, onChange?: any, type?: string, placeholder?: string, children?: React.ReactNode, min?: number, max?: number}> = ({label, name, children, ...props}) => (
    <div>
        <label className="block text-gray-700 text-sm font-bold mb-1" htmlFor={name}>{label}:</label>
        {children || <input id={name} name={name} {...props} className="shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />}
    </div>
);

const getAPBackgroundColor = (ap?: any) => {
    const apString = String(ap || '');
    switch (apString.trim()) {
        case 'H': return 'bg-red-200 border-red-300';
        case 'M': return 'bg-yellow-200 border-yellow-300';
        case 'L':
        case '(L)':
            return 'bg-green-200 border-green-300';
        default: return 'bg-gray-100 border-gray-300';
    }
};

export const DataEntryModal: React.FC<DataEntryModalProps> = ({ modalConfig, allData, onSave, onClose, registryData, onUpdateRegistry, onOpenSeverityModal, onOpenModal, onOpenSodAssistantModal, onOpenDetectionAssistantModal, calculateAP }) => {
  if (!modalConfig) return null;

  if (modalConfig.type === 'Registry' || !('data' in modalConfig)) {
    return null;
  }

  const [formData, setFormData] = useState<any>({});
  const [isClassificationModalOpen, setClassificationModalOpen] = useState(false);
  const [newWorkElementFunctionName, setNewWorkElementFunctionName] = useState('');
  const [editingSeverityField, setEditingSeverityField] = useState<null | 'severity' | 'revisedSeverity'>(null);
  const [editingOccurrenceField, setEditingOccurrenceField] = useState<null | 'occurrence' | 'revisedOccurrence'>(null);
  const [editingDetectionField, setEditingDetectionField] = useState<null | 'detection' | 'revisedDetection'>(null);
  const [actionModalState, setActionModalState] = useState<{ action: FmeaAction; isNew: boolean } | null>(null);
  
  useEffect(() => {
    setFormData(modalConfig.data || { includeInPF: true });
  }, [modalConfig]);
  
  const failureCauseMemo = useMemo(() => {
    if (modalConfig.type !== 'FailureCause') return null;

    const failureModeId = modalConfig.parentId;
    const failureMode = allData.failureModes[failureModeId];
    
    const effects = (failureMode?.effectIds || [])
        .map(id => allData.failureEffects[id])
        .filter(Boolean);

    if (effects.length === 0) return { highestSeverityEffect: null, effects };

    const highestSeverityEffect = effects.reduce((max, current) => {
        return (current.severity || 0) > (max.severity || 0) ? current : max;
    }, effects[0]);
    
    return { highestSeverityEffect, effects };
  }, [modalConfig, allData.failureModes, allData.failureEffects]);

  useEffect(() => {
    if (modalConfig.type === 'FailureCause' && Object.keys(formData).length > 0) {
        const { highestSeverityEffect } = failureCauseMemo || {};
        const derivedSeverity = highestSeverityEffect?.severity;
        const currentS = formData.severity !== undefined ? formData.severity : derivedSeverity;

        const newAP = calculateAP(currentS, formData.occurrence, formData.detection);
        const newRevisedAP = calculateAP(formData.revisedSeverity, formData.revisedOccurrence, formData.revisedDetection);

        if (newAP !== formData.actionPriority || newRevisedAP !== formData.revisedActionPriority) {
            setFormData(prev => ({
                ...prev,
                actionPriority: newAP,
                revisedActionPriority: newRevisedAP,
            }));
        }
    }
  }, [
    formData.severity, 
    formData.occurrence, 
    formData.detection, 
    formData.revisedSeverity, 
    formData.revisedOccurrence, 
    formData.revisedDetection,
    failureCauseMemo, 
    calculateAP,
    modalConfig.type,
    formData.actionPriority,
    formData.revisedActionPriority
  ]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checkedValue = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData((prev: any) => {
        if (name === 'classificationSpecialCharacteristic') {
            const isChecked = !!checkedValue;
            const newFormData = { ...prev, [name]: isChecked };
            if (!isChecked) {
                // When unchecked, clear symbol from Step 2
                newFormData.classificationSymbolBefore = '';
            }
            return newFormData;
        } else {
            return {
                ...prev,
                [name]: isCheckbox ? checkedValue : value,
            };
        }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...modalConfig.data, ...formData });
  };

  const handleSelectSymbol = (symbol: string) => {
    const newSymbol = symbol === 'none' ? '' : symbol;
    setFormData((prev: any) => {
        const newFormData = { ...prev };
        if (prev.classificationSpecialCharacteristic) {
            // Checkbox is ticked, so update Step 2 and leave Step 6 alone
            newFormData.classificationSymbolBefore = newSymbol;
        } else {
            // Checkbox is not ticked, so update Step 6
            newFormData.classificationSymbolAfter = newSymbol;
        }
        return newFormData;
    });
    setClassificationModalOpen(false);
  };
  
  const handleSelectFlowchartSymbol = (symbolKey: string) => {
      setFormData((prev: any) => ({
          ...prev,
          flowchartSymbol: prev.flowchartSymbol === symbolKey ? undefined : symbolKey,
      }));
  };

  const handleAddWorkElementFunction = () => {
    if (!onUpdateRegistry || !newWorkElementFunctionName.trim() || !formData.processWorkElement) return;

    const payload = {
      element: formData.processWorkElement,
      name: newWorkElementFunctionName.trim()
    };
    onUpdateRegistry({ type: 'add_work_element_function', payload });

    // Also select the newly added function
    setFormData(prev => ({
      ...prev,
      workElementFunction: newWorkElementFunctionName.trim(),
    }));
    setNewWorkElementFunctionName('');
  };

  const handleSelectSeverity = (severity: number) => {
    if (editingSeverityField) {
      setFormData((prev: any) => ({ ...prev, [editingSeverityField]: severity }));
    }
    setEditingSeverityField(null);
  };

  const handleSelectOccurrence = (occurrence: number) => {
    if (editingOccurrenceField) {
      setFormData((prev: any) => ({ ...prev, [editingOccurrenceField]: occurrence }));
    }
    setEditingOccurrenceField(null);
  };

  const handleSelectDetection = (detection: number) => {
    if (editingDetectionField) {
      setFormData((prev: any) => ({ ...prev, [editingDetectionField]: detection }));
    }
    setEditingDetectionField(null);
  };

  const handleAddNewAction = () => {
    const newAction: FmeaAction = {
      id: `action_${Date.now()}`,
      type: 'prevention',
      description: '',
    };
    setActionModalState({ action: newAction, isNew: true });
  };

  const handleEditAction = (action: FmeaAction) => {
    setActionModalState({ action, isNew: false });
  };
  
  const handleDeleteAction = (actionId: string) => {
      setFormData((prev: FailureCause) => ({
          ...prev,
          actions: prev.actions.filter(a => a.id !== actionId)
      }));
  };

  const handleSaveAction = (savedAction: FmeaAction) => {
    if (!actionModalState) return;

    setFormData((prev: FailureCause) => {
        const newActions = [...(prev.actions || [])];
        if (actionModalState.isNew) {
            newActions.push(savedAction);
        } else {
            const index = newActions.findIndex(a => a.id === savedAction.id);
            if (index > -1) {
                newActions[index] = savedAction;
            }
        }
        return { ...prev, actions: newActions };
    });
    setActionModalState(null);
  };

  const renderFields = () => {
    const commonInputClass = "shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500";
    const buttonInputClass = "shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight text-left focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white hover:bg-gray-50";

    switch(modalConfig.type) {
        case 'ProcessItem': return (
            <div className="space-y-4">
                <LabeledInput label="Item Name" name="name" value={formData.name || ''} onChange={handleChange} />
            </div>
        );
        case 'ProcessStep': return (
            <div className="space-y-4">
                <LabeledInput label="Operation number" name="operationNumber" value={formData.operationNumber || ''} onChange={handleChange} />
                <input name="name" id="name" value={formData.name || ''} onChange={handleChange} className={commonInputClass} placeholder="Phase name" />
                <LabeledInput label="Machine, device, source" name="machineDeviceSource" value={formData.machineDeviceSource || ''} onChange={handleChange} />
                <div className="pt-2 space-y-2">
                    <label className="flex items-center">
                        <input type="checkbox" name="takeFromProcessWorkElement" checked={!!formData.takeFromProcessWorkElement} onChange={handleChange} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Take from Process Work Element</span>
                    </label>
                    <label className="flex items-center">
                        <input type="checkbox" name="includeInPF" checked={!!formData.includeInPF} onChange={handleChange} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                        <span className="text-sm text-gray-700">Include in PF</span>
                    </label>
                </div>
            </div>
        );
        case 'ProcessStepFunction': return (
            <>
                <div className="space-y-4 text-sm">
                    <Fieldset legend="Function Details">
                        <input name="name" id="name" value={formData.name || ''} onChange={handleChange} className={commonInputClass} placeholder="Function Name (Process)" />
                        <LabeledInput label="Process Description" name="processDescription" value={formData.processDescription || ''} onChange={handleChange} />
                        <LabeledInput label="Associated product characteristic" name="productCharacteristic" value={formData.productCharacteristic || ''} onChange={handleChange} />
                        <LabeledInput label="Product specification/tolerance" name="productSpecificationTolerance" value={formData.productSpecificationTolerance || ''} onChange={handleChange} />
                    </Fieldset>
                    
                    <Fieldset legend="Flowchart Symbol">
                         <div className="grid grid-cols-7 gap-2 p-2 rounded-md border border-gray-200 bg-gray-50">
                            {registryData?.flowchartSymbols.map(({ key, label, svgString }) => (
                                <button
                                    type="button"
                                    key={key}
                                    onClick={() => handleSelectFlowchartSymbol(key)}
                                    title={label}
                                    className={`flex flex-col items-center justify-center p-1 rounded border-2 transition-all ${formData.flowchartSymbol === key ? 'border-blue-500 bg-blue-100' : 'border-gray-300 bg-white hover:border-blue-400'}`}
                                >
                                    <SvgIconRenderer svgString={svgString} className="h-6 w-6 text-gray-700" />
                                    <span className="text-[10px] mt-1 text-gray-600">{label}</span>
                                </button>
                            ))}
                        </div>
                    </Fieldset>

                    <Fieldset legend="Control Plan Methods">
                       <LabeledInput label="Evaluation/Measurement Technique" name="evaluationMeasurementTechnique" value={formData.evaluationMeasurementTechnique || ''} onChange={handleChange} />
                        <div className="grid grid-cols-2 gap-4">
                            <LabeledInput label="Sample Size" name="sampleSize" value={formData.sampleSize || ''} onChange={handleChange} />
                            <LabeledInput label="Sample Frequency" name="sampleFrequency" value={formData.sampleFrequency || ''} onChange={handleChange} />
                        </div>
                        <LabeledInput label="Control Method" name="controlMethod" value={formData.controlMethod || ''} onChange={handleChange} />
                    </Fieldset>

                    <Fieldset legend="Classification & Control">
                        <div className="flex items-start justify-between pt-2">
                            <div className="flex space-x-2">
                                <div className="border border-gray-300 p-2 text-center w-20 h-20 flex flex-col justify-center items-center bg-gray-100">
                                    <span className="text-xs">Step 2</span>
                                    <div className="w-16 h-8 bg-gray-200 border border-gray-300 mt-1 flex justify-center items-center text-gray-700">
                                        <ClassificationSymbol symbolKey={formData.classificationSymbolBefore} registryData={registryData} />
                                    </div>
                                </div>
                                <div className="border border-gray-300 p-2 text-center w-20 h-20 flex flex-col justify-center items-center bg-gray-100">
                                    <span className="text-xs">Step 6</span>
                                    <div className="w-16 h-8 bg-gray-200 border border-gray-300 mt-1 flex justify-center items-center text-gray-700">
                                        <ClassificationSymbol symbolKey={formData.classificationSymbolAfter} registryData={registryData} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="flex items-center"><input type="checkbox" name="includeInControlPlan" checked={!!formData.includeInControlPlan} onChange={handleChange} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><span>include in control plan</span></label>
                                <label className="flex items-center"><input type="checkbox" name="controlCharacteristicWithoutFmea" checked={!!formData.controlCharacteristicWithoutFmea} onChange={handleChange} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><span>control characteristic (without FMEA)</span></label>
                                <label className="flex items-center"><input type="checkbox" name="classificationSpecialCharacteristic" checked={!!formData.classificationSpecialCharacteristic} onChange={handleChange} className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /><span>Classification/special characteristic</span></label>
                                <button type="button" onClick={() => setClassificationModalOpen(true)} className="w-full mt-2 p-2 text-center bg-gray-200 border rounded-md text-gray-600 text-xs hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400">Classification</button>
                            </div>
                        </div>
                    </Fieldset>
                </div>
                {isClassificationModalOpen && <ClassificationModal onSelectSymbol={handleSelectSymbol} onClose={() => setClassificationModalOpen(false)} registryData={registryData} onUpdateRegistry={onUpdateRegistry} />}
            </>
        );
        case 'FailureMode': return (
             <LabeledInput label="Failure mode" name="description" value={formData.description || ''} onChange={handleChange} />
        );
        case 'FailureCause': {
            const currentWorkElement = formData.processWorkElement || '';
            const baseFunctionList = registryData?.workElementFunctionsByElement?.[currentWorkElement] || [];
            // Kayıtlı workElementFunction registry listesinde yoksa da dropdown'da GÖRÜNSÜN
            // (aksi halde değer veride dolu olmasına ragmen "Select..." görünüyordu).
            const functionList = formData.workElementFunction && !baseFunctionList.includes(formData.workElementFunction)
                ? [formData.workElementFunction, ...baseFunctionList]
                : baseFunctionList;
            
            const { highestSeverityEffect } = failureCauseMemo || {};
            const derivedSeverity = highestSeverityEffect?.severity;
            const isOverridden = formData.severity !== undefined;
            const displaySeverity = isOverridden ? formData.severity : derivedSeverity;

            const handleResetSeverity = () => {
                setFormData((prev: any) => {
                    const newData = { ...prev };
                    delete newData.severity;
                    return newData;
                });
            };

            const actions = formData.actions || [];

            return (
                <div className="space-y-4">
                    <Fieldset legend="Cause Details">
                        <LabeledInput label="Process Work Element" name="processWorkElement">
                            <select name="processWorkElement" id="processWorkElement" value={currentWorkElement} onChange={(e) => { setFormData(prev => ({ ...prev, processWorkElement: e.target.value, workElementFunction: '' })); }} className={commonInputClass}>
                                <option value="">Select...</option>
                                {registryData?.processWorkElements.map(el => (<option key={el} value={el}>{el}</option>))}
                            </select>
                        </LabeledInput>
                        <LabeledInput label="Work Element function" name="workElementFunction">
                             <select name="workElementFunction" id="workElementFunction" value={formData.workElementFunction || ''} onChange={handleChange} className={commonInputClass} disabled={!currentWorkElement}>
                                <option value="">Select...</option>
                                {functionList.map(func => (<option key={func} value={func}>{func}</option>))}
                            </select>
                        </LabeledInput>
                        <div className="flex items-center space-x-2">
                            <input value={newWorkElementFunctionName} onChange={e => setNewWorkElementFunctionName(e.target.value)} placeholder="Add new function..." className={commonInputClass + " flex-grow"} disabled={!currentWorkElement} />
                            <button type="button" onClick={handleAddWorkElementFunction} disabled={!currentWorkElement || !newWorkElementFunctionName.trim()} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed">+ Ekle</button>
                        </div>
                        <input name="description" id="description" value={formData.description || ''} onChange={handleChange} className={commonInputClass} placeholder="Failure cause description..." />
                    </Fieldset>
                    
                    <Fieldset legend="Risk Analysis (Step 5)">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-1">Severity (S)</label>
                            <div className="flex items-center gap-x-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingSeverityField('severity')}
                                    className={`shadow-sm appearance-none border rounded w-24 py-2 px-3 leading-tight text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${isOverridden ? 'bg-yellow-100 border-yellow-400' : 'bg-white hover:bg-gray-50'}`}
                                >
                                    {displaySeverity ?? '—'}
                                </button>
                                <span className="text-sm text-gray-500">
                                    {isOverridden ? "(Overridden)" : "(Inherited)"}
                                </span>
                                {isOverridden && (
                                    <button
                                        type="button"
                                        onClick={handleResetSeverity}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Reset to inherited
                                    </button>
                                )}
                            </div>
                             { !isOverridden && highestSeverityEffect && <p className="text-xs text-gray-500 mt-1">Inherited from effect: "{highestSeverityEffect.effectText}"</p> }
                             { !highestSeverityEffect && <p className="text-xs text-gray-500 mt-1">No Failure Effect exists. Setting a severity will create one.</p> }
                        </div>
                        <LabeledInput label="Current Prevention Control (PC)" name="preventionControl" value={formData.preventionControl || ''} onChange={handleChange} />
                        <LabeledInput label="Occurrence (O)" name="occurrence">
                             <button type="button" onClick={() => setEditingOccurrenceField('occurrence')} className={buttonInputClass}>
                                {formData.occurrence || 'Select Occurrence...'}
                            </button>
                        </LabeledInput>
                        <LabeledInput label="Current Detection Control (DC)" name="detectionControl" value={formData.detectionControl || ''} onChange={handleChange} />
                        <LabeledInput label="Detection (D)" name="detection">
                            <button type="button" onClick={() => setEditingDetectionField('detection')} className={buttonInputClass}>
                                {formData.detection || 'Select Detection...'}
                            </button>
                        </LabeledInput>
                        <LabeledInput label="Action Priority (AP)" name="actionPriority">
                            <div className={`shadow-sm border rounded w-full py-2 px-3 text-center font-bold ${getAPBackgroundColor(formData.actionPriority)}`}>
                                {formData.actionPriority || '—'}
                            </div>
                        </LabeledInput>
                        <LabeledInput label="Filter Code" name="filterCode" value={formData.filterCode || ''} onChange={handleChange} />
                    </Fieldset>
                     
                    <Fieldset legend="Optimization (Step 6)">
                        <div className="space-y-2">
                          {actions.map((action: FmeaAction) => (
                            <div key={action.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50">
                              <div className="text-sm">
                                <span className={`font-semibold ${action.type === 'prevention' ? 'text-blue-700' : 'text-green-700'}`}>
                                  {action.type === 'prevention' ? 'Prevention' : 'Detection'}:
                                </span>
                                <span className="ml-2">{action.description}</span>
                                {action.responsiblePerson && <span className="text-gray-500 text-xs ml-2">({action.responsiblePerson})</span>}
                              </div>
                              <div className="space-x-2">
                                <button type="button" onClick={() => handleEditAction(action)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                <button type="button" onClick={() => handleDeleteAction(action.id)} className="text-xs text-red-600 hover:underline">Delete</button>
                              </div>
                            </div>
                          ))}
                          {actions.length === 0 && <p className="text-sm text-gray-500">No actions defined.</p>}
                        </div>
                        <button type="button" onClick={handleAddNewAction} className="mt-2 w-full text-sm py-2 px-4 border border-dashed rounded-md text-gray-600 hover:bg-gray-100">
                          + Add New Action
                        </button>
                        <div className="grid grid-cols-3 gap-4">
                            <LabeledInput label="Revised S" name="revisedSeverity">
                                <button type="button" onClick={() => setEditingSeverityField('revisedSeverity')} className={buttonInputClass}>
                                    {formData.revisedSeverity || 'Select Severity...'}
                                </button>
                            </LabeledInput>
                            <LabeledInput label="Revised O" name="revisedOccurrence">
                                 <button type="button" onClick={() => setEditingOccurrenceField('revisedOccurrence')} className={buttonInputClass}>
                                    {formData.revisedOccurrence || 'Select Occurrence...'}
                                </button>
                            </LabeledInput>
                            <LabeledInput label="Revised D" name="revisedDetection">
                                 <button type="button" onClick={() => setEditingDetectionField('revisedDetection')} className={buttonInputClass}>
                                    {formData.revisedDetection || 'Select Detection...'}
                                </button>
                            </LabeledInput>
                        </div>
                        <LabeledInput label="Revised AP" name="revisedActionPriority">
                           <div className={`shadow-sm border rounded w-full py-2 px-3 text-center font-bold ${getAPBackgroundColor(formData.revisedActionPriority)}`}>
                                {formData.revisedActionPriority ? `(${formData.revisedActionPriority})` : '—'}
                            </div>
                        </LabeledInput>
                        <LabeledInput label="Remarks" name="remarks" value={formData.remarks || ''} onChange={handleChange} />
                    </Fieldset>
                </div>
            )
        }
        default: return null;
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-start">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4 my-8 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center border-b pb-3 mb-4 sticky top-0 bg-white z-10 -mt-6 -mx-6 px-6 pt-6">
              <h3 className="text-xl font-semibold text-gray-800">{getTitle(modalConfig.type)}</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              {renderFields()}
            </div>
            <div className="flex items-center justify-end sticky bottom-0 bg-white z-10 -mb-6 -mx-6 px-6 pb-6">
              <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm mr-2 transition-colors">
                Cancel
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors">
                OK
              </button>
            </div>
          </form>
        </div>
      </div>
      {actionModalState && (
        <PreventionDetectionActionModal
          action={actionModalState.action}
          isNew={actionModalState.isNew}
          onSave={handleSaveAction}
          onClose={() => setActionModalState(null)}
          registryData={registryData}
          onUpdateRegistry={onUpdateRegistry}
          allData={allData}
          onOpenRegistry={() => onOpenModal && onOpenModal({ type: 'Registry' })}
        />
      )}
      {editingSeverityField && (
        <SeverityModal
            currentSeverity={formData[editingSeverityField]}
            onSelect={handleSelectSeverity}
            onClose={() => setEditingSeverityField(null)}
        />
      )}
      {editingOccurrenceField && (
        <OccurrenceModal
            currentOccurrence={formData[editingOccurrenceField]}
            onSelect={handleSelectOccurrence}
            onClose={() => setEditingOccurrenceField(null)}
            onOpenAssistant={onOpenSodAssistantModal}
        />
      )}
      {editingDetectionField && (
        <DetectionModal
            currentDetection={formData[editingDetectionField]}
            onSelect={handleSelectDetection}
            onClose={() => setEditingDetectionField(null)}
            onOpenAssistant={onOpenDetectionAssistantModal}
        />
      )}
    </>
  );
};