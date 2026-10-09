# Investigación de fuentes — ARA San Juan

Consulta: 14/09/2026 (MVP) y 05/10/2026 (versión 3D de un minuto, ver §9). Todas las cifras de la experiencia salen de este inventario.

## 1. Inventario

| Fuente | URL | Datos | Formato | Cobertura | Calidad | Utilidad |
|---|---|---|---|---|---|---|
| Decreto 212/2020 (Boletín Oficial) | boletinoficial.gob.ar/detalleAviso/primera/226114/20200303 | Nómina de los 44: nombre y grado. "Más de 900 m", "cañón submarino del talud continental" | PDF / HTML | 44/44 | Oficial | **Alta**: base de la entidad Tripulante |
| Requerimiento de elevación a juicio (vía Infobae, 31/03/2026) | infobae.com/judiciales/2026/03/31/… | Comunicaciones 23:42 → 09:35 con hora, **única coordenada GPS (00:28)**, rumbos, 5 nudos, 18 m, 40 m, límite de 100 m, zarpe 25/10, Ushuaia 4/11–8/11 | Texto periodístico sobre documento judicial | 14–15/11/2017 | Judicial, mediada por prensa | **Alta**: columna vertebral de "Las últimas horas" |
| CTBTO Media Advisory (23/11/2017) | ctbto.org (copia en web.archive.org) | Evento 13:51 GMT, HA10 y HA04, −46,12 / −59,69 | HTML | 1 evento | Científica/oficial | **Alta**: única estimación espacial del 15/11 |
| Dall'Osto (2019), JASA 146(3) | pubmed.ncbi.nlm.nih.gov/31590500 | Elipses de error CTBTO: 19 × 12 km (con sísmica), ~500 × ~25 km (sólo hidroacústica) | Resumen científico | — | Revisada por pares | Media: dimensiona la incertidumbre, **sin centro ni orientación** |
| Ministerio de Defensa (17/11/2018) | argentina.gob.ar/noticias/el-ministerio-de-defensa-confirma-… | 907 m, ~500 km de la costa, escombros 80 × 100 m, 4 partes, vela a 90°, área con 90 % de probabilidad | HTML | Hallazgo | Oficial | **Alta** |
| Armada — Gacetilla 17/11/2018 | ara.mil.ar/submarino/sanjuan/Gacetilla1711.html (archivo) | POI 24, Área 1/Subárea 15a, casco resistente en una pieza a 907 m, 25–30 × 7 m, acero 33 mm | HTML | Hallazgo | Oficial | **Alta** |
| Armada — Partes de actividades SITREP SECO | ara.mil.ar/submarino/sanjuan/partedeprensaN.html (archivo) | Posición del Seabed Constructor 2×día, áreas, AUV, POI | HTML | 36 partes recuperados (de ≥133); 19 con coordenada | Oficial | **Alta**: única serie espacio-temporal de la búsqueda |
| Armada — micrositio "La búsqueda continúa" | ara.mil.ar/submarino/sanjuan/index.html (archivo) | 18 países, +4000 personas, 28 unidades, 9 aeronaves; 78 contactos/120 días; 17 puntos; licitación 60–120 días, USD 7,5 M | HTML | 2017–2018 agregado | Oficial | Media: cifras sin desagregar |
| Ocean Infinity — Daily Status Reports | ara.mil.ar/submarino/sanjuan/informeN.pdf (archivo) | km por inmersión de AUV, cobertura proyectada | PDF | Primeras semanas | Empresa | Baja para MVP |
| Ocean Infinity — comunicados | oceaninfinity.com | 5 AUV, ~60 personas, 920 m, ~600 km de Comodoro | HTML | Inicio y hallazgo | Empresa | Media (contraste) |
| Comisión Bicameral — Informe final (18/07/2019) | senado.gob.ar/prensa/17713 | Investigación completa | PDF escaneado sin texto | Todo | Oficial | **Pendiente OCR** |
| Infobae (30/11/2017) | infobae.com/sociedad/2017/11/30/… | Edad (26/44), origen, función | Texto | Parcial | Periodística | Media: dimensión humana, rotulada |
| La Nación (18/11/2018) vía Wikipedia | lanacion.com.ar/2192921-… | Coordenada del hallazgo 45°56′59″S 59°46′22″O | Texto | 1 punto | Periodística | Media: única coordenada pública hallada |
| GEBCO 2020 (OpenTopoData) | api.opentopodata.org/v1/gebco2020 | Batimetría | JSON (grilla muestreada) | Sitio, región, plataforma | Dataset científico | **Alta**: fondo real del 3D y del mapa |
| Natural Earth 1:50m | world-atlas@2.0.2 | Costa | TopoJSON | Global | Dataset | Alta |
| Turismo Mar del Plata (municipal) | turismomardelplata.gob.ar/arasanjuan/historia.html | Eslora 65,93 m, desplazamiento | HTML | Ficha | Oficial municipal | Media |

