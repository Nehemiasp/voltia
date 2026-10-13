// Motor de cálculo de comisiones. Funciones puras: mismas entradas, mismo resultado.
// Orden de aplicación (sección 3.3): R-006 → R-001 → R-002 → R-005 → R-003 → R-004.
// Los importes se manejan en centavos enteros por venta para que las sumas nunca arrastren error de coma flotante.

import { CATEGORIAS } from './reglas.js';
import { VENDEDOR, TIENDA } from './datos.js';
import { ventasDe, vendedoresDelPeriodo, metaDe, metaTienda, tiendaEn } from './ventas.js';
import { fmtFechaLarga, fmtPct, fmtQ } from './formato.js';

const aQuetzales = (centavos) => centavos / 100;
const redondear2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Escalones
// ---------------------------------------------------------------------------

/** Escalón de R-001 que corresponde a un cumplimiento (en puntos porcentuales). */
export function escalonPara(cumplimiento, escalones) {
  let indice = 0;
  escalones.forEach((e, i) => {
    if (cumplimiento >= e.desde) indice = i;
  });
  return { indice, ...escalones[indice] };
}

export const cumplimientoDe = (neto, meta) => (meta ? (neto * 100) / meta : null);

// ---------------------------------------------------------------------------
// Clasificación de ventas
// ---------------------------------------------------------------------------

/** Una venta devuelta solo deja de contar desde la fecha de devolución (permite reconstruir el pasado). */
export function estaDevuelta(venta, corte) {
  return venta.estado === 'devuelta' && venta.fechaDevolucion !== null && venta.fechaDevolucion <= corte;
}

export function clasificarVentas(ventas, config, corte) {
  const comisionables = [];
  const excluidas = [];
  const devueltas = [];
  for (const venta of ventas) {
    if (estaDevuelta(venta, corte)) {
      devueltas.push({ ...venta, motivo: `Devuelta el ${fmtFechaLarga(venta.fechaDevolucion).replace(/ de \d{4}$/, '')}` });
    } else if (venta.descuentoPct > config.R006.maxDescuento) {
      excluidas.push({
        ...venta,
        motivo: `Descuento de ${fmtPct(venta.descuentoPct)} (máximo ${config.R006.maxDescuento} %). No genera comisión ni suma a la meta (R-006).`,
      });
    } else {
      comisionables.push(venta);
    }
  }
  return { comisionables, excluidas, devueltas };
}

const suma = (ventas) => ventas.reduce((s, v) => s + v.neto, 0);

// ---------------------------------------------------------------------------
// Un vendedor (primera pasada)
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {string} p.vendedorId
 * @param {string} p.periodo        AAAA-MM
 * @param {object} p.config         configuración de un conjunto de reglas
 * @param {string} p.corte          fecha ISO: lo ocurrido después de esta fecha no se conoce todavía
 * @param {number|null} [p.meta]    reemplaza la meta del período (carga manual)
 * @param {Array}  [p.ventas]       reemplaza las ventas (simulaciones y reasignaciones)
 */
