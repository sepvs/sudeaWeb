// src/components/HeaderPrincipal.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';

export function HeaderPrincipal() {
    const { data: session, status } = useSession();
    const [isNavOpen, setIsNavOpen] = useState(false); // Para el toggler en móvil
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false); // Para el dropdown de perfil
    const dropdownRef = useRef<HTMLUListElement>(null); // Ref para el dropdown

    const toggleNav = () => setIsNavOpen(!isNavOpen);
    const toggleProfileDropdown = () => setIsProfileDropdownOpen(!isProfileDropdownOpen);

    // Cerrar dropdown si se hace clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileDropdownOpen(false);
            }
        };
        if (isProfileDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileDropdownOpen]);


    // No renderizar nada hasta que se conozca el estado de la sesión (evita FOUC)
    if (status === 'loading') {
        return (
            <header className="bg-body-tertiary shadow-sm">
                <nav className="navbar navbar-expand-lg">
                    <div className="container-fluid">
                        <div className="navbar-brand"><Image src="/logo_fondo_blanco.jpg" alt="Logo" width={120} height={80} priority /></div>
                        <span className="navbar-text ms-auto">Cargando...</span>
                    </div>
                </nav>
            </header>
        );
    }

    // Redirigir a login si no está autenticado (o mostrar una UI diferente)
    // Para una página principal que *requiere* login, esto es común.
    // Si la página principal debe ser visible para no logueados, ajusta esta lógica.
    if (status === 'unauthenticated') {
        // Opcional: podrías redirigir a la página de inicio de sesión o mostrar una navbar limitada
        // Ejemplo:
        // typeof window !== 'undefined' && (window.location.href = '/'); // Redirigir a la home (donde está el modal de login)
        // Por ahora, mostramos una navbar limitada para usuarios no logueados
         return (
            <header className="bg-body-tertiary shadow-sm">
                 <nav className="navbar navbar-expand-lg">
                     <div className="container-fluid">
                        <Link className="navbar-brand" href="/"><Image src="/logo_fondo_blanco.jpg" alt="Logo SUDEA" width={120} height={80} priority /></Link>
                         {/* Aquí podrías poner un botón de "Iniciar Sesión" que abra el modal
                             si el modal está disponible globalmente (ej: en RootLayout o page.tsx de la home)
                             o redirigir a una página de login. */}
                         <Link href="/" className="btn btn-primary ms-auto">Iniciar Sesión</Link>
                     </div>
                 </nav>
            </header>
         );
    }


    // Renderizar si está autenticado
    return (
        <header className="bg-body-tertiary shadow-sm"> {/* Añadido shadow para estética */}
            <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid">
                <a className="navbar-brand" href="#">
                    <Image src="/logo_fondo_blanco.jpg" alt="Logo SUDEA" width={120} height={80} priority />
                </a>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNavDropdown" aria-controls="navbarNavDropdown" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNavDropdown">
                    <ul className="navbar-nav">
                        <li className="nav-item">
                            <a className="nav-link active" aria-current="page" href="#">Ver registros</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="#">Subir registros</a>
                        </li>
                    </ul>
                    <ul className="navbar-nav ms-auto">
                        <li className="nav-item dropdown">
                            <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                              <div>
                                Perfil 
                              </div>
                            </a>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><a className="dropdown-item" href="#">Cerrar Sesión</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </div>
          </nav>
        </header>
    );
}