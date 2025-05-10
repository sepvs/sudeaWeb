// src/app/api/sign-cloudinary-upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '~/env.js';

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = `user_${userId}_uploads`; // Misma carpeta que usaremos al guardar

        // Genera la firma usando el API Secret del backend
        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp: timestamp,
                folder: folder,
                // Puedes añadir más parámetros aquí si los necesitas (ej: public_id, tags)
                // Ver documentación de Cloudinary sobre parámetros firmados
            },
            env.CLOUDINARY_API_SECRET // Usa la clave secreta del backend
        );

        return NextResponse.json({
            signature,
            timestamp,
            folder,
            apiKey: env.CLOUDINARY_API_KEY, // Pasa la API Key (¡NO el secret!) al frontend
            cloudName: env.CLOUDINARY_CLOUD_NAME,
        });
    } catch (error) {
        console.error('Error signing Cloudinary upload:', error);
        return NextResponse.json({ message: 'Error al preparar la subida.' }, { status: 500 });
    }
}