// src/components/LocalYoloUploader.tsx
"use client";

import React, { useState, useRef, type ChangeEvent, type FormEvent, type DragEvent, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';

// Interfaces
interface BackendResponse {
    message: string;
    imageUrl: string;
    detections: DetectionResult[];
}
interface DetectionResult {
    class: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number; };
    color?: string;
}
interface ImageUploaderProps {
    onUploadComplete?: () => void;
}
interface UploadProgress {
    fileName: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    message?: string;
    result?: BackendResponse;
}

const MAX_FILES_UPLOAD = 100; // Límite de archivos a subir a la vez

// --- Helper para leer entradas de directorio (para drag & drop de carpetas) ---
async function readFileEntry(fileEntry: any): Promise<File | null> {
    return new Promise((resolve, reject) => {
        fileEntry.file(
            (file: File) => resolve(file),
            (err: any) => {
                console.error("Error al obtener archivo de FileEntry:", err);
                resolve(null); // Resuelve con null en caso de error para no romper Promise.all
            }
        );
    });
}

async function readDirectoryEntriesRecursive(directoryEntry: any): Promise<File[]> {
    const files: File[] = [];
    const reader = directoryEntry.createReader();

    const readBatch = (): Promise<void> => {
        return new Promise((resolveBatch, rejectBatch) => {
            reader.readEntries(async (entries: any[]) => {
                if (entries.length === 0) {
                    resolveBatch(); // No más entradas
                    return;
                }

                const filePromises: Promise<File | null>[] = [];
                const dirPromises: Promise<File[]>[] = [];

                for (const entry of entries) {
                    if (entry.isFile) {
                        filePromises.push(readFileEntry(entry));
                    } else if (entry.isDirectory) {
                        // Recursión para subdirectorios (opcional, puede ser intensivo)
                        // Por ahora, no vamos a profundizar en subdirectorios para simplificar
                        // dirPromises.push(readDirectoryEntriesRecursive(entry));
                        console.log(`FRONTEND_UPLOADER: Omitiendo subdirectorio (no recursivo): ${entry.name}`);
                    }
                }

                try {
                    const resolvedFiles = (await Promise.all(filePromises)).filter(f => f !== null) as File[];
                    files.push(...resolvedFiles.filter(file => file.type.startsWith('image/')));

                    // const resolvedDirFiles = (await Promise.all(dirPromises)).flat();
                    // files.push(...resolvedDirFiles);

                    readBatch().then(resolveBatch).catch(rejectBatch); // Leer el siguiente lote
                } catch (err) {
                    rejectBatch(err);
                }
            }, (err: any) => {
                console.error("Error leyendo entradas de directorio:", err);
                rejectBatch(err);
            });
        });
    };

    await readBatch();
    return files;
}
// --- Fin Helpers de Directorio ---


