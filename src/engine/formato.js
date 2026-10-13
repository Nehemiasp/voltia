// Formato de montos, porcentajes y fechas. Sin dependencias del navegador.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const NBSP = ' ';
export const MENOS = '−';

/** Quetzales: Q9,050 · −Q3,780 · +Q500 (con signo = true). */
export function fmtQ(n, { signo = false } = {}) {
  const abs = Math.abs(n);
  const entero = Math.abs(abs - Math.round(abs)) < 0.005;
  const cuerpo = 'Q' + (entero ? nf0.format(Math.round(abs)) : nf2.format(abs));
  if (n < 0 && abs >= 0.005) return MENOS + cuerpo;
  if (signo && n > 0) return '+' + cuerpo;
  return cuerpo;
}

/** Porcentaje a partir de un valor en puntos (105 → "105 %"). Una decimal si hace falta. */
export function fmtPct(x, { fijo = false, decimales = 1 } = {}) {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  const f = 10 ** decimales;
  const r = Math.round(x * f) / f;
  const texto = fijo || !Number.isInteger(r) ? r.toFixed(decimales) : String(r);
  return `${texto}${NBSP}%`;
}

export function fmtNum(n) {
  return nf0.format(Math.round(n));
}

// ---------- fechas (ISO AAAA-MM-DD, siempre en UTC para evitar corrimientos) ----------

function partes(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { a, m, d };
}

export function fmtFecha(iso) {
  const { m, d } = partes(iso);
  return `${d} ${MESES_CORTOS[m - 1]}`;
}

export function fmtFechaLarga(iso) {
  const { a, m, d } = partes(iso);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

export function fmtFechaHora(isoConHora) {
  const [f, h = '00:00'] = isoConHora.split('T');
  return `${fmtFecha(f)} ${f.slice(0, 4)}, ${h.slice(0, 5)}`;
}

/** '2026-01' → "enero 2026" */
export function nombrePeriodo(id) {
  const [a, m] = id.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

export function mesDe(id) {
  return MESES[Number(id.split('-')[1]) - 1];
}

export function mesCorto(id) {
  return MESES_CORTOS[Number(id.split('-')[1]) - 1];
}

export function diasDelMes(id) {
  const [a, m] = id.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function periodoSiguiente(id) {
  const [a, m] = id.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

export function periodoAnterior(id) {
  const [a, m] = id.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

export function primerDia(id) {
  return `${id}-01`;
}

export function ultimoDia(id) {
  return `${id}-${String(diasDelMes(id)).padStart(2, '0')}`;
}

export function periodoDeFecha(iso) {
  return iso.slice(0, 7);
}

/** Escapa texto antes de insertarlo en HTML. */
export function esc(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
