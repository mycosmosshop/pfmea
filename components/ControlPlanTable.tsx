



import React, { useMemo } from 'react';
import type { FmeaData, ModalType, ProcessItem, ProcessStep, ProcessStepFunction, FailureMode, FailureCause, RegistryData } from '../types';
import { ClassificationSymbol } from './ClassificationSymbol';

interface ControlPlanTableProps {
  data: FmeaData;
  registryData: RegistryData;
  onOpenModal: (modalInfo: ModalType) => void;
}

interface ControlPlanRow {
    step: ProcessStep;
    isFirstStepRow: boolean;
    func?: ProcessStepFunction;
    isFirstFuncRow: boolean;
    cause?: FailureCause;
}

const ControlPlanTable: React.FC<ControlPlanTableProps> = ({ data, registryData, onOpenModal }) => {
  const { rows, stepRowSpans, funcRowSpans } = useMemo(() => {
    const generatedRows: ControlPlanRow[] = [];
    const stepSpans: Record<string, number> = {};
    const funcSpans: Record<string, number> = {};

    Object.values(data.processItems).forEach((item: ProcessItem) => {
        item.stepIds.forEach(stepId => {
            const step = data.processSteps[stepId];
            if (!step) return;

            let stepTotalRows = 0;
            if (step.functionIds.length > 0) {
                step.functionIds.forEach(funcId => {
                    const func = data.processStepFunctions[funcId];
                    if (func) {
                        const failureModes = (func.failureModeIds || []).map(id => data.failureModes[id]).filter(Boolean);
                        const causeIds = failureModes.flatMap(m => m.causeIds || []);
                        const funcNumRows = causeIds.length > 0 ? causeIds.length : 1;
                        funcSpans[funcId] = funcNumRows;
                        stepTotalRows += funcNumRows;
                    }
                });
            }
            stepSpans[stepId] = stepTotalRows > 0 ? stepTotalRows : 1;
        });
    });

    Object.values(data.processItems).forEach((item: ProcessItem) => {
        item.stepIds.forEach(stepId => {
            const step = data.processSteps[stepId];
            if (!step) return;

            let isFirstStepRow = true;
            
            if (step.functionIds.length === 0) {
                 generatedRows.push({ step, isFirstStepRow, isFirstFuncRow: true });
                 isFirstStepRow = false;
            } else {
                step.functionIds.forEach(funcId => {
                    const func = data.processStepFunctions[funcId];
                    if (!func) return;

                    let isFirstFuncRow = true;

                    const failureModes = (func.failureModeIds || []).map(id => data.failureModes[id]).filter(Boolean);
                    const causeIds = failureModes.flatMap(m => m.causeIds || []);

                    if (causeIds.length === 0) {
                        generatedRows.push({ step, isFirstStepRow, func, isFirstFuncRow });
                        isFirstStepRow = false;
                        isFirstFuncRow = false;
                    } else {
                        causeIds.forEach(causeId => {
                            const cause = data.failureCauses[causeId];
                            if (cause) {
                                generatedRows.push({ step, isFirstStepRow, func, isFirstFuncRow, cause });
                                isFirstStepRow = false;
                                isFirstFuncRow = false;
                            }
                        });
                    }
                });
            }
        });
    });

    return { rows: generatedRows, stepRowSpans: stepSpans, funcRowSpans: funcSpans };
  }, [data]);

  const thClass = "p-2 border-l border-r border-white/30 text-xs font-bold uppercase tracking-wider align-middle";
  const tdClass = "p-2 border border-gray-400 text-xs align-middle";
  const tdClickableClass = "cursor-pointer hover:bg-blue-100 transition-colors";

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-700">Control Plan (CP) View</h2>
        <table className="min-w-full border-collapse border border-gray-400">
            <thead className="bg-blue-800 text-white text-center">
                <tr>
                    <th className={thClass} rowSpan={3}>Part/process number</th>
                    <th className={thClass} rowSpan={3}>Name / number of process / operation description</th>
                    <th className={thClass} rowSpan={3}>Machine, Device, Jig, Tools for Mfg.</th>
                    <th className={thClass} colSpan={3}>Characteristics</th>
                    <th className={thClass} rowSpan={3}>Special Char. Class</th>
                    <th className={thClass} rowSpan={3}>Process / product specification / tolerance</th>
                    <th className={thClass} colSpan={4}>Methods</th>
                    <th className={thClass} colSpan={2}>Reaction Plan</th>
                </tr>
                 <tr>
                    <th className={thClass} rowSpan={2}>No.</th>
                    <th className={thClass} rowSpan={2}>Product</th>
                    <th className={thClass} rowSpan={2}>Process</th>
                    <th className={thClass} rowSpan={2}>Evaluation/Measurement Technique</th>
                    <th className={thClass} colSpan={2}>Sample</th>
                    <th className={thClass} rowSpan={2}>Control Method</th>
                    <th className={thClass} rowSpan={2}>Action</th>
                    <th className={thClass} rowSpan={2}>Owner/Responsible person</th>
                </tr>
                 <tr>
                    <th className={thClass}>Size</th>
                    <th className={thClass}>Freq.</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => {
                    const { step, isFirstStepRow, func, isFirstFuncRow, cause } = row;

                    const handleStepClick = () => {
                        const parentItem = (Object.values(data.processItems) as ProcessItem[]).find(pi => pi.stepIds.includes(step.id));
                        if(parentItem) onOpenModal({ type: 'ProcessStep', parentId: parentItem.id, data: step });
                    };
                     const handleFuncClick = () => {
                        if (func) onOpenModal({ type: 'ProcessStepFunction', parentId: step.id, data: func });
                    };
                    const handleCauseClick = () => {
                        if(cause && func) {
                            const parentMode = (Object.values(data.failureModes) as FailureMode[]).find(fm => (fm.causeIds || []).includes(cause.id));
                            if (parentMode) {
                                onOpenModal({type: 'FailureCause', parentId: parentMode.id, functionId: func.id, data: cause});
                            }
                        }
                    };

                    return (
                        <tr key={`${step.id}-${func?.id || 'nofunc'}-${cause?.id || 'nocause'}-${index}`} className="hover:bg-gray-50 even:bg-white odd:bg-gray-50 whitespace-pre-wrap">
                            {isFirstStepRow && (
                                <>
                                    <td rowSpan={stepRowSpans[step.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleStepClick}>{step.operationNumber}</td>
                                    <td rowSpan={stepRowSpans[step.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleStepClick}>{step.name}</td>
                                    <td rowSpan={stepRowSpans[step.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleStepClick}>{step.machineDeviceSource || '—'}</td>
                                </>
                            )}
                            {isFirstFuncRow && func ? (
                                <>
                                    <td rowSpan={funcRowSpans[func.id]} className={tdClass}></td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.productCharacteristic || '—'}</td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.name || '—'}</td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} text-center ${tdClickableClass}`} onClick={handleFuncClick}><ClassificationSymbol symbolKey={func.classificationSymbolBefore || func.classificationSymbolAfter} registryData={registryData} /></td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.productSpecificationTolerance || '—'}</td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.evaluationMeasurementTechnique || '—'}</td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.sampleSize || '—'}</td>
                                    <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.sampleFrequency || '—'}</td>
                                </>
                            ) : !isFirstFuncRow ? null : (
                                <>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                    <td className={tdClass}></td>
                                </>
                            )}
                            <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.description || (isFirstFuncRow ? (func?.controlMethod || '—') : '')}</td>
                            <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.detectionAction || '—'}</td>
                            <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.responsiblePerson || '—'}</td>
                        </tr>
                    )
                })}
                {rows.length === 0 && (
                    <tr>
                        <td colSpan={15} className="px-6 py-4 text-center text-gray-500">No data to display.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
  );
};

export default ControlPlanTable;