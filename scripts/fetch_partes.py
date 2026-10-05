"""
Reproduce la extracción de posiciones del Seabed Constructor desde los partes
oficiales de la Armada Argentina (2018), archivados en la Wayback Machine.

Uso:
    python scripts/fetch_partes.py

Salida:
    src/data/generated/seabedConstructorPositions.json

Notas metodológicas:
- Sólo se toman los partes con campo "PSN / LAT ... / LONG ..." legible.
- La PSN es la posición del BUQUE al momento del parte (06:00 o 16:00, UTC-3),
  no la de los vehículos autónomos ni la cobertura del fondo.
- Revisar a mano cualquier coordenada nueva antes de publicarla.
"""
import html
import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "scripts" / "_raw_partes"
OUT = ROOT / "src" / "data" / "generated" / "seabedConstructorPositions.json"
UA = {"User-Agent": "contar-con-datos-ara-san-juan/0.1 (investigacion academica)"}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def clean(s: str) -> str:
    s = re.sub(r"<script.*?</script>|<style.*?</style>|<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"<br\s*/?>|</p>|</div>|</li>|</tr>|</h\d>", "\n", s)
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r"\n\s*\n+", "\n", s)


def parse_psn(raw: str):
    nums = re.findall(r"(\d+)\s*°\s*(\d+)\s*[´'′ ́]*\s*\.?\s*(\d*)", raw)
    vals = []
    for deg, mi, dec in nums[:2]:
        minutes = float(mi + ("." + dec if dec else ""))
        vals.append(int(deg) + minutes / 60)
    return (-round(vals[0], 5), -round(vals[1], 5)) if len(vals) == 2 else None


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    cdx = json.loads(get(
        "http://web.archive.org/cdx/search/cdx?url=ara.mil.ar/submarino/sanjuan/*"
        "&output=json&fl=original,timestamp,statuscode&collapse=urlkey&limit=1000"
    ))
    rows = [r for r in cdx[1:] if "partedeprensa" in r[0] and r[2] == "200"]
    print(f"{len(rows)} partes archivados")

    out = []
    for original, ts, _ in rows:
        name = original.rsplit("/", 1)[-1]
        path = RAW / name
        if not path.exists():
            try:
                path.write_bytes(get(f"https://web.archive.org/web/{ts}id_/{original}"))
                time.sleep(1.0)
            except Exception as e:  # el archivo limita la tasa de descarga
                print("falló", name, e)
                continue
        t = clean(path.read_text(encoding="utf-8-sig", errors="ignore"))
        n = int(re.findall(r"\d+", name)[0])
        fecha = re.search(r"FECHA:\s*([\d/]+)\s*HORA\s*\(Local\):\s*([\d:\.]+)", t)
        psn = re.search(
            r"LAT\.?\s*(\d+)°\s*([\d\.]+)\s*[´'′ ́]*\.?(\d*)\s*S\s*/\s*LONG\.?\s*0?(\d+)°\s*([\d\.]+)\s*[´'′ ́]*\.?(\d*)\s*W", t
        )
        if not (fecha and psn):
            continue
        coords = parse_psn(psn.group(0))
        if not coords:
            continue
        d, mo, y = fecha.group(1).split("/")
        hh, mm = (fecha.group(2).rstrip(".").replace(".", ":").split(":") + ["00"])[:2]
        areas = sorted(set(re.findall(r"[áa]rea\s*N?°?\s*(\d+[A-Z]?(?:-\d+)?)", t, flags=re.I)))
        out.append({
            "parte": n,
            "fechaHoraLocal": f"{y}-{mo}-{d}T{int(hh):02d}:{mm or '00'}:00-03:00",
            "lat": coords[0],
            "lon": coords[1],
            "psnTexto": psn.group(0),
            "areasMencionadas": areas,
        })

    out.sort(key=lambda r: r["parte"])
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} posiciones → {OUT}")


if __name__ == "__main__":
    main()
