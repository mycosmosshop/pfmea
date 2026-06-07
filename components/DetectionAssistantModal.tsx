import React, { useState, useMemo } from 'react';

interface DetectionAssistantModalProps {
    open: boolean;
    onClose: () => void;
}

interface MsaDetails {
  acceptable: { criteria: string; value: string; };
  conditional: { criteria: string; value: string; };
  nonAcceptable: { criteria: string; value: string; };
}

const detectionAssistantConfig: Record<string, Record<string, MsaDetails>> = {
  'Visual, tactile, audible inspection': {
    'CTM method: Kappa': {
      acceptable: { criteria: 'from 0,75', value: '6' },
      conditional: { criteria: 'from 0,4 and to 0,75', value: '6/8*' },
      nonAcceptable: { criteria: 'to 0,4', value: '8' },
    },
  },
  'Manual gauging - attribute': {
    'SDM (signal detection method): %E, %FR, %FA': {
      acceptable: { criteria: '%E from 90 and %FR to 2% and %FA to...', value: '6' },
      conditional: { criteria: '%E from 80 and %FR to 5% and %FA to...', value: '6/8*' },
      nonAcceptable: { criteria: '%E to 80 or %FR from 5% or %FA from ...', value: '8' },
    },
    'SDM: %GRR': {
      acceptable: { criteria: 'to 10%', value: '6' },
      conditional: { criteria: 'from 10% and to 30%', value: '6/8*' },
      nonAcceptable: { criteria: 'from 30%', value: '8' },
    },
  },
  'Manual gauging - variable': {
    'MSA Type 2 - ARM (average and range method): %GRR': {
      acceptable: { criteria: 'to 10%', value: '6' },
      conditional: { criteria: 'from 10% and to 30%', value: '6/8*' },
      nonAcceptable: { criteria: 'from 30%', value: '8' },
    },
    'MSA Type 2 - ANOVA method: %GRR': {
      acceptable: { criteria: 'to 10%', value: '6' },
      conditional: { criteria: 'from 10% and to 30%', value: '6/8*' },
      nonAcceptable: { criteria: 'from 30%', value: '8' },
    },
  },
  'Destructive test': {
    'ANOVA Nested: %GRR': {
      acceptable: { criteria: 'to 10%', value: '6' },
      conditional: { criteria: 'from 10% and to 30%', value: '6/8*' },
      nonAcceptable: { criteria: 'from 30%', value: '8' },
    },
  },
  'Automated detection with notification (buzzer, light etc.)': {
    'MSA Type 3 - RM method: %GRR': {
      acceptable: { criteria: 'to 10%', value: '5' },
      conditional: { criteria: 'from 10% and to 30%', value: '5/7*' },
      nonAcceptable: { criteria: 'from 30%', value: '7' },
    },
  },
  'Automated detection of failure mode in-station and lock of NO...': {
    'MSA Type 3 - RM method: %GRR': {
      acceptable: { criteria: 'to 10%', value: '3' },
      conditional: { criteria: 'from 10% and to 30%', value: '3/7*' },
      nonAcceptable: { criteria: 'from 30%', value: '7' },
    },
  },
  'Automated detection of failure mode downstream and lock of ...': {
    'MSA Type 3 - RM method: %GRR': {
      acceptable: { criteria: 'to 10%', value: '4' },
      conditional: { criteria: 'from 10% and to 30%', value: '4/7*' },
      nonAcceptable: { criteria: 'from 30%', value: '7' },
    },
  },
  'Automated detection of failure case and stop of the process': {
    'MSA Type 3 - RM method: %GRR': {
      acceptable: { criteria: 'to 10%', value: '2' },
      conditional: { criteria: 'from 10% and to 30%', value: '2/7*' },
      nonAcceptable: { criteria: 'from 30%', value: '7' },
    },
  },
};

const inspectionTypes = Object.keys(detectionAssistantConfig);

export const DetectionAssistantModal: React.FC<DetectionAssistantModalProps> = ({ open, onClose }) => {
    const [inspectionType, setInspectionType] = useState('');
    const [msaType, setMsaType] = useState('');

    const msaTypes = useMemo(() => {
        if (!inspectionType) return [];
        return Object.keys(detectionAssistantConfig[inspectionType] || {});
    }, [inspectionType]);

    const resultData = useMemo(() => {
        if (!inspectionType || !msaType) return null;
        return detectionAssistantConfig[inspectionType]?.[msaType] || null;
    }, [inspectionType, msaType]);

    const handleInspectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newInspectionType = e.target.value;
        setInspectionType(newInspectionType);
        // Reset MSA type when inspection type changes
        setMsaType('');
    };
    
    if (!open) return null;

    const ResultCard: React.FC<{title: string, color: string, criteria?: string, value?: string}> = ({title, color, criteria, value}) => (
        <div className="flex-1 flex flex-col items-center">
            <h4 className="font-semibold text-gray-700">{title}</h4>
            <div className={`w-full h-16 mt-2 rounded-md flex items-center justify-center p-2 text-center text-sm font-semibold ${color}`}>
                {criteria || ''}
            </div>
            <div className="mt-4 text-2xl text-blue-600 font-bold">&#x2193;</div>
            <div className="w-full h-16 mt-4 border-2 border-gray-400 rounded-md bg-white flex items-center justify-center text-xl font-bold">
                {value || ''}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[120] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-gray-100 rounded-lg shadow-xl w-full max-w-4xl p-6 m-4 flex flex-col font-sans" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b-2 border-gray-300 pb-3 mb-4">
                    <h3 className="text-2xl font-bold text-blue-800">SOD Assistant</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <select
                            value={inspectionType}
                            onChange={handleInspectionChange}
                            className="p-2 border border-gray-300 rounded-md bg-white"
                        >
                            <option value="">Select inspection type</option>
                            {inspectionTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                         <select
                            value={msaType}
                            onChange={e => setMsaType(e.target.value)}
                            className="p-2 border border-gray-300 rounded-md bg-white"
                            disabled={!inspectionType}
                        >
                            <option value="">Select MSA type</option>
                            {msaTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="text-4xl text-blue-600 my-4">&#x2193;</div>
                        <div className="w-full flex justify-between items-start space-x-4">
                           <ResultCard 
                                title="Acceptable" 
                                color="bg-green-300 border border-green-500"
                                criteria={resultData?.acceptable.criteria}
                                value={resultData?.acceptable.value}
                            />
                             <div className="flex-1 flex flex-col items-center">
                                <h4 className="font-semibold text-gray-700">Conditionally acceptable</h4>
                                <div className="w-full h-16 mt-2 rounded-md flex items-center justify-center p-2 text-center text-sm font-semibold bg-yellow-200 border border-yellow-400">
                                    {resultData?.conditional.criteria}
                                </div>
                                <div className="mt-2 text-sm text-gray-600 font-semibold">Proposed DET value</div>
                                <div className="mt-1 text-2xl text-blue-600 font-bold">&#x2193;</div>
                                <div className="w-full h-16 mt-1 border-2 border-gray-400 rounded-md bg-white flex items-center justify-center text-xl font-bold">
                                    {resultData?.conditional.value}
                                </div>
                            </div>
                            <ResultCard 
                                title="Non acceptable" 
                                color="bg-red-300 border border-red-500"
                                criteria={resultData?.nonAcceptable.criteria}
                                value={resultData?.nonAcceptable.value}
                            />
                        </div>
                         <p className="text-xs text-gray-500 mt-4 self-start">* Acceptance/no acceptance</p>
                    </div>
                </div>

                <div className="flex justify-end mt-6 pt-4 border-t border-gray-300">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 shadow-sm">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
