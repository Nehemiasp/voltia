// P09 · Ajuste retroactivo. La pantalla más importante del caso: explica sin texto adicional por qué
// una devolución de Q12,000 revierte Q3,780 y no Q600.

import {
  obtener
} from '../estado.js';
import {
  calculo, resultado, hayResultados, periodoRegistro, estadoPeriodo, configDe, LIMITE_AJUSTE_SIN_GERENTE,
} from '../selectores.js';
import { recalcularRetroactivo, aplicarAjuste } from '../../engine/calculo.js';
import { ventasDe } from '../../engine/ventas.js';
import { VENDEDOR, TIENDA } from '../../engine/datos.js';
import { CATEGORIAS } from '../../engine/reglas.js';
import { esc, fmtQ, fmtPct, fmtFecha, fmtFechaLarga, fmtFechaHora, nombrePeriodo } from '../../engine/formato.js';
import {
  ico, chip, chipAjuste, q, pct, nota, panel, encabezado, dato, boton, motivoVisible, estadoVista, barraCumplimiento, variacion, explicable,
} from '../ui.js';
import { confirmar } from '../dialogos.js';
import { puede, motivoSinPermiso } from '../permisos.js';
import { migas } from './comun.js';

const ESTADOS_ORDEN = ['borrador', 'pendiente', 'autorizado', 'aplicado'];

// ---------- cálculo del ajuste ----------

export function calcularAjuste(a) {
  const config = configDe(a.periodoOrigen);
  const corteOriginal = periodoRegistro(a.periodoOrigen)?.corrida?.fecha ?? '';
  const corteNuevo = (a.preparadoEn ?? obtener().reloj).slice(0, 10);
  let ventasNuevas = {};
  if (a.referencia?.deVendedor && a.referencia?.aVendedor) {
    const de = ventasDe(a.referencia.deVendedor, a.periodoOrigen);
    const venta = de.find((l) => l.id === a.referencia.venta);
    const aList = ventasDe(a.referencia.aVendedor, a.periodoOrigen);
    ventasNuevas = { [a.referencia.deVendedor]: de.filter((l) => l.id !== venta.id), [a.referencia.aVendedor]: [...aList, { ...venta, vendedor: a.referencia.aVendedor }] };
  }
  return recalcularRetroactivo({ vendedorId: a.vendedorId, periodo: a.periodoOrigen, config, corteOriginal, corteNuevo, ventasNuevas });
}

function aplicacionEn(a) {
  const p = a.periodoAplicacion;
  if (!hayResultados(p)) return null;
  const r = resultado(a.vendedorId, p);
  if (!r) return null;
  const config = configDe(p);
  // la comisión del período sin este ajuste
  const ap = aplicarAjuste({ deuda: -a.montoSolicitado, comisionPeriodo: r.comisionBase, config });
  return { r, ap };
}

// ---------- bloques ----------

