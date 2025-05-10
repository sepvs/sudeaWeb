
"use client";

import React, { useState, useRef, type ChangeEvent, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
// Importa la clase principal de la nueva librería
import { InferenceEngine, type DetectionResult  } from "inferencejs";
import { env } from '~/env'; // Variables de entorno del cliente
import { ImageWithDetections } from './ImageWithDetections';

// Interfaces (igual que antes)
interface SignedUploadParams {
    signature: string;
    timestamp: number; // Es un número (timestamp UNIX)
    folder: string;
    apiKey: string;    // Debe existir
    cloudName: string; // Debe existir
}
interface ImageUploaderProps {
    onUploadComplete?: () => void;
}

// Crear UNA instancia del motor fuera del componente o usar un ref/estado
// para evitar recrearlo en cada render.
// Nota: Si se crea fuera, será un singleton para toda la app cliente.
// Si múltiples componentes lo usan, considera pasarlo como prop o usar context.
let inferEngine: InferenceEngine | null = null;
if (typeof window !== 'undefined' && !inferEngine) {
    console.log("Creando instancia única de InferenceEngine...");
    inferEngine = new InferenceEngine();
}

const workerRegistry: Record<string, string> = {};
const getWorkerKey = (model: string, version: string | number): string => `${model}-v${version}`;


export function InferenceJsUploader({ onUploadComplete }: ImageUploaderProps) {
    const { data: session, status } = useSession();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null); // Preview
    // Guarda el ID del worker, no el modelo completo
    const [workerId, setWorkerId] = useState<string | null>(null);
    const [results, setResults] = useState<DetectionResult[] | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null); // Estado para la URL de la imagen procesada
    const [processingState, setProcessingState] = useState<'idle' | 'initializing_worker' | 'detecting' | 'uploading' | 'saving' | 'error' | 'success'>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const initializeWorker = useCallback(async () => {
        if (!inferEngine) {
            console.error("InferenceEngine no está inicializado.");
            setErrorMessage("Error interno: Motor IA no disponible.");
            setProcessingState('error');
            return;
        }

        const modelKey = getWorkerKey(env.NEXT_PUBLIC_ROBOFLOW_MODEL_ID, env.NEXT_PUBLIC_ROBOFLOW_VERSION);

        // Verificar si el worker ya está registrado
        if (workerRegistry[modelKey]) {
            console.log(`Worker ${modelKey} ya existe con ID: ${workerRegistry[modelKey]}`);
            setWorkerId(workerRegistry[modelKey]);
            setProcessingState('idle'); // Ya está listo
            return;
        }

        // Si no existe, iniciar uno nuevo
        setProcessingState('initializing_worker');
        console.log(`Iniciando nuevo worker para ${modelKey}...`);
        setErrorMessage(null); // Limpiar error previo

        try {
            const newWorkerId = await inferEngine.startWorker(
                env.NEXT_PUBLIC_ROBOFLOW_MODEL_ID,
                env.NEXT_PUBLIC_ROBOFLOW_VERSION,
                env.NEXT_PUBLIC_ROBOFLOW_PUBLISHABLE_KEY
            );
            console.log(`Nuevo worker ${modelKey} iniciado con ID: ${newWorkerId}`);
            workerRegistry[modelKey] = newWorkerId; // Guardar en el registro
            setWorkerId(newWorkerId);
            setProcessingState('idle');
        } catch (err: any) {
            console.error("Error iniciando worker Roboflow:", err);
            setErrorMessage(`Error al iniciar worker: ${err.message || 'Desconocido'}`);
            setProcessingState('error');
        }
    }, []); // useCallback para que la función no cambie innecesariamente
    // -------------------------------------------------------

    // 1. Iniciar el Worker de Roboflow al montar
    useEffect(() => {
        initializeWorker();
        // No incluimos la limpieza del worker aquí para que persista
        // La limpieza podría hacerse globalmente si la app se cierra, o dejarla
    }, [initializeWorker]);// Solo al montar

    // Funciones handleFileChange, handleButtonClick (sin cambios)
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
         if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setSelectedFile(file);
            setResults(null);
            setErrorMessage(null);
            setProcessingState('idle'); // Volver a idle al cambiar imagen
            const reader = new FileReader();
            reader.onloadend = () => setImageUrl(reader.result as string);
            reader.readAsDataURL(file);
             if (canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
        }
    };
    const handleButtonClick = () => { fileInputRef.current?.click() };

    // Función drawBoxes adaptada para RFObjectDetectionPrediction
    const drawBoxes = (predictions: DetectionResult []) => {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img || !predictions) return;

        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scaleX = canvas.width / img.naturalWidth;
        const scaleY = canvas.height / img.naturalHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Arial';
        ctx.lineWidth = 2;

        predictions.forEach(pred => {
            // La predicción tiene bbox (x, y, width, height) donde x,y es top-left
            const x = pred.bbox.x * scaleX;
            const y = pred.bbox.y * scaleY;
            const w = pred.bbox.width * scaleX;
            const h = pred.bbox.height * scaleY;

            ctx.strokeStyle = pred.color || '#00FF00'; // Usa color de la predicción o default
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = pred.color || '#00FF00';
            const label = `${pred.class} (${(pred.confidence * 100).toFixed(1)}%)`;
            ctx.fillText(label, x, y > 10 ? y - 5 : y + 10);
        });
    };

    // 2. Orquestar Detección, Subida y Guardado (lógica similar, cambia la llamada a infer)
    const handleDetectAndProcess = async () => {
        // Validaciones iniciales
        if (!workerId || !inferEngine || !imageRef.current || !selectedFile || status !== 'authenticated') {
            setErrorMessage('Worker no listo, imagen no seleccionada o no autenticado.');
            setProcessingState('error');
            return;
        }
        setErrorMessage(null);
        setUploadedImageUrl(null); // Limpiar imagen anterior al empezar
        let detectedResults: DetectionResult [] | null = null;
        let cloudinaryUrl: string | null = null;

        try {
            // --- Paso A: Detección con inferencejs ---
            setProcessingState('detecting');
            console.log(`Ejecutando inferencia en worker ${workerId}...`);
            // Llama a infer con el ID del worker y el elemento imagen
            // Puedes pasar config aquí también si es necesario
            let imageBitmap: ImageBitmap | null = null;
            try {
                console.log("FRONTEND: Creando ImageBitmap...");
                imageBitmap = await createImageBitmap(imageRef.current!); // Añadir ! si estás seguro que no es null
                console.log("FRONTEND: ImageBitmap creado.");
           } catch(bitmapError) {
               console.error("FRONTEND: Error creando ImageBitmap:", bitmapError);
               throw new Error("No se pudo procesar la imagen para la detección.");
           }

            // Llama a infer con el ImageBitmap (que ES transferible)
            const predictions = await inferEngine.infer(workerId!, imageBitmap);
            // Asegurarse de que las predicciones son del tipo esperado
            detectedResults = predictions as DetectionResult [];
            setResults(detectedResults);
            drawBoxes(detectedResults ?? []);
            console.log("Detección completada:", detectedResults);

            // --- Paso B: Subir a Cloudinary (misma lógica de firma y subida) ---
            setProcessingState('uploading');
            console.log("Obteniendo firma Cloudinary...");
            const signResponse = await fetch('/api/sign-cloudinary-upload', { method: 'POST' });
            if (!signResponse.ok) throw new Error("Error al obtener firma.");
            const signData: SignedUploadParams = await signResponse.json();
            console.log("Subiendo a Cloudinary...");
            const cloudFormData = new FormData();
            cloudFormData.append('file', selectedFile);
            cloudFormData.append('api_key', signData.apiKey);
            cloudFormData.append('timestamp', String(signData.timestamp));
            cloudFormData.append('signature', signData.signature);
            cloudFormData.append('folder', signData.folder);
            const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`;
            const cloudResponse = await fetch(cloudinaryUploadUrl, { method: 'POST', body: cloudFormData });
            if (!cloudResponse.ok) {
                 const errorData = await cloudResponse.json();
                 throw new Error(errorData?.error?.message || 'Error al subir.');
             }
            const cloudResult = await cloudResponse.json();
            cloudinaryUrl = cloudResult.secure_url;
            console.log("Subida Cloudinary OK:", cloudinaryUrl);

            // --- Paso C: Guardar Metadatos (misma lógica) ---
            setProcessingState('saving');
            console.log("Guardando metadatos...");
            const metaResponse = await fetch('/api/save-image-meta', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageUrl: cloudinaryUrl,
                    // Guardamos el JSON string de las detecciones
                    detectionResults: JSON.stringify(detectedResults ?? []),
                }),
            });
            if (!metaResponse.ok) {
                const errorData = await metaResponse.json();
                throw new Error(errorData.message || 'Error al guardar.');
             }
            console.log("Metadatos guardados.");

            // --- Éxito Final ---
            setProcessingState('success');
            setUploadedImageUrl(cloudinaryUrl); // <-- Guarda la URL
            setResults(detectedResults);       // <-- Guarda los resultados
            setSelectedFile(null);             // <-- Limpia el archivo seleccionado
            setImageUrl(null); // Limpiar resultados
            if (canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (onUploadComplete) onUploadComplete();

        } catch (err: any) {
            console.error('Error durante el proceso:', err);
            setErrorMessage(err.message || 'Ocurrió un error.');
            setProcessingState('error');
            // Limpiar parcialmente si falla a mitad
            setResults(detectedResults); // Mantiene las detecciones si falló después
            if (!cloudinaryUrl && canvasRef.current) canvasRef.current.getContext('2d')?.clearRect(0,0,canvasRef.current.width, canvasRef.current.height);
        }
    };

    // Renderizado con estados claros (igual que antes)
    const isLoading = ['initializing_worker', 'detecting', 'uploading', 'saving'].includes(processingState);
    let statusMessage = "";
    if(processingState === 'initializing_worker') statusMessage = "Iniciando motor AI...";
    if(processingState === 'detecting') statusMessage = "Analizando imagen...";
    if(processingState === 'uploading') statusMessage = "Subiendo imagen...";
    if(processingState === 'saving') statusMessage = "Guardando resultados...";


    return (
        <div className="p-4 border rounded-lg shadow">
            {/* Mensaje si no está logueado */}
            {status !== 'authenticated' && <p className="text-yellow-600 mb-4">Inicia sesión para detectar y guardar imágenes.</p>}

             {/* Input y botón de selección */}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} disabled={status !== 'authenticated' || isLoading || processingState === 'initializing_worker'} />
            <button type="button" onClick={handleButtonClick} disabled={status !== 'authenticated' || isLoading || processingState === 'initializing_worker'} className="px-4 py-2 mb-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                 {processingState === 'initializing_worker' ? 'Iniciando AI...' : (selectedFile ? `Cambiar (${selectedFile.name.substring(0,20)}...)` : 'Seleccionar Imagen')}
             </button>

            {/* Previsualización y Canvas */}
            {imageUrl && (
                <div className="my-4" style={{ position: 'relative', maxWidth: '600px', margin: 'auto' }}>
                    <img ref={imageRef} src={imageUrl} alt="Previsualización" onLoad={() => drawBoxes(results || [])} style={{ display: 'block', maxWidth: '100%', height: 'auto', border: '1px solid #ccc' }}/>
                    <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}/>
                </div>
             )}

             {/* Botón para iniciar proceso */}
            {selectedFile && workerId && status === 'authenticated' && (
                 <button type="button" onClick={handleDetectAndProcess} disabled={isLoading} className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-wait">
                     {isLoading ? statusMessage : 'Analizar y Guardar Imagen'}
                 </button>
             )}

            {/* Mensajes de estado */}
            {processingState === 'error' && errorMessage && <p className="text-red-500 mt-4">Error: {errorMessage}</p>}
            {processingState === 'success' && <p className="text-green-500 mt-4">¡Proceso completado exitosamente!</p>}

            {/* Mostrar el componente con la imagen y las detecciones DESPUÉS del éxito */}
            {processingState === 'success' && uploadedImageUrl && results && (
                 <div className="mt-6">
                     <h3 className="text-xl font-semibold mb-2 text-center">Resultados de Detección</h3>
                     <ImageWithDetections
                         imageUrl={uploadedImageUrl}
                         detections={results}
                     />
                 </div>
             )}

        </div>
    );
}