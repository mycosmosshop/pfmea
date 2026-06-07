import React, { useState } from 'react';

interface DetectionModalProps {
  currentDetection?: number;
  onSelect: (detection: number) => void;
  onClose: () => void;
  onOpenAssistant: () => void;
}

const aiagVdaData = [
    { d: 10, ability: 'Very low', maturity: 'No testing or inspection method has been established or is known.', opportunity: 'The failure mode will not or cannot be detected.' },
    { d: 9, ability: 'Low', maturity: 'It is unlikely that the testing or inspection method will detect the failure mode.', opportunity: 'The failure mode is not easily detected through random or sporadic audits.' },
    { d: 8, ability: 'Low', maturity: 'Test or inspection method has not been proven to be effective and reliable (e.g plant has little or no experience with method, gauge R&R results marginal) on comparable process or this application etc.)', opportunity: 'Human inspection (visual, tactile, audible), or use of manual gauging (attribute or variable) taht should detect the failure mode or failure cause.' },
    { d: 7, ability: 'Moderate', maturity: '', opportunity: 'Machine-based detection (automated or semi-automated with notification by light, buzzer, etc.), or use of inspection equipment such as a coordinate measuring machine that should detect failure mode or' },
    { d: 6, ability: 'Moderate', maturity: 'Test or inspection method has been proven to be effective and reliable (e.g. plant has experience with method, gauge R&R results are acceptable on comparable process or this application, etc.)', opportunity: 'Human inspection (visual, tactile, audible), or use of manual gauging (attribute or variable) taht will detect the failure mode or failure cause (including product sample checks).' },
    { d: 5, ability: 'High', maturity: '', opportunity: 'Machine-based detection (semi-automated with notification by light, buzzer, etc.), or use of inspection equipment such as a coordinate measuring machine that will detect failure mode or failure cause (including product sample checks).' },
    { d: 4, ability: 'High', maturity: 'System has been proven to be effective and reliable (e.g. plant has experience with method and identical process or this application, gauge R&R results are acceptable, etc.)', opportunity: 'Machine-based automated detection method that will detect the failure mode downstream, prevent further processing or system will identify the product as discrepant and allow it to automatically move forward in the process until the designated reject unload area. Discrepant product will be controlled by robust system that will prevent outflow of the product from the facility.' },
    { d: 3, ability: 'High', maturity: '', opportunity: 'Machine-based automated detection method that will detect the failure mode in-station, prevent further processing or system will identify the product as discrepant and allow it to automatically move forward in the process until the designated reject unload area. Discrepant product will be controlled by a robust system that will prevent outflow of the product from the facility.' },
    { d: 2, ability: 'Very High', maturity: 'Detection method has been proven to be effective and reliable (e.g. plant has experience with method, error-proofing verifications, etc.)', opportunity: 'Machine-based detection method that will detect the cause and prevent the failure mode (discrepant part) from being processed.' },
    { d: 1, ability: 'Very High', maturity: 'Failure mode cannot be physically produced as-designed or processed, or detection methods proven to always detect the failure mode or failure cause.', opportunity: '' },
];

