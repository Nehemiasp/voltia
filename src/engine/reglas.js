// Catálogo de reglas (sección 3.3), sus versiones y los conjuntos congelados por corrida.
// Una "versión de reglas" (v13, v14…) es un conjunto: una versión de cada regla vigente en un momento dado.

export const CATEGORIAS = ['Línea blanca', 'Electrónica', 'Accesorios', 'Garantía extendida'];

export const ORDEN_APLICACION = ['R-006', 'R-001', 'R-002', 'R-005', 'R-003', 'R-004'];

export const TIPOS_REGLA = ['escalonada', 'multiplicador', 'bono', 'reversión', 'tope', 'exclusión'];

const ESCALONES_V2 = [
  { desde: 0, hasta: 79.99, tasa: 0 },
  { desde: 80, hasta: 99.99, tasa: 3 },
  { desde: 100, hasta: 119.99, tasa: 5 },
  { desde: 120, hasta: null, tasa: 6 },
];

export const ESCALONES_V3 = [
  { desde: 0, hasta: 79.99, tasa: 0 },
  { desde: 80, hasta: 99.99, tasa: 3 },
  { desde: 100, hasta: 119.99, tasa: 5 },
  { desde: 120, hasta: null, tasa: 7 },
];

const FACTORES = { 'Línea blanca': 1.0, 'Electrónica': 1.2, 'Accesorios': 0.6, 'Garantía extendida': 2.0 };

/** Configuración de cálculo que consume el motor. Cada conjunto es inmutable (D-07). */
function configuracion({ escalones, factores = FACTORES, tope = 15000 }) {
  return Object.freeze({
    R006: { maxDescuento: 25 },
    R001: { escalones: escalones.map((e) => ({ ...e })), base: 'venta neta' },
    R002: { factores: { ...factores } },
    R005: { tope },
    R003: { monto: 500, minTienda: 100, minVendedor: 80 },
    R004: { limiteDescuentoPct: 50 },
  });
}

export const CONJUNTOS = {
  v13: {
    id: 'v13',
    vigenteDesde: '2025-07-01',
    vigenteHasta: '2025-12-31',
    versiones: { 'R-001': 2, 'R-002': 2, 'R-003': 1, 'R-004': 1, 'R-005': 2, 'R-006': 1 },
    config: configuracion({ escalones: ESCALONES_V2 }),
  },
  v14: {
    id: 'v14',
    vigenteDesde: '2026-01-01',
    vigenteHasta: null,
    versiones: { 'R-001': 3, 'R-002': 2, 'R-003': 1, 'R-004': 1, 'R-005': 2, 'R-006': 1 },
    config: configuracion({ escalones: ESCALONES_V3 }),
  },
};

/** Conjunto vigente al inicio de un período (AAAA-MM). */
export function conjuntoDelPeriodo(periodoId) {
  const inicio = `${periodoId}-01`;
  const todos = Object.values(CONJUNTOS);
  const vigentes = todos.filter((c) => c.vigenteDesde <= inicio && (!c.vigenteHasta || c.vigenteHasta >= inicio));
  return vigentes[vigentes.length - 1] ?? todos[todos.length - 1];
}

export const CONJUNTO_ACTUAL = 'v14';

// ---------------------------------------------------------------------------
// Catálogo legible: una fila por versión de regla (P01).
// ---------------------------------------------------------------------------

const RESP = 'Valeria Soto';

