# ARA San Juan — 44 personas, una coordenada, 367 días

Experiencia de datos en 3D para el concurso **Contar con Datos** (Universidad de San Andrés). Combina un
documental interactivo, un atlas tridimensional, un memorial digital y un laboratorio de exploración de datos.
Tiene dos modos que comparten datos y componentes:

- **Historia guiada («viaje continuo»):** una película de 70 s en un solo mundo 3D, sin cortes de cámara. Empieza por
  las 44 personas (44 luces sobre el mar), sigue el viaje del submarino, las últimas horas, el silencio, el descenso
  ilustrativo a escala real, el colapso (representación conceptual), los 367 días hasta el hallazgo a 907 m y el
  memorial. Se puede pausar en cualquier momento, **arrastrar la línea de tiempo**, saltar a los **hitos documentados**,
  **mirar alrededor arrastrando** sobre la escena y abrir la evidencia de cada lugar.
- **Exploración libre:** cuatro módulos conectados en los que cada persona filtra, compara y consulta las
  fuentes.

Cada dato está referenciado y clasificado con ícono y color:

| | Categoría | Qué significa |
|---|---|---|
| ✓ | **Confirmado** | Respaldado por una fuente documental identificable. |
| ≈ | **Estimado** | Valor aproximado obtenido con un procedimiento explícito. |
| ◇ | **Reconstrucción** | Construcción propia, siempre rotulada. |
| ? | **No determinado** | No puede establecerse con las fuentes disponibles. |

---

## Uso

Requisitos: Node.js 20 o superior y un navegador con WebGL.

```bash
npm install
npm run dev        # http://localhost:5173
npm run verify     # verificación de datos (fuentes, distancias, provincias, edades, trazado, retratos)
npm run motion     # continuidad del movimiento: la cámara y el submarino no dan saltos (60 cuadros/s)
npm run build      # typecheck + build de producción en dist/
```

## Los cuatro módulos de exploración

### 1 · Las 44 vidas

**Escena:** mapa 3D de Argentina con relieve (GEBCO 2020) y límites provinciales del IGN. Cada lugar de
nacimiento es una columna sobre su coordenada oficial (Georef), con altura proporcional a la cantidad de
personas nacidas allí. Los países vecinos se atenúan con una máscara calculada a partir de los límites
oficiales.

**Filtros combinados:**
- provincia, que se elige en la lista, en el gráfico o tocando la provincia en el mapa;
- rango de edad al 15/11/2017;
- sexo (dato oficial agregado);
- grado;
- localidad;
- nombre.

Mapa, contador, lista, histograma y barras cambian juntos. Hay un botón para restablecer los filtros.

**Los 44 rostros:** el panel de resultados abre como mosaico con los 44 retratos oficiales. Están siempre
todos —la nómina completa es el dato— y los que no cumplen los filtros se atenúan en lugar de desaparecer,
para no perder la escala del conjunto. También puede verse como lista con datos.

**Fichas:** cada persona tiene retrato, grado, edad calculada con su fecha de nacimiento oficial, lugar de
nacimiento con su precisión, distancia a la base y biografía oficial del memorial.

**Hallazgos calculados con los datos:**
- Jujuy y Salta suman 16 nacimientos, más que la provincia de Buenos Aires (12), donde estaba la base.
- La mitad de la tripulación nació a más de 1.206 km de Mar del Plata.
- En 9 de los 26 casos con edad publicada por la prensa en 2017, esa edad difiere de la que surge de la fecha
  oficial.

### 2 · La última travesía

**Escena:** mapa 3D del Atlántico Sur, con relieve y batimetría.

**Línea de tiempo:** se arrastra, se reproduce y se pausa. Tiene velocidades de 0,5×, 1× y 2×, saltos entre
acontecimientos y desaceleración al llegar a cada uno. Es por tramos y lo declara: las tres semanas de misión
ocupan el 30 % y las últimas 13 horas el 70 %.

**Capas combinables:**
- trazado esquemático;
- posiciones documentadas;
- comunicaciones;
- acontecimientos técnicos;
- hipótesis de alcance;
- evento acústico;
- batimetría;
- hallazgo.

**Posición del submarino:** es confirmada en Mar del Plata, en Ushuaia y a las 00:28; reconstruida
(esquemática) entre esos lugares; y no determinada después de las 00:28.

**Submarino en 3D:** se abre tocando el submarino-símbolo. Es un modelo esquemático que se puede inspeccionar.
Sólo tiene puntos interactivos en las cuatro partes informadas en el fondo (proa, casco, vela y popa). Los
componentes sin ubicación publicada se listan aparte y no se dibujan.

**Hallazgos calculados con los datos:** las 6 h 51 min entre la última posición y la última comunicación sin
ninguna coordenada; sólo 4 de los 13 acontecimientos tienen lugar publicado; el hallazgo quedó a 91,4 km de la
coordenada de las 00:28, dentro del círculo de 96 km alcanzable a 5 nudos hasta el evento acústico (cota
geométrica, no una trayectoria).

