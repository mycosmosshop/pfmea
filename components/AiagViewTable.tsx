



import React, { useMemo } from 'react';
import type { FmeaData, ModalType, ProcessItem, ProcessStep, ProcessStepFunction, FailureMode, FailureEffect, FailureCause, RegistryData, FmeaAction } from '../types';
import { ClassificationSymbol } from './ClassificationSymbol';

interface AiagViewTableProps {
  data: FmeaData;
  registryData: RegistryData;
  onOpenModal: (modalInfo: ModalType) => void;
}

interface AiagTableRow {
    phase: ProcessStep;
    func: ProcessStepFunction;
    mode: FailureMode;
    effect?: FailureEffect; // AIAG view often shows the highest severity effect
    cause?: FailureCause;

    // for rowspan calculations
    isFirstPhaseRow: boolean;
    isFirstFuncRow: boolean;
    isFirstModeRow: boolean;
}

const getRpnColor = (rpn: number | undefined, thresholds: { high?: number; medium?: number; }) => {
    const highThreshold = thresholds?.high ?? 100;
    const mediumThreshold = thresholds?.medium ?? 40;

    if (rpn === undefined || rpn === null || isNaN(rpn)) return '';
    if (rpn > highThreshold) return 'bg-red-200';
    if (rpn > mediumThreshold) return 'bg-yellow-200';
    return '';
};


const getSeverity = (effect?: FailureEffect, cause?: FailureCause) => {
    if (cause?.severity !== undefined) return cause.severity;
    if (effect?.severity !== undefined) return effect.severity;
    return undefined;
};

const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
    return weekNo;
};

const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        const week = getWeekNumber(date);
        return `${date.toISOString().slice(0, 10)}\n(${week})`;
    } catch(e) {
        return '';
    }
};

const joinActionDetails = (actions: FmeaAction[] = [], field: keyof FmeaAction) => {
    return actions.map(a => a[field] || '').join('\n---\n');
};


