// src/app/principal/page.tsx
// "use client"; // No necesariamente, si HeaderPrincipal es de cliente y el resto es estático

import React from 'react';
import { NavigationBarNoLogin } from "~/app/_components/NavigationBar"; // Ajusta la ruta
import { UserProfileDisplay } from '~/app/_components/UserProfileDisplay';

export default async function PrincipalAuthPage() { 
    return (
        <div className="flex flex-col min-h-screen bg-gray-50"> {/* Fondo general */}
            <NavigationBarNoLogin/>
            {/* Contenido principal de principal.html */}
            <main className="flex-grow flex flex-col justify-center items-center text-center p-4">
                <div className="mb-6 md:mb-8"> {/* Ajuste de margen */}
                    <UserProfileDisplay />
                </div>
            </main>
        </div>
    );
}