## 2. Qué NO se encontró

- **Trayectoria del submarino** (Mar del Plata → Ushuaia → patrulla → 15/11). No publicada.
- **Posición en la última comunicación (07:19)**. No publicada.
- **Coordenada oficial del hallazgo**. Sólo en prensa.
- **Polígonos de zonas de búsqueda 2017** y recorridos de buques/aeronaves. No publicados.
- **Centro, orientación y nivel de confianza** de las elipses de error del CTBTO.
- **Temperatura/condiciones en el sitio** para esas fechas. Solo climatología (World Ocean Atlas, no descargado: servidor NOAA inaccesible desde este entorno).
- **Planos del interior** con licencia de uso. No se modela el interior.
- **Fotografías con permisos verificados**. No se usan.
- Edad para 18 tripulantes y origen para 8 en la fuente consultada.
- Documento original del requerimiento fiscal y texto del informe bicameral (escaneado).

## 3. Qué se puede representar con certeza

- Los 44 nombres y grados.
- La secuencia horaria de comunicaciones del 14–15/11/2017 y sus profundidades (18 m, 40 m, límite de 100 m).
- Una coordenada del submarino: 00:28 del 15/11/2017.
- El evento acústico de las 10:51 como **estimación**.
- Cifras agregadas de la búsqueda 2017.
- Posiciones diarias del buque de búsqueda (19 puntos, 9/9 al 16/11/2018).
- El aviso del POI 24 (15/11/2018, 22:15) y la identificación (17/11/2018).
- 907 m, casco resistente en una pieza, campo de escombros 80 × 100 m.

## 4. Qué tiene incertidumbre

- Dónde estuvo entre 00:28 y el hallazgo: **desconocido**.
- Localización del evento acústico: estimación con error de 19 × 12 km (o ~500 × ~25 km según el método).
- Coordenada exacta del hallazgo: fuente periodística, consistente con GEBCO (−910 m) y con el CTBTO (20 km).
- Hora exacta de identificación ("primeras horas del 17/11").
- Grados de los 11 tripulantes del Art. 2 del decreto al 15/11/2017.

## 5. Narrativa definitiva

**"367 días entre dos coordenadas."** La historia no es la de un recorrido sino la de una **pérdida de información espacial**: una coordenada precisa (00:28), siete horas de mensajes sin posición, un sonido localizado desde el otro lado del océano, un año de búsqueda sin coordenada y, al final, otro punto: a 91 km del primero y 907 m bajo la superficie.

Hallazgo que la narrativa hace visible: la última coordenada pública no es la de la última comunicación. El submarino fue hallado a 91 km de ella, es decir **unas 100 veces la profundidad** (91,4 km / 0,907 km = 100,8). La dificultad fue, sobre todo, horizontal.

## 6. Pieza central

El **mapa del silencio**: la última coordenada se vuelve hueca, el reloj sigue, un área rayada (hipótesis rotulada, 5 nudos × tiempo) crece sin posición; aparece la estimación acústica; el contador de días corre sin puntos; los cuadrados del buque de búsqueda recorren el sitio; se van al norte; vuelven; aparece una coordenada. Luego, el descenso a escala real hasta 907 m.

## 7. Qué se eliminó de la propuesta original y por qué

| Idea | Decisión | Motivo |
|---|---|---|
| Trayectoria animada del submarino | Reemplazada (10/2026) por un **trazado esquemático rotulado** | No hay recorrido publicado: la línea une lugares documentados por puntos de paso propios en el mar, y lo dice en pantalla |
| "Última posición conocida" = última comunicación | Corregida | La coordenada es de las 00:28; a las 07:19 no hay posición |
| Área de incertidumbre como elipse CTBTO | Sin dibujar | Sin centro ni orientación publicados |
| Evolución espacial de la búsqueda 2017 | Reemplazada por cifras | Sin polígonos ni recorridos |
| Trayectorias de barcos y aviones | Reemplazadas | Sólo hay posiciones del Seabed Constructor en partes |
| Temperatura en el descenso | Eliminada del MVP | No hay medición del sitio; la climatología no es el dato del día |
| Submarino intacto en el fondo | Eliminado | Estaba fragmentado; se usa marcador + silueta de escala |
| Interior 3D | Eliminado | Sin planos con licencia |
| Fotos de los tripulantes | Incorporadas (10/2026) | Retratos oficiales del memorial «44 Presentes» (MinDef y Armada), cotejados con el decreto |
| "907 m" como número de tarjeta | Transformado | Descenso con escala vertical real y presión calculada |

