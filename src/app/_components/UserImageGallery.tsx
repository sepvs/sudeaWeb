// src/components/UserImageGallery.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ImageWithDetections } from './ImageWithDetections'; // Asegúrate de importar

// Interfaz para los datos completos de la imagen desde la API
interface UserImage {
    id: string;
    url: string;
    createdAt: string;
    detectionResults: string; // Recibimos el JSON como string
}

// Interfaz para los resultados parseados (asegúrate de que coincida con la de ImageWithDetections)
interface DetectionResult {
    class: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number; };
    color?: string;
}

// Interfaz para el estado de la imagen seleccionada
interface SelectedImageData {
    url: string;
    detections: DetectionResult[];
}

export function UserImageGallery() {
    const { data: session, status } = useSession();
    const [images, setImages] = useState<UserImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Estado para la imagen seleccionada para mostrar con detalles
    const [selectedImageData, setSelectedImageData] = useState<SelectedImageData | null>(null);

    // Fetch de imágenes (ahora incluirá detectionResults)
    useEffect(() => {
        if (status === 'authenticated') {
            setLoading(true);
            setError(null);
            setSelectedImageData(null); // Limpiar selección al recargar
            fetch('/api/user-images')
                .then(async (res) => {
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.message || `Error al cargar: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then((data: UserImage[]) => {
                    setImages(data);
                })
                .catch((err: any) => {
                    console.error("Error fetching user images:", err);
                    setError(err.message || "No se pudieron cargar las imágenes.");
                })
                .finally(() => {
                    setLoading(false);
                });
        } else if (status === 'unauthenticated') {
            setImages([]);
            setLoading(false);
            setError(null);
            setSelectedImageData(null);
        } else {
            setLoading(true);
        }
    }, [status]);

    // Función para manejar el clic en una imagen de la galería
    const handleImageClick = useCallback((image: UserImage) => {
        console.log("Image clicked:", image.id);
        try {
            // Parsea los resultados de detección para la imagen clickeada
            const parsedDetections = JSON.parse(image.detectionResults || '[]') as DetectionResult[];
            console.log("Parsed Detections for selected image:", parsedDetections);
            // Actualiza el estado para mostrar esta imagen con detalles
            setSelectedImageData({
                url: image.url,
                detections: parsedDetections
            });
        } catch (parseError) {
            console.error("Error parsing detection results for selected image:", parseError);
            setError("No se pudieron cargar los detalles de la detección para esta imagen.");
            setSelectedImageData(null); // Limpiar si hay error
        }
    }, []); // useCallback para evitar re-creaciones innecesarias

    // Función auxiliar para verificar si hay anomalías (fuego)
    const checkForAnomaly = (detectionJsonString: string): boolean => {
        try {
            const detections = JSON.parse(detectionJsonString || '[]') as DetectionResult[];
            // Verifica si alguna detección tiene la clase 'fire' (ajusta si tu clase se llama diferente)
            return detections.some(det => det.class.toLowerCase() === 'fire');
        } catch {
            return false; // Si hay error al parsear, asume que no hay anomalía
        }
    };


    // --- Renderizado ---
    if (status === 'loading') {
        return <p className="p-4 text-center text-gray-600">Verificando sesión...</p>;
    }
    if (status === 'unauthenticated') {
        return <p className="p-4 text-center text-yellow-600">Inicia sesión para ver tu galería.</p>;
    }
    if (loading) {
        return <p className="p-4 text-center text-gray-600">Cargando galería...</p>;
    }
    if (error && images.length === 0) { // Mostrar error solo si no hay imágenes cargadas
        return <p className="p-4 text-center text-red-500">Error: {error}</p>;
    }


    return (
        <div className="p-4">
            <h2 className="text-3xl font-bold mb-6 text-center text-blue-200">Mi Galería de Detecciones</h2>

            {/* Mensaje de error general si ocurrió pero hay imágenes */}
            {error && images.length > 0 && <p className="p-4 text-center text-red-500">Error: {error}</p>}

            {images.length === 0 && !loading ? (
                <p className="text-center text-blue-200">Aún no has subido ninguna imagen.</p>
            ) : (
                // --- Cuadrícula de la Galería ---
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    {images.map((image) => {
                        const hasAnomaly = checkForAnomaly(image.detectionResults);
                        return (
                            <div
                                key={image.id}
                                onClick={() => handleImageClick(image)} // <-- Añadir onClick
                                className={` 
                                    border rounded-lg shadow-blue-300 overflow-hidden bg-[#1c28a0]
                                    cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.03]
                                    
                                    ${hasAnomaly ? 'border-red-500 border-2' : 'border-transparent'}
                                    ${selectedImageData?.url === image.url ? 'ring-2 ring-blue-800 ring-offset-2' : ''}
                                `}
                            >
                                <img
                                    src={image.url}
                                    alt={`Imagen subida el ${new Date(image.createdAt).toLocaleDateString()}`}
                                    className="w-full h-48 object-cover"
                                    loading="lazy"
                                />
                                <div className="p-2 text-center">
                                    {hasAnomaly && ( // <-- Mostrar texto de anomalía
                                        <p className="text-xs font-bold text-red-600 mb-1">
                                            ¡Anomalía Detectada!
                                        </p>
                                    )}
                                    <p className="text-xs text-white">
                                        Subida: {new Date(image.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* --- Sección para Mostrar Imagen con Detecciones --- */}
            {selectedImageData && (
                <div className="mt-8 pt-6 border-t border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-semibold text-blue-200">Detalle de Imagen Seleccionada</h3>
                         <button
                            onClick={() => setSelectedImageData(null)} // Botón para cerrar
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                         >
                            Cerrar Detalle
                         </button>
                    </div>
                    <ImageWithDetections
                        imageUrl={selectedImageData.url}
                        detections={selectedImageData.detections}
                    />
                </div>
            )}
        </div>
    );
}