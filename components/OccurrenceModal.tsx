import React, { useState } from 'react';

interface OccurrenceModalProps {
  currentOccurrence?: number;
  onSelect: (occurrence: number) => void;
  onClose: () => void;
  onOpenAssistant: () => void;
}

// Data extracted from user images
const aiagVdaOccurrenceData = [
    { scale: 10, probability: 'Very High', frequency: '≥ 100 per thousand\n≥ 1 in 10' },
    { scale: 9, probability: 'High', frequency: '50 per thousand\n1 in 20' },
    { scale: 8, probability: 'High', frequency: '20 per thousand\n1 in 50' },
    { scale: 7, probability: 'High', frequency: '10 per thousand\n1 in 100' },
    { scale: 6, probability: 'Moderate', frequency: '2 per thousand\n1 in 500' },
    { scale: 5, probability: 'Moderate', frequency: '0.5 per thousand\n1 in 2 000' },
    { scale: 4, probability: 'Moderate', frequency: '0.1 per thousand\n1 in 10 000' },
    { scale: 3, probability: 'Low', frequency: '0.01 per thousand\n1 in 100 000' },
    { scale: 2, probability: 'Very Low', frequency: '<0.001 per thousand\n1 in 1 000 000' },
    { scale: 1, probability: 'Very Low', frequency: 'Failure is eliminated through preventive control' },
];

const aiagEd4BasicData = [
    { scale: 10, prediction: 'Extremely high', controlType: 'None', prevention: 'No prevention controls.' },
    { scale: 9, prediction: 'Very high', controlType: 'Behavioral', prevention: 'Prevention controls will have little effect in preventing failure cause.' },
    { scale: 8, prediction: 'High', controlType: 'Behavioral or Technical', prevention: 'Prevention controls is somewhat effective in preventing failure cause.' },
    { scale: 7, prediction: 'High', controlType: 'Behavioral or Technical', prevention: 'Prevention controls is somewhat effective in preventing failure cause.' },
    { scale: 6, prediction: 'Moderate', controlType: '', prevention: 'Prevention controls are effective in preventing failure cause.' },
    { scale: 5, prediction: 'Moderate', controlType: '', prevention: 'Prevention controls are effective in preventing failure cause.' },
    { scale: 4, prediction: 'Low', controlType: 'Best Practices: Behavioral or Technical', prevention: 'Prevention controls are highly effective in preventing failure cause.' },
    { scale: 3, prediction: 'Low', controlType: 'Best Practices: Behavioral or Technical', prevention: 'Prevention controls are highly effective in preventing failure cause.' },
    { scale: 2, prediction: 'Very low', controlType: '', prevention: 'Prevention controls are extremely effective in preventing failure cause from occuring due to design (e.g. part geometry) or process (e.g. fixture or tooling design). Intent of prevention controls: Failure Mode cannot be physically produced due to the Failure Cause.' },
    { scale: 1, prediction: 'Extremely low', controlType: 'Technical', prevention: 'Prevention controls are extremely effective in preventing failure cause from occuring due to design (e.g. part geometry) or process (e.g. fixture or tooling design). Intent of prevention controls: Failure Mode cannot be physically produced due to the Failure Cause.' },
];

