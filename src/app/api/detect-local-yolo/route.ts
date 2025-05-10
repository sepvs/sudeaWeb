// src/app/api/detect-local-yolo/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from "~/server/auth"; // Para obtener la sesión desde la web
import fs from 'fs/promises';
import path from 'path';
import { env } from '~/env.js';
import { v2 as cloudinary } from 'cloudinary';
import { prisma } from "~/server/db";
import { spawn } from 'child_process';
import { sendAnomalyAlertEmail } from '~/server/email/mailer';

// --- Configuración Global del Módulo ---
cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

const UPLOAD_DIR = path.join(process.cwd(), '/tmp/uploads');
const PYTHON_EXECUTABLE = process.platform === "win32" ? 'python' : 'python3';
const PYTHON_SCRIPT_PATH = path.join(process.cwd(), 'scripts/detect_fire.py');
const MODEL_PATH = path.join(process.cwd(), '/scripts/models/YOLOv10-FireSmoke-M.pt'); // ¡VERIFICA ESTA RUTA!

fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(err => console.error("API_ERROR: No se pudo crear UPLOAD_DIR:", err));

interface DetectionResult {
    class: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number; };
    color?: string;
}

// --- Funciones Helper (parseFormAndSaveTemp, runYoloDetection sin cambios respecto a tu versión) ---
const parseFormAndSaveTemp = async (req: NextRequest): Promise<string | null> => {
    console.log("API_INFO: Iniciando parseFormAndSaveTemp");
    try {
        const formData = await req.formData();
        const fileEntry = formData.get('image');
        if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry) {
             const file = fileEntry as File;
             console.log(`API_INFO: Archivo recibido: ${file.name}, Tamaño: ${file.size}, Tipo: ${file.type}`);
             const fileBuffer = Buffer.from(await file.arrayBuffer());
             const fileExt = path.extname(file.name) || '.jpg';
             const tempFilename = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${fileExt}`;
             const tempFilePath = path.join(UPLOAD_DIR, tempFilename);
             console.log(`API_INFO: Guardando archivo temporal en: ${tempFilePath}`);
             await fs.writeFile(tempFilePath, fileBuffer);
             console.log("API_INFO: Archivo temporal guardado exitosamente.");
             return tempFilePath;
        }
        console.warn("API_WARN: No se encontró un archivo válido en el campo 'image'.");
        return null;
    } catch (error) {
        console.error("API_ERROR: Error en parseFormAndSaveTemp:", error);
        return null;
    }
};

const runYoloDetection = (imagePath: string): Promise<DetectionResult[]> => {
  return new Promise((resolve, reject) => {
    console.log(`API_INFO: Ejecutando comando Python: ${PYTHON_EXECUTABLE} ${PYTHON_SCRIPT_PATH} --image_path "${imagePath}" --model_path "${MODEL_PATH}"`); // Entrecomillado para rutas con espacios
    const pythonProcess = spawn(PYTHON_EXECUTABLE, [
        PYTHON_SCRIPT_PATH,
        '--image_path', imagePath, // spawn maneja bien los espacios en los arrays de args
        '--model_path', MODEL_PATH
    ]);
    let stdoutData = '';
    let stderrData = '';
    pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { stderrData += data.toString(); });
    pythonProcess.on('close', (code) => {
      console.log(`API_INFO: Script Python finalizado. Código de salida: ${code}`);
      if (stdoutData.trim()) console.log(`---------- PYTHON STDOUT (Completo) ----------\n${stdoutData.trim()}\n------------------------------------------`);
      if (stderrData.trim()) console.error(`---------- PYTHON STDERR (Completo) ----------\n${stderrData.trim()}\n------------------------------------------`);
      if (code !== 0) return reject(new Error(`Script Python falló (código ${code}). Revisa PYTHON STDERR.`));
      if (stdoutData.trim()) {
        try {
          const results = JSON.parse(stdoutData.trim()) as DetectionResult[];
          resolve(results);
        } catch (parseError: any) {
          reject(new Error('Respuesta inválida (no JSON) del script. Revisa PYTHON STDOUT.'));
        }
      } else { resolve([]); }
    });
    pythonProcess.on('error', (err) => reject(new Error(`No se pudo iniciar script: ${err.message}`)));
  });
};
// --- FIN Funciones Helper ---


// --- Handler POST Principal MODIFICADO ---
export async function POST(req: NextRequest) {
    console.log("API_INFO: Recibida petición POST a /api/detect-local-yolo");

    let userId: string | null = null;
    let userName: string | null | undefined = undefined; // Puede ser undefined
    let userEmail: string | null | undefined = undefined; // Puede ser undefined

    // 1. Estrategia de Autenticación Dual (Token API o Sesión NextAuth)
    const authorizationHeader = req.headers.get('Authorization');
    if (authorizationHeader?.startsWith('Bearer ')) {
        const token = authorizationHeader.substring(7);
        console.log("API_INFO: Intentando autenticación con Token API.");
        if (token) {
            const apiTokenEntry = await prisma.apiToken.findUnique({
                where: { token: token, isScriptToken: true }, // Asegúrate que el token sea para scripts
                include: { user: { select: { id: true, name: true, email: true } } } // Selecciona campos del usuario
            });

            if (apiTokenEntry && apiTokenEntry.user) { // <-- Solo verifica si existe y tiene usuario
            userId = apiTokenEntry.user.id;
            userName = apiTokenEntry.user.name;
            userEmail = apiTokenEntry.user.email;
            console.log(`API_INFO: Autenticado vía Token API (sin expiración) para usuario: ${userId}`);
            } else {
                console.warn("API_WARN: Token API inválido o usuario no encontrado.");
            }
        }
    }

    // Si no se autenticó por token, intentar con sesión (para subidas desde la web)
    if (!userId) {
        console.log("API_INFO: Intentando autenticación con Sesión NextAuth.");
        const session = await auth(); // Obtener sesión usando el `auth` de NextAuth v5
        if (session?.user?.id) {
            userId = session.user.id;
            userName = session.user.name;
            userEmail = session.user.email;
            console.log(`API_INFO: Autenticado vía Sesión para usuario: ${userId} (${userName ?? userEmail ?? 'Usuario Desconocido'})`);
        }
    }

    // Si después de ambos intentos no hay userId, entonces no está autenticado
    if (!userId) {
        console.warn("API_WARN: Acceso no autenticado (ni Token API ni Sesión NextAuth).");
        return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    // --- Fin Estrategia de Autenticación ---


    let tempFilePath: string | undefined;

    try {
        // 2. Parsear formulario y guardar imagen temporalmente
        const parsedPath = await parseFormAndSaveTemp(req);
        if (!parsedPath) {
            console.error("API_ERROR: No se pudo obtener la ruta del archivo temporal desde parseFormAndSaveTemp.");
            return NextResponse.json({ message: 'Fallo al procesar el archivo subido. No se guardó temporalmente.' }, { status: 400 });
        }
        tempFilePath = parsedPath;
        console.log(`API_INFO: Archivo temporal para procesar: ${tempFilePath}`);

        // 3. Ejecutar Detección YOLO Local
        const detectionResultsArray = await runYoloDetection(tempFilePath);
        console.log("API_INFO: Detección YOLO completada. Número de resultados:", detectionResultsArray.length);

        // 4. Subir imagen original a Cloudinary
        console.log(`API_INFO: Subiendo ${tempFilePath} a Cloudinary...`);
        const cloudinaryResponse = await cloudinary.uploader.upload(tempFilePath, {
            folder: `user_${userId}_uploads`,
        });
        const imageUrlFromBucket = cloudinaryResponse.secure_url;
        console.log(`API_INFO: Subido a Cloudinary: ${imageUrlFromBucket}`);

        // 5. Guardar en Base de Datos
        console.log("API_INFO: Guardando metadatos en DB...");
        const savedImage = await prisma.image.create({
            data: {
                url: imageUrlFromBucket,
                detectionResults: JSON.stringify(detectionResultsArray ?? []),
                userId: userId, // userId está garantizado aquí
            },
        });
        console.log("API_INFO: Metadatos guardados. ID de imagen:", savedImage.id);

        // 6. Enviar Alerta por Correo si hay detecciones (según tu lógica de mailer.ts)
        if (detectionResultsArray && detectionResultsArray.length > 0) {
            console.log("API_INFO: Detecciones encontradas, preparando correo de notificación...");
            await sendAnomalyAlertEmail({
                imageUrl: imageUrlFromBucket,
                detectionTime: savedImage.createdAt,
                detections: detectionResultsArray,
                userEmail: userEmail, // Puede ser null/undefined, mailer.ts debe manejarlo
                userId: userId,
                userName: userName,   // Puede ser null/undefined, mailer.ts debe manejarlo
            });
        } else {
            console.log("API_INFO: No se encontraron detecciones, no se envía correo.");
        }

        // 7. Devolver Respuesta Exitosa al Frontend
        return NextResponse.json({
            message: 'Imagen procesada y guardada exitosamente.',
            imageUrl: imageUrlFromBucket,
            detections: detectionResultsArray,
        }, { status: 200 });

    } catch (error: any) {
        console.error('API_ERROR: Error CAPTURADO en handler POST /api/detect-local-yolo:', error);
        let clientErrorMessage = 'Ocurrió un error procesando la imagen.';
        if (error.message?.includes("Script Python falló")) {
            clientErrorMessage = "Error durante la detección de IA. Revisa los logs del servidor.";
        } else if (error.message?.includes("Cloudinary")) {
            clientErrorMessage = "Error al subir la imagen al almacenamiento.";
        }
        return NextResponse.json({ message: clientErrorMessage, details: error.message }, { status: 500 });
    } finally {
        if (tempFilePath) {
            console.log(`API_INFO: Limpiando archivo temporal: ${tempFilePath}`);
            await fs.unlink(tempFilePath).catch(err => console.error("API_ERROR: Fallo al borrar archivo temporal:", err));
        }
        console.log("API_INFO: Finalizado handler POST /api/detect-local-yolo");
    }
}