import os
import time
import requests
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

''' CONFIGURAR CARPETA Y ENDPOINT '''

# Obtener el directorio donde está ubicado el archivo del script
script_directory = os.path.dirname(os.path.abspath(__file__))
#Crear la ruta completa a la carpeta 'IMAGES_TO_UPLOAD' en el mismo directorio
IMAGES_FOLDER = os.path.join(script_directory, "IMAGES_TO_UPLOAD") #Ruta de la carpeta para subir imágenes
UPLOAD_URL = "https://sudea-servidor.onrender.com/upload"  #URL de subida de imágenes al servidor de Render

#Crea la carpeta en caso de que no exista 
if not os.path.exists(IMAGES_FOLDER):
    os.makedirs(IMAGES_FOLDER)

#Explica a watchdog qué evento manejar y cómo
class ImageHandler(FileSystemEventHandler):

    # Evento que se ejecuta cuando se crea un nuevo archivo 
    def on_created(self, event):
        #ignora en caso de que se cree una carpeta
        if event.is_directory:
            return
        
        # Obtiene el nombre del archivo que se acaba de crear
        file_path = event.src_path

        #Filtra solo las imágenes, verifica que el archivo lo sea
        if file_path.lower().endswith((".png", ".jpg", ".jpeg")):
            print(f" Nueva imagen detectada: {file_path}")
            #Utiliza la función upload_image para subir las imágenes
            time.sleep(1)
            self.upload_image(file_path)

    # Función q se usó arriba para subir la imagen detectada
    def upload_image(self, file_path):
        # Intenta abrir el archivo varias veces por si está bloqueado
        attempts = 5
        for i in range(attempts):
            try:
                # Aquí el complique, traduce la imagen a binario pq es la forma en la que Python lo entiende y puede mandar por request HTTPS 
                with open(file_path, "rb") as img:
                    files = {"file": img}
                    # Sube la imagen con POST y guarda la respuesta del servidor
                    response = requests.post(UPLOAD_URL, files=files)

                if response.status_code == 200:
                    data = response.json()
                    print(data)
                else:
                    print(f" Error al subir {file_path}: {response.text}")
                return

            except PermissionError:
                print(f"Archivo bloqueado, reintentando... ({i+1}/{attempts})")
                time.sleep(1)  # Esperar antes de reintentar

        print(f" No se pudo acceder al archivo: {file_path}")

# Inicializar el observador
if __name__ == "__main__":
    event_handler = ImageHandler()
    observer = Observer()
    observer.schedule(event_handler, IMAGES_FOLDER, recursive=False)
    observer.start()

    print(f" Monitoreando la carpeta: {IMAGES_FOLDER}")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()