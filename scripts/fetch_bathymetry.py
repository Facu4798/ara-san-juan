"""
Descarga batimetría GEBCO 2020 (15 arc-seg) vía la API pública de OpenTopoData
(límite: 1 consulta/segundo, 100 puntos por consulta) y la guarda como grillas JSON
en public/data/bathy_<nombre>.json (elevación en metros enteros; negativo = profundidad).

Uso: python scripts/fetch_bathymetry.py
"""
import json, sys, time, urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "public" / "data"
API = "https://api.opentopodata.org/v1/gebco2020?locations="
GRIDS = [
    # nombre, lat_min, lat_max, lon_min, lon_max, paso (grados)
    ("wreck_local", -46.06, -45.84, -59.93, -59.61, 0.004),
    ("regional", -47.8, -44.8, -62.0, -57.4, 0.04),
    ("shelf", -60.0, -32.0, -76.0, -30.0, 0.25),
    # Argentina continental (módulo «Las 44 vidas»): relieve más fino para leer provincias y orígenes.
    ("argentina", -55.5, -21.5, -74.0, -53.0, 0.12),
]


def grid(name, lat0, lat1, lon0, lon1, step):
    lats = [round(lat0 + i * step, 5) for i in range(int(round((lat1 - lat0) / step)) + 1)]
    lons = [round(lon0 + j * step, 5) for j in range(int(round((lon1 - lon0) / step)) + 1)]
    pts = [(la, lo) for la in lats for lo in lons]
    elev = []
    for k in range(0, len(pts), 100):
        url = API + "|".join(f"{a},{b}" for a, b in pts[k:k + 100])
        for attempt in range(6):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "contar-con-datos-ara-san-juan/0.1"})
                r = json.load(urllib.request.urlopen(req, timeout=60))
                if r.get("status") == "OK":
                    break
            except Exception as e:
                print("reintento", e, file=sys.stderr)
                time.sleep(3 + attempt * 2)
        elev += [int(round(x["elevation"])) for x in r["results"]]
        time.sleep(1.1)
    data = {
        "source": "GEBCO Compilation Group (2020) GEBCO 2020 Grid, consultado vía OpenTopoData API (api.opentopodata.org/v1/gebco2020)",
        "note": "Elevación en metros (negativo = profundidad). Muestreo puntual de la grilla GEBCO de 15 segundos de arco; no es un relevamiento del sitio.",
        "lats": lats, "lons": lons, "rows": len(lats), "cols": len(lons), "elevation": elev,
    }
    (OUT / f"bathy_{name}.json").write_text(json.dumps(data, separators=(",", ":")))
    print(name, len(lats), "x", len(lons), "min", min(elev), "max", max(elev), flush=True)


if __name__ == "__main__":
    only = set(sys.argv[1:])
    for g in GRIDS:
        if not only or g[0] in only:
            grid(*g)
