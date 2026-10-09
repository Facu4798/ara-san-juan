import { sources, sourceShort } from '../data/sources';
import { discrepancies } from '../data/discrepancies';
import { CertaintyBadge, SourceRefs } from './Certainty';

const TIPO: Record<string, string> = {
  oficial: 'Oficial',
  'judicial-via-prensa': 'Judicial (vía prensa)',
  cientifica: 'Científica',
  empresa: 'Empresa',
  periodistica: 'Periodística',
  dataset: 'Dataset',
  'registro-visual': 'Registro visual',
};

/** ANEXO: datos, fuentes y decisiones. Queda fuera del minuto guiado, a disposición del jurado. */
export function Methodology() {
  return (
    <section id="metodologia" className="section annex" aria-labelledby="metodologia-title">
      <div className="eyebrow">Anexo · Datos y metodología</div>
      <h2 id="metodologia-title">Qué sabemos, cómo lo sabemos y qué no</h2>

      <div className="method-grid">
        <div>
          <CertaintyBadge c="hecho" />
          <h3>Confirmado</h3>
          <p>Respaldado directamente por una fuente documental identificable: oficial, judicial, científica o de la empresa contratada. Ícono ✓, blanco frío, trazo sólido.</p>
        </div>
        <div>
          <CertaintyBadge c="estimacion" />
          <h3>Estimado</h3>
          <p>Valor aproximado obtenido con un procedimiento explícito (triangulación acústica, aviso preliminar, presión calculada). Ícono ≈, celeste.</p>
        </div>
        <div>
          <CertaintyBadge c="hipotesis" />
          <h3>Reconstrucción o hipótesis</h3>
          <p>
            Construcción propia, siempre rotulada: el trazado esquemático del viaje, el área alcanzable a 5 nudos, el descenso
            ilustrativo, la representación conceptual del colapso y las formas de los modelos 3D. Ícono ◇, ámbar.
          </p>
        </div>
        <div>
          <CertaintyBadge c="desconocido" />
          <h3>No determinado</h3>
          <p>Lo que no puede establecerse con las fuentes disponibles: la posición después de las 00:28, cómo y cuándo descendió, las zonas de búsqueda de 2017, la ubicación interna de las baterías. Ícono ?, gris acero.</p>
        </div>
      </div>

      <div className="method-grid">
        <div>
          <h3>Qué no se muestra y por qué</h3>
          <p>
            <strong>Recorrido real del submarino:</strong> nunca se publicó. Sólo se dibuja un trazado esquemático entre lugares documentados.{' '}
            <strong>Posición a las 07:19:</strong> no se publicó, y desde entonces el submarino se ve como un fantasma sin posición.{' '}
            <strong>Descenso del submarino:</strong> no se sabe cuándo ni cómo bajó de los 18 m. El descenso que se ve es una
            <em> reconstrucción ilustrativa</em> y se muestra sobre la coordenada del hallazgo —único lugar con profundidad verificada—;
            la película lo rotula así. <strong>Profundidad del colapso:</strong> no se publicó: el indicador pasa a «—» y el manómetro
            muestra la banda de lo posible (11 a 91 atm) en lugar de un número.{' '}
            <strong>Zonas de búsqueda de 2017:</strong> no hay polígonos oficiales. <strong>Elipses de error del CTBTO sobre el mapa:</strong> no
            se publicaron su centro ni su orientación. Tampoco se muestran el interior del buque ni causas o responsabilidades, que se debaten
            en juicio.
          </p>
        </div>
        <div>
          <h3>Evidencia documental y lo que no se usa</h3>
          <p>
            <strong>Retratos:</strong> son los del memorial oficial «44 Presentes», recuperados del archivo web y cotejados uno por uno con el
            Decreto 212/2020.<SourceRefs ids={['memorial44', 'decreto212']} /> <strong>Foto de 2017:</strong> licencia CC BY-SA
            2.0.<SourceRefs ids={['commonsSanJuan2017']} /> <strong>SITREP de las 06:00:</strong> texto literal del requerimiento fiscal. Fue un
            mensaje escrito y no se conoce una grabación.<SourceRefs ids={['infobae2026requerimiento']} />{' '}
            <strong>No se usa la grabación del comandante de abril de 2017:</strong> es de otro hecho y su reproducción en el juicio fue objetada
            por la fiscalía y las querellas.<SourceRefs ids={['infobae2026audio']} />{' '}
            <strong>No se muestran imágenes de los restos:</strong> por pedido de las familias.<SourceRefs ids={['armadaMicrositio2018']} />
          </p>
        </div>
        <div>
          <h3>Exploración: datos de cada módulo</h3>
          <p>
            <strong>Las 44 vidas:</strong> lugar y fecha de nacimiento y biografía del memorial oficial; edad calculada al 15/11/2017;
            coordenadas del nomenclador oficial (Georef); límites provinciales del IGN. Siete de los 33 lugares (9 personas) no son exactos y se marcan
            (ambiguas, aproximada o departamental).<SourceRefs ids={['memorial44', 'georef', 'ignProvincias']} />{' '}
            <strong>La última travesía:</strong> acontecimientos con fuente; entre lugares documentados la posición es esquemática y
            desde las 00:28, no determinada. <strong>La búsqueda:</strong> sólo hay posiciones del buque de 2018; las métricas son
            agregadas y llevan su definición. <strong>907 metros:</strong> comparaciones con alturas oficiales; zonas de luz según
            NOAA; temperatura no disponible para el sitio y la fecha.<SourceRefs ids={['noaaLuz']} />
          </p>
        </div>
        <div>
          <h3>Transformaciones y cálculos</h3>
          <p>
            Coordenadas en grados y minutos (o segundos) pasadas a decimales · distancias ortodrómicas (haversine, R = 6371 km) · distancia a
            la costa sobre la costa 1:50m de Natural Earth · presión = 1 atm + ρ·g·h (ρ = 1027 kg/m³, es un cálculo y no una medición) ·
            Obeliscos apilados = profundidad ÷ 67,5 m · isóbatas por marching squares sobre GEBCO 2020 · posiciones del buque de búsqueda
            extraídas de los partes y verificadas a mano · horas en UTC−3.
          </p>
          <p>
            Los bloques «Lo que muestran los datos» de cada módulo son <strong>cálculos propios</strong> hechos en el momento sobre esos mismos
            datos: cocientes (907 m ÷ el límite de 100 m, ÷ la eslora, ÷ 67,5 m), diferencias horarias, conteos (cuántos acontecimientos tienen
            lugar publicado, cuántas posiciones del buque hay y de qué día es la primera) y la comparación entre la distancia al hallazgo y el
            alcance a 5 nudos, que es una cota geométrica y no una trayectoria. <code>npm run verify</code> vuelve a calcular cada uno de esos
            números y falla si alguno deja de coincidir.
          </p>
        </div>
        <div>
          <h3>Escalas</h3>
          <p>
            <strong>Mapa:</strong> Mercator, 1 unidad = 1 km, relieve exagerado ×25 bajo el mar y ×8 en tierra (se indica en pantalla). En el mapa, el submarino es un
            símbolo y no está a escala. <strong>Al acercarse al sitio del hallazgo,</strong> el relieve se desexagera de forma continua hasta la
            escala real 1:1 (se indica en pantalla). <strong>Profundidad:</strong> escala real 1:1 en las tres dimensiones.{' '}
            <strong>Submarino:</strong> un único modelo esquemático; sólo la eslora (65,93 m) y el ancho del casco resistente (7 m) son datos.
            Se agranda como símbolo cuando la cámara está lejos y llega a 1:1 de cerca.{' '}
            <strong>Referencias de altura:</strong> Obelisco 67,5 m, Torre Eiffel 330 m y Burj Khalifa 828 m, con la altura oficial y forma
            esquemática, apoyados a 907 m.<SourceRefs ids={['obeliscoGCBA', 'eiffelParis', 'ctbuhBurj']} /> En la exploración, como la cámara es
            libre, la escala y el norte se declaran siempre en pantalla: la barra mide una distancia real en el plano del punto de mira y la rosa
            se calcula desde la orientación de la cámara (se atenúa cuando el norte queda casi perpendicular a la pantalla).
          </p>
        </div>
        <div>
          <h3>Clima visual y sonoro (presión y profundidad)</h3>
          <p>
            <strong>Datos:</strong> las profundidades 18 m (07:19), 40 m (intención declarada), 100 m (límite preventivo) y 907 m
            (hallazgo), la fórmula de presión y la zona de luz de NOAA (0–200 m eufótica, 200–1.000 m disfótica).{' '}
            <strong>Diseño:</strong> todo el mapeo de esos números a color del agua, niebla, viñeta, ruido de película, temblor de cámara,
            nieve marina, latido y crujidos. Esa «tensión» arranca en el límite de 100 m y crece hasta el colapso: es una variable de puesta en
            escena, no una medición ni un dato sobre el estado del casco.<SourceRefs ids={['noaaLuz', 'infobae2026requerimiento']} />
          </p>
        </div>
        <div>
          <h3>Sonido</h3>
          <p>
            Todo el sonido está <strong>sintetizado en el navegador</strong> (Web Audio API): mar, temporal, casco, hélice, retumbo profundo,
            sonar, crujidos, burbujas, latido, radio, el estruendo del colapso y las 44 campanillas del memorial. No hay narración por voz ni
            grabaciones del submarino, del mar o del evento del 15/11/2017. Es diseño sonoro, no dato. El estruendo del colapso es una
            representación conceptual y está limitado en volumen; el control de sonido del usuario manda siempre.
          </p>
        </div>
        <div>
          <h3>Tour de 1 minuto</h3>
          <p>
            Recorrido automático de 60 s por la película y por los cuatro módulos de Explorar. No agrega datos ni afirmaciones: sus
            subtítulos describen lo que se ve y conservan los rótulos (reconstrucción, representación conceptual, profundidad del
            colapso no publicada). El cursor es una guía visual: los cambios que se ven son los mismos que haría una persona.
          </p>
        </div>
        <div>
          <h3>Pendiente</h3>
          <p>
            OCR del informe de la Comisión Bicameral (los PDF son escaneos) · requerimiento fiscal completo · coordenada oficial del hallazgo
            · partes de la Armada que no están archivados · coordenadas de las estaciones HA04 y HA10.
          </p>
        </div>
      </div>

      <h3 className="annex-h">Diferencias entre fuentes</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Dato</th><th>Valores según fuente</th><th>Decisión</th></tr>
          </thead>
          <tbody>
            {discrepancies.map((d) => (
              <tr key={d.dato}>
                <td><strong>{d.dato}</strong></td>
                <td>
                  {d.valores.map((v) => (
                    <div key={v.valor}>
                      {v.valor} <a className="srcref" href={`#fuente-${v.sourceId}`}>[{sourceShort(v.sourceId)}]</a>
                    </div>
                  ))}
                </td>
                <td>{d.decision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="annex-h">Fuentes</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Fuente</th><th>Tipo · fecha</th><th>Aporta</th><th>Limitaciones</th></tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} id={`fuente-${s.id}`}>
                <td>
                  <strong>{s.institucion}</strong>
                  <div><a href={s.url} target="_blank" rel="noreferrer">{s.titulo}</a></div>
                  {s.archivo && <div><a href={s.archivo} target="_blank" rel="noreferrer" className="muted">copia archivada</a></div>}
                </td>
                <td className="mono small">{TIPO[s.tipo]}<br />{s.fecha}</td>
                <td>{s.aporta}</td>
                <td>{s.limitaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">Fechas de consulta: 14/09/2026 (fuentes del MVP) y 05/10/2026 (retratos, alturas, coordenadas de referencia, Vergoz 2021 y audio).</p>
    </section>
  );
}
