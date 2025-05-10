// src/inferencejs.d.ts (o donde lo pongas)

// Declara el módulo para que TS lo reconozca
declare module 'inferencejs' {

    // Declara explícitamente InferenceEngine como una CLASE
    export class InferenceEngine {
      // Añade el constructor si sabes cómo se usa (parece que no necesita args)
      constructor();
  
      // Añade las firmas de los métodos que usas (basado en la documentación)
      // Puedes usar 'any' si no estás seguro de los tipos exactos
      startWorker(
        model: string,
        version: string | number,
        apiKey: string,
        config?: Record<string, any> // Objeto de configuración opcional
      ): Promise<string>; // Devuelve el ID del worker
  
      infer(
        workerId: string,
        image: HTMLImageElement | HTMLVideoElement | ImageBitmap | /* TFJS Tensor Type */ any, // Tipos de imagen aceptados
        config?: Record<string, any> // Configuración de inferencia opcional
      ): Promise<any[]>; // Devuelve un array de predicciones (usa 'any' si no tienes RFObjectDetectionPrediction)
  
      stopWorker(workerId: string): Promise<void>;
  
      // Puedes añadir más métodos/propiedades si los necesitas
    }
  
    // También puedes declarar la interfaz de predicción aquí si la usas
    interface BBox {
        x: number;      // Centro X
        y: number;      // Centro Y
        width: number;
        height: number;
    }
    
    // Interfaz completa para una predicción
    interface DetectionResult {
        class: string;
        confidence: number;
        bbox: BBox;
        color?: string; // Color opcional
    }
  
    // Declara otras exportaciones si la librería las tiene y las necesitas
  }