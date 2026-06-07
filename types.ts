
export interface FlowchartSymbolDef {
  key: string;
  label: string;
  svgString: string;
  isStandard?: boolean;
}

export interface RegistryData {
  clientTypes: string[];
  processFunctionsByType: Record<string, string[]>;
  processWorkElements: string[];
  workElementFunctionsByElement: Record<string, string[]>;
  availableFlowchartSymbols: FlowchartSymbolDef[];
  flowchartSymbols: FlowchartSymbolDef[];
  classificationSymbols?: FlowchartSymbolDef[];
  responsiblePeople?: string[];
  rpnThresholdHigh?: number;
  rpnThresholdMedium?: number;
}

export interface FailureEffect {
  id: string;
  effectText: string;
  severity: number;
  clientType?: string;
  selectedPFByType?: Record<string, string>;
}

export interface FmeaAction {
  id: string;
  type: 'prevention' | 'detection';
  description: string;
  responsiblePerson?: string;
  targetCompletionDate?: string;
  status?: string;
  actionTaken?: string;
  completionDate?: string;
  number?: number;
}

export interface FailureCause {
  id: string;
  processWorkElement: string;
  workElementFunction?: string;
  description: string;
  // Step 5: Risk Analysis
  severity?: number; // Cause-specific severity override
  preventionControl?: string;
  occurrence?: number;
  detectionControl?: string;
  detection?: number;
  actionPriority?: string;
  filterCode?: string;
  // Step 6: Optimization
  actions: FmeaAction[];
  revisedSeverity?: number;
  revisedOccurrence?: number;
  revisedDetection?: number;
  revisedActionPriority?: string;
  remarks?: string;
}


export interface FailureMode {
  id: string;
  description: string;
  effectIds: string[];
  causeIds: string[];
}

export interface ProcessStepFunction {
  id:string;
  name: string;
  productCharacteristic: string;
  clientType?: string;
  productSpecificationTolerance?: string;
  includeInControlPlan?: boolean;
  controlCharacteristicWithoutFmea?: boolean;
  classificationSpecialCharacteristic?: boolean;
  classificationSymbolBefore?: string;
  classificationSymbolAfter?: string;
  // Fields for Control Plan
  evaluationMeasurementTechnique?: string;
  sampleSize?: string;
  sampleFrequency?: string;
  controlMethod?: string;
  // Fields for Flow Diagram
  processDescription?: string;
  flowchartSymbol?: string;
  failureModeIds: string[];
}

export interface ProcessStep {
  id: string;
  operationNumber: string;
  name: string;
  machineDeviceSource?: string;
  takeFromProcessWorkElement?: boolean;
  includeInPF?: boolean;
  functionIds: string[];
}

export interface ProcessItem {
  id: string;
  name: string;
  stepIds: string[];
}

export interface FmeaData {
  processItems: Record<string, ProcessItem>;
  processItemIds: string[];
  processSteps: Record<string, ProcessStep>;
  processStepFunctions: Record<string, ProcessStepFunction>;
  failureModes: Record<string, FailureMode>;
  failureEffects: Record<string, FailureEffect>;
  failureCauses: Record<string, FailureCause>;
}

export interface FmeaProjectData {
  confidentialityLevel: 'business use' | 'proprietary' | 'confidential';
  processFmea: 'prototype' | 'pre-launch' | 'production';
  project: string;
  projectId: string;
  client: string;
  engineeringLocation: string;
  personResponsible: string;
  fmeaNumberVersion: string;
  productName: string;
  firstFmeaDate: string;
  fmeaCreator: string;
  fmeaApprover: string;
  teamMembers: string;
  showTeamInHeader: boolean;
  notes: string;
  lastRevisionDate: string;
  companyName: string;
  logo: string | null;
  filePaths?: string[];
  fileLinks?: string[];
}

export interface CpProjectData {
  controlPlan: 'prototype' | 'pre-launch' | 'production' | 'safe-launch';
  controlPlanNumber: string;
  keyContactPhone: string;
  dateOrig: string;
  dateRev: string;
  partNumberChangeLevel: string;
  coreTeam: string;
  customerEngApproval: string;
  partNameDescription: string;
  supplierPlantApproval: string;
  customerQualityApproval: string;
  supplierPlant: string;
  supplierCode: string;
  otherApproval1: string;
  otherApproval2: string;
  notes: string;
}

export interface PfProjectData {
  processName: string;
  dateOrig: string;
  dateRev: string;
  partDescription: string;
  pfCreator: string;
  pfApprove: string;
  revisionLevel: string;
  notes: string;
}

export interface ProjectData {
  fmea: FmeaProjectData;
  cp: CpProjectData;
  pf: PfProjectData;
}

export interface FullProjectState {
  id: string;
  fmeaData: FmeaData;
  registryData: RegistryData;
  projectData: ProjectData;
}

export type ModalType = 
  | { type: 'ProcessItem'; data?: ProcessItem }
  | { type: 'ProcessStep'; parentId: string; data?: ProcessStep }
  | { type: 'ProcessStepFunction'; parentId: string; data?: ProcessStepFunction }
  | { type: 'FailureMode'; parentId: string; data?: FailureMode }
  | { type: 'FailureEffect'; parentId: string; functionId: string; data?: Partial<FailureEffect> }
  | { type: 'FailureCause'; parentId: string; functionId: string; data?: FailureCause }
  | { type: 'Registry' }
  | null;