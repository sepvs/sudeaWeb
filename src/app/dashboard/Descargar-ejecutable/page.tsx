import React from 'react';
import { NavigationBarNoLogin } from "~/app/_components/NavigationBar"; // Ajusta la ruta
import BotonDescarga from '~/app/_components/BotonDescarga.';

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
                    <BotonDescarga />
                </div>
            </main>
        </div>
    );
}