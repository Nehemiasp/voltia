// P03 · Detalle de comisión con trazabilidad.
// Todos los roles con permiso ven la misma verdad con distinto nivel de detalle.

import {
  calculo, resultado, estadoResultado, corteDe, configDe, periodoRegistro, estadoPeriodo, hayResultados, observaciones, eventosDe,
  decisionTope, aPagar, ajusteSobre, fechaHoy, metasDeCorrida, periodosConResultados,
} from '../selectores.js';
import { calcularPeriodo, construirCascada, recalcularRetroactivo } from '../../engine/calculo.js';
import { VENDEDOR, TIENDA } from '../../engine/datos.js';
import { ventasDe } from '../../engine/ventas.js';
import { CATEGORIAS } from '../../engine/reglas.js';
import { esc, fmtQ, fmtPct, fmtFecha, fmtFechaLarga, nombrePeriodo, mesDe } from '../../engine/formato.js';
import {
  ico, chip, chipResultado, chipAjuste, q, pct, explicable, nota, panel, encabezado, dato, boton, motivoVisible, estadoVista,
  barraCumplimiento, cascada, eventos, thOrden,
} from '../ui.js';
import { explicar, htmlExplicacion } from '../explicaciones.js';
import { confirmar } from '../dialogos.js';
import { veResultadosDe, puede, motivoSinPermiso } from '../permisos.js';
import { periodoDe, selectorPeriodo, enlazarSelectores, migas, sinAcceso } from './comun.js';

function hayDevolucionPosterior(vendedorId, periodo) {
  const corte = corteDe(periodo);
  return ventasDe(vendedorId, periodo).some((l) => l.estado === 'devuelta' && l.fechaDevolucion > corte && l.fechaDevolucion <= fechaHoy());
}

function resultadoRecalculado(vendedorId, periodo) {
  const config = configDe(periodo);
  const calc = calcularPeriodo({ periodo, config, corte: fechaHoy(), metas: metasDeCorrida(periodo) });
  return calc.porVendedor[vendedorId];
}

function lineasDelDetalle(r) {
  const factor = (cat) => (r.tasa !== undefined ? r.porCategoria.find((c) => c.categoria === cat)?.factor ?? 1 : 1);
  const todas = [
    ...r.comisionables.map((l) => ({ ...l, tipo: 'comisionable', comision: r.bloqueado ? null : Math.round(l.neto * r.tasa * factor(l.categoria)) / 100 })),
    ...r.excluidas.map((l) => ({ ...l, tipo: 'excluida', comision: null })),
    ...r.devueltas.map((l) => ({ ...l, tipo: 'devuelta', comision: null })),
  ];
  return todas.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
}

function filaVenta(l) {
  const atenuada = l.tipo !== 'comisionable';
  const notaHtml = l.tipo === 'excluida'
    ? `${chip('aviso', 'Excluida · R-006', 'ban')}<div class="diminuto secundario" style="margin-top:2px;max-width:34ch;white-space:normal">${esc(l.motivo)}</div>`
    : l.tipo === 'devuelta'
      ? `${chip('negativo', l.motivo, 'rotate-ccw')}`
      : '';
  return `<tr class="${atenuada ? 'fila--atenuada' : ''}">
    <td><span class="mono">${esc(l.id)}</span></td>
    <td data-val="${esc(l.fecha)}">${esc(fmtFecha(l.fecha))}</td>
    <td><span class="${atenuada ? 'atenuable' : ''}">${esc(l.producto)}</span></td>
    <td>${esc(l.categoria)}</td>
    <td class="num">${l.descuentoPct ? esc(fmtPct(l.descuentoPct)) : '<span class="secundario">—</span>'}</td>
    <td class="num" data-val="${l.neto}">${q(l.neto)}</td>
    <td class="num" data-val="${l.comision ?? -1}">${l.comision === null ? '<span class="secundario">—</span>' : q(l.comision)}</td>
    <td>${notaHtml}</td></tr>`;
}

