import React from 'react';
import type { ProjectData, FmeaData, RegistryData, ModalType } from '../types';
import FmeaTable from './FmeaTable';

interface PrintableAiagViewProps {
    projectData: ProjectData;
    data: FmeaData;
    registryData: RegistryData;
}

const noOp = () => {};
const noOpAddItem = (itemType: 'ProcessStep' | 'ProcessStepFunction' | 'FailureMode' | 'FailureCause', parentId: string, additionalInfo?: { functionId?: string }) => {};
const noOpOpenModal = (modalInfo: ModalType) => {};
const noOpOpenSeverityModal = (config: any) => {};
const noOpOpenOccurrenceModal = (config: any) => {};
const noOpOpenDetectionModal = (config: any) => {};

export const PrintableAiagView: React.FC<PrintableAiagViewProps> = ({ projectData, data, registryData }) => {
    const { fmea } = projectData;
    return (
        <div className="p-4 bg-white">
            <header className="mb-4 pb-2 border-b-2 border-black">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        {fmea.logo && (
                            <img src={fmea.logo} alt="Company Logo" className="max-h-16 object-contain" />
                        )}
                    </div>
                    <div className="flex-1 text-center">
                        <h1 className="text-2xl font-bold">Process FMEA</h1>
                        <h2 className="text-lg font-semibold">(AIAG &amp; VDA View)</h2>
                    </div>
                    <div className="flex-1"></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                   <div><strong>Project:</strong> {fmea.project}</div>
                   <div><strong>Product Name:</strong> {fmea.productName}</div>
                   <div><strong>Company:</strong> {fmea.companyName}</div>
                   <div><strong>Responsible:</strong> {fmea.personResponsible}</div>
                   <div><strong>FMEA Date (Orig.):</strong> {fmea.firstFmeaDate}</div>
                   <div><strong>FMEA Date (Rev.):</strong> {fmea.lastRevisionDate}</div>
                </div>
                 {fmea.showTeamInHeader && fmea.teamMembers && (
                    <div className="mt-2 text-xs">
                        <strong>Team:</strong> {fmea.teamMembers}
                    </div>
                )}
            </header>
            
            <main>
                <FmeaTable 
                    data={data}
                    registryData={registryData}
                    projectData={projectData}
                    onOpenModal={noOpOpenModal}
                    onAddItem={noOpAddItem}
                    onOpenSeverityModal={noOpOpenSeverityModal}
                    onOpenOccurrenceModal={noOpOpenOccurrenceModal}
                    onOpenDetectionModal={noOpOpenDetectionModal}
                />
            </main>
        </div>
    );
};