const AiagViewTable: React.FC<AiagViewTableProps> = ({ data, registryData, onOpenModal }) => {
    const { rows, phaseRowSpans, funcRowSpans, modeRowSpans } = useMemo(() => {
        const generatedRows: AiagTableRow[] = [];
        const phaseSpans: Record<string, number> = {};
        const funcSpans: Record<string, number> = {};
        const modeSpans: Record<string, number> = {};

        const allSteps = (Object.values(data.processItems) as ProcessItem[]).flatMap(item => item.stepIds.map(sid => data.processSteps[sid]).filter(Boolean));

        // Pre-calculate rowspans
        allSteps.forEach(phase => {
            let phaseTotalRows = 0;
            if ((phase.functionIds || []).length > 0) {
                phase.functionIds.forEach(funcId => {
                    const func = data.processStepFunctions[funcId];
                    if (func) {
                        let funcTotalRows = 0;
                        if ((func.failureModeIds || []).length > 0) {
                             func.failureModeIds.forEach(modeId => {
                                const mode = data.failureModes[modeId];
                                if (mode) {
                                    const modeNumRows = (mode.causeIds || []).length > 0 ? (mode.causeIds || []).length : 1;
                                    modeSpans[modeId] = modeNumRows;
                                    funcTotalRows += modeNumRows;
                                }
                            });
                        }
                        funcSpans[funcId] = funcTotalRows > 0 ? funcTotalRows : 1;
                        phaseTotalRows += funcSpans[funcId];
                    }
                });
            }
            phaseSpans[phase.id] = phaseTotalRows > 0 ? phaseTotalRows : 1;
        });

        // Generate rows
        allSteps.forEach(phase => {
            let isFirstPhaseRow = true;
            if ((phase.functionIds || []).length === 0) {
                 generatedRows.push({
                    phase, func: {} as any, mode: {} as any,
                    isFirstPhaseRow, isFirstFuncRow: true, isFirstModeRow: true
                });
            } else {
                phase.functionIds.forEach(funcId => {
                    const func = data.processStepFunctions[funcId];
                    if (!func) return;
                    let isFirstFuncRow = true;
                    if ((func.failureModeIds || []).length === 0) {
                        generatedRows.push({
                            phase, func, mode: {} as any,
                            isFirstPhaseRow, isFirstFuncRow, isFirstModeRow: true
                        });
                        isFirstPhaseRow = false;
                    } else {
                        func.failureModeIds.forEach(modeId => {
                            const mode = data.failureModes[modeId];
                            if (!mode) return;
                            let isFirstModeRow = true;
                            
                            const effects = (mode.effectIds || []).map(id => data.failureEffects[id]).filter(Boolean);
                            const highestSeverityEffect = effects.length > 0 ? effects.reduce((max, e) => (e.severity || 0) > (max.severity || 0) ? e : max, effects[0]) : undefined;
                            
                            if ((mode.causeIds || []).length === 0) {
                                generatedRows.push({
                                    phase, func, mode, effect: highestSeverityEffect,
                                    isFirstPhaseRow, isFirstFuncRow, isFirstModeRow
                                });
                                isFirstPhaseRow = false; isFirstFuncRow = false;
                            } else {
                                mode.causeIds.forEach(causeId => {
                                    const cause = data.failureCauses[causeId];
                                    generatedRows.push({
                                        phase, func, mode, effect: highestSeverityEffect, cause,
                                        isFirstPhaseRow, isFirstFuncRow, isFirstModeRow
                                    });
                                    isFirstPhaseRow = false; isFirstFuncRow = false; isFirstModeRow = false;
                                });
                            }
                        });
                    }
                });
            }
        });

        return { rows: generatedRows, phaseRowSpans: phaseSpans, funcRowSpans: funcSpans, modeRowSpans: modeSpans };
    }, [data]);
    
    const thClass = "p-2 border-l border-r border-white/30 text-xs font-bold uppercase tracking-wider align-middle";
    const tdClass = "p-2 border border-gray-400 text-xs align-top whitespace-pre-wrap";
    const tdClickableClass = "cursor-pointer hover:bg-blue-100 transition-colors";
    const rpnThresholds = {
        high: registryData.rpnThresholdHigh,
        medium: registryData.rpnThresholdMedium
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-700">AIAG View</h2>
            <table className="min-w-full border-collapse border border-gray-400">
                <thead className="bg-blue-800 text-white text-center">
                    <tr>
                        <th className={thClass} rowSpan={2}>Phase</th>
                        <th className={thClass} rowSpan={2}>Requirement / Function / Characteristic</th>
                        <th className={thClass} rowSpan={2}>Failure Mode</th>
                        <th className={thClass} rowSpan={2}>Effect</th>
                        <th className={thClass} rowSpan={2}>Severity (S)</th>
                        <th className={thClass} rowSpan={2}>Characteristics</th>
                        <th className={thClass} colSpan={6}>Current State</th>
                        <th className={thClass} rowSpan={2}>Recommended Actions</th>
                        <th className={thClass} rowSpan={2}>Responsibility Planned completion date</th>
                        <th className={thClass} colSpan={6}>Action Results</th>
                    </tr>
                    <tr>
                        <th className={thClass}>Failure Cause</th>
                        <th className={thClass}>Preventive Actions</th>
                        <th className={thClass}>Occurrence (O)</th>
                        <th className={thClass}>Detection Actions</th>
                        <th className={thClass}>Detection (D)</th>
                        <th className={thClass}>RPN</th>
                        <th className={thClass}>Actions Taken Completion Date</th>
                        <th className={thClass}>Severity (S)</th>
                        <th className={thClass}>Occurrence (O)</th>
                        <th className={thClass}>Detection (D)</th>
                        <th className={thClass}>RPN</th>
                        <th className={thClass}>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const { phase, func, mode, effect, cause, isFirstPhaseRow, isFirstFuncRow, isFirstModeRow } = row;
                        
                        const currentS = getSeverity(effect, cause);
                        const currentO = cause?.occurrence;
                        const currentD = cause?.detection;
                        const currentRpn = (currentS && currentO && currentD) ? currentS * currentO * currentD : undefined;

                        const revisedS = cause?.revisedSeverity;
                        const revisedO = cause?.revisedOccurrence;
                        const revisedD = cause?.revisedDetection;
                        const revisedRpn = (revisedS && revisedO && revisedD) ? revisedS * revisedO * revisedD : undefined;

                        const handlePhaseClick = () => {
                           const parentItem = (Object.values(data.processItems) as ProcessItem[]).find(pi => pi.stepIds.includes(phase.id));
                           if(parentItem) onOpenModal({ type: 'ProcessStep', parentId: parentItem.id, data: phase });
                        };
                        const handleFuncClick = () => onOpenModal({ type: 'ProcessStepFunction', parentId: phase.id, data: func });
                        const handleModeClick = () => onOpenModal({ type: 'FailureMode', parentId: func.id, data: mode });
                        const handleEffectClick = () => onOpenModal({ type: 'FailureEffect', parentId: mode.id, functionId: func.id, data: effect });
                        const handleCauseClick = () => {
                            if (cause) onOpenModal({ type: 'FailureCause', parentId: mode.id, functionId: func.id, data: cause });
                        };

                        return (
                            <tr key={`${phase.id}-${func.id}-${mode.id}-${cause?.id || index}`} className="hover:bg-gray-50 even:bg-white odd:bg-gray-50">
                                {isFirstPhaseRow && <td rowSpan={phaseRowSpans[phase.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handlePhaseClick}>{phase.name}</td>}
                                {isFirstFuncRow && <td rowSpan={funcRowSpans[func.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleFuncClick}>{func.name}</td>}
                                {isFirstModeRow && <td rowSpan={modeRowSpans[mode.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleModeClick}>{mode.description}</td>}
                                {isFirstModeRow && <td rowSpan={modeRowSpans[mode.id]} className={`${tdClass} ${tdClickableClass}`} onClick={handleEffectClick}>{effect?.effectText ? `[${effect.clientType}] ${effect.effectText}\n(${effect.severity})` : ''}</td>}
                                {isFirstModeRow && <td rowSpan={modeRowSpans[mode.id]} className={`${tdClass} text-center font-bold`}>{currentS}</td>}
                                {isFirstModeRow && <td rowSpan={modeRowSpans[mode.id]} className={`${tdClass} text-center`}><ClassificationSymbol symbolKey={func.classificationSymbolBefore || func.classificationSymbolAfter} registryData={registryData} /></td>}
                                
                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.description}</td>
                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.preventionControl}</td>
                                <td className={`${tdClass} text-center font-bold ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{currentO}</td>
                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.detectionControl}</td>
                                <td className={`${tdClass} text-center font-bold ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{currentD}</td>
                                <td className={`${tdClass} text-center font-bold ${getRpnColor(currentRpn, rpnThresholds)}`}>{currentRpn}</td>

                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>
                                    {cause?.actions?.map(a => `(${a.type === 'prevention' ? 'P' : 'D'}) ${a.description}`).join('\n')}
                                </td>
                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>
                                    {cause?.actions?.map(a => `${a.responsiblePerson || ''}\n${formatDate(a.targetCompletionDate)}`).join('\n---\n')}
                                </td>

                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>
                                    {cause?.actions?.map(a => `${a.actionTaken || ''}\n${formatDate(a.completionDate)}`).join('\n---\n')}
                                </td>
                                <td className={`${tdClass} text-center font-bold ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{revisedS}</td>
                                <td className={`${tdClass} text-center font-bold ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{revisedO}</td>
                                <td className={`${tdClass} text-center font-bold ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{revisedD}</td>
                                <td className={`${tdClass} text-center font-bold ${getRpnColor(revisedRpn, rpnThresholds)}`}>{revisedRpn ? `(${revisedRpn})` : ''}</td>
                                <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.remarks}</td>
                            </tr>
                        );
                    })}
                     {rows.length === 0 && (
                        <tr>
                            <td colSpan={19} className="px-6 py-4 text-center text-gray-500">No data to display.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AiagViewTable;