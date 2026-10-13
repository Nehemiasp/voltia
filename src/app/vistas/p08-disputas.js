// P08 · Disputas. El vendedor reclama desde su detalle; el Analista analiza con la trazabilidad al lado.

import { obtener } from '../estado.js';
import { resultado, hayResultados, estadoPeriodo, periodosDisponibles, buscarVentas, configDe, corteDe } from '../selectores.js';
import { simularReasignacion } from '../acciones.js';
import { construirCascada } from '../../engine/calculo.js';
import { ventasDe } from '../../engine/ventas.js';
import { VENDEDOR, TIENDA } from '../../engine/datos.js';
import { esc, fmtQ, fmtFecha, fmtFechaHora, nombrePeriodo } from '../../engine/formato.js';
import { ico, chip, chipDisputa, chipAjuste, q, pct, nota, panel, encabezado, boton, motivoVisible, estadoVista, cascada, variacion } from '../ui.js';
import { confirmar } from '../dialogos.js';
import { puede, motivoSinPermiso } from '../permisos.js';
import { migas } from './comun.js';

const seleccion = {}; // venta elegida por disputa

function visibles(rol, st) {
  const todas = obtener().disputas;
  if (rol === 'vendedor') return todas.filter((d) => d.vendedorId === st.vendedorActivo);
  if (rol === 'jefe') return todas.filter((d) => VENDEDOR[d.vendedorId].tienda === st.tiendaJefe);
  return todas;
}

// ---------- formulario del vendedor ----------

function formularioNueva(ctx) {
  const vid = ctx.st.vendedorActivo;
  const periodos = periodosDisponibles().filter((p) => ['Aprobado', 'Pagado'].includes(estadoPeriodo(p)) && resultado(vid, p)).reverse();
  if (!periodos.length) return estadoVista('vacio', { titulo: 'Todavía no puedes abrir una disputa', texto: 'Una disputa se abre sobre un mes que ya tiene resultado aprobado.' });
  const periodo = ctx.query.p && periodos.includes(ctx.query.p) ? ctx.query.p : periodos[0];
  const lineas = ventasDe(vid, periodo);
  return `<form class="pila" id="form-disputa" novalidate>
    <div class="campo"><label for="d-periodo">¿Sobre qué mes?</label><select id="d-periodo" name="periodo">${periodos.map((p) => `<option value="${p}" ${p === periodo ? 'selected' : ''}>${esc(nombrePeriodo(p))}</option>`).join('')}</select></div>
    <fieldset class="campo" style="border:0;padding:0;margin:0"><legend class="etiqueta" style="margin-bottom:6px">Ventas en cuestión</legend>
      <div class="lista-ventas" role="group" aria-label="Ventas del mes">${lineas.map((l) => `<label class="opcion venta-opcion"><input type="checkbox" name="ventas" value="${esc(l.id)}"><span>${esc(l.producto)}<small>${esc(l.id)} · ${esc(fmtFecha(l.fecha))} · ${q(l.neto)}${l.descuentoPct > 25 ? ' · excluida por descuento' : ''}${l.estado === 'devuelta' ? ' · devuelta' : ''}</small></span></label>`).join('')}</div>
      <p class="campo__error" data-error="ventas" hidden>${ico('circle-alert')}<span></span></p></fieldset>
    <label class="opcion"><input type="checkbox" name="falta" id="d-falta"><span>Una venta mía no aparece en esta lista</span></label>
    <div id="d-faltante" class="rejilla rejilla--2" hidden>
      <div class="campo"><label for="d-producto">¿Qué vendiste?</label><input id="d-producto" name="producto" type="text" placeholder="Por ejemplo: Lavadora LV-20"></div>
      <div class="campo"><label for="d-fecha">¿Qué día?</label><input id="d-fecha" name="fecha" type="date" min="${periodo}-01" max="${periodo}-31"></div></div>
    <div class="campo"><label for="d-motivo">Cuéntanos qué no coincide</label><textarea id="d-motivo" name="motivo" rows="4" placeholder="Por ejemplo: el cliente pidió entrega el 25 y la venta no está en mi detalle."></textarea>
      <p class="campo__error" data-error="motivo" hidden>${ico('circle-alert')}<span></span></p></div>
    <div class="fila"><button type="submit" class="btn btn--primario" data-foco="enviar-disputa">${ico('send')} Enviar disputa</button><a class="btn" href="#/disputas">Cancelar</a></div></form>`;
}

