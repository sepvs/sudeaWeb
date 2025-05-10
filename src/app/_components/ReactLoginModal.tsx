// src/components/ReactLoginModal.tsx
"use client";

import React, { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

interface ReactLoginModalProps {
    isOpen: boolean;        // Estado para controlar si está abierto
    onClose: () => void;    // Función para cerrarlo desde el padre
    title?: string;         // Título opcional
}

export function ReactLoginModal({
    isOpen,
    onClose,
    title = "Prepárate para responder" // Título por defecto
}: ReactLoginModalProps) {

    // Efecto para cerrar con la tecla Escape
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        // Limpieza: remover el listener cuando el modal se cierra o el componente se desmonta
        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Efecto para evitar scroll del body cuando el modal está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        // Limpieza al desmontar
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);


    // Funciones para manejar el inicio de sesión
    const handleDiscordLogin = () => {
        signIn('discord', { callbackUrl: '/' });
        onClose(); // Cierra el modal después de iniciar el proceso
    };

    // Si no está abierto, no renderizar nada
    if (!isOpen) {
        return null;
    }

    // Renderizado del modal usando Tailwind
    return (
        // Portal (opcional pero recomendado para apilamiento z-index)
        // Para simplificar, usamos un div fijo aquí. Considera un Portal real para casos complejos.
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4" // Cubre todo, centra contenido
            aria-labelledby="login-modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop (fondo oscuro) */}
            <div
                className="absolute inset-0 bg-black bg-opacity-60 transition-opacity"
                aria-hidden="true"
                onClick={onClose} // Cierra al hacer clic en el fondo
            ></div>

            {/* Contenedor del Modal */}
            <div
                className="relative z-10 w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8"
                 // Evita que el clic en el contenido cierre el modal
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="flex items-start justify-between border-b border-gray-200 p-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="login-modal-title">
                        {title}
                    </h3>
                    <button
                        type="button"
                        className="text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                        aria-label="Cerrar"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Cuerpo del Modal */}
                <div className="p-6">
                    <div className="flex flex-col items-center space-y-4">
                        <button
                            className="inline-flex w-full justify-center items-center gap-2 rounded-md border border-transparent bg-[#5865F2] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#4a54c4] focus:outline-none focus:ring-2 focus:ring-[#5865F2] focus:ring-offset-2"
                            onClick={handleDiscordLogin}
                        >
                            <i className="fab fa-discord text-lg"></i> Ingresar con Discord
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}