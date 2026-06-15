import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { FmeaData, ModalType, ProcessStep, ProcessStepFunction, FailureMode, FailureCause, FailureEffect, ProcessItem, RegistryData, FlowchartSymbolDef, ProjectData, FullProjectState, FmeaAction } from './types';
import FmeaTreeView from './components/FmeaTreeView';
import FmeaTable from './components/FmeaTable';
import ControlPlanTable from './components/ControlPlanTable';
import FlowDiagramView from './components/FlowDiagramView';
import { DataEntryModal } from './components/DataEntryModal';
import FailureEffectModal from './components/FailureEffectModal';
import { RegistryModal } from './components/RegistryModal';
import { APClassificationModal } from './components/APClassificationModal';
import { SeverityModal } from './components/SeverityModal';
import { OccurrenceModal } from './components/OccurrenceModal';
import { initialApMatrix } from './utils/ap-matrix';
import { SODAssistantModal } from './components/SODAssistantModal';
import { DetectionModal } from './components/DetectionModal';
import { DetectionAssistantModal } from './components/DetectionAssistantModal';
import AiagViewTable from './components/AiagViewTable';
import ProjectDataView from './components/ProjectDataView';
import { getAllProjects, saveProject, getProject, deleteProject } from './utils/projectDb';
import { ProjectConfigurationView } from './components/ProjectConfigurationView';
import { TaskManagerModal } from './components/TaskManagerModal';

// Declare global variables for CDN scripts
declare const XLSX: any;

type EditorView = 'project' | 'tree' | 'config' | 'table' | 'cp' | 'flow' | 'aiag';