// ---------- vistas ----------

const lista = {
  id: 'disputas',
  titulo: 'Disputas',
  vacio: { titulo: 'No hay disputas', texto: 'Cuando un vendedor reclame sobre su resultado, el reclamo aparece aquí con su detalle.' },
  render(ctx) {
    const vendedor = ctx.rol === 'vendedor';
    const disputas = visibles(ctx.rol, ctx.st).sort((a, b) => b.abierta.localeCompare(a.abierta));
    const nueva = vendedor && ctx.query.nueva === '1';

    if (vendedor) {
      const cards = disputas.map((d) => `<section class="panel"><div class="panel__cuerpo pila"><div class="fila fila--entre"><strong>${esc(d.id)} · ${esc(nombrePeriodo(d.periodo))}</strong>${chipDisputa(d.estado)}</div>
        <p>${esc(d.motivo)}</p>${d.respuesta ? `<div class="bloque-simple"><strong>Respuesta de Compensaciones</strong><p>${esc(d.respuesta)}</p></div>` : '<p class="secundario pequeno">Compensaciones la está revisando.</p>'}
        <a class="btn" href="#/disputa/${esc(d.id)}">Ver el seguimiento</a></div></section>`).join('');
      return {
        html: `<div class="pagina pagina--movil">${encabezado({ titulo: nueva ? 'Abrir una disputa' : 'Mis disputas', descripcion: nueva ? 'Elige las ventas en cuestión. Compensaciones las revisa con el detalle de tu mes.' : 'Reclamos que abriste sobre tu comisión.', acciones: nueva ? '' : boton({ texto: 'Abrir una disputa', clase: 'btn--primario', icono: 'plus', href: '#/disputas?nueva=1', foco: 'nueva' }) })}
          <div class="pila">${nueva ? formularioNueva(ctx) : disputas.length ? cards : estadoVista('vacio', { titulo: 'No tienes disputas abiertas', texto: 'Si algo de tu comisión no coincide, ábrela aquí y Compensaciones la revisa.', accion: boton({ texto: 'Abrir una disputa', clase: 'btn--primario', href: '#/disputas?nueva=1' }) })}</div></div>`,
        montar(raiz) {
          const form = raiz.querySelector('#form-disputa');
          if (!form) return;
          const falta = raiz.querySelector('#d-falta');
          falta.addEventListener('change', () => { raiz.querySelector('#d-faltante').hidden = !falta.checked; });
          raiz.querySelector('#d-periodo').addEventListener('change', (e) => { location.hash = `#/disputas?nueva=1&p=${e.target.value}`; });
          form.addEventListener('submit', (e) => {
            e.preventDefault();
            const datos = new FormData(form);
            const ventas = datos.getAll('ventas');
            const faltante = datos.get('falta') ? { producto: datos.get('producto') || '', fecha: datos.get('fecha') || '', descripcion: datos.get('motivo') } : null;
            const motivo = String(datos.get('motivo') || '');
            const errV = form.querySelector('[data-error="ventas"]');
            const errM = form.querySelector('[data-error="motivo"]');
            errV.hidden = ventas.length > 0 || Boolean(faltante);
            errV.querySelector('span').textContent = 'Elige al menos una venta o indica la que falta.';
            errM.hidden = Boolean(motivo.trim());
            errM.querySelector('span').textContent = 'Cuéntanos qué parte de tu resultado no coincide.';
            if (!errV.hidden || !errM.hidden) { (!errV.hidden ? form.querySelector('[name=ventas]') : form.querySelector('#d-motivo')).focus(); return; }
            const res = ctx.acc.abrirDisputa({ periodo: datos.get('periodo'), ventas, faltante, motivo });
            ctx.avisar(res.ok ? `Disputa ${res.id} enviada. Te avisamos cuando tenga respuesta.` : res.motivo, res.ok ? 'positivo' : 'negativo');
            if (res.ok) ctx.ir(`#/disputa/${res.id}`);
          });
        },
      };
    }

    const filas = disputas.map((d) => `<tr><th scope="row"><a class="enlace-fila mono" href="#/disputa/${esc(d.id)}">${esc(d.id)}</a></th><td>${esc(VENDEDOR[d.vendedorId].nombre)}</td><td>${esc(TIENDA[VENDEDOR[d.vendedorId].tienda].nombre)}</td>
      <td>${esc(nombrePeriodo(d.periodo))}</td><td>${esc(d.motivo)}</td><td>${chipDisputa(d.estado)}</td><td>${esc(fmtFecha(d.abierta))}</td><td><a class="btn btn--s" href="#/disputa/${esc(d.id)}">${ctx.rol === 'analista' && ['Abierta', 'En análisis'].includes(d.estado) ? 'Analizar' : 'Ver'}</a></td></tr>`).join('');
    return {
      html: `<div class="pagina">${encabezado({ titulo: 'Disputas', descripcion: ctx.rol === 'jefe' ? 'Disputas de tu tienda. Puedes opinar; las resuelve el Analista.' : 'Reclamos de vendedores sobre su resultado. Si se resuelve a favor, genera un ajuste.' })}
        <div class="pila">${disputas.length ? panel({ cuerpo: `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Disputas</caption><thead><tr><th scope="col">Disputa</th><th scope="col">Vendedor</th><th scope="col">Tienda</th><th scope="col">Mes</th><th scope="col">Motivo</th><th scope="col">Estado</th><th scope="col">Abierta</th><th scope="col"><span class="solo-lectores">Acción</span></th></tr></thead><tbody>${filas}</tbody></table></div>`, sinRelleno: true }) : estadoVista('vacio', lista.vacio)}</div></div>`,
    };
  },
};

