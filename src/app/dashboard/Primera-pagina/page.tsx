// src/app/principal/page.tsx
// "use client"; // No necesariamente, si HeaderPrincipal es de cliente y el resto es estático

import React from 'react';
import { NavigationBar, NavigationBarNoLogin } from "~/app/_components/NavigationBar"; // Ajusta la ruta
import Image from 'next/image';
import Link from 'next/link'; // Para cualquier botón que navegue
// Opcional: Proteger la ruta del lado del servidor si es necesario
// import { auth } from '~/server/auth';
// import { redirect } from 'next/navigation';

export default async function PrincipalAuthPage() { // Puede ser async si usas auth() para proteger
    // const session = await auth();
    // if (!session?.user) {
    //   redirect('/'); // O a tu página de login
    // }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50"> {/* Fondo general */}
            <NavigationBarNoLogin/>
            {/* Contenido principal de principal.html */}
            <main className="flex-grow flex flex-col justify-center items-center text-center p-4">
                <div className="mb-6 md:mb-8"> {/* Ajuste de margen */}
                    <Image
                        src="/icono_oscuro_sin_fondo.png" // Desde /public
                        alt="Logo SUDEA Grande"
                        width={300} // Ajusta según el tamaño deseado
                        height={300}
                        // priority // Si es un elemento LCP
                    />
                </div>
                {/* Reemplaza las clases 'texto' e 'instrucciones' con Tailwind o usa tu CSS */}
                <p className="text-4xl md:text-5xl font-bold text-gray-800 mb-3 md:mb-4 font-audiowide">
                    Bienvenido a SUDEA
                </p>
                <p className="text-lg md:text-xl text-gray-600 max-w-xl mx-auto">
                    Ten control de tus registros. Sube tus propios archivos o revisa la galería de imágenes.
                </p>
            </main>
        </div>
    );
}