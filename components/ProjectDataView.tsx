

import React, { useState, useEffect, useCallback } from 'react';
import type { ProjectData, FmeaProjectData, CpProjectData, PfProjectData } from '../types';
import { FileLinksModal } from './FileLinksModal';
import { ArrowLeftIcon, ArrowRightIcon } from './icons/Icons';

const LabeledInput: React.FC<{ label: string; id: string; children: React.ReactNode; className?: string }> = ({ label, id, children, className = '' }) => (
    <div className={`flex items-start ${className}`}>
        <label htmlFor={id} className="w-40 text-sm text-gray-700 pt-2 text-right pr-4 flex-shrink-0">{label}:</label>
        <div className="flex-grow">
            {children}
        </div>
    </div>
);

const TextInput: React.FC<{ id: string; name: keyof FmeaProjectData | keyof CpProjectData | keyof PfProjectData; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, name, value, onChange }) => (
    <input type="text" id={id} name={name} value={value} onChange={onChange} className="w-full text-sm border border-gray-400 bg-white px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
);

const DateInput: React.FC<{ id: string; name: keyof FmeaProjectData | keyof CpProjectData | keyof PfProjectData; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ id, name, value, onChange }) => (
    <input type="date" id={id} name={name} value={value} onChange={onChange} className="w-full text-sm border border-gray-400 bg-white px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
);

const TextArea: React.FC<{ id: string; name: keyof FmeaProjectData | keyof CpProjectData | keyof PfProjectData; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows?: number; }> = ({ id, name, value, onChange, rows = 3 }) => (
    <textarea id={id} name={name} value={value} onChange={onChange} rows={rows} className="w-full text-sm border border-gray-400 bg-white px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
);

const RadioGroup: React.FC<{ name: string; options: { value: string; label: string }[]; selected: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; }> = ({ name, options, selected, onChange }) => (
    <div className="flex items-center space-x-4 pt-1">
        {options.map(opt => (
            <label key={opt.value} className="flex items-center space-x-2 text-sm">
                <input type="radio" name={name} value={opt.value} checked={selected === opt.value} onChange={onChange} className="h-4 w-4" />
                <span>{opt.label}</span>
            </label>
        ))}
    </div>
);


interface ProjectDataViewProps {
    data: ProjectData;
    onSave: (newData: ProjectData) => void;
    projectCount: number;
    onNavigate: (direction: 'next' | 'previous') => void;
}

