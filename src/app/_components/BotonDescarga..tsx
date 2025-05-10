// src/app/dashboard/profile/page.tsx o donde quieras el botón
"use client";
import React, { useState } from 'react';
// ... import UserProfileDisplay ...

export default function BotonDescarga() {
    const [isDownloadingScript, setIsDownloadingScript] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDownloadScript = async () => {
        setIsDownloadingScript(true);
        setDownloadError(null);
        try {
            // Llama a la API para generar y descargar el script
            const response = await fetch('/api/generate-python-script'); // Es una petición GET
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ message: "Error desconocido al generar script." }));
                throw new Error(errData.message);
            }

            // Obtener el nombre del archivo de las cabeceras
            const contentDisposition = response.headers.get('content-disposition');
            let fileName = "sudea_uploader.py"; // Default
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (fileNameMatch && fileNameMatch[1]) {
                    fileName = fileNameMatch[1];
                }
            }

            const blob = await response.blob(); // Obtener el script como un blob
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName; // Nombre del archivo para descarga
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url); // Limpiar
            console.log("Script descargado:", fileName);

        } catch (error: any) {
            console.error("Error descargando script:", error);
            setDownloadError(error.message || "No se pudo descargar el script.");
        } finally {
            setIsDownloadingScript(false);
        }
    };

    return (
        <div>
            {/* <UserProfileDisplay /> */}
            <div className="mt-8 p-4 border rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Descargar Script de Carga Automática</h3>
                <p className="text-sm text-gray-600 mb-3">
                    Descarga este script de Python, colócalo en la carpeta que deseas monitorear
                    en tu computadora, y ejecútalo. Nuevas imágenes en esa carpeta se subirán
                    automáticamente a tu cuenta de SUDEA.
                </p>
                <button
                    onClick={handleDownloadScript}
                    disabled={isDownloadingScript}
                    className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                >
                    {isDownloadingScript ? "Generando..." : "Descargar Script Python"}
                </button>
                {downloadError && <p className="text-red-500 mt-2 text-sm">{downloadError}</p>}
            </div>
        </div>
    );
}