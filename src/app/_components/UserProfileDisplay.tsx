// src/components/UserProfileDisplay.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

// Interfaz actualizada para los datos del perfil desde la API
interface UserProfileData {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    totalImages: number;
    totalAnomalies: number;
}

export function UserProfileDisplay() {
    const { data: session, status: sessionStatus } = useSession(); // Renombrar status para evitar colisión

    // Estado para los datos cargados desde la API
    const [profileData, setProfileData] = useState<UserProfileData | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    // Efecto para cargar datos del perfil desde la API cuando la sesión está lista
    useEffect(() => {
        if (sessionStatus === 'authenticated') {
            setIsLoadingProfile(true);
            setProfileError(null);
            fetch('/api/user-profile') // Llama a nuestra API actualizada
                .then(async (res) => {
                    if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.message || `Error: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then((data: UserProfileData) => {
                    setProfileData(data);
                })
                .catch((err: any) => {
                    console.error("Error fetching profile data:", err);
                    setProfileError(err.message || "No se pudo cargar el perfil detallado.");
                })
                .finally(() => {
                    setIsLoadingProfile(false);
                });
        } else if (sessionStatus === 'unauthenticated') {
            setProfileData(null); // Limpiar si cierra sesión
            setIsLoadingProfile(false);
        }
    }, [sessionStatus]); // Depende del estado de la sesión

    // --- Renderizado ---

    if (sessionStatus === 'loading') {
        return <div className="p-4 text-center">Cargando información de sesión...</div>;
    }

    if (sessionStatus === 'unauthenticated' || !session?.user) {
        return <div className="p-4 text-center text-red-600">Por favor, inicia sesión para ver tu perfil.</div>;
    }

    // Muestra "cargando" para los datos del perfil mientras se obtienen
    if (isLoadingProfile && !profileData) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto text-center">
                <p>Cargando perfil detallado...</p>
            </div>
        );
    }

    // Muestra error si la carga del perfil falló
    if (profileError) {
         return (
            <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto text-center">
                <p className="text-red-500">Error: {profileError}</p>
            </div>
        );
    }

    // Si no hay datos de perfil aún (pero no hay error y sesión está ok), muestra info básica
    const displayData = profileData ?? session.user; // Usa datos de API si existen, si no, los de sesión

    return (
        <div className="p-6 bg-gray-100 rounded-lg shadow-xl max-w-lg mx-auto shadow-black">
            <h2 className="text-3xl font-bold mb-6 text-center text-black">Mi Perfil</h2>
            <div className="flex flex-col items-center space-y-6"> {/* Aumentado space-y */}
                {/* Imagen de Perfil */}
                <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-offset-2 ring-blue-600 shadow-lg"> {/* Más grande y con más shadow */}
                    {displayData.image ? (
                        <Image
                            src={displayData.image}
                            alt={displayData.name ?? 'Avatar del usuario'}
                            width={128} // Tamaño real de la imagen
                            height={128}
                            className="object-cover w-full h-full"
                            priority
                        />
                    ) : (
                        <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500 text-lg font-semibold">
                            Sin Foto
                        </div>
                    )}
                </div>

                {displayData.name && (
                    <p className="text-2xl font-semibold text-black">{displayData.name}</p>
                )}
                {displayData.email && (
                    <p className="text-lg text-black">{displayData.email}</p>
                )}

                {/* Estadísticas del Usuario */}
                {profileData && ( // Mostrar solo si los datos de la API han cargado
                    <div className="w-full pt-6 mt-6 border-t border-[#15162c]">
                        <h3 className="text-xl font-semibold text-black mb-4 text-center">Mis Estadísticas</h3>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-white rounded-lg shadow">
                                <p className="text-3xl font-bold text-blue-600">{profileData.totalImages}</p>
                                <p className="text-sm text-black mt-1">Imágenes Subidas</p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg shadow">
                                <p className="text-3xl font-bold text-red-600">{profileData.totalAnomalies}</p>
                                <p className="text-sm text-black mt-1">Anomalías Detectadas</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}