function filaComp(titulo, antes, despues, { nivel = false, sub = '', clase = '', inverso = false, fmt = q, sinDif = false } = {}) {
  const d = despues - antes;
  const dif = sinDif ? '' : Math.abs(d) < 0.005 ? '<span class="secundario">sin cambio</span>' : fmt === q ? variacion(d, { inverso }) : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(0)} pts`;
  return `<tr class="${nivel ? 'nivel' : ''} ${clase}"><td>${esc(titulo)}${sub ? `<div class="diminuto secundario">${sub}</div>` : ''}</td><td>${fmt === q ? q(antes) : pct(antes)}</td><td>${fmt === q ? q(despues) : pct(despues)}</td><td class="${d < 0 ? 'cambio' : d > 0 ? 'cambio cambio--sube' : ''}">${dif}</td></tr>`;
}

function comparador(rr, a) {
  const o = rr.original;
  const d = rr.recalculado;
  const cambia = rr.cambioDeEscalon;
  const cats = CATEGORIAS.map((c, i) => {
    const co = o.porCategoria[i];
    const cd = d.porCategoria[i];
    if (!co.venta && !cd.venta) return '';
    return filaComp(c, co.comision, cd.comision, { nivel: true, sub: `${q(co.venta)} → ${q(cd.venta)} vendidos`, inverso: false });
  }).join('');
  const t0 = rr.tiendaAntes;
  const t1 = rr.tiendaDespues;
  const quitada = rr.quitadas[0];
  const agregada = rr.agregadas[0];
  const etiquetaDespues = agregada ? `Recalculado con ${esc(agregada.id)}` : quitada ? `Recalculado sin ${esc(quitada.id)}` : 'Recalculado';
  return `<table class="comparador"><caption class="solo-lectores">Antes y después de ${esc(nombrePeriodo(a.periodoOrigen))}</caption>
    <thead><tr><th scope="col">Concepto</th><th scope="col">Como se pagó<small>corrida del ${esc(fmtFecha(rr.corteOriginal))} · reglas ${esc(periodoRegistro(a.periodoOrigen)?.corrida?.version ?? '')}</small></th>
      <th scope="col">${etiquetaDespues}<small>mismas reglas ${esc(periodoRegistro(a.periodoOrigen)?.corrida?.version ?? '')}</small></th><th scope="col">Diferencia</th></tr></thead>
    <tbody>
      ${filaComp('Venta comisionable', o.netoComisionable, d.netoComisionable)}
      ${filaComp(`Cumplimiento de la meta de ${fmtQ(o.meta)}`, o.cumplimiento, d.cumplimiento, { fmt: pct })}
      <tr class="${cambia ? 'sub' : ''}"><td>Tasa del escalón (R-001)${cambia ? '<div class="diminuto secundario">Cruzó el 100 %: cambia de escalón</div>' : ''}</td><td>${pct(o.tasa)}</td><td>${cambia ? `<mark>${pct(d.tasa)}</mark>` : pct(d.tasa)}</td><td class="${d.tasa < o.tasa ? 'cambio' : d.tasa > o.tasa ? 'cambio cambio--sube' : ''}">${d.tasa === o.tasa ? '<span class="secundario">sin cambio</span>' : `${d.tasa > o.tasa ? '+' : '−'}${Math.abs(d.tasa - o.tasa)} pts`}</td></tr>
      ${cats}
      ${filaComp('Comisión', o.comisionBase, d.comisionBase, { clase: 'sub' })}
      ${filaComp('Bono de equipo (R-003)', o.bono.monto, d.bono.monto, { sub: `${esc(TIENDA[o.tienda].nombre)}: ${pct(t0.cumplimiento, { fijo: true })} → ${pct(t1.cumplimiento, { fijo: true })}${t1.ganaBono ? ', sigue sobre 100 %' : ', ya no llega al 100 %'}` })}
      ${filaComp(`Total de ${nombrePeriodo(a.periodoOrigen)}`, o.total, d.total, { clase: 'total' })}
    </tbody></table>`;
}

function separacion(rr, a) {
  const c = rr.componentes;
  const venta = Math.abs(c.valorVentas);
  const esc2 = Math.abs(c.efectoEscalon);
  const bono = Math.abs(c.efectoBono);
  const total = venta + esc2 + bono || 1;
  const quitada = rr.quitadas[0];
  const agregada = rr.agregadas[0];
  const ventaTxt = quitada
    ? `${quitada.id} · ${quitada.producto}: ${fmtQ(quitada.neto)} × ${fmtPct(rr.original.tasa)} × ${rr.original.porCategoria.find((x) => x.categoria === quitada.categoria).factor.toFixed(1)}`
    : agregada ? `${agregada.id} · ${agregada.producto}: ${fmtQ(agregada.neto)} × ${fmtPct(rr.recalculado.tasa)}` : '';
  const nombreVenta = quitada ? (a.tipo === 'devolucion' ? 'La venta devuelta' : 'La venta que sale') : 'La venta que entra';
  const parte = (valor, clase, etiqueta) => (valor > 0 ? `<div class="apilada__parte ${clase}" style="flex:${(valor / total) * 100} 1 0" title="${esc(etiqueta)}">${q(valor)}</div>` : '');
  const porCat = rr.porCategoria.filter((x) => Math.abs(x.porEscalon) > 0.004);
  const tasaTxt = `${fmtPct(rr.original.tasa)} a ${fmtPct(rr.recalculado.tasa)}`;
  return `<div class="apilada" role="img" aria-label="${esc(`${fmtQ(venta)} por la venta y ${fmtQ(esc2)} por el cambio de escalón`)}">${parte(venta, 'apilada__parte--a', nombreVenta)}${parte(esc2, 'apilada__parte--b', 'Cambio de escalón')}${parte(bono, 'apilada__parte--c', 'Bono')}</div>
    <div class="apilada__leyenda">
      <div class="leyenda-item"><i style="background:#8f3a31"></i><div><strong>${esc(nombreVenta)} · ${q(venta)}</strong><p>${esc(ventaTxt)}. Es lo que cualquiera esperaría.</p></div><span></span></div>
      ${esc2 > 0 ? `<div class="leyenda-item"><i style="background:var(--negativo)"></i><div><strong>El cambio de escalón · ${q(esc2)}</strong><p>${rr.cambioDeEscalon ? `El cumplimiento pasó de ${esc(fmtPct(rr.original.cumplimiento))} a ${esc(fmtPct(rr.recalculado.cumplimiento))}. La tasa bajó de ${esc(tasaTxt)} y se aplica a <em>todo</em> lo demás que ${esc(VENDEDOR[a.vendedorId].nombre.split(' ')[0])} vendió.` : 'Efecto del cambio de venta sobre el resto de las ventas.'}</p>
        ${porCat.length ? `<p class="diminuto">${porCat.map((x) => `${esc(x.categoria)} ${q(x.porEscalon)}`).join(' · ')}</p>` : ''}</div><span></span></div>` : ''}
      ${bono > 0 ? `<div class="leyenda-item"><i style="background:#d6685d"></i><div><strong>El bono de equipo · ${q(bono)}</strong><p>El equipo dejó de llegar a su meta.</p></div><span></span></div>` : ''}
    </div>`;
}

function aplicacionHtml(a, info) {
  if (!info) return `<p class="secundario">${esc(nombrePeriodo(a.periodoAplicacion))} todavía no se calcula. El ajuste se aplicará con su corrida, descontando como máximo el 50 % de la comisión.</p>`;
  const { r, ap } = info;
  const monto = Math.abs(a.montoSolicitado);
  const pos = a.montoSolicitado > 0;
  const filas = pos
    ? [['Comisión de ' + nombrePeriodo(a.periodoAplicacion), r.comisionBase, ''], ['Ajuste a favor', a.montoSolicitado, 'suma'], ['Neto a pagar de comisión y ajuste', r.comisionBase + a.montoSolicitado, 'total']]
    : [
      ['Comisión de ' + nombrePeriodo(a.periodoAplicacion), r.comisionBase, ''],
      ['Ajuste solicitado', -monto, 'resta'],
      [`Límite: ${esc(fmtPct(50))} de la comisión del período`, -ap.limite, ap.limitado ? 'alerta' : 'neutro'],
      ['Se descuenta en ' + nombrePeriodo(a.periodoAplicacion), ap.aplicado, 'resta'],
      ['Neto a pagar de comisión', r.comisionBase + ap.aplicado, 'total'],
    ];
  const escala = Math.max(r.comisionBase, monto) || 1;
  const medidor = pos ? '' : `<div class="medidor" role="img" aria-label="${esc(`Se descuentan ${fmtQ(Math.abs(ap.aplicado))} de ${fmtQ(r.comisionBase)}; el límite es ${fmtQ(ap.limite)}`)}">
      <div class="medidor__parte" style="width:${(r.comisionBase / escala) * 100}%"></div>
      <div class="medidor__parte medidor__parte--descuento" style="width:${(Math.abs(ap.aplicado) / escala) * 100}%"></div>
      <div class="medidor__limite" style="left:${(ap.limite / escala) * 100}%" title="Límite del 50 %"></div></div>
      <p class="leyenda-medidor"><span><i style="background:var(--negativo)"></i>Se descuenta ${q(Math.abs(ap.aplicado))}</span><span><i style="background:var(--borde-control)"></i>Se paga ${q(r.comisionBase + ap.aplicado)}</span><span><i style="background:var(--texto);width:3px"></i>Límite del 50 %: ${q(ap.limite)}</span></p>`;
  const tabla = `<table class="comparador"><thead><tr><th scope="col">Concepto</th><th scope="col"><span class="solo-lectores">Monto</span></th></tr></thead><tbody>${filas.map(([t, v, tipo]) => `<tr class="${tipo === 'total' ? 'total' : tipo === 'alerta' ? 'sub' : ''}"><td>${t.includes('Límite') ? t : esc(t)}</td><td class="${tipo === 'resta' ? 'cambio' : tipo === 'suma' ? 'cambio cambio--sube' : ''}">${q(v, tipo === 'suma' || tipo === 'resta' ? { signo: true } : undefined)}</td></tr>`).join('')}
    ${ap.saldo > 0 ? `<tr class="sub"><td>Saldo pendiente para ${esc(nombrePeriodo(sigPeriodo(a.periodoAplicacion)))}</td><td class="cambio">${q(ap.saldo)}</td></tr>` : ''}</tbody></table>`;
  const nota2 = ap.saldo > 0
    ? nota('aviso', `<strong>Un descuento no puede dejar a ${esc(VENDEDOR[a.vendedorId].nombre.split(' ')[0])} sin ingreso.</strong><p>Se descuentan ${q(Math.abs(ap.aplicado))} en ${esc(nombrePeriodo(a.periodoAplicacion))} y los ${q(ap.saldo)} restantes pasan al período siguiente, con el mismo límite (D-05).</p>`)
    : '';
  return `${medidor}${tabla}${nota2}`;
}

function sigPeriodo(p) {
  const [y, m] = p.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

function lineaAjuste(a) {
  const idx = a.estado === 'devuelto' ? 0 : ESTADOS_ORDEN.indexOf(a.estado);
  const fechas = { borrador: a.preparadoEn, pendiente: a.enviadoEn, autorizado: a.autorizadoEn, aplicado: a.estado === 'aplicado' ? a.autorizadoEn : null };
  const etiquetas = { borrador: 'Preparado', pendiente: 'Pendiente de autorización', autorizado: 'Autorizado', aplicado: 'Aplicado en el período' };
  const quien = { borrador: a.preparadoPor, pendiente: a.preparadoPor, autorizado: a.autorizadoPor, aplicado: '' };
  return `<ol class="estados" style="grid-template-columns:repeat(4,minmax(0,1fr))" aria-label="Estados del ajuste">${ESTADOS_ORDEN.map((e, i) => `
    <li class="${i < idx ? 'hecho' : i === idx ? 'actual' : ''}"><span class="punto">${i < idx || (i === idx && e === 'aplicado') ? ico('check') : i === idx ? ico('circle-dot') : ''}</span>${esc(etiquetas[e])}
    <small>${fechas[e] && i <= idx ? esc(fmtFechaHora(fechas[e])) : i > idx ? 'pendiente' : ''}${quien[e] && i <= idx ? `<br>${esc(quien[e])}` : ''}</small></li>`).join('')}</ol>`;
}

// ---------- vistas ----------

const detalle = {
  id: 'ajuste',
  titulo: 'Ajuste retroactivo',
  render(ctx) {
    const a = obtener().ajustes.find((x) => x.id === ctx.param);
    if (!a) return { html: `<div class="pagina">${encabezado({ titulo: 'Ajuste retroactivo' })}${estadoVista('vacio', { titulo: 'No encontramos este ajuste', texto: 'Puede que la dirección esté mal escrita.', accion: '<a class="btn" href="#/ajustes">Ver todos los ajustes</a>' })}</div>` };
    const v = VENDEDOR[a.vendedorId];
    const rr = calcularAjuste(a);
    const info = aplicacionEn(a);
    const monto = a.montoSolicitado;
    const necesitaGerente = Math.abs(monto) > LIMITE_AJUSTE_SIN_GERENTE;
    const analista = puede(ctx.rol, 'ajuste.preparar');
    const gerente = puede(ctx.rol, 'ajuste.autorizar');
    const enviable = analista && ['borrador', 'devuelto'].includes(a.estado);
    const decidible = gerente && a.estado === 'pendiente';
    const secuencia = ctx.query.secuencia === '1';

    const acciones = [];
    if (enviable) acciones.push(boton({ texto: necesitaGerente ? 'Enviar a autorización' : 'Autorizar y aplicar', clase: 'btn--primario', icono: 'send', accion: 'enviar', foco: 'enviar' }));
    if (decidible) {
      acciones.push(boton({ texto: 'Autorizar ajuste', clase: 'btn--primario', icono: 'badge-check', accion: 'autorizar', foco: 'autorizar' }));
      acciones.push(boton({ texto: 'Devolver al Analista', icono: 'rotate-ccw', accion: 'devolver' }));
    }
    acciones.push(boton({ texto: secuencia ? 'Ver todo junto' : 'Ver la secuencia', icono: secuencia ? 'eye' : 'play', accion: 'secuencia', foco: 'secuencia' }));

    const razon = a.tipo === 'devolucion'
      ? `Devolución de la venta ${esc(a.referencia.venta)}`
      : esc(a.motivo.replace(/^Disputa D-\d+: /, 'Disputa: '));

    const encab = encabezado({
      titulo: `Ajuste ${esc(a.id)}`,
      descripcion: `${esc(v.nombre)} · ${razon}`,
      migas: migas('<a href="#/ajustes">Ajustes</a>', esc(a.id)),
      acciones: acciones.join(''),
    });

    const resumen = `<section class="panel" data-desde="1"><div class="panel__cuerpo"><div class="datos-fila">
      ${dato('Ajuste solicitado', `<span class="${monto < 0 ? 'negativo' : 'positivo'}">${q(monto, { signo: true })}</span>`, monto < 0 ? 'A descontar' : 'A favor del vendedor', { grande: true })}
      ${dato('Período de origen', esc(nombrePeriodo(a.periodoOrigen)), chip('positivo', 'Pagado: no se reabre', 'lock'))}
      ${dato('Se aplica en', esc(nombrePeriodo(a.periodoAplicacion)), esc(estadoPeriodo(a.periodoAplicacion)))}
      ${dato('Estado', chipAjuste(a.estado), necesitaGerente ? `Supera ${q(LIMITE_AJUSTE_SIN_GERENTE)}: lo autoriza el Gerente` : 'Dentro del límite del Analista')}
    </div></div></section>`;

    const barra = `<div style="margin-bottom:var(--e-4)">${barraCumplimiento({ cumplimiento: rr.recalculado.cumplimiento, escalones: rr.config.R001.escalones, anterior: rr.original.cumplimiento })}</div>`;
    const bloque1 = panel({
      titulo: `Antes y después de ${nombrePeriodo(a.periodoOrigen)}`,
      subtitulo: `Con la misma versión de reglas (${esc(periodoRegistro(a.periodoOrigen)?.corrida?.version ?? '')}), no con las actuales. Un período pagado no se reabre.`,
      cuerpo: `<div data-desde="1">${barra}</div><div data-desde="4">${comparador(rr, a)}</div>`, id: 'bloque-antes',
    });
    const frase = a.tipo === 'devolucion' && rr.cambioDeEscalon
      ? `<p class="frase-destacada" data-desde="3"><strong>Al devolverse ${esc(a.referencia.venta)}, ${esc(v.nombre.split(' ')[0])} bajó de ${pct(rr.original.cumplimiento)} a ${pct(rr.recalculado.cumplimiento)}.</strong> Cruzó el 100 %: su tasa pasó de ${pct(rr.original.tasa)} a ${pct(rr.recalculado.tasa)}, y esa tasa se aplica a todo lo que vendió en ${esc(nombrePeriodo(a.periodoOrigen))}.</p>` : '';
    const bloque2 = panel({
      titulo: `Por qué son ${q(Math.abs(monto))} y no ${q(Math.abs(rr.componentes.valorVentas))}`,
      subtitulo: 'La diferencia se separa en lo evidente y en lo que casi nadie espera.', cuerpo: `<div data-desde="5">${separacion(rr, a)}</div>${frase}`, id: 'bloque-separacion',
    });
    const bloque3 = panel({
      titulo: `Aplicación en ${nombrePeriodo(a.periodoAplicacion)}`, subtitulo: 'Un ajuste negativo descuenta como máximo el 50 % de la comisión del período.',
      cuerpo: `<div data-desde="6">${aplicacionHtml(a, info)}</div>`, id: 'bloque-aplicacion',
    });
    const comentarios = a.comentarios.length ? `<ul class="bandeja" style="margin-top:12px">${a.comentarios.map((c) => `<li class="pendiente" style="grid-template-columns:28px 1fr"><span class="pendiente__icono pendiente__icono--acento">${ico('message-square')}</span><div><div class="pendiente__titulo">${esc(c.por)} · ${esc(fmtFechaHora(c.fecha))}</div><p class="pendiente__texto">${esc(c.texto)}</p></div></li>`).join('')}</ul>` : '';
    const bloque4 = panel({
      titulo: 'Autorización', subtitulo: 'Analista prepara; Gerente Comercial autoriza todo ajuste mayor a Q1,000.',
      cuerpo: `${lineaAjuste(a)}${comentarios}${!gerente && !analista ? motivoVisible('Auditoría consulta: no puede modificar ajustes.') : ''}${a.estado === 'pendiente' && !gerente ? motivoVisible(motivoSinPermiso('ajuste.autorizar')) : ''}`,
    });

    const control = `<div class="secuencia-control" id="control-secuencia" hidden>
      <button type="button" class="btn btn--s" id="sec-reproducir" aria-pressed="false">${ico('play')} <span>Reproducir</span></button>
      <button type="button" class="btn btn--s" id="sec-anterior" aria-label="Paso anterior">${ico('chevron-left')}</button>
      <button type="button" class="btn btn--s" id="sec-siguiente" aria-label="Paso siguiente">${ico('chevron-right')}</button>
      <div class="secuencia-pasos" id="sec-puntos" role="group" aria-label="Pasos de la secuencia"></div>
      <div class="secuencia-texto" id="sec-texto" aria-live="polite"></div></div>`;

    const html = `<div class="pagina">${encab}<div class="pila">
      ${control}${resumen}${bloque1}${bloque2}${bloque3}${bloque4}</div></div>`;

    const dev = rr.quitadas[0];
    const PASOS = a.tipo === 'devolucion' && dev && rr.cambioDeEscalon ? [
      ['Enero, como se pagó', `${esc(v.nombre)} cerró enero con ${fmtQ(rr.original.netoComisionable)} y ${fmtPct(rr.original.cumplimiento)} de su meta: tasa de ${fmtPct(rr.original.tasa)} y ${fmtQ(rr.original.total)} pagados.`],
      [`${fmtFecha(dev.fechaDevolucion)}: se devuelve ${dev.id}`, `El cliente devuelve ${dev.producto} (${fmtQ(dev.neto)}). Enero ya está pagado y no se reabre.`],
      [`El cumplimiento baja de ${fmtPct(rr.original.cumplimiento)} a ${fmtPct(rr.recalculado.cumplimiento)}`, 'Se recalcula enero con las reglas de enero.'],
      [`Cruza el 100 %: la tasa pasa de ${fmtPct(rr.original.tasa)} a ${fmtPct(rr.recalculado.tasa)}`, `La tasa nueva se aplica a todo lo vendido. Total de enero: ${fmtQ(rr.recalculado.total)}.`],
      [`${fmtQ(Math.abs(rr.componentes.valorVentas))} por la venta, ${fmtQ(Math.abs(rr.componentes.efectoEscalon))} por el escalón`, `La reversión es de ${fmtQ(Math.abs(monto))}, no de ${fmtQ(Math.abs(rr.componentes.valorVentas))}.`],
      [`En ${mesDeNombre(a.periodoAplicacion)} se descuenta hasta el 50 %`, info ? `Comisión de ${fmtQ(info.r.comisionBase)}: el límite es ${fmtQ(info.ap.limite)}.` : 'El descuento tiene un límite.'],
      [info ? `Neto de ${fmtQ(info.r.comisionBase + info.ap.aplicado)} y saldo de ${fmtQ(info.ap.saldo)} para ${mesDeNombre(sigPeriodo(a.periodoAplicacion))}` : 'Saldo para el período siguiente', 'Un saldo que se arrastra, con una cifra que alguien tiene que poder defender.'],
    ] : [];

    return {
      html,
      titulo: `Ajuste ${a.id}`,
      montar(raiz) {
        const control_ = raiz.querySelector('#control-secuencia');
        if (!PASOS.length) return;
        let paso = 0;
        let activa = false;
        let temporizador = null;
        const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const texto = raiz.querySelector('#sec-texto');
        const puntos = raiz.querySelector('#sec-puntos');
        const bloques = [...raiz.querySelectorAll('[data-desde]')];
        const foco = { 1: '#bloque-antes', 2: '#bloque-antes', 3: '#bloque-antes', 4: '#bloque-antes', 5: '#bloque-separacion', 6: '#bloque-aplicacion', 7: '#bloque-aplicacion' };
        puntos.innerHTML = PASOS.map((_, i) => `<button type="button" aria-label="Paso ${i + 1}"></button>`).join('');
        const dibujar = () => {
          bloques.forEach((b) => {
            const visible = !activa || Number(b.dataset.desde) <= paso + 1;
            b.classList.toggle('sec-oculto', !visible);
          });
          raiz.querySelectorAll('.sec-foco').forEach((e) => e.classList.remove('sec-foco'));
          if (activa) raiz.querySelector(foco[paso + 1])?.classList.add('sec-foco');
          [...puntos.children].forEach((b, i) => { b.toggleAttribute('aria-current', i === paso); if (i === paso) b.setAttribute('aria-current', 'step'); b.classList.toggle('pasado', i < paso); });
          texto.innerHTML = `<strong>${paso + 1}. ${PASOS[paso][0]}</strong>${PASOS[paso][1]}`;
          control_.hidden = !activa;
        };
        const ir = (n) => { paso = Math.max(0, Math.min(PASOS.length - 1, n)); dibujar(); };
        const parar = () => { clearInterval(temporizador); temporizador = null; const b = raiz.querySelector('#sec-reproducir'); b.setAttribute('aria-pressed', 'false'); b.querySelector('span').textContent = 'Reproducir'; };
        const reproducir = () => {
          const b = raiz.querySelector('#sec-reproducir');
          b.setAttribute('aria-pressed', 'true'); b.querySelector('span').textContent = 'Pausar';
          if (paso >= PASOS.length - 1) ir(0);
          temporizador = setInterval(() => { if (paso >= PASOS.length - 1) { parar(); return; } ir(paso + 1); }, 2600);
        };
        puntos.addEventListener('click', (e) => { const i = [...puntos.children].indexOf(e.target.closest('button')); if (i >= 0) { parar(); ir(i); } });
        raiz.querySelector('#sec-anterior').addEventListener('click', () => { parar(); ir(paso - 1); });
        raiz.querySelector('#sec-siguiente').addEventListener('click', () => { parar(); ir(paso + 1); });
        raiz.querySelector('#sec-reproducir').addEventListener('click', () => (temporizador ? parar() : reproducir()));
        raiz.__secuencia = {
          alternar() { activa = !activa; if (activa) { ir(0); window.scrollTo({ top: 0 }); if (!reducido) reproducir(); } else { parar(); dibujar(); } return activa; },
          activa: () => activa,
        };
        if (secuencia) raiz.__secuencia.alternar();
      },
      acciones: {
        secuencia(_, boton_) {
          const raiz = document.getElementById('principal');
          if (!raiz.__secuencia) { ctx.avisar('Esta secuencia está disponible para ajustes por devolución con cambio de escalón.', 'negativo'); return; }
          const on = raiz.__secuencia.alternar();
          boton_.lastChild.textContent = on ? 'Ver todo junto' : 'Ver la secuencia';
        },
        async enviar() {
          const filas = [['Vendedor', esc(v.nombre)], ['Ajuste', q(monto, { signo: true })], ['Origen', esc(nombrePeriodo(a.periodoOrigen))], ['Se aplica en', esc(nombrePeriodo(a.periodoAplicacion))]];
          if (info) filas.push(['Se descuenta', q(info.ap.aplicado)], ['Saldo pendiente', q(info.ap.saldo)]);
          const { confirmado } = await confirmar({
            titulo: necesitaGerente ? `Enviar ${a.id} al Gerente Comercial` : `Autorizar y aplicar ${a.id}`,
            descripcion: necesitaGerente ? `Supera ${fmtQ(LIMITE_AJUSTE_SIN_GERENTE)}: requiere la autorización del Gerente Comercial.` : `Está dentro del límite de ${fmtQ(LIMITE_AJUSTE_SIN_GERENTE)} del Analista.`,
            resumen: filas, textoConfirmar: necesitaGerente ? 'Enviar a autorización' : 'Autorizar y aplicar',
          });
          if (!confirmado) return;
          const res = ctx.acc.enviarAjuste(a.id);
          ctx.avisar(res.ok ? (res.estado === 'pendiente' ? 'Ajuste enviado al Gerente Comercial.' : 'Ajuste autorizado.') : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        async autorizar() {
          const filas = [['Vendedor', esc(v.nombre)], ['Qué corrige', razon], ['Ajuste solicitado', `<strong>${q(monto, { signo: true })}</strong>`], ['Origen', `${esc(nombrePeriodo(a.periodoOrigen))} (pagado, no se reabre)`]];
          if (info) filas.push([`Se descuenta en ${nombrePeriodo(a.periodoAplicacion)}`, q(info.ap.aplicado)], ['Neto de comisión', q(info.r.comisionBase + info.ap.aplicado)], ['Saldo para el período siguiente', q(info.ap.saldo)]);
          const { confirmado, valor } = await confirmar({
            titulo: `Autorizar el ajuste ${a.id}`, descripcion: 'Queda registrado con tu nombre y entra en el cálculo del período de aplicación.', resumen: filas,
            campo: { etiqueta: 'Comentario', requerido: false, placeholder: 'Opcional.' }, textoConfirmar: 'Autorizar ajuste',
          });
          if (!confirmado) return;
          const res = ctx.acc.autorizarAjuste(a.id, valor);
          ctx.avisar(res.ok ? `Ajuste ${a.id} autorizado.` : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        async devolver() {
          const { confirmado, valor } = await confirmar({
            titulo: `Devolver ${a.id} al Analista`, descripcion: 'El Analista lo revisa y lo vuelve a enviar.',
            campo: { etiqueta: 'Qué debe revisar', requerido: true, mensajeRequerido: 'Explica qué debe revisar el Analista.' }, textoConfirmar: 'Devolver al Analista',
          });
          if (!confirmado) return;
          const res = ctx.acc.devolverAjuste(a.id, valor);
          ctx.avisar(res.ok ? 'Ajuste devuelto al Analista.' : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
      },
    };
  },
};

function mesDeNombre(periodo) {
  return nombrePeriodo(periodo).split(' ')[0];
}

const lista = {
  id: 'ajustes',
  titulo: 'Ajustes',
  vacio: { titulo: 'Todavía no hay ajustes', texto: 'Un ajuste nace de una devolución, una venta tardía o una disputa resuelta a favor del vendedor.' },
  render(ctx) {
    const ajustes = [...obtener().ajustes].sort((x, y) => y.preparadoEn.localeCompare(x.preparadoEn));
    const pend = ajustes.filter((a) => a.estado === 'pendiente').length;
    const filas = ajustes.map((a) => `<tr>
      <th scope="row"><a class="enlace-fila mono" href="#/ajuste/${esc(a.id)}">${esc(a.id)}</a></th>
      <td>${esc(VENDEDOR[a.vendedorId].nombre)}</td><td>${esc(a.motivo)}</td>
      <td>${esc(nombrePeriodo(a.periodoOrigen))} → ${esc(nombrePeriodo(a.periodoAplicacion))}</td>
      <td class="num">${q(a.montoSolicitado, { signo: true })}</td><td>${chipAjuste(a.estado)}</td><td>${esc(a.preparadoPor)}</td></tr>`).join('');
    return {
      html: `<div class="pagina">${encabezado({ titulo: 'Ajustes', descripcion: 'Correcciones de períodos ya pagados. Un período pagado no se reabre: se corrige en el período abierto más cercano.' })}
        <div class="pila">${pend && ctx.rol === 'gerente' ? nota('aviso', `<strong>${pend} ajuste${pend > 1 ? 's' : ''} esperan tu autorización.</strong>`) : ''}
        ${ajustes.length ? panel({ cuerpo: `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Ajustes</caption>
          <thead><tr><th scope="col">Ajuste</th><th scope="col">Vendedor</th><th scope="col">Motivo</th><th scope="col">Origen y aplicación</th><th scope="col" class="num">Monto</th><th scope="col">Estado</th><th scope="col">Preparó</th></tr></thead><tbody>${filas}</tbody></table></div>`, sinRelleno: true }) : estadoVista('vacio', lista.vacio)}
        </div></div>`,
    };
  },
};

export { detalle as ajuste, lista as ajustes };
export { calculo, fmtFechaLarga, explicable };