export function calcularVendedor({ vendedorId, periodo, config, corte, meta, ventas }) {
  const v = VENDEDOR[vendedorId];
  const lineas = ventas ?? ventasDe(vendedorId, periodo);
  const metaPeriodo = meta === undefined ? metaDe(v, periodo) : meta;
  const { comisionables, excluidas, devueltas } = clasificarVentas(lineas, config, corte);
  const netoComisionable = suma(comisionables);

  const base = {
    vendedorId, nombre: v.nombre, tienda: tiendaEn(v, periodo), periodo, corte,
    meta: metaPeriodo, comisionables, excluidas, devueltas,
    netoRegistrado: suma(lineas),
    netoDevuelto: suma(devueltas),
    netoExcluido: suma(excluidas),
    netoComisionable,
    bloqueado: metaPeriodo === null || metaPeriodo === undefined,
  };

  if (base.bloqueado) {
    return {
      ...base, motivoBloqueo: 'Falta meta', cumplimiento: null, escalon: null, tasa: 0,
      porCategoria: [], comisionBase: 0, comisionSinMultiplicador: 0,
      tope: { limite: config.R005.tope, excede: false, exceso: 0 },
      bono: { aplica: false, monto: 0, motivo: 'Sin meta cargada no hay cumplimiento' }, ajustes: [], total: 0,
    };
  }

  const cumplimiento = cumplimientoDe(netoComisionable, metaPeriodo);
  const escalon = escalonPara(cumplimiento, config.R001.escalones);
  const tasa = escalon.tasa;

  let centavosTotal = 0;
  let centavosSinMultiplicador = 0;
  const porCategoria = CATEGORIAS.map((categoria) => {
    const ventasCat = comisionables.filter((l) => l.categoria === categoria);
    const factor = config.R002.factores[categoria];
    const centavos = ventasCat.reduce((s, l) => s + Math.round(l.neto * tasa * factor), 0);
    const sinMult = ventasCat.reduce((s, l) => s + Math.round(l.neto * tasa), 0);
    centavosTotal += centavos;
    centavosSinMultiplicador += sinMult;
    return { categoria, venta: suma(ventasCat), cantidad: ventasCat.length, tasa, factor, comision: aQuetzales(centavos) };
  });
  const comisionBase = aQuetzales(centavosTotal);

  return {
    ...base, cumplimiento, escalon, tasa, porCategoria, comisionBase,
    comisionSinMultiplicador: aQuetzales(centavosSinMultiplicador),
    tope: {
      limite: config.R005.tope, excede: comisionBase > config.R005.tope,
      exceso: Math.max(0, comisionBase - config.R005.tope),
    },
    bono: { aplica: false, monto: 0, motivo: '' }, ajustes: [], total: comisionBase,
  };
}

// ---------------------------------------------------------------------------
// Un período completo (incluye la segunda pasada del bono de equipo)
// ---------------------------------------------------------------------------

/**
 * @param {object} p
 * @param {string} p.periodo
 * @param {object} p.config
 * @param {string} p.corte
 * @param {Object<string, number|null>} [p.metas]      metas cargadas a mano por vendedor
 * @param {Object<string, Array>} [p.ventas]           ventas alternativas por vendedor
 * @param {Object<string, Array<{id:string, monto:number, motivo:string}>>} [p.ajustes] ajustes aplicados al período
 */
