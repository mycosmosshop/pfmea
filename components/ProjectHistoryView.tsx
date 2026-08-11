import React, { useState, useEffect } from 'react';
import type { ProjectData, HistoryEntry } from '../types';

interface ProjectHistoryViewProps {
    data: ProjectData;
    onSave: (newData: ProjectData) => void;
    onLogChanges?: (currentHistory: HistoryEntry[]) => void; // opsiyonel: tablodaki değişiklikleri otomatik ekle
}

const inputCls = "w-full text-sm border border-gray-400 bg-white px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
const cellInputCls = "w-full text-sm border border-gray-300 bg-white px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

const newId = () => `h_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
const today = () => new Date().toISOString().slice(0, 10);

// Genel bilgiler artık düzenlenebilir (eskiden salt-okunur metindi).
const EditRow: React.FC<{
    label: string; value?: string; onChange: (v: string) => void;
    type?: string; multiline?: boolean; extra?: React.ReactNode;
}> = ({ label, value, onChange, type, multiline, extra }) => (
    <div className="flex border border-gray-300">
        <div className="w-44 flex-shrink-0 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 border-r border-gray-300 flex items-center">{label}</div>
        <div className="flex-grow flex items-center gap-1 px-1 py-1">
            {multiline
                ? <textarea rows={2} className={`${cellInputCls} border-transparent hover:border-gray-300`} value={value || ''} onChange={e => onChange(e.target.value)} />
                : <input type={type || 'text'} className={`${cellInputCls} border-transparent hover:border-gray-300`} value={value || ''} onChange={e => onChange(e.target.value)} />}
            {extra}
        </div>
    </div>
);

const ProjectHistoryView: React.FC<ProjectHistoryViewProps> = ({ data, onSave, onLogChanges }) => {
    const [history, setHistory] = useState<HistoryEntry[]>(data.history ? [...data.history] : []);
    const [f, setF] = useState(data.fmea);

    useEffect(() => { setHistory(data.history ? [...data.history] : []); setF(data.fmea); }, [data]);

    const setFmea = (field: keyof typeof f, value: string) => setF(prev => ({ ...prev, [field]: value }));

    // FMEA No / Versiyon geçmişle uyumsuz kalabiliyordu (üstte "FR34 / Rev.08", geçmişin sonu "Rev2").
    // Bu buton no kısmını korur, revizyonu geçmişin SON satırından alır; tarihi de eşitler.
    const sonRev = history.length ? history[history.length - 1] : null;
    const gecmisteknVersiyon = sonRev
        ? `${(f.fmeaNumberVersion || '').split('/')[0].trim() || 'FMEA'} / ${sonRev.revision}`
        : '';
    const versiyonUyumsuz = !!sonRev && f.fmeaNumberVersion !== gecmisteknVersiyon;
    const gecmistenAl = () => {
        if (!sonRev) return;
        setF(prev => ({ ...prev, fmeaNumberVersion: gecmisteknVersiyon, lastRevisionDate: sonRev.date || prev.lastRevisionDate }));
    };

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

    const save = () => onSave({ ...data, fmea: f, history });

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
                <EditRow label="Firma Adı" value={f.companyName} onChange={v => setFmea('companyName', v)} />
                <EditRow label="Müşteri" value={f.client} onChange={v => setFmea('client', v)} />
                <EditRow label="Parça Adı / No" value={f.productName} onChange={v => setFmea('productName', v)} />
                <EditRow label="Proje / Referans" value={f.project} onChange={v => setFmea('project', v)} />
                <EditRow label="FMEA No / Versiyon" value={f.fmeaNumberVersion} onChange={v => setFmea('fmeaNumberVersion', v)}
                    extra={sonRev ? (
                        <button type="button" onClick={gecmistenAl}
                            title={`Geçmişin son satırına göre eşitle → ${gecmisteknVersiyon} · ${sonRev.date || '-'}`}
                            className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded transition-colors ${versiyonUyumsuz
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                            ⇅ Geçmişten al
                        </button>
                    ) : undefined} />
                <EditRow label="Oluşturma Tarihi" value={f.firstFmeaDate} onChange={v => setFmea('firstFmeaDate', v)} type="date" />
                <EditRow label="Son Revizyon Tarihi" value={f.lastRevisionDate} onChange={v => setFmea('lastRevisionDate', v)} type="date" />
                <EditRow label="Ekip" value={f.teamMembers} onChange={v => setFmea('teamMembers', v)} multiline />
            </div>

            {versiyonUyumsuz && (
                <div className="mb-4 px-3 py-2 border border-amber-300 bg-amber-50 text-amber-800 text-xs rounded">
                    ⚠ <b>FMEA No / Versiyon</b> ({f.fmeaNumberVersion || '-'}) geçmişin son satırıyla ({sonRev?.revision}) uyuşmuyor.
                    Yukarıdaki <b>⇅ Geçmişten al</b> ile eşitleyebilir ya da alanı elle düzeltebilirsin.
                </div>
            )}
            {/* PFMEA Geçmişi tablosu */}
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-700">1. PFMEA Geçmişi (PFMEA History)</h3>
                <div className="flex items-center gap-2">
                    {onLogChanges && (
                        <button
                            onClick={() => onLogChanges(history)}
                            title="Son revizyon kaydından beri FMEA tablosundaki değişiklikleri otomatik tespit edip yeni satır olarak ekler ve kaydeder."
                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md hover:bg-indigo-700 transition-colors">
                            ⟳ Değişiklikleri Otomatik Ekle
                        </button>
                    )}
                    <button onClick={addRow} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors">
                        + Revizyon Ekle
                    </button>
                </div>
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
                Not: Genel bilgiler artık burada da düzenlenebilir; “Kaydet” dediğinde <b>Project Data</b> sekmesine de yazılır.
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
