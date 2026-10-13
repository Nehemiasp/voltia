// P11 · Mi comisión (vendedor, móvil). Cuánto voy a ganar, cuánto me falta y qué significa cada ajuste, en lenguaje simple.

import { calculo, periodosDisponibles, estadoPeriodo, configDe, fechaHoy, resultado, ajusteSobre, hayResultados, estadoResultado, periodoRegistro } from '../selectores.js';
import { calcularVendedor, proyectar, recalcularRetroactivo } from '../../engine/calculo.js';
import { ventasDe } from '../../engine/ventas.js';
import { VENDEDOR, TIENDA } from '../../engine/datos.js';
import { esc, fmtQ, fmtPct, fmtFecha, nombrePeriodo, diasDelMes, mesDe } from '../../engine/formato.js';
import { ico, chip, chipResultado, q, pct, nota, panel, boton, barraCumplimiento } from '../ui.js';
import { aplicarAjuste } from '../../engine/calculo.js';
import { corteDe } from '../selectores.js';

const redondeo10 = (n) => Math.round(n / 10) * 10;

function mesEnCurso(vendedorId) {
  const hoy = fechaHoy();
  const p = periodosDisponibles().find((x) => estadoPeriodo(x) === 'Abierto' && hoy.startsWith(x));
  if (!p) return null;
  const config = configDe(p);
  const diaHoy = Number(hoy.slice(8, 10));
  const dias = diasDelMes(p);
  const lineas = ventasDe(vendedorId, p).filter((l) => l.fecha <= hoy);
  const parcial = calcularVendedor({ vendedorId, periodo: p, config, corte: hoy, ventas: lineas });
  return { p, config, diaHoy, dias, parcial };
}

function bloqueMesEnCurso(vendedorId) {
  const m = mesEnCurso(vendedorId);
  if (!m) return '';
  const { p, config, diaHoy, dias, parcial } = m;
  if (parcial.bloqueado) return panel({ titulo: nombrePeriodo(p) + ' · en curso', cuerpo: nota('aviso', '<strong>Todavía no tienes una meta cargada.</strong><p>Compensaciones la carga a inicio de mes. En cuanto esté, aquí verás tu avance.</p>') });
  if (diaHoy < 7) return panel({ titulo: `${nombrePeriodo(p)} · en curso`, cuerpo: `<p>${esc(mesDe(p).charAt(0).toUpperCase() + mesDe(p).slice(1))} acaba de empezar. Tu meta es de <strong>${q(parcial.meta)}</strong>. Cuando tengas ventas verás aquí tu avance y cuánto te falta para el siguiente escalón.</p>` });
  const escalones = config.R001.escalones;
  const ritmo = (parcial.netoComisionable / diaHoy) * dias;
  const proy = proyectar({ resultado: parcial, ventaFinal: ritmo, config });
  const sig = escalones[proy.escalon.indice + 1] ?? null;
  const ventaSig = sig ? (sig.desde / 100) * parcial.meta : null;
  const siguiente = sig ? proyectar({ resultado: parcial, ventaFinal: ventaSig, config }) : null;
  const actual = escalones[Math.max(0, proy.escalon.indice)];
  return panel({
    titulo: `${nombrePeriodo(p)} · en curso`, subtitulo: `Día ${diaHoy} de ${dias}. Datos al ${esc(fmtFecha(fechaHoy()))}.`,
    cuerpo: `<div class="pila">
      <div><div class="dato__etiqueta">Llevas vendido</div><div class="dato__valor dato__valor--grande">${q(parcial.netoComisionable)}</div><div class="dato__nota">${pct(parcial.cumplimiento)} de tu meta de ${q(parcial.meta)}</div></div>
      ${barraCumplimiento({ cumplimiento: parcial.cumplimiento, escalones, etiquetaMarca: `Hoy: ${fmtPct(parcial.cumplimiento)}` })}
      <div class="bloque-simple"><strong>Si sigues así</strong><p>Cerrarías ${esc(mesDe(p))} con unos <strong>${q(redondeo10(ritmo))}</strong> (${pct(proy.cumplimiento)}). Tu tasa sería de <strong>${pct(proy.escalon.tasa)}</strong> y ganarías unos <strong>${q(redondeo10(proy.comision))}</strong>.</p></div>
      <p class="frase-destacada" style="margin:0"><strong>Tu tasa de ${pct(actual.tasa)} se aplicaría a todo lo que vendiste este mes</strong>, no solo a lo que pase de la meta.</p>
      ${sig ? `<div class="bloque-simple"><strong>El siguiente escalón: ${pct(sig.desde)}</strong><p>Si llegas a ${q(ventaSig)} en el mes, tu tasa sube a <strong>${pct(sig.tasa)}</strong> sobre todo lo vendido y ganarías unos <strong>${q(redondeo10(siguiente.comision))}</strong>. Te faltarían ${q(Math.max(0, Math.round(ventaSig - parcial.netoComisionable)))} desde hoy (${q(Math.max(0, Math.round(ventaSig - ritmo)))} más que tu ritmo actual).</p></div>` : '<p>Ya estás en el escalón más alto.</p>'}
      <p class="diminuto secundario">Es una estimación con tu ritmo de venta. El bono de equipo de ${q(500)} depende de que ${esc(TIENDA[VENDEDOR[vendedorId].tienda].nombre)} llegue al 100 % de su meta. Las ventas con más de 25 % de descuento no suman.</p>
    </div>`,
  });
}

