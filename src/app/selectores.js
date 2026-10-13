// Lecturas derivadas del estado. Todo lo que se muestra en pantalla sale de aquí o del motor: nada se copia a mano.

import { obtener } from './estado.js';
import { ESCENARIO, FECHA_CORRIDA } from './semillas.js';
import { conjuntoDelPeriodo } from '../engine/reglas.js';
import { calcularPeriodo, aplicarAjuste } from '../engine/calculo.js';
import { VENDEDOR, TIENDA } from '../engine/datos.js';
import { periodoAnterior, fmtQ, nombrePeriodo } from '../engine/formato.js';
import { ventasDe, vendedoresDelPeriodo } from '../engine/ventas.js';

const memoria = new Map();
const LIMITE_AJUSTE_SIN_GERENTE = 1000;
export { LIMITE_AJUSTE_SIN_GERENTE };

export const ESTADOS_PERIODO = ['Abierto', 'Cerrado a ventas', 'Calculado', 'En revisión', 'Aprobado', 'Pagado'];

export const periodoFoco = () => ESCENARIO.periodo;
export const fechaHoy = () => obtener().reloj.slice(0, 10);

export function periodoRegistro(periodo) {
  return obtener().periodos[periodo] ?? null;
}

export function estadoPeriodo(periodo) {
  return periodoRegistro(periodo)?.estado ?? 'Abierto';
}

export const hayResultados = (periodo) => ESTADOS_PERIODO.indexOf(estadoPeriodo(periodo)) >= ESTADOS_PERIODO.indexOf('Calculado');

export function periodosDisponibles() {
  return Object.keys(obtener().periodos).sort();
}

export function periodosConResultados() {
  return periodosDisponibles().filter(hayResultados);
}

export function ultimoPeriodoPagado() {
  const pagados = periodosDisponibles().filter((p) => estadoPeriodo(p) === 'Pagado');
  return pagados[pagados.length - 1] ?? null;
}

export function primerPeriodoAbierto() {
  return periodosDisponibles().find((p) => ['Abierto', 'Cerrado a ventas'].includes(estadoPeriodo(p))) ?? null;
}

// ---------- Cálculo (memoizado) ----------

export const configDe = (periodo) => conjuntoDelPeriodo(periodo).config;

export function corteDe(periodo) {
  return periodoRegistro(periodo)?.corrida?.fecha ?? FECHA_CORRIDA(periodo);
}

/** Metas con las que se congeló la última corrida (o las cargadas hasta hoy si no hay corrida). */
export function metasDeCorrida(periodo) {
  const reg = periodoRegistro(periodo);
  if (reg?.corrida) return reg.corrida.metas ?? {};
  return metasCargadas(periodo);
}

export function metasCargadas(periodo) {
  const salida = {};
  for (const [clave, monto] of Object.entries(obtener().metas)) {
    const [vid, p] = clave.split('|');
    if (p === periodo) salida[vid] = monto;
  }
  return salida;
}

export function metasPendientes(periodo) {
  const congeladas = metasDeCorrida(periodo);
  const actuales = metasCargadas(periodo);
  return Object.keys(actuales).filter((vid) => congeladas[vid] !== actuales[vid]);
}

export function ajustesAplicablesA(periodo) {
  return obtener().ajustes.filter((a) => a.periodoAplicacion === periodo && ['autorizado', 'aplicado'].includes(a.estado));
}

/** Resultados completos de un período con las reglas de ese período y los ajustes autorizados. */
export function calculo(periodo, { sinAjustes = false } = {}) {
  const config = configDe(periodo);
  const corte = corteDe(periodo);
  const metas = metasDeCorrida(periodo);
  const ajustes = sinAjustes ? [] : ajustesAplicablesA(periodo);
  const clave = JSON.stringify([periodo, corte, metas, ajustes.map((a) => [a.id, a.montoSolicitado, a.estado])]);
  if (memoria.has(clave)) return memoria.get(clave);

  const base = calcularPeriodo({ periodo, config, corte, metas });
  const porVendedor = {};
  for (const a of ajustes) (porVendedor[a.vendedorId] ??= []).push(a);

  const aplicaciones = [];
  const ajustesPorVendedor = {};
  for (const [vid, lista] of Object.entries(porVendedor)) {
    const r = base.porVendedor[vid];
    if (!r) continue;
    const deuda = -lista.reduce((s, a) => s + a.montoSolicitado, 0);
    const ap = aplicarAjuste({ deuda, comisionPeriodo: r.comisionBase, config });
    const detalle = { vendedorId: vid, ajustes: lista, ...ap };
    aplicaciones.push(detalle);
    ajustesPorVendedor[vid] = [{ id: lista.map((a) => a.id).join(', '), monto: ap.aplicado, motivo: lista.map((a) => `${a.id}: ${a.motivo}`).join(' · ') }];
  }

  const final = Object.keys(ajustesPorVendedor).length
    ? calcularPeriodo({ periodo, config, corte, metas, ajustes: ajustesPorVendedor })
    : base;
  final.aplicaciones = aplicaciones;
  final.aplicacionDe = Object.fromEntries(aplicaciones.map((a) => [a.vendedorId, a]));
  memoria.set(clave, final);
  if (memoria.size > 40) memoria.delete(memoria.keys().next().value);
  return final;
}