const aiagEd4IncidentsData = [
    { scale: 10, incidents: '≥ 100/1 000\n≥ 1/10', controlType: 'None', prevention: 'No prevention controls.' },
    { scale: 9, incidents: '50/1 000\n1/20', controlType: 'Behavioral', prevention: 'Prevention controls will have little effect in preventing failure cause.' },
    { scale: 8, incidents: '20/1 000\n1/50', controlType: '', prevention: 'Prevention controls is somewhat effective in preventing failure cause.' },
    { scale: 7, incidents: '10/1 000\n1/100', controlType: 'Behavioral or Technical', prevention: 'Prevention controls is somewhat effective in preventing failure cause.' },
    { scale: 6, incidents: '2/1 000\n1/500', controlType: '', prevention: 'Prevention controls are effective in preventing failure cause.' },
    { scale: 5, incidents: '0.5/1 000\n1/2 000', controlType: '', prevention: 'Prevention controls are effective in preventing failure cause.' },
    { scale: 4, incidents: '0.1/1 000\n1/10 000', controlType: '', prevention: 'Prevention controls are highly effective in preventing failure cause.' },
    { scale: 3, incidents: '0.01/1 000\n1/100 000', controlType: 'Best Practices: Behavioral or Technical', prevention: 'Prevention controls are highly effective in preventing failure cause.' },
    { scale: 2, incidents: '< 0.001/1 000\n1/1 000 000', controlType: '', prevention: 'Prevention controls are extremely effective in preventing failure cause from occuring due to design (e.g. part geometry) or process (e.g. fixture or tooling design). Intent of prevention controls: Failure Mode cannot be physically produced due to the Failure Cause.' },
    { scale: 1, incidents: 'Failure is estimated through prevention control', controlType: 'Technical', prevention: 'Prevention controls are extremely effective in preventing failure cause from occuring due to design (e.g. part geometry) or process (e.g. fixture or tooling design). Intent of prevention controls: Failure Mode cannot be physically produced due to the Failure Cause.' },
];

const aiagEd4TimeData = [
    { scale: 10, prediction: 'Every time', controlType: 'None', prevention: 'No prevention controls.' },
    { scale: 9, prediction: 'Almost every time', controlType: 'Behavioral', prevention: 'Prevention controls will have little effect in preventing failure cause.' },
    { scale: 8, prediction: 'More than once per shift', controlType: '', prevention: 'Prevention controls is somewhat effective in preventing failure cause.' },
    { scale: 7, prediction: 'More than once per day', controlType: 'Behavioral or Technical', prevention: 'Prevention controls is somewhat effective in preventing failure cause.' },
    { scale: 6, prediction: 'More than once per week', controlType: '', prevention: 'Prevention controls are effective in preventing failure cause.' },
    { scale: 5, prediction: 'More than once per month', controlType: '', prevention: 'Prevention controls are effective in preventing failure cause.' },
    { scale: 4, prediction: 'More than once per year', controlType: '', prevention: 'Prevention controls are highly effective in preventing failure cause.' },
    { scale: 3, prediction: 'Once per year', controlType: 'Best Practices: Behavioral or Technical', prevention: 'Prevention controls are highly effective in preventing failure cause.' },
    { scale: 2, prediction: 'Less than once per year', controlType: '', prevention: 'Prevention controls are extremely effective in preventing failure cause from occuring due to design (e.g. part geometry) or process (e.g. fixture or tooling design). Intent of prevention controls: Failure Mode cannot be physically produced due to the Failure Cause.' },
    { scale: 1, prediction: 'Never', controlType: 'Technical', prevention: 'Prevention controls are extremely effective in preventing failure cause from occuring due to design (e.g. part geometry) or process (e.g. fixture or tooling design). Intent of prevention controls: Failure Mode cannot be physically produced due to the Failure Cause.' },
];


