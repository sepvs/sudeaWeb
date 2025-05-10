// src/components/NavigationBar.tsx
"use client";

import "~/styles/SUDEA.css";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import 'bootstrap/dist/css/bootstrap.min.css';

// Añadir la prop onLoginClick

export function NavigationBarNoLogin() {
    const { data: session, status } = useSession();

    console.log("NavigationBar RENDER - Status:", status, "Session:", session);

    return (
        <header>
            
             {/* Mantenemos clases Bootstrap para estilo rápido, pero sin JS */}
            <nav className="navbar navbar-expand-lg custom-navbar shadow-sm">
                <div className="container-fluid">
                    
                    <div className="d-flex justify-content-center">
                        <Link href="/dashboard/Primera-pagina">
                            <Image src="/logo_blanco_sin_fondo.png" alt="Logo SUDEA" width={120} height={80} priority />
                        </Link>
                    </div>
                    
                     <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                         <span className="navbar-toggler-icon"></span>
                     </button>

                    {/* Botón Login/Logout */}
                    {status === "loading" && <span>Loading...</span>}
                    <div className="mt-8 flex flex-col sm:flex-row gap-10">
                        <Link
                            href="/dashboard/Subir-imagen"
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 ease-in-out"
                        >
                            Subir Registros
                        </Link>
                        <Link
                            href="/dashboard/Ver-galeria"
                            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-150 ease-in-out"
                        >
                            Ver Registros
                        </Link>
                        <Link
                            href="/dashboard/Ver-perfil"
                            className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-150 ease-in-out"
                        >
                            Ver Perfil
                        </Link>
                        <Link
                            href="/dashboard/Descargar-ejecutable"
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-150 ease-in-out"
                        >
                            Descargar Ejecutable para monitoreo de imagenes
                        </Link>
                        <div>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => signOut({ callbackUrl: '/' })}>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
}

interface NavigationBarProps {
    onLoginClick: () => void;
}

export function NavigationBar({ onLoginClick }: NavigationBarProps) {
    const { data: session, status } = useSession();

    console.log("NavigationBar RENDER - Status:", status, "Session:", session);

    return (
        <header>
            
             {/* Mantenemos clases Bootstrap para estilo rápido, pero sin JS */}
            <nav className="navbar navbar-expand-lg bg-white shadow-sm">
                <div className="container-fluid">
                    {/* ... Logo y Toggler ... */}
                     <Link className="navbar-brand" href="/">
                        <Image src="/logo_fondo_blanco.jpg" alt="Logo SUDEA" width={120} height={80} priority />
                    </Link>
                     <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
                         <span className="navbar-toggler-icon"></span>
                     </button>

                    {/* Botón Login/Logout */}
                    <div className="d-flex">
                        {status === "loading" && <span>Loading...</span>}
                        {status === "unauthenticated" && (
                            // Botón ahora usa onClick, no data-bs-*
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                    onLoginClick();
                                }}
                            >
                                Iniciar Sesión
                            </button>
                        )}
                        {status === "authenticated" && session?.user && (
                            <div className="d-flex align-items-center gap-2">
                                <Link href="/dashboard/Primera-pagina">
                                    <button className="btn btn-blue btn-sm">
                                        Ir al dashboard
                                    </button>
                                </Link>
                                <button className="btn btn-outline-danger btn-sm" onClick={() => signOut({ callbackUrl: '/' })}>
                                    Cerrar Sesión
                                </button>
                            </div>
                        )}
                    </div>
                    
                </div>
            </nav>
        </header>
    );
}