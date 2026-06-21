import React, { useState, useEffect } from 'react';
import type { ProjectData, HistoryEntry } from '../types';

interface ProjectHistoryViewProps {
    data: ProjectData;
    onSave: (newData: ProjectData) => void;
}

const inputCls = "w-full text-sm border border-gray-400 bg-white px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
const cellInputCls = "w-full text-sm border border-gray-300 bg-white px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

const newId = () => `h_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);

const InfoRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
    <div className="flex border border-gray-300">
        <div className="w-44 flex-shrink-0 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 border-r border-gray-300">{label}</div>
        <div className="flex-grow px-3 py-2 text-sm text-gray-900">{value || '-'}</div>
    </div>
);

const ProjectHistoryView: React.FC<ProjectHistoryViewProps> = ({ data, onSave }) => {
    const [history, setHistory] = useState<HistoryEntry[]>(data.history ? [...data.history] : []);
    const f = data.fmea;

    useEffect(() => { setHistory(data.history ? [...data.history] : []); }, [data]);

    const update = (id: string, field: keyof HistoryEntry, value: string) =>
        setHistory(h => h.map(r => (r.id === id ? { ...r, [field]: value } : r)));

    const addRow = () => setHistory(h => [...h, {
        id: newId(),
        revision: f.fmeaNumberVersion || String(h.length),
        date: f.lastRevisionDate || today(),
        changeDescription: '',
        changeReason: '',
        preparedBy: f.fmeaCreator || '',
        approvedBy: f.fmeaApprover || '',
    }]);

    const removeRow = (id: string) => setHistory(h => h.filter(r => r.id !== id));

    const move = (id: string, dir: -1 | 1) => setHistory(h => {
        const i = h.findIndex(r => r.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= h.length) return h;
        const copy = [...h];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
    });

    const save = () => onSave({ ...data, history });

    const th = "px-2 py-2 text-left text-xs font-semibold text-gray-600 border border-gray-300 bg-gray-100";

    return (
        <div className="p-6 bg-white h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Project History — PFMEA Değişiklik Geçmişi</h2>
                <button onClick={save} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    Kaydet
                </button>
            </div>

            {/* Genel Bilgiler — Project Data'dan otomatik alınır */}
            <h3 className="text-sm font-bold text-gray-700 mb-2">Genel Bilgiler</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-6">
                <InfoRow label="Firma Adı" value={f.companyName} />
                <InfoRow label="Müşteri" value={f.client} />
                <InfoRow label="Parça Adı / No" value={f.productName} />
                <InfoRow label="Proje / Referans" value={f.project} />
                <InfoRow label="FMEA No / Versiyon" value={f.fmeaNumberVersion} />
                <InfoRow label="Oluşturma Tarihi" value={f.firstFmeaDate} />
                <InfoRow label="Son Revizyon Tarihi" value={f.lastRevisionDate} />
                <InfoRow label="Ekip" value={f.teamMembers} />
            </div>

            {/* PFMEA Geçmişi tablosu */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-700">1. PFMEA Geçmişi (PFMEA History)</h3>
                <button onClick={addRow} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors">
                    + Revizyon Ekle
                </button>
            </div>

            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className={`${th} w-16`}>Revizyon</th>
                        <th className={`${th} w-32`}>Tarih</th>
                        <th className={th}>Değişiklik Açıklaması</th>
                        <th className={th}>Değişiklik Nedeni</th>
                        <th className={`${th} w-40`}>Hazırlayan</th>
                        <th className={`${th} w-40`}>Onaylayan</th>
                        <th className={`${th} w-24`}>İşlem</th>
                    </tr>
                </thead>
                <tbody>
                    {history.length === 0 && (
                        <tr>
                            <td colSpan={7} className="border border-gray-300 px-3 py-6 text-center text-sm text-gray-400">
                                Henüz revizyon kaydı yok. “+ Revizyon Ekle” ile ekleyin.
                            </td>
                        </tr>
                    )}
                    {history.map(r => (
                        <tr key={r.id} className="align-top">
                            <td className="border border-gray-300 p-1"><input className={cellInputCls} value={r.revision} onChange={e => update(r.id, 'revision', e.target.value)} /></td>
                            <td className="border border-gray-300 p-1"><input type="date" className={cellInputCls} value={r.date} onChange={e => update(r.id, 'date', e.target.value)} /></td>
                            <td className="border border-gray-300 p-1"><textarea rows={2} className={cellInputCls} value={r.changeDescription} onChange={e => update(r.id, 'changeDescription', e.target.value)} /></td>
                            <td className="border border-gray-300 p-1"><textarea rows={2} className={cellInputCls} value={r.changeReason} onChange={e => update(r.id, 'changeReason', e.target.value)} /></td>
                            <td className="border border-gray-300 p-1"><input className={cellInputCls} value={r.preparedBy} onChange={e => update(r.id, 'preparedBy', e.target.value)} /></td>
                            <td className="border border-gray-300 p-1"><input className={cellInputCls} value={r.approvedBy} onChange={e => update(r.id, 'approvedBy', e.target.value)} /></td>
                            <td className="border border-gray-300 p-1">
                                <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => move(r.id, -1)} title="Yukarı" className="px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">▲</button>
                                    <button onClick={() => move(r.id, 1)} title="Aşağı" className="px-1.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">▼</button>
                                    <button onClick={() => removeRow(r.id)} title="Sil" className="px-1.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded">✕</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p className="mt-3 text-xs text-gray-400">
                Not: Genel bilgiler “Project Data” sekmesinden gelir. Değişiklikleri kalıcı yapmak için “Kaydet”e basın.
            </p>

            <div className="mt-6 text-right">
                <button onClick={save} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    Kaydet
                </button>
            </div>
        </div>
    );
};

export default ProjectHistoryView;
