import React, { useMemo } from 'react';
import type { FmeaData, ModalType, ProcessItem, ProcessStep, ProcessStepFunction, FailureMode, FailureEffect, FailureCause, RegistryData, ProjectData, FmeaAction } from '../types';
import { ClassificationSymbol } from './ClassificationSymbol';
import { writeSanifoamAntet, fmeaIndir } from '../utils/excelExport';
import { sodPuan } from '../utils/sodAp';
import { fmeaGovdeYaz, ekSayfalar, FMEA_SAYFA, FMEA_SON_SUTUN } from '../utils/fmeaExcel';
import { initialApMatrix } from '../utils/ap-matrix';
import { vdaSeverityData } from './SeverityModal';
import { aiagVdaOccurrenceData } from './OccurrenceModal';
import { aiagVdaData } from './DetectionModal';

// Declare global variables for CDN scripts
declare const XLSX: any;
declare const jspdf: any;

interface FmeaTableProps {
  apMatrix?: ('H' | 'M' | 'L')[][][];
  data: FmeaData;
  registryData: RegistryData;
  projectData: ProjectData;
  onOpenModal: (modalInfo: ModalType) => void;
  onAddItem: (itemType: 'ProcessStep' | 'ProcessStepFunction' | 'FailureMode' | 'FailureCause', parentId: string, additionalInfo?: { functionId?: string }) => void;
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
  onDelete?: (itemType: string, itemId: string) => void;
  onOpenClassification?: (causeId: string, currentSymbol?: string) => void;
}

interface TableRow {
    item: ProcessItem;
    step: ProcessStep;
    func?: ProcessStepFunction;
    mode?: FailureMode;
    cause?: FailureCause;
    effects: FailureEffect[];
    isFirstStepRow: boolean;
    isFirstFuncRow: boolean;
    isFirstModeRow: boolean;
}

const getAPBackgroundColor = (ap?: any) => {
    const apString = String(ap || '');
    switch (apString.trim()) {
        case 'H': return 'bg-red-200';
        case 'M': return 'bg-yellow-200';
        case 'L':
        case '(L)':
            return 'bg-green-200';
        default: return '';
    }
};

const joinActionDetails = (actions: FmeaAction[] = [], field: keyof FmeaAction) => {
    return actions.map(a => a[field] || '—').join('\n');
};


