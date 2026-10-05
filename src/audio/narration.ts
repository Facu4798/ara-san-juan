/**
 * Guion de narración. Una línea por paso.
 *
 * Reglas: sólo dice lo que está documentado, con las mismas fuentes que el texto
 * en pantalla. Los números se escriben como se pronuncian para que el
 * sintetizador de voz no los lea mal.
 *
 * Para reemplazarlo por una voz propia: grabar un archivo por clave y listarlos
 * en public/audio/manifest.json.
 */
export const narrationScript: Record<string, string> = {
  // ——— Mapa ———
  'map:viaje':
    'El veinticinco de octubre de dos mil diecisiete, el ARA San Juan zarpó de Mar del Plata con cuarenta y cuatro tripulantes. El ocho de noviembre salió de Ushuaia hacia su área de patrulla. El recorrido nunca se publicó.',
  'map:c2342':
    'Once y cuarenta y dos de la noche. El submarino informa un principio de incendio, controlado. Navega en superficie, rumbo cero ocho cero, a cinco nudos.',
  'map:c0028':
    'Cero horas, veintiocho minutos. El buque informa su posición: cuarenta y seis grados cuarenta y cuatro minutos sur, sesenta grados ocho minutos oeste. Es la última coordenada que se conoce.',
  'map:c0600':
    'Seis de la mañana. Entró agua de mar al tanque de baterías número tres. El submarino navega sumergido, con el circuito dividido. Sin novedades de personal.',
  'map:c0719':
    'Siete y diecinueve. Última comunicación. Dieciocho metros de profundidad, rumbo cero quince. Nadie informó dónde estaba.',
  'map:sin-respuesta':
    'Ocho y veintisiete. Nueve y treinta y cinco. Dos órdenes más desde tierra. Nunca hubo respuesta.',
  'map:ctbto':
    'Diez y cincuenta y uno. Dos hidrófonos a miles de kilómetros registran un evento. Después, nada.',
  'map:silencio':
    'Durante trescientos sesenta y siete días no hubo otra coordenada del ARA San Juan.',
  'map:busqueda':
    'Dieciocho países. Más de cuatro mil personas. Veintiocho buques. Nueve aeronaves. Setenta y ocho contactos investigados, y ninguno era el submarino.',
  'map:seco':
    'Septiembre de dos mil dieciocho. Cinco vehículos autónomos recorren el fondo del mar. Cada cuadrado es la posición del buque en un parte oficial.',
  'map:sitio2':
    'Catorce de noviembre. El buque deja la zona y se va al norte, a más de trescientos kilómetros.',
  'map:poi24':
    'Quince de noviembre, diez y cuarto de la noche. Un año exacto después de la desaparición, la empresa informa un nuevo punto de interés: el número veinticuatro.',
  'map:hallazgo':
    'Diecisiete de noviembre de dos mil dieciocho. Después de trescientos sesenta y siete días, apareció una coordenada. Novecientos siete metros de profundidad, a noventa y un kilómetros del último punto informado.',

  // ——— Descenso ———
  'descent:sup': 'El submarino medía sesenta y seis metros de eslora.',
  'descent:d18': 'Dieciocho metros. Plano de periscopio. La última profundidad informada.',
  'descent:d40': 'Cuarenta metros. Plano de seguridad. Hasta ahí pensaba bajar.',
  'descent:d100': 'Cien metros. Límite preventivo de profundidad. No debía pasar de acá.',
  'descent:tramo': 'Trescientos metros. Quinientos. Setecientos. De todo este tramo no existe ningún dato.',
  'descent:d800': 'Ochocientos metros. La primera estimación del punto veinticuatro.',
  'descent:d907': 'Novecientos siete metros. El casco resistente, en una sola pieza.',
  'descent:escala':
    'Novecientos siete metros de profundidad. Noventa y un kilómetros de distancia. Estaba cien veces más lejos que hondo.',

  // ——— Cierre ———
  'crew:intro': 'Cuarenta y tres hombres y una mujer.',
};
