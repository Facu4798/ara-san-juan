import { sources, sourceShort } from '../data/sources';
import { discrepancies } from '../data/discrepancies';
import { CertaintyBadge } from './Certainty';

const TIPO: Record<string, string> = {
  oficial: 'Oficial',
  'judicial-via-prensa': 'Judicial (vía prensa)',
  cientifica: 'Científica',
  empresa: 'Empresa',
  periodistica: 'Periodística',
  dataset: 'Dataset',
};

export function Methodology() {
  return (
    <section id="metodologia" className="section" aria-labelledby="metodologia-title">
      <div className="eyebrow">09 · Datos y metodología</div>
      <h2 id="metodologia-title">Qué sabemos, cómo lo sabemos y qué no</h2>

      <div className="method-grid">
        <div>
          <CertaintyBadge c="hecho" />
          <h3>Hecho documentado</h3>
          <p>Consta en un documento oficial, judicial, científico o de la empresa contratada. Se dibuja con marca sólida.</p>
        </div>
        <div>
          <CertaintyBadge c="estimacion" />
          <h3>Estimación</h3>
          <p>Valor calculado por una institución con método conocido (triangulación acústica, aviso preliminar). Marca hueca y difusa.</p>
        </div>
        <div>
          <CertaintyBadge c="hipotesis" />
          <h3>Hipótesis</h3>
          <p>Construcción didáctica propia, con supuestos explícitos. Rayado ámbar. La única del proyecto: el área alcanzable a 5 nudos entre 00:28 y 10:51.</p>
        </div>
      </div>

      <div className="method-grid">
        <div>
          <h3>Qué NO se muestra</h3>
          <p>
            Recorrido del submarino (no publicado) · posición a las 07:19 (no publicada) · reconstrucción del hundimiento · interior del
            buque · causas o responsabilidades · zonas de búsqueda de 2017 (sin polígonos oficiales) · recorridos de buques o aviones ·
            elipses de error del CTBTO sobre el mapa (sin centro ni orientación publicados) · fotografías.
          </p>
        </div>
        <div>
          <h3>Transformaciones</h3>
          <p>
            Coordenadas en grados-minutos(-segundos) a decimales · distancias ortodrómicas (haversine, R = 6371 km) · presión
            = 1 atm + ρ·g·h (ρ = 1027 kg/m³; cálculo, no medición) · isóbatas por marching squares (d3-contour) sobre GEBCO
            2020 · posiciones del buque extraídas por expresiones regulares de los partes y verificadas a mano · horas en UTC−3.
          </p>
        </div>
        <div>
          <h3>Escalas</h3>
          <p>
            Mapa: proyección Mercator. Descenso 3D: 1 unidad = 1 metro, escala vertical real por defecto; la opción ×4 exagera sólo el
            relieve y se indica en pantalla. Línea de tiempo del explorador: escala por tramos, señalada.
          </p>
        </div>
        <div>
          <h3>Sonido</h3>
          <p>
            Todo el audio está <strong>sintetizado en el navegador</strong> (Web Audio API): no hay grabaciones del submarino,
            del mar ni del evento del 15/11/2017. El zumbido sigue la profundidad, la alarma marca el límite preventivo de
            100 m y los crujidos son una convención. La narración usa la voz del navegador y tiene subtítulos.
          </p>
        </div>
        <div>
          <h3>Pendiente</h3>
          <p>
            OCR del informe de la Comisión Bicameral (PDF escaneados) · requerimiento fiscal completo · coordenada oficial del hallazgo ·
            partes de la Armada no archivados · perfil de temperatura (World Ocean Atlas) · coordenadas de las estaciones HA04 y HA10.
          </p>
        </div>
      </div>

      <h3 style={{ marginTop: 56, fontWeight: 500 }}>Diferencias entre fuentes</h3>
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

      <h3 style={{ marginTop: 56, fontWeight: 500 }}>Fuentes</h3>
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
                <td className="mono" style={{ fontSize: 12 }}>{TIPO[s.tipo]}<br />{s.fecha}</td>
                <td>{s.aporta}</td>
                <td>{s.limitaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 16 }}>Fecha de consulta de todas las fuentes: 14/09/2026.</p>
    </section>
  );
}