function tablaVentas(r, agrupar) {
  const lineas = lineasDelDetalle(r);
  let cuerpo;
  if (agrupar) {
    cuerpo = CATEGORIAS.map((cat) => {
      const grupo = lineas.filter((l) => l.categoria === cat);
      if (!grupo.length) return '';
      const sub = grupo.filter((l) => l.tipo === 'comisionable');
      return `<tr class="grupo"><td colspan="5">${esc(cat)} · ${grupo.length} ventas</td>
        <td class="num">${q(sub.reduce((s, l) => s + l.neto, 0))}</td><td class="num">${q(sub.reduce((s, l) => s + l.comision, 0))}</td><td></td></tr>${grupo.map(filaVenta).join('')}`;
    }).join('');
  } else {
    cuerpo = lineas.map(filaVenta).join('');
  }
  const comisionables = lineas.filter((l) => l.tipo === 'comisionable');
  return `<div class="tabla-scroll"><table class="tabla">
    <caption class="solo-lectores">Ventas del período de ${esc(r.nombre)}</caption>
    <thead><tr><th scope="col">Venta</th>${thOrden('Fecha')}<th scope="col">Producto</th><th scope="col">Categoría</th><th scope="col" class="num">Descuento</th>${thOrden('Monto neto', { num: true })}${thOrden('Comisión de la venta', { num: true })}<th scope="col">Nota</th></tr></thead>
    <tbody>${cuerpo}</tbody>
    <tfoot><tr><td colspan="5">Venta comisionable (${comisionables.length} ventas)</td><td class="num">${q(r.netoComisionable)}</td><td class="num">${q(comisionables.reduce((s, l) => s + l.comision, 0))}</td><td></td></tr></tfoot>
  </table></div>`;
}

function historial(vendedorId, periodo) {
  const lista = eventosDe({ periodo }).filter((e) =>
    e.vendedorId === vendedorId
    || e.entidad?.tipo === 'Corrida'
    || (e.entidad?.tipo === 'Período' && ['Enviar a revisión', 'Aprobar período', 'Marcar como pagado', 'Exportar pago'].includes(e.accion)));
  return eventos(lista.sort((a, b) => a.fecha.localeCompare(b.fecha)), { vacio: 'Este resultado todavía no tiene eventos.' });
}