function explicacionAjuste(vendedorId, periodo, a) {
  const config = configDe(periodo);
  const rr = recalcularRetroactivo({ vendedorId, periodo, config, corteOriginal: periodoRegistro(periodo).corrida.fecha, corteNuevo: (a.preparadoEn ?? fechaHoy()).slice(0, 10) });
  const dev = rr.quitadas[0];
  const estadoOk = ['autorizado', 'aplicado'].includes(a.estado);
  if (!estadoOk) return `<p>Hay un ajuste sobre ${esc(nombrePeriodo(periodo))} que todavía se está revisando. Cuando esté autorizado, te lo explicamos aquí.</p>`;
  const ap = hayResultados(a.periodoAplicacion) ? (() => {
    const r = resultado(vendedorId, a.periodoAplicacion);
    const base = r.comisionBase;
    return aplicarAjuste({ deuda: -a.montoSolicitado, comisionPeriodo: base, config: configDe(a.periodoAplicacion) });
  })() : null;
  if (a.tipo === 'devolucion' && dev && rr.cambioDeEscalon) {
    return `<p>Se devolvió ${esc(dev.producto.toLowerCase())} que vendiste en ${esc(mesDe(periodo))}. Al bajar tu cumplimiento de ese mes de ${pct(rr.original.cumplimiento)} a ${pct(rr.recalculado.cumplimiento)}, la tasa pasó de ${pct(rr.original.tasa)} a ${pct(rr.recalculado.tasa)}.</p>
      <ul class="formula"><li><span>Lo que valía esa venta</span><span>${q(Math.abs(rr.componentes.valorVentas))}</span></li><li><span>Efecto de la tasa nueva sobre el resto de tus ventas</span><span>${q(Math.abs(rr.componentes.efectoEscalon))}</span></li><li><span>Ajuste total</span><span>${q(a.montoSolicitado)}</span></li></ul>
      ${ap ? `<p>Para no dejarte sin ingreso, en ${esc(mesDe(a.periodoAplicacion))} se descuentan como máximo el 50 % de tu comisión: <strong>${q(Math.abs(ap.aplicado))}</strong>.${ap.saldo > 0 ? ` Los <strong>${q(ap.saldo)}</strong> restantes se descontarán en ${esc(mesDe(periodoSiguiente(a.periodoAplicacion)))}.` : ''}</p>` : ''}`;
  }
  return `<p>${esc(a.motivo)}. Ajuste: <strong>${q(a.montoSolicitado, { signo: true })}</strong>, aplicado en ${esc(nombrePeriodo(a.periodoAplicacion))}.</p>`;
}