export function LocalYoloUploader({ onUploadComplete }: ImageUploaderProps) {
    const { data: session, status } = useSession();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
    const [isProcessingOverall, setIsProcessingOverall] = useState(false);
    const [overallError, setOverallError] = useState<string | null>(null);
    const [overallSuccess, setOverallSuccess] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const dropZoneRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Efecto para generar previews cuando selectedFiles cambie
    useEffect(() => {
        console.log("FRONTEND_UPLOADER: useEffect[selectedFiles] disparado. Archivos:", selectedFiles.map(f => f.name));
        if (selectedFiles.length === 0) {
            setPreviewUrls([]);
            return;
        }
        const fileReaderPromises = selectedFiles.map(file => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        });
        Promise.all(fileReaderPromises)
            .then(results => {
                setPreviewUrls(results);
                console.log("FRONTEND_UPLOADER: Previews actualizadas:", results.length);
            })
            .catch(error => {
                console.error("FRONTEND_UPLOADER: Error generando previews en useEffect:", error);
                setPreviewUrls([]);
            });
    }, [selectedFiles]);


    // --- Lógica Centralizada para Añadir Archivos ---
    const addFilesToSelection = useCallback((newFiles: File[]) => {
        if (newFiles.length === 0) {
            console.log("FRONTEND_UPLOADER: addFilesToSelection - no se añadieron nuevos archivos válidos.");
            if (selectedFiles.length === 0) { // Solo mostrar error si no había nada antes
                setOverallError("No se encontraron archivos de imagen válidos.");
            }
            return;
        }
        console.log("FRONTEND_UPLOADER: addFilesToSelection - añadiendo:", newFiles.map(f => f.name));

        setSelectedFiles(prevSelected => {
            const combined = [...prevSelected, ...newFiles];
            const uniqueMap = new Map<string, File>();
            combined.forEach(file => {
                // Usar nombre + tamaño + última modificación como clave de unicidad
                const uniqueKey = `${file.name}-${file.size}-${file.lastModified}`;
                if (!uniqueMap.has(uniqueKey)) {
                    uniqueMap.set(uniqueKey, file);
                }
            });
            const uniqueCombined = Array.from(uniqueMap.values());
            const limited = uniqueCombined.slice(0, MAX_FILES_UPLOAD);

            if (uniqueCombined.length > MAX_FILES_UPLOAD) {
                setOverallError(`Puedes tener un máximo de ${MAX_FILES_UPLOAD} imágenes. Se tomaron las primeras o las más recientes.`);
            } else {
                setOverallError(null);
            }
            console.log("FRONTEND_UPLOADER: setSelectedFiles (desde addFilesToSelection) - Archivos finales:", limited.map(f => f.name));
            return limited;
        });
        setUploadProgress([]);
        setOverallSuccess(null);
    }, [selectedFiles]); // Depender de selectedFiles para la parte de 'combined'


    const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.items?.length) setIsDragging(true); }, []);
    const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (dropZoneRef.current && e.relatedTarget && !dropZoneRef.current.contains(e.relatedTarget as Node)) setIsDragging(false); else if (!e.relatedTarget) setIsDragging(false); }, []);
    const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); if (!isDragging) setIsDragging(true); }, [isDragging]);

    const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
        console.log("FRONTEND_UPLOADER: Archivos soltados (handleDrop).");
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFilesArray: File[] = [];
        if (e.dataTransfer.items) {
            const itemsArray = Array.from(e.dataTransfer.items);
            for (const item of itemsArray) {
                if (item.kind === 'file') {
                    const entry = item.webkitGetAsEntry();
                    if (entry?.isFile) {
                        const file = await readFileEntry(entry);
                        if (file && file.type.startsWith('image/')) droppedFilesArray.push(file);
                    } else if (entry?.isDirectory) {
                        console.log("FRONTEND_UPLOADER: Procesando carpeta arrastrada:", entry.name);
                        try {
                            const filesFromDir = await readDirectoryEntriesRecursive(entry);
                            droppedFilesArray.push(...filesFromDir);
                        } catch (dirErr) {
                            console.error(`Error leyendo carpeta ${entry.name}:`, dirErr);
                            setOverallError(`No se pudo leer la carpeta ${entry.name}.`);
                        }
                    } else { // Fallback si no es entry o no es reconocido
                        const file = item.getAsFile();
                        if (file && file.type.startsWith('image/')) droppedFilesArray.push(file);
                    }
                }
            }
        } else { // Fallback para e.dataTransfer.files
            const files = Array.from(e.dataTransfer.files);
            droppedFilesArray.push(...files.filter(f => f.type.startsWith('image/')));
        }
        addFilesToSelection(droppedFilesArray);
    }, [addFilesToSelection]);


    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        console.log("FRONTEND_UPLOADER: Archivos seleccionados desde input (handleFileChange).");
        if (event.target.files) {
            addFilesToSelection(Array.from(event.target.files));
        }
        if (fileInputRef.current) fileInputRef.current.value = ""; // Resetea el input
    };

    const handleButtonClick = () => {
        console.log("FRONTEND_UPLOADER: Clic en zona/botón de seleccionar.");
        if (!isProcessingOverall && status === 'authenticated') {
            fileInputRef.current?.click();
        }
    };

    const uploadProgressRef = useRef<UploadProgress[]>(uploadProgress);
    useEffect(() => { uploadProgressRef.current = uploadProgress; }, [uploadProgress]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (selectedFiles.length === 0 || status !== 'authenticated') { /* ... */ return; }
        console.log(`FRONTEND_UPLOADER: handleSubmit con ${selectedFiles.length} archivos.`);
        setIsProcessingOverall(true);
        setOverallError(null);
        setOverallSuccess(null);
        const initialProgress = selectedFiles.map(file => ({ fileName: file.name, status: 'pending' } as UploadProgress));
        setUploadProgress(initialProgress);

        const uploadPromises = selectedFiles.map(async (file, index) => {
            const updateFileProgress = (pStatus: UploadProgress['status'], message?: string, result?: BackendResponse) => {
                 setUploadProgress(currentProgress =>
                     currentProgress.map((p, i) =>
                         i === index ? { ...p, status: pStatus, message, result } : p
                     )
                 );
            };
            updateFileProgress('processing');
            const formData = new FormData();
            formData.append('image', file);
            try {
                const response = await fetch('/api/detect-local-yolo', { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `Error servidor ${response.status}`);
                updateFileProgress('success', data.message, data as BackendResponse);
                return { success: true, data: data as BackendResponse };
            } catch (err: any) {
                updateFileProgress('error', err.message || 'Fallo.');
                return { success: false, error: err.message || 'Fallo.' };
            }
        });

        try {
            await Promise.all(uploadPromises);
            const finalProgress = uploadProgressRef.current; // Usar ref para estado más actualizado
            const successful = finalProgress.filter(p => p.status === 'success').length;
            const failed = finalProgress.filter(p => p.status === 'error').length;

            if (failed > 0) setOverallError(`${failed} imagen(es) fallaron.`);
            if (successful > 0) {
                setOverallSuccess(`${successful} imagen(es) procesada(s) OK.`);
                if (onUploadComplete) onUploadComplete();
            }
            setSelectedFiles([]); // Limpiar después de procesar
        } catch (overallCatchError: any) {
            console.error("Error en Promise.all (handleSubmit):", overallCatchError);
            setOverallError(overallCatchError.message || "Error procesando archivos.");
        } finally {
            setIsProcessingOverall(false);
        }
    };

    const handleRemoveFile = (indexToRemove: number) => {
        console.log("FRONTEND_UPLOADER: Quitando archivo en índice:", indexToRemove);
        setSelectedFiles(prev => {
            const newFiles = prev.filter((_, index) => index !== indexToRemove);
            if (newFiles.length === 0) { // Si se eliminan todos los archivos
                setOverallError(null);
                setOverallSuccess(null);
                setUploadProgress([]);
            }
            return newFiles;
        });
        // Preview se actualiza por el useEffect
    };

    // --- Renderizado ---
    const numFiles = selectedFiles.length;
    const canClickUploadArea = status === 'authenticated' && !isProcessingOverall;

    return (
        <div className="p-4 border rounded-lg shadow-lg bg-white">
            {status !== 'authenticated' && <p className="text-yellow-600 mb-4">Inicia sesión para detectar y guardar imágenes.</p>}

            <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={canClickUploadArea ? handleButtonClick : undefined}
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors duration-200 ease-in-out ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'} ${canClickUploadArea ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                role="button" tabIndex={canClickUploadArea ? 0 : -1}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') canClickUploadArea && handleButtonClick(); }}
            >
                <input type="file" accept="image/*" multiple ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} disabled={!canClickUploadArea} />
                <p className="text-gray-600">Arrastra y suelta imágenes o carpetas aquí, o haz clic para seleccionar (máx. {MAX_FILES_UPLOAD}).</p>
                {isDragging && <p className="text-blue-600 font-semibold mt-2">¡Suelta los elementos!</p>}
            </div>

            {previewUrls.length > 0 && !isProcessingOverall && (
                <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-gray-700">Imágenes Seleccionadas ({previewUrls.length}):</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {previewUrls.map((url, index) => (
                            <div key={selectedFiles[index]?.name ? `${selectedFiles[index]?.name}-${index}`: `preview-${index}`} className="relative group">
                                <img src={url} alt={`Preview ${selectedFiles[index]?.name || index + 1}`} className="w-full h-24 object-cover rounded border" />
                                <button onClick={() => handleRemoveFile(index)}
                                    className="absolute top-0 right-0 m-1 p-0.5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    title="Quitar imagen" aria-label={`Quitar imagen ${selectedFiles[index]?.name || index + 1}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                 {numFiles > 0 && status === 'authenticated' && (
                     <button type="submit" disabled={isProcessingOverall}
                        className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-150 disabled:opacity-50 disabled:cursor-wait">
                         {isProcessingOverall ? `Procesando ${numFiles} imágen${numFiles > 1 ? 'es' : ''}...` : `Analizar y Guardar ${numFiles} imágen${numFiles > 1 ? 'es' : ''}`}
                     </button>
                 )}
            </form>

            {uploadProgress.length > 0 && (
                <div className="mt-4 space-y-1">
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Progreso de Subida:</h4>
                    <ul className="list-none pl-0">
                        {uploadProgress.map((progress, index) => (
                            <li key={progress.fileName + index} className={`text-xs p-1 rounded ${progress.status === 'success' ? 'bg-green-50 text-green-700' : ''} ${progress.status === 'error' ? 'bg-red-50 text-red-700' : ''} ${progress.status === 'processing' ? 'bg-blue-50 text-blue-700 animate-pulse' : ''} ${progress.status === 'pending' ? 'text-gray-500' : ''}`}>
                                <span className="font-medium">{progress.fileName}:</span> {progress.status === 'success' ? (progress.message || 'Procesado') : progress.status === 'error' ? `Error (${progress.message || 'Desconocido'})` : progress.status === 'processing' ? 'Procesando...' : 'Pendiente'}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {overallError && <p className="text-red-600 mt-4 font-semibold text-sm">{overallError}</p>}
            {overallSuccess && <p className="text-green-600 mt-4 font-semibold text-sm">{overallSuccess}</p>}
        </div>
    );
}