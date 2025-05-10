// src/app/api/user-profile/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from "~/server/auth";
import { prisma } from "~/server/db";

// Interfaz para la respuesta de la API
interface UserProfileResponse {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    totalImages: number;
    totalAnomalies: number;
}

// Interfaz interna para los resultados de detección (simplificada)
interface DetectionResult {
    class: string;
    // No necesitamos otros campos para este conteo
}

export async function GET(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        // 1. Obtener información básica del usuario
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
            }
        });

        if (!user) {
            return NextResponse.json({ message: 'Perfil de usuario no encontrado.' }, { status: 404 });
        }

        // 2. Contar el total de imágenes subidas por el usuario
        const totalImages = await prisma.image.count({
            where: { userId: userId },
        });

        // 3. Contar imágenes con anomalías (detecciones de 'fire')
        const imagesWithDetections = await prisma.image.findMany({
            where: { userId: userId },
            select: { detectionResults: true }, // Solo necesitamos los resultados
        });

        let totalAnomalies = 0;
        imagesWithDetections.forEach(img => {
            try {
                const detections = JSON.parse(img.detectionResults || '[]') as DetectionResult[];
                if (detections.some(det => det.class.toLowerCase() === 'fire')) {
                    totalAnomalies++;
                }
            } catch (e) {
                console.error(`Error parseando detectionResults para imagen del usuario ${userId}:`, e);
                // Opcional: manejar este error si es crítico
            }
        });

        // 4. Construir y devolver la respuesta
        const profileData: UserProfileResponse = {
            ...user,
            totalImages,
            totalAnomalies,
        };

        return NextResponse.json(profileData, { status: 200 });

    } catch (error: any) {
        console.error('Error en API GET /api/user-profile:', error);
        return NextResponse.json({ message: 'Error al obtener el perfil.' }, { status: 500 });
    }
}