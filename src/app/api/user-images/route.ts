import { type NextRequest, NextResponse } from 'next/server'; // <-- Usa tipos de App Router
import { auth } from "~/server/auth"; // Importa auth (v5)
import { prisma } from "~/server/db";

// Exporta una función nombrada GET
export async function GET(req: NextRequest) { // <-- Recibe NextRequest
  // Autenticar con auth() - sin cambios
  const session = await auth();
  if (!session?.user?.id) {
    // Usa NextResponse para la respuesta
    return NextResponse.json([], { status: 200 });
  }
  const userId = session.user.id;

  try {
    const images = await prisma.image.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true,url: true, createdAt: true, detectionResults: true}
    });
    // Usa NextResponse para la respuesta
    return NextResponse.json(images, { status: 200 });
  } catch (error: any) {
    console.error('Error en API GET /api/user-images:', error);
    // Usa NextResponse para la respuesta de error
    return NextResponse.json({ message: 'Error al obtener imágenes.' }, { status: 500 });
  }
}