import type { CrewMember } from './types';

/**
 * Los 44 tripulantes.
 *
 * - Nombre y grado: Decreto 212/2020 (Boletín Oficial, 03/03/2020). Fuente oficial.
 * - Edad, localidad, función: Infobae, 30/11/2017 (fuente periodística). Cuando la nota
 *   no lo consigna, el campo queda vacío. No se completan datos por otras vías.
 * - Art. 2 del decreto asciende con fecha 02/01/2018: el grado consignado allí puede
 *   no ser el que tenían el 15/11/2017. Se registra el grado de prensa 2017 si difiere.
 * - provinciaInferida: la nota nombra la localidad pero no la provincia, y la
 *   localidad es inequívoca.
 */
const DEC = 'decreto212';
const INF = 'infobae2017tripulantes';

export const crew: CrewMember[] = [
  { orden: 1, nombreCompleto: 'Pedro Martín Fernández', gradoDecreto: 'Capitán de Fragata', articuloDecreto: 1, edad: 45, localidad: 'Tucumán', provincia: 'Tucumán', funcion: 'Comandante', fuentesPerfil: [DEC, INF] },
  { orden: 2, nombreCompleto: 'Jorge Ignacio Bergallo', gradoDecreto: 'Capitán de Corbeta', articuloDecreto: 1, edad: 42, funcion: 'Segundo comandante', fuentesPerfil: [DEC, INF, 'infobae2026requerimiento'] },
  { orden: 3, nombreCompleto: 'Fernando Ariel Mendoza', gradoDecreto: 'Teniente de Navío', articuloDecreto: 1, edad: 38, localidad: 'Concordia', provincia: 'Entre Ríos', funcion: 'Tercero en el orden de mando', fuentesPerfil: [DEC, INF] },
  { orden: 4, nombreCompleto: 'Diego Manuel Wagner', gradoDecreto: 'Teniente de Navío', articuloDecreto: 1, edad: 38, localidad: 'Olavarría', provincia: 'Buenos Aires', provinciaInferida: true, fuentesPerfil: [DEC, INF] },
  { orden: 5, nombreCompleto: 'Víctor Andrés Maroli', gradoDecreto: 'Teniente de Navío', articuloDecreto: 1, edad: 37, localidad: 'Villa María', provincia: 'Córdoba', fuentesPerfil: [DEC, INF] },
  { orden: 6, nombreCompleto: 'Eliana María Krawczyk', gradoDecreto: 'Teniente de Navío', articuloDecreto: 1, edad: 34, localidad: 'Oberá', provincia: 'Misiones', funcion: 'Jefe de armas', fuentesPerfil: [DEC, INF] },
  { orden: 7, nombreCompleto: 'Alejandro Damián Tagliapietra', gradoDecreto: 'Teniente de Corbeta', articuloDecreto: 1, edad: 27, localidad: 'Beccar', provincia: 'Buenos Aires', provinciaInferida: true, funcion: 'Especializado en armas submarinas', fuentesPerfil: [DEC, INF] },
  { orden: 8, nombreCompleto: 'Javier Alejandro Gallardo', gradoDecreto: 'Suboficial Principal', articuloDecreto: 1, edad: 47, fuentesPerfil: [DEC, INF] },
  { orden: 9, nombreCompleto: 'Víctor Hugo Coronel', gradoDecreto: 'Suboficial Primero', articuloDecreto: 1, localidad: 'Libertador', provincia: 'Jujuy', funcion: 'Enfermero', fuentesPerfil: [DEC, INF] },
  { orden: 10, nombreCompleto: 'Walter Germán Real', gradoDecreto: 'Suboficial Primero', articuloDecreto: 1, fuentesPerfil: [DEC] },
  { orden: 11, nombreCompleto: 'Hernán Ramón Rodríguez', gradoDecreto: 'Suboficial Primero', articuloDecreto: 1, localidad: 'General Alvear', provincia: 'Mendoza', provinciaInferida: true, funcion: 'Jefe de máquinas', fuentesPerfil: [DEC, INF] },
  { orden: 12, nombreCompleto: 'Roberto Daniel Medina', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 1, edad: 40, localidad: 'Atocha', provincia: 'Salta', fuentesPerfil: [DEC, INF] },
  { orden: 13, nombreCompleto: 'Celso Oscar Vallejos', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 1, fuentesPerfil: [DEC, INF] },
  { orden: 14, nombreCompleto: 'Hugo Arnaldo Herrera', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 1, edad: 39, localidad: 'Palpalá', provincia: 'Jujuy', funcion: 'Control de tiro', fuentesPerfil: [DEC, INF] },
  { orden: 15, nombreCompleto: 'Víctor Marcelo Enríquez', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 1, edad: 37, localidad: 'Las Margaritas', provincia: 'Salta', fuentesPerfil: [DEC, INF] },
  { orden: 16, nombreCompleto: 'Ricardo Gabriel Alfaro Rodríguez', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 1, edad: 37, provincia: 'San Juan', funcion: 'A cargo de la cocina', fuentesPerfil: [DEC, INF] },
  { orden: 17, nombreCompleto: 'Daniel Adrián Fernández', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 1, localidad: 'Punta Alta', provincia: 'Buenos Aires', provinciaInferida: true, fuentesPerfil: [DEC, INF] },
  { orden: 18, nombreCompleto: 'Fernando Gabriel Santilli', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, edad: 35, provincia: 'Mendoza', fuentesPerfil: [DEC, INF] },
  { orden: 19, nombreCompleto: 'Jorge Eduardo Valdez', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, edad: 33, localidad: 'Hipólito Yrigoyen', provincia: 'Salta', fuentesPerfil: [DEC, INF] },
  { orden: 20, nombreCompleto: 'Sergio Antonio Cuellar', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, localidad: 'Salvador Mazza', provincia: 'Salta', fuentesPerfil: [DEC, INF] },
  { orden: 21, nombreCompleto: 'Alberto Ramiro Arjona', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, edad: 32, localidad: 'Campo Quijano', provincia: 'Salta', fuentesPerfil: [DEC, INF] },
  { orden: 22, nombreCompleto: 'Cristian David Ibáñez', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, funcion: 'Radarista', fuentesPerfil: [DEC, INF] },
  { orden: 23, nombreCompleto: 'Mario Armando Toconas', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, edad: 36, localidad: 'Sierra Grande', provincia: 'Río Negro', fuentesPerfil: [DEC, INF] },
  { orden: 24, nombreCompleto: 'Franco Javier Espinoza', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, edad: 33, provincia: 'Jujuy', fuentesPerfil: [DEC, INF] },
  { orden: 25, nombreCompleto: 'Jorge Isabelino Ortiz', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, localidad: 'Posadas', provincia: 'Misiones', provinciaInferida: true, funcion: 'Sector eléctrico y motores', fuentesPerfil: [DEC, INF] },
  { orden: 26, nombreCompleto: 'Enrique Damián Castillo', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, localidad: 'Mar del Plata', provincia: 'Buenos Aires', provinciaInferida: true, fuentesPerfil: [DEC, INF] },
  { orden: 27, nombreCompleto: 'Hugo Dante Cesar Aramayo', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, edad: 33, localidad: 'Palpalá', provincia: 'Jujuy', fuentesPerfil: [DEC, INF] },
  { orden: 28, nombreCompleto: 'Luis Esteban García', gradoDecreto: 'Cabo Principal', articuloDecreto: 1, provincia: 'Tucumán', fuentesPerfil: [DEC, INF] },
  { orden: 29, nombreCompleto: 'Germán Oscar Suárez', gradoDecreto: 'Cabo Primero', articuloDecreto: 1, provincia: 'Santa Fe', fuentesPerfil: [DEC, INF], },
  { orden: 30, nombreCompleto: 'Daniel Alejandro Polo', gradoDecreto: 'Cabo Primero', articuloDecreto: 1, localidad: 'San Pedro de Jujuy', provincia: 'Jujuy', fuentesPerfil: [DEC, INF] },
  { orden: 31, nombreCompleto: 'Luis Alberto Niz', gradoDecreto: 'Cabo Primero', articuloDecreto: 1, localidad: 'Capilla del Señor', provincia: 'Buenos Aires', fuentesPerfil: [DEC, INF] },
  { orden: 32, nombreCompleto: 'Leandro Fabián Cisneros', gradoDecreto: 'Cabo Primero', articuloDecreto: 1, edad: 28, localidad: 'Coronel Arias', provincia: 'Jujuy', fuentesPerfil: [DEC, INF] },
  { orden: 33, nombreCompleto: 'Fabricio Alejandro Alcaraz Coria', gradoDecreto: 'Cabo Primero', articuloDecreto: 1, edad: 27, localidad: 'El Volcán', provincia: 'San Luis', funcion: 'Maquinista', fuentesPerfil: [DEC, INF] },
  { orden: 34, nombreCompleto: 'Fernando Vicente Villarreal', gradoDecreto: 'Capitán de Corbeta', articuloDecreto: 2, gradoPrensa2017: 'Teniente de Navío', edad: 38, localidad: 'Punta Alta', provincia: 'Buenos Aires', provinciaInferida: true, funcion: 'Jefe de Operaciones', fuentesPerfil: [DEC, INF, 'infobae2026requerimiento'] },
  { orden: 35, nombreCompleto: 'Adrián Zunda Meoqui', gradoDecreto: 'Teniente de Navío', articuloDecreto: 2, gradoPrensa2017: 'Teniente de Fragata', edad: 32, fuentesPerfil: [DEC, INF] },
  { orden: 36, nombreCompleto: 'Renzo David Martin Silva', gradoDecreto: 'Teniente de Navío', articuloDecreto: 2, gradoPrensa2017: 'Teniente de Fragata', edad: 32, provincia: 'San Juan', fuentesPerfil: [DEC, INF] },
  { orden: 37, nombreCompleto: 'Jorge Luis Mealla', gradoDecreto: 'Teniente de Fragata', articuloDecreto: 2, gradoPrensa2017: 'Teniente de Corbeta', fuentesPerfil: [DEC, INF] },
  { orden: 38, nombreCompleto: 'Alberto Cipriano Sánchez', gradoDecreto: 'Suboficial Principal', articuloDecreto: 2, gradoPrensa2017: 'Suboficial Primero', edad: 46, fuentesPerfil: [DEC, INF] },
  { orden: 39, nombreCompleto: 'Cayetano Hipólito Vargas', gradoDecreto: 'Suboficial Primero', articuloDecreto: 2, gradoPrensa2017: 'Suboficial Segundo', edad: 45, localidad: 'Angaco', provincia: 'San Juan', fuentesPerfil: [DEC, INF] },
  { orden: 40, nombreCompleto: 'Luis Marcelo Leiva', gradoDecreto: 'Suboficial Primero', articuloDecreto: 2, gradoPrensa2017: 'Suboficial Segundo', provincia: 'Buenos Aires', fuentesPerfil: [DEC, INF] },
  { orden: 41, nombreCompleto: 'Jorge Ariel Monzón', gradoDecreto: 'Suboficial Segundo', articuloDecreto: 2, gradoPrensa2017: 'Cabo Principal', localidad: 'Caseros', provincia: 'Buenos Aires', provinciaInferida: true, fuentesPerfil: [DEC, INF] },
  { orden: 42, nombreCompleto: 'Luis Carlos Nolasco', gradoDecreto: 'Cabo Principal', articuloDecreto: 2, provincia: 'Salta', fuentesPerfil: [DEC, INF] },
  { orden: 43, nombreCompleto: 'David Adolfo Melián', gradoDecreto: 'Cabo Principal', articuloDecreto: 2, edad: 30, localidad: 'El Bobadal', provincia: 'Santiago del Estero', fuentesPerfil: [DEC, INF] },
  { orden: 44, nombreCompleto: 'Aníbal Tolaba', gradoDecreto: 'Cabo Primero', articuloDecreto: 2, gradoPrensa2017: 'Cabo Segundo', localidad: 'El Chingo', provincia: 'Jujuy', fuentesPerfil: [DEC, INF] },
];

/** Jerarquía para ordenar/agrupar (oficiales → suboficiales), según escalafón de la Armada. */
export const RANK_ORDER = [
  'Capitán de Fragata',
  'Capitán de Corbeta',
  'Teniente de Navío',
  'Teniente de Fragata',
  'Teniente de Corbeta',
  'Suboficial Principal',
  'Suboficial Primero',
  'Suboficial Segundo',
  'Cabo Principal',
  'Cabo Primero',
] as const;

export const OFFICER_RANKS = new Set(RANK_ORDER.slice(0, 5));
