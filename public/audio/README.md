# Narración con voz propia

Por defecto la experiencia narra con el sintetizador de voz del navegador (Web Speech API):
no hace falta ningún archivo y funciona sin conexión, pero la calidad depende de la
computadora donde se abra.

Para reemplazarlo por una voz grabada:

1. Mirá el guion en `src/audio/narration.ts`. Cada entrada tiene una clave
   (`map:c0028`, `descent:d907`, …) y el texto a decir.
2. Grabá un archivo por clave. Formato sugerido: MP3 mono, 128 kbps, 44,1 kHz.
   Nombralos como quieras, por ejemplo `map-c0028.mp3`.
3. Guardá los archivos en esta carpeta.
4. Listalos en `manifest.json`:

```json
{
  "narracion": {
    "map:c0028": "map-c0028.mp3",
    "descent:d907": "descent-d907.mp3"
  }
}
```

El sistema usa el archivo cuando existe y vuelve a la voz del navegador para las claves
que falten, así que se puede grabar de a poco. Si un archivo no carga, también vuelve al
sintetizador sin romper nada.

Consejos de grabación: leer lento, sin música de fondo, dejando medio segundo de silencio
al principio y al final. La duración ideal de cada línea es de 8 a 15 segundos, que es lo
que tarda una persona en leer el paso en pantalla.
