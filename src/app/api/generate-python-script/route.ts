// src/app/api/generate-python-script/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '~/server/auth';
import { prisma } from '~/server/db';
import crypto from 'crypto'; // Para generar tokens

// Guarda los tokens en la BD para validarlos luego y asociarlos a un usuario
// Deberías tener un modelo para esto en schema.prisma:
// model ApiToken {
//   id        String   @id @default(cuid())
//   token     String   @unique
//   userId    String
//   user      User     @relation(fields: [userId], references: [id])
//   expiresAt DateTime
//   createdAt DateTime @default(now())
//   isScriptToken Boolean @default(true) // Para diferenciar de otros tokens API
// }
// ¡No olvides migrar si añades este modelo! npx prisma migrate dev --name add_api_token

const PYTHON_SCRIPT_TEMPLATE = `
# SUDEA - Script de Carga Automática de Imágenes
import os
import time
import requests
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# --- Configuración Embebida (No modificar por el usuario directamente) ---
MONITORED_FOLDER = os.path.dirname(os.path.abspath(__file__)) # Monitorea la carpeta donde está el script
T3_APP_UPLOAD_URL = "{T3_APP_UPLOAD_URL}" # Será reemplazado por el backend
API_TOKEN = "{API_TOKEN}" # Será reemplazado por el backend
# -------------------------------------------------------------------

class ImageHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
        file_path = event.src_path
        if file_path.lower().endswith((".png", ".jpg", ".jpeg")):
            print(f"SUDEA_SCRIPT: Nueva imagen detectada: {file_path}")
            time.sleep(1) # Pequeña pausa para asegurar escritura completa
            self.upload_image_to_t3_app(file_path)

    def upload_image_to_t3_app(self, file_path):
        attempts = 3
        for i in range(attempts):
            try:
                with open(file_path, "rb") as img_file:
                    # 'image' debe coincidir con el nombre del campo que espera tu API
                    files = {"image": (os.path.basename(file_path), img_file, 'image/jpeg')}
                    headers = {"Authorization": f"Bearer {API_TOKEN}"}

                    print(f"SUDEA_SCRIPT: Subiendo {file_path} a {T3_APP_UPLOAD_URL}...")
                    response = requests.post(T3_APP_UPLOAD_URL, files=files, headers=headers)

                print(f"SUDEA_SCRIPT: Respuesta del servidor ({response.status_code}):")
                try:
                    print(json.dumps(response.json(), indent=2))
                except requests.exceptions.JSONDecodeError:
                    print(response.text)

                if 200 <= response.status_code < 300:
                    print(f"SUDEA_SCRIPT: Subida de {file_path} exitosa.")
                    # Opcional: Mover o eliminar el archivo después de subirlo
                    # os.remove(file_path)
                else:
                    print(f"SUDEA_SCRIPT: Error al subir {file_path}. Código: {response.status_code}")
                return
            except PermissionError:
                print(f"SUDEA_SCRIPT: Archivo {file_path} bloqueado, reintentando... ({i+1}/{attempts})")
                time.sleep(2)
            except requests.exceptions.RequestException as e:
                print(f"SUDEA_SCRIPT: Error de red/conexión al subir {file_path}: {e}")
                time.sleep(5)
            except Exception as e:
                print(f"SUDEA_SCRIPT: Error inesperado al subir {file_path}: {e}")
                time.sleep(2)
        print(f"SUDEA_SCRIPT: No se pudo subir el archivo: {file_path} después de {attempts} intentos.")

if __name__ == "__main__":
    if not API_TOKEN or API_TOKEN == "{API_TOKEN}": # Chequeo básico
        print("SUDEA_SCRIPT_ERROR: API_TOKEN no configurado. El script no funcionará.")
        exit()
    if not T3_APP_UPLOAD_URL or T3_APP_UPLOAD_URL == "{T3_APP_UPLOAD_URL}":
        print("SUDEA_SCRIPT_ERROR: URL de subida no configurada. El script no funcionará.")
        exit()

    print(f"SUDEA_SCRIPT: Iniciando monitoreo de la carpeta: {MONITORED_FOLDER}")
    print(f"SUDEA_SCRIPT: Las imágenes se subirán a: {T3_APP_UPLOAD_URL}")

    event_handler = ImageHandler()
    observer = Observer()
    observer.schedule(event_handler, MONITORED_FOLDER, recursive=False) # No recursivo por defecto
    observer.start()
    try:
        while True:
            time.sleep(3600) # Chequea menos frecuentemente
    except KeyboardInterrupt:
        print("SUDEA_SCRIPT: Monitoreo detenido por el usuario.")
    finally:
        observer.stop()
        observer.join()
`;

export async function GET(req: NextRequest) { // Usar GET para descargar
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ message: 'No autenticado.' }, { status: 401 });
    }
    const userId = session.user.id;

    try {
        // 1. Generar un token único y de corta duración
        const tokenValue = crypto.randomBytes(32).toString('hex');

        // 2. Guardar el token en la base de datos asociado al usuario
        await prisma.apiToken.create({ // Asegúrate de tener el modelo ApiToken
            data: {
                token: tokenValue,
                userId: userId,
                isScriptToken: true,
            }
        });

        // 3. Determinar la URL de subida (tu API T3)
        // Deberías obtener esto de una variable de entorno si tu app se despliega en diferentes URLs
        const currentHost = req.headers.get('host') || 'localhost:3000';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const uploadUrl = `${protocol}://${currentHost}/api/detect-local-yolo`;


        // 4. Reemplazar placeholders en la plantilla del script
        let scriptContent = PYTHON_SCRIPT_TEMPLATE
            .replace("{T3_APP_UPLOAD_URL}", uploadUrl)
            .replace("{API_TOKEN}", tokenValue);

        // 5. Configurar cabeceras para la descarga del archivo
        const headers = new Headers();
        headers.set('Content-Type', 'text/x-python'); // Tipo MIME para scripts Python
        headers.set('Content-Disposition', `attachment; filename="sudea_uploader_${userId.substring(0,8)}.py"`); // Nombre del archivo

        return new NextResponse(scriptContent, { status: 200, headers });

    } catch (error: any) {
        console.error("API_ERROR: Error generando script Python:", error);
        return NextResponse.json({ message: 'Error al generar el script de subida.' }, { status: 500 });
    }
}