const FmeaTable: React.FC<FmeaTableProps> = ({ data, apMatrix, registryData, projectData, onOpenModal, onAddItem, onOpenSeverityModal, onOpenOccurrenceModal, onOpenDetectionModal, onDelete, onOpenClassification }) => {
  // Özel karakteristik eşgüdümü: satır(neden) ana kaynak; fonksiyon seviyesinde
  // tanımlı (Flow'dan/fonksiyon modalından) ama hiçbir nedeninde sembol yoksa,
  // fonksiyonun ilk nedeninde göster (tüm satırlara yaymadan). Flow & FMEA tutarlı olur.
  const funcFallbackSym: Record<string, { causeId: string; symbol: string }> = {};
  Object.values(data.processStepFunctions).forEach((f: any) => {
    const sym = f.classificationSymbolBefore || f.classificationSymbolAfter;
    if (!(f.classificationSpecialCharacteristic && sym)) return;
    const causeIds = (f.failureModeIds || []).flatMap((mid: string) => data.failureModes[mid]?.causeIds || []);
    const anyCauseSym = causeIds.some((cid: string) => data.failureCauses[cid]?.classificationSymbol);
    if (!anyCauseSym && causeIds.length) funcFallbackSym[f.id] = { causeId: causeIds[0], symbol: sym };
  });
  // Bir satırda gösterilecek özel karakteristik sembolü
  const rowClsSymbol = (func?: any, cause?: any): string | undefined => {
    if (cause?.classificationSymbol) return cause.classificationSymbol;
    const fb = func && funcFallbackSym[func.id];
    return (fb && cause && fb.causeId === cause.id) ? fb.symbol : undefined;
  };

  const { rows, stepRowSpans, funcRowSpans, modeRowSpans } = useMemo(() => {
    const generatedRows: TableRow[] = [];
    const stepSpans: Record<string, number> = {};
    const funcSpans: Record<string, number> = {};
    const modeSpans: Record<string, number> = {};

    Object.values(data.processItems).forEach((item: ProcessItem) => {
        item.stepIds.forEach(stepId => {
            const step = data.processSteps[stepId];
            if (!step) return;

            let stepTotalRows = 0;
            if (step.functionIds.length > 0) {
                step.functionIds.forEach(funcId => {
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
                        stepTotalRows += funcSpans[funcId];
                    }
                });
            }
            stepSpans[step.id] = stepTotalRows > 0 ? stepTotalRows : 1;
        });
    });

    Object.values(data.processItems).forEach((item: ProcessItem) => {
        item.stepIds.forEach(stepId => {
            const step = data.processSteps[stepId];
            if (!step) return;

            let isFirstStepRow = true;
            
            if (step.functionIds.length === 0) {
                 generatedRows.push({ item, step, effects: [], isFirstStepRow, isFirstFuncRow: true, isFirstModeRow: true });
                 isFirstStepRow = false;
            } else {
                step.functionIds.forEach(funcId => {
                    const func = data.processStepFunctions[funcId];
                    if (!func) return;

                    let isFirstFuncRow = true;
                    if ((func.failureModeIds || []).length === 0) {
                         generatedRows.push({ item, step, func, effects: [], isFirstStepRow, isFirstFuncRow, isFirstModeRow: true });
                         isFirstStepRow = false;
                    } else {
                        func.failureModeIds.forEach(modeId => {
                            const mode = data.failureModes[modeId];
                            if (!mode) return;

                            let isFirstModeRow = true;
                            const effects = (mode.effectIds || []).map(id => data.failureEffects[id]).filter(Boolean);

                            if ((mode.causeIds || []).length === 0) {
                                generatedRows.push({ item, step, func, mode, effects, isFirstStepRow, isFirstFuncRow, isFirstModeRow });
                                isFirstStepRow = false;
                                isFirstFuncRow = false;
                            } else {
                                mode.causeIds.forEach(causeId => {
                                    const cause = data.failureCauses[causeId];
                                    if (cause) {
                                       generatedRows.push({ item, step, func, mode, cause, effects, isFirstStepRow, isFirstFuncRow, isFirstModeRow });
                                       isFirstStepRow = false;
                                       isFirstFuncRow = false;
                                       isFirstModeRow = false;
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    });

    return { rows: generatedRows, stepRowSpans: stepSpans, funcRowSpans: funcSpans, modeRowSpans: modeSpans };
  }, [data]);


  const clsLabel = (key?: string): string => {
    if (!key) return '';
    const sym = registryData.classificationSymbols?.find(s => s.key === key);
    return sym?.label || key;
  };

  const getExportData = (): (string | number | undefined)[][] => {
    return rows.map(row => {
        const { item, step, func, mode, cause, effects } = row;
        const effectSeverity = effects.map(e => e.severity).sort((a,b) => b-a)[0];
        const causeSeverity = cause?.severity;
        const displaySeverity = causeSeverity !== undefined ? causeSeverity : effectSeverity;
        const effectsText = effects.map(effect => `[${effect.clientType}] ${effect.effectText}`).join('\n');
        const preventionActions = cause?.actions?.filter(a => a.type === 'prevention') || [];
        const detectionActions = cause?.actions?.filter(a => a.type === 'detection') || [];
        
        return [
            item.name,
            `[${step.operationNumber}] ${step.name}`,
            cause?.processWorkElement,
            item.name,
            func ? `${func.name}\n${func.productCharacteristic || ''}` : '',
            cause?.workElementFunction,
            effectsText,
            displaySeverity,
            mode?.description,
            cause?.description,
            cause?.preventionControl,
            cause?.occurrence,
            cause?.detectionControl,
            cause?.detection,
            cause?.actionPriority,
            clsLabel(rowClsSymbol(func, cause)),
            cause?.filterCode,
            joinActionDetails(preventionActions, 'description'),
            joinActionDetails(detectionActions, 'description'),
            joinActionDetails(cause?.actions, 'responsiblePerson'),
            joinActionDetails(cause?.actions, 'targetCompletionDate'),
            joinActionDetails(cause?.actions, 'status'),
            joinActionDetails(cause?.actions, 'actionTaken'),
            joinActionDetails(cause?.actions, 'completionDate'),
            cause?.revisedSeverity,
            cause?.revisedOccurrence,
            cause?.revisedDetection,
            clsLabel(rowClsSymbol(func, cause)),
            cause?.revisedActionPriority ? `(${cause.revisedActionPriority})` : '',
            cause?.remarks,
        ];
    });
  };

  const handleExportToExcel = () => {
    const encodeCell = (r: number, c: number) => XLSX.utils.encode_cell({ r, c });

    const ws: { [key: string]: any } = {};
    const merges: any[] = [];
    let rowIndex = 0;
    const { fmea } = projectData;

    // --- STYLES ---
    const thinBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const titleStyle = { font: { sz: 16, bold: true }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder, fill: { fgColor: { rgb: "DDEBF7" } } };
    
    const projectHeaderKeyStyle = { font: { sz: 9, bold: true }, border: thinBorder, fill: { fgColor: { rgb: "E7E6E6" } }, alignment: { horizontal: 'right', vertical: 'center' } };
    const projectHeaderValueStyle = { font: { sz: 9 }, border: thinBorder, alignment: { vertical: 'center', wrapText: true } };
    
    const mainHeaderStyle = { font: { sz: 8, color: { rgb: "FFFFFF" }, bold: true }, fill: { fgColor: { rgb: "17365D" } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: thinBorder };
    
    const defaultCellStyle = { font: { sz: 9 }, border: thinBorder, alignment: { vertical: 'top', wrapText: true } };
    const numericCellStyle = { ...defaultCellStyle, alignment: { ...defaultCellStyle.alignment, horizontal: 'center' } };
    const zebraFill = { fill: { fgColor: { rgb: "F2F2F2" } } };
    
    const apHFill = { fgColor: { rgb: "FFC7CE" } };
    const apMFill = { fgColor: { rgb: "FFEB9C" } };
    const apLFill = { fgColor: { rgb: "C6EFCE" } };

    const getApFill = (ap?: any) => {
        // Revize AP değerleri parantezli gelir ("(M)","(H)","(L)") — parantezleri sıyırıp eşleştir ki o sütun da renklensin.
        const apString = String(ap || '').replace(/[()]/g, '').trim().toUpperCase();
        switch(apString) {
            case 'H': return apHFill;
            case 'M': return apMFill;
            case 'L': return apLFill;
            default: return undefined;
        }
    };
    
    // --- SANIFOAM ANTET (paylaşılan helper) — Rev 7, Yürürlük 02.01.2025 ---
    rowIndex = writeSanifoamAntet(ws, merges, {
        title: 'PROCESS FAILURE MODES & EFFECTS ANALYSIS\n(PROSES FMEA)',
        docNo: 'FR 34', rev: '4', date: '02.01.2025', sayfa: '1/1', lastCol: 29,
    });

    // --- MAIN TITLE ---
    ws[encodeCell(rowIndex, 0)] = { v: 'Process Failure Mode and Effects Analysis (Process FMEA)', t: 's', s: titleStyle };
    merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex, c: 29 } });
    rowIndex += 2;

    // --- PROJECT INFO HEADER ---
    const writeHeaderField = (r: number, c: number, label: string, value: any) => {
        ws[encodeCell(r, c)] = { v: label, t: 's', s: projectHeaderKeyStyle };
        ws[encodeCell(r, c + 1)] = { v: value || '-', t: 's', s: projectHeaderValueStyle };
        merges.push({ s: { r: r, c: c + 1 }, e: { r: r, c: c + 4 } });
    };

    const headerDetails = [
        ['Project:', fmea.project], ['Client:', fmea.client], ['Number/Name of product:', fmea.productName],
        ['Project ID:', fmea.projectId], ['Engineering Location:', fmea.engineeringLocation], ['Date of first FMEA:', fmea.firstFmeaDate],
        ['Person responsible:', fmea.personResponsible], ['FMEA Creator:', fmea.fmeaCreator], ['Last revision date:', fmea.lastRevisionDate],
        ['FMEA Number /Version:', fmea.fmeaNumberVersion], ['FMEA Approver:', fmea.fmeaApprover], ['Company name:', fmea.companyName],
    ];

    for (let i = 0; i < 4; i++) {
        writeHeaderField(rowIndex, 0, headerDetails[i][0], headerDetails[i][1]);
        writeHeaderField(rowIndex, 6, headerDetails[i+4][0], headerDetails[i+4][1]);
        writeHeaderField(rowIndex, 12, headerDetails[i+8][0], headerDetails[i+8][1]);
        rowIndex++;
    }

    if (fmea.teamMembers) {
        ws[encodeCell(rowIndex, 0)] = { v: 'Team members:', t: 's', s: projectHeaderKeyStyle };
        ws[encodeCell(rowIndex, 1)] = { v: fmea.teamMembers, t: 's', s: projectHeaderValueStyle };
        merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 29 } });
        rowIndex++;
    }
     if (fmea.notes) {
        ws[encodeCell(rowIndex, 0)] = { v: 'Notes/comments:', t: 's', s: projectHeaderKeyStyle };
        ws[encodeCell(rowIndex, 1)] = { v: fmea.notes, t: 's', s: projectHeaderValueStyle };
        merges.push({ s: { r: rowIndex, c: 1 }, e: { r: rowIndex, c: 29 } });
        rowIndex++;
    }
    rowIndex++;

    // --- GÖVDE: Excel TABLOSU (satır ekle/sil, kademe listeleri, Görevler sekmesi) — utils/fmeaExcel.ts ---
    let isZebra = false;
    let lastStepId: string | null = null;
    const zebra: boolean[] = [];
    const satirlar = rows.map(row => {
        const { item, step, func, mode, cause, effects, isFirstStepRow } = row;
        if (isFirstStepRow && step.id !== lastStepId) { isZebra = !isZebra; lastStepId = step.id; }
        zebra.push(isZebra);
        const preventionActions = cause?.actions?.filter(a => a.type === 'prevention') || [];
        const detectionActions = cause?.actions?.filter(a => a.type === 'detection') || [];
        // Her satır tam değer taşır (birleşik hücre yok): tablo süzülür/sıralanır, satır eklenip silinir.
        return [
            item.name,
            `[${step.operationNumber}] ${step.name}`,
            cause?.processWorkElement,
            item.name,
            func ? `${func.name}\n${func.productCharacteristic || ''}`.trim() : '',
            cause?.workElementFunction,
            effects.map(e => `[${e.clientType}] ${e.effectText}`).join('\n'),
            sodPuan(cause?.severity ?? (effects.length > 0 ? Math.max(...effects.map(e => e.severity || 0)) : undefined)),
            mode?.description,
            cause?.description,
            cause?.preventionControl,
            sodPuan(cause?.occurrence),
            cause?.detectionControl,
            sodPuan(cause?.detection),
            cause?.actionPriority,
            clsLabel(rowClsSymbol(func, cause)),
            cause?.filterCode,
            joinActionDetails(preventionActions, 'description'),
            joinActionDetails(detectionActions, 'description'),
            joinActionDetails(cause?.actions, 'responsiblePerson'),
            joinActionDetails(cause?.actions, 'targetCompletionDate'),
            joinActionDetails(cause?.actions, 'status'),
            joinActionDetails(cause?.actions, 'actionTaken'),
            joinActionDetails(cause?.actions, 'completionDate'),
            sodPuan(cause?.revisedSeverity),
            sodPuan(cause?.revisedOccurrence),
            sodPuan(cause?.revisedDetection),
            clsLabel(rowClsSymbol(func, cause)),
            cause?.revisedActionPriority ? `(${cause.revisedActionPriority})` : '',
            cause?.remarks,
        ].map(v => (v === undefined || v === null ? '' : v));
    });
    const tabloUstu = rowIndex;
    const ayar = fmeaGovdeYaz(XLSX, ws, merges, rowIndex, satirlar, zebra);

    // Antet / proje bilgisi alanında çizgi eksiği kalmasın
    for (let r = 0; r < tabloUstu; r++) {
        for (let c = 0; c <= 29; c++) {
            const a = encodeCell(r, c);
            if (!ws[a]) ws[a] = { v: '', t: 's', s: { border: thinBorder } };
        }
    }
    ws['!merges'] = merges;
    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: FMEA_SON_SUTUN, r: ayar.son - 1 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, FMEA_SAYFA);

    // S-O-D kriter tabloları (açılır listenin ipucu bu sayfayı gösterir)
    const kriter: any[][] = [['ŞİDDET (S) — AIAG-VDA PFMEA'], ['S', 'Etki', 'Tesis içi (plant)', 'Sevk / müşteri tesisi', 'Son kullanıcı']];
    vdaSeverityData.forEach(x => kriter.push([x.s, x.effect, x.plant, x.ship, x.user]));
    kriter.push([], ['OLUŞMA (O)'], ['O', 'Olasılık', 'Sıklık']);
    aiagVdaOccurrenceData.forEach(x => kriter.push([x.scale, x.probability, x.frequency]));
    kriter.push([], ['TESPİT (D)'], ['D', 'Tespit yeteneği', 'Yöntem olgunluğu', 'Tespit fırsatı']);
    aiagVdaData.forEach(x => kriter.push([x.d, x.ability, x.maturity, x.opportunity]));
    ekSayfalar(XLSX, wb, satirlar, apMatrix || initialApMatrix, kriter);

    fmeaIndir(wb, `${fmea.project || 'fmea'}-export-${new Date().toISOString().slice(0, 10)}.xlsx`, ayar);
  };

  // jsPDF standart fontu Türkçe karakter desteklemez (ı,ş,ğ,ü,ö,ç bozulur ve metin harf-harf yayılır).
  // Çözüm: PDF'e giden metni ASCII'ye çevir (Altıntaş -> Altintas). Excel'de bu sorun yok (Türkçe korunur).
  const TR_MAP: { [k: string]: string } = { 'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U','â':'a','î':'i','û':'u' };
  const tr = (s: any): string => String(s == null ? '' : s).replace(/[çÇğĞıİöÖşŞüÜâîû]/g, ch => TR_MAP[ch] || ch);
  const trCell = (data: any) => { if (data?.cell?.text) data.cell.text = (data.cell.text || []).map((ln: any) => tr(ln)); };

  const handleExportToPdf = () => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
    const { fmea } = projectData;

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 40;
    let lastY = 20;

    // --- PDF Header ---

    // Logo on the left
    if (fmea.logo && typeof fmea.logo === 'string' && fmea.logo.startsWith('data:image')) {
      const parts = fmea.logo.split(',');
      // Ensure the data URI has a valid format and the base64 part is not empty.
      if (parts.length === 2 && parts[1] && parts[1].trim().length > 0) {
        try {
          doc.addImage(fmea.logo, margin, lastY, 50, 50);
        } catch (e) {
          console.error("Error adding logo to PDF: The logo data might be corrupt. Skipping logo.", e);
        }
      }
    }
    
    // Main Title in the center
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Process Failure Mode and Effects Analysis (Process FMEA)', pageWidth / 2, lastY + 25, { align: 'center' });

    lastY += 55; // Move below logo/title

    // Sub-header info: Confidentiality & FMEA Type
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const confidentialityText = `Confidentiality level: ${fmea.confidentialityLevel || '-'}`;
    const processFmeaText = `Process FMEA: ${fmea.processFmea || '-'}`;
    doc.text(confidentialityText, margin, lastY);
    doc.text(processFmeaText, margin + 250, lastY);

    lastY += 15;

    // Header data table using autoTable for clean layout
    const headerDataBody = [
        ['Project:', fmea.project || '-', 'Project ID:', fmea.projectId || '-'],
        ['Client:', fmea.client || '-', 'Engineering Location:', fmea.engineeringLocation || '-'],
        ['Person responsible:', fmea.personResponsible || '-', 'FMEA Number /Version:', fmea.fmeaNumberVersion || '-'],
        ['Number/Name of product:', fmea.productName || '-', 'Date of first FMEA:', fmea.firstFmeaDate || '-'],
        ['FMEA Creator:', fmea.fmeaCreator || '-', 'FMEA Approver:', fmea.fmeaApprover || '-'],
        ['Last revision date:', fmea.lastRevisionDate || '-', 'Company name:', fmea.companyName || '-'],
    ];

    (doc as any).autoTable({
        body: headerDataBody.map((r: any[]) => r.map(tr)),
        startY: lastY,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 120 },
            1: { cellWidth: 250 },
            2: { fontStyle: 'bold', cellWidth: 120 },
            3: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => {
            lastY = data.cursor.y;
        }
    });

    // Team members and Notes (if they exist)
    if (fmea.teamMembers) {
      (doc as any).autoTable({
        body: [
            [{ content: 'Team members:', styles: { fontStyle: 'bold' }}, { content: tr(fmea.teamMembers) }],
        ],
        startY: lastY,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 120 } },
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => { lastY = data.cursor.y; }
      });
    }

     if (fmea.notes) {
       (doc as any).autoTable({
        body: [
            [{ content: 'Notes/comments:', styles: { fontStyle: 'bold' }}, { content: tr(fmea.notes) }],
        ],
        startY: lastY,
        theme: 'plain',
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 120 } },
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => { lastY = data.cursor.y; }
      });
    }

    // --- Main FMEA Table ---
    const headerRow1 = [
        { content: 'Structure analysis (Step 2)', colSpan: 3 },
        { content: 'Function analysis (Step 3)', colSpan: 3 },
        { content: 'Failure analysis (Step 4)', colSpan: 4 },
        { content: 'Risk analysis (Step 5)', colSpan: 7 },
        { content: 'Optimization (Step 6)', colSpan: 13 },
    ];
    const headerRow2 = [
      "1. Process Item System, Subsystem, Part Element or Name of Process", "2. Process Step Station No. and Name of Focus Element", "3. Process Work Element 4M Type",
      "1. Function of the Process Item Function of System, Subsystem, Part Element or Process", "2. Function of the Process Step and Product Characteristic", "3. Function of the Process Work Element and Process Characteristic",
      "1. Failure Effect (FE) for the Next Higher Level and/or End User", "Severity (S) of FE", "2. Failure Mode (FM) of the Focus Element", "3. Failure Cause (FC) of the Work Element",
      "Current Prevention Control (PC) of FC", "Occurrence (O) of FC", "Current Detection Control (DC) of FC or FM", "Detection (D) of FC/FM", "PFMEA AP",
      "Spec. Characteristic", "Filter Code (Optional)", "Prevention Action", "Detection Action", "Responsible Person's Name", "Target Completion Date", "Status",
      "Action Taken with Pointer to Evidence", "Completion Date", "Severity (S) (Revised)", "Occurrence (O) (Revised)", "Detection (D) (Revised)", "Spec. Characteristic (Revised)",
      "PFMEA AP (Revised)", "Remarks"
    ];
    const tableData = getExportData();

    (doc as any).autoTable({
      head: [headerRow1, headerRow2],
      body: tableData,
      startY: lastY + 10,
      theme: 'grid',
      styles: {
        fontSize: 5,
        cellPadding: 2,
        overflow: 'linebreak',
        lineColor: [110, 110, 110], // belirgin grid/tablo çizgileri
        lineWidth: 0.35,
        textColor: [20, 20, 20],
      },
      headStyles: {
        fillColor: [23, 54, 93], // Dark blue
        textColor: 255,
        fontStyle: 'bold',
        valign: 'middle',
      },
      didParseCell: function (data: any) {
        trCell(data); // Türkçe -> ASCII (font sorunu)
        if (data.row.section === 'head') {
            data.cell.styles.halign = 'center';
            if (data.row.index === 0) {
                data.cell.styles.fontSize = 6;
                // Add thin white separator lines between the main step headers
                if (data.column.index < headerRow1.length - 1) { // Exclude the last cell
                    data.cell.styles.lineColor = [255, 255, 255]; // White color for the line
                    data.cell.styles.lineWidth = { right: 0.5 }; // Apply a thin line to the right of the cell
                }
            }
            if (data.row.index === 1) {
                data.cell.styles.fontSize = 4;
            }
        }
        if (data.row.section === 'body') {
            const ap = (data.cell.text || []).join('').replace(/[()]/g, '').trim().toUpperCase();
            if (ap === 'H') { data.cell.styles.fillColor = [255, 199, 206]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.halign = 'center'; }
            else if (ap === 'M') { data.cell.styles.fillColor = [255, 235, 156]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.halign = 'center'; }
            else if (ap === 'L') { data.cell.styles.fillColor = [198, 239, 206]; data.cell.styles.fontStyle = 'bold'; data.cell.styles.halign = 'center'; }
        }
      },
    });

    doc.save(`fmea-export-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const thClass = "p-2 border-l border-r border-white/30 text-xs font-bold uppercase tracking-wider align-top";
  const tdClass = "p-2 border border-gray-400 text-xs align-top";
  const tdClickableClass = "cursor-pointer hover:bg-blue-100 transition-colors";

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-700 print:hidden">AIAG & VDA View</h2>
            <table className="min-w-full border-collapse border border-gray-400">
                <thead className="bg-blue-800 text-white text-center">
                    <tr>
                        <th className={thClass} colSpan={3}>Structure analysis (Step 2)</th>
                        <th className={thClass} colSpan={3}>Function analysis (Step 3)</th>
                        <th className={thClass} colSpan={4}>Failure analysis (Step 4)</th>
                        <th className={thClass} colSpan={7}>Risk analysis (Step 5)</th>
                        <th className="bg-white w-4 print:hidden"></th>
                        <th className={thClass} colSpan={13}>Optimization (Step 6)</th>
                        {onDelete && <th rowSpan={2} className={`${thClass} print:hidden`}>İşlem</th>}
                    </tr>
                    <tr>
                        <th className={thClass} rowSpan={2}>1. Process Item System, Subsystem, Part Element or Name of Process</th>
                        <th className={thClass} rowSpan={2}>2. Process Step Station No. and Name of Focus Element</th>
                        <th className={thClass} rowSpan={2}>3. Process Work Element 4M Type</th>
                        <th className={thClass} rowSpan={2}>1. Function of the Process Item Function of System, Subsystem, Part Element or Process</th>
                        <th className={thClass} rowSpan={2}>2. Function of the Process Step and Product Characteristic (Quantitative value is optional)</th>
                        <th className={thClass} rowSpan={2}>3. Function of the Process Work Element and Process Characteristic</th>
                        <th className={thClass} rowSpan={2}>1. Failure Effect (FE) for the Next Higher Level and/or End User</th>
                        <th className={thClass} rowSpan={2}>Severity (S) of FE</th>
                        <th className={thClass} rowSpan={2}>2. Failure Mode (FM) of the Focus Element</th>
                        <th className={thClass} rowSpan={2}>3. Failure Cause (FC) of the Work Element</th>

                        <th className={thClass} colSpan={1}>Current Prevention Control (PC) of FC</th>
                        <th className={thClass} rowSpan={2}>Occurrence (O) of FC</th>
                        <th className={thClass} colSpan={1}>Current Detection Control (DC) of FC or FM</th>
                        <th className={thClass} rowSpan={2}>Detection (D) of FC/FM</th>
                        <th className={thClass} rowSpan={2}>PFMEA AP</th>
                        <th className={thClass} rowSpan={2}>Spec. Characteristic</th>
                        <th className={thClass} rowSpan={2}>Filter Code (Optional)</th>
                        
                        <th className="bg-white print:hidden"></th>
                        
                        <th className={thClass} colSpan={1}>Prevention Action</th>
                        <th className={thClass} colSpan={1}>Detection Action</th>
                        <th className={thClass} rowSpan={2}>Responsible Person's Name</th>
                        <th className={thClass} rowSpan={2}>Target Completion Date</th>
                        <th className={thClass} rowSpan={2}>Status</th>
                        <th className={thClass} rowSpan={2}>Action Taken with Pointer to Evidence</th>
                        <th className={thClass} rowSpan={2}>Completion Date</th>
                        <th className={thClass} rowSpan={2}>Severity (S)</th>
                        <th className={thClass} rowSpan={2}>Occurrence (O)</th>
                        <th className={thClass} rowSpan={2}>Detection (D)</th>
                        <th className={thClass} rowSpan={2}>Spec. Characteristic</th>
                        <th className={thClass} rowSpan={2}>PFMEA AP</th>
                        <th className={thClass} rowSpan={2}>Remarks</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => {
                        const key = `${row.item.id}-${row.step.id}-${row.func?.id || 'f'}-${row.mode?.id || 'm'}-${row.cause?.id || 'c'}-${index}`;
                        const { item, step, func, mode, cause, effects, isFirstStepRow, isFirstFuncRow, isFirstModeRow } = row;

                        const handleFuncClick = () => {
                            if (row.func) {
                                onOpenModal({ type: 'ProcessStepFunction', parentId: row.step.id, data: row.func });
                            } else if (row.step) {
                                onAddItem('ProcessStepFunction', row.step.id);
                            }
                        };

                        const handleModeClick = () => {
                            if (row.mode) {
                                onOpenModal({ type: 'FailureMode', parentId: row.func!.id, data: row.mode });
                            } else if (row.func) {
                                onAddItem('FailureMode', row.func.id);
                            }
                        };

                        const handleEffectClick = (effect?: FailureEffect) => {
                            if (row.mode && row.func) {
                                onOpenModal({ type: 'FailureEffect', parentId: row.mode.id, functionId: row.func.id, data: effect });
                            }
                        };
                        
                        const handleCauseClick = () => {
                            if (row.cause) {
                                onOpenModal({ type: 'FailureCause', parentId: row.mode!.id, functionId: row.func!.id, data: row.cause });
                            } else if (row.mode && row.func) {
                                onAddItem('FailureCause', row.mode.id, { functionId: row.func.id });
                            }
                        };
                        
                        const isFuncCellClickable = !!row.step;
                        const isModeCellClickable = !!row.func;
                        const isEffectCellClickable = !!row.mode;
                        const isCauseCellClickable = !!row.mode;
                        
                        const effectSeverity = row.effects.map(e => e.severity).sort((a,b) => b-a)[0];
                        const causeSeverity = row.cause?.severity;
                        const displaySeverity = causeSeverity !== undefined ? causeSeverity : effectSeverity;

                        const preventionActions = cause?.actions?.filter(a => a.type === 'prevention') || [];
                        const detectionActions = cause?.actions?.filter(a => a.type === 'detection') || [];

                        return (
                        <tr key={key} className="hover:bg-gray-50 even:bg-white odd:bg-gray-50">
                            {/* Structure Analysis */}
                            {isFirstStepRow && <td rowSpan={stepRowSpans[step.id]} className={`${tdClass} ${tdClickableClass}`} onClick={() => onOpenModal({ type: 'ProcessItem', data: item })}>{item.name}</td>}
                            {isFirstStepRow && <td rowSpan={stepRowSpans[step.id]} className={`${tdClass} ${tdClickableClass}`} onClick={() => onOpenModal({ type: 'ProcessStep', parentId: item.id, data: step })}>{`[${step.operationNumber}] ${step.name}`}</td>}
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.processWorkElement || '—'}</td>
                            
                            {/* Function Analysis */}
                            {isFirstStepRow && <td rowSpan={stepRowSpans[step.id]} className={`${tdClass} ${tdClickableClass}`} onClick={() => onOpenModal({ type: 'ProcessItem', data: item })}>{item.name}</td>}
                            {isFirstFuncRow && <td rowSpan={funcRowSpans[func?.id] || 1} className={`${tdClass} ${isFuncCellClickable ? tdClickableClass : ''}`} onClick={handleFuncClick}>
                                {func ? <><div><strong>{func.name}</strong></div><div>{func.productCharacteristic}</div></> : '—' }
                            </td>}
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.workElementFunction || '—'}</td>
                            
                            {/* Failure Analysis */}
                            {isFirstModeRow && <td rowSpan={modeRowSpans[mode?.id] || 1} className={tdClass} onClick={() => effects.length === 0 && handleEffectClick()}>
                                {effects.length > 0 ? effects.map(effect => (
                                    <div key={effect.id} className={`${isEffectCellClickable ? tdClickableClass : ''} p-1 my-1 -m-1 rounded`} onClick={(e) => { e.stopPropagation(); handleEffectClick(effect); }}>
                                        {`[${effect.clientType}] ${effect.effectText}`}
                                    </div>
                                )) : <div className={`${isEffectCellClickable ? tdClickableClass : ''} p-1 my-1 -m-1`}>—</div>}
                            </td>}
                            <td 
                                className={`${tdClass} text-center font-bold ${isCauseCellClickable ? tdClickableClass : ''}`}
                                onClick={() => {
                                    if (cause) {
                                        onOpenSeverityModal({
                                            targetType: 'cause',
                                            targetId: cause.id,
                                            field: 'severity',
                                            currentValue: displaySeverity
                                        });
                                    }
                                }}
                                title={causeSeverity !== undefined ? 'Cause-specific severity. Click to edit.' : 'Inherited severity. Click to set a cause-specific override.'}
                            >
                                {displaySeverity || '—'}
                            </td>
                            {isFirstModeRow && <td rowSpan={modeRowSpans[mode?.id] || 1} className={`${tdClass} ${isModeCellClickable ? tdClickableClass : ''}`} onClick={handleModeClick}>{mode?.description || '—'}</td>}
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.description || '—'}</td>
                            
                            {/* Risk Analysis */}
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.preventionControl || '—'}</td>
                            <td className={`${tdClass} text-center font-bold ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={() => cause && onOpenOccurrenceModal({ targetId: cause.id, field: 'occurrence', currentValue: cause.occurrence })}>{cause?.occurrence || '—'}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.detectionControl || '—'}</td>
                            <td className={`${tdClass} text-center font-bold ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={() => cause && onOpenDetectionModal({ targetId: cause.id, field: 'detection', currentValue: cause.detection })}>{cause?.detection || '—'}</td>
                            <td className={`${tdClass} text-center font-bold ${getAPBackgroundColor(cause?.actionPriority)} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.actionPriority || '—'}</td>
                            <td className={`${tdClass} text-center ${cause && onOpenClassification ? tdClickableClass : ''}`} onClick={() => cause && onOpenClassification && onOpenClassification(cause.id, cause.classificationSymbol)} title="Özel karakteristik sembolü (bu satır için) — tıklayarak ata/temizle">
                                {rowClsSymbol(func, cause) ? <ClassificationSymbol symbolKey={rowClsSymbol(func, cause)} registryData={registryData} /> : (cause ? '—' : '')}
                            </td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.filterCode || '—'}</td>

                            <td className="bg-white print:hidden"></td>

                            {/* Optimization */}
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(preventionActions, 'description')}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(detectionActions, 'description')}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(cause?.actions, 'responsiblePerson')}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(cause?.actions, 'targetCompletionDate')}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(cause?.actions, 'status')}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(cause?.actions, 'actionTaken')}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{joinActionDetails(cause?.actions, 'completionDate')}</td>
                            <td 
                                className={`${tdClass} text-center font-bold ${isCauseCellClickable ? tdClickableClass : ''}`} 
                                onClick={() => {
                                    if (cause) {
                                        onOpenSeverityModal({
                                            targetType: 'cause',
                                            targetId: cause.id,
                                            field: 'revisedSeverity',
                                            currentValue: cause.revisedSeverity,
                                        });
                                    } else {
                                        handleCauseClick(); // Fallback to create cause
                                    }
                                }}
                            >
                                {cause?.revisedSeverity || '—'}
                            </td>
                            <td className={`${tdClass} text-center font-bold ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={() => cause && onOpenOccurrenceModal({ targetId: cause.id, field: 'revisedOccurrence', currentValue: cause.revisedOccurrence })}>{cause?.revisedOccurrence || '—'}</td>
                            <td className={`${tdClass} text-center font-bold ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={() => cause && onOpenDetectionModal({ targetId: cause.id, field: 'revisedDetection', currentValue: cause.revisedDetection })}>{cause?.revisedDetection || '—'}</td>
                            <td className={`${tdClass} text-center ${cause && onOpenClassification ? tdClickableClass : ''}`} onClick={() => cause && onOpenClassification && onOpenClassification(cause.id, cause.classificationSymbol)} title="Özel karakteristik sembolü (bu satır için) — tıklayarak ata/temizle">
                                {rowClsSymbol(func, cause) ? <ClassificationSymbol symbolKey={rowClsSymbol(func, cause)} registryData={registryData} /> : (cause ? '—' : '')}
                            </td>
                            <td className={`${tdClass} text-center font-bold ${getAPBackgroundColor(cause?.revisedActionPriority)} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.revisedActionPriority ? `(${cause.revisedActionPriority})` : '—'}</td>
                            <td className={`${tdClass} ${isCauseCellClickable ? tdClickableClass : ''}`} onClick={handleCauseClick}>{cause?.remarks || '—'}</td>
                            {onDelete && (
                                <td className="border border-gray-400 p-1 text-center align-middle print:hidden">
                                    {cause ? (
                                        <button
                                            title="Bu satırı (hata nedenini) sil"
                                            onClick={(e) => { e.stopPropagation(); if (window.confirm(`Bu satırı silmek istediğinize emin misiniz?\n\nHata Nedeni: "${cause.description || '—'}"`)) onDelete('FailureCause', cause.id); }}
                                            className="text-red-500 hover:text-white hover:bg-red-600 rounded px-2 py-1 text-sm transition-colors"
                                        >🗑</button>
                                    ) : mode ? (
                                        <button
                                            title="Bu hata modunu (ve alt satırlarını) sil"
                                            onClick={(e) => { e.stopPropagation(); if (window.confirm(`Bu hata modunu ve altındaki tüm nedenleri silmek istediğinize emin misiniz?\n\nHata Modu: "${mode.description || '—'}"`)) onDelete('FailureMode', mode.id); }}
                                            className="text-red-500 hover:text-white hover:bg-red-600 rounded px-2 py-1 text-sm transition-colors"
                                        >🗑</button>
                                    ) : null}
                                </td>
                            )}
                        </tr>
                    )})}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={31} className="px-6 py-4 text-center text-gray-500">No data to display.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="mt-6 flex justify-end space-x-2 print:hidden">
            <button 
                onClick={handleExportToExcel}
                className="px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-green-700 hover:bg-green-800 shadow-sm"
            >
                Export to Excel (.xlsx)
            </button>
            <button 
                onClick={handleExportToPdf} 
                className="px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-red-600 hover:bg-red-700 shadow-sm"
            >
                Export to PDF
            </button>
      </div>
    </div>
  );
};

export default FmeaTable;