const aiagEd4Data = [
    { d: 10, detectability: 'No detection opportunity', probability: 'No current process control; Cannot detect or is not analyzed' },
    { d: 9, detectability: 'Not likely to detect at any stage', probability: 'Failure Mode and/or Error (Cause) is not easily detected (e.g., random audits)' },
    { d: 8, detectability: 'Problem Detection Post Processing', probability: 'Failure Mode detection post-processing by operator through visual/tactile/audible means' },
    { d: 7, detectability: 'Problem Detection at Source', probability: 'Failure Mode detection in-station by operator through visual/tactile/audible means or post-processing through use of attribute gauging (go/no-go, manual torque check/clicker wrench etc.)' },
    { d: 6, detectability: 'Problem Detection Post Processing', probability: 'Failure Mode detection post-processing by use of variable gauging or in-station by operator through use of attribute gauging (go/no-go, manual torque check/clicker wrench etc.)' },
    { d: 5, detectability: 'Problem Detection at Source', probability: 'Failure Mode and/or Error (Cause) detection in-station by use of variable gauging or by automated controls in-station that will detect discrepant part and notify operator (light, buzzer, etc.); Gauging performed on setup and first-piece check (for set-up causes only)' },
    { d: 4, detectability: 'Problem Detection Post Processing', probability: 'Failure Mode detection post-processing by automated controls that will detect discrepant part and lock part to prevent further processing' },
    { d: 3, detectability: 'Problem Detection at Source', probability: 'Error (Cause) detection in-station by automated controls that will detect discrepant part and automatically lock part to prevent further processing' },
    { d: 2, detectability: 'Error Detection and/or Problem Prevention', probability: 'Error (Cause) detection in-station by automated controls that will detect error and prevent discrepant part from being made' },
    { d: 1, detectability: 'Detection not applicable; Error Prevention', probability: 'Error (Cause) prevention as a result of fixture design, machine design or part design. Discrepant parts cannot be made because item has been error-proofed by process/product design' },
];


export const DetectionModal: React.FC<DetectionModalProps> = ({ currentDetection, onSelect, onClose, onOpenAssistant }) => {
  const [activeTab, setActiveTab] = useState('vda');
  const [selectedDetection, setSelectedDetection] = useState<number | undefined>(currentDetection);

  const handleOk = () => {
    if (selectedDetection !== undefined) {
      onSelect(selectedDetection);
    }
  };
  
  const handleRowClick = (detection: number) => {
    setSelectedDetection(detection);
  };

  const handleRowDoubleClick = (detection: number) => {
    onSelect(detection);
  };

  const thClass = "p-2 border bg-gray-100 text-sm font-semibold text-gray-700 align-top";
  const tdClass = "p-2 border text-sm align-top";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl p-5 m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Detectability</h3>
          <div className="flex items-center space-x-4">
            <button type="button" onClick={onOpenAssistant} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm transition-colors">
              Assistant
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
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
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  <th className={`${thClass} w-16`}>D</th>
                  <th className={thClass}>Ability to Detect</th>
                  <th className={thClass}>Detection Method Maturity</th>
                  <th className={thClass}>Opportunity for Detection</th>
                  <th className={thClass}>Corporate or Product Line Examples</th>
                </tr>
              </thead>
              <tbody>
                {aiagVdaData.map((row) => (
                  <tr 
                    key={row.d} 
                    className={`hover:bg-blue-50 cursor-pointer ${selectedDetection === row.d ? 'bg-blue-200' : ''}`} 
                    onClick={() => handleRowClick(row.d)}
                    onDoubleClick={() => handleRowDoubleClick(row.d)}
                  >
                    <td className={`${tdClass} text-center font-bold`}>{row.d}</td>
                    <td className={tdClass}>{row.ability}</td>
                    <td className={tdClass}>{row.maturity}</td>
                    <td className={tdClass}>{row.opportunity}</td>
                    <td className={tdClass}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'ed4' && (
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  <th className={`${thClass} w-16`}>Scale</th>
                  <th className={thClass}>Detectability</th>
                  <th className={thClass}>Probability of detecting the failure/cause</th>
                </tr>
              </thead>
              <tbody>
                {aiagEd4Data.map((row) => (
                   <tr 
                    key={row.d} 
                    className={`hover:bg-blue-50 cursor-pointer ${selectedDetection === row.d ? 'bg-blue-200' : ''}`} 
                    onClick={() => handleRowClick(row.d)}
                    onDoubleClick={() => handleRowDoubleClick(row.d)}
                  >
                    <td className={`${tdClass} text-center font-bold`}>{row.d}</td>
                    <td className={tdClass}>{row.detectability}</td>
                    <td className={tdClass}>{row.probability}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm mr-2 transition-colors">Cancel</button>
          <button type="button" onClick={handleOk} disabled={selectedDetection === undefined} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">OK</button>
        </div>
      </div>
    </div>
  );
};