## 8. Posiciones

| Id | Lat | Lon | Fecha/hora (UTC−3) | Certeza | Fuente |
|---|---|---|---|---|---|
| Última posición informada | −46,73333 (46°44′S) | −60,13333 (60°08′O) | 15/11/2017 00:28 | Hecho | Requerimiento fiscal vía Infobae |
| Evento hidroacústico | −46,12 | −59,69 | 15/11/2017 10:51 | Estimación | CTBTO |
| Hallazgo POI 24 | −45,94972 (45°56′59″S) | −59,77278 (59°46′22″O) | 17/11/2018 (madrugada) | Hecho (coordenada de prensa) | MinDef, Armada, La Nación |
| Seabed Constructor ×19 | ver `src/data/generated/seabedConstructorPositions.json` | | 09/09–16/11/2018 | Hecho | Partes de la Armada |

Distancias (cálculo haversine propio): 00:28 → hallazgo 91,4 km (rumbo 018°); CTBTO → hallazgo 20,0 km; 00:28 → CTBTO 76,2 km; 00:28 → Mar del Plata 994 km (con la coordenada de referencia de Wikipedia); 00:28 → costa más cercana 430 km (Santa Cruz, Natural Earth 1:50m); hallazgo → Comodoro Rivadavia 598 km. Todas se verifican con `npm run verify`.

## 9. Ampliación para la versión 3D de un minuto (05/10/2026)

Pedido del autor: foco humano al inicio, recorrido del submarino en el mapa, profundidad comparada con estructuras
conocidas, evidencia documental (incluido el audio del comandante, si existiera) e implosión conceptual. Lo que se
buscó y lo que se decidió:

| Tema | Hallazgo | Decisión |
|---|---|---|
| Retratos de los 44 | El memorial virtual oficial **«44 Presentes»** (Ministerio de Defensa y Armada, 2020) publicaba la foto de cada tripulante. El dominio caducó y hoy redirige a un sitio ajeno; las 44 fotos están en la Wayback Machine (`44presentes.org/images/tripulantes/NN.jpg`). | Se usan las 44, cotejadas por nombre con el Decreto 212/2020 (44/44 coincidencias; difieren sólo tildes: «Victor», «Ibañez», «Cesar»). Reproducible con `scripts/fetch_retratos.py`. Mosaico en el orden del decreto. |
| Audio del comandante | La única grabación de la voz del comandante Fernández que trascendió es de **abril de 2017** (Consejo Asesor del Arma Submarina). Se reprodujo en el juicio de 2026 y la fiscalía y las querellas la objetaron (Infobae, 24/03/2026). El reporte del ingreso de agua de las 06:00 fue un **SITREP escrito**. | No se usa ninguna grabación. Se muestra el texto literal del SITREP como documento y queda el lugar preparado en `public/evidencia/evidencia.json`. |
| Foto del submarino | Wikimedia Commons: *Submarino ARA San Juan (33866567363).jpg*, Juan Kulichevsky, 14/05/2017, CC BY-SA 2.0. | Se usa en el momento de contexto, con crédito. |
| Imágenes de los restos | Por pedido de las familias sólo se publicaron tres imágenes de identificación. | No se muestran. |
| «Implosión» | El abstract de Dall'Osto (2019) habla de un «intense acoustic event», no de implosión. El requerimiento fiscal (vía Infobae, 31/03/2026) menciona la «pérdida de control de profundidad que llevó al colapso del submarino». Vergoz et al. (PAGEOPH, 2021, CC BY 4.0) confirman el carácter impulsivo de la señal, la relocalizan a **3,5 km de los restos** y detectan dos impulsos muy próximos, a escalas comparables con el tamaño del submarino. | Se representa como **concepto** (malla abstracta, flechas de presión, onda), rotulado como hipótesis y sin ubicarlo en ninguna profundidad, porque no está publicada. |
| Alturas de referencia | Obelisco 67,5 m y base de 6,8 m (Turismo GCBA) · Torre Eiffel 330 m desde la antena de 2022 (Ville de Paris) · Burj Khalifa 828 m (CTBUH). | Siluetas esquemáticas a escala 1:1 apoyadas a 907 m: la punta del Burj Khalifa queda a 79 m bajo el agua. |
| Coordenadas de ciudades | API de Wikipedia: Buenos Aires, Mar del Plata, Comodoro Rivadavia, Caleta Olivia, Puerto Deseado, Ushuaia. | Sólo como referencia del mapa y de las distancias. |
| Trazado del viaje | No hay recorrido publicado. | Línea punteada esquemática entre Mar del Plata (25/10), Ushuaia (4 al 8/11) y la coordenada de las 00:28, con puntos de paso propios en el mar (Le Maire, Beagle). `npm run verify` comprueba que no cruce tierra. |


