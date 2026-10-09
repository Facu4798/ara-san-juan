"""
Datos biográficos de los 44 a partir del memorial oficial «44 Presentes» (MinDef y Armada),
con el lugar de nacimiento georreferenciado mediante la API Georef de datos.gob.ar
(nomenclador oficial de localidades / asentamientos, IGN–INDEC).

Uso:
    python scripts/build_tripulantes.py

Entrada:  scripts/_raw_retratos/tripulantes.html  (página archivada; la baja fetch_retratos.py)
Salida:   src/data/generated/tripulantes_memorial.json

Para cada persona:
- nacimiento.texto: el lugar tal como lo escribe el memorial;
- nacimiento.fecha: fecha de nacimiento (ISO);
- edad: años cumplidos al 15/11/2017 (cálculo propio a partir de la fecha oficial);
- nacimiento.lat/lon: centroide oficial (Georef) del lugar; `precision` indica qué tan exacto es:
    localidad   la localidad del texto existe en el nomenclador;
    aproximada  el lugar no está en el nomenclador y se usa la localidad contigua (se explica);
    departamento sólo se puede ubicar la cabecera del departamento (se explica);
    ambigua     el texto nombra una ciudad homónima de su provincia («Salta», «San Luis»…):
                se ubica en la capital y se advierte;
- sexo: la Armada informa que la tripulación eran «43 hombres y una mujer» y la única mujer está
  identificada por el memorial («nacida», «primera oficial submarinista») y por Infobae (30/11/2017).
  No se infiere de nombres ni de fotografías;
- bio: párrafos del memorial (texto oficial, sin edición).
Ninguna coordenada se elige a mano: todas salen de la API, con el nombre y la provincia indicados.
"""
import html
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "scripts" / "_raw_retratos" / "tripulantes.html"
CACHE = ROOT / "scripts" / "_raw_retratos" / "georef_cache.json"
OUT = ROOT / "src" / "data" / "generated" / "tripulantes_memorial.json"
UA = {"User-Agent": "contar-con-datos-ara-san-juan/0.3 (investigacion academica)"}
FECHA_HECHOS = date(2017, 11, 15)