function bloqueTrazabilidad(d) {
  const r = hayResultados(d.periodo) ? resultado(d.vendedorId, d.periodo) : null;
  if (!r) return '';
  const config = configDe(d.periodo);
  return panel({
    titulo: `Trazabilidad de ${VENDEDOR[d.vendedorId].nombre.split(' ')[0]} en ${nombrePeriodo(d.periodo)}`, subtitulo: 'Lo que ve el vendedor, regla por regla.',
    acciones: boton({ texto: 'Abrir el detalle completo', clase: 'btn--s btn--discreto', href: `#/detalle/${d.vendedorId}?p=${d.periodo}` }),
    cuerpo: cascada(construirCascada(r, config), { explicadores: false }), sinRelleno: true,
  });
}

const detalle = {
  id: 'disputa',
  titulo: 'Disputa',
  render(ctx) {
    const d = obtener().disputas.find((x) => x.id === ctx.param);
    const volver = ctx.rol === 'vendedor' ? '#/disputas' : '#/disputas';
    if (!d) return { html: `<div class="pagina">${encabezado({ titulo: 'Disputa' })}${estadoVista('vacio', { titulo: 'No encontramos esta disputa', accion: `<a class="btn" href="${volver}">Ver las disputas</a>` })}</div>` };
    const v = VENDEDOR[d.vendedorId];
    if ((ctx.rol === 'vendedor' && d.vendedorId !== ctx.st.vendedorActivo) || (ctx.rol === 'jefe' && v.tienda !== ctx.st.tiendaJefe)) {
      return { html: `<div class="pagina">${estadoVista('sinPermiso', { titulo: 'No puedes ver esta disputa', texto: 'Solo la ve quien la abrió, el Jefe de su tienda y los roles de gestión.', accion: `<a class="btn" href="${volver}">Volver</a>` })}</div>` };
    }
    const vendedor = ctx.rol === 'vendedor';
    const analista = puede(ctx.rol, 'disputa.resolver');
    const abierta = ['Abierta', 'En análisis'].includes(d.estado);
    const ajustes = obtener().ajustes.filter((a) => d.ajusteIds.includes(a.id));

    const ventasRef = d.faltante
      ? `<div class="bloque-simple"><strong>Una venta que falta</strong><p>${esc(d.faltante.producto || '')}${d.faltante.fecha ? ` · ${esc(fmtFecha(d.faltante.fecha))}` : ''}</p>${d.faltante.descripcion ? `<p class="secundario">${esc(d.faltante.descripcion)}</p>` : ''}</div>`
      : d.ventas.length ? `<ul class="top-lista">${d.ventas.map((id) => { const l = ventasDe(d.vendedorId, d.periodo).find((x) => x.id === id); return `<li><span>${esc(l?.producto ?? id)}</span><span class="secundario pequeno mono">${esc(id)}</span><span>${l ? q(l.neto) : ''}</span></li>`; }).join('')}</ul>` : '';

    const sel = seleccion[d.id];
    let herramienta = '';
    if (analista && abierta && d.faltante) {
      const texto = ctx.query.buscar ?? d.faltante.producto ?? '';
      const fecha = ctx.query.fecha ?? d.faltante.fecha ?? '';
      const encontrados = buscarVentas(d.periodo, { texto, fecha }).filter((l) => l.vendedor !== d.vendedorId).sort((a, b) => (TIENDA[VENDEDOR[b.vendedor].tienda].id === v.tienda) - (TIENDA[VENDEDOR[a.vendedor].tienda].id === v.tienda));
      const filasBusqueda = encontrados.map((l) => `<tr class="${sel?.id === l.id ? 'fila--resaltada' : ''}"><td class="mono">${esc(l.id)}</td><td>${esc(fmtFecha(l.fecha))}</td><td>${esc(l.producto)}</td><td class="num">${q(l.neto)}</td><td>${esc(l.vendedorNombre)}<div class="diminuto secundario">${esc(TIENDA[l.tienda].nombre)}</div></td>
        <td>${boton({ texto: sel?.id === l.id ? 'Elegida' : 'Es esta venta', clase: 'btn--s', accion: 'elegir', id: l.id, deshabilitado: false })}</td></tr>`).join('');
      herramienta = panel({
        titulo: 'Buscar la venta en el registro', subtitulo: 'Busca entre todos los vendedores del mes por producto y fecha.',
        cuerpo: `<form class="fila" id="form-busqueda" style="margin-bottom:12px"><div class="campo"><label for="b-texto">Producto o código</label><input id="b-texto" type="text" value="${esc(texto)}"></div>
          <div class="campo"><label for="b-fecha">Fecha</label><input id="b-fecha" type="date" value="${esc(fecha)}"></div><button type="submit" class="btn" style="align-self:flex-end">${ico('search')} Buscar</button></form>
          ${encontrados.length ? `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Ventas encontradas</caption><thead><tr><th scope="col">Venta</th><th scope="col">Fecha</th><th scope="col">Producto</th><th scope="col" class="num">Monto</th><th scope="col">Registrada a</th><th scope="col"><span class="solo-lectores">Acción</span></th></tr></thead><tbody>${filasBusqueda}</tbody></table></div>` : '<p class="secundario">No hay ventas que coincidan. Prueba con menos filtros.</p>'}`,
      });
    }

    let impacto = '';
    if (sel && analista && abierta) {
      const sim = simularReasignacion({ ventaId: sel.id, deVendedor: sel.vendedor, aVendedor: d.vendedorId, periodo: d.periodo });
      if (sim) {
        const fila = (rr) => `<tr><th scope="row">${esc(VENDEDOR[rr.vendedorId].nombre)}</th><td class="num">${q(rr.original.total)}</td><td class="num">${q(rr.recalculado.total)}</td><td class="num">${pct(rr.original.tasa)} → ${pct(rr.recalculado.tasa)}</td><td class="num">${variacion(rr.diferencia)}</td></tr>`;
        impacto = panel({ titulo: `Qué pasa si la venta ${sel.id} es de ${v.nombre.split(' ')[0]}`, subtitulo: 'Recalculado con las reglas del mes, sin reabrir el período pagado.',
          cuerpo: `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Efecto de reasignar la venta</caption><thead><tr><th scope="col">Vendedor</th><th scope="col" class="num">Se pagó</th><th scope="col" class="num">Corresponde</th><th scope="col" class="num">Tasa</th><th scope="col" class="num">Ajuste</th></tr></thead><tbody>${fila(sim.recibe)}${fila(sim.pierde)}</tbody></table></div>
          <p class="secundario pequeno" style="margin-top:8px">Se generan dos ajustes. ${Math.abs(sim.recibe.diferencia) > 1000 ? `El de ${esc(v.nombre)} supera Q1,000 y lo autoriza el Gerente.` : ''}</p>`, sinRelleno: false });
      }
    }

    const opiniones = d.opiniones.length ? `<ul class="bandeja">${d.opiniones.map((o) => `<li class="pendiente" style="grid-template-columns:28px 1fr"><span class="pendiente__icono pendiente__icono--acento">${ico('message-square')}</span><div><div class="pendiente__titulo">${esc(o.por)} · Jefe de tienda · ${esc(fmtFechaHora(o.fecha))}</div><p class="pendiente__texto">${esc(o.texto)}</p></div></li>`).join('')}</ul>` : '';
    const jefe = puede(ctx.rol, 'disputa.opinar') && abierta
      ? `<div style="margin-top:12px">${boton({ texto: 'Dar mi opinión', icono: 'message-square', accion: 'opinar' })}</div>` : '';

    const respuesta = d.respuesta ? `<div class="bloque-simple"><strong>Respuesta de Compensaciones</strong><p>${esc(d.respuesta)}</p><p class="diminuto secundario">${esc(d.resueltaPor)} · ${esc(fmtFechaHora(d.resueltaEn))}</p></div>` : '';
    const ajustesHtml = ajustes.length ? panel({ titulo: 'Ajustes que nacen de esta disputa', cuerpo: `<ul class="bandeja">${ajustes.map((a) => `<li class="pendiente"><span class="pendiente__icono pendiente__icono--acento">${ico('git-compare')}</span><div><div class="pendiente__titulo">${esc(a.id)} · ${esc(VENDEDOR[a.vendedorId].nombre)}</div><p class="pendiente__texto">${q(a.montoSolicitado, { signo: true })} · se aplica en ${esc(nombrePeriodo(a.periodoAplicacion))}</p></div><div class="pendiente__acciones">${chipAjuste(a.estado)}${vendedor ? '' : boton({ texto: 'Abrir', clase: 'btn--s', href: `#/ajuste/${a.id}` })}</div></li>`).join('')}</ul>`, sinRelleno: true }) : '';

    const acciones = [];
    if (analista && d.estado === 'Abierta') acciones.push(boton({ texto: 'Empezar el análisis', clase: 'btn--primario', icono: 'search', accion: 'tomar', foco: 'tomar' }));
    if (analista && abierta) {
      acciones.push(boton({ texto: 'Resolver a favor', clase: 'btn--primario', icono: 'circle-check', accion: 'favor', foco: 'favor', deshabilitado: d.estado === 'Abierta' || (d.faltante && !sel), motivo: d.estado === 'Abierta' ? 'Empieza el análisis primero.' : 'Elige la venta que se reasigna.' }));
      acciones.push(boton({ texto: 'Rechazar', clase: 'btn--peligro', icono: 'circle-x', accion: 'rechazar', deshabilitado: d.estado === 'Abierta', motivo: 'Empieza el análisis primero.' }));
    }

    const html = `<div class="pagina ${vendedor ? 'pagina--movil' : ''}">${encabezado({
      titulo: `Disputa ${esc(d.id)}`, descripcion: `${esc(v.nombre)} · ${esc(nombrePeriodo(d.periodo))} · abierta el ${esc(fmtFechaHora(d.abierta))}`,
      migas: migas('<a href="#/disputas">Disputas</a>', esc(d.id)), acciones: `${chipDisputa(d.estado)}${acciones.join('')}`,
    })}
      <div class="pila">
        ${!analista && abierta && !vendedor ? motivoVisible(motivoSinPermiso('disputa.resolver')) : ''}
        <div class="${vendedor ? 'pila' : 'rejilla rejilla--2'}" style="align-items:start">
          <div class="pila">
            ${panel({ titulo: vendedor ? 'Tu reclamo' : 'Qué reclama', cuerpo: `<p>${esc(d.motivo)}</p>${ventasRef}${respuesta}${vendedor && abierta ? '<p class="secundario pequeno" style="margin-top:12px">Compensaciones la está revisando. Te avisamos cuando tenga respuesta.</p>' : ''}` })}
            ${opiniones ? panel({ titulo: 'Opiniones', cuerpo: opiniones, sinRelleno: true }) : ''}${jefe}
            ${herramienta}${impacto}${ajustesHtml}
          </div>
          ${vendedor ? '' : bloqueTrazabilidad(d)}
        </div></div></div>`;

    return {
      html,
      montar(raiz) {
        raiz.querySelector('#form-busqueda')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const params = new URLSearchParams({ buscar: raiz.querySelector('#b-texto').value, fecha: raiz.querySelector('#b-fecha').value });
          location.hash = `#/disputa/${d.id}?${params.toString()}`;
        });
      },
      acciones: {
        tomar() { const r = ctx.acc.tomarDisputa(d.id); ctx.avisar(r.ok ? 'Disputa en análisis.' : r.motivo, r.ok ? 'positivo' : 'negativo'); },
        elegir(id) {
          const l = buscarVentas(d.periodo, { texto: id }).find((x) => x.id === id);
          seleccion[d.id] = l;
          ctx.refrescar();
        },
        async opinar() {
          const { confirmado, valor } = await confirmar({ titulo: `Tu opinión sobre ${d.id}`, descripcion: 'El Jefe de tienda opina; el Analista resuelve.', campo: { etiqueta: 'Opinión', requerido: true, mensajeRequerido: 'Escribe tu opinión.' }, textoConfirmar: 'Enviar opinión' });
          if (!confirmado) return;
          const r = ctx.acc.opinarDisputa(d.id, valor);
          ctx.avisar(r.ok ? 'Opinión registrada.' : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        async favor() {
          let resumen = [['Vendedor', esc(v.nombre)], ['Resultado', 'A favor del vendedor']];
          let reasignacion = null;
          let montoManual = null;
          if (sel) {
            const sim = simularReasignacion({ ventaId: sel.id, deVendedor: sel.vendedor, aVendedor: d.vendedorId, periodo: d.periodo });
            reasignacion = { ventaId: sel.id, deVendedor: sel.vendedor, aVendedor: d.vendedorId };
            resumen.push(['Venta que se reasigna', `${esc(sel.id)} · ${esc(sel.producto)} · ${q(sel.neto)}, de ${esc(sel.vendedorNombre)} a ${esc(v.nombre)}`],
              [`Ajuste de ${esc(v.nombre.split(' ')[0])}`, q(sim.recibe.diferencia, { signo: true })], [`Ajuste de ${esc(sel.vendedorNombre.split(' ')[0])}`, q(sim.pierde.diferencia, { signo: true })], ['Qué sigue', 'Cada ajuste se envía a autorización; el mayor a Q1,000 lo autoriza el Gerente.']);
          } else {
            resumen.push(['Qué sigue', 'Indica el monto del ajuste; se prepara en borrador.']);
          }
          const { confirmado, valor } = await confirmar({
            titulo: `Resolver ${d.id} a favor de ${v.nombre}`, resumen,
            campo: { etiqueta: 'Respuesta para el vendedor', requerido: true, mensajeRequerido: 'Escribe la respuesta que verá el vendedor.', placeholder: 'Explica en simple qué encontraste y qué se hará.' },
            textoConfirmar: 'Resolver a favor',
          });
          if (!confirmado) return;
          const r = ctx.acc.resolverDisputa(d.id, { resultado: 'favor', respuesta: valor, reasignacion, montoManual });
          delete seleccion[d.id];
          ctx.avisar(r.ok ? `Disputa resuelta. Se prepararon ${r.ajustes.length} ajuste${r.ajustes.length === 1 ? '' : 's'} en borrador.` : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        async rechazar() {
          const { confirmado, valor } = await confirmar({
            titulo: `Rechazar ${d.id}`, descripcion: 'El vendedor verá tu respuesta. Explica el motivo con claridad.',
            campo: { etiqueta: 'Respuesta para el vendedor', requerido: true, mensajeRequerido: 'Explica por qué se rechaza.' }, textoConfirmar: 'Rechazar disputa', peligro: true,
          });
          if (!confirmado) return;
          const r = ctx.acc.resolverDisputa(d.id, { resultado: 'rechazada', respuesta: valor });
          ctx.avisar(r.ok ? 'Disputa rechazada.' : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
      },
    };
  },
};

export { detalle as disputa, lista as disputas };
export { fmtQ, chip, corteDe };
