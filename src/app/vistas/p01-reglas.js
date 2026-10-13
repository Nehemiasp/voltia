// P01 · Lista de reglas. Muestra el orden de aplicación, no solo una lista alfabética.

import { obtener } from '../estado.js';
import { ORDEN_APLICACION, TIPOS_REGLA } from '../../engine/reglas.js';
import { esc, fmtFechaLarga } from '../../engine/formato.js';
import { ico, chipRegla, panel, encabezado, boton, nota, estadoVista, thOrden } from '../ui.js';
import { puede } from '../permisos.js';

const FILTROS_ESTADO = [
  ['activas', 'Vigentes y borradores'], ['todas', 'Todas las versiones'], ['vigente', 'Vigente'], ['borrador', 'Borrador'], ['suspendida', 'Suspendida'], ['vencida', 'Vencida'],
];

function coincide(r, estado) {
  if (estado === 'todas') return true;
  if (estado === 'activas') return ['vigente', 'borrador'].includes(r.estado);
  return r.estado === estado;
}

export default {
  id: 'reglas',
  titulo: 'Lista de reglas',
  vacio: { titulo: 'No hay reglas', texto: 'Crea la primera regla para empezar a calcular comisiones.' },
  render(ctx) {
    const todas = obtener().reglas.versiones;
    const estado = ctx.query.f ?? 'activas';
    const tipo = ctx.query.t ?? '';
    const filtradas = todas
      .filter((r) => coincide(r, estado) && (!tipo || r.tipo === tipo))
      .sort((a, b) => a.prioridad - b.prioridad || b.version - a.version);
    const vigentes = ORDEN_APLICACION.map((id) => todas.find((r) => r.id === id && r.estado === 'vigente')).filter(Boolean);
    const pendientes = todas.filter((r) => r.estado === 'borrador' && r.pendienteAprobacion);
    const editable = puede(ctx.rol, 'reglas.editar');

    const orden = `<ol class="orden-aplicacion" aria-label="Orden de aplicación de las reglas">${vigentes.map((r, i) => `
      <li><a href="#/regla/${r.id}"><span class="orden-aplicacion__n">${i + 1}</span><span class="chip chip--regla">${esc(r.id)}</span><strong>${esc(r.nombre)}</strong><span class="diminuto secundario">${esc(r.tipo)} · v${r.version}</span></a>${i < vigentes.length - 1 ? ico('arrow-right', 'orden-aplicacion__flecha') : ''}</li>`).join('')}</ol>`;

    const fila = (r) => `<tr class="${r.estado === 'borrador' ? 'fila--aviso' : r.estado === 'vencida' ? 'fila--atenuada' : ''}">
      <td class="num" data-val="${r.prioridad}">${r.prioridad}</td>
      <th scope="row" data-val="${esc(r.id)}"><a class="enlace-fila mono" href="#/regla/${esc(r.id)}">${esc(r.id)}</a></th>
      <td>${esc(r.nombre)}<div class="diminuto secundario">${esc(r.fuente)}</div></td>
      <td>${esc(r.tipo)}</td><td class="num" data-val="${r.version}">v${r.version}</td><td>${chipRegla(r)}</td>
      <td data-val="${esc(r.vigenciaDesde)}">${esc(r.vigenciaDesde)} <span class="secundario">a</span> ${r.vigenciaHasta ? esc(r.vigenciaHasta) : '<span class="secundario">sin fin</span>'}</td>
      <td>${esc(r.responsable)}</td><td data-val="${esc(r.modificada)}">${esc(fmtFechaLarga(r.modificada))}<div class="diminuto secundario">${esc(r.modificadaPor)}</div></td></tr>`;

    const tabla = filtradas.length
      ? `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Versiones de reglas</caption>
        <thead><tr>${thOrden('Orden', { num: true, defecto: true })}${thOrden('ID')}<th scope="col">Nombre y fuente</th><th scope="col">Tipo</th>${thOrden('Versión', { num: true })}<th scope="col">Estado</th>${thOrden('Vigencia')}<th scope="col">Responsable</th>${thOrden('Última modificación')}</tr></thead>
        <tbody>${filtradas.map(fila).join('')}</tbody></table></div>`
      : `<div style="padding:24px">${estadoVista('vacio', {
        titulo: 'Ninguna regla coincide con estos filtros',
        texto: estado === 'suspendida' ? 'Por ahora no hay reglas suspendidas. Suspender una regla la deja sin efecto sin borrarla.' : 'Prueba con otro estado o tipo.',
        accion: '<a class="btn btn--primario" href="#/reglas">Quitar los filtros</a>',
      })}</div>`;

    const filtros = `<form class="tabla-filtros" id="filtros-reglas">
      <label>Estado <select name="f">${FILTROS_ESTADO.map(([v, t]) => `<option value="${v}" ${v === estado ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <label>Tipo <select name="t"><option value="">Todos</option>${TIPOS_REGLA.map((t) => `<option ${t === tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
      <span class="secundario">${filtradas.length} de ${todas.length} versiones</span></form>`;

    const html = `<div class="pagina">
      ${encabezado({ titulo: 'Reglas de comisión', descripcion: 'Nada se borra: toda regla se versiona. Editar una regla vigente crea una versión nueva en borrador.', acciones: editable ? boton({ texto: 'Editar R-001', clase: 'btn--primario', icono: 'pencil', href: '#/regla/R-001' }) : '' })}
      <div class="pila">
        ${pendientes.length ? nota('aviso', `<strong>${pendientes.length} activación${pendientes.length > 1 ? 'es' : ''} esperan la aprobación del Gerente Comercial:</strong> ${pendientes.map((r) => `<a href="#/regla/${r.id}">${esc(r.id)} v${r.version}</a>`).join(', ')}. Un error de configuración afectaría a 180 personas (D-10).`) : ''}
        ${panel({ titulo: 'Orden de aplicación', subtitulo: 'Cada venta pasa por las reglas en este orden. El orden importa: R-006 excluye antes de que R-001 calcule.', cuerpo: orden })}
        <section class="panel"><div class="tabla-barra"><div><h2 style="font-size:var(--t-m)">Versiones</h2></div>${filtros}</div>${tabla}</section>
      </div></div>`;

    return {
      html,
      montar(raiz) {
        raiz.querySelector('#filtros-reglas')?.addEventListener('change', (e) => {
          const datos = new FormData(e.currentTarget);
          const params = new URLSearchParams();
          if (datos.get('f') && datos.get('f') !== 'activas') params.set('f', datos.get('f'));
          if (datos.get('t')) params.set('t', datos.get('t'));
          const texto = params.toString();
          location.hash = texto ? `#/reglas?${texto}` : '#/reglas';
        });
      },
    };
  },
};