export const VERSIONES_REGLAS = [
  // R-006
  {
    id: 'R-006', version: 1, nombre: 'Exclusión por descuento', tipo: 'exclusión', prioridad: 0,
    alcance: 'Todos los vendedores', condicion: 'Descuento de la venta mayor a 25 %', base: 'Venta bruta',
    calculo: 'La venta no genera comisión ni suma a la meta. Sigue visible en el detalle con su motivo.',
    acumulable: false, vigenciaDesde: '2025-07-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Política de descuentos PD-2025-03', estado: 'vigente', modificada: '2025-06-24', modificadaPor: RESP,
  },
  // R-001
  {
    id: 'R-001', version: 1, nombre: 'Comisión base escalonada', tipo: 'escalonada', prioridad: 1,
    alcance: 'Todos los vendedores', condicion: 'Cumplimiento de meta del período', base: 'Venta neta',
    calculo: 'Tabla de escalones sobre toda la venta neta comisionable',
    acumulable: true, vigenciaDesde: '2024-03-01', vigenciaHasta: '2024-12-31', responsable: RESP,
    fuente: 'Política de comisiones PC-2024-01', estado: 'vencida', modificada: '2024-02-20', modificadaPor: RESP,
  },
  {
    id: 'R-001', version: 2, nombre: 'Comisión base escalonada', tipo: 'escalonada', prioridad: 1,
    alcance: 'Todos los vendedores', condicion: 'Cumplimiento de meta del período', base: 'Venta neta',
    calculo: 'Tabla de escalones sobre toda la venta neta comisionable. Escalón superior: 6 %.',
    acumulable: true, vigenciaDesde: '2025-01-01', vigenciaHasta: '2025-12-31', responsable: RESP,
    fuente: 'Acta del Comité Comercial CC-2024-12', estado: 'vencida', modificada: '2024-12-18', modificadaPor: RESP,
  },
  {
    id: 'R-001', version: 3, nombre: 'Comisión base escalonada', tipo: 'escalonada', prioridad: 1,
    alcance: 'Todos los vendedores', condicion: 'Cumplimiento de meta del período', base: 'Venta neta',
    calculo: 'Tabla de escalones sobre toda la venta neta comisionable. Escalón superior: 7 %.',
    acumulable: true, vigenciaDesde: '2026-01-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Acta del Comité Comercial CC-2025-12', estado: 'vigente', modificada: '2025-12-16', modificadaPor: RESP,
    escalones: ESCALONES_V3,
  },
  // R-002
  {
    id: 'R-002', version: 1, nombre: 'Multiplicador por categoría', tipo: 'multiplicador', prioridad: 2,
    alcance: 'Todos los vendedores', condicion: 'Categoría del producto vendido', base: 'Comisión calculada por R-001, venta por venta',
    calculo: 'Línea blanca 1.0 · Electrónica 1.2 · Accesorios 0.5 · Garantía extendida 2.0',
    acumulable: true, vigenciaDesde: '2024-03-01', vigenciaHasta: '2025-06-30', responsable: RESP,
    fuente: 'Política de comisiones PC-2024-01', estado: 'vencida', modificada: '2024-02-20', modificadaPor: RESP,
  },
  {
    id: 'R-002', version: 2, nombre: 'Multiplicador por categoría', tipo: 'multiplicador', prioridad: 2,
    alcance: 'Todos los vendedores', condicion: 'Categoría del producto vendido', base: 'Comisión calculada por R-001, venta por venta',
    calculo: 'Línea blanca 1.0 · Electrónica 1.2 · Accesorios 0.6 · Garantía extendida 2.0',
    acumulable: true, vigenciaDesde: '2025-07-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Acta del Comité Comercial CC-2025-06', estado: 'vigente', modificada: '2025-06-23', modificadaPor: RESP,
  },
  {
    id: 'R-002', version: 3, nombre: 'Multiplicador por categoría', tipo: 'multiplicador', prioridad: 2,
    alcance: 'Todos los vendedores', condicion: 'Categoría del producto vendido', base: 'Comisión calculada por R-001, venta por venta',
    calculo: 'Línea blanca 1.0 · Electrónica 1.2 · Accesorios 0.7 · Garantía extendida 2.0',
    acumulable: true, vigenciaDesde: '2026-04-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Solicitud de Gerencia Comercial GC-2026-02', estado: 'borrador', pendienteAprobacion: true,
    modificada: '2026-01-19', modificadaPor: RESP,
  },
  // R-005
  {
    id: 'R-005', version: 1, nombre: 'Tope individual', tipo: 'tope', prioridad: 3,
    alcance: 'Todos los vendedores', condicion: 'Comisión individual del período mayor al tope', base: 'Comisión calculada',
    calculo: 'Tope de Q12,000. Se marca y se escala a Gerencia Comercial.',
    acumulable: true, vigenciaDesde: '2024-03-01', vigenciaHasta: '2025-06-30', responsable: RESP,
    fuente: 'Política de comisiones PC-2024-01', estado: 'vencida', modificada: '2024-02-20', modificadaPor: RESP,
  },
  {
    id: 'R-005', version: 2, nombre: 'Tope individual', tipo: 'tope', prioridad: 3,
    alcance: 'Todos los vendedores', condicion: 'Comisión individual del período mayor al tope', base: 'Comisión calculada',
    calculo: 'Tope de Q15,000 por período. No se bloquea: se marca y se escala a Gerencia Comercial.',
    acumulable: true, vigenciaDesde: '2025-07-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Acta del Comité Comercial CC-2025-06', estado: 'vigente', modificada: '2025-06-23', modificadaPor: RESP,
  },
  // R-003
  {
    id: 'R-003', version: 1, nombre: 'Bono de equipo', tipo: 'bono', prioridad: 4,
    alcance: 'Vendedores de tiendas que alcanzan su meta', condicion: 'Tienda al 100 % o más y vendedor al 80 % o más', base: 'Monto fijo',
    calculo: 'Q500 por vendedor. Se calcula en una segunda pasada, cuando ya se conoce el resultado de la tienda.',
    acumulable: true, vigenciaDesde: '2024-03-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Política de comisiones PC-2024-01', estado: 'vigente', modificada: '2024-02-20', modificadaPor: RESP,
  },
  // R-004
  {
    id: 'R-004', version: 1, nombre: 'Reversión por devolución', tipo: 'reversión', prioridad: 5,
    alcance: 'Ventas devueltas de períodos anteriores', condicion: 'Una venta comisionada pasa a estado devuelta', base: 'Comisión del período original recalculada',
    calculo: 'Se recalcula el período original con las reglas vigentes en ese período. La diferencia se aplica como ajuste en el período abierto más cercano, con un descuento máximo del 50 % de la comisión de ese período.',
    acumulable: true, vigenciaDesde: '2024-03-01', vigenciaHasta: null, responsable: RESP,
    fuente: 'Política de comisiones PC-2024-01', estado: 'vigente', modificada: '2024-02-20', modificadaPor: RESP,
  },
];

