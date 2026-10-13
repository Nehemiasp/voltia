// "Cada número es clicable y explica de dónde sale" (P03). Cada explicación se arma con los mismos datos que la pantalla.

import { esc, fmtQ, fmtPct } from '../engine/formato.js';
import { CATEGORIAS } from '../engine/reglas.js';

const f = (k, v) => [k, v];

/** Devuelve { titulo, regla, intro, filas: [[etiqueta, valor]], nota } para una clave de número. */
export function explicar(clave, { r, config, periodoTexto = '' }) {
  if (!r) return null;
  const venta = r.netoComisionable;
  const mismoEscalon = r.escalon ? `${r.escalon.desde} % ${r.escalon.hasta === null ? 'o más' : `a ${r.escalon.hasta} %`}` : '';
  const montoAjustes = r.ajustes.reduce((s, a) => s + a.monto, 0);

  if (clave.startsWith('cat:')) {
    const c = r.porCategoria[Number(clave.slice(4))];
    return {
      titulo: `Comisión de ${c.categoria}`, regla: 'R-002',
      intro: 'Cada venta paga la tasa del escalón y se multiplica por el factor de su categoría.',
      filas: [f('Venta comisionable en la categoría', fmtQ(c.venta)), f('Tasa del escalón (R-001)', fmtPct(c.tasa)), f('Factor de la categoría (R-002)', c.factor.toFixed(1)), f(`${fmtQ(c.venta)} × ${fmtPct(c.tasa)} × ${c.factor.toFixed(1)}`, fmtQ(c.comision))],
      nota: `${c.cantidad} ventas en esta categoría.`,
    };
  }

  switch (clave) {
    case 'registradas':
      return { titulo: 'Ventas registradas', regla: null, intro: 'Todas las ventas del período a nombre del vendedor, antes de aplicar reglas.', filas: [f('Ventas comisionables', fmtQ(venta)), f('Excluidas por descuento (R-006)', fmtQ(r.netoExcluido)), f('Devueltas', fmtQ(r.netoDevuelto)), f('Total registrado', fmtQ(r.netoRegistrado))], nota: 'Las excluidas y devueltas siguen visibles en el detalle con su motivo.' };
    case 'excluidas':
      return { titulo: 'Ventas excluidas', regla: 'R-006', intro: `Una venta con descuento mayor a ${config.R006.maxDescuento} % no genera comisión ni suma a la meta. Se evalúa antes que cualquier otra regla.`, filas: r.excluidas.length ? [...r.excluidas.map((l) => f(`${l.id} · ${l.producto} (${fmtPct(l.descuentoPct)} de descuento)`, fmtQ(l.neto))), f('Total excluido', fmtQ(r.netoExcluido))] : [f('Ventas excluidas', fmtQ(0))], nota: 'Contarlas para la meta permitiría inflar el cumplimiento con descuentos agresivos.' };
    case 'devueltas':
      return { titulo: 'Ventas devueltas', regla: null, intro: 'Una venta devuelta deja de contar en el período donde se vendió. Si ese período ya se pagó, la diferencia se corrige con un ajuste.', filas: [...r.devueltas.map((l) => f(`${l.id} · ${l.producto}`, fmtQ(l.neto))), f('Total devuelto', fmtQ(r.netoDevuelto))], nota: 'Un período pagado no se reabre.' };
    case 'comisionable':
      return { titulo: 'Venta comisionable', regla: null, intro: 'Ventas vigentes del período que R-006 no excluyó. Es la base del cumplimiento y de la comisión.', filas: [f('Ventas registradas', fmtQ(r.netoRegistrado)), f('Menos devueltas', fmtQ(-r.netoDevuelto)), f('Menos excluidas por descuento', fmtQ(-r.netoExcluido)), f('Venta comisionable', fmtQ(venta))] };
    case 'cumplimiento':
      return { titulo: 'Cumplimiento de la meta', regla: 'R-001', intro: 'Venta comisionable dividida entre la meta del período.', filas: [f('Venta comisionable', fmtQ(venta)), f('Meta del período', fmtQ(r.meta)), f(`${fmtQ(venta)} ÷ ${fmtQ(r.meta)}`, fmtPct(r.cumplimiento))], nota: 'Las ventas excluidas por descuento no suman a la meta.' };
    case 'tasa':
      return { titulo: 'Tasa del escalón', regla: 'R-001', intro: `Con ${fmtPct(r.cumplimiento)} de cumplimiento el vendedor está en el escalón de ${mismoEscalon}.`, filas: config.R001.escalones.map((e, i) => f(`${i === 0 ? 'Menos de ' + config.R001.escalones[1].desde + ' %' : e.hasta === null ? e.desde + ' % o más' : e.desde + ' % a ' + e.hasta + ' %'}${i === r.escalon.indice ? '  ← aquí' : ''}`, fmtPct(e.tasa))), nota: `La tasa de ${fmtPct(r.tasa)} se aplica a todo lo que vendió en el período, no solo al excedente.` };
    case 'base':
      return { titulo: 'Comisión base', regla: 'R-001', intro: 'Venta comisionable por la tasa del escalón, antes de multiplicar por categoría.', filas: [f('Venta comisionable', fmtQ(venta)), f('Tasa del escalón', fmtPct(r.tasa)), f(`${fmtQ(venta)} × ${fmtPct(r.tasa)}`, fmtQ(r.comisionSinMultiplicador))] };
    case 'multiplicador':
      return { titulo: 'Efecto del multiplicador por categoría', regla: 'R-002', intro: 'Cada categoría paga más o menos que la tasa base según su factor.', filas: [...r.porCategoria.filter((c) => c.venta > 0).map((c) => f(`${c.categoria} (× ${c.factor.toFixed(1)})`, fmtQ(c.comision - Math.round(c.venta * c.tasa) / 100, { signo: true }))), f('Efecto total', fmtQ(r.comisionBase - r.comisionSinMultiplicador, { signo: true }))], nota: 'Cada fila es la comisión de la categoría menos lo que habría pagado con factor 1.0.' };
    case 'comision':
      return { titulo: 'Comisión del período', regla: 'R-002', intro: 'Suma de la comisión de cada categoría.', filas: [...r.porCategoria.filter((c) => c.venta > 0).map((c) => f(c.categoria, fmtQ(c.comision))), f('Comisión', fmtQ(r.comisionBase))] };
    case 'tope':
      return { titulo: 'Tope individual', regla: 'R-005', intro: `Ninguna comisión individual puede superar ${fmtQ(r.tope.limite)} en un período sin autorización de Gerencia Comercial.`, filas: [f('Comisión', fmtQ(r.comisionBase)), f('Tope', fmtQ(r.tope.limite)), f('Exceso', fmtQ(r.tope.exceso))], nota: 'El tope no recorta nada por sí solo: marca el resultado y lo escala a una persona.' };
    case 'bono':
      return { titulo: 'Bono de equipo', regla: 'R-003', intro: `Cada vendedor recibe ${fmtQ(config.R003.monto)} si su tienda llega al ${config.R003.minTienda} % de su meta y él llega al ${config.R003.minVendedor} % o más.`, filas: [f('Resultado', r.bono.aplica ? fmtQ(r.bono.monto) : fmtQ(0))], nota: r.bono.motivo };
    case 'ajustes':
      return { titulo: 'Ajustes de períodos anteriores', regla: 'R-004', intro: 'Correcciones de períodos ya pagados que se aplican en este período.', filas: r.ajustes.length ? [...r.ajustes.map((a) => f(a.motivo, fmtQ(a.monto, { signo: true }))), f('Total aplicado', fmtQ(montoAjustes, { signo: true }))] : [f('Sin ajustes', fmtQ(0))], nota: 'Un ajuste negativo descuenta como máximo el 50 % de la comisión del período.' };
    case 'total':
      return { titulo: 'Total del período', regla: null, intro: 'Comisión más bono de equipo más ajustes.', filas: [f('Comisión', fmtQ(r.comisionBase)), f('Bono de equipo (R-003)', fmtQ(r.bono.monto, { signo: true })), f('Ajustes (R-004)', fmtQ(montoAjustes, { signo: true })), f('Total', fmtQ(r.total))], nota: periodoTexto };
    default:
      return null;
  }
}

export function htmlExplicacion(e) {
  if (!e) return '<p>No hay una explicación para este número.</p>';
  const regla = e.regla ? `<span class="chip chip--regla">${esc(e.regla)}</span>` : '';
  const filas = e.filas.map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
  return `<div class="fila" style="margin-bottom:12px">${regla}</div><p>${esc(e.intro)}</p><ul class="formula">${filas}</ul>${e.nota ? `<p class="pequeno secundario">${esc(e.nota)}</p>` : ''}`;
}

export { CATEGORIAS };
