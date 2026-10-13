// Datos ficticios de Voltia. Fuente: sección 4 del documento maestro.
// Lo que no está en la sección 4 (jefes de tienda, vendedores de relleno, períodos distintos de enero)
// se genera de forma determinista y sin contradecir los casos clave. Ver docs/decisiones.md (D-11 y D-12).

export const PERSONAS = {
  analista: { id: 'U-01', nombre: 'Valeria Soto', cargo: 'Analista de Compensaciones' },
  jefe: { id: 'U-02', nombre: 'Camila Barrios', cargo: 'Jefe de tienda', tienda: 'T03' },
  gerente: { id: 'U-03', nombre: 'Rodrigo Palacios', cargo: 'Gerente Comercial' },
  contabilidad: { id: 'U-04', nombre: 'Héctor Lima', cargo: 'Contabilidad' },
  auditoria: { id: 'U-05', nombre: 'Beatriz Cano', cargo: 'Auditoría' },
};

export const JEFES_TIENDA = { T01: 'Iván Calderón', T02: 'Mónica Aguilar', T03: 'Camila Barrios', T04: 'Esteban Funes' };

// Sección 4.1. `vendido` es la venta comisionable de enero y se usa para comprobar que el motor cuadra.
export const TIENDAS = [
  { id: 'T01', nombre: 'Plaza Norte', meta: 1600000, vendido: 1712000 },
  { id: 'T02', nombre: 'Paseo Central', meta: 1450000, vendido: 1318000 },
  { id: 'T03', nombre: 'Galerías del Sur', meta: 1800000, vendido: 1890000 },
  { id: 'T04', nombre: 'Centro Comercial Oriente', meta: 1200000, vendido: 1236000 },
].map((t) => ({ ...t, jefe: JEFES_TIENDA[t.id] }));

// Reparto de la venta por categoría: [línea blanca, electrónica, accesorios, garantía extendida]
export const PERFILES = [
  [0.52, 0.32, 0.11, 0.05],
  [0.6, 0.24, 0.12, 0.04],
  [0.38, 0.46, 0.12, 0.04],
  [0.47, 0.37, 0.1, 0.06],
  [60 / 260, 180 / 260, 20 / 260, 0], // Luis Ortega (sección 4.4)
];