export function calcularPeriodo({ periodo, config, corte, metas = {}, ventas = {}, ajustes = {} }) {
  const resultados = vendedoresDelPeriodo(periodo).map((v) =>
    calcularVendedor({ vendedorId: v.id, periodo, config, corte, meta: metas[v.id], ventas: ventas[v.id] }),
  );

  // Venta de la tienda: cada venta cuenta para la tienda donde se registró (D-12).
  const tiendas = Object.values(TIENDA).map((t) => {
    const vendido = resultados.reduce(
      (s, r) => s + r.comisionables.filter((l) => l.tienda === t.id).reduce((a, l) => a + l.neto, 0),
      0,
    );
    const meta = metaTienda(t.id, periodo);
    const cumplimiento = cumplimientoDe(vendido, meta);
    return {
      id: t.id, nombre: t.nombre, jefe: t.jefe, meta, vendido, cumplimiento,
      ganaBono: cumplimiento !== null && cumplimiento >= config.R003.minTienda,
    };
  });
  const porTienda = Object.fromEntries(tiendas.map((t) => [t.id, t]));

  // Segunda pasada: R-003 depende de un resultado agregado.
  for (const r of resultados) {
    const t = porTienda[r.tienda];
    if (!r.bloqueado) {
      const vendedorOk = r.cumplimiento >= config.R003.minVendedor;
      const aplica = t.ganaBono && vendedorOk;
      r.bono = {
        aplica, monto: aplica ? config.R003.monto : 0,
        motivo: aplica
          ? `${t.nombre} llegó a ${fmtPct(t.cumplimiento)} de su meta y el vendedor a ${fmtPct(r.cumplimiento)} (mínimo ${config.R003.minVendedor} %)`
          : !t.ganaBono
            ? `${t.nombre} llegó a ${fmtPct(t.cumplimiento)} de su meta (mínimo ${config.R003.minTienda} %)`
            : `El vendedor llegó a ${fmtPct(r.cumplimiento)} de su meta (mínimo ${config.R003.minVendedor} %)`,
      };
    }
    r.ajustes = ajustes[r.vendedorId] ?? [];
    r.total = redondear2(r.comisionBase + r.bono.monto + r.ajustes.reduce((s, a) => s + a.monto, 0));
  }

  const totales = {
    comision: redondear2(resultados.reduce((s, r) => s + r.comisionBase, 0)),
    bonos: redondear2(resultados.reduce((s, r) => s + r.bono.monto, 0)),
    ajustes: redondear2(resultados.reduce((s, r) => s + r.ajustes.reduce((a, x) => a + x.monto, 0), 0)),
    total: redondear2(resultados.reduce((s, r) => s + r.total, 0)),
    excesoTope: redondear2(resultados.reduce((s, r) => s + r.tope.exceso, 0)),
    vendedores: resultados.length,
    bloqueados: resultados.filter((r) => r.bloqueado).length,
    requierenAutorizacion: resultados.filter((r) => r.tope.excede).length,
  };

  return { periodo, corte, tiendas, porTienda, resultados, porVendedor: Object.fromEntries(resultados.map((r) => [r.vendedorId, r])), totales };
}

// ---------------------------------------------------------------------------
// R-004 · Reversión retroactiva
// ---------------------------------------------------------------------------

/** Descuento de un ajuste negativo en un período: hasta el límite del 50 % de la comisión (D-05). */
export function aplicarAjuste({ deuda, comisionPeriodo, config }) {
  if (deuda <= 0) return { solicitado: deuda, aplicado: -deuda, limite: null, saldo: 0, limitado: false };
  const limite = (comisionPeriodo * config.R004.limiteDescuentoPct) / 100;
  const descuento = Math.min(deuda, limite);
  return { solicitado: -deuda, aplicado: -descuento, limite, saldo: deuda - descuento, limitado: deuda > limite };
}

/**
 * Recalcula un período ya pagado con las reglas de ese período y compara contra lo que se pagó.
 * @param {object} p
 * @param {string} p.vendedorId
 * @param {string} p.periodo        período de origen
 * @param {object} p.config         reglas vigentes en el período de origen (nunca las actuales)
 * @param {string} p.corteOriginal  fecha de la corrida con la que se pagó
 * @param {string} p.corteNuevo     fecha desde la que se conoce la corrección
 * @param {Object<string, Array>} [p.ventasNuevas] ventas alternativas (reasignaciones de una disputa)
 */
