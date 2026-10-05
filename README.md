# ARA San Juan — 367 días entre dos coordenadas

Experiencia de datos para el concurso **Contar con Datos** (Universidad de San Andrés).

Pregunta central: **entre la última coordenada informada del ARA San Juan (15/11/2017, 00:28) y la siguiente (el hallazgo, 17/11/2018) pasaron 367 días. ¿Qué se sabía, y qué no, sobre dónde estaba?**

La experiencia recorre el viaje, las últimas comunicaciones, el silencio, la búsqueda, el descenso a 907 m y los 44 tripulantes. Cada dato está referenciado y clasificado como **hecho documentado**, **estimación** o **hipótesis**.

---

## Requisitos

- Node.js 20 o superior (probado con Node 24.21 LTS)
- Navegador con WebGL para la escena 3D. Sin WebGL se muestra la versión 2D.

## Uso

```bash
npm install
npm run dev
```

Abrir la URL que muestra Vite (por defecto http://localhost:5173).

Otros comandos:

```bash
npm run typecheck   # verificación de tipos
npm run build       # typecheck + build de producción en dist/
npm run preview     # servir el build
```

## Estructura

```
src/
  data/           datos y tipos, separados del código visual
    types.ts          Tripulante, Position, TimelineEvent, Source, DepthMarker…
    sources.ts        registro de fuentes (URL, institución, fecha, aporta, limitaciones)
    events.ts         cronología con fuente y nivel de certeza
    positions.ts      posiciones documentadas / estimadas / hipótesis explícita
    crew.ts           los 44 (Decreto 212/2020 + Infobae 30/11/2017)
    depth.ts          profundidades documentadas y dimensiones del modelo
    search.ts         cifras de la búsqueda
    discrepancies.ts  diferencias entre fuentes y decisión tomada
    generated/        datos extraídos por scripts (posiciones del buque de búsqueda)
  components/     piezas de interfaz (intro, explorador, metodología, badges)
  scenes/         capítulos narrativos (mapa, descenso 3D, 44)
  visualizations/ mapa D3, corte 2D, visualización de tripulantes, línea de tiempo
  utils/          geodesia, física, formato, carga de datos, hooks de scroll
  styles/         CSS global
public/data/      costa (Natural Earth) y batimetría (GEBCO 2020) en JSON
scripts/          reproducción de la descarga y extracción de datos
docs/             informe de investigación de fuentes
```

## Datos reproducibles

```bash
python scripts/fetch_bathymetry.py   # GEBCO 2020 vía api.opentopodata.org (1 req/s)
python scripts/fetch_partes.py       # partes oficiales 2018 desde la Wayback Machine
```

`fetch_bathymetry.py` escribe JSON crudos; `public/data/bathy_*.json` son esos mismos valores redondeados a metros enteros.

## Tecnología

React 19 · TypeScript · Vite · Three.js con React Three Fiber (escena 3D cargada bajo demanda) · D3 (mapa en canvas + SVG, isóbatas, línea de tiempo). No se usan mosaicos de mapas externos: la costa y la batimetría viajan con el proyecto.

## Sonido

Hay un botón **«Activar sonido»** en la portada (los navegadores no permiten audio automático) y un
control de silencio en la barra superior.

- **Efectos sintetizados** con la Web Audio API: no hay archivos ni grabaciones. Un zumbido grave sigue
  la profundidad, la alarma marca el cruce del límite preventivo de 100 m, hay crujidos de presión a
  300, 500, 700 y 850 m, ping de sonar durante la búsqueda y un acorde al llegar al fondo.
- **El evento de las 10:51 corta todo el sonido.** El capítulo del silencio se escucha en silencio.
- **Narración** con la voz del navegador y subtítulos siempre visibles. Para usar una voz grabada, ver
  `public/audio/README.md`: alcanza con dejar los MP3 y listarlos en `manifest.json`.

Nada del audio es un dato: está declarado como diseño sonoro en la sección de metodología.

## Principios

- No se inventan posiciones, trayectorias, comunicaciones, causas ni condiciones ambientales.
- Lo que no está publicado no se dibuja (recorrido, posición de las 07:19, zonas de búsqueda de 2017, elipses sin centro).
- La única hipótesis (área alcanzable a 5 nudos) está rotulada, rayada en ámbar y con sus supuestos a la vista.
- Sin fotografías ni imágenes generadas.

Ver `docs/INVESTIGACION.md` para el inventario de fuentes, lo que no se encontró y la narrativa.

## Licencias de datos

- GEBCO Compilation Group (2020) GEBCO 2020 Grid — dominio público, atribución requerida.
- Natural Earth — dominio público.
- Textos oficiales citados: Boletín Oficial, Ministerio de Defensa, Armada Argentina, CTBTO.
