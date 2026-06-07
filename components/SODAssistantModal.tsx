import React, { useState, useEffect, useMemo } from 'react';

interface SODAssistantModalProps {
    open: boolean;
    onClose: () => void;
}

const occurrenceFromRate = (p: number): number => {
    const thresholds = [
        { min: 0.10, O: 10 },
        { min: 0.05, O: 9 },
        { min: 0.02, O: 8 },
        { min: 0.01, O: 7 },
        { min: 0.005, O: 6 },
        { min: 0.001, O: 5 },
        { min: 0.0002, O: 4 },
        { min: 0.0001, O: 3 },
    ];
    for (const t of thresholds) {
        if (p >= t.min) return t.O;
    }
    return 2;
};

const CP_ROWS = ["0.5", "1.0", "1.33", "1.67", "2.0", "5.0"];
const MATRIX: { [key: string]: number[] } = {
    "0.5": [10, 10, 10, 10, 10, 10],
    "1.0": [7, 7, 7, 8, 9, 10],
    "1.33": [4, 5, 5, 6, 7, 7],
    "1.67": [2, 3, 3, 4, 4, 5],
    "2.0": [2, 2, 2, 2, 3, 3],
    "5.0": [2, 2, 2, 2, 2, 2]
};

export const SODAssistantModal: React.FC<SODAssistantModalProps> = ({ open, onClose }) => {
    const [nok, setNok] = useState('1');
    const [n, setN] = useState('75');
    const [useUCB, setUseUCB] = useState(false);
    const [cp, setCp] = useState('1.0');
    const [shift, setShift] = useState('0');

    const result = useMemo(() => {
        const numNok = Math.max(0, Number(nok || 0));
        const numN = Math.max(1, Number(n || 1));
        const p_raw = numNok / numN;
        const p95 = (numNok + 3) / numN;
        const p = useUCB ? p95 : p_raw;

        const O1 = occurrenceFromRate(p);
        const col = Number(shift);
        const O2 = MATRIX[cp][col];
        const Ofinal = Math.max(O1, O2);
        
        const p_text = (p * 100).toFixed(p >= 0.001 ? 2 : 4) + '%  (' + Math.round(p * 1e6) + ' ppm)';

        return { O1, p_text, O2, Ofinal, col_text: `${col}/5` };

    }, [nok, n, useUCB, cp, shift]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[120] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-gray-50 rounded-lg shadow-xl w-full max-w-3xl p-6 m-4 flex flex-col font-sans" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">SOD Assistant • Occurrence (O) Önerisi</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Kural: Numune verisi ve Cp/Cpk matrisinden gelen O’lardan <b>daha yüksek olan</b> kullanılır.</p>

                    <div>
                        <h4 className="text-md font-bold mb-2 text-gray-700">1) NOK / Örnek</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">NOK</label>
                                <input type="number" min="0" step="1" value={nok} onChange={e => setNok(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Örnek (n)</label>
                                <input type="number" min="1" step="1" value={n} onChange={e => setN(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Güvenlikli p (95% üst)</label>
                                <div className="flex items-center h-full">
                                    <input type="checkbox" checked={useUCB} onChange={e => setUseUCB(e.target.checked)} className="mr-2 h-4 w-4" />
                                    <span className="text-xs text-gray-600">p95 ≈ (NOK+3)/n</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 className="text-md font-bold mb-2 mt-4 text-gray-700">2) Cp / Cpk matrisi</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Cp (satır)</label>
                                <select value={cp} onChange={e => setCp(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                    <option>0.5</option><option>1.0</option><option>1.33</option>
                                    <option>1.67</option><option>2.0</option><option>5.0</option>
                                </select>
                            </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">Ortalama kayması (sütun)</label>
                                <select value={shift} onChange={e => setShift(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                                    <option value="0">Cpk≈Cp (en iyi)</option>
                                    <option value="1">Küçük</option>
                                    <option value="2">Orta</option>
                                    <option value="3">Belirgin</option>
                                    <option value="4">Yüksek</option>
                                    <option value="5">Aşırı (en kötü)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-white border border-gray-300 rounded-lg p-3">
                            <span className="text-xs text-gray-500">NOK/Örnek bazlı O</span>
                            <b className="block text-2xl font-bold mt-1">{result.O1}</b>
                            <div className="text-xs text-gray-500 mt-1">p: {result.p_text}</div>
                        </div>
                        <div className="bg-white border border-gray-300 rounded-lg p-3">
                            <span className="text-xs text-gray-500">Cp/Cpk matris O</span>
                            <b className="block text-2xl font-bold mt-1">{result.O2}</b>
                            <div className="text-xs text-gray-500 mt-1">Cp={cp}, sütun={result.col_text}</div>
                        </div>
                        <div className="bg-blue-100 border border-blue-400 rounded-lg p-3">
                            <span className="text-xs text-blue-800">Önerilen O</span>
                            <b className="block text-3xl font-bold mt-1 text-blue-800">{result.Ofinal}</b>
                        </div>
                    </div>

                    <details className="mt-4">
                        <summary className="text-xs text-gray-500 cursor-pointer">Cp/Cpk referans matrisi</summary>
                        <table className="w-full border-collapse mt-2 text-xs text-center">
                            <thead>
                                <tr>
                                    <th className="p-1 border bg-gray-200">Cp \ Kayma →</th>
                                    {Object.keys(MATRIX["0.5"]).map(i => <th key={i} className="p-1 border bg-gray-200">{i}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {CP_ROWS.map(cp_row => (
                                    <tr key={cp_row}>
                                        <th className="p-1 border bg-gray-100">{cp_row}</th>
                                        {MATRIX[cp_row].map((val, idx) => <td key={idx} className="p-1 border bg-white">{val}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </details>
                     <p className="text-xs text-gray-500 mt-2">
                        Güncel eşikler: ≥10%→10, ≥5%→9, ≥2%→8, ≥1%→7, ≥0.5%→6, ≥0.1%→5, ≥0.02%→4, ≥0.01%→3, &lt;0.01%→2 (O=1 özel durum).
                    </p>
                </div>
                
                <div className="flex justify-end mt-6 pt-4 border-t">
                    <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 shadow-sm">
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};
