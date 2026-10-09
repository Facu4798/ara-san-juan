"""
Reproduce la obtención de los retratos de los 44 tripulantes desde el memorial oficial
«44 Presentes» (Ministerio de Defensa y Armada Argentina), hoy disponible sólo en la
Wayback Machine porque el dominio caducó.

Uso:
    python scripts/fetch_retratos.py

Salidas:
    public/tripulantes/NN.jpg                    (NN = orden en el Decreto 212/2020; 240×245 px)
    src/data/generated/retratos44.json           (correspondencia orden ↔ archivo del memorial)

Método:
- Se descarga la página archivada tripulantes.php y se extrae, para cada persona, el archivo
  de foto, el nombre y el grado post mortem.
- Cada nombre se coteja con la nómina del Decreto 212/2020 (src/data/crew.ts), sin
  distinguir tildes ni mayúsculas. Si una persona no coincide exactamente, el script se
  detiene: no se asigna ninguna foto por aproximación.
- Requiere Pillow (pip install pillow).
"""
import html
import json
import re
import time
import unicodedata
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "scripts" / "_raw_retratos"
OUT_IMG = ROOT / "public" / "tripulantes"
OUT_JSON = ROOT / "src" / "data" / "generated" / "retratos44.json"
UA = {"User-Agent": "contar-con-datos-ara-san-juan/0.2 (investigacion academica)"}
PAGE = "https://web.archive.org/web/20201005231043id_/https://44presentes.org/tripulantes.php"


def get(url: str) -> bytes:
    for intento in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90) as r:
                return r.read()
        except Exception as e:  # el archivo web limita la tasa de descarga
            print("reintento", url, e)
            time.sleep(5 + intento * 4)
    raise RuntimeError(f"no se pudo descargar {url}")


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return " ".join(s.split())


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    page = RAW / "tripulantes.html"
    if not page.exists():
        page.write_bytes(get(PAGE))
    t = page.read_text(encoding="utf-8", errors="ignore")
    items = re.findall(
        r'<div class="foto" data-id="(\d+)".*?url\(images/tripulantes/([\w\-]+\.jpg)\).*?'
        r'<div class="nombre"><span>(.*?)</span>.*?<h5>(.*?)</h5>',
        t,
        re.S,
    )
    memorial = {}
    for _, img, nombre, grado in items:
        n = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", nombre))).strip()
        g = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", grado))).strip()
        memorial[norm(n)] = {"archivoMemorial": img, "nombreMemorial": n, "gradoMemorial": g}
    print(len(memorial), "personas en el memorial")

    crew_ts = (ROOT / "src" / "data" / "crew.ts").read_text(encoding="utf-8")
    crew = re.findall(r"orden: (\d+), nombreCompleto: '([^']+)'", crew_ts)
    assert len(crew) == 44, "la nómina debe tener 44 personas"

    # Capturas archivadas de cada foto (la más reciente con estado 200).
    cdx = json.loads(get(
        "http://web.archive.org/cdx/search/cdx?url=44presentes.org/images/tripulantes/*"
        "&output=json&fl=original,timestamp,statuscode&collapse=urlkey"
    ))
    snaps = {r[0].rsplit("/", 1)[-1]: (r[0], r[1]) for r in cdx[1:] if r[2] == "200"}

    out = []
    for orden, nombre in crew:
        m = memorial.get(norm(nombre))
        if not m:
            raise SystemExit(f"Sin coincidencia exacta para {nombre}: revisar a mano. No se asigna foto.")
        raw = RAW / m["archivoMemorial"]
        if not raw.exists():
            original, ts = snaps[m["archivoMemorial"]]
            raw.write_bytes(get(f"https://web.archive.org/web/{ts}id_/{original}"))
            time.sleep(1.2)
        im = Image.open(raw).convert("RGB").resize((240, 245), Image.LANCZOS)
        im.save(OUT_IMG / f"{int(orden):02d}.jpg", quality=82, optimize=True, progressive=True)
        out.append({"orden": int(orden), "nombreDecreto": nombre, **m})

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} retratos → {OUT_IMG}")


if __name__ == "__main__":
    main()