### 3 · La búsqueda

- **Línea de fechas:** del 15/11/2017 al hallazgo, con un contador de días.
- **Posiciones del buque:** las del Seabed Constructor que figuran en los partes oficiales.
- **Fase:** filtro entre la búsqueda de la Armada (2017–18) y la de Ocean Infinity (2018).
- **Comparación de dos períodos:** muestra sólo los conteos que los datos permiten.
- **Métricas:** cada una con su definición y su fuente.
- **Zonas de búsqueda:** no se publicaron, así que no se dibujan ni se estiman.
- **Hallazgos calculados con los datos:** la primera posición publicada de un buque es del día 298 de 367; en
  los 298 días anteriores no hay ninguna; las 19 posiciones recuperadas son todas de 2018 y los partes llegan
  hasta el N.º 133, así que no cubren la campaña.

### 4 · 907 metros

- **Control de profundidad:** se arrastra, se usa la rueda o el teclado, y tiene paradas rápidas.
- **Comparaciones:** aparecen de a una y en su tramo (Obelisco, Torre Eiffel, Burj Khalifa, hallazgo). Cada
  estructura se dibuja con la base a esa profundidad y la punta en la superficie, a la misma escala física, y
  la cámara la encuadra completa.
- **Datos físicos:** presión con la fórmula y sus parámetros, zona de luz (NOAA). La temperatura no se
  muestra porque no hay mediciones del sitio para esa fecha.
- **Hallazgos calculados con los datos:** 907 m son 9,1 veces el límite preventivo de 100 m con el que operaba;
  entre 100 y 907 m hay 807 m (el 89 % de la columna) sin ningún dato publicado; ≈ 91,2 atm, unos 93 kg sobre
  cada cm²; 13,8 veces su propia eslora.

**Escala y orientación**, en todos los módulos: como la cámara es libre, arriba a la derecha hay una barra de
escala que mide una distancia real en el plano del punto de mira y una rosa que señala el norte según la
orientación de la cámara (se atenúa cuando el norte queda casi perpendicular a la pantalla). El texto declara la
exageración vertical del relieve o la escala 1:1, según la escena.

**Teclado**, en exploración: `1` a `4` cambian de módulo y `Esc` cierra el panel abierto más reciente.

**Panel de evidencia**, en cada acontecimiento: qué se sabe, el fragmento citado (identificado como
transcripción), el documento asociado, el lugar, las fuentes con sus limitaciones y la clasificación.

## Tour de 1 minuto

El botón **«▶ Tour 1 min»** de la barra superior (y de la portada) recorre toda la página en **60,000 segundos exactos**:
34 s de lo mejor de la película del submarino (zarpe, última coordenada con su evidencia, descenso con manómetro,
colapso, hallazgo, línea de tiempo con hitos) y 26 s de **Explorar** (las 44 vidas, la travesía con el submarino en 3D,
la búsqueda y 907 m). Tiene subtítulos, un cursor fantasma que muestra dónde se hace clic y una tarjeta final. `Esc` sale.
Lleva **narración con una voz masculina argentina sintetizada con IA** (Microsoft Edge TTS, `es-AR-TomasNeural`): son 13 clips
MP3 generados una sola vez con `scripts/build_voz.py` a partir de `src/tour/voz.json` y servidos como archivos estáticos (la
página no llama a ningún servicio de voz). No es una persona real ni una grabación; se puede apagar con el botón «Voz». Para
regenerar los audios: `pip install edge-tts mutagen && python scripts/build_voz.py`.
Con `#tour` en la dirección, la página abre con el tour listo para empezar. El guion está en `src/tour/script.ts` y
`npm run tour` verifica que dure exactamente 60 s y que cada control señalado exista.

## El viaje continuo

- **Un solo reloj** (`story/store.ts`): el scroll es la entrada y el tiempo que ve la escena se mueve con inercia; la
  reproducción, la barra de tiempo y los vuelos a un hito comparten el mismo tiempo.
- **Un solo mundo** (`three/JourneyWorld.tsx`, 1 u = 1 km): el mapa y el sitio del hallazgo (a escala 1:1) viven en la
  misma escena; el relieve se **desexagera** de forma continua al acercarse.
- **Un solo protagonista** (`three/HeroSub.tsx`, `journey/subPath.ts`): el submarino se ve sólido donde su posición es un
  dato, fantasma donde no se sabe y ◇ reconstrucción en el descenso ilustrativo.
- **Una cámara sin cortes** (`journey/camera.ts`): trayectoria monótona C1 función del tiempo; `scripts/check-motion.mjs` lo verifica.
- **Clima = presión y profundidad** (`journey/env.ts`): color del agua, niebla, viñeta, ruido, temblor, nieve marina y sonido
  siguen a la profundidad y a una «tensión» de puesta en escena que arranca en el límite preventivo de 100 m.
