



import React, { useMemo } from 'react';
import type { FmeaData, ModalType, ProcessItem, ProcessStep, ProcessStepFunction, FailureMode, FailureCause, RegistryData, ProjectData } from '../types';
import { ClassificationSymbol } from './ClassificationSymbol';
import { encCell, writeSanifoamAntet, writeProjectInfoLine, finalizeAndDownload, headerBandStyle, bodyStyle, bodyCenterStyle, zebraFill } from '../utils/excelExport';

interface ControlPlanTableProps {
  data: FmeaData;
  registryData: RegistryData;
  projectData: ProjectData;
  onOpenModal: (modalInfo: ModalType) => void;
}

interface ControlPlanRow {
    step: ProcessStep;
    isFirstStepRow: boolean;
    func?: ProcessStepFunction;
    isFirstFuncRow: boolean;
    cause?: FailureCause;
}

const ControlPlanTable: React.FC<ControlPlanTableProps> = ({ data, registryData, projectData, onOpenModal }) => {
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

  const clsText = (key?: string) => {
    if (!key) return '';
    const c = registryData.classificationSymbols?.find(s => s.key === key);
    return c?.label || key;
  };

  // --- Kontrol Planı -> antetli, biçimlendirilmiş Excel ---
  const handleExportToExcel = () => {
    const fmea = projectData.fmea;
    const LAST = 13;
    const ws: { [k: string]: any } = {};
    const merges: any[] = [];

    let rowIndex = writeSanifoamAntet(ws, merges, {
      title: 'CONTROL PLAN\n(KONTROL PLANI)',
      docNo: 'FR 35', rev: '4', date: '02.01.2025', sayfa: '1/1', lastCol: LAST,
    });
    rowIndex = writeProjectInfoLine(ws, merges, rowIndex, LAST, [
      `Proje: ${fmea.project || '-'}`, `Urun: ${fmea.productName || '-'}`,
      `Musteri: ${fmea.client || '-'}`, `Rev. Tarihi: ${fmea.lastRevisionDate || '-'}`,
    ]);

    // Gruplu başlık bandı (3 satır)
    const h1 = rowIndex, h2 = rowIndex + 1, h3 = rowIndex + 2;
    const putH = (r0: number, r1: number, c0: number, c1: number, v: string) => {
      ws[encCell(r0, c0)] = { v, t: 's', s: headerBandStyle };
      if (r1 > r0 || c1 > c0) merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!(r === r0 && c === c0)) ws[encCell(r, c)] = { v: '', t: 's', s: headerBandStyle };
    };
    putH(h1, h3, 0, 0, 'Part / Process No');
    putH(h1, h3, 1, 1, 'Operation Name / Description');
    putH(h1, h3, 2, 2, 'Machine / Device / Jig');
    putH(h1, h1, 3, 5, 'Characteristics');
    putH(h1, h3, 6, 6, 'Special Char. Class');
    putH(h1, h3, 7, 7, 'Process / Product Spec. / Tolerance');
    putH(h1, h1, 8, 11, 'Methods');
    putH(h1, h1, 12, 13, 'Reaction Plan');
    putH(h2, h3, 3, 3, 'No.');
    putH(h2, h3, 4, 4, 'Product');
    putH(h2, h3, 5, 5, 'Process');
    putH(h2, h3, 8, 8, 'Evaluation / Measurement Technique');
    putH(h2, h2, 9, 10, 'Sample');
    putH(h2, h3, 11, 11, 'Control Method');
    putH(h2, h3, 12, 12, 'Action');
    putH(h2, h3, 13, 13, 'Owner / Responsible');
    putH(h3, h3, 9, 9, 'Size');
    putH(h3, h3, 10, 10, 'Freq.');
    rowIndex += 3;

    const centerCols = new Set([0, 6, 9, 10]);
    let isZebra = false;
    let lastStep: string | null = null;

    rows.forEach(row => {
      const { step, isFirstStepRow, func, isFirstFuncRow, cause } = row;
      if (isFirstStepRow && step.id !== lastStep) { isZebra = !isZebra; lastStep = step.id; }
      const funcSpan = func ? funcRowSpans[func.id] : 1;

      const cells = [
        { v: step.operationNumber, first: isFirstStepRow, span: stepRowSpans[step.id] },
        { v: step.name, first: isFirstStepRow, span: stepRowSpans[step.id] },
        { v: step.machineDeviceSource || '', first: isFirstStepRow, span: stepRowSpans[step.id] },
        { v: '', first: isFirstFuncRow, span: funcSpan },
        { v: func?.productCharacteristic || '', first: isFirstFuncRow, span: funcSpan },
        { v: func?.name || '', first: isFirstFuncRow, span: funcSpan },
        { v: clsText(func?.classificationSymbolBefore || func?.classificationSymbolAfter), first: isFirstFuncRow, span: funcSpan },
        { v: func?.productSpecificationTolerance || '', first: isFirstFuncRow, span: funcSpan },
        { v: func?.evaluationMeasurementTechnique || '', first: isFirstFuncRow, span: funcSpan },
        { v: func?.sampleSize || '', first: isFirstFuncRow, span: funcSpan },
        { v: func?.sampleFrequency || '', first: isFirstFuncRow, span: funcSpan },
        { v: cause?.detectionControl || (isFirstFuncRow ? (func?.controlMethod || '') : '') },
        { v: (cause?.actions || []).map(a => a.actionTaken || a.description).filter(Boolean).join('; ') },
        { v: [...new Set((cause?.actions || []).map(a => a.responsiblePerson).filter(Boolean))].join(', ') },
      ];

      cells.forEach((cell, c) => {
        const base = centerCols.has(c) ? bodyCenterStyle : bodyStyle;
        const style: any = isZebra ? { ...base, ...zebraFill } : { ...base };
        if (cell.first === false) { ws[encCell(rowIndex, c)] = { v: '', t: 's', s: style }; return; }
        const value = cell.v === undefined || cell.v === null ? '' : cell.v;
        ws[encCell(rowIndex, c)] = { v: value, t: 's', s: style };
        if ((cell.span || 1) > 1) merges.push({ s: { r: rowIndex, c }, e: { r: rowIndex + cell.span! - 1, c } });
      });
      rowIndex++;
    });

    const cols = [12, 28, 18, 6, 22, 20, 10, 22, 24, 12, 12, 26, 22, 18];
    finalizeAndDownload(ws, merges, cols, LAST, rowIndex - 1, 'ControlPlan', `${fmea.project || 'fmea'}-ControlPlan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-700">Control Plan (CP) View</h2>
            <button onClick={handleExportToExcel} className="px-4 py-1.5 text-sm font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 shadow-sm">Export to Excel</button>
        </div>
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
                            <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.detectionControl || (isFirstFuncRow ? (func?.controlMethod || '—') : '')}</td>
                            <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{(cause?.actions || []).map(a => a.actionTaken || a.description).filter(Boolean).join('; ') || '—'}</td>
                            <td className={`${tdClass} ${cause ? tdClickableClass : ''}`} onClick={handleCauseClick}>{[...new Set((cause?.actions || []).map(a => a.responsiblePerson).filter(Boolean))].join(', ') || '—'}</td>
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