export function resultado(vendedorId, periodo) {
  return calculo(periodo).porVendedor[vendedorId] ?? null;
}

// ---------- Observaciones, decisiones, estados ----------

export function observaciones(periodo, { abiertas = false, vendedorId = null } = {}) {
  return obtener().observaciones.filter(
    (o) => (!periodo || o.periodo === periodo) && (!abiertas || o.estado === 'abierta') && (!vendedorId || o.vendedorId === vendedorId),
  );
}

export function decisionTope(vendedorId, periodo) {
  return obtener().decisiones[`${vendedorId}|${periodo}`] ?? null;
}

export function ajustesDe(vendedorId) {
  return obtener().ajustes.filter((a) => a.vendedorId === vendedorId);
}

export function ajustesPendientesDeAplicarEn(periodo) {
  return obtener().ajustes.filter((a) => a.periodoAplicacion === periodo && ['borrador', 'pendiente', 'devuelto'].includes(a.estado));
}

export function ajusteSobre(vendedorId, periodoOrigen) {
  return obtener().ajustes.filter((a) => a.vendedorId === vendedorId && a.periodoOrigen === periodoOrigen);
}

/** Estado visible de un resultado individual (3.5). */
export function estadoResultado(periodo, r) {
  if (r.bloqueado) return 'bloqueada';
  const estado = estadoPeriodo(periodo);
  const obs = observaciones(periodo, { abiertas: true, vendedorId: r.vendedorId }).length > 0;
  if (estado === 'Pagado') {
    const ajustado = ajusteSobre(r.vendedorId, periodo).some((a) => ['autorizado', 'aplicado'].includes(a.estado));
    return ajustado ? 'ajustada' : 'pagada';
  }
  if (estado === 'Aprobado') return 'aprobada';
  if (estado === 'En revisión') return obs ? 'observada' : 'en-revision';
  return 'calculada';
}

/** Lo que se paga hoy: el tope no bloquea, escala (D-04). Hasta que se decide, solo se compromete hasta el tope. */
export function aPagar(r, periodo) {
  if (!r.tope.excede) return { monto: r.total, retenido: 0, estado: 'normal' };
  const d = decisionTope(r.vendedorId, periodo);
  if (d?.decision === 'autorizar') return { monto: r.total, retenido: 0, estado: 'autorizada' };
  if (d?.decision === 'limitar') return { monto: r.total - r.tope.exceso, retenido: r.tope.exceso, estado: 'limitada' };
  return { monto: r.total - r.tope.exceso, retenido: r.tope.exceso, estado: 'pendiente' };
}

export function totalAPagar(periodo) {
  const calc = calculo(periodo);
  return calc.resultados.reduce((s, r) => s + aPagar(r, periodo).monto, 0);
}

export function pendienteDeAutorizacion(periodo) {
  const calc = calculo(periodo);
  return calc.resultados.reduce((s, r) => s + (aPagar(r, periodo).estado === 'pendiente' ? r.tope.exceso : 0), 0);
}

// ---------- Resumen del período (P04 y P06) ----------