- **Las 44 luces** (`three/fx/Lights44.tsx`): una por persona; hilo emocional de principio a fin.

## Estructura

```
src/
  app/            estado compartido (modo, módulo, filtros, tiempo, capas, profundidad) y barra superior
  story/          historia guiada: guion de 12 momentos (70 s), reloj suavizado, vuelos a hitos, enlaces profundos
  journey/        función pura del tiempo: submarino, cámara, clima, hitos, mirada libre (sin React)
  explore/        exploración: modelos de datos y paneles de cada módulo, panel de evidencia
    vidas/ travesia/ busqueda/ profundidad/
  three/          escena 3D (un solo Canvas)
    map/              piezas del mapa compartidas (relieve, costa, marcas, hipótesis)
    explore/          mundos de cada módulo y cámara orbital (CameraControls)
    JourneyWorld · JourneyRig · HeroSub · Ocean · SubmarineModel · Landmarks · depthParts
    fx/             las 44 luces, nieve marina y el colapso
  overlay/        interfaz de la historia guiada
  audio/          sonido sintetizado por capas (mar, temporal, casco, hélice, sonar, crujidos, latido, colapso, memorial); sin voz
  data/           datos con fuente y certeza, separados de la interfaz
    generated/        tripulantes_memorial.json, retratos44.json, posiciones del buque
public/data/      batimetría GEBCO (plataforma, región, sitio, Argentina), costa, provincias IGN
public/tripulantes/  44 retratos oficiales
scripts/          descarga, procesamiento y verificación reproducibles
```

## Datos reproducibles

```bash
python scripts/fetch_bathymetry.py [argentina]  # GEBCO 2020 vía OpenTopoData
python scripts/fetch_partes.py                  # partes oficiales 2018 (Wayback Machine)
python scripts/fetch_retratos.py                # retratos del memorial «44 Presentes» (Wayback)
python scripts/build_tripulantes.py             # nacimiento, edad y biografía (memorial) + coordenadas Georef
python scripts/build_provincias.py              # límites del IGN, simplificados (Douglas–Peucker ≈ 1 km)
npm run verify                                  # comprueba todo lo anterior contra el código
```

## Sonido

Todo es sintetizado (Web Audio), sin voz ni grabaciones reales. Arranca con el primer gesto del usuario y se puede
activar, silenciar y ajustar desde la barra superior. Un motor recibe el entorno de la película (profundidad, tensión,
velocidad, temporal, si la cámara está bajo el agua) y mezcla: mar y temporal, casco, hélice, retumbo profundo, sonar con
reverb, crujidos del casco desde los 100 m, burbujas, latido que acelera, un riser de tensión, radio en cada llamada, el
silencio previo al colapso, el estruendo del colapso (golpe grave con barrido, retumbo, reverb larga y acúfeno tenue) y 44
campanillas muy bajas durante el ascenso final. Hay limitador en el bus maestro. En `public/evidencia/evidencia.json` queda
preparado un lugar para un audio documental con fuente verificable.

## Principios

- **No se inventan** coordenadas, horarios, trayectorias, fotografías, audios, causas, polígonos ni mediciones.
- **El colapso es una representación:** destello, onda de presión y estruendo, sin fuego, fragmentos ni restos. No se publicó
  la profundidad a la que ocurrió y la película no muestra ningún número en ese momento.
- **Rotulado de lo que no está documentado:** el trazado del viaje es esquemático, el alcance a 5 nudos y la
  implosión son reconstrucciones, y las formas de los modelos 3D son genéricas.
- **Escalas declaradas:**
  - mapa: relieve ×25 bajo el mar y ×8 en tierra;
  - profundidad y sitio del hallazgo: escala real 1:1 (el relieve se desexagera al acercarse);
  - submarino en el mapa: símbolo, no a escala.
- **Retratos:** oficiales, cotejados uno por uno con el Decreto 212/2020. No se muestran imágenes de los
  restos, por pedido de las familias.

Detalle completo en el anexo de metodología de la propia experiencia y en `docs/INVESTIGACION.md`.

## Licencias y créditos

- GEBCO Compilation Group (2020) GEBCO 2020 Grid · Natural Earth: dominio público.
- Límites provinciales: Instituto Geográfico Nacional (IGN).
- Coordenadas de localidades: API Georef (datos.gob.ar).
- Retratos y biografías: memorial «44 Presentes» (Ministerio de Defensa y Armada Argentina), recuperado del
  archivo web. Se usan con fines de homenaje y con atribución.
- Foto del ARA San Juan (2017): Juan Kulichevsky, CC BY-SA 2.0.
- Zonas de luz: NOAA National Ocean Service.