export function reglaVigente(id) {
  return VERSIONES_REGLAS.find((r) => r.id === id && r.estado === 'vigente');
}

/** Personas que pueden figurar como responsables de una regla. */
export const RESPONSABLES = ['Valeria Soto', 'Rodrigo Palacios'];

// ---------------------------------------------------------------------------
// Lectura de un escalón en lenguaje natural (frase de lectura en vivo, P02)
// ---------------------------------------------------------------------------

function num(n) {
  return Number.isInteger(n) ? String(n) : String(n);
}

export function fraseBase(base) {
  if (base === 'venta bruta') return 'la venta bruta';
  return 'la venta neta';
}

/** Frase de un escalón. `i` es su posición dentro de `escalones`. */
export function fraseEscalon(escalones, i, base = 'venta neta') {
  const e = escalones[i];
  const sobre = `sobre toda ${fraseBase(base)} del período`;
  const paga = e.tasa === 0 ? 'no paga comisión base' : `paga ${num(e.tasa)} % ${sobre}`;
  const ultimo = i === escalones.length - 1 || e.hasta === null || e.hasta === undefined;
  if (e.desde === 0 && !ultimo) return `Si el cumplimiento es menor a ${num(escalones[i + 1]?.desde ?? e.hasta)} %, ${paga}.`;
  if (ultimo) return `Si el cumplimiento es de ${num(e.desde)} % o más, ${paga}.`;
  return `Si el cumplimiento está entre ${num(e.desde)} % y ${num(e.hasta)} %, ${paga}.`;
}