MESES = {m: i + 1 for i, m in enumerate(
    ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"])}

# Texto del memorial → consulta al nomenclador oficial.
# (endpoint, nombre, provincia, departamento o None, precisión, nota)
LUGARES = {
    "Rivadavia, San Juan": ("localidades", "Rivadavia", "San Juan", None, "localidad", None),
    "San Salvador de Jujuy, Jujuy": ("localidades", "San Salvador de Jujuy", "Jujuy", None, "localidad", None),
    "Olacapato, Los Andes, Salta": ("localidades", "Olacapato", "Salta", None, "localidad", None),
    "Mar del Plata": ("localidades", "Mar del Plata", "Buenos Aires", None, "localidad", None),
    "Mar del Plata, Buenos Aires": ("localidades", "Mar del Plata", "Buenos Aires", None, "localidad", None),
    "Capital Federal, Buenos Aires": ("provincias", "Ciudad Autónoma de Buenos Aires", None, None, "localidad",
                                      "«Capital Federal»: Ciudad Autónoma de Buenos Aires."),
    "San Luis": ("localidades", "San Luis", "San Luis", None, "ambigua",
                 "El memorial dice «San Luis»: puede ser la ciudad o la provincia. Se ubica en la ciudad capital."),
    "Calilegua, Ledesma, Jujuy": ("localidades", "Calilegua", "Jujuy", None, "localidad", None),
    "Pocitos, San Martín, Salta": ("localidades", "Profesor Salvador Mazza", "Salta", None, "localidad",
                                   "Pocitos es el nombre usual de la localidad de Profesor Salvador Mazza."),
    "Gaona, Anta, Salta": ("localidades", "Gaona", "Salta", None, "localidad", None),
    "Base Naval Puerto Belgrano": ("localidades", "Punta Alta", "Buenos Aires", None, "aproximada",
                                   "La Base Naval Puerto Belgrano no figura en el nomenclador: se ubica en Punta Alta, ciudad contigua."),
    "San Miguel de Tucumán": ("localidades", "San Miguel de Tucumán", "Tucumán", None, "localidad", None),
    "San Miguel de Tucumán, Tucumán": ("localidades", "San Miguel de Tucumán", "Tucumán", None, "localidad", None),
    "Palpalá, Jujuy": ("localidades", "Palpalá", "Jujuy", None, "localidad", None),
    "San Ramón de la nueva Oran, Salta": ("localidades", "San Ramón de la Nueva Orán", "Salta", None, "localidad", None),
    "Oberá, Misiones": ("localidades", "Oberá", "Misiones", None, "localidad", None),
    "González Catán, La Matanza, Buenos Aires": ("localidades", "González Catán", "Buenos Aires", None, "localidad", None),
    "Villa María, Córdoba": ("localidades", "Villa María", "Córdoba", "General San Martín", "localidad", None),
    "San Andrés del Sur, Jimenez, Santiago del Estero": ("asentamientos", "San Andrés del Sur", "Santiago del Estero", None, "localidad",
                                                         "Paraje del departamento Jiménez (Base de Asentamientos Humanos)."),
    "Concordia, Entre Ríos": ("localidades", "Concordia", "Entre Ríos", None, "localidad", None),
    "Lanús, Buenos Aires": ("localidades", "Lanús", "Buenos Aires", "Lanús", "localidad", None),
    "San Miguel, General Sarmiento, Buenos Aires": ("localidades", "San Miguel", "Buenos Aires", "San Miguel", "localidad",
                                                    "General Sarmiento es el antiguo partido, hoy San Miguel."),
    "Salta": ("localidades", "Salta", "Salta", None, "ambigua",
              "El memorial dice «Salta»: puede ser la ciudad o la provincia. Se ubica en la ciudad capital."),
    "Posadas, Misiones": ("localidades", "Posadas", "Misiones", None, "localidad", None),
    "San Pedro, Jujuy": ("localidades", "San Pedro", "Jujuy", None, "localidad", None),
    "Pinamar, General Juan Madariaga, Buenos Aires": ("localidades", "Pinamar", "Buenos Aires", None, "localidad", None),
    "General Alvear, Mendoza": ("localidades", "General Alvear", "Mendoza", None, "localidad", None),
    "San Pedro, General San Martín, Mendoza": ("localidades", "San Martín", "Mendoza", "San Martín", "departamento",
                                               "«San Pedro» no figura en el nomenclador: se ubica la cabecera del departamento General San Martín."),
    "San Isidro, Buenos Aires": ("localidades", "San Isidro", "Buenos Aires", "San Isidro", "localidad", None),
    "Hipólito Yrigoyen, Oran, Salta": ("localidades", "Hipólito Yrigoyen", "Salta", None, "localidad", None),
    "Resistencia, Chaco": ("localidades", "Resistencia", "Chaco", None, "localidad", None),
    "San Martín, San Juan": ("localidades", "Villa San Martín", "San Juan", None, "departamento",
                             "«San Martín» es un departamento: se ubica su cabecera, Villa San Martín."),
    "Olavarría, Buenos Aires": ("localidades", "Olavarría", "Buenos Aires", "Olavarría", "localidad", None),
    "Santa Fe": ("localidades", "Santa Fe", "Santa Fe", "La Capital", "ambigua",
                 "El memorial dice «Santa Fe»: puede ser la ciudad o la provincia. Se ubica en la ciudad capital."),
    "San Juan": ("localidades", "San Juan", "San Juan", None, "ambigua",
                 "El memorial dice «San Juan»: puede ser la ciudad o la provincia. Se ubica en la ciudad capital."),
}

PROVINCIA_DE_TEXTO = {"Capital Federal, Buenos Aires": "Ciudad Autónoma de Buenos Aires"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return " ".join(s.split())


def clean(x: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip()


def georef(endpoint, nombre, provincia, departamento, cache):
    key = f"{endpoint}|{nombre}|{provincia}|{departamento}"
    if key in cache:
        return cache[key]
    params = {"nombre": nombre, "max": 10, "exacto": "true"}
    if endpoint != "provincias":
        params["campos"] = "id,nombre,centroide,departamento.nombre,provincia.nombre,categoria"
        params["provincia"] = provincia
        if departamento:
            params["departamento"] = departamento
    else:
        params["campos"] = "id,nombre,centroide"
    url = f"https://apis.datos.gob.ar/georef/api/{endpoint}?" + urllib.parse.urlencode(params)
    data = json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60))
    items = data[endpoint]
    # Preferir la entidad principal antes que un «componente de localidad compuesta».
    items.sort(key=lambda i: ("Componente" in (i.get("categoria") or ""), len(i["id"])))
    if not items:
        raise SystemExit(f"Georef no devolvió resultados para {key}")
    it = items[0]
    res = {"id": it["id"], "nombre": it["nombre"], "lat": round(it["centroide"]["lat"], 5), "lon": round(it["centroide"]["lon"], 5),
           "provincia": (it.get("provincia") or {}).get("nombre", it["nombre"])}
    cache[key] = res
    time.sleep(0.3)
    return res


def main():
    t = RAW.read_text(encoding="utf-8", errors="ignore")
    items = re.findall(
        r'<div class="foto" data-id="\d+".*?<h4>(.*?)</h4>.*?<h5>(.*?)</h5>\s*<div class="bio">(.*?)</div>', t, re.S)
    crew_ts = (ROOT / "src" / "data" / "crew.ts").read_text(encoding="utf-8")
    decreto = {norm(n): int(o) for o, n in re.findall(r"orden: (\d+), nombreCompleto: '([^']+)'", crew_ts)}
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}

    out = []
    for nombre_html, grado_html, bio_html in items:
        nombre = clean(nombre_html)
        orden = decreto.get(norm(nombre))
        if orden is None:
            raise SystemExit(f"{nombre}: no coincide con la nómina del decreto")
        parrafos = [clean(p) for p in re.findall(r"<p>(.*?)</p>", bio_html, re.S)]
        primero = parrafos[0]
        m = re.search(
            r"(nacid[oa]|naci[óo]) en (?:la )?(.+?),?\s+(?:el\s+)?(\d{1,2})(?:ro\.)?\s+de\s+([A-Za-zé]+)\s+(?:del año\s+|de\s+)(\d{4})",
            primero)
        if not m:
            raise SystemExit(f"{nombre}: no se pudo leer el lugar y la fecha de nacimiento")
        participio, lugar, dia, mes, anio = m.groups()
        lugar = lugar.strip().rstrip(",")
        if lugar not in LUGARES:
            raise SystemExit(f"{nombre}: lugar sin regla de georreferencia: «{lugar}»")
        endpoint, q_nom, q_prov, q_dep, precision, nota = LUGARES[lugar]
        geo = georef(endpoint, q_nom, q_prov, q_dep, cache)
        nac = date(int(anio), MESES[mes.lower()], int(dia))
        edad = FECHA_HECHOS.year - nac.year - ((FECHA_HECHOS.month, FECHA_HECHOS.day) < (nac.month, nac.day))
        out.append({
            "orden": orden,
            "nombreMemorial": nombre,
            "gradoMemorial": clean(grado_html),
            "sexo": "mujer" if participio == "nacida" else "varón",
            "nacimiento": {
                "texto": lugar,
                "fecha": nac.isoformat(),
                "localidad": geo["nombre"],
                "provincia": PROVINCIA_DE_TEXTO.get(lugar, geo["provincia"]),
                "lat": geo["lat"],
                "lon": geo["lon"],
                "georefId": geo["id"],
                "precision": precision,
                "nota": nota,
            },
            "edad": edad,
            "bio": parrafos,
        })
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")
    out.sort(key=lambda r: r["orden"])
    assert len(out) == 44 and len({r["orden"] for r in out}) == 44, "deben ser 44 personas distintas"
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} tripulantes → {OUT}")


if __name__ == "__main__":
    main()
