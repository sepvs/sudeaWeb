// src/app/api/save-image-meta/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma } from '~/server/db';
import { z } from 'zod';

// Esquema para validar el cuerpo de la solicitud
const SaveMetaSchema = z.object({
    imageUrl: z.string().url({ message: "URL de imagen inválida" }),
    detectionResults: z.string().min(1, { message: "Resultados de detección requeridos" }), // Espera el JSON como string
});

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        const rawBody = await req.json();
        const validation = SaveMetaSchema.safeParse(rawBody);

        if (!validation.success) {
            return NextResponse.json({ message: "Datos inválidos", errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }

        const { imageUrl, detectionResults } = validation.data;

        // Guardar en la base de datos
        await prisma.image.create({
            data: {
                url: imageUrl,
                detectionResults: detectionResults, // Guarda el JSON string directamente
                userId: userId,
            },
        });

        return NextResponse.json({ message: 'Metadatos guardados exitosamente.' }, { status: 200 });

    } catch (error: any) {
        console.error('Error en API POST /api/save-image-meta:', error);
        // Verificar si es un error de JSON parsing
        if (error instanceof SyntaxError && error.message.includes("JSON")) {
             return NextResponse.json({ message: 'Formato de datos inválido (se esperaba JSON).' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Error al guardar metadatos.' }, { status: 500 });
    }
}