function periodoSiguiente(p) {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function tarjetaMes(vendedorId, periodo) {
  const estado = estadoPeriodo(periodo);
  const r = resultado(vendedorId, periodo);
  if (!r) return '';
  const visible = ['Aprobado', 'Pagado'].includes(estado);
  const ajustes = ajusteSobre(vendedorId, periodo).filter((a) => ['autorizado', 'aplicado', 'pendiente'].includes(a.estado));
  const e = estadoResultado(periodo, r);
  const cabecera = `<div class="fila fila--entre"><h3>${esc(nombrePeriodo(periodo))}</h3>${visible ? chipResultado(e) : chip('aviso', estado === 'En revisión' ? 'En revisión' : 'Calculando', 'hourglass')}</div>`;
  if (r.bloqueado) return `<section class="panel"><div class="panel__cuerpo pila">${cabecera}${nota('aviso', '<strong>Falta tu meta.</strong><p>Compensaciones la está cargando. Tu comisión de este mes se calcula en cuanto esté.</p>')}</div></section>`;
  if (!visible) return `<section class="panel"><div class="panel__cuerpo pila">${cabecera}<p class="secundario">Estamos revisando los resultados. Verás tu comisión aquí cuando se apruebe el mes.</p></div></section>`;
  const aj = ajustes.map((a) => `<div class="bloque-simple">${ico('git-compare')} <strong>Un ajuste sobre ${esc(mesDe(periodo))}</strong>${explicacionAjuste(vendedorId, periodo, a)}</div>`).join('');
  return `<section class="panel"><div class="panel__cuerpo pila">${cabecera}
    <div class="dato"><span class="dato__etiqueta">${e === 'ajustada' ? 'Total que te pagaron' : 'Total del mes'}</span><span class="dato__valor dato__valor--grande">${q(r.total)}</span><span class="dato__nota">Cumplimiento ${pct(r.cumplimiento)} · tasa ${pct(r.tasa)}${r.bono.aplica ? ` · incluye ${q(r.bono.monto)} del bono de equipo` : ''}</span></div>
    ${aj}
    <a class="btn" href="#/detalle/${vendedorId}?p=${periodo}">${ico('receipt-text')} Ver cómo se calculó</a></div></section>`;
}

function saldoPendiente(vendedorId) {
  const lista = [];
  for (const p of periodosDisponibles()) {
    if (!hayResultados(p)) continue;
    const ap = calculo(p).aplicacionDe?.[vendedorId];
    if (ap && ap.saldo > 0) lista.push({ periodo: p, saldo: ap.saldo });
  }
  return lista;
}

export default {
  id: 'mi-comision',
  titulo: 'Mi comisión',
  vacio: { titulo: 'Todavía no hay resultados', texto: 'Cuando se calcule tu primer mes, tu comisión aparece aquí.' },
  render(ctx) {
    const vendedorId = ctx.st.vendedorActivo;
    const v = VENDEDOR[vendedorId];
    const meses = periodosDisponibles().filter((p) => hayResultados(p) && resultado(vendedorId, p)).reverse();
    const saldos = saldoPendiente(vendedorId);
    const html = `<div class="pagina pagina--movil">
      <header class="pagina__encabezado" style="margin-bottom:var(--e-4)"><div><h1 id="titulo-vista" tabindex="-1">Hola, ${esc(v.nombre.split(' ')[0])}</h1><p>${esc(TIENDA[v.tienda].nombre)} · tu comisión, explicada.</p></div></header>
      <div class="pila">
        ${bloqueMesEnCurso(vendedorId)}
        ${saldos.length ? nota('aviso', `<strong>Tienes un saldo pendiente de ${q(saldos[0].saldo)}.</strong><p>Viene de un ajuste y se descuenta en ${esc(nombrePeriodo(periodoSiguiente(saldos[0].periodo)))}, hasta el 50 % de tu comisión de ese mes.</p>`) : ''}
        ${meses.length ? `<h2 style="font-size:var(--t-l);margin-top:8px">Meses anteriores</h2>${meses.map((p) => tarjetaMes(vendedorId, p)).join('')}` : ''}
        <div class="panel"><div class="panel__cuerpo"><strong>¿Algo no coincide?</strong><p class="secundario pequeno" style="margin:4px 0 12px">Abre una disputa y Compensaciones revisa tu caso con el detalle de tus ventas.</p>
          ${boton({ texto: 'Abrir una disputa', icono: 'message-square', href: '#/disputas' })}</div></div>
      </div></div>`;
    return { html, titulo: 'Mi comisión' };
  },
};

export { corteDe, calculo };