export function recalcularRetroactivo({ vendedorId, periodo, config, corteOriginal, corteNuevo, ventasNuevas = {} }) {
  const antes = calcularPeriodo({ periodo, config, corte: corteOriginal });
  const despues = calcularPeriodo({ periodo, config, corte: corteNuevo, ventas: ventasNuevas });
  const a = antes.porVendedor[vendedorId];
  const d = despues.porVendedor[vendedorId];
  const diferencia = d.total - a.total;

  // Qué parte corresponde a lo que cambió de forma evidente y qué parte al cambio de escalón.
  const idsDevueltas = new Set(d.devueltas.map((l) => l.id));
  const ventaDevuelta = a.comisionables
    .filter((l) => idsDevueltas.has(l.id))
    .reduce((s, l) => s + Math.round(l.neto * a.tasa * config.R002.factores[l.categoria]), 0) / 100;
  // Los componentes se expresan como reducción (positivos) y suman exactamente -diferencia.
  const cambioBono = a.bono.monto - d.bono.monto;
  const cambioEscalon = a.comisionBase - d.comisionBase - ventaDevuelta;

  // Comparación por categoría: lo que cambió en el resto de las ventas por el cambio de escalón.
  const porCategoria = CATEGORIAS.map((categoria, i) => {
    const ca = a.porCategoria[i];
    const cd = d.porCategoria[i];
    const devueltaCat = a.comisionables
      .filter((l) => idsDevueltas.has(l.id) && l.categoria === categoria)
      .reduce((s, l) => s + Math.round(l.neto * a.tasa * ca.factor), 0) / 100;
    return {
      categoria, ventaAntes: ca.venta, ventaDespues: cd.venta, comisionAntes: ca.comision, comisionDespues: cd.comision,
      porVentaDevuelta: devueltaCat, porEscalon: ca.comision - cd.comision - devueltaCat,
    };
  });

  // Versión con signo y válida para cualquier cambio de ventas (devolución o reasignación):
  // lo que valen las ventas que salen (a la tasa de antes) o entran (a la tasa de después) y el efecto del cambio de escalón.
  const idsAntes = new Set(a.comisionables.map((l) => l.id));
  const idsDespues = new Set(d.comisionables.map((l) => l.id));
  const quitadas = a.comisionables.filter((l) => !idsDespues.has(l.id));
  const agregadas = d.comisionables.filter((l) => !idsAntes.has(l.id));
  const valor = (lista, tasa) => lista.reduce((s, l) => s + Math.round(l.neto * tasa * config.R002.factores[l.categoria]), 0) / 100;
  const valorVentas = valor(agregadas, d.tasa) - valor(quitadas, a.tasa);
  const efectoEscalon = redondear2(d.comisionBase - a.comisionBase - valorVentas);

  return {
    vendedorId, periodo, config, corteOriginal, corteNuevo,
    original: a, recalculado: d, tiendaAntes: antes.porTienda[a.tienda], tiendaDespues: despues.porTienda[d.tienda],
    diferencia: redondear2(diferencia), quitadas, agregadas,
    componentes: { ventaDevuelta, cambioEscalon, cambioBono, valorVentas: redondear2(valorVentas), efectoEscalon, efectoBono: d.bono.monto - a.bono.monto },
    porCategoria,
    ventasDevueltas: d.devueltas,
    cambioDeEscalon: a.escalon.indice !== d.escalon.indice,
  };
}

// ---------------------------------------------------------------------------
// Cascada de reglas (P03): del total vendido a la comisión, regla por regla
// ---------------------------------------------------------------------------

