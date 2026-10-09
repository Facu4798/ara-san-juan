"""
Límites provinciales oficiales del IGN, simplificados para la escena 3D.

Uso:
    python scripts/build_provincias.py [ruta/ign_provincias.json]

Entrada: capa «provincia» del IGN (Instituto Geográfico Nacional) por WFS:
    https://wms.ign.gob.ar/geoserver/ign/ows?service=WFS&version=1.0.0&request=GetFeature
        &typeName=ign:provincia&outputFormat=application/json
Si no se pasa una ruta, el script la descarga (~110 MB).

Salida: public/data/provincias-ar.json (GeoJSON liviano: nombre, código INDEC y polígonos).

Método:
- Se descartan los anillos al sur de 60° S (sector antártico): no forman parte del mapa.
- Cada anillo se simplifica con Douglas–Peucker (tolerancia 0,01° ≈ 1 km) y se descartan los
  anillos de menos de 0,002 grados² (islotes no visibles a la escala del mapa).
- Coordenadas redondeadas a 4 decimales (~10 m).
La simplificación es independiente por provincia: en los límites compartidos puede haber
diferencias menores a ~1 km, invisibles a la escala del mapa.
"""
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "data" / "provincias-ar.json"
URL = ("https://wms.ign.gob.ar/geoserver/ign/ows?service=WFS&version=1.0.0&request=GetFeature"
       "&typeName=ign:provincia&outputFormat=application/json")
TOL = 0.01
MIN_AREA = 0.002


def rdp_ring(pts, tol):
    """Anillo cerrado: se parte en el vértice más lejano al inicio y se simplifica cada mitad."""
    if len(pts) < 4:
        return pts
    x0, y0 = pts[0]
    k = max(range(len(pts)), key=lambda i: (pts[i][0] - x0) ** 2 + (pts[i][1] - y0) ** 2)
    if k == 0:
        return pts
    return rdp(pts[: k + 1], tol) + rdp(pts[k:], tol)[1:]


def rdp(pts, tol):
    """Douglas–Peucker iterativo (evita la recursión profunda en anillos largos)."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        ax, ay = pts[a]
        bx, by = pts[b]
        dx, dy = bx - ax, by - ay
        norm = (dx * dx + dy * dy) ** 0.5 or 1e-12
        best, idx = -1.0, -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > best:
                best, idx = d, i
        if best > tol and idx > 0:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(pts, keep) if k]


def area(ring):
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(s) / 2


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if src is None:
        # Una provincia por pedido: evita bajar ~110 MB de una vez.
        ua = {"User-Agent": "contar-con-datos-ara-san-juan/0.3"}
        ids_url = URL + "&propertyName=nam"
        ids = [f["id"] for f in json.load(urllib.request.urlopen(urllib.request.Request(ids_url, headers=ua), timeout=120))["features"]]
        data = {"features": []}
        for fid in ids:
            one = json.load(urllib.request.urlopen(urllib.request.Request(URL + "&featureID=" + fid, headers=ua), timeout=600))
            data["features"].extend(simplify_features(one["features"]))
            print("  ", fid, flush=True)
        write(data["features"])
        return
    data = json.loads(src.read_text(encoding="utf-8"))

    write(simplify_features(data["features"]))


def simplify_features(features):
    feats = []
    for f in features:
        geom = f["geometry"]
        polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
        out_polys = []
        for poly in polys:
            outer = poly[0]
            if max(p[1] for p in outer) < -60:  # sector antártico
                continue
            rings = []
            for j, ring in enumerate(poly):
                r = rdp_ring([(round(p[0], 6), round(p[1], 6)) for p in ring], TOL)
                if len(r) < 4 or area(r) < (MIN_AREA if j == 0 else MIN_AREA / 2):
                    if j == 0:
                        break
                    continue
                rings.append([[round(x, 4), round(y, 4)] for x, y in r])
            if rings:
                out_polys.append(rings)
        if out_polys:
            feats.append({
                "type": "Feature",
                "properties": {"nombre": f["properties"]["nam"], "codigo": f["properties"]["in1"]},
                "geometry": {"type": "MultiPolygon", "coordinates": out_polys},
            })
    return feats


def write(feats):
    OUT.write_text(json.dumps({"type": "FeatureCollection", "fuente": "IGN, capa provincia (WFS). Simplificado: Douglas–Peucker 0,01°.", "features": feats},
                              ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    pts = sum(len(r) for f in feats for p in f["geometry"]["coordinates"] for r in p)
    print(f"{len(feats)} provincias, {pts} vértices → {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