// [id, nombre, tienda, meta de enero, venta comisionable de enero, perfil, fecha de ingreso]
const FILAS = [
  ['E-1001', 'Luis Ortega', 'T01', 200000, 260000, 4, '2020-05-11'],
  ['E-1002', 'Paola Quiñónez', 'T01', 130000, 153400, 0, '2022-01-22'],
  ['E-1003', 'Iván Maldonado', 'T01', 150000, 166500, 1, '2019-08-21'],
  ['E-1004', 'Emilio Rosales', 'T01', 140000, 151200, 2, '2021-07-18'],
  ['E-1005', 'Daniela Lemus', 'T01', 135000, 140400, 3, '2025-02-23'],
  ['E-1006', 'Isabel Coronado', 'T01', 145000, 146400, 0, '2021-06-25'],
  ['E-1007', 'Esteban Cabrera', 'T01', 140000, 135800, 1, '2020-09-10'],
  ['E-1008', 'Lucía Estrada', 'T01', 135000, 125600, 2, '2019-02-19'],
  ['E-1009', 'Wendy Zepeda', 'T01', 150000, 132000, 3, '2025-02-13'],
  ['E-1010', 'Hugo Samayoa', 'T01', 145000, 120400, 0, '2019-05-13'],
  ['E-1011', 'Pedro Morán', 'T01', 130000, 122300, 1, '2019-01-28'],
  ['E-1101', 'Ana Morales', 'T02', 120000, 111200, 0, '2022-02-14'],
  ['E-1102', 'Jorge Castillo', 'T02', 130000, 124000, 2, '2021-09-06'],
  ['E-1103', 'Pablo Nájera', 'T02', 125000, 117500, 3, '2023-04-17'],
  ['E-1104', 'Samuel Ávila', 'T02', 115000, 128800, 0, '2024-01-07'],
  ['E-1105', 'Víctor Alvarado', 'T02', 120000, 105600, 1, '2020-01-16'],
  ['E-1106', 'Alejandro Tello', 'T02', 125000, 105000, 2, '2022-12-13'],
  ['E-1107', 'Roberto Mejía', 'T02', 110000, 115500, 3, '2022-02-19'],
  ['E-1108', 'Rebeca Cordón', 'T02', 130000, 102700, 0, '2024-04-25'],
  ['E-1109', 'Marco Tejeda', 'T02', 115000, 104600, 1, '2024-05-11'],
  ['E-1110', 'Lorena Guerra', 'T02', 120000, 116400, 2, '2019-05-11'],
  ['E-1111', 'Karla Monzón', 'T02', 120000, 103200, 3, '2019-07-25'],
  ['E-1112', 'Carmen Solís', 'T02', 120000, 83500, 0, '2019-03-08'],
  ['E-1201', 'Marta Ruiz', 'T03', 150000, 157500, 0, '2021-06-21'],
  ['E-1202', 'Fernando Girón', 'T03', 150000, 189000, 1, '2024-02-01'],
  ['E-1203', 'Elena Fuentes', 'T03', 150000, 181500, 2, '2019-08-26'],
  ['E-1204', 'Patricia Lara', 'T03', 160000, 185600, 3, '2022-03-22'],
  ['E-1205', 'Mónica Arévalo', 'T03', 140000, 156800, 0, '2023-04-15'],
  ['E-1206', 'Adrián Salguero', 'T03', 150000, 162000, 1, '2023-04-24'],
  ['E-1207', 'Mariana Ochoa', 'T03', 155000, 162800, 2, '2025-03-14'],
  ['E-1208', 'José Barrientos', 'T03', 145000, 146400, 3, '2024-07-04'],
  ['E-1209', 'Verónica Luna', 'T03', 150000, 147000, 0, '2022-07-07'],
  ['E-1210', 'Natalia Recinos', 'T03', 150000, 141000, 1, '2019-05-28'],
  ['E-1211', 'Gustavo Paz', 'T03', 145000, 107300, 2, '2025-10-10'],
  ['E-1212', 'Óscar Valdez', 'T03', 155000, 153100, 3, '2019-04-06'],
  ['E-1301', 'Sofía Ramírez', 'T04', null, 62000, 2, '2026-01-05'],
  ['E-1302', 'Diego Herrera', 'T04', 130000, 129000, 1, '2023-03-13'],
  ['E-1303', 'Andrea Cifuentes', 'T04', 100000, 126000, 0, '2022-10-21'],
  ['E-1304', 'Manuel Orellana', 'T04', 110000, 130900, 1, '2023-02-02'],
  ['E-1305', 'Julio Barrera', 'T04', 105000, 117600, 2, '2020-04-15'],
  ['E-1306', 'Rocío Dávila', 'T04', 110000, 118800, 3, '2021-01-25'],
  ['E-1307', 'Gabriela Archila', 'T04', 115000, 118400, 0, '2023-06-27'],
  ['E-1308', 'Fabiola Ponce', 'T04', 100000, 99000, 1, '2021-07-03'],
  ['E-1309', 'Rosa Chinchilla', 'T04', 105000, 99800, 2, '2019-02-07'],
  ['E-1310', 'Cristian Rivas', 'T04', 110000, 99000, 3, '2023-11-08'],
  ['E-1311', 'Ricardo Santizo', 'T04', 110000, 93500, 0, '2019-10-12'],
  ['E-1312', 'Silvia Pineda', 'T04', 105000, 100000, 1, '2021-10-15'],
];

export const VENDEDORES = FILAS.map(([id, nombre, tienda, metaEne, vendidoEne, perfil, ingreso], indice) => ({
  id, nombre, tienda, metaEne, vendidoEne, perfil, ingreso, indice, estado: 'activo',
}));

export const VENDEDOR = Object.fromEntries(VENDEDORES.map((v) => [v.id, v]));
export const TIENDA = Object.fromEntries(TIENDAS.map((t) => [t.id, t]));

export const ID = {
  marta: 'E-1201', luis: 'E-1001', ana: 'E-1101', jorge: 'E-1102', pablo: 'E-1103', sofia: 'E-1301', diego: 'E-1302',
};

// ---------------------------------------------------------------------------
// Períodos. Enero es la base calibrada con la sección 4; el resto se deriva con estos factores.
// ---------------------------------------------------------------------------

export const PERIODOS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04'];

export const FACTOR_VENTA = {
  '2025-12': { T01: 1.08, T02: 1.1, T03: 1.12, T04: 1.09 },
  '2026-01': { T01: 1, T02: 1, T03: 1, T04: 1 },
  '2026-02': { T01: 0.93, T02: 0.9, T03: 0.94, T04: 0.92 },
  '2026-03': { T01: 0.99, T02: 0.96, T03: 0.93, T04: 1.01 },
  '2026-04': { T01: 1, T02: 1, T03: 1, T04: 1 },
};

export const FACTOR_META = { '2025-12': 1.05, '2026-01': 1, '2026-02': 0.95, '2026-03': 1, '2026-04': 1 };

// Excepciones puntuales de meta por período (el resto se deriva de la meta de enero).
export const METAS_ESPECIALES = {
  [`${ID.marta}|2026-03`]: 100000,
  [`${ID.sofia}|2026-02`]: 70000,
  [`${ID.sofia}|2026-03`]: 75000,
};

/** Venta del período anterior a enero que Diego Herrera registró en T01 (caso borde, D-12). */
export const DIEGO = { cambioDeTienda: '2026-01-15', ventaEnT01: 58000, ventaEnT04: 71000 };