/** Pasos para dibujar la cascada. `tipo` indica cómo se presenta cada fila. */
export function construirCascada(r, config) {
  if (r.bloqueado) return [];
  const pasos = [];
  pasos.push({
    clave: 'registradas', regla: null, titulo: 'Ventas registradas del período', tipo: 'inicio',
    valor: r.netoRegistrado, detalle: `${r.comisionables.length + r.excluidas.length + r.devueltas.length} ventas`,
  });
  if (r.devueltas.length) {
    pasos.push({
      clave: 'devueltas', regla: null, titulo: 'Ventas devueltas', tipo: 'resta', valor: -r.netoDevuelto,
      detalle: r.devueltas.map((l) => l.id).join(', '),
    });
  }
  pasos.push({
    clave: 'excluidas', regla: 'R-006', titulo: 'Excluidas por descuento mayor a 25 %', tipo: r.excluidas.length ? 'resta' : 'neutro',
    valor: -r.netoExcluido, detalle: r.excluidas.length ? r.excluidas.map((l) => l.id).join(', ') : 'Ninguna venta excluida',
  });
  pasos.push({
    clave: 'comisionable', regla: null, titulo: 'Venta comisionable', tipo: 'subtotal', valor: r.netoComisionable,
    detalle: `${r.comisionables.length} ventas`,
  });
  pasos.push({
    clave: 'cumplimiento', regla: 'R-001', titulo: 'Cumplimiento de meta', tipo: 'dato', valor: r.cumplimiento, formato: 'pct',
    detalle: `${fmtQ(r.netoComisionable)} de ${fmtQ(r.meta)}`,
  });
  pasos.push({
    clave: 'tasa', regla: 'R-001', titulo: 'Tasa del escalón', tipo: 'dato', valor: r.tasa, formato: 'pct',
    detalle: 'Se aplica sobre toda la venta comisionable, no solo sobre el excedente',
  });
  pasos.push({
    clave: 'base', regla: 'R-001', titulo: 'Comisión base', tipo: 'subtotal', valor: r.comisionSinMultiplicador,
    detalle: `${fmtQ(r.netoComisionable)} × ${fmtPct(r.tasa)}`,
  });
  pasos.push({
    clave: 'multiplicador', regla: 'R-002', titulo: 'Multiplicador por categoría', tipo: r.comisionBase >= r.comisionSinMultiplicador ? 'suma' : 'resta',
    valor: r.comisionBase - r.comisionSinMultiplicador, detalle: 'Factor según la categoría de cada venta',
  });
  pasos.push({
    clave: 'comision', regla: null, titulo: 'Comisión del período', tipo: 'subtotal', valor: r.comisionBase, detalle: '',
  });
  pasos.push({
    clave: 'tope', regla: 'R-005', titulo: 'Tope individual', tipo: r.tope.excede ? 'alerta' : 'neutro', valor: r.tope.excede ? r.tope.exceso : 0,
    detalle: r.tope.excede
      ? `Supera el tope de ${fmtQ(r.tope.limite)} por ${fmtQ(r.tope.exceso)}. Requiere autorización de Gerencia Comercial.`
      : `Dentro del tope de ${fmtQ(r.tope.limite)}`,
  });
  pasos.push({
    clave: 'bono', regla: 'R-003', titulo: 'Bono de equipo', tipo: r.bono.aplica ? 'suma' : 'neutro', valor: r.bono.monto, detalle: r.bono.motivo,
  });
  const montoAjustes = r.ajustes.reduce((s, a) => s + a.monto, 0);
  pasos.push({
    clave: 'ajustes', regla: 'R-004', titulo: 'Ajustes por períodos anteriores', tipo: montoAjustes < 0 ? 'resta' : montoAjustes > 0 ? 'suma' : 'neutro',
    valor: montoAjustes, detalle: r.ajustes.length ? r.ajustes.map((a) => a.motivo).join(' · ') : 'Sin ajustes en este período',
  });
  pasos.push({ clave: 'total', regla: null, titulo: 'Total del período', tipo: 'total', valor: r.total, detalle: '' });
  return pasos;
}

/**
 * Qué pasaría con el total del vendedor si el cumplimiento llegara a otra venta comisionable.
 * Se usa para "cuánto me falta para el siguiente escalón" (P11) y para la proyección.
 */
export function proyectar({ resultado, ventaFinal, config, tiendaGanaBono = false }) {
  const cumplimiento = cumplimientoDe(ventaFinal, resultado.meta);
  const escalon = escalonPara(cumplimiento, config.R001.escalones);
  const mezcla = resultado.comisionables.length ? resultado.comisionables : [];
  const totalMezcla = suma(mezcla) || 1;
  const factorMedio = mezcla.reduce((s, l) => s + (l.neto / totalMezcla) * config.R002.factores[l.categoria], 0) || 1;
  const comision = Math.round(ventaFinal * escalon.tasa * factorMedio) / 100;
  const bono = tiendaGanaBono && cumplimiento >= config.R003.minVendedor ? config.R003.monto : 0;
  return { ventaFinal, cumplimiento, escalon, comision, bono, total: comision + bono };
}
