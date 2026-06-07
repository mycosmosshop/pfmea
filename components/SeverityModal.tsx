
import React, { useState } from 'react';

interface SeverityModalProps {
  currentSeverity?: number;
  onSelect: (severity: number) => void;
  onClose: () => void;
}

const vdaSeverityData = [
    { s: 10, effect: 'High', plant: 'Failure may result in health and/or safety risk for the manufacturing or assembly worker.', ship: 'Failure may result in health and/or safety risk for the manufacturing or assembly worker.', user: 'Affects safe operation of the vehicle and/or other vehicles, the health of driver or passenger(s) or road users or pedestrians.' },
    { s: 9, effect: 'High', plant: 'Failure may result in inplant regulatory noncompliance.', ship: 'Failure may result in inplant regulatory noncompliance.', user: 'Noncompliance with regulations.' },
    { s: 8, effect: 'Moderately high', plant: '100% of production run affected may have to be scrapped.', ship: 'Line shutdown greater than full production shift; stop shipment possible; field repair or replacement required (Assembly to End User) other than for regulatory noncompliance.', user: 'Loss of primary vehicle function necessary for normal driving expected service life.' },
    { s: 7, effect: 'Moderately high', plant: 'Product may have to be sorted and portion (less than 100%) scrapped; deviation from primary process; decreased line speed or added manpower.', ship: 'Line shutdown from 1 hour up to full production shift; stop shipment possible; field repair or replacement required (Assembly to End User) other than for regulatory noncompliance.', user: 'Degradation of primary vehicle function necessary for normal driving during expected service life.' },
    { s: 6, effect: 'Moderately low', plant: '100% of production run may have to be reworked off line and accepted.', ship: 'Line shutdown up to one hour.', user: 'Loss of secondary vehicle function.' },
    { s: 5, effect: 'Moderately low', plant: 'A portion of the production run may have to be reworked off line and accepted.', ship: 'Less than 100% of product affected; strong possibility for additional defective product; sort required; no line shutdown.', user: 'Degradation of secondary vehicle function.' },
    { s: 4, effect: 'Low', plant: '100% of production run may have to be reworked in station before it is processed.', ship: 'Defective product triggers significant reaction plan; additional defective products not likely; sort not required.', user: 'Very objectionable appearance, sound, vibration, harshness, or haptics.' },
    { s: 3, effect: 'Low', plant: 'A portion of the production run may have to be reworked in-station before it is processed.', ship: 'Defective product triggers no minor reaction plan; additional defective products not likely; sort not required.', user: 'Moderately objectionable appearance, sound, vibration, harshness, or haptics.' },
    { s: 2, effect: 'Low', plant: 'Slight inconvenience to process, operation or operator.', ship: 'Defective product triggers no reaction plan; additional defective products not likely; sort not required; requires feedback to supplier.', user: 'Slightly objectionable appearance, sound, vibration, harshness, or haptics.' },
    { s: 1, effect: 'Very low', plant: 'No discernible effect.', ship: 'No discernible effect or no effect.', user: 'No discernible effect.' },
];

const clientSeverityData = [
    { scale: 10, effect: 'Failure to Meet Safety and/or Regulatory Requirements', criteria: 'Potential failure mode affects safe vehicle operation and/or involves noncompliance with government regulation without warning' },
    { scale: 9, effect: 'Failure to Meet Safety and/or Regulatory Requirements', criteria: 'Potential failure mode affects safe vehicle operation and/or involves noncompliance with government regulation with warning' },
    { scale: 8, effect: 'Loss or Degradation of Primary Function', criteria: 'Loss of primary function (vehicle inoperable, does not affect safe vehicle operation)' },
    { scale: 7, effect: 'Loss or Degradation of Primary Function', criteria: 'Degradation of primary function (vehicle operable, but at reduced level of performance)' },
    { scale: 6, effect: 'Loss or Degradation of Secondary Function', criteria: 'Loss of secondary function (vehicle operable, but comfort/convenience functions inoperable)' },
    { scale: 5, effect: 'Loss or Degradation of Secondary Function', criteria: 'Degradation of secondary function (vehicle operable, but comfort/convenience functions at reduced level of performance)' },
    { scale: 4, effect: 'Annoyance', criteria: 'Appearance or Audible Noise, vehicle operable, item does not comform and noticed by most customers (above 75%)' },
    { scale: 3, effect: 'Annoyance', criteria: 'Appearance or Audible Noise, vehicle operable, item does not comform and noticed by many customers (50%)' },
    { scale: 2, effect: 'Annoyance', criteria: 'Appearance or Audible Noise, vehicle operable, item does not comform and noticed by discriminating customers (under 25%)' },
    { scale: 1, effect: 'No effect', criteria: 'No discernible effect' }
];

