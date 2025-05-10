// src/components/ImageWithDetections.tsx
"use client";

import React, { useRef, useEffect, useState } from 'react';

// Interfaz para la estructura de bbox (asumiendo que x, y son centro)
// ¡AJUSTA ESTO si Roboflow devuelve x,y como top-left!
interface BBox {
    x: number;      // Centro X
    y: number;      // Centro Y
    width: number;
    height: number;
}

// Interfaz completa para una predicción
interface DetectionResult {
    class: string;
    confidence: number;
    bbox: BBox;
    color?: string; // Color opcional
}

interface ImageWithDetectionsProps {
    imageUrl: string;
    detections: DetectionResult[]; // Array de resultados
}

export function ImageWithDetections({ imageUrl, detections }: ImageWithDetectionsProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);

    useEffect(() => {
        const drawDetections = () => {
            const canvas = canvasRef.current;
            const image = imageRef.current;
            const ctx = canvas?.getContext('2d');

            if (!canvas || !image || !ctx || !imageLoaded || !detections) {
                 console.log("Draw preconditions not met:", { canvas, image, ctx, imageLoaded, detections });
                 return; // Asegurarse de que todo esté listo
            }

            // 1. Ajustar tamaño del canvas al tamaño mostrado de la imagen
            // Es crucial hacerlo DESPUÉS de que la imagen haya cargado y tenga dimensiones
            canvas.width = image.clientWidth;
            canvas.height = image.clientHeight;
            console.log("Canvas size set:", canvas.width, canvas.height);
             console.log("Image natural size:", image.naturalWidth, image.naturalHeight);

             // Si la imagen no tiene tamaño natural, no podemos escalar bien
             if (image.naturalWidth === 0 || image.naturalHeight === 0) {
                 console.warn("Image natural size is zero, cannot draw boxes accurately.");
                 // Podrías intentar dibujar la imagen base aquí de todas formas
                 // ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                 return;
             }


            // 2. Calcular factores de escala
            const scaleX = canvas.width / image.naturalWidth;
            const scaleY = canvas.height / image.naturalHeight;
            console.log("Scale factors:", scaleX, scaleY);

            // 3. Dibujar la imagen original en el canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar antes de dibujar
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            // 4. Dibujar las detecciones
             console.log(`Drawing ${detections.length} detections...`);
            detections.forEach((pred) => {
                // Convertir coordenadas de centro x,y a top-left x,y
                // ¡¡VERIFICA si tu modelo devuelve centro o top-left!!
                const topLeftX = pred.bbox.x - pred.bbox.width / 2;
                const topLeftY = pred.bbox.y - pred.bbox.height / 2;

                // Escalar coordenadas y dimensiones
                const scaledX = topLeftX * scaleX;
                const scaledY = topLeftY * scaleY;
                const scaledW = pred.bbox.width * scaleX;
                const scaledH = pred.bbox.height * scaleY;

                 console.log(`Drawing box for ${pred.class}:`, {scaledX, scaledY, scaledW, scaledH}, "Color:", pred.color);

                // Dibujar el rectángulo
                ctx.strokeStyle = pred.color || '#00FF00'; // Usa color de la predicción o verde por defecto
                ctx.lineWidth = 2;
                ctx.strokeRect(scaledX, scaledY, scaledW, scaledH);

                // Dibujar la etiqueta (clase y confianza)
                ctx.fillStyle = pred.color || '#00FF00';
                ctx.font = '14px Arial';
                const label = `${pred.class} (${(pred.confidence * 100).toFixed(1)}%)`;
                // Posicionar etiqueta ligeramente arriba de la caja
                const textY = scaledY > 15 ? scaledY - 5 : scaledY + 15; // Evita salir por arriba
                ctx.fillText(label, scaledX, textY);
            });
             console.log("Drawing finished.");
        };

        // Llama a dibujar cuando las detecciones cambian o la imagen carga
        // Es importante asegurarse que la imagen tiene clientWidth/clientHeight
        if (imageLoaded) {
            // Pequeño delay para asegurar que las dimensiones están listas tras onLoad
            const timer = setTimeout(drawDetections, 50);
            return () => clearTimeout(timer);
        }

    }, [imageUrl, detections, imageLoaded]); // Dependencias del efecto

    // Manejador para cuando la imagen se carga y tiene dimensiones
    const handleImageLoad = () => {
        console.log("Image loaded:", imageRef.current?.src);
        setImageLoaded(true);
    };

    const handleImageError = () => {
        console.error("Failed to load image:", imageUrl);
    }


    return (
        <div className="relative w-full max-w-2xl mx-auto" style={{ aspectRatio: 'auto' }}>
            {/* Imagen original: Se usa para obtener dimensiones y como fuente */}
            {/* Podría estar oculta si no quieres mostrarla dos veces */}
            <img
                ref={imageRef}
                src={imageUrl}
                alt="Imagen detectada"
                onLoad={handleImageLoad}
                onError={handleImageError}
                // Estilo para asegurar que ocupa espacio y podemos medirla
                className="block max-w-full h-auto"
                // style={{ visibility: 'hidden', position: 'absolute' }} // Opcional: ocultar si solo quieres el canvas
            />
            {/* Canvas posicionado encima para dibujar */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-none" // Evita que capture clics
            />
             {!imageLoaded && <p className="text-center">Cargando imagen...</p>}
        </div>
    );
}