export const OccurrenceModal: React.FC<OccurrenceModalProps> = ({ currentOccurrence, onSelect, onClose, onOpenAssistant }) => {
  const [activeTab, setActiveTab] = useState('vda');
  const [vdaType, setVdaType] = useState<'basic' | 'incidents' | 'time'>('basic');
  const [selectedOccurrence, setSelectedOccurrence] = useState<number | undefined>(currentOccurrence);

  const handleOk = () => {
    if (selectedOccurrence !== undefined) {
      onSelect(selectedOccurrence);
    }
  };
  
  const handleRowClick = (occurrence: number) => {
    setSelectedOccurrence(occurrence);
  };

  const handleRowDoubleClick = (occurrence: number) => {
    onSelect(occurrence);
  };

  const thClass = "p-2 border bg-gray-100 text-sm font-semibold text-gray-700 align-top";
  const tdClass = "p-2 border text-sm align-top whitespace-pre-wrap";
  
  const renderComplexTable = (data: { scale: number; [key: string]: any }[], mainHeader: string) => (
      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className={`${thClass} w-16`}>O</th>
            <th className={`${thClass} w-48`}>{mainHeader}</th>
            <th className={`${thClass} w-48`}>Type of Control</th>
            <th className={thClass}>Prevention Controls</th>
            <th className={thClass}>Corporate or Product Line Examples</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr 
              key={row.scale} 
              className={`hover:bg-blue-50 cursor-pointer ${selectedOccurrence === row.scale ? 'bg-blue-200' : ''}`} 
              onClick={() => handleRowClick(row.scale)}
              onDoubleClick={() => handleRowDoubleClick(row.scale)}
            >
              <td className={`${tdClass} text-center font-bold`}>{row.scale}</td>
              <td className={tdClass}>{row[Object.keys(row)[1]]}</td>
              <td className={tdClass}>{row.controlType}</td>
              <td className={tdClass}>{row.prevention}</td>
              <td className={tdClass}></td>
            </tr>
          ))}
        </tbody>
      </table>
  );


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl p-5 m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Occurrence</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <button onClick={() => setActiveTab('vda')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'vda' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              AIAG & VDA
            </button>
            <button onClick={() => setActiveTab('ed4')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'ed4' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              AIAG ed. 4
            </button>
          </nav>
        </div>

        <div className="overflow-auto mt-4 flex-grow">
          {activeTab === 'vda' && (
             <div>
              <div className="flex items-center space-x-6 mb-4 p-2 bg-gray-50 rounded-md text-sm">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="vdaType" value="basic" checked={vdaType === 'basic'} onChange={() => setVdaType('basic')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                  <span className="ml-2 font-medium text-gray-700">Basic table</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="vdaType" value="incidents" checked={vdaType === 'incidents'} onChange={() => setVdaType('incidents')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                  <span className="ml-2 font-medium text-gray-700">Incidents per 1000 items/vehicles - alternative table</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="vdaType" value="time" checked={vdaType === 'time'} onChange={() => setVdaType('time')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                  <span className="ml-2 font-medium text-gray-700">Estimated based on time - alternative table</span>
                </label>
              </div>
              {vdaType === 'basic' && renderComplexTable(aiagEd4BasicData, 'Prediction of Failure Cause Occurring')}
              {vdaType === 'incidents' && renderComplexTable(aiagEd4IncidentsData, 'Incidents per 1000 items/vehicles')}
              {vdaType === 'time' && renderComplexTable(aiagEd4TimeData, 'Time Based Failure Cause Prediction')}
            </div>
          )}
          {activeTab === 'ed4' && (
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  <th className={`${thClass} w-20`}>Scale</th>
                  <th className={thClass}>Probability of cause occurrence</th>
                  <th className={thClass}>Frequency of cause occurrence</th>
                </tr>
              </thead>
              <tbody>
                {aiagVdaOccurrenceData.map((row) => (
                  <tr 
                    key={row.scale} 
                    className={`hover:bg-blue-50 cursor-pointer ${selectedOccurrence === row.scale ? 'bg-blue-200' : ''}`} 
                    onClick={() => handleRowClick(row.scale)}
                    onDoubleClick={() => handleRowDoubleClick(row.scale)}
                  >
                    <td className={`${tdClass} text-center font-bold`}>{row.scale}</td>
                    <td className={tdClass}>{row.probability}</td>
                    <td className={tdClass}>{row.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <button type="button" onClick={onOpenAssistant} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm transition-colors">
            Assistant
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm transition-colors">Cancel</button>
            <button type="button" onClick={handleOk} disabled={selectedOccurrence === undefined} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">OK</button>
          </div>
        </div>
      </div>
    </div>
  );
};