const ProjectDataView: React.FC<ProjectDataViewProps> = ({ data, onSave, projectCount, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'fmea' | 'cp' | 'pf'>('fmea');
    const [isFileLinksModalOpen, setFileLinksModalOpen] = useState(false);
    const [formData, setFormData] = useState<ProjectData>(data);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(data);
    }, [data]);
    
    const handleChange = (part: 'fmea' | 'cp' | 'pf') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
        
        setFormData(prev => ({
            ...prev,
            [part]: {
                ...prev[part],
                [name]: isCheckbox ? checked : value,
            }
        }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({
                    ...prev,
                    fmea: { ...prev.fmea, logo: reader.result as string }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, fmea: { ...prev.fmea, logo: null } }));
        if(fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveClick = () => {
        onSave(formData);
    };

    const handleUpdateLinks = (links: { filePaths: string[], fileLinks: string[] }) => {
        setFormData(prev => ({
            ...prev,
            fmea: {
                ...prev.fmea,
                filePaths: links.filePaths,
                fileLinks: links.fileLinks,
            }
        }));
    };

    const fmeaHandleChange = handleChange('fmea');
    const cpHandleChange = handleChange('cp');
    const pfHandleChange = handleChange('pf');

    const renderFmeaForm = () => (
        <div className="space-y-3 p-4">
            <LabeledInput label="Confidentiality level" id="confidentialityLevel">
                <RadioGroup name="confidentialityLevel" selected={formData.fmea.confidentialityLevel} onChange={fmeaHandleChange}
                    options={[
                        { value: 'business use', label: 'Business use' },
                        { value: 'proprietary', label: 'Proprietary' },
                        { value: 'confidential', label: 'Confidential' }
                    ]}
                />
            </LabeledInput>
            <LabeledInput label="Process FMEA" id="processFmea">
                <RadioGroup name="processFmea" selected={formData.fmea.processFmea} onChange={fmeaHandleChange}
                    options={[
                        { value: 'prototype', label: 'Prototype' },
                        { value: 'pre-launch', label: 'Pre-Launch' },
                        { value: 'production', label: 'Production' }
                    ]}
                />
            </LabeledInput>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <LabeledInput label="Project" id="project"><TextInput id="project" name="project" value={formData.fmea.project} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Project ID" id="projectId"><TextInput id="projectId" name="projectId" value={formData.fmea.projectId} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Client" id="client"><TextInput id="client" name="client" value={formData.fmea.client} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Engineering Location" id="engineeringLocation"><TextInput id="engineeringLocation" name="engineeringLocation" value={formData.fmea.engineeringLocation} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Person responsible" id="personResponsible"><TextInput id="personResponsible" name="personResponsible" value={formData.fmea.personResponsible} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="FMEA Number /Version" id="fmeaNumberVersion"><TextInput id="fmeaNumberVersion" name="fmeaNumberVersion" value={formData.fmea.fmeaNumberVersion} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Number/Name of product" id="productName"><TextInput id="productName" name="productName" value={formData.fmea.productName} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Date of first FMEA" id="firstFmeaDate"><DateInput id="firstFmeaDate" name="firstFmeaDate" value={formData.fmea.firstFmeaDate} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="FMEA Creator" id="fmeaCreator"><TextInput id="fmeaCreator" name="fmeaCreator" value={formData.fmea.fmeaCreator} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="FMEA Approver" id="fmeaApprover"><TextInput id="fmeaApprover" name="fmeaApprover" value={formData.fmea.fmeaApprover} onChange={fmeaHandleChange} /></LabeledInput>
                
                <LabeledInput label="Team members" id="teamMembers" className="col-span-2">
                    <div className="flex items-start space-x-4">
                        <TextArea id="teamMembers" name="teamMembers" value={formData.fmea.teamMembers} onChange={fmeaHandleChange} rows={4} />
                        <label className="flex items-center space-x-2 text-sm pt-2 w-60">
                            <input type="checkbox" name="showTeamInHeader" checked={formData.fmea.showTeamInHeader} onChange={fmeaHandleChange} />
                            <span>Show team composition in the sheet header</span>
                        </label>
                    </div>
                </LabeledInput>
                <LabeledInput label="Notes/comments" id="notes" className="col-span-2"><TextArea id="notes" name="notes" value={formData.fmea.notes} onChange={fmeaHandleChange} rows={4} /></LabeledInput>
                
                <LabeledInput label="Last revision date" id="lastRevisionDate"><DateInput id="lastRevisionDate" name="lastRevisionDate" value={formData.fmea.lastRevisionDate} onChange={fmeaHandleChange} /></LabeledInput>
                <LabeledInput label="Company name" id="companyName"><TextInput id="companyName" name="companyName" value={formData.fmea.companyName} onChange={fmeaHandleChange} /></LabeledInput>
                
                <LabeledInput label="Logo" id="logo">
                     <div className="flex items-center space-x-2">
                        {formData.fmea.logo ? <img src={formData.fmea.logo} alt="Company Logo" className="h-10 border p-1" /> : <div className="h-10 w-20 border flex items-center justify-center text-xs text-gray-400 bg-white">No Logo</div>}
                        <input type="file" id="logo-upload" className="hidden" onChange={handleLogoChange} accept="image/*" ref={fileInputRef} />
                        <label htmlFor="logo-upload" className="px-3 py-1.5 text-sm border rounded cursor-pointer bg-gray-200 hover:bg-gray-300">Choose...</label>
                        <button type="button" onClick={handleRemoveLogo} className="px-3 py-1.5 text-sm border rounded bg-gray-200 hover:bg-gray-300">Remove</button>
                    </div>
                </LabeledInput>
                 <LabeledInput label="" id="related-docs">
                    <button type="button" onClick={() => setFileLinksModalOpen(true)} className="px-3 py-1.5 text-sm border rounded bg-gray-200 hover:bg-gray-300">Related documents</button>
                </LabeledInput>
            </div>
        </div>
    );
    
    const renderCpForm = () => (
        <div className="space-y-3 p-4">
            <LabeledInput label="Control Plan" id="controlPlan">
                 <RadioGroup name="controlPlan" selected={formData.cp.controlPlan} onChange={cpHandleChange}
                    options={[
                        { value: 'prototype', label: 'Prototype' },
                        { value: 'pre-launch', label: 'Pre-Launch' },
                        { value: 'production', label: 'Production' },
                        { value: 'safe-launch', label: 'Safe Launch' },
                    ]}
                />
            </LabeledInput>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <LabeledInput label="Control Plan Number" id="controlPlanNumber"><TextInput id="controlPlanNumber" name="controlPlanNumber" value={formData.cp.controlPlanNumber} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Key Contact/Phone" id="keyContactPhone"><TextInput id="keyContactPhone" name="keyContactPhone" value={formData.cp.keyContactPhone} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Date (Orig.)" id="dateOrig"><DateInput id="dateOrig" name="dateOrig" value={formData.cp.dateOrig} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Date (Rev.)" id="dateRev"><DateInput id="dateRev" name="dateRev" value={formData.cp.dateRev} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Part Number/Latest Change Level" id="partNumberChangeLevel"><TextInput id="partNumberChangeLevel" name="partNumberChangeLevel" value={formData.cp.partNumberChangeLevel} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Core Team" id="coreTeam"><TextInput id="coreTeam" name="coreTeam" value={formData.cp.coreTeam} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Customer Engineering Approval/Date (If Req'd.)" id="customerEngApproval"><TextInput id="customerEngApproval" name="customerEngApproval" value={formData.cp.customerEngApproval} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Part Name/Description" id="partNameDescription"><TextInput id="partNameDescription" name="partNameDescription" value={formData.cp.partNameDescription} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Supplier/Plant Approval/Date" id="supplierPlantApproval"><TextInput id="supplierPlantApproval" name="supplierPlantApproval" value={formData.cp.supplierPlantApproval} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Customer Quality Approval/Date (If Req'd.)" id="customerQualityApproval"><TextInput id="customerQualityApproval" name="customerQualityApproval" value={formData.cp.customerQualityApproval} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Supplier/Plant" id="supplierPlant"><TextInput id="supplierPlant" name="supplierPlant" value={formData.cp.supplierPlant} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Supplier Code" id="supplierCode"><TextInput id="supplierCode" name="supplierCode" value={formData.cp.supplierCode} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Other Approval/Date (If Req'd.)" id="otherApproval1"><TextInput id="otherApproval1" name="otherApproval1" value={formData.cp.otherApproval1} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Other Approval/Date (If Req'd.)" id="otherApproval2"><TextInput id="otherApproval2" name="otherApproval2" value={formData.cp.otherApproval2} onChange={cpHandleChange} /></LabeledInput>
                <LabeledInput label="Notes/comments" id="cp-notes" className="col-span-2"><TextArea id="cp-notes" name="notes" value={formData.cp.notes} onChange={cpHandleChange} rows={5} /></LabeledInput>
            </div>
        </div>
    );
    
    const renderPfForm = () => (
         <div className="space-y-3 p-4">
            <div className="grid grid-cols-1 gap-y-3 max-w-lg">
                <LabeledInput label="Process name" id="processName"><TextInput id="processName" name="processName" value={formData.pf.processName} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="Data (org.)" id="pf-dateOrig"><DateInput id="pf-dateOrig" name="dateOrig" value={formData.pf.dateOrig} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="Data (rev.)" id="pf-dateRev"><DateInput id="pf-dateRev" name="dateRev" value={formData.pf.dateRev} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="Part description" id="pf-partDescription"><TextInput id="pf-partDescription" name="partDescription" value={formData.pf.partDescription} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="PF Creator" id="pfCreator"><TextInput id="pfCreator" name="pfCreator" value={formData.pf.pfCreator} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="PF Approve" id="pfApprove"><TextInput id="pfApprove" name="pfApprove" value={formData.pf.pfApprove} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="Revision level" id="revisionLevel"><TextInput id="revisionLevel" name="revisionLevel" value={formData.pf.revisionLevel} onChange={pfHandleChange} /></LabeledInput>
                <LabeledInput label="Notes/comments" id="pf-notes"><TextArea id="pf-notes" name="notes" value={formData.pf.notes} onChange={pfHandleChange} rows={5} /></LabeledInput>
            </div>
        </div>
    );

    const TabButton: React.FC<{ tab: 'fmea' | 'cp' | 'pf'; children: React.ReactNode }> = ({ tab, children }) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm -mb-px border-gray-400 ${activeTab === tab ? 'bg-white border-t border-l border-r rounded-t-md' : 'bg-gray-200 border-b'}`}
        >
            {children}
        </button>
    );

    return (
        <div className="bg-gray-200 p-2 rounded-lg shadow-lg border border-gray-400">
            <div className="bg-white p-4">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-semibold">Project Data</h2>
                    {projectCount > 1 && (
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => onNavigate('previous')}
                                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                title="Previous Project"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
                            </button>
                            <button
                                onClick={() => onNavigate('next')}
                                className="p-1.5 rounded-full hover:bg-gray-200 transition-colors"
                                title="Next Project"
                            >
                                <ArrowRightIcon className="h-5 w-5 text-gray-700" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="border-b border-gray-400">
                    <TabButton tab="fmea">FMEA</TabButton>
                    <TabButton tab="cp">CP</TabButton>
                    <TabButton tab="pf">PF</TabButton>
                </div>
                <div className="border border-t-0 border-gray-400 bg-white min-h-[400px]">
                    {activeTab === 'fmea' && renderFmeaForm()}
                    {activeTab === 'cp' && renderCpForm()}
                    {activeTab === 'pf' && renderPfForm()}
                </div>
            </div>
            <div className="flex justify-end items-center p-3 mt-1 space-x-2">
                <button onClick={handleSaveClick} className="px-6 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 text-white bg-blue-600 hover:bg-blue-700 shadow-sm">Save</button>
            </div>
            {isFileLinksModalOpen && (
                <FileLinksModal
                    open={isFileLinksModalOpen}
                    onClose={() => setFileLinksModalOpen(false)}
                    filePaths={formData.fmea.filePaths || []}
                    fileLinks={formData.fmea.fileLinks || []}
                    onUpdate={handleUpdateLinks}
                />
            )}
        </div>
    );
};

export default ProjectDataView;