export default {
  id: 'detalle',
  titulo: 'Detalle de comisión',
  render(ctx) {
    const vendedorId = ctx.param ?? ctx.st.vendedorActivo;
    const v = VENDEDOR[vendedorId];
    if (!v) return { html: sinAcceso(ctx, 'No encontramos a este vendedor.') };
    const periodo = periodoDe(ctx);
    const reg = periodoRegistro(periodo);
    const r0 = hayResultados(periodo) ? resultado(vendedorId, periodo) : null;
    const tiendaId = r0?.tienda ?? v.tienda;
    if (!veResultadosDe({ rol: ctx.rol, tiendaJefe: ctx.st.tiendaJefe, vendedorActivo: ctx.st.vendedorActivo }, vendedorId, tiendaId)) {
      return { html: sinAcceso(ctx, ctx.rol === 'jefe' ? 'Un Jefe de tienda ve solo los resultados de su tienda.' : 'Un vendedor ve solo su propio resultado.') };
    }
    if (!r0) {
      return { html: `<div class="pagina">${encabezado({ titulo: esc(v.nombre), migas: migas('Detalle'), acciones: selectorPeriodo(ctx, periodo, { conResultados: false }) })}
        ${estadoVista('vacio', { titulo: hayResultados(periodo) ? `${v.nombre} no figura en ${nombrePeriodo(periodo)}` : `${nombrePeriodo(periodo)} todavía no se calcula`, texto: hayResultados(periodo) ? 'Esta persona aún no había ingresado en ese período.' : `El período está “${estadoPeriodo(periodo)}”. El detalle aparece cuando el Analista ejecuta la corrida.` })}</div>` };
    }

    const simple = ctx.rol === 'vendedor';
    const modo = ctx.query.m === 'hoy' && hayDevolucionPosterior(vendedorId, periodo) ? 'hoy' : 'pagado';
    const r = modo === 'hoy' ? resultadoRecalculado(vendedorId, periodo) : r0;
    const config = configDe(periodo);
    const estado = estadoResultado(periodo, r0);
    const tienda = TIENDA[r.tienda];
    const agrupar = ctx.query.g === '1';
    const obsAbiertas = observaciones(periodo, { abiertas: true, vendedorId });
    const ajustes = ajusteSobre(vendedorId, periodo);
    const devolucion = hayDevolucionPosterior(vendedorId, periodo);
    const pasos = construirCascada(r, config);
    const decision = decisionTope(vendedorId, periodo);
    const pago = aPagar(r, periodo);

    const corrida = reg.corrida;
    const meta = r.meta;
    const siguiente = !r.bloqueado ? config.R001.escalones[r.escalon.indice + 1] : null;
    const faltaSiguiente = siguiente ? Math.max(0, Math.ceil((siguiente.desde / 100) * meta - r.netoComisionable)) : 0;

    // ----- avisos de contexto -----
    const avisos = [];
    if (devolucion && ctx.rol !== 'vendedor') {
      const dev = ventasDe(vendedorId, periodo).find((l) => l.estado === 'devuelta');
      avisos.push(nota('aviso', `<strong>${esc(dev.id)} se devolvió el ${esc(fmtFechaLarga(dev.fechaDevolucion).replace(/ de \d{4}$/, ''))}.</strong>
        <p>Este resultado se pagó con la corrida del ${esc(fmtFechaLarga(corteDe(periodo)))} y un período pagado no se reabre (D-02). La diferencia se corrige con ${ajustes.length ? `el ajuste <a href="#/ajuste/${esc(ajustes[0].id)}">${esc(ajustes[0].id)}</a>` : 'un ajuste en el período abierto más cercano'}.</p>`));
    }
    if (obsAbiertas.length) {
      avisos.push(nota('negativo', `<strong>Observada por ${esc(obsAbiertas[0].por)}.</strong><p>${esc(obsAbiertas[0].motivo)}</p><p class="diminuto secundario">La observación bloquea la aprobación de este vendedor, no la del resto de la tienda (D-06).</p>`));
    }
    if (r.tope.excede && ctx.rol !== 'vendedor') {
      avisos.push(nota(decision ? 'info' : 'aviso', decision
        ? `<strong>Comisión sobre el tope: ${decision.decision === 'autorizar' ? 'autorizada' : 'limitada al tope'} por ${esc(decision.por)}.</strong>${decision.comentario ? `<p>${esc(decision.comentario)}</p>` : ''}`
        : `<strong>Requiere autorización.</strong><p>La comisión de ${q(r.comisionBase)} supera el tope de ${q(r.tope.limite)} por ${q(r.tope.exceso)}. No se recorta: pasa a la bandeja del Gerente Comercial (D-04).</p>`));
    }
    if (ctx.rol === 'auditoria') avisos.push(nota('info', '<strong>Vista de solo lectura.</strong> Los números son los de la corrida; nada de aquí se puede modificar.'));

    // ----- acciones por rol -----
    const acciones = [];
    if (ctx.rol === 'jefe' || ctx.rol === 'analista' || ctx.rol === 'gerente') {
      const puedeObs = estadoPeriodo(periodo) === 'En revisión' && !obsAbiertas.length;
      const okRol = puede(ctx.rol, 'observacion.marcar') && (ctx.rol !== 'jefe' || v.tienda === ctx.st.tiendaJefe);
      if (okRol) acciones.push(boton({ texto: 'Marcar observación', icono: 'flag', accion: 'observar', foco: 'observar', deshabilitado: !puedeObs, motivo: obsAbiertas.length ? 'Este vendedor ya tiene una observación abierta.' : 'Las observaciones se marcan cuando el período está en revisión.' }));
    }
    if (ctx.rol === 'gerente' && r.tope.excede && !decision && estadoPeriodo(periodo) === 'En revisión') {
      acciones.push(boton({ texto: 'Autorizar excepción', clase: 'btn--primario', icono: 'badge-check', accion: 'tope-autorizar', foco: 'tope-autorizar' }));
      acciones.push(boton({ texto: `Limitar a ${fmtQ(r.tope.limite)}`, icono: 'scale', accion: 'tope-limitar' }));
    }
    if (ctx.rol === 'analista' && devolucion && !ajustes.length) acciones.push(boton({ texto: 'Preparar ajuste', clase: 'btn--primario', icono: 'git-compare', accion: 'preparar-ajuste', foco: 'preparar-ajuste' }));
    if (ajustes.length && !simple) acciones.push(boton({ texto: `Ver ajuste ${ajustes[0].id}`, icono: 'git-compare', href: `#/ajuste/${ajustes[0].id}` }));
    if (r.bloqueado && ctx.rol === 'analista') acciones.push(boton({ texto: 'Cargar la meta', clase: 'btn--primario', icono: 'flag', href: `#/periodos?p=${periodo}` }));

    // ----- bloques -----
    const pestanasModo = devolucion && !simple
      ? `<div class="pestanas" role="tablist" aria-label="Versión del resultado">
          <a role="tab" href="#/detalle/${vendedorId}?p=${periodo}" ${modo === 'pagado' ? 'aria-current="page"' : ''}>Como se pagó (corrida del ${esc(fmtFecha(corteDe(periodo)))})</a>
          <a role="tab" href="#/detalle/${vendedorId}?p=${periodo}&m=hoy" ${modo === 'hoy' ? 'aria-current="page"' : ''}>Recalculado con lo que sabemos hoy</a></div>` : '';

    const resumen = `<div class="panel"><div class="panel__cuerpo"><div class="datos-fila">
      ${dato(simple ? 'Tu comisión del período' : 'Total del período', explicable('total', q(r.total)), r.tope.excede && pago.retenido > 0 ? `${q(pago.retenido)} ${decision ? 'retenidos' : 'pendientes de autorización'}` : estado === 'pagada' || estado === 'ajustada' ? 'Ya pagado' : '', { grande: true })}
      ${dato('Venta comisionable', explicable('comisionable', q(r.netoComisionable)), r.excluidas.length || r.devueltas.length ? `${r.excluidas.length + r.devueltas.length} venta${r.excluidas.length + r.devueltas.length > 1 ? 's' : ''} fuera, con su motivo` : 'Todas las ventas cuentan')}
      ${r.bloqueado ? dato('Cumplimiento', '<span class="aviso-texto">Sin meta</span>', 'No se asignó 0 %') : dato('Cumplimiento', explicable('cumplimiento', pct(r.cumplimiento)), `Meta ${q(meta)}`)}
      ${r.bloqueado ? '' : dato('Tasa del escalón', explicable('tasa', pct(r.tasa)), simple ? 'Aplica a todo lo que vendiste' : 'Sobre toda la venta comisionable')}
      ${simple ? '' : dato('Corrida y reglas', `<span class="mono">${esc(corrida?.id ?? '—')}</span>`, `Reglas ${esc(corrida?.version ?? '')} · ${esc(corrida ? fmtFecha(corrida.fecha) : '')}`)}
    </div></div></div>`;

    const bloqueCumplimiento = r.bloqueado
      ? nota('aviso', `<strong>Bloqueada: falta meta.</strong><p>${esc(v.nombre)} no tiene una meta cargada para ${esc(nombrePeriodo(periodo))}. La corrida no le asigna 0 %: queda a la espera de que el Analista cargue la meta y ejecute la corrida de nuevo.</p>`)
      : `${barraCumplimiento({ cumplimiento: r.cumplimiento, escalones: config.R001.escalones })}
        <p class="frase-destacada"><strong>${simple ? `Tu tasa de ${pct(r.tasa)} se aplica a todo lo que vendiste este mes.` : `La tasa de ${pct(r.tasa)} se aplica a toda la venta comisionable del período, no solo al excedente sobre la meta.`}</strong>
        ${siguiente ? ` ${simple ? 'Te faltaron' : 'Faltaron'} ${q(faltaSiguiente)} para el escalón de ${pct(siguiente.desde)} (${pct(siguiente.tasa)}).` : ' Ya está en el escalón más alto.'}</p>`;

    const bloqueCascada = r.bloqueado ? '' : panel({
      titulo: 'De lo vendido a la comisión', subtitulo: 'Regla por regla, en el orden de aplicación. Pulsa un número para ver de dónde sale.',
      cuerpo: cascada(pasos), sinRelleno: true,
    });

    const filtros = `<div class="tabla-filtros"><label class="opcion" style="font-size:var(--t-s)"><input type="checkbox" id="agrupar" ${agrupar ? 'checked' : ''}> Agrupar por categoría</label></div>`;
    const bloqueVentas = panel({
      titulo: 'Ventas del período', subtitulo: `${lineasDelDetalle(r).length} ventas registradas. Las excluidas y devueltas se muestran atenuadas, con su motivo (D-03).`,
      acciones: filtros, cuerpo: tablaVentas(r, agrupar), sinRelleno: true,
    });

    const bloqueHistorial = simple ? '' : panel({ titulo: 'Historial de este resultado', cuerpo: historial(vendedorId, periodo) });

    const migasHtml = migas(simple ? 'Mi comisión' : 'Resultados', esc(nombrePeriodo(periodo)), esc(v.nombre));
    const html = `<div class="pagina">
      ${encabezado({
        titulo: `${esc(v.nombre)} <span class="secundario" style="font-weight:400">· ${esc(tienda.nombre)}</span>`,
        descripcion: `${esc(nombrePeriodo(periodo))} · ${chipResultado(estado)}${ajustes.some((a) => a.estado === 'pendiente') ? ' ' + chip('aviso', 'Ajuste pendiente de autorización', 'hourglass') : ''}`,
        migas: migasHtml,
        acciones: `${selectorPeriodo(ctx, periodo)}${acciones.join('')}`,
      })}
      <div class="pila">
        ${avisos.join('')}${pestanasModo}
        ${resumen}
        ${panel({ titulo: 'Cumplimiento de la meta', cuerpo: bloqueCumplimiento })}
        <div class="rejilla ${simple || r.bloqueado ? '' : 'rejilla--principal-ancha'}">
          ${bloqueCascada}
          ${bloqueHistorial}
        </div>
        ${bloqueVentas}
      </div></div>`;

    return {
      html,
      titulo: `${v.nombre} · ${nombrePeriodo(periodo)}`,
      explicar: (clave) => {
        const e = explicar(clave, { r, config, periodoTexto: `Corrida ${corrida?.id ?? ''} con las reglas ${corrida?.version ?? ''}.` });
        return e ? { titulo: e.titulo, html: htmlExplicacion(e) } : null;
      },
      montar(raiz) {
        enlazarSelectores(raiz);
        raiz.querySelector('#agrupar')?.addEventListener('change', (e) => {
          const params = new URLSearchParams(ctx.ruta.hash.split('?')[1] ?? '');
          if (e.target.checked) params.set('g', '1'); else params.delete('g');
          location.hash = `#/detalle/${vendedorId}?${params.toString()}`;
        });
      },
      acciones: {
        async observar() {
          const { confirmado, valor } = await confirmar({
            titulo: `Marcar una observación sobre ${v.nombre}`,
            descripcion: 'La observación bloquea la aprobación de este vendedor. El resto de la tienda sigue su curso.',
            resumen: [['Vendedor', esc(v.nombre)], ['Período', esc(nombrePeriodo(periodo))], ['Comisión', q(r.total)]],
            campo: { etiqueta: 'Motivo de la observación', requerido: true, placeholder: 'Por ejemplo: falta una venta del 28 de enero.', mensajeRequerido: 'Escribe el motivo para que el Analista sepa qué revisar.' },
            textoConfirmar: 'Marcar observación',
          });
          if (!confirmado) return;
          const res = ctx.acc.marcarObservacion({ vendedorId, periodo, motivo: valor });
          ctx.avisar(res.ok ? `Observación marcada sobre ${v.nombre}.` : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        async 'tope-autorizar'() {
          const { confirmado, valor } = await confirmar({
            titulo: `Autorizar la excepción de tope de ${v.nombre}`,
            resumen: [['Comisión', q(r.comisionBase)], ['Tope', q(r.tope.limite)], ['Exceso que se autoriza', q(r.tope.exceso)], ['Se pagará', q(r.total)]],
            aviso: { variante: 'aviso', html: 'Es una decisión de negocio que corresponde a una persona (D-04). Queda registrada con tu nombre.' },
            campo: { etiqueta: 'Motivo', requerido: false, placeholder: 'Por ejemplo: la campaña de electrónica superó lo previsto.' },
            textoConfirmar: 'Autorizar excepción',
          });
          if (!confirmado) return;
          const res = ctx.acc.decidirTope(vendedorId, periodo, 'autorizar', valor);
          ctx.avisar(res.ok ? 'Excepción autorizada.' : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        async 'tope-limitar'() {
          const { confirmado, valor } = await confirmar({
            titulo: `Limitar la comisión de ${v.nombre} al tope`,
            resumen: [['Comisión calculada', q(r.comisionBase)], ['Se pagará', q(r.tope.limite + r.bono.monto)], ['No se paga', q(r.tope.exceso)]],
            campo: { etiqueta: 'Motivo', requerido: false },
            textoConfirmar: `Limitar a ${fmtQ(r.tope.limite)}`, peligro: true,
          });
          if (!confirmado) return;
          const res = ctx.acc.decidirTope(vendedorId, periodo, 'limitar', valor);
          ctx.avisar(res.ok ? 'Comisión limitada al tope.' : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        'preparar-ajuste'() {
          const rr = recalcularRetroactivo({ vendedorId, periodo, config, corteOriginal: corteDe(periodo), corteNuevo: fechaHoy() });
          const dev = rr.ventasDevueltas[0];
          const abierto = Object.keys(ctx.st.periodos).sort().find((p) => p > periodo && ctx.st.periodos[p].estado !== 'Pagado');
          const res = ctx.acc.crearAjuste({
            vendedorId, tipo: 'devolucion', motivo: `Devolución de la venta ${dev.id}`, periodoOrigen: periodo, periodoAplicacion: abierto,
            montoSolicitado: rr.diferencia, referencia: { venta: dev.id },
          });
          if (res.ok) ctx.ir(`#/ajuste/${res.id}`);
          else ctx.avisar(res.motivo, 'negativo');
        },
      },
    };
  },
};

export { mesDe, motivoSinPermiso, motivoVisible };
