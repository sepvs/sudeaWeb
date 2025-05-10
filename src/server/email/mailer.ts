// src/server/email/mailer.ts
// src/server/email/mailer.ts
import nodemailer from 'nodemailer';
import { env } from '../../env.js';

const transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT,
    secure: env.EMAIL_SECURE,
    auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
    },
});

interface DetectionDetail { // Interfaz para la estructura que realmente usamos
    class: string;
    confidence: number;
    // bbox no es necesario para el cuerpo del email, pero podría ser útil
    // bbox: { x: number; y: number; width: number; height: number; };
}

interface AnomalyAlertData {
    imageUrl: string;
    detectionTime: Date;
    detections: DetectionDetail[]; // Usa la interfaz más simple
    userEmail?: string | null;
    userId?: string;
    userName?: string | null;
}

export async function sendAnomalyAlertEmail({
    imageUrl,
    detectionTime,
    detections, // Este array ahora contiene TODAS las detecciones
    userEmail,
    userId,
    userName
}: AnomalyAlertData): Promise<void> {

    // --- QUITAR O MODIFICAR EL FILTRO ---
    // const fireDetections = detections.filter(d => d.class.toLowerCase() === 'fire');
    // if (fireDetections.length === 0) {
    //     console.log("EMAIL_SERVICE: No hay detecciones de 'fire', no se envía alerta.");
    //     return;
    // }
    // En lugar de filtrar, ahora usamos todas las 'detections' si el array no está vacío.
    // Decidimos si enviar correo basado en si hay *alguna* detección.
    if (!detections || detections.length === 0) {
        console.log("EMAIL_SERVICE: No se encontraron detecciones, no se envía correo de alerta.");
        return;
    }
    // ------------------------------------

    const recipients: string[] = [];
    if (userEmail) recipients.push(userEmail);
    if (env.EMAIL_ADMIN_RECEIVER && !recipients.includes(env.EMAIL_ADMIN_RECEIVER)) {
        recipients.push(env.EMAIL_ADMIN_RECEIVER);
    }

    if (recipients.length === 0) {
        console.error("EMAIL_SERVICE: No hay destinatarios válidos para la alerta.");
        return;
    }

    // Cuerpo del Correo - Modificado para reflejar todas las detecciones
    let htmlBody = `
        <h1>🚨 Alerta de Detección de Objetos - SUDEA 🚨</h1>
        <p>Se han detectado los siguientes objetos en una imagen procesada.</p>
        <p><strong>Fecha y Hora de Detección:</strong> ${detectionTime.toLocaleString()}</p>
    `;
    if (userName) {
        htmlBody += `<p><strong>Subido por Usuario:</strong> ${userName} (ID: ${userId ?? 'N/A'})</p>`;
    } else if (userId) {
        htmlBody += `<p><strong>ID de Usuario:</strong> ${userId}</p>`;
    }
    if (userEmail) {
        htmlBody += `<p><strong>Email del Usuario:</strong> ${userEmail}</p>`;
    }
    htmlBody += `
        <p><strong>Imagen Afectada:</strong></p>
        <a href="${imageUrl}" target="_blank">
            <img src="${imageUrl}" alt="Imagen con Detección" style="max-width: 400px; border: 1px solid #ccc;" />
        </a>
        <h3>Detalles de las Detecciones:</h3>
        <ul>
    `;

    // Iterar sobre TODAS las detecciones pasadas
    detections.forEach(det => {
        htmlBody += `<li><b>Clase: ${det.class}</b>, Confianza: ${(det.confidence * 100).toFixed(1)}%</li>`;
    });

    htmlBody += `</ul><p>Por favor, revisa la imagen y las detecciones.</p>`;

    const mailOptions = {
        from: env.EMAIL_FROM,
        to: recipients.join(', '),
        subject: 'ℹ️ Notificación de Detección de Objetos - SUDEA', // Asunto más genérico
        html: htmlBody,
    };

    try {
        console.log(`EMAIL_SERVICE: Enviando correo de detección a: ${recipients.join(', ')}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log(`EMAIL_SERVICE: Correo de detección enviado: ${info.messageId}`);
    } catch (error) {
        console.error(`EMAIL_SERVICE: Error al enviar correo de detección:`, error);
    }
}