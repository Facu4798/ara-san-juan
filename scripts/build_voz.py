"""
Genera la narración del tour de 1 minuto con una voz masculina neural (IA).

Lee src/tour/voz.json (texto, voz y momento de cada clip), genera un MP3 por clip en public/tour/voz/ y
escribe de vuelta la duración medida (`dur`) para que scripts/check-tour.mjs compruebe que cada clip entra
en su lugar del guion.

Voz: es-AR-TomasNeural (español argentino, masculino) del servicio de texto a voz de Microsoft Edge, usado a
través del paquete `edge-tts`. Es un servicio en línea no documentado como API pública: los textos del guion
se envían a Microsoft sólo al generar los audios (una vez); la página publicada sirve archivos estáticos.

Uso (una vez, o cuando cambie el guion):
    pip install edge-tts mutagen
    python scripts/build_voz.py
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts
from mutagen.mp3 import MP3

ROOT = Path(__file__).resolve().parent.parent
GUION = ROOT / "src" / "tour" / "voz.json"
SALIDA = ROOT / "public" / "tour" / "voz"


async def generar(clip: dict, voz: str, rate: str, pitch: str) -> float:
    destino = SALIDA / f"{clip['id']}.mp3"
    com = edge_tts.Communicate(clip["texto"], voz, rate=rate, pitch=pitch)
    await com.save(str(destino))
    return round(MP3(str(destino)).info.length, 3)


async def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")  # la consola de Windows usa cp1252
    data = json.loads(GUION.read_text(encoding="utf-8"))
    SALIDA.mkdir(parents=True, exist_ok=True)
    solo = set(sys.argv[1:])
    for clip in data["clips"]:
        if solo and clip["id"] not in solo:
            continue
        clip["dur"] = await generar(clip, data["voz"], data["rate"], data["pitch"])
        print(f"{clip['id']}  {clip['at']:5.1f} s  +{clip['dur']:.2f} s  → {clip['at'] + clip['dur']:5.2f} s   {clip['texto']}")
    GUION.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