## 10. Plataforma de exploración (08/10/2026)

Datos nuevos incorporados para los cuatro módulos de exploración:

| Dato | Fuente | Método | Resultado |
|---|---|---|---|
| Lugar y fecha de nacimiento de los 44, biografía, tareas a bordo | Memorial «44 Presentes» (MinDef y Armada), página archivada | `scripts/build_tripulantes.py` extrae el texto oficial y lo coteja con el decreto | 44/44 con lugar y fecha; edad calculada al 15/11/2017 (25 a 47 años, mediana 35,5) |
| Coordenadas de los lugares de nacimiento | API Georef (datos.gob.ar; nomenclador IGN–INDEC) | Consulta por nombre y provincia; ninguna coordenada elegida a mano | 33 lugares distintos: 26 localidades exactas, 4 ambiguas (el memorial nombra una ciudad homónima de su provincia), 1 aproximada (Base Naval Puerto Belgrano → Punta Alta) y 2 departamentales (San Pedro, Mendoza; San Martín, San Juan). Las no exactas abarcan a 9 de las 44 personas. `npm run verify` comprueba que cada punto cae en su provincia |
| Sexo | Armada: «43 hombres y una mujer»; la única mujer, identificada por el memorial e Infobae | Dato agregado oficial; no se infiere de nombres ni de fotos | Filtro disponible con la explicación a la vista |
| Límites provinciales | IGN, capa «provincia» (WFS) | `scripts/build_provincias.py`: sin sector antártico, Douglas–Peucker ≈ 1 km | 24 jurisdicciones, 142 KB |
| Relieve de Argentina | GEBCO 2020 (OpenTopoData), grilla de 0,12° | `scripts/fetch_bathymetry.py argentina` | 284 × 176 puntos |
| Zonas de luz del océano | NOAA National Ocean Service | Descripción general, no medición del sitio | 0–200 m eufótica; 200–1.000 m disfótica |

Hallazgos que surgen de cruzar los datos (calculados en vivo en la experiencia):

- Jujuy (9) y Salta (7) suman 16 nacimientos: más que la provincia de Buenos Aires (12), donde estaba la base.
- La mediana de la distancia entre el lugar de nacimiento y Mar del Plata es de 1.206 km; 26 de 44 nacieron a más de 1.000 km.
- En 9 de los 26 casos con edad publicada por la prensa en 2017, esa edad difiere de la calculada con la fecha oficial (casi siempre por un año).
- La prensa de 2017 consigna a menudo la localidad de residencia; el memorial, la de nacimiento (por ejemplo, Coronel: Libertador según la prensa, Calilegua según el memorial). El mapa usa el nacimiento.

Lo que la exploración NO puede mostrar por falta de datos publicados: zonas o polígonos de búsqueda de 2017, recorridos de buques y aeronaves de 2017, superficie relevada en 2018, ubicación interna de las baterías y de la ventilación, temperatura del sitio en la fecha, posición del submarino después de las 00:28.


## 11. Viaje continuo (09/10/2026)

Decisiones de diseño de la versión de 70 s en un solo mundo 3D (sin datos nuevos de fuentes):

| Tema | Decisión | Motivo |
|---|---|---|
| Descenso | Se muestra sobre la coordenada del hallazgo y se rotula «ilustrativo / reconstrucción» | La posición posterior a las 00:28 no está publicada; 907 m es la única profundidad verificada |
| Colapso | Implosión conceptual (destello, onda de presión, estruendo); sin fuego, fragmentos ni restos; sin número de profundidad | La profundidad del colapso no se publicó; los restos no se muestran por pedido de las familias |
| Clima | La «tensión» visual y sonora arranca en el límite preventivo (100 m) y crece hasta el colapso | Mapeo de diseño; sólo 18/40/100/907 m, la presión y la zona de luz NOAA son datos |
| Manómetro | En el tramo sin datos pinta la banda 11–91 atm en vez de un número | Hacer visible la incertidumbre |
| 44 luces | Una luz por persona, abstractas (no indican ubicaciones a bordo) | Hilo emocional sin mostrar personas ni restos |
| Submarino | Un único modelo esquemático, agrandado como símbolo en el mapa | Continuidad; sólo la eslora y el ancho del casco son datos |
| Sonido | Todo sintetizado; el estruendo está limitado y el volumen del usuario manda | Sin grabaciones con fuente y licencia verificables |
| Movimiento | `npm run motion` mide giro de mirada, zoom, paneo y rumbo a 60 cuadros/s | Garantizar que no haya cortes ni saltos |
