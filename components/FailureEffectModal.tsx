import React, { useState, useEffect, useMemo } from "react";
import type { FailureEffect, RegistryData } from "../types";

export type FailureEffectModalProps = {
  open: boolean;
  effectData?: Partial<FailureEffect>;
  registryData: RegistryData;
  onClose: () => void;
  onSave: (data: FailureEffect) => void;
  onUpdateRegistry: (action: {type: string, payload: any}) => void;
};

const Pill: React.FC<{text: string; onDelete?: () => void}> = ({ text, onDelete }) => (
    <span className="inline-flex items-center gap-2 bg-gray-200 border border-gray-300 py-1 px-2 rounded-full text-xs">
        {text}
        {onDelete && <span onClick={onDelete} className="cursor-pointer text-black opacity-60 hover:opacity-100">&times;</span>}
    </span>
);


export default function FailureEffectModal(props: FailureEffectModalProps) {
  const { open, effectData, registryData, onClose, onSave, onUpdateRegistry } = props;

  const [localData, setLocalData] = useState<Partial<FailureEffect>>({});
  const [newClientTypeName, setNewClientTypeName] = useState('');
  const [newPfName, setNewPfName] = useState('');

  useEffect(() => {
    if (open) {
      const initialData: Partial<FailureEffect> = {
        severity: 1,
        effectText: '',
        clientType: '',
        selectedPFByType: {},
        ...effectData
      };
      setLocalData(initialData);
      setNewClientTypeName('');
      setNewPfName('');
    }
  }, [open, effectData]);

  const currentClientKey = localData.clientType || '';
  const currentPfList = registryData.processFunctionsByType?.[currentClientKey] || [];
  const currentPfSelection = localData.selectedPFByType?.[currentClientKey] || '';

  const handleAddClientType = () => {
    const trimmedName = newClientTypeName.trim().toUpperCase();
    if (!trimmedName || registryData.clientTypes.includes(trimmedName)) return;

    onUpdateRegistry({ type: 'add_client_type', payload: { name: trimmedName } });
    setLocalData(prev => ({ ...prev, clientType: trimmedName }));
    setNewClientTypeName('');
  };
  
  const handleNewClientTypeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddClientType();
    }
  };

  const handleDeleteClientType = (name: string) => {
    onUpdateRegistry({ type: 'delete_client_type', payload: { name }});
    if (localData.clientType === name) {
        setLocalData(prev => ({ ...prev, clientType: '' }));
    }
  };

  const handleAddPf = () => {
    const trimmedName = newPfName.trim();
    if (!trimmedName || !currentClientKey) return;
    
    onUpdateRegistry({ type: 'add_process_function', payload: { clientType: currentClientKey, name: trimmedName }});
    setLocalData(prev => ({
      ...prev,
      selectedPFByType: {
        ...(prev.selectedPFByType || {}),
        [currentClientKey]: trimmedName
      }
    }));
    setNewPfName('');
  };

  const handleNewPfKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddPf();
    }
  };

  const handleDeletePf = (name: string) => {
      if (!currentClientKey) return;
      onUpdateRegistry({ type: 'delete_process_function', payload: { clientType: currentClientKey, name }});
       if (localData.selectedPFByType?.[currentClientKey] === name) {
          setLocalData(prev => ({
              ...prev,
              selectedPFByType: { ...prev.selectedPFByType, [currentClientKey]: '' }
          }));
      }
  };

  const handleOk = () => {
    const finalData = {
        id: localData.id || `fe_${Date.now()}`,
        clientType: localData.clientType || '',
        effectText: localData.effectText || '',
        severity: localData.severity ?? 1,
        selectedPFByType: localData.selectedPFByType || {},
    };
    onSave(finalData as FailureEffect);
  };
  
  if (!open) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        className="fixed inset-0 bg-black bg-opacity-50 grid place-items-center z-[100]"
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.target instanceof HTMLInputElement) e.preventDefault(); }}
          className="w-[720px] max-w-full bg-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
        >
          <div className="flex justify-between items-center mb-2">
            <strong className="text-lg">Failure effect</strong>
            <button type="button" onClick={onClose} aria-label="Close" className="px-3 py-1 rounded-md hover:bg-gray-100">&times;</button>
          </div>
          
          <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">Client type (global liste)</label>
              <div className="flex gap-2 items-center">
                  <select value={currentClientKey} onChange={e => setLocalData(p => ({...p, clientType: e.target.value}))} className="flex-1 p-2 border border-gray-300 rounded-md bg-white">
                      <option value="">Seçiniz…</option>
                      {registryData.clientTypes.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <input 
                      value={newClientTypeName}
                      onChange={e => setNewClientTypeName(e.target.value)}
                      onKeyDown={handleNewClientTypeKeyDown}
                      placeholder="Yeni tip (örn: X)"
                      className="flex-1 p-2 border border-gray-300 rounded-md"
                  />
              </div>
              <div className="text-xs text-gray-500">Bu listede ekleme/silme GLOBAL'dir (tüm FE’lerde geçerlidir).</div>
              <div className="flex flex-wrap gap-2 mt-1.5">
                  {registryData.clientTypes.map(type => <Pill key={type} text={type} onDelete={() => handleDeleteClientType(type)} />)}
              </div>
          </div>

          <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500">Process function (seçili client type’a bağlı global liste)</label>
              <div className="flex gap-2 items-center">
                  <select value={currentPfSelection} onChange={e => setLocalData(p => ({...p, selectedPFByType: {...(p.selectedPFByType||{}), [currentClientKey]: e.target.value}}))} className="flex-1 p-2 border border-gray-300 rounded-md bg-white" disabled={!currentClientKey}>
                      <option value="">Seçiniz…</option>
                      {currentPfList.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                  <input 
                    value={newPfName} 
                    onChange={e => setNewPfName(e.target.value)} 
                    onKeyDown={handleNewPfKeyDown}
                    placeholder="Yeni process function" 
                    className="flex-1 p-2 border border-gray-300 rounded-md" 
                    disabled={!currentClientKey}
                  />
              </div>
              <div className="text-xs text-gray-500">Buradaki PF’ler seçili tipe bağlıdır ve GLOBAL'dir (tüm FE’ler aynı listeyi görür).</div>
               <div className="flex flex-wrap items-center gap-2 mt-1.5 p-2 border rounded-md min-h-[38px] bg-gray-50">
                  {currentPfList.length > 0 ? (
                      currentPfList.map(name => <Pill key={name} text={name} onDelete={() => handleDeletePf(name)} />)
                  ) : (
                      <span className="text-xs text-gray-500 flex items-center">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-gray-300 text-white mr-2">-</span>
                          Bu tip için PF yok.
                      </span>
                  )}
              </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-500">Effect:</label>
            <textarea
              value={localData.effectText || ''}
              onChange={(e) => setLocalData(p => ({...p, effectText: e.target.value}))}
              placeholder="effect…"
              className="p-2 border border-gray-300 rounded-md min-h-[90px] resize-y"
            />
          </div>

          <div className="flex gap-2.5 items-center">
            <label htmlFor="severity-input" className="font-bold mr-1.5">S:</label>
            <input
              id="severity-input"
              type="number"
              value={localData.severity ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                    setLocalData(p => ({ ...p, severity: undefined }));
                } else {
                    const num = parseInt(value, 10);
                    if (!isNaN(num) && num >= 1 && num <= 10) {
                        setLocalData(p => ({ ...p, severity: num }));
                    }
                }
              }}
              min="1"
              max="10"
              className="p-2 border border-gray-300 rounded-md w-24"
            />
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 bg-white rounded-md hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={handleOk} className="px-4 py-2 border border-blue-600 bg-blue-600 text-white rounded-md hover:bg-blue-700">OK</button>
          </div>
        </form>
      </div>
    </>
  );
}