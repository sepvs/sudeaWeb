# detect_fire.py
import argparse
import json
import sys
from ultralytics import YOLO # Asegúrate de que ultralytics esté instalado en el entorno Python

# --- Configuración de Colores HEX por Nombre de Clase (Opcional, pero mantenida) ---
CLASS_HEX_COLORS = {
    "fire": "#FF0000",
    "smoke": "#A9A9A9",
    "default": "#00FF00" # Color por defecto si la clase no está en el diccionario
}

# La función ahora espera 'model_path' directamente como argumento
def run_detection(image_path, model_path,
                  conf_threshold=0.25, iou_threshold=0.45, image_size=640,
                  target_classes=None):
    results_list = []
    try:
        # 1. Cargar el modelo usando la ruta del parámetro
        print(f"INFO (Python): Cargando modelo desde: {model_path}", file=sys.stderr)
        model = YOLO(model_path) # Carga el modelo desde la ruta especificada

        # 2. Ejecutar predicción
        print(f"INFO (Python): Realizando predicción en imagen: {image_path}", file=sys.stderr)
        detections_results = model.predict(
            source=image_path,
            conf=conf_threshold,
            iou=iou_threshold,
            imgsz=image_size,
            verbose=False # Poner True para más detalles de Ultralytics si depuras
        )

        if detections_results and len(detections_results) > 0:
            # Ultralytics devuelve una lista de Results objects. Tomamos el primero.
            r = detections_results[0]

            # Verificar si los atributos necesarios existen en el objeto de resultados
            # Esto puede variar ligeramente entre versiones de Ultralytics o tipos de modelo
            if hasattr(r.boxes, 'xywh') and hasattr(r.boxes, 'cls') and hasattr(r.boxes, 'conf') and hasattr(r, 'names'):
                boxes_xywh = r.boxes.xywh.cpu().tolist()  # Centro x, centro y, width, height
                class_ids = r.boxes.cls.cpu().tolist()
                confidences = r.boxes.conf.cpu().tolist()
                model_class_names_map = r.names # ej: {0: 'fire', 1: 'smoke'}

                for box, cls_id, conf in zip(boxes_xywh, class_ids, confidences):
                    detected_class_name = model_class_names_map.get(int(cls_id), "unknown_class")

                    # Filtrar por clases objetivo si se especifican
                    process_this_detection = True
                    if target_classes and isinstance(target_classes, list) and len(target_classes) > 0:
                        if detected_class_name.lower() not in [tc.lower() for tc in target_classes]:
                            process_this_detection = False
                    
                    if process_this_detection:
                        hex_color = CLASS_HEX_COLORS.get(detected_class_name.lower(), CLASS_HEX_COLORS["default"])
                        results_list.append({
                            "class": detected_class_name,
                            "confidence": round(conf, 4),
                            "bbox": { # Coordenadas del centro, ancho y alto
                                "x": round(box[0], 2),
                                "y": round(box[1], 2),
                                "width": round(box[2], 2),
                                "height": round(box[3], 2)
                            },
                            "color": hex_color
                        })
            else:
                print("Error (Python): El resultado de la detección no tiene la estructura esperada (boxes.xywh, boxes.cls, boxes.conf, names).", file=sys.stderr)
                print(f"INFO (Python): Objeto de resultado de detección: {type(r)}", file=sys.stderr)
                # Puedes imprimir 'dir(r)' o 'dir(r.boxes)' para ver los atributos disponibles

    except FileNotFoundError:
        print(f"Error (Python): Archivo del modelo no encontrado en '{model_path}'. Verifica la ruta que se pasa desde Node.js.", file=sys.stderr)
    except Exception as e:
        print(f"Error en la detección (Python): {type(e).__name__} - {e}", file=sys.stderr)
        # Imprime el traceback completo para más detalles si es necesario
        import traceback
        traceback.print_exc(file=sys.stderr)
    return results_list

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Detecta objetos en una imagen usando YOLO y devuelve JSON.")
    parser.add_argument('--image_path', required=True, help='Ruta a la imagen para procesar.')
    # AÑADIR EL ARGUMENTO --model_path y hacerlo requerido
    parser.add_argument('--model_path', required=True, help='Ruta al archivo del modelo .pt o .onnx a utilizar.')
    parser.add_argument('--conf_threshold', type=float, default=0.25, help='Umbral de confianza (0.0 a 1.0).')
    parser.add_argument('--iou_threshold', type=float, default=0.45, help='Umbral de IOU para NMS (0.0 a 1.0).')
    parser.add_argument('--image_size', type=int, default=640, help='Tamaño de imagen para inferencia (ej. 640).')
    parser.add_argument('--target_classes', nargs='*', default=None,
                        help="Clases específicas a detectar (ej: fire smoke). Si no, detecta todas.")

    args = parser.parse_args()

    # Ya no se verifica DEFAULT_MODEL_PATH aquí

    # Llama a run_detection usando args.model_path (recibido de la línea de comandos)
    detection_results = run_detection(
        image_path=args.image_path,
        model_path=args.model_path, # <--- USA EL ARGUMENTO RECIBIDO
        conf_threshold=args.conf_threshold,
        iou_threshold=args.iou_threshold,
        image_size=args.image_size,
        target_classes=args.target_classes
    )

    # Imprime el resultado JSON a stdout para que Node.js lo capture
    print(json.dumps(detection_results, indent=2))