const initialStandardSymbolsData: Omit<FlowchartSymbolDef, 'isStandard'>[] = [
    { key: 'process', label: 'Process — İşlem', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><rect x="0.5" y="0.5" width="31" height="19"/></svg>` },
    { key: 'alternate_process', label: 'Alternate Process — Alternatif İşlem', svgString: `<svg viewBox="0 0 32 20" fill="#e0b0a0" stroke="black" strokeWidth="1"><rect x="0.5" y="0.5" width="31" height="19" strokeDasharray="3 2"/></svg>` },
    { key: 'decision', label: 'Decision — Karar', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 16 1 L 31 10 L 16 19 L 1 10 Z"/></svg>` },
    { key: 'data', label: 'Data (Input/Output) — Veri (Girdi/Çıktı)', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 6 1 L 31 1 L 26 19 L 1 19 Z"/></svg>` },
    { key: 'predefined_process', label: 'Predefined Process — Önceden Tanımlı Süreç', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><rect x="0.5" y="0.5" width="31" height="19"/><line x1="5" y1="0.5" x2="5" y2="19.5"/><line x1="27" y1="0.5" x2="27" y2="19.5"/></svg>` },
    { key: 'internal_storage', label: 'Internal Storage — Dahili Depolama', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><rect x="6" y="0.5" width="20" height="19"/><path d="M6 0.5 Q16 5 26 0.5" fill="none" stroke="black" strokeWidth="1"/></svg>` },
    { key: 'document', label: 'Document — Doküman', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 0.5 0.5 H 31.5 V 15 Q 26 19.5 21.5 15 T 11.5 15 T 1.5 15 V 0.5 Z"/></svg>` },
    { key: 'multi_document', label: 'Multi-Document — Çoklu Doküman', svgString: `<svg viewBox="0 0 34 22" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 2 2 H 32 V 16 Q 27 20 22 16 T 12 16 T 2 16 V 2 Z"/><path d="M 4 4 H 34 V 18 Q 29 22 24 18 T 14 18 T 4 18 V 4 Z" fill="none"/></svg>` },
    { key: 'terminator', label: 'Terminator (Start/End) — Başlangıç/Bitiş', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><rect x="0.5" y="0.5" width="31" height="19" rx="8" ry="8"/></svg>` },
    { key: 'preparation', label: 'Preparation — Hazırlık', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 6 1 L 26 1 L 31 10 L 26 19 L 6 19 L 1 10 Z"/></svg>` },
    { key: 'manual_input', label: 'Manual Input — Manuel Girdi', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 0.5 4 L 31.5 0.5 L 31.5 19.5 L 0.5 19.5 Z"/></svg>` },
    { key: 'manual_operation', label: 'Manual Operation — Manuel İşlem', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 0.5 0.5 L 31.5 0.5 L 26 19.5 L 5 19.5 Z"/></svg>` },
    { key: 'connector_on_page', label: 'Connector (On-page) — Bağlayıcı (Sayfa İçi)', svgString: `<svg viewBox="0 0 20 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><circle cx="10" cy="10" r="9.5"/></svg>` },
    { key: 'connector_off_page', label: 'Off-page Connector — Sayfa Dışı Bağlayıcı', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 0.5 0.5 H 31.5 V 12 L 16 19.5 L 0.5 12 Z"/></svg>` },
    { key: 'card', label: 'Card — Kart', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><rect x="0.5" y="4" width="31" height="12" rx="2"/></svg>` },
    { key: 'punched_tape', label: 'Punched Tape — Delikli Bant', svgString: `<svg viewBox="0 0 32 20" fill="#f0d0a0" stroke="black" strokeWidth="1"><rect x="0.5" y="8" width="31" height="4"/><circle cx="5" cy="10" r="0.8"/><circle cx="10" cy="10" r="0.8"/><circle cx="15" cy="10" r="0.8"/><circle cx="20" cy="10" r="0.8"/><circle cx="25" cy="10" r="0.8"/></svg>` },
    { key: 'summing_junction', label: 'Summing Junction — Toplama Düğümü', svgString: `<svg viewBox="0 0 20 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><circle cx="10" cy="10" r="9.5"/><line x1="10" y1="2" x2="10" y2="18"/><line x1="2" y1="10" x2="18" y2="10"/></svg>` },
    { key: 'or_junction', label: 'Or — Veya', svgString: `<svg viewBox="0 0 20 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><circle cx="10" cy="10" r="9.5"/><path d="M3,10 C8,3 12,3 17,10 C12,17 8,17 3,10 Z" fill="#a0c0e0"/></svg>` },
    { key: 'collate', label: 'Collate — Kolasyon', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M1 1 L31 10 L1 19 Z"/></svg>` },
    { key: 'sort', label: 'Sort — Sıralama', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 1 19 L 16 1 L 31 19 Z"/></svg>` },
    { key: 'extract', label: 'Extract — Ayıklama', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M1 1 H16 L31 10 L16 19 H1 Z"/></svg>` },
    { key: 'merge', label: 'Merge — Birleştirme', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M1 1 L16 10 L31 1 V19 L16 10 L1 19 Z"/></svg>` },
    { key: 'stored_data', label: 'Stored Data — Depolanmış Veri', svgString: `<svg viewBox="0 0 32 24" fill="#a0c0e0" stroke="black" strokeWidth="1"><ellipse cx="16" cy="4" rx="15" ry="3"/><path d="M1,4 v16 a15,3 0 0 0 30,0 v-16" fill="#a0c0e0"/><ellipse cx="16" cy="20" rx="15" ry="3" fill="none"/></svg>` },
    { key: 'delay', label: 'Delay — Gecikme', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 0.5 0.5 H 22 A 9.5 9.5 0 0 1 22 19.5 H 0.5 Z"/></svg>` },
    { key: 'sequential_access_storage', label: 'Sequential Access Storage (Magnetic Tape) — Sıralı Erişim Depolama (Manyetik Bant)', svgString: `<svg viewBox="0 0 32 20" fill="#e0e0a0" stroke="black" strokeWidth="1"><rect x="0.5" y="3" width="31" height="14" rx="2"/><circle cx="8" cy="10" r="2"/><circle cx="24" cy="10" r="2"/></svg>` },
    { key: 'magnetic_disk', label: 'Magnetic Disk — Manyetik Disk', svgString: `<svg viewBox="0 0 20 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><circle cx="10" cy="10" r="9.5"/><circle cx="10" cy="10" r="3" fill="white"/></svg>` },
    { key: 'direct_access_storage', label: 'Direct Access Storage — Doğrudan Erişim Depolama', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><ellipse cx="16" cy="10" rx="15" ry="8"/></svg>` },
    { key: 'display', label: 'Display — Ekran', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 0.5 0.5 H 31.5 V 15.5 C 26 18 6 18 0.5 15.5 Z"/></svg>` },
    { key: 'transfer', label: 'Transfer — Taşıma', svgString: `<svg viewBox="0 0 32 20" fill="#a0c0e0" stroke="black" strokeWidth="1"><path d="M 1 10 H 25 L 18 3 M 25 10 L 18 17" fill="none"/></svg>` },
];

const initialAvailableSymbols = initialStandardSymbolsData.map(s => ({ ...s, isStandard: true }));
const initialActiveSymbols: FlowchartSymbolDef[] = initialAvailableSymbols.filter(s =>
    ['process', 'decision', 'data', 'terminator', 'document', 'delay'].includes(s.key)
);

const initialRegistryData: RegistryData = {
  clientTypes: ['I','U','E'],
  processFunctionsByType: {
    'I': ['yapıştırma 25N (±3)'],
    'U': ['xxxx'],
    'E': ['phase function 2 (10mm)']
  },
  processWorkElements: ['proses iş elemanı', 'Mak.', 'Personel', 'Metot', 'Malzeme', 'çevre'],
  workElementFunctionsByElement: {
    'proses iş elemanı': ['element funktiona aitiji'],
    'Mak.': ['Yağ seviyesi', 'Basınç ayarı'],
    'Personel': ['Eğitim eksikliği', 'Yorgunluk'],
    'Metot': ['Yanlış talimat'],
    'Malzeme': ['Hatalı hammadde'],
    'çevre': ['bunun gibiii..']
  },
  availableFlowchartSymbols: initialAvailableSymbols,
  flowchartSymbols: initialActiveSymbols,
  classificationSymbols: [],
  responsiblePeople: ['volkan', 'Umut', 'Unal', 'Aysegul', 'Person A', 'Person B'],
  rpnThresholdHigh: 100,
  rpnThresholdMedium: 40,
};

const initialData: FmeaData = {
  processItems: {
    'pi1': { id: 'pi1', name: '6FA', stepIds: ['ps1', 'ps2'] },
  },
  processItemIds: ['pi1'],
  processSteps: {
    'ps1': { id: 'ps1', operationNumber: 'op10', name: 'phase 1', machineDeviceSource: 'Sıcak Silindir', functionIds: ['psf1', 'psf3', 'psf4'], includeInPF: true, takeFromProcessWorkElement: false },
    'ps2': { id: 'ps2', operationNumber: 'op20', name: 'phase 2', machineDeviceSource: 'H-Pres', functionIds: ['psf2'], includeInPF: false, takeFromProcessWorkElement: true },
  },
  processStepFunctions: {
    'psf1': { id: 'psf1', name: 'yapışma', productCharacteristic: '', clientType: 'I', productSpecificationTolerance: '25 N (+/-3)', includeInControlPlan: true, controlCharacteristicWithoutFmea: false, classificationSpecialCharacteristic: true, classificationSymbolBefore: 'circle-triangle-s', classificationSymbolAfter: 'A', failureModeIds: ['fm1', 'fm3'], flowchartSymbol: 'process', processDescription: 'Sıcak silindir ile yapıştırma işlemi' },
    'psf2': { id: 'psf2', name: 'phase function 2', productCharacteristic: '???', clientType: 'E', productSpecificationTolerance: '+/-2 mm', includeInControlPlan: true, controlCharacteristicWithoutFmea: true, classificationSpecialCharacteristic: false, classificationSymbolBefore: '', classificationSymbolAfter: '', failureModeIds: ['fm2'] },
    'psf3': { id: 'psf3', name: 'başka hata', productCharacteristic: '', productSpecificationTolerance: 'sdsdad', failureModeIds: ['fm4'], flowchartSymbol: 'sort', processDescription: 'Kalite kontrol ölçümü'},
    'psf4': { id: 'psf4', name: 'yeni1111', productCharacteristic: '', productSpecificationTolerance: '', failureModeIds: [], flowchartSymbol: 'internal_storage', processDescription: 'Yarı mamül depolama' },
  },
  failureModes: {
    'fm1': { id: 'fm1', description: 'failure 1', effectIds: ['fe1'], causeIds: ['fc1'] },
    'fm2': { id: 'fm2', description: 'failure 2', effectIds: ['fe3'], causeIds: ['fc3'] },
    'fm3': { id: 'fm3', description: 'failure 3', effectIds: ['fe2'], causeIds: ['fc2'] },
    'fm4': { id: 'fm4', description: 'another failure mode', effectIds: [], causeIds: ['fc4', 'fc5']}
  },
  failureEffects: {
    'fe1': { id: 'fe1', effectText: 'Yapışmamak', severity: 7, clientType: 'I', selectedPFByType: { 'I': 'yapıştırma 25N (±3)' } },
    'fe2': { id: 'fe2', effectText: 'effect 3', severity: 8, clientType: 'E', selectedPFByType: { 'E': 'phase function 2 (10mm)' } },
    'fe3': { id: 'fe3', effectText: 'effect 2', severity: 6, clientType: 'E', selectedPFByType: { 'E': 'phase function 2 (10mm)' } },
  },
  failureCauses: {
    'fc1': { 
      id: 'fc1', 
      processWorkElement: 'proses iş elemanı', 
      workElementFunction: 'element funktiona aitiji', 
      description: 'f3rg3rgrgrgrrgg\n44gg',
      preventionControl: 'önleme',
      occurrence: 9,
      detectionControl: '',
      detection: 4,
      actionPriority: 'H',
      filterCode: 'S 101',
      actions: [{
        id: `action_fc1_1`,
        type: 'prevention',
        description: 'fdddcvvvcc',
        responsiblePerson: 'volkan',
        targetCompletionDate: '2025-10-08',
        status: 'Open',
        actionTaken: 'wffwegfw', 
        completionDate: '2025-10-10',
        number: 0,
      }],
      revisedSeverity: 4,
      revisedOccurrence: 3,
      revisedDetection: 4,
    },
    'fc2': { 
        id: 'fc2', 
        processWorkElement: 'Personel', 
        workElementFunction: 'Yorgunluk', 
        description: 'cause 3', 
        actions: [
            {
                id: 'action_fc2_1',
                type: 'detection',
                description: 'önleyici faaliyet 1',
                responsiblePerson: '',
                targetCompletionDate: '2025-10-08',
                status: 'Open',
                actionTaken: 'wffwegfw',
                completionDate: '2025-10-10',
                number: 1
            }
        ] 
    },
    'fc3': { 
        id: 'fc3', 
        processWorkElement: 'çevre', 
        workElementFunction: 'bunun gibiii..', 
        description: 'cause 2', 
        actions: [
            {
                id: 'action_fc3_1',
                type: 'detection',
                description: 'düzeltici faaliyet 1',
                responsiblePerson: '',
                targetCompletionDate: '2025-10-08',
                status: 'Open',
                actionTaken: 'wffwegfw',
                completionDate: '2025-10-10',
                number: 0
            }
        ] 
    },
    'fc4': { 
        id: 'fc4', 
        processWorkElement: 'Mak.', 
        workElementFunction: 'Basınç ayarı', 
        description: 'wvervewvbvewbew',
        actions: [{
            id: 'action_fc4_1',
            type: 'prevention',
            description: 'düzeltici faaliyet 1',
            responsiblePerson: '',
            targetCompletionDate: '2025-10-08',
            status: 'Open',
            actionTaken: 'wffwegfw',
            completionDate: '2025-10-10',
            number: 0,
        }]
    },
    'fc5': { 
        id: 'fc5', 
        processWorkElement: 'Metot', 
        workElementFunction: 'Yanlış talimat', 
        description: 'Another Control Method',
        actions: [{
            id: 'action_fc5_1',
            type: 'prevention',
            description: 'mrgermövebnvwemçb ewç bgmegb',
            responsiblePerson: 'volkan',
            targetCompletionDate: '2025-10-09',
            status: 'Pending implementation',
            actionTaken: 'ebwetbwegb',
            completionDate: '2025-10-08',
            number: 1
        }]
    },
  },
};

const initialProjectData: ProjectData = {
  fmea: {
    confidentialityLevel: 'confidential',
    processFmea: 'production',
    project: '6FA',
    projectId: 'SF100',
    client: 'VW',
    engineeringLocation: 'Çerkezköy',
    personResponsible: 'volkan',
    fmeaNumberVersion: '1',
    productName: '6FA11122',
    firstFmeaDate: '2025-10-03',
    fmeaCreator: 'volkan',
    fmeaApprover: 'Unal',
    teamMembers: 'Umut, Volkan, Una, Aysegul',
    showTeamInHeader: false,
    notes: '',
    lastRevisionDate: '2025-10-03',
    companyName: 'Sanifoam',
    logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAARTSURBVHhe7ZtNqB1FFMe/0dBYJIZiLAaNiSgBi72JGxsbG1FRYhFBRbHgBRt7E1sJgthYULEgKCiWRARFREhBsIiIiEoiISJGRnsRkgYJ6iT4n/z3ublz5t27d2cOfDA49+7M/W/mzJn/mfkGGE4Y/rYJjGfB0H1JgGkCYzEyP8Xn+zKMMI2jGIMxU2B8T4XoGfDPA4xnGcJjGGY0eO4o1yM4p4u8X8PgrGOMf+i0P8LwL+J/l+M/wPAq074bYHi50f4Fhg+I/z4uP8JgQeH/Q+Pf7fVbLpBG8JtG+G8w/I3x/xOGP6fXb7mBGMMfG+WfYPg5/v1L/JdG+L9A8Arj+w/wrzf8Vf0xU7qA8CeM9TqG93+j2f4FhjPG/z3+JzD8W2P8h2b7ZzB+wPivm/13GP49PZ7jP8bwT2r9x832LzCejmF8wfgmxhpjePMN/xSGj6v1H8f4l/T4n0K4F+Pf0Oo/P+K+FWM0WJ6p3H8N4dJp/xGG+7X6LzC8hPG/0vJ/hOFjtP4LhpN56R2MzzH+i5X8TxjeQOv/hOG5nPQtGIMx/rOV/G8w/IHW/w3D6znpExgP5/gOV/I/wXBfrf8Thvdy0jMYz8LgrVby32H4La3/E4aHctIzGM/geA0r+W8w/IbW/w3DSznpC4xnYdzzSt7fMHyB1v+J4fWc9AkM32OM1/L+A4af0vofYdg9J/0GhpO+4fOVvP8Ohv/Q+j/B8DlO+hmMp/yM9VrevwfDX2j9nzDsm5N+gOGU3/Gclbf/DYb/0vo/YdgzJ/0Lw6nP5z8l778Hw7+j9X/CsD9O+gGGn/SML1Py/jYY/p3W/wnD3jnpExh+0o+8Rsv7G2H4+2j9nzDsmhP+heGTfgWf5+V9DTB8/6z/E4bdcdKnMNyL4Jv0P8Pwwln/Mwx/y0kfYfi5/4L/DsPTWf8zDH/PSZ/DcD+CN+3/DYanxvq/wPApTvocGIMxvmg/w/B+qf8Thj/kpD/AcArj+w7w9xn+x1L/D4bP56RvMAZjjH+A/w/D35T6f8PwfE76BcaT+A9Y6fdP8UeM9A/0+0cw/H1O+gHGGf8jPP8f/H/p8BGGN+mkX2B4Ff6D/w8Yfp+W/wnDm3TSRzB+zfgG41d4/g4Y/i/N/wnD63TSZzD8hPG+C/8/MHyQ5n+F4W140v8Mhv/i/3iGL/D+e/p9V8v/hOFWPPn/AcPXGP+Bln+M4a+48n+H4V2M/y4t/wnD2vjyr2D4DeN/lZb/CcPa+PKvYHgcxv9cy/8Ew9p48q9gOJ/jf0nL/wrD/bjy72D4IuP/pOU/w/A+Lvv3YDiR8T9Kyz+E4YFc9u/BcDKf4T+k5R/D8EAu+wzGw/gPaelnMPyWy36C8TCM/xSWfgbDr7jsExg+wvj3sPQDGP7BZT/A8F3Gv6Oln8Dwz172Dww/Z/z7WHoRjP/5y96B4aeM/5GWXozh/y7pPzCczO+4N/oHjO+T83/C8A9e/k8wnsU4jOG/3fA3/gOGc/Hy/wfD13j5r2D4Le+R9Q8Y/uXjv8Pwf/m/8Y9gOI93m+0fMPzD/59hOE/eQc8HGN/T/D/DcG5O+gHGCYxjGIYxDMP4+B3uM6cAAAAASUVORK5CYII=',
    filePaths: [],
    fileLinks: [],
  },
  cp: {
    controlPlan: 'production',
    controlPlanNumber: '',
    keyContactPhone: '',
    dateOrig: '',
    dateRev: '',
    partNumberChangeLevel: '',
    coreTeam: '',
    customerEngApproval: '',
    partNameDescription: '',
    supplierPlantApproval: '',
    customerQualityApproval: '',
    supplierPlant: '',
    supplierCode: '',
    otherApproval1: '',
    otherApproval2: '',
    notes: '',
  },
  pf: {
    processName: '',
    dateOrig: '',
    dateRev: '',
    partDescription: '',
    pfCreator: '',
    pfApprove: '',
    revisionLevel: '',
    notes: '',
  }
};

const createNewProjectState = (): FullProjectState => {
    const id = `proj_${Date.now()}`;
    const rootId = 'pi_root';
    const newFmeaData: FmeaData = {
        processItems: { [rootId]: { id: rootId, name: 'New Process Item', stepIds: [] } },
        processItemIds: [rootId],
        processSteps: {},
        processStepFunctions: {},
        failureModes: {},
        failureEffects: {},
        failureCauses: {},
    };
    const newProjectData: ProjectData = JSON.parse(JSON.stringify(initialProjectData));
    newProjectData.fmea.project = "New Project";
    newProjectData.fmea.projectId = id;
    newProjectData.fmea.productName = "New Product";
    newProjectData.fmea.fmeaNumberVersion = "1";
    newProjectData.fmea.firstFmeaDate = new Date().toISOString().slice(0, 10);
    newProjectData.fmea.lastRevisionDate = new Date().toISOString().slice(0, 10);
    newProjectData.fmea.logo = null;
    newProjectData.fmea.teamMembers = "";
    newProjectData.fmea.notes = "";
    
    return { 
      id, 
      fmeaData: newFmeaData, 
      registryData: initialRegistryData, 
      projectData: newProjectData 
    };
};


const App: React.FC = () => {
  const [appView, setAppView] = useState<'dashboard' | 'editor'>('dashboard');
  const [leftView, setLeftView] = useState<EditorView>('tree');
  const [rightView, setRightView] = useState<EditorView>('table');
  const [layout, setLayout] = useState<'full' | 'vertical' | 'horizontal'>('full');
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<FullProjectState[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [data, setData] = useState<FmeaData>(initialData);
  const [registryData, setRegistryData] = useState<RegistryData>(initialRegistryData);
  const [projectData, setProjectData] = useState<ProjectData>(initialProjectData);
  
  const [modal, setModal] = useState<ModalType>(null);
  const [provisionalItemInfo, setProvisionalItemInfo] = useState<{ type: string, id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isApModalOpen, setIsApModalOpen] = useState(false);
  const [apMatrix, setApMatrix] = useState<('H' | 'M' | 'L')[][][]>(initialApMatrix);
  // FIX: Initialize severityModal state with null to prevent using a variable before its declaration.
  const [severityModal, setSeverityModal] = useState<{
    targetType: 'effect' | 'cause' | 'new_effect_for_mode';
    targetId: string;
    field: 'severity' | 'revisedSeverity';
    currentValue?: number;
    onSaveOverride?: (severity: number) => void;
  } | null>(null);
  // FIX: Initialize occurrenceModal state with null to prevent using a variable before its declaration.
  const [occurrenceModal, setOccurrenceModal] = useState<{
    targetId: string;
    field: 'occurrence' | 'revisedOccurrence';
    currentValue?: number;
  } | null>(null);
  // FIX: Initialize detectionModal state with null to prevent using a variable before its declaration.
  const [detectionModal, setDetectionModal] = useState<{
    targetId: string;
    field: 'detection' | 'revisedDetection';
    currentValue?: number;
  } | null>(null);
  const [isSodAssistantModalOpen, setIsSodAssistantModalOpen] = useState(false);
  const [isDetectionAssistantModalOpen, setIsDetectionAssistantModalOpen] = useState(false);
  const [isTaskManagerOpen, setTaskManagerOpen] = useState(false);
  
  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const [dividerPosition, setDividerPosition] = useState(50); // percentage
  const splitPaneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleDividerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      isDragging.current = true;
  };

  const handleSplitPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging.current || !splitPaneRef.current) return;
      e.preventDefault();
      const rect = splitPaneRef.current.getBoundingClientRect();
      const pos = layout === 'horizontal'
          ? ((e.clientX - rect.left) / rect.width) * 100
          : ((e.clientY - rect.top) / rect.height) * 100;
      setDividerPosition(Math.max(10, Math.min(90, pos)));
  }, [layout]);

  const handleSplitPointerUp = () => {
      isDragging.current = false;
  };
  
  useEffect(() => {
    const initializeApp = async () => {
        try {
            const savedProjects = await getAllProjects();
            setProjects(savedProjects);
        } catch (error) {
            console.error("Failed to initialize the app with projects from DB:", error);
            setProjects([]);
        } finally {
            setIsLoading(false);
        }
    };
    initializeApp();
  }, []);

  const handleNewProject = () => {
    const newProject = createNewProjectState();
    setCurrentProjectId(newProject.id);
    setData(newProject.fmeaData);
    setRegistryData(newProject.registryData);
    setProjectData(newProject.projectData);
    setAppView('editor');
    setLeftView('project');
  };

  const handleOpenProject = async (id: string) => {
    const projectToOpen = await getProject(id);
    if (projectToOpen) {
      setCurrentProjectId(projectToOpen.id);
      setData(projectToOpen.fmeaData);
      setRegistryData(projectToOpen.registryData);
      setProjectData(projectToOpen.projectData);
      setAppView('editor');
      setLeftView('project');
    } else {
      alert("Project could not be found.");
    }
  };

  const handleOpenEditor = async () => {
    if (projects.length === 0) {
        handleNewProject();
        return;
    }

    // Sort projects by ID (which contains a timestamp) to find the most recent.
    const sortedProjects = [...projects].sort((a, b) => b.id.localeCompare(a.id));
    const mostRecentProjectId = sortedProjects[0]?.id;

    if (mostRecentProjectId) {
        await handleOpenProject(mostRecentProjectId);
    }
  };

  const handleSaveProject = async () => {
      if (!currentProjectId) {
          alert("Error: No active project to save.");
          return;
      }
      const projectState: FullProjectState = {
          id: currentProjectId,
          fmeaData: data,
          registryData: registryData,
          projectData: projectData,
      };
      await saveProject(projectState);
      const updatedProjects = await getAllProjects();
      setProjects(updatedProjects);
      alert("Project saved!");
  };

  const handleProjectDataSave = async (newProjectData: ProjectData) => {
    if (!currentProjectId) {
        alert("Error: No active project to save data to.");
        return;
    }

    // Automatically update revision date
    const updatedProjectData = {
        ...newProjectData,
        fmea: {
            ...newProjectData.fmea,
            lastRevisionDate: new Date().toISOString().slice(0, 10),
        }
    };
    setProjectData(updatedProjectData);

    const projectState: FullProjectState = {
        id: currentProjectId,
        fmeaData: data,
        registryData: registryData,
        projectData: updatedProjectData,
    };

    await saveProject(projectState);
    const updatedProjects = await getAllProjects();
    setProjects(updatedProjects);
    alert("Project data saved!");
  };
  
  const handleCopyToProject = async (
    itemsToCopy: { [key: string]: any[] },
    targetProjectId: string,
    targetParentId: string
  ) => {
    const targetProject = await getProject(targetProjectId);
    if (!targetProject) {
        alert("Target project not found!");
        return false;
    }

    const targetData = targetProject.fmeaData;

    // Merge items
    Object.keys(itemsToCopy).forEach(collectionKey => {
        const key = collectionKey as keyof FmeaData;
        if (key in targetData) {
            itemsToCopy[key].forEach((item: any) => {
                (targetData as any)[key][item.id] = item;
            });
        }
    });

    // Add to parent
    const newTopLevelItems = itemsToCopy.topLevelItems as { id: string, type: string }[];
    const parent = 
        targetData.processItems[targetParentId] ||
        targetData.processSteps[targetParentId] ||
        targetData.processStepFunctions[targetParentId];

    if (parent) {
        const childType = newTopLevelItems[0]?.type;
        if (childType === 'ProcessStep' && 'stepIds' in parent) {
            parent.stepIds.push(...newTopLevelItems.map(i => i.id));
        } else if (childType === 'ProcessStepFunction' && 'functionIds' in parent) {
            parent.functionIds.push(...newTopLevelItems.map(i => i.id));
        }
        // Add other parent types as needed
    } else {
        console.error("Target parent not found in target project");
        alert("Could not find the target parent item in the destination project.");
        return false;
    }

    await saveProject(targetProject);
    alert("Items copied successfully!");
    return true;
  };

  const handleExportProjectFromDashboard = async (id: string) => {
    const projectToExport = await getProject(id);
    if (!projectToExport) {
        alert("Project not found for export.");
        return;
    }

    const jsonString = JSON.stringify(projectToExport, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectToExport.projectData.fmea.project || 'fmea-project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBackToDashboard = () => {
    setCurrentProjectId(null);
    setAppView('dashboard');
  };

  const handleDeleteProject = async (id: string) => {
    if (deletingProjectId) return;

    if (window.confirm("Bu projeyi silmek istediğinizden emin misiniz? Bu işlemden önce proje otomatik olarak yedeklenecektir.")) {
      setDeletingProjectId(id);
      try {
        // 1. Fetch the latest project data from the DB for export.
        const projectToExport = await getProject(id);

        if (!projectToExport) {
          alert("Proje bulunamadı. Zaten silinmiş olabilir. Liste yenileniyor.");
          const refreshedProjects = await getAllProjects();
          setProjects(refreshedProjects);
          return;
        }

        // 2. Wrap download logic in a promise to ensure it completes before deletion
        await new Promise<void>((resolve, reject) => {
          try {
            const jsonString = JSON.stringify(projectToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectToExport.projectData.fmea.project || 'fmea-project'}-backup.json`;
            document.body.appendChild(a);
            a.click();
            
            // Delay cleanup and promise resolution to ensure download starts reliably
            setTimeout(() => {
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              resolve();
            }, 1000); // Increased timeout
          } catch(e) {
            console.error("Backup creation failed:", e);
            reject(e);
          }
        });
        
        // 3. Delete the project from the database.
        await deleteProject(id);

        // 4. Update the UI by fetching the new list of projects from the database.
        const updatedProjects = await getAllProjects();
        setProjects(updatedProjects);
        
        // 5. If the deleted project was the one being edited, go back to the dashboard.
        if (currentProjectId === id) {
          handleBackToDashboard();
        }

      } catch (error) {
        console.error("Proje silinemedi:", error);
        alert("Projeyi silmeye çalışırken bir hata oluştu.");
      } finally {
        setDeletingProjectId(null);
      }
    }
  };
  
  const calculateAP = useCallback((s?: number, o?: number, d?: number): string => {
    if (s === undefined || o === undefined || d === undefined || !apMatrix) {
        return '';
    }
    if (s < 1 || s > 10 || o < 1 || o > 10 || d < 1 || d > 10) {
        return ''; // Out of bounds
    }
    return apMatrix[s - 1][o - 1][d - 1];
  }, [apMatrix]);

  const calculateAndUpdateApForCause = useCallback((causeId: string, dataObj: FmeaData): void => {
      const cause = dataObj.failureCauses[causeId];
      if (!cause) return;

      const mode = Object.values(dataObj.failureModes).find(m => (m.causeIds || []).includes(causeId));
      const effects = (mode?.effectIds || []).map(id => dataObj.failureEffects[id]).filter(Boolean);
      const highestEffectSeverity = effects.length > 0 ? Math.max(...effects.map(e => e.severity || 0)) : undefined;

      const currentS = cause.severity ?? highestEffectSeverity;
      cause.actionPriority = calculateAP(currentS, cause.occurrence, cause.detection);

      const revisedS = cause.revisedSeverity;
      const revisedO = cause.revisedOccurrence;
      const revisedD = cause.revisedDetection;
      cause.revisedActionPriority = calculateAP(revisedS, revisedO, revisedD);
  }, [calculateAP]);

  const updateApMatrixAndRecalculate = (newMatrix: ('H' | 'M' | 'L')[][][]) => {
    setApMatrix(newMatrix);
    setData(prevData => {
        const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
        Object.keys(newData.failureCauses).forEach(causeId => {
            calculateAndUpdateApForCause(causeId, newData);
        });
        return newData;
    });
  };

  const handleUpdateApMatrix = (newMatrix: ('H' | 'M' | 'L')[][][]) => {
    updateApMatrixAndRecalculate(newMatrix);
    alert('AP Classification table updated successfully.');
  };

  const handleResetApMatrixToDefault = () => {
    updateApMatrixAndRecalculate(initialApMatrix);
    alert('AP Classification table has been reset to default.');
  };

  const handleOpenSodAssistantModal = () => setIsSodAssistantModalOpen(true);
  const handleCloseSodAssistantModal = () => setIsSodAssistantModalOpen(false);
  
  const handleOpenDetectionAssistantModal = () => setIsDetectionAssistantModalOpen(true);
  const handleCloseDetectionAssistantModal = () => setIsDetectionAssistantModalOpen(false);

  const handleOpenModal = useCallback((modalInfo: ModalType) => {
    setModal(modalInfo);
  }, []);

  const handleCloseModal = () => {
     if (provisionalItemInfo) {
      handleDelete(provisionalItemInfo.type, provisionalItemInfo.id);
      setProvisionalItemInfo(null);
    }
    setModal(null);
  };

  const handleOpenSeverityModal = useCallback((config: NonNullable<typeof severityModal>) => {
    setSeverityModal(config);
  }, []);

  const handleCloseSeverityModal = () => {
    setSeverityModal(null);
  };

  const handleOpenOccurrenceModal = useCallback((config: NonNullable<typeof occurrenceModal>) => {
    setOccurrenceModal(config);
  }, []);

  const handleCloseOccurrenceModal = () => {
    setOccurrenceModal(null);
  };

  const handleOpenDetectionModal = useCallback((config: NonNullable<typeof detectionModal>) => {
    setDetectionModal(config);
  }, []);

  const handleCloseDetectionModal = () => {
    setDetectionModal(null);
  };

  const handleSaveSeverity = (newSeverity: number) => {
    if (!severityModal) return;

    const updateLogic = (prevData: FmeaData) => {
        const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
        const { targetType, targetId, field } = severityModal;

        if (targetType === 'new_effect_for_mode') {
            const failureModeId = targetId;
            const effectId = `fe_${Date.now()}`;
            const newEffect: FailureEffect = {
                id: effectId,
                effectText: 'New Failure Effect (auto-created)',
                severity: newSeverity,
            };
            newData.failureEffects[effectId] = newEffect;
            if (newData.failureModes[failureModeId]) {
                const parentMode = newData.failureModes[failureModeId];
                parentMode.effectIds = [...(parentMode.effectIds || []), effectId];
                (parentMode.causeIds || []).forEach(causeId => calculateAndUpdateApForCause(causeId, newData));
            }
        } else if (targetType === 'effect' && newData.failureEffects[targetId]) {
            newData.failureEffects[targetId].severity = newSeverity;
            Object.values(newData.failureModes).forEach(mode => {
                if ((mode.effectIds || []).includes(targetId)) {
                    (mode.causeIds || []).forEach(causeId => calculateAndUpdateApForCause(causeId, newData));
                }
            });
        } else if (targetType === 'cause' && newData.failureCauses[targetId]) {
            (newData.failureCauses[targetId] as any)[field] = newSeverity;
            calculateAndUpdateApForCause(targetId, newData);
        }
        return newData;
    };

    if (severityModal.onSaveOverride) {
        severityModal.onSaveOverride(newSeverity);
    } else {
        setData(updateLogic);
    }
    handleCloseSeverityModal();
  };
  
  const handleSaveOccurrence = (newOccurrence: number) => {
    if (!occurrenceModal) return;
    
    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
      const { targetId, field } = occurrenceModal;
      if (newData.failureCauses[targetId]) {
        (newData.failureCauses[targetId] as any)[field] = newOccurrence;
        calculateAndUpdateApForCause(targetId, newData);
      }
      return newData;
    });

    handleCloseOccurrenceModal();
  };

  const handleSaveDetection = (newDetection: number) => {
    if (!detectionModal) return;
    
    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
      const { targetId, field } = detectionModal;
      if (newData.failureCauses[targetId]) {
        (newData.failureCauses[targetId] as any)[field] = newDetection;
        calculateAndUpdateApForCause(targetId, newData);
      }
      return newData;
    });

    handleCloseDetectionModal();
  };

  const handleUpdateRegistry = (action: {type: string, payload: any}) => {
     setRegistryData(prevRegistry => {
        const newRegistry: RegistryData = JSON.parse(JSON.stringify(prevRegistry));
        const { type, payload } = action;

        switch(type) {
            case 'add_client_type':
                if (!newRegistry.clientTypes.includes(payload.name)) {
                    newRegistry.clientTypes.push(payload.name);
                    newRegistry.processFunctionsByType[payload.name] = [];
                }
                break;
            case 'delete_client_type':
                newRegistry.clientTypes = newRegistry.clientTypes.filter(ct => ct !== payload.name);
                delete newRegistry.processFunctionsByType[payload.name];
                
                setData(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
                    Object.values(newData.failureEffects).forEach(fe => {
                        if (fe.clientType === payload.name) {
                            fe.clientType = '';
                        }
                        if (fe.selectedPFByType) {
                            delete fe.selectedPFByType[payload.name];
                        }
                    });
                    return newData;
                });
                break;
            case 'add_process_function':
                if (payload.clientType && payload.name) {
                    const list = newRegistry.processFunctionsByType[payload.clientType] || [];
                    if (!list.includes(payload.name)) {
                        list.push(payload.name);
                    }
                    newRegistry.processFunctionsByType[payload.clientType] = list;
                }
                break;
            case 'delete_process_function':
                 if (payload.clientType && payload.name) {
                    let list = newRegistry.processFunctionsByType[payload.clientType] || [];
                    list = list.filter(pf => pf !== payload.name);
                    newRegistry.processFunctionsByType[payload.clientType] = list;

                    setData(prevData => {
                        const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
                        Object.values(newData.failureEffects).forEach(fe => {
                            if (fe.selectedPFByType && fe.selectedPFByType[payload.clientType] === payload.name) {
                                fe.selectedPFByType[payload.clientType] = '';
                            }
                        });
                        return newData;
                    });
                }
                break;
            case 'add_work_element_function':
                if (payload.element && payload.name) {
                    const list = newRegistry.workElementFunctionsByElement[payload.element] || [];
                    if (!list.includes(payload.name)) {
                        list.push(payload.name);
                    }
                    newRegistry.workElementFunctionsByElement[payload.element] = list;
                }
                break;
            case 'delete_work_element_function':
                 if (payload.element && payload.name) {
                    let list = newRegistry.workElementFunctionsByElement[payload.element] || [];
                    list = list.filter(wf => wf !== payload.name);
                    newRegistry.workElementFunctionsByElement[payload.element] = list;

                    setData(prevData => {
                        const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
                        Object.values(newData.failureCauses).forEach(fc => {
                            if (fc.processWorkElement === payload.element && fc.workElementFunction === payload.name) {
                                fc.workElementFunction = '';
                            }
                        });
                        return newData;
                    });
                }
                break;
             case 'add_flowchart_symbol':
                if (payload.key && !newRegistry.flowchartSymbols.some(s => s.key === payload.key)) {
                    newRegistry.flowchartSymbols.push(payload);
                }
                break;
            case 'delete_flowchart_symbol':
                newRegistry.flowchartSymbols = newRegistry.flowchartSymbols.filter(s => s.key !== payload.key);
                setData(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
                    Object.values(newData.processStepFunctions).forEach(func => {
                        if (func.flowchartSymbol === payload.key) {
                            func.flowchartSymbol = undefined;
                        }
                    });
                    return newData;
                });
                break;
            case 'add_available_symbol':
                if (!newRegistry.availableFlowchartSymbols.some(s => s.key === payload.key)) {
                    newRegistry.availableFlowchartSymbols.push({ ...payload, isStandard: false });
                }
                break;
            case 'update_available_symbol':
                const symbolIndex = newRegistry.availableFlowchartSymbols.findIndex(s => s.key === payload.key);
                if (symbolIndex > -1) {
                    newRegistry.availableFlowchartSymbols[symbolIndex] = { ...newRegistry.availableFlowchartSymbols[symbolIndex], ...payload };

                    const activeSymbolIndex = newRegistry.flowchartSymbols.findIndex(s => s.key === payload.key);
                    if (activeSymbolIndex > -1) {
                        newRegistry.flowchartSymbols[activeSymbolIndex] = { ...newRegistry.flowchartSymbols[activeSymbolIndex], ...payload };
                    }
                }
                break;
            case 'delete_available_symbol':
                const symbolToDelete = newRegistry.availableFlowchartSymbols.find(s => s.key === payload.key);
                if (!symbolToDelete || symbolToDelete.isStandard) break;

                newRegistry.availableFlowchartSymbols = newRegistry.availableFlowchartSymbols.filter(s => s.key !== payload.key);
                
                const wasActive = newRegistry.flowchartSymbols.some(s => s.key === payload.key);
                if (wasActive) {
                    newRegistry.flowchartSymbols = newRegistry.flowchartSymbols.filter(s => s.key === payload.key);
                    setData(prevData => {
                        const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
                        Object.values(newData.processStepFunctions).forEach(func => {
                            if (func.flowchartSymbol === payload.key) {
                                func.flowchartSymbol = undefined;
                            }
                        });
                        return newData;
                    });
                }
                break;
            case 'add_classification_symbol':
                if (!newRegistry.classificationSymbols) newRegistry.classificationSymbols = [];
                if (!newRegistry.classificationSymbols.some(s => s.key === payload.key)) {
                    newRegistry.classificationSymbols.push({ ...payload, isStandard: false });
                }
                break;
            case 'update_classification_symbol':
                if (!newRegistry.classificationSymbols) newRegistry.classificationSymbols = [];
                const classSymbolIndex = newRegistry.classificationSymbols.findIndex(s => s.key === payload.key);
                if (classSymbolIndex > -1) {
                    newRegistry.classificationSymbols[classSymbolIndex] = { ...newRegistry.classificationSymbols[classSymbolIndex], ...payload };
                }
                break;
            case 'delete_classification_symbol':
                if (!newRegistry.classificationSymbols) break;
                const classSymbolToDelete = newRegistry.classificationSymbols.find(s => s.key === payload.key);
                if (!classSymbolToDelete) break; 

                newRegistry.classificationSymbols = newRegistry.classificationSymbols.filter(s => s.key !== payload.key);
                
                setData(prevData => {
                    const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
                    Object.values(newData.processStepFunctions).forEach(func => {
                        if (func.classificationSymbolBefore === payload.key) {
                            func.classificationSymbolBefore = undefined;
                        }
                        if (func.classificationSymbolAfter === payload.key) {
                            func.classificationSymbolAfter = undefined;
                        }
                    });
                    return newData;
                });
                break;
            case 'update_rpn_thresholds':
                if (payload.high !== undefined) {
                    newRegistry.rpnThresholdHigh = Number(payload.high) || 0;
                }
                if (payload.medium !== undefined) {
                    newRegistry.rpnThresholdMedium = Number(payload.medium) || 0;
                }
                break;
            case 'add_responsible_person':
                if (!newRegistry.responsiblePeople) newRegistry.responsiblePeople = [];
                if (payload.name && !newRegistry.responsiblePeople.includes(payload.name)) {
                    newRegistry.responsiblePeople.push(payload.name);
                }
                break;
            case 'delete_responsible_person':
                if (newRegistry.responsiblePeople && payload.name) {
                    newRegistry.responsiblePeople = newRegistry.responsiblePeople.filter(p => p !== payload.name);
                }
                break;
        }

        return newRegistry;
     });
  };

  const handleSaveFailureEffect = (savedData: FailureEffect) => {
    if (modal?.type !== 'FailureEffect') return;
    
    const { parentId: failureModeId, data: originalFailureEffectData } = modal;
    const effectId = originalFailureEffectData?.id || savedData.id || `fe_${Date.now()}`;
    const isNewEffect = !originalFailureEffectData?.id;

    const wasProvisional = provisionalItemInfo && effectId === provisionalItemInfo.id;
    if (wasProvisional) {
        setProvisionalItemInfo(null);
    }

    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
      
      const newOrUpdatedEffect: FailureEffect = {
        ...savedData,
        id: effectId,
      };

      newData.failureEffects[effectId] = newOrUpdatedEffect;

      if (isNewEffect) {
          if(newData.failureModes[failureModeId]) {
            const parentMode = newData.failureModes[failureModeId];
            parentMode.effectIds = [...(parentMode.effectIds || []), effectId];
          }
      }

      if(newData.failureModes[failureModeId]) {
          (newData.failureModes[failureModeId].causeIds || []).forEach(causeId => {
              calculateAndUpdateApForCause(causeId, newData);
          });
      }
      
      return newData;
    });

    setModal(null);
  };


  const handleSave = (item: any) => {
    if (!modal) return;

    const wasProvisional = provisionalItemInfo && item.id === provisionalItemInfo.id;
    if (wasProvisional) {
        setProvisionalItemInfo(null);
    }
    
    const { type } = modal;
    const parentId = 'parentId' in modal ? modal.parentId : null;
    const id = item.id || `id_${Date.now()}`;
    
    const isTrulyNewItem = !('data' in modal && modal.data?.id);
    
    const newItemData = { ...item };

    if (isTrulyNewItem) {
        switch (type) {
            case 'ProcessItem':
                (newItemData as ProcessItem).stepIds = [];
                break;
            case 'ProcessStep':
                (newItemData as ProcessStep).functionIds = [];
                break;
            case 'ProcessStepFunction':
                (newItemData as ProcessStepFunction).failureModeIds = [];
                break;
            case 'FailureMode':
                (newItemData as FailureMode).effectIds = [];
                (newItemData as FailureMode).causeIds = [];
                break;
        }
    }
    
    const newItem = { ...newItemData, id };
    
    setData(prevData => {
      const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
      switch (type) {
        case 'ProcessItem':
          newData.processItems = { ...newData.processItems, [id]: newItem as ProcessItem };
          if (isTrulyNewItem) {
            newData.processItemIds.push(id);
          }
          break;
        case 'ProcessStep':
          newData.processSteps = { ...newData.processSteps, [id]: newItem as ProcessStep };
          if (parentId && isTrulyNewItem && newData.processItems[parentId] && !newData.processItems[parentId].stepIds.includes(id)) {
            const parentItem = { ...newData.processItems[parentId] };
            parentItem.stepIds = [...parentItem.stepIds, id];
            newData.processItems[parentId] = parentItem;
          }
          break;
        case 'ProcessStepFunction':
          newData.processStepFunctions = { ...newData.processStepFunctions, [id]: newItem as ProcessStepFunction };
           if (parentId && isTrulyNewItem && newData.processSteps[parentId] && !newData.processSteps[parentId].functionIds.includes(id)) {
            const parentStep = { ...newData.processSteps[parentId] };
            parentStep.functionIds = [...parentStep.functionIds, id];
            newData.processSteps[parentId] = parentStep;
          }
          break;
        case 'FailureMode':
          newData.failureModes = { ...newData.failureModes, [id]: newItem as FailureMode };
          if (parentId && isTrulyNewItem && newData.processStepFunctions[parentId] && !newData.processStepFunctions[parentId].failureModeIds.includes(id)) {
            const parentFunc = { ...newData.processStepFunctions[parentId] };
            parentFunc.failureModeIds = [...parentFunc.failureModeIds, id];
            newData.processStepFunctions[parentId] = parentFunc;
          }
          break;
        case 'FailureCause':
          newData.failureCauses = { ...newData.failureCauses, [id]: newItem as FailureCause };
          if(parentId && isTrulyNewItem && newData.failureModes[parentId]) {
            const parentModeForCause = { ...newData.failureModes[parentId] };
            parentModeForCause.causeIds = [...(parentModeForCause.causeIds || []), id];
            newData.failureModes[parentId] = parentModeForCause;
          }
          calculateAndUpdateApForCause(id, newData);
          break;
      }
      return newData;
    });
    setModal(null);
  };
  
  const handleDelete = (itemType: string, itemId: string) => {
    setData(prevData => {
        const newData: FmeaData = JSON.parse(JSON.stringify(prevData));

        const itemsToDelete = {
            processItems: new Set<string>(),
            processSteps: new Set<string>(),
            processStepFunctions: new Set<string>(),
            failureModes: new Set<string>(),
            failureEffects: new Set<string>(),
            failureCauses: new Set<string>(),
        };

        function recursivelyMarkForDeletion(type: string, id: string) {
            switch (type) {
                case 'ProcessItem':
                    if (!newData.processItems[id] || itemsToDelete.processItems.has(id)) return;
                    itemsToDelete.processItems.add(id);
                    newData.processItems[id].stepIds.forEach((stepId: string) => recursivelyMarkForDeletion('ProcessStep', stepId));
                    break;
                case 'ProcessStep':
                    if (!newData.processSteps[id] || itemsToDelete.processSteps.has(id)) return;
                    itemsToDelete.processSteps.add(id);
                    newData.processSteps[id].functionIds.forEach((funcId: string) => recursivelyMarkForDeletion('ProcessStepFunction', funcId));
                    break;
                case 'ProcessStepFunction':
                    if (!newData.processStepFunctions[id] || itemsToDelete.processStepFunctions.has(id)) return;
                    itemsToDelete.processStepFunctions.add(id);
                    newData.processStepFunctions[id].failureModeIds.forEach((modeId: string) => recursivelyMarkForDeletion('FailureMode', modeId));
                    break;
                case 'FailureMode':
                    if (!newData.failureModes[id] || itemsToDelete.failureModes.has(id)) return;
                    itemsToDelete.failureModes.add(id);
                    (newData.failureModes[id].effectIds || []).forEach(effectId => {
                        recursivelyMarkForDeletion('FailureEffect', effectId);
                    });
                    (newData.failureModes[id].causeIds || []).forEach(causeId => {
                        recursivelyMarkForDeletion('FailureCause', causeId);
                    });
                    break;
                case 'FailureEffect':
                    if (!newData.failureEffects[id] || itemsToDelete.failureEffects.has(id)) return;
                    itemsToDelete.failureEffects.add(id);
                    break;
                case 'FailureCause':
                     if (!newData.failureCauses[id] || itemsToDelete.failureCauses.has(id)) return;
                    itemsToDelete.failureCauses.add(id);
                    break;
            }
        }
        
        recursivelyMarkForDeletion(itemType, itemId);

        const causesToUpdate = new Set<string>();
        if (itemType === 'FailureEffect') {
            Object.values(newData.failureModes).forEach(mode => {
                if ((mode.effectIds || []).includes(itemId)) {
                    (mode.causeIds || []).forEach(causeId => causesToUpdate.add(causeId));
                }
            });
        }

        itemsToDelete.processItems.forEach(id => {
            delete newData.processItems[id];
            const index = newData.processItemIds.indexOf(id);
            if (index > -1) {
                newData.processItemIds.splice(index, 1);
            }
        });
        itemsToDelete.processSteps.forEach(id => delete newData.processSteps[id]);
        itemsToDelete.processStepFunctions.forEach(id => delete newData.processStepFunctions[id]);
        itemsToDelete.failureModes.forEach(id => delete newData.failureModes[id]);
        itemsToDelete.failureEffects.forEach(id => delete newData.failureEffects[id]);
        itemsToDelete.failureCauses.forEach(id => delete newData.failureCauses[id]);

        Object.values(newData.processItems).forEach(item => {
            if(item.stepIds) item.stepIds = item.stepIds.filter(id => !itemsToDelete.processSteps.has(id));
        });
        Object.values(newData.processSteps).forEach(step => {
            if(step.functionIds) step.functionIds = step.functionIds.filter(id => !itemsToDelete.processStepFunctions.has(id));
        });
        Object.values(newData.processStepFunctions).forEach(func => {
            if(func.failureModeIds) func.failureModeIds = func.failureModeIds.filter(id => !itemsToDelete.failureModes.has(id));
        });
        Object.values(newData.failureModes).forEach(mode => {
            if(mode.effectIds) mode.effectIds = mode.effectIds.filter(id => !itemsToDelete.failureEffects.has(id));
            if(mode.causeIds) mode.causeIds = mode.causeIds.filter(id => !itemsToDelete.failureCauses.has(id));
        });
        
        causesToUpdate.forEach(causeId => {
            if (newData.failureCauses[causeId]) {
                calculateAndUpdateApForCause(causeId, newData);
            }
        });

        return newData;
    });
  };

  const handleAddItem = (
    itemType: 'ProcessStep' | 'ProcessStepFunction' | 'FailureMode' | 'FailureCause' | 'FailureEffect',
    parentId: string,
    additionalInfo: { functionId?: string } = {}
  ) => {
    const id = `provisional_${Date.now()}`;
    let modalInfo: ModalType = null;

    switch (itemType) {
      case 'ProcessStep': {
        const stepId = id;
        const newStepName = 'New Step';
        const newItem: ProcessStep = {
          id: stepId,
          name: newStepName,
          operationNumber: `op${Object.keys(data.processSteps).length + 1}0`,
          functionIds: [],
          includeInPF: true,
        };
        
        setData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
          newData.processSteps[stepId] = newItem;
          if (newData.processItems[parentId]) {
            newData.processItems[parentId].stepIds.push(id);
          }
          return newData;
        });
        modalInfo = { type: 'ProcessStep', parentId, data: newItem };
        break;
      }
      case 'ProcessStepFunction': {
        const newItem: ProcessStepFunction = {
          id,
          name: 'New Function',
          productCharacteristic: '',
          failureModeIds: [],
        };
        setData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
          newData.processStepFunctions[id] = newItem;
          if (newData.processSteps[parentId]) {
            newData.processSteps[parentId].functionIds.push(id);
          }
          return newData;
        });
        modalInfo = { type: 'ProcessStepFunction', parentId, data: newItem };
        break;
      }
      case 'FailureMode': {
        const newItem: FailureMode = {
          id,
          description: 'New Failure Mode',
          effectIds: [],
          causeIds: [],
        };
        setData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
          newData.failureModes[id] = newItem;
          if (newData.processStepFunctions[parentId]) {
            newData.processStepFunctions[parentId].failureModeIds.push(id);
          }
          return newData;
        });
        modalInfo = { type: 'FailureMode', parentId, data: newItem };
        break;
      }
       case 'FailureEffect': {
          const newItem: Partial<FailureEffect> = {
            id,
            effectText: 'New Failure Effect',
            severity: 1,
          };
          setData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
            newData.failureEffects[id] = newItem as FailureEffect;
            if (newData.failureModes[parentId]) {
                if (!newData.failureModes[parentId].effectIds) {
                    newData.failureModes[parentId].effectIds = [];
                }
                newData.failureModes[parentId].effectIds.push(id);
            }
            return newData;
          });
          if (!additionalInfo.functionId) {
            console.error('handleAddItem for FailureEffect requires a functionId.');
            return;
          }
          modalInfo = { type: 'FailureEffect', parentId, data: newItem, functionId: additionalInfo.functionId };
          break;
      }
      case 'FailureCause': {
        const newItem: FailureCause = {
          id,
          description: '',
          processWorkElement: registryData.processWorkElements.length > 0 ? registryData.processWorkElements[0] : '???',
          workElementFunction: '',
          actions: [],
        };
        setData(prevData => {
          const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
          newData.failureCauses[id] = newItem;
          if (newData.failureModes[parentId]) {
            if (!newData.failureModes[parentId].causeIds) {
              newData.failureModes[parentId].causeIds = [];
            }
            newData.failureModes[parentId].causeIds.push(id);
          }
          calculateAndUpdateApForCause(id, newData);
          return newData;
        });
        if (!additionalInfo.functionId) {
          console.error('handleAddItem for FailureCause requires a functionId.');
          return;
        }
        modalInfo = { type: 'FailureCause', parentId, data: newItem, functionId: additionalInfo.functionId };
        break;
      }
    }

    setProvisionalItemInfo({ type: itemType, id });
    handleOpenModal(modalInfo!);
  };
  
  const handleExport = async () => {
    if (!currentProjectId) return;
    const currentProject = await getProject(currentProjectId);
    if (!currentProject) return;

    const jsonString = JSON.stringify(currentProject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.projectData.fmea.project || 'fmea-project'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const importedProject = JSON.parse(text) as FullProjectState;

        if (importedProject.id && importedProject.fmeaData && importedProject.projectData) {
          await saveProject(importedProject);
          const updatedProjects = await getAllProjects();
          setProjects(updatedProjects);
          alert(`Project "${importedProject.projectData.fmea.project}" imported successfully.`);
        } else {
          alert('Invalid project file format.');
        }
      } catch (error) {
        alert('Error reading or parsing project file.');
      }
    };
    reader.readAsText(file);
    if(event.target) event.target.value = '';
  };
  
  const handleNavigateProject = (direction: 'next' | 'previous') => {
    if (!currentProjectId || projects.length <= 1) return;

    const sortedProjects = [...projects].sort((a, b) => a.id.localeCompare(b.id));
    const currentIndex = sortedProjects.findIndex(p => p.id === currentProjectId);

    if (currentIndex === -1) {
        console.error("Current project not found for navigation.");
        return;
    }

    const newIndex = direction === 'next'
      ? (currentIndex + 1) % sortedProjects.length
      : (currentIndex - 1 + sortedProjects.length) % sortedProjects.length;
    
    const nextProjectId = sortedProjects[newIndex].id;
    handleOpenProject(nextProjectId);
  };

  const handleReorder = (
    type: string,
    draggedId: string,
    targetId: string,
    position: 'before' | 'after'
    ) => {
        setData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;

            const findParentAndArrayKey = (id: string): [any, string | undefined] => {
                if (newData.processItemIds.includes(id)) return [newData, 'processItemIds'];
                
                const collections: [keyof FmeaData, string][] = [
                    ['processItems', 'stepIds'],
                    ['processSteps', 'functionIds'],
                    ['processStepFunctions', 'failureModeIds'],
                    ['failureModes', 'effectIds'],
                    ['failureModes', 'causeIds']
                ];

                for (const [collectionKey, childArrayKey] of collections) {
                    const collection = newData[collectionKey] as Record<string, any>;
                    for (const parent of Object.values(collection)) {
                        if (parent[childArrayKey] && parent[childArrayKey].includes(id)) {
                            return [parent, childArrayKey];
                        }
                    }
                }
                return [null, undefined];
            };

            const [sourceParent, sourceArrayKey] = findParentAndArrayKey(draggedId);
            const [targetParent, targetArrayKey] = findParentAndArrayKey(targetId);

            if (!sourceParent || !sourceArrayKey || !targetParent || !targetArrayKey) {
                console.error("Could not find source or target for reorder");
                return newData;
            }

            const sourceArray = sourceParent[sourceArrayKey];
            const targetArray = targetParent[targetArrayKey];
            
            const fromIndex = sourceArray.indexOf(draggedId);
            if (fromIndex > -1) {
                sourceArray.splice(fromIndex, 1);
            } else {
                return newData;
            }
            
            const toIndex = targetArray.indexOf(targetId);
            if (toIndex > -1) {
                if (position === 'before') {
                    targetArray.splice(toIndex, 0, draggedId);
                } else { // 'after'
                    targetArray.splice(toIndex + 1, 0, draggedId);
                }
            } else {
                targetArray.push(draggedId);
            }

            return newData;
        });
    };
  
    const handleAddNewFunctionWithSymbol = (stepId: string, symbolKey: string) => {
        const funcId = `psf_${Date.now()}`;
        const newFunction: ProcessStepFunction = {
            id: funcId,
            name: 'New Function',
            productCharacteristic: '',
            failureModeIds: [],
            flowchartSymbol: symbolKey,
            processDescription: `New function for step ${data.processSteps[stepId]?.name || ''}`
        };

        setData(prevData => {
            const newData = JSON.parse(JSON.stringify(prevData)) as FmeaData;
            newData.processStepFunctions[funcId] = newFunction;
            if (newData.processSteps[stepId]) {
                newData.processSteps[stepId].functionIds.push(funcId);
            }
            return newData;
        });

        handleOpenModal({ type: 'ProcessStepFunction', parentId: stepId, data: newFunction });
    };

    const handleDataUpdate = (updatedData: FmeaData) => {
        setData(updatedData);
    };


  const filteredProjects = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    
    const fmea = p.projectData.fmea;
    return (
        fmea.project?.toLowerCase().includes(term) ||
        fmea.projectId?.toLowerCase().includes(term) ||
        fmea.client?.toLowerCase().includes(term) ||
        fmea.engineeringLocation?.toLowerCase().includes(term) ||
        fmea.productName?.toLowerCase().includes(term)
    );
  });

  const handleExportDashboardToExcel = () => {
    if (filteredProjects.length === 0) {
        alert("No projects to export.");
        return;
    }

    const ws: { [key: string]: any } = {};
    let rowIndex = 0;

    // --- STYLES ---
    const thinBorder = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const titleStyle = { font: { sz: 16, bold: true }, alignment: { horizontal: 'center' } };
    const headerStyle = { font: { sz: 12, color: { rgb: "FFFFFF" }, bold: true }, fill: { fgColor: { rgb: "4F81BD" } }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
    const defaultCellStyle = { font: { sz: 10 }, border: thinBorder, alignment: { vertical: 'center', wrapText: true } };
    const zebraFill = { fill: { fgColor: { rgb: "DCE6F1" } } };

    // --- TITLE ---
    ws['A1'] = { v: 'FMEA Project Dashboard', t: 's', s: titleStyle };
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }]; // Merge cells A1 to H1
    rowIndex = 2; // Start headers at row 3

    // --- HEADERS ---
    const headers = [
        "Project Name", "Project ID", "Client", "Engineering Location",
        "FMEA No/Version", "Product Name", "First FMEA Date", "Last Revision Date"
    ];

    headers.forEach((header, colIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        ws[cellRef] = { v: header, t: 's', s: headerStyle };
    });
    rowIndex++;

    // --- DATA ROWS ---
    filteredProjects.forEach((p, projectIndex) => {
        const fmea = p.projectData.fmea;
        const rowData = [
            fmea.project,
            fmea.projectId,
            fmea.client,
            fmea.engineeringLocation,
            fmea.fmeaNumberVersion,
            fmea.productName,
            fmea.firstFmeaDate,
            fmea.lastRevisionDate,
        ];

        const isZebra = projectIndex % 2 === 1;
        
        rowData.forEach((value, colIndex) => {
            const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
            const finalStyle = isZebra ? { ...defaultCellStyle, ...zebraFill } : { ...defaultCellStyle };
            ws[cellRef] = {
                v: value || '',
                t: 's',
                s: finalStyle,
            };
        });
        rowIndex++;
    });

    // --- FINALIZE & WRITE ---
    ws['!merges'] = merges;
    
    const colWidths = [ 30, 15, 15, 25, 18, 25, 18, 18 ];
    ws['!cols'] = colWidths.map(wch => ({ wch }));

    ws['!ref'] = XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: rowIndex - 1 } });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Projects Dashboard');
    XLSX.writeFile(wb, `FMEA_Dashboard_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleScroll = (scrollingPane: 'left' | 'right') => {
    if (isSyncing.current || layout !== 'horizontal') return;

    isSyncing.current = true;

    const source = scrollingPane === 'left' ? leftPaneRef.current : rightPaneRef.current;
    const target = scrollingPane === 'left' ? rightPaneRef.current : leftPaneRef.current;

    if (source && target && source.scrollTop !== target.scrollTop) {
        target.scrollTop = source.scrollTop;
    }
    
    // Using a timeout to prevent scroll event loops
    setTimeout(() => { isSyncing.current = false; }, 50);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading Projects...</div>;
  }

  if (appView === 'dashboard') {
    return (
      <div className="min-h-screen bg-gray-100 font-sans text-gray-800 p-8">
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-blue-700">FMEA Project Dashboard</h1>
            <div className="flex space-x-4">
                <button onClick={handleNewProject} className="px-5 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-blue-600 hover:bg-blue-700 shadow-md">
                  New Project
                </button>
                <button 
                  onClick={handleImportClick}
                  className="px-5 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
                >
                  Import Project
                </button>
                 <button
                    onClick={handleExportDashboardToExcel}
                    className="px-5 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-teal-600 hover:bg-teal-700 shadow-md"
                >
                    Export to Excel
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <button 
                  onClick={handleOpenEditor} 
                  className="px-5 py-2 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-green-600 hover:bg-green-700 shadow-md"
                >
                  FMEA Editor
                </button>
            </div>
        </header>
        <div className="mb-4">
            <input
                type="text"
                placeholder="Search projects (by name, ID, client, location, product)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search projects"
            />
        </div>
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Project Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Project ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Engineering Location</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">FMEA No/Version</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">First FMEA Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Last Revision Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOpenProject(p.id)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{p.projectData.fmea.project}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.projectId}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.client}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.engineeringLocation}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.fmeaNumberVersion}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.productName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.firstFmeaDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{p.projectData.fmea.lastRevisionDate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                     <button onClick={(e) => { e.stopPropagation(); handleExportProjectFromDashboard(p.id); }} className="text-blue-600 hover:text-blue-900 mr-4">Export</button>
                     <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id); }}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled={deletingProjectId === p.id}
                      >
                        {deletingProjectId === p.id ? 'Deleting...' : 'Delete'}
                      </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const isFailureEffectModalOpen = modal?.type === 'FailureEffect';
  const failureEffectModalConfig = isFailureEffectModalOpen ? modal as Extract<ModalType, { type: 'FailureEffect' }> : null;
  const isRegistryModalOpen = modal?.type === 'Registry';

  const ViewSelector: React.FC<{ view: EditorView, setView: (view: EditorView) => void, label: string }> = ({ view, setView, label }) => {
    const buttons: { key: EditorView, label: string }[] = [
        { key: 'project', label: 'Project Data' },
        { key: 'tree', label: 'Tree' },
        { key: 'table', label: 'AIAG & VDA' },
        { key: 'aiag', label: 'AIAG' },
        { key: 'cp', label: 'CP' },
        { key: 'flow', label: 'Flow' },
        { key: 'config', label: 'Configuration' },
    ];
    return (
        <div className="flex items-center">
            <span className="text-xs font-semibold mr-2 text-gray-600">{label}:</span>
            <div className="inline-flex items-center space-x-1 rounded-lg bg-gray-200 p-0.5">
                {buttons.map(btn => (
                    <button
                        key={btn.key}
                        onClick={() => setView(btn.key)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors duration-200 ${
                            view === btn.key ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-300'
                        }`}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>
    );
  };

  const renderViewComponent = (view: EditorView) => {
    switch (view) {
        case 'project': return <ProjectDataView data={projectData} onSave={handleProjectDataSave} projectCount={projects.length} onNavigate={handleNavigateProject} />;
        case 'config': return <ProjectConfigurationView data={data} projects={projects.filter(p => p.id !== currentProjectId)} onDataUpdate={setData} onCopyToProject={handleCopyToProject} />;
        case 'tree': return <FmeaTreeView data={data} onOpenModal={handleOpenModal} onDeleteItem={handleDelete} onAddItem={handleAddItem} onOpenSeverityModal={handleOpenSeverityModal} onOpenOccurrenceModal={handleOpenOccurrenceModal} onOpenDetectionModal={handleOpenDetectionModal} onReorder={handleReorder} />;
        case 'table': return <FmeaTable data={data} registryData={registryData} projectData={projectData} onOpenModal={handleOpenModal} onAddItem={handleAddItem} onOpenSeverityModal={handleOpenSeverityModal} onOpenOccurrenceModal={handleOpenOccurrenceModal} onOpenDetectionModal={handleOpenDetectionModal} />;
        case 'aiag': return <AiagViewTable data={data} onOpenModal={handleOpenModal} registryData={registryData} projectData={projectData} />;
        case 'cp': return <ControlPlanTable data={data} onOpenModal={handleOpenModal} registryData={registryData} projectData={projectData} />;
        case 'flow': return <FlowDiagramView data={data} onDataChange={setData} onOpenModal={handleOpenModal} registryData={registryData} projectData={projectData} onAddNewFunctionWithSymbol={handleAddNewFunctionWithSymbol} />;
        default: return null;
    }
  };

  const renderContent = () => {
    if (layout === 'full') {
        return <div className="flex-1 overflow-auto">{renderViewComponent(leftView)}</div>;
    }
    if (layout === 'vertical') {
      return (
          <div
              ref={splitPaneRef}
              className="flex flex-col flex-grow min-h-0 select-none"
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
              onPointerLeave={handleSplitPointerUp}
          >
              <div style={{ height: `${dividerPosition}%` }} className="overflow-auto border border-gray-300 rounded-md flex-shrink-0">
                  {renderViewComponent(leftView)}
              </div>
              <div
                  onPointerDown={handleDividerPointerDown}
                  className="h-3 flex-shrink-0 cursor-row-resize bg-gray-300 hover:bg-blue-500 active:bg-blue-600 transition-colors flex items-center justify-center my-1 rounded group"
                  aria-label="Resize vertical panes"
                  role="separator"
              >
                  <div className="h-1 w-16 rounded-full bg-gray-500 group-hover:bg-white group-active:bg-white"></div>
              </div>
              <div className="flex-grow min-h-0 overflow-auto border border-gray-300 rounded-md flex flex-col">
                   <div className="flex-grow overflow-auto">
                        {renderViewComponent(rightView)}
                   </div>
              </div>
          </div>
      );
    }
    if (layout === 'horizontal') {
      return (
          <div
              ref={splitPaneRef}
              className="flex flex-row flex-grow min-h-0 select-none"
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
              onPointerLeave={handleSplitPointerUp}
          >
               <div style={{ width: `${dividerPosition}%` }} className="overflow-auto border border-gray-300 rounded-md flex-shrink-0" ref={leftPaneRef} onScroll={() => handleScroll('left')}>
                  {renderViewComponent(leftView)}
               </div>
               <div
                  onPointerDown={handleDividerPointerDown}
                  className="w-3 flex-shrink-0 cursor-col-resize bg-gray-300 hover:bg-blue-500 active:bg-blue-600 transition-colors flex items-center justify-center mx-1 rounded group"
                  aria-label="Resize horizontal panes"
                  role="separator"
              >
                  <div className="w-1 h-16 rounded-full bg-gray-500 group-hover:bg-white group-active:bg-white"></div>
              </div>
              <div className="flex-grow min-w-0 overflow-auto border border-gray-300 rounded-md" ref={rightPaneRef} onScroll={() => handleScroll('right')}>
                  {renderViewComponent(rightView)}
              </div>
          </div>
      );
    }
    return null;
  };

  return (
    <div className="h-screen font-sans text-gray-800 flex flex-col">
      <div className="print:hidden">
        <header className="bg-white shadow-md">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-700">PFMEA Interactive Editor</h1>
            <div className="flex items-center space-x-3">
              <button onClick={handleBackToDashboard} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">
                  Dashboard
              </button>
              <button onClick={handleSaveProject} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
                  Save
              </button>
              <button onClick={handleExport} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">
                  Export
              </button>
              <button onClick={() => setTaskManagerOpen(true)} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">
                  Task Manager
              </button>
              <button onClick={() => handleOpenModal({ type: 'Registry' })} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">
                  Registry
              </button>
              <button onClick={() => setIsApModalOpen(true)} className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 shadow-sm">
                  AP
              </button>

              <div className="flex items-center space-x-1 border border-gray-300 rounded-md p-0.5">
                  <button title="Full View" onClick={() => setLayout('full')} className={`p-1.5 rounded-sm transition-colors ${layout === 'full' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="1" ry="1" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
                  </button>
                  <button title="Vertical Split" onClick={() => setLayout('vertical')} className={`p-1.5 rounded-sm transition-colors ${layout === 'vertical' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v5H2z M2 9h12v5H2z"/></svg>
                  </button>
                  <button title="Horizontal Split" onClick={() => setLayout('horizontal')} className={`p-1.5 rounded-sm transition-colors ${layout === 'horizontal' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h5v12H2z M9 2h5v12H9z"/></svg>
                  </button>
              </div>
              
               {layout === 'full' ? (
                  <ViewSelector view={leftView} setView={setLeftView} label="View" />
              ) : (
                  <div className="flex flex-col space-y-1 p-1 border border-gray-300 rounded-md bg-gray-50">
                      <ViewSelector view={leftView} setView={setLeftView} label={layout === 'horizontal' ? 'Left' : 'Top'} />
                      <ViewSelector view={rightView} setView={setRightView} label={layout === 'horizontal' ? 'Right' : 'Bottom'} />
                  </div>
              )}
            </div>
          </div>
        </header>
        <main className="container mx-auto p-2 flex-grow flex flex-col overflow-hidden">
            {renderContent()}
        </main>
        {isFailureEffectModalOpen && failureEffectModalConfig && (
          <FailureEffectModal
              open={true}
              effectData={failureEffectModalConfig.data}
              registryData={registryData}
              onClose={handleCloseModal}
              onSave={handleSaveFailureEffect}
              onUpdateRegistry={handleUpdateRegistry}
            />
        )}
        {modal && !isFailureEffectModalOpen && !isRegistryModalOpen && (
          <DataEntryModal modalConfig={modal} allData={data} onSave={handleSave} onClose={handleCloseModal} registryData={registryData} onUpdateRegistry={handleUpdateRegistry} onOpenSeverityModal={handleOpenSeverityModal} onOpenModal={handleOpenModal} onOpenSodAssistantModal={handleOpenSodAssistantModal} onOpenDetectionAssistantModal={handleOpenDetectionAssistantModal} calculateAP={calculateAP} />
        )}
        {isRegistryModalOpen && (
          <RegistryModal
            open={true}
            registryData={registryData}
            onClose={handleCloseModal}
            onUpdateRegistry={handleUpdateRegistry}
          />
        )}
        <APClassificationModal
          open={isApModalOpen}
          onClose={() => setIsApModalOpen(false)}
          apMatrix={apMatrix}
          onUpdateMatrix={handleUpdateApMatrix}
          // FIX: Corrected function name from handleResetToDefault to handleResetApMatrixToDefault.
          onResetToDefault={handleResetApMatrixToDefault}
        />
        {severityModal && (
          <SeverityModal
            currentSeverity={severityModal.currentValue}
            onSelect={handleSaveSeverity}
            onClose={handleCloseSeverityModal}
          />
        )}
        {occurrenceModal && (
          <OccurrenceModal
            currentOccurrence={occurrenceModal.currentValue}
            onSelect={handleSaveOccurrence}
            onClose={handleCloseOccurrenceModal}
            onOpenAssistant={handleOpenSodAssistantModal}
          />
        )}
        {detectionModal && (
          <DetectionModal
            currentDetection={detectionModal.currentValue}
            onSelect={handleSaveDetection}
            onClose={handleCloseDetectionModal}
            onOpenAssistant={handleOpenDetectionAssistantModal}
          />
        )}
        <SODAssistantModal
          open={isSodAssistantModalOpen}
          onClose={handleCloseSodAssistantModal}
        />
        <DetectionAssistantModal
          open={isDetectionAssistantModalOpen}
          onClose={handleCloseDetectionAssistantModal}
        />
        {isTaskManagerOpen && (
            <TaskManagerModal
                allData={data}
                onClose={() => setTaskManagerOpen(false)}
                onDataUpdate={handleDataUpdate}
            />
        )}
      </div>
      <div className="hidden print:block">
      </div>
    </div>
  );
};

export default App;