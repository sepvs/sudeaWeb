// src/app/page.tsx
"use client"; // Necesario para useState

import React, { useState } from 'react';
import Link from "next/link";
import { BackgroundVideo } from "~/app/_components/BackgroundVideo";
import { ReactLoginModal } from "~/app/_components/ReactLoginModal"; // <-- Importa el nuevo modal
import { NavigationBar } from "~/app/_components/NavigationBar";     // Importa la barra

export default function HomePage() {
    // Estado para controlar la visibilidad del modal
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Funciones para abrir y cerrar pasadas como props
    const openLoginModal = () => {
      console.log("HomePage: Abriendo modal...");
      setIsLoginModalOpen(true);
    };
    const closeLoginModal = () => {
      console.log("HomePage: Cerrando modal...");
      setIsLoginModalOpen(false);
    };

    console.log("HomePage RENDER - isLoginModalOpen:", isLoginModalOpen);
          
    return (
        <div>
            <BackgroundVideo />
            {/* Pasa la función para abrir el modal a la barra de navegación */}
            <NavigationBar onLoginClick={openLoginModal} />
            {/* Renderiza el modal y pasa el estado y la función de cierre */}
            <ReactLoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} title="Accede a SUDEA" />

            <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] text-white">
                
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
                        {/* Columna 1: Texto */}
                        <div className="md:w-1/2 text-center md:text-left font-audiowide"> {/* Aplicar fuente aquí si es necesario */}
                            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-2">Monitoreo</p>
                            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-2">ambiental</p>
                            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-2">con drones</p>
                            <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">e IA</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}