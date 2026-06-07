
import React, { useState, useEffect, useRef } from 'react';
import { saveFile, getFile, deleteFile, checkFileExists } from '../utils/db';
import { SpinnerIcon, FileIcon } from './icons/Icons';

interface FileLinksModalProps {
    open: boolean;
    onClose: () => void;
    filePaths: string[];
    fileLinks: string[];
    onUpdate: (data: { filePaths: string[]; fileLinks: string[] }) => void;
}

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5 inline-block align-text-bottom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
);

type FileStatus = 'available' | 'checking' | 'missing';
interface StoredFile {
    name: string;
    status: FileStatus;
}

export const FileLinksModal: React.FC<FileLinksModalProps> = ({ open, onClose, filePaths, fileLinks, onUpdate }) => {
    
    const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
    const [internalFileLinks, setInternalFileLinks] = useState<string[]>([]);
    const [selectedPathIndex, setSelectedPathIndex] = useState<number | null>(null);
    const [selectedLinkIndex, setSelectedLinkIndex] = useState<number | null>(null);
    const [urlInputValue, setUrlInputValue] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setInternalFileLinks(fileLinks);
            setSelectedPathIndex(null);
            setSelectedLinkIndex(null);
            setUrlInputValue('');
            setIsDragging(false);

            const initialFiles = filePaths.map(name => ({ name, status: 'checking' as FileStatus }));
            setStoredFiles(initialFiles);
            
            initialFiles.forEach((file, index) => {
                checkFileExists(file.name).then(exists => {
                    setStoredFiles(prevFiles => {
                        const newFiles = [...prevFiles];
                        if (newFiles[index] && newFiles[index].name === file.name) {
                            newFiles[index].status = exists ? 'available' : 'missing';
                        }
                        return newFiles;
                    });
                });
            });
        }
    }, [open, filePaths, fileLinks]);

    const addFiles = async (files: FileList | null) => {
        if (!files) return;

        for (const file of Array.from(files)) {
            const existingFile = storedFiles.find(sf => sf.name === file.name);
            if (!existingFile) {
                setStoredFiles(prev => [...prev, { name: file.name, status: 'available' }]);
                await saveFile(file);
            } else if (existingFile.status === 'missing') {
                await saveFile(file);
                setStoredFiles(prev => prev.map(sf => sf.name === file.name ? { ...sf, status: 'available' } : sf));
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            addFiles(e.target.files);
             if(e.target) e.target.value = ''; // Reset file input
        }
    };

    const handleAddLink = () => {
        const link = urlInputValue.trim();
        if (link) {
            setInternalFileLinks(prev => [...prev, link]);
            setUrlInputValue('');
        }
    };
    
    const handleRemove = async () => {
        if (selectedPathIndex !== null) {
            const fileToRemove = storedFiles[selectedPathIndex];
            if (fileToRemove) {
                await deleteFile(fileToRemove.name);
                setStoredFiles(prev => prev.filter((_, i) => i !== selectedPathIndex));
            }
            setSelectedPathIndex(null);
        }
        if (selectedLinkIndex !== null) {
            setInternalFileLinks(prev => prev.filter((_, i) => i !== selectedLinkIndex));
            setSelectedLinkIndex(null);
        }
    };

    const handleSaveAndClose = () => {
        const finalFilePaths = storedFiles.map(f => f.name);
        onUpdate({ filePaths: finalFilePaths, fileLinks: internalFileLinks });
        onClose();
    };

    const handlePathClick = (index: number) => {
        setSelectedPathIndex(index);
        setSelectedLinkIndex(null);
    };

    const handleLinkClick = (index: number) => {
        setSelectedLinkIndex(index);
        setSelectedPathIndex(null);
    };

    const handleDownloadPath = async (fileName: string) => {
        const file = await getFile(fileName);
        if (file) {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            alert('File data could not be retrieved. Please try adding it again.');
            setStoredFiles(prev => prev.map(sf => sf.name === fileName ? { ...sf, status: 'missing' } : sf));
        }
    };

    const handleOpenLink = (link: string) => {
        let url = link;
        if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
        }
        try {
            window.open(url, '_blank', 'noopener,noreferrer');
        } catch (e) {
            console.error('Failed to open link:', e);
            alert('Could not open the link. Please ensure it is a valid URL.');
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-gray-200 rounded-sm shadow-xl w-full max-w-lg p-0 flex flex-col font-sans border border-gray-500" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center bg-gray-300 px-2 py-1 border-b border-gray-400">
                    <div className="flex items-center space-x-2">
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACYSURBVDhPzZELCsAgCEN/0p/0J/1S/pP+zYliQ1Z96IMgCHBlg84WCCgUBwim7g1cCTyAJoRxD0Clna8A8Bl4Ase4iAEwAnfAAlx8AJAo0sbmG/Bv4ACwI5INsAasgU8yQXgCq7ACE7CKnCILsE4sgF4yRjgEHwDq9/TxA3Yf0c8sA4g7zzwA3gN3QSkYBCyAOtM2rjbz4wAAAABJRU5ErkJggg==" alt="FMEA logo" className="h-4 w-4" />
                        <h3 className="text-sm font-semibold text-gray-800">File links</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="bg-gray-200 p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">File paths</label>
                        <div className="border border-gray-500 bg-white h-32 overflow-y-auto p-0">
                            {storedFiles.map((file, index) => {
                                const { name, status } = file;
                                const isAvailable = status === 'available';
                                const isChecking = status === 'checking';
                                
                                const getTooltip = () => {
                                    if (isAvailable) return "Double-click to download";
                                    if (isChecking) return "Checking file availability...";
                                    return "File content not found. Please add the file again to make it downloadable.";
                                };

                                return (
                                    <div 
                                        key={index} 
                                        onClick={() => handlePathClick(index)}
                                        onDoubleClick={() => isAvailable && handleDownloadPath(name)}
                                        title={getTooltip()}
                                        className={`px-2 py-0.5 text-sm flex items-center ${selectedPathIndex === index ? 'bg-blue-600 text-white' : ''} ${isAvailable ? 'cursor-pointer hover:bg-gray-100' : 'text-gray-500 cursor-default'}`}
                                    >
                                        {isAvailable && <DownloadIcon />}
                                        {isChecking && <SpinnerIcon />}
                                        {!isAvailable && !isChecking && <FileIcon className="text-gray-400" />}
                                        <span className="truncate">{name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">File links (URL)</label>
                        <div className="border border-gray-500 bg-white h-32 overflow-y-auto p-0">
                             {internalFileLinks.map((link, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => handleLinkClick(index)}
                                    onDoubleClick={() => handleOpenLink(link)}
                                    title="Double-click to open link in a new tab"
                                    className={`px-2 py-0.5 text-sm cursor-pointer truncate ${selectedLinkIndex === index ? 'bg-blue-600 text-white' : 'text-blue-700 hover:underline'}`}
                                >
                                    {link}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="bg-gray-200 px-4 pt-3 pb-4 space-y-4 border-t border-gray-300">
                     <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Add from your computer</label>
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`border-2 border-dashed border-gray-500 rounded text-center p-4 transition-colors ${isDragging ? 'bg-blue-100 border-blue-500' : 'bg-gray-100'}`}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                multiple
                            />
                            <p className="text-gray-600 text-sm">Drag & drop files here, or</p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500"
                            >
                                Browse files...
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Note: Added files are stored in your browser. They are not uploaded to a server.</p>
                    </div>
                    <div>
                        <label htmlFor="url-input" className="block text-sm font-semibold text-gray-700 mb-1">Add link (URL)</label>
                        <div className="flex space-x-2">
                            <input 
                                id="url-input"
                                type="text"
                                value={urlInputValue}
                                onChange={(e) => setUrlInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                                placeholder="Enter URL..."
                                className="flex-grow text-sm border border-gray-500 bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button onClick={handleAddLink} disabled={!urlInputValue.trim()} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">Add</button>
                        </div>
                    </div>
                </div>


                <div className="flex items-center justify-between p-3 bg-gray-200 border-t border-gray-300">
                    <button onClick={handleRemove} disabled={selectedPathIndex === null && selectedLinkIndex === null} className="px-3 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed">Remove selected</button>
                    <button onClick={handleSaveAndClose} className="px-5 py-1 text-sm border rounded bg-gray-200 hover:bg-gray-300 border-gray-500">Close</button>
                </div>
            </div>
        </div>
    );
};