export function resumenPeriodo(periodo) {
  const calc = calculo(periodo);
  const conteo = { calculada: 0, 'en-revision': 0, observada: 0, aprobada: 0, pagada: 0, ajustada: 0, bloqueada: 0 };
  calc.resultados.forEach((r) => { conteo[estadoResultado(periodo, r)] += 1; });

  const previoId = periodoAnterior(periodo);
  const hayPrevio = Boolean(periodoRegistro(previoId)) && hayResultados(previoId);
  const total = Math.round(totalAPagar(periodo) * 100) / 100;
  const totalPrevio = hayPrevio ? Math.round(totalAPagar(previoId) * 100) / 100 : null;

  const alertas = [];
  calc.resultados.filter((r) => r.bloqueado).forEach((r) =>
    alertas.push({ tipo: 'bloqueada', nivel: 'aviso', vendedorId: r.vendedorId, titulo: `${r.nombre}: falta meta`, texto: `${VENDEDOR[r.vendedorId].nombre} tiene ${fmtQ(r.netoComisionable)} vendidos y ninguna meta cargada. No se le asignó 0 %: queda bloqueada hasta que se cargue su meta.` }));
  calc.resultados.filter((r) => r.tope.excede).forEach((r) => {
    const d = decisionTope(r.vendedorId, periodo);
    alertas.push({
      tipo: 'tope', nivel: d ? 'info' : 'aviso', vendedorId: r.vendedorId,
      titulo: `${r.nombre}: supera el tope`,
      texto: d
        ? `Comisión de ${fmtQ(r.comisionBase)} sobre un tope de ${fmtQ(r.tope.limite)}. ${d.decision === 'autorizar' ? 'Autorizada' : 'Limitada al tope'} por ${d.por}.`
        : `Comisión de ${fmtQ(r.comisionBase)}: excede el tope de ${fmtQ(r.tope.limite)} por ${fmtQ(r.tope.exceso)}. Pasa a la bandeja del Gerente Comercial.`,
    });
  });
  observaciones(periodo, { abiertas: true }).forEach((o) =>
    alertas.push({ tipo: 'observacion', nivel: 'aviso', vendedorId: o.vendedorId, titulo: `${VENDEDOR[o.vendedorId].nombre}: observación abierta`, texto: `${o.por}: ${o.motivo}` }));
  ajustesPendientesDeAplicarEn(periodo).forEach((a) =>
    alertas.push({ tipo: 'ajuste', nivel: 'aviso', vendedorId: a.vendedorId, ref: a.id, titulo: `${VENDEDOR[a.vendedorId].nombre}: ajuste pendiente`, texto: `${a.id} por ${fmtQ(a.montoSolicitado)} (origen ${nombrePeriodo(a.periodoOrigen)}) aún no está autorizado.` }));
  const pend = metasPendientes(periodo);
  if (pend.length && hayResultados(periodo) && estadoPeriodo(periodo) !== 'Pagado') {
    alertas.push({ tipo: 'meta-nueva', nivel: 'aviso', titulo: 'Hay metas cargadas después de la corrida', texto: `${pend.map((v) => VENDEDOR[v].nombre).join(', ')}: ejecuta la corrida de nuevo para que entren al cálculo.` });
  }

  const porTienda = calc.tiendas.map((t) => {
    const rs = calc.resultados.filter((r) => r.tienda === t.id);
    return { ...t, vendedores: rs.length, total: rs.reduce((s, r) => s + aPagar(r, periodo).monto, 0) };
  });

  return {
    periodo, calc, total, totalPrevio, diferencia: totalPrevio === null ? null : total - totalPrevio,
    diferenciaPct: totalPrevio ? ((total - totalPrevio) / totalPrevio) * 100 : null,
    pendiente: pendienteDeAutorizacion(periodo), conteo, alertas, porTienda, previoId: hayPrevio ? previoId : null,
  };
}

/** Lo que impide aprobar el período; cada elemento explica el bloqueo y dónde resolverlo. */
export function bloqueosAprobacion(periodo) {
  const calc = calculo(periodo);
  const lista = [];
  const nBloq = calc.resultados.filter((r) => r.bloqueado).length;
  if (nBloq) lista.push({ tipo: 'bloqueada', texto: `${nBloq} vendedor sin meta: carga la meta y ejecuta la corrida de nuevo.`, ruta: `#/periodos?p=${periodo}` });
  const obs = observaciones(periodo, { abiertas: true });
  if (obs.length) lista.push({ tipo: 'observacion', texto: `${obs.length} observación abierta bloquea a ${obs.map((o) => VENDEDOR[o.vendedorId].nombre).join(', ')}.`, ruta: `#/periodos?p=${periodo}` });
  const topes = calc.resultados.filter((r) => r.tope.excede && !decisionTope(r.vendedorId, periodo));
  if (topes.length) lista.push({ tipo: 'tope', texto: `${topes.length} excepción de tope sin decidir: ${topes.map((r) => r.nombre).join(', ')}.`, ruta: '#/aprobacion' });
  const aj = ajustesPendientesDeAplicarEn(periodo);
  if (aj.length) lista.push({ tipo: 'ajuste', texto: `${aj.length} ajuste sin autorizar: ${aj.map((a) => a.id).join(', ')}.`, ruta: '#/ajustes' });
  if (metasPendientes(periodo).length) lista.push({ tipo: 'meta-nueva', texto: 'Hay metas cargadas después de la corrida: ejecuta la corrida de nuevo.', ruta: `#/periodos?p=${periodo}` });
  return lista;
}