const processSeverityData = [
    { scale: 10, effect: 'Failure to Meet Safety and/or Regulatory Requirements', criteria: 'May endager operator (machine or assembly) without warning' },
    { scale: 9, effect: 'Failure to Meet Safety and/or Regulatory Requirements', criteria: 'May endager operator (machine or asembly) with warning' },
    { scale: 8, effect: 'Major Disruption', criteria: '100% of product may have to be scrapped, line shutdown or stop ship' },
    { scale: 7, effect: 'Significant Disruption', criteria: 'A portition of the production run may have to be scrapped, deviation from primary process including decreased line speed or added manpower' },
    { scale: 6, effect: 'Moderate Disruption', criteria: '100% of production run may have to be reworked off line and accepted' },
    { scale: 5, effect: 'Moderate Disruption', criteria: 'A portion of the production run may have to be reworked off line and accepted' },
    { scale: 4, effect: 'Moderate Disruption', criteria: '100% of production run may have to be reworked in station before it is processed' },
    { scale: 3, effect: 'Moderate Disruption', criteria: 'A portition of the production run may have to be reworked in station before it is processed' },
    { scale: 2, effect: 'Minor Disruption', criteria: 'Slight inconvenience to process, operation, or operator' },
    { scale: 1, effect: 'No effect', criteria: 'No discernible effect' }
];


export const SeverityModal: React.FC<SeverityModalProps> = ({ currentSeverity, onSelect, onClose }) => {
  const [activeTab, setActiveTab] = useState('vda');
  const [ed4Type, setEd4Type] = useState<'client' | 'process'>('client');
  const [selectedSeverity, setSelectedSeverity] = useState<number | undefined>(currentSeverity);

  const handleOk = () => {
    if (selectedSeverity !== undefined) {
      onSelect(selectedSeverity);
    }
  };
  
  const handleRowClick = (severity: number) => {
    setSelectedSeverity(severity);
  };

  const handleRowDoubleClick = (severity: number) => {
    onSelect(severity);
  };

  const thClass = "p-2 border bg-gray-100 text-sm font-semibold text-gray-700";
  const tdClass = "p-2 border text-sm";
  
  const renderSimpleTable = (data: { scale: number; effect: string; criteria: string; }[]) => (
      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className={`${thClass} w-20`}>Scale</th>
            <th className={thClass}>Effect</th>
            <th className={thClass}>Severity criteria</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr 
              key={row.scale} 
              className={`hover:bg-blue-50 cursor-pointer ${selectedSeverity === row.scale ? 'bg-blue-200' : ''}`} 
              onClick={() => handleRowClick(row.scale)}
              onDoubleClick={() => handleRowDoubleClick(row.scale)}
            >
              <td className={`${tdClass} text-center font-bold`}>{row.scale}</td>
              <td className={tdClass}>{row.effect}</td>
              <td className={tdClass}>{row.criteria}</td>
            </tr>
          ))}
        </tbody>
      </table>
  );


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl p-5 m-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h3 className="text-xl font-semibold text-gray-800">Severity</h3>
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
            <table className="w-full border-collapse border">
              <thead>
                <tr>
                  <th className={thClass}>S</th>
                  <th className={thClass}>Effect</th>
                  <th className={thClass}>Impact to Your Plant</th>
                  <th className={thClass}>Impact to Ship-to Plant (when known)</th>
                  <th className={thClass}>Impact to End User (when known)</th>
                  <th className={thClass}>Corporate or Product Line Examples</th>
                </tr>
              </thead>
              <tbody>
                {vdaSeverityData.map((row) => (
                  <tr 
                    key={row.s} 
                    className={`hover:bg-blue-50 cursor-pointer ${selectedSeverity === row.s ? 'bg-blue-200' : ''}`} 
                    onClick={() => handleRowClick(row.s)}
                    onDoubleClick={() => handleRowDoubleClick(row.s)}
                  >
                    <td className={`${tdClass} text-center font-bold`}>{row.s}</td>
                    <td className={tdClass}>{row.effect}</td>
                    <td className={tdClass}>{row.plant}</td>
                    <td className={tdClass}>{row.ship}</td>
                    <td className={tdClass}>{row.user}</td>
                    <td className={tdClass}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'ed4' && (
            <div>
              <div className="flex items-center space-x-4 mb-4 p-2 bg-gray-50 rounded-md">
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="ed4Type" value="client" checked={ed4Type === 'client'} onChange={() => setEd4Type('client')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                  <span className="ml-2 font-medium text-gray-700">Severity for the client (user)</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input type="radio" name="ed4Type" value="process" checked={ed4Type === 'process'} onChange={() => setEd4Type('process')} className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"/>
                  <span className="ml-2 font-medium text-gray-700">Severity for process (production/assembly)</span>
                </label>
              </div>
              {ed4Type === 'client' ? renderSimpleTable(clientSeverityData) : renderSimpleTable(processSeverityData)}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <button type="button" onClick={onClose} className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-300 rounded-md shadow-sm mr-2 transition-colors">Cancel</button>
          <button type="button" onClick={handleOk} disabled={selectedSeverity === undefined} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">OK</button>
        </div>
      </div>
    </div>
  );
};
