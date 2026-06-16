import React, { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import type { FmeaData, ModalType, ProcessItem, ProcessStep, ProcessStepFunction, RegistryData, ProjectData } from '../types';
import { ClassificationSymbol } from './ClassificationSymbol';
import { SvgIconRenderer } from './icons/Icons';
import { encCell, writeSanifoamAntet, writeProjectInfoLine, finalizeAndDownload, headerBandStyle, bodyStyle, bodyCenterStyle, zebraFill } from '../utils/excelExport';

declare const jspdf: any;

interface FlowDiagramViewProps {
  data: FmeaData;
  registryData: RegistryData;
  projectData: ProjectData;
  onDataChange: (newData: FmeaData) => void;
  onOpenModal: (modalInfo: ModalType) => void;
  onAddNewFunctionWithSymbol: (stepId: string, symbolKey: string) => void;
}

const FlowDiagramView: React.FC<FlowDiagramViewProps> = ({ data, registryData, projectData, onDataChange, onOpenModal, onAddNewFunctionWithSymbol }) => {
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

    // Bir adımın ÖZEL KARAKTERİSTİK'i: gösterilen kutu-fonksiyonda yoksa, AYNI adımın
    // diğer (kutusuz) karakteristik fonksiyonlarından (ör. yanma hızı) devralınır.
    // Böylece flow kutusu olmayan bir karakteristiğe atanmış sembol de o op satırında görünür.
    const effectiveClsSymbol = (step: ProcessStep, ownKey: string | undefined, field: 'classificationSymbolBefore' | 'classificationSymbolAfter'): string | undefined => {
        if (ownKey) return ownKey;
        for (const fid of step.functionIds) {
            const f = data.processStepFunctions[fid] as ProcessStepFunction | undefined;
            const k = f && (f as any)[field];
            if (k) return k;
        }
        return undefined;
    };

    const renderedRows = Object.values(data.processItems).flatMap((item: ProcessItem) =>
        item.stepIds.map(stepId => {
            const step = data.processSteps[stepId];
            if (!step) return null;

            // Akış şemasında YALNIZCA ana prosesler (flowchart sembolü atanmış fonksiyonlar) gösterilir; ara karakteristik satırları gizlenir.
            const stepFunctions = step.functionIds.map(fid => data.processStepFunctions[fid]).filter(Boolean).filter((f: ProcessStepFunction) => !!f.flowchartSymbol);

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
                    <td className={`${tdClass} text-center align-middle cursor-pointer hover:bg-blue-100`} onClick={() => handleFuncClick(func)}><ClassificationSymbol symbolKey={effectiveClsSymbol(step, func.classificationSymbolBefore, 'classificationSymbolBefore')} registryData={registryData} /></td>
                    <td className={`${tdClass} text-center align-middle cursor-pointer hover:bg-blue-100`} onClick={() => handleFuncClick(func)}><ClassificationSymbol symbolKey={effectiveClsSymbol(step, func.classificationSymbolAfter, 'classificationSymbolAfter')} registryData={registryData} /></td>
                    <td className={`${tdClass} p-2 align-middle cursor-pointer hover:bg-blue-100`} onClick={() => handleFuncClick(func)}>{func.processDescription || func.name}</td>
                </tr>
            ));
        })
    ).filter(Boolean);

    const clsText = (key?: string) => {
        if (!key) return '';
        const c = registryData.classificationSymbols?.find(s => s.key === key);
        return c?.label || key;
    };

    // --- Akış Şeması -> antetli, biçimlendirilmiş Excel (yalnızca ana prosesler) ---
    const handleExportToExcel = () => {
        const fmea = projectData.fmea;
        const symbols = registryData.flowchartSymbols || [];
        const nSym = symbols.length;
        const COL_OZEL = nSym + 1, COL_IYI = nSym + 2, COL_ACIK = nSym + 3;
        const LAST = nSym + 3;
        const ws: { [k: string]: any } = {};
        const merges: any[] = [];

        let rowIndex = writeSanifoamAntet(ws, merges, {
            title: 'PROCESS FLOW DIAGRAM\n(PROSES AKIS SEMASI)',
            docNo: 'FR 33', rev: '4', date: '02.01.2025', sayfa: '1/1', lastCol: LAST,
        });
        rowIndex = writeProjectInfoLine(ws, merges, rowIndex, LAST, [
            `Proje: ${fmea.project || '-'}`, `Urun: ${fmea.productName || '-'}`,
            `Musteri: ${fmea.client || '-'}`, `Rev. Tarihi: ${fmea.lastRevisionDate || '-'}`,
        ]);

        // Başlık bandı (2 satır)
        const h1 = rowIndex, h2 = rowIndex + 1;
        const putH = (r0: number, r1: number, c0: number, c1: number, v: string) => {
            ws[encCell(r0, c0)] = { v, t: 's', s: headerBandStyle };
            if (r1 > r0 || c1 > c0) merges.push({ s: { r: r0, c: c0 }, e: { r: r1, c: c1 } });
            for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!(r === r0 && c === c0)) ws[encCell(r, c)] = { v: '', t: 's', s: headerBandStyle };
        };
        putH(h1, h1, 0, nSym, 'Akış Çizelgesi');
        putH(h1, h2, COL_OZEL, COL_OZEL, 'Özel Karakteristik');
        putH(h1, h2, COL_IYI, COL_IYI, 'İyileştirme Sonrası Özel Karakteristik');
        putH(h1, h2, COL_ACIK, COL_ACIK, 'Proses Açıklama');
        putH(h2, h2, 0, 0, 'Proses No');
        symbols.forEach((s, i) => putH(h2, h2, i + 1, i + 1, s.label));
        rowIndex += 2;

        // Yalnızca ana prosesler (flowchart sembolü atanmış fonksiyonlar)
        const flowRows: { step: ProcessStep; func: ProcessStepFunction; first: boolean; span: number }[] = [];
        (Object.values(data.processItems) as ProcessItem[]).forEach(item => {
            item.stepIds.forEach(sid => {
                const step = data.processSteps[sid];
                if (!step) return;
                const funcs = step.functionIds.map(fid => data.processStepFunctions[fid]).filter(Boolean).filter((f: ProcessStepFunction) => !!f.flowchartSymbol);
                funcs.forEach((func, i) => flowRows.push({ step, func, first: i === 0, span: funcs.length }));
            });
        });

        let isZebra = false;
        let lastStep: string | null = null;
        flowRows.forEach(({ step, func, first, span }) => {
            if (first && step.id !== lastStep) { isZebra = !isZebra; lastStep = step.id; }
            const z = (st: any) => isZebra ? { ...st, ...zebraFill } : { ...st };

            // Proses No (step bazlı, birleştirilmiş)
            if (first) {
                ws[encCell(rowIndex, 0)] = { v: step.operationNumber || '', t: 's', s: z(bodyCenterStyle) };
                if (span > 1) merges.push({ s: { r: rowIndex, c: 0 }, e: { r: rowIndex + span - 1, c: 0 } });
            } else {
                ws[encCell(rowIndex, 0)] = { v: '', t: 's', s: z(bodyCenterStyle) };
            }
            // Sembol kolonları: eşleşen sembolde ●
            symbols.forEach((s, i) => {
                ws[encCell(rowIndex, i + 1)] = { v: func.flowchartSymbol === s.key ? '●' : '', t: 's', s: z(bodyCenterStyle) };
            });
            ws[encCell(rowIndex, COL_OZEL)] = { v: clsText(effectiveClsSymbol(step, func.classificationSymbolBefore, 'classificationSymbolBefore')), t: 's', s: z(bodyCenterStyle) };
            ws[encCell(rowIndex, COL_IYI)] = { v: clsText(effectiveClsSymbol(step, func.classificationSymbolAfter, 'classificationSymbolAfter')), t: 's', s: z(bodyCenterStyle) };
            ws[encCell(rowIndex, COL_ACIK)] = { v: func.processDescription || func.name || '', t: 's', s: z(bodyStyle) };
            rowIndex++;
        });

        const cols = [10, ...symbols.map(() => 8), 16, 18, 42];
        finalizeAndDownload(ws, merges, cols, LAST, rowIndex - 1, 'Flow', `${fmea.project || 'fmea'}-Flow-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // --- Akış Şeması -> PDF (gerçek şekiller + bağlantı okları, antetli) ---
    const TR_MAP: { [k: string]: string } = { 'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U','â':'a','î':'i','û':'u' };
    const tr = (s: any): string => String(s == null ? '' : s).replace(/[çÇğĞıİöÖşŞüÜâîû]/g, ch => TR_MAP[ch] || ch);

    const handleExportToPdf = () => {
        const { jsPDF } = jspdf;
        const fmea = projectData.fmea;
        const symbols = registryData.flowchartSymbols || [];
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const PW = doc.internal.pageSize.getWidth();   // 297
        const M = 8;
        const W = PW - 2 * M;

        // ---------- ANTET ----------
        let y = M;
        const antetH = 24;
        const logoW = 38, gridW = 64, midW = W - logoW - gridW;
        doc.setDrawColor(0); doc.setLineWidth(0.5);
        doc.rect(M, y, logoW, antetH);
        doc.setFont('times', 'bold'); doc.setFontSize(22);
        doc.text('Sanifoam', M + logoW / 2, y + antetH / 2 + 2, { align: 'center' });
        const midX = M + logoW;
        doc.rect(midX, y, midW, antetH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        doc.text('QUALITY SYSTEM DOCUMENTATION', midX + midW / 2, y + 5, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text('PROCESS FLOW DIAGRAM', midX + midW / 2, y + 13, { align: 'center' });
        doc.setFontSize(11);
        doc.text('(PROSES AKIS SEMASI)', midX + midW / 2, y + 19.5, { align: 'center' });
        const gx = midX + midW, rowH = antetH / 4, keyW = gridW * 0.5;
        const arows: [string, string][] = [['DOK.NO', 'FR 33'], ['Y. TRH.', '02.01.2025'], ['REV.NO', '4'], ['SAYFA', '1/1']];
        doc.setFontSize(9);
        arows.forEach((kv, i) => {
            const ry = y + i * rowH;
            doc.rect(gx, ry, keyW, rowH); doc.rect(gx + keyW, ry, gridW - keyW, rowH);
            doc.setFont('helvetica', 'normal'); doc.text(kv[0], gx + keyW / 2, ry + rowH / 2 + 1.4, { align: 'center' });
            doc.setFont('helvetica', 'bold'); doc.text(kv[1], gx + keyW + (gridW - keyW) / 2, ry + rowH / 2 + 1.4, { align: 'center' });
        });
        y += antetH;

        // ---------- BİLGİ SATIRI ----------
        doc.setFillColor(231, 230, 230); doc.rect(M, y, W, 6.5, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0);
        doc.text(tr(`Proje: ${fmea.project || '-'}     |     Urun: ${fmea.productName || '-'}     |     Musteri: ${fmea.client || '-'}     |     Rev. Tarihi: ${fmea.lastRevisionDate || '-'}`), M + 2, y + 4.3);
        y += 6.5 + 2;

        // ---------- KOLON DÜZENİ ----------
        const SYMNAME: { [k: string]: string } = { process: 'Process', decision: 'Decision', data: 'Data', document: 'Document', terminator: 'Terminator', delay: 'Delay' };
        const wProc = 16, wSym = 17, wOzel = 24, wIyi = 28;
        const wAcik = W - (wProc + wSym * symbols.length + wOzel + wIyi);
        const xProc = M;
        const xSym0 = xProc + wProc;
        const xOzel = xSym0 + wSym * symbols.length;
        const xIyi = xOzel + wOzel;
        const xAcik = xIyi + wIyi;
        const symCenter = (i: number) => xSym0 + wSym * i + wSym / 2;

        // ---------- BAŞLIK ----------
        const hH = 11;
        doc.setFillColor(31, 59, 93); doc.setDrawColor(255); doc.setLineWidth(0.2);
        const headCells: [number, number, string][] = [[xProc, wProc, 'Proses No'], [xOzel, wOzel, 'Ozel Karakteristik'], [xIyi, wIyi, 'Iyilestirme Sonrasi'], [xAcik, wAcik, 'Proses Aciklama']];
        doc.rect(xSym0, y, wSym * symbols.length, hH, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255);
        doc.text('Akis Cizelgesi', xSym0 + wSym * symbols.length / 2, y + 4, { align: 'center' });
        doc.setFontSize(5.6);
        symbols.forEach((s, i) => { doc.rect(symCenter(i) - wSym / 2, y, wSym, hH, 'FD'); doc.text(SYMNAME[s.key] || tr(s.label).slice(0, 10), symCenter(i), y + 9, { align: 'center' }); });
        doc.setFontSize(6.8);
        headCells.forEach(([x, w, t]) => { doc.rect(x, y, w, hH, 'FD'); doc.text(t, x + w / 2, y + hH / 2 + 1, { align: 'center', maxWidth: w - 2 }); });
        y += hH;

        // ---------- VERİ SATIRLARI + ŞEKİLLER ----------
        const flowRows: { step: ProcessStep; func: ProcessStepFunction }[] = [];
        (Object.values(data.processItems) as ProcessItem[]).forEach(item => {
            item.stepIds.forEach(sid => {
                const step = data.processSteps[sid];
                if (!step) return;
                step.functionIds.map(fid => data.processStepFunctions[fid]).filter(Boolean)
                    .filter((f: ProcessStepFunction) => !!f.flowchartSymbol)
                    .forEach((func: ProcessStepFunction) => flowRows.push({ step, func }));
            });
        });

        const rH = 25, shW = 17, shH = 11;
        const shapeCenters: { cx: number; cy: number; sym: number }[] = [];

        const drawShape = (key: string, cx: number, cy: number, label: string) => {
            doc.setDrawColor(31, 59, 93); doc.setLineWidth(0.4); doc.setFillColor(68, 114, 196);
            const w = shW, h = shH;
            if (key === 'decision') doc.lines([[w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2], [w / 2, -h / 2]], cx, cy - h / 2, [1, 1], 'FD', true);
            else if (key === 'terminator') doc.roundedRect(cx - w / 2, cy - h / 2, w, h, h / 2, h / 2, 'FD');
            else if (key === 'data') doc.lines([[w, 0], [-w * 0.18, h], [-w, 0], [w * 0.18, -h]], cx - w / 2 + w * 0.09, cy - h / 2, [1, 1], 'FD', true);
            else doc.rect(cx - w / 2, cy - h / 2, w, h, 'FD'); // process/document/delay -> kutu
            doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
            doc.text(label, cx, cy + 1.6, { align: 'center' });
            doc.setTextColor(0);
        };

        doc.setLineWidth(0.2); doc.setDrawColor(150);
        flowRows.forEach((fr, idx) => {
            const ry = y + idx * rH;
            // satır hücre kenarlıkları
            doc.setDrawColor(150); doc.setLineWidth(0.2);
            doc.rect(xProc, ry, wProc, rH);
            symbols.forEach((s, i) => doc.rect(symCenter(i) - wSym / 2, ry, wSym, rH));
            doc.rect(xOzel, ry, wOzel, rH); doc.rect(xIyi, ry, wIyi, rH); doc.rect(xAcik, ry, wAcik, rH);

            const symIdx = Math.max(0, symbols.findIndex(s => s.key === fr.func.flowchartSymbol));
            const cx = symCenter(symIdx), cy = ry + rH / 2;
            drawShape(fr.func.flowchartSymbol || 'process', cx, cy, String(fr.step.operationNumber ?? ''));
            shapeCenters.push({ cx, cy, sym: symIdx });

            // Proses No
            doc.setTextColor(0); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(String(fr.step.operationNumber ?? ''), xProc + wProc / 2, cy + 1.5, { align: 'center' });
            // Ozel / Iyilestirme (<!>)
            doc.setFontSize(10); doc.setTextColor(200, 0, 0);
            const _ozelB = effectiveClsSymbol(fr.step, fr.func.classificationSymbolBefore, 'classificationSymbolBefore');
            const _ozelA = effectiveClsSymbol(fr.step, fr.func.classificationSymbolAfter, 'classificationSymbolAfter');
            if (_ozelB) doc.text(tr(clsText(_ozelB)), xOzel + wOzel / 2, cy + 1.6, { align: 'center' });
            if (_ozelA) doc.text(tr(clsText(_ozelA)), xIyi + wIyi / 2, cy + 1.6, { align: 'center' });
            // Aciklama
            doc.setTextColor(0); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
            doc.text(tr(fr.func.processDescription || fr.func.name || ''), xAcik + 3, cy + 1.5, { maxWidth: wAcik - 6 });
        });

        // ---------- BAĞLANTI OKLARI ----------
        const arrow = (x1: number, y1: number, x2: number, y2: number) => {
            doc.setDrawColor(0, 112, 192); doc.setLineWidth(0.6); doc.line(x1, y1, x2, y2);
            const ang = Math.atan2(y2 - y1, x2 - x1), a = 2.4;
            doc.line(x2, y2, x2 - a * Math.cos(ang - 0.45), y2 - a * Math.sin(ang - 0.45));
            doc.line(x2, y2, x2 - a * Math.cos(ang + 0.45), y2 - a * Math.sin(ang + 0.45));
        };
        for (let i = 0; i < shapeCenters.length - 1; i++) {
            const A = shapeCenters[i], B = shapeCenters[i + 1];
            const ay = A.cy + shH / 2, by = B.cy - shH / 2;
            if (A.cx === B.cx) arrow(A.cx, ay, B.cx, by);
            else { const midY = (ay + by) / 2; doc.setDrawColor(0, 112, 192); doc.setLineWidth(0.6); doc.line(A.cx, ay, A.cx, midY); doc.line(A.cx, midY, B.cx, midY); arrow(B.cx, midY, B.cx, by); }
        }

        doc.save(`${fmea.project || 'fmea'}-Flow-${new Date().toISOString().slice(0, 10)}.pdf`);
    };

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

        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-700">Flow Diagram View</h2>
            <div className="flex gap-2 relative z-30">
                <button onClick={handleExportToExcel} className="px-4 py-1.5 text-sm font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 shadow-sm">Export to Excel</button>
                <button onClick={handleExportToPdf} className="px-4 py-1.5 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 shadow-sm">Export to PDF (şekilli)</button>
            </div>
        </div>
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