// ---------- Bandeja del Gerente (P06) ----------

export function pendientesGerente() {
  const st = obtener();
  const items = [];
  for (const p of periodosDisponibles()) {
    if (estadoPeriodo(p) !== 'En revisión') continue;
    calculo(p).resultados.filter((r) => r.tope.excede && !decisionTope(r.vendedorId, p)).forEach((r) =>
      items.push({ tipo: 'tope', periodo: p, vendedorId: r.vendedorId, titulo: `Excepción de tope · ${r.nombre}`, texto: `Comisión de ${fmtQ(r.comisionBase)} sobre un tope de ${fmtQ(r.tope.limite)}. Exceso: ${fmtQ(r.tope.exceso)}.` }));
  }
  st.ajustes.filter((a) => a.estado === 'pendiente').forEach((a) =>
    items.push({ tipo: 'ajuste', periodo: a.periodoAplicacion, vendedorId: a.vendedorId, ajusteId: a.id, titulo: `Ajuste mayor a Q1,000 · ${VENDEDOR[a.vendedorId].nombre}`, texto: `${a.id}: ${a.motivo}. Monto ${fmtQ(a.montoSolicitado)}, origen ${nombrePeriodo(a.periodoOrigen)}.` }));
  st.observaciones.filter((o) => o.estado === 'abierta').forEach((o) =>
    items.push({ tipo: 'observacion', periodo: o.periodo, vendedorId: o.vendedorId, obsId: o.id, titulo: `Observación abierta · ${VENDEDOR[o.vendedorId].nombre}`, texto: `${o.por}: ${o.motivo}` }));
  st.reglas.versiones.filter((r) => r.estado === 'borrador' && r.pendienteAprobacion).forEach((r) =>
    items.push({ tipo: 'regla', periodo: null, reglaId: r.id, version: r.version, titulo: `Activación de ${r.id} v${r.version}`, texto: `${r.nombre}. ${r.calculo}. Vigencia desde ${r.vigenciaDesde}.` }));
  return items;
}

/** Saldos que pasan al período siguiente por el límite del 50 % (D-05). */
export function saldosHaciaSiguiente(periodo) {
  const calc = calculo(periodo);
  return calc.aplicaciones
    .filter((a) => a.saldo > 0)
    .map((a) => ({ vendedorId: a.vendedorId, saldo: a.saldo, ajustes: a.ajustes.map((x) => x.id) }));
}

// ---------- Tiendas y vendedores ----------

export function vendedoresDeTienda(periodo, tiendaId) {
  return calculo(periodo).resultados.filter((r) => r.tienda === tiendaId);
}

export function tiendaDelVendedor(vendedorId) {
  return VENDEDOR[vendedorId].tienda;
}

export function nombreTienda(id) {
  return TIENDA[id]?.nombre ?? id;
}

/** Busca ventas por texto (producto) y fecha entre los vendedores del período (herramienta de disputas). */
export function buscarVentas(periodo, { texto = '', fecha = '' } = {}) {
  const t = texto.trim().toLowerCase();
  const resultados = [];
  for (const v of vendedoresDelPeriodo(periodo)) {
    for (const l of ventasDe(v.id, periodo)) {
      if (t && !l.producto.toLowerCase().includes(t) && !l.id.toLowerCase().includes(t)) continue;
      if (fecha && l.fecha !== fecha) continue;
      resultados.push({ ...l, vendedorNombre: v.nombre });
    }
  }
  return resultados.slice(0, 40);
}

// ---------- Historial ----------

export function eventosDe({ vendedorId = null, periodo = null } = {}) {
  return obtener().auditoria.filter((e) => {
    const mismoPeriodo = !periodo || !e.periodo || e.periodo === periodo;
    if (vendedorId) return e.vendedorId === vendedorId && mismoPeriodo;
    return mismoPeriodo;
  });
}
