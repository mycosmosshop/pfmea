import React, { useRef } from 'react';

interface APClassificationModalProps {
    open: boolean;
    onClose: () => void;
    apMatrix: ('H' | 'M' | 'L')[][][];
    onUpdateMatrix: (newMatrix: ('H' | 'M' | 'L')[][][]) => void;
    onResetToDefault: () => void;
}

const getAPStyle = (ap: 'H' | 'M' | 'L') => {
    switch (ap) {
        case 'H': return 'bg-red-400 text-white';
        case 'M': return 'bg-yellow-300 text-black';
        case 'L': return 'bg-green-400 text-white';
        default: return 'bg-white';
    }
};

export const APClassificationModal: React.FC<APClassificationModalProps> = ({ open, onClose, apMatrix, onUpdateMatrix, onResetToDefault }) => {
    if (!open) return null;

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const parseApMatrixCsv = (csvText: string): ('H' | 'M' | 'L')[][][] => {
        const lines = csvText.trim().split(/\r?\n/);
        
        if (lines.length < 102) {
            throw new Error(`Invalid file format. Expected 102 rows, but found ${lines.length}.`);
        }

        const dataLines = lines.slice(2);
        const newMatrix: ('H' | 'M' | 'L')[][][] = [];

        for (let s = 0; s < 10; s++) { // Severity 1-10
            const severityBlock: ('H' | 'M' | 'L')[][] = [];
            for (let o = 0; o < 10; o++) { // Occurrence 1-10
                const lineIndex = s * 10 + o;
                const line = dataLines[lineIndex];
                if (!line) {
                    throw new Error(`Missing data at Severity ${s + 1}, Occurrence ${o + 1}.`);
                }

                const columns = line.split(',');
                if (columns.length < 12) {
                     throw new Error(`Invalid column count at Severity ${s + 1}, Occurrence ${o + 1}. Expected 12, found ${columns.length}.`);
                }
                
                const apValues = columns.slice(2).map(val => val.trim().toUpperCase());
                
                if (apValues.length !== 10) {
                     throw new Error(`Invalid AP value count at Severity ${s + 1}, Occurrence ${o + 1}. Expected 10, found ${apValues.length}.`);
                }

                const validatedApRow = apValues.map((ap, d) => {
                    if (ap === 'H' || ap === 'M' || ap === 'L') {
                        return ap;
                    }
                    throw new Error(`Invalid AP value "${ap}" at S=${s+1}, O=${o+1}, D=${d+1}. Must be 'H', 'M', or 'L'.`);
                });

                severityBlock.push(validatedApRow as ('H' | 'M' | 'L')[]);
            }
            newMatrix.push(severityBlock);
        }
        
        if (newMatrix.length !== 10 || newMatrix.some(s => s.length !== 10) || newMatrix.some(s => s.some(o => o.length !== 10))) {
            throw new Error("The final parsed matrix does not have the correct 10x10x10 dimensions.");
        }

        return newMatrix;
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const newMatrix = parseApMatrixCsv(text);
                onUpdateMatrix(newMatrix);
            } catch (error) {
                if (error instanceof Error) {
                    alert(`Error importing CSV: ${error.message}`);
                } else {
                    alert('An unknown error occurred during import.');
                }
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.onerror = () => {
            alert('Error reading file.');
        };
        reader.readAsText(file);
    };

    const handleExport = () => {
        const header1 = ['', '', 'Detectability', ...Array(9).fill('')].join(',');
        const header2 = ['Severity (S)', 'Occurrence (O)', ...Array.from({ length: 10 }, (_, i) => i + 1)].join(',');
        
        const csvRows = [header1, header2];

        apMatrix.forEach((occurrenceMatrix, s_idx) => {
            occurrenceMatrix.forEach((detectabilityRow, o_idx) => {
                const severity = o_idx === 0 ? s_idx + 1 : '';
                const occurrence = o_idx + 1;
                const row = [severity, occurrence, ...detectabilityRow].join(',');
                csvRows.push(row);
            });
        });

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "ap-classification-matrix.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const thClass = "p-1 border border-gray-400 bg-gray-200 font-bold text-xs sticky";
    const tdClass = "border border-gray-300 text-center font-mono text-xs w-6 h-6";
    const occurrenceThClass = "p-1 border border-gray-400 bg-gray-100 font-bold text-xs text-center";

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-5 m-4 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Action Priority (AP) Classification Table</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="overflow-auto">
                    <table className="border-collapse w-full">
                        <thead>
                            <tr>
                                <th className={thClass} style={{top: 0, left: 0, zIndex: 3}} colSpan={2}></th>
                                <th className={thClass} style={{top: 0, zIndex: 2}} colSpan={10}>Detectability (D)</th>
                            </tr>
                            <tr>
                                <th className={thClass} style={{top: '25px', left: 0, zIndex: 3}}>Severity (S)</th>
                                <th className={thClass} style={{top: '25px', zIndex: 1}}>Occurrence (O)</th>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map(d => (
                                    <th key={d} className={thClass} style={{top: '25px', zIndex: 1}}>{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {apMatrix.map((occurrenceMatrix, s_idx) => (
                                occurrenceMatrix.map((detectabilityRow, o_idx) => (
                                    <tr key={`${s_idx}-${o_idx}`}>
                                        {o_idx === 0 && (
                                            <td 
                                                className="p-1 border border-gray-400 bg-gray-100 font-bold text-xs text-center align-middle sticky"
                                                style={{left: 0, zIndex: 1}}
                                                rowSpan={10}
                                            >
                                                {s_idx + 1}
                                            </td>
                                        )}
                                        <td className={occurrenceThClass}>{o_idx + 1}</td>
                                        {detectabilityRow.map((ap, d_idx) => (
                                            <td key={d_idx} className={`${tdClass} ${getAPStyle(ap)}`}>
                                                {ap}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-between items-center mt-6">
                    <div className="flex items-center space-x-2">
                         <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            className="hidden"
                        />
                        <button 
                            onClick={handleImportClick} 
                            className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 shadow-sm"
                        >
                            Import from Excel (.csv)
                        </button>
                        <button 
                            onClick={handleExport} 
                            className="px-5 py-2 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700 shadow-sm"
                        >
                            Export to Excel (.csv)
                        </button>
                        <button 
                            onClick={onResetToDefault} 
                            className="px-5 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300 shadow-sm"
                        >
                            Reset to Default
                        </button>
                    </div>
                    <button onClick={onClose} className="px-5 py-2 bg-gray-500 text-white rounded-md text-sm font-semibold hover:bg-gray-600 shadow-sm">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};