// P05 · Revisión de tienda (Jefe de tienda). Gerente, Analista, Contabilidad y Auditoría la consultan en solo lectura.

import { calculo, estadoPeriodo, estadoResultado, aPagar, observaciones, periodosConResultados } from '../selectores.js';
import { TIENDAS, TIENDA, VENDEDOR } from '../../engine/datos.js';
import { esc, nombrePeriodo } from '../../engine/formato.js';
import { chip, chipResultado, q, pct, panel, encabezado, dato, boton, thOrden, nota, estadoVista } from '../ui.js';
import { puede } from '../permisos.js';
import { periodoDe, selectorPeriodo, enlazarSelectores, migas, dialogoObservar } from './comun.js';

function barraMini(valor, max = 140) {
  const w = Math.min(100, (valor / max) * 100);
  const marca100 = (100 / max) * 100;
  return `<span class="mini" aria-hidden="true"><i style="width:${w}%"></i><b style="left:${marca100}%"></b></span>`;
}

export default {
  id: 'tienda',
  titulo: 'Revisión de tienda',
  permiso: 'observacion.marcar',
  vacio: { titulo: 'No hay resultados para revisar', texto: 'Cuando el Analista ejecute la corrida, aquí aparecen los vendedores de tu tienda.' },
  render(ctx) {
    const periodo = periodoDe(ctx);
    const tiendaId = ctx.rol === 'jefe' ? ctx.st.tiendaJefe : (ctx.query.t ?? ctx.st.tiendaJefe);
    const tienda = TIENDA[tiendaId];
    const lista = periodosConResultados();
    if (!lista.length) {
      return { html: `<div class="pagina">${encabezado({ titulo: 'Revisión de tienda' })}${estadoVista('vacio', { titulo: 'Todavía no hay resultados', texto: 'El Analista debe ejecutar la corrida primero.' })}</div>` };
    }
    const calc = calculo(periodo);
    const t = calc.porTienda[tiendaId];
    const rs = calc.resultados.filter((r) => r.tienda === tiendaId);
    const estado = estadoPeriodo(periodo);
    const puedeObservar = (ctx.rol === 'jefe' || ctx.rol === 'analista' || ctx.rol === 'gerente') && puede(ctx.rol, 'observacion.marcar');
    const observadas = observaciones(periodo, { abiertas: true }).filter((o) => VENDEDOR[o.vendedorId].tienda === tiendaId);
    const total = rs.reduce((s, r) => s + aPagar(r, periodo).monto, 0);
    const falta = Math.max(0, Math.ceil(t.meta - t.vendido));

    const selectorTienda = ctx.rol === 'jefe' ? '' : `<label class="campo campo--fila" style="gap:8px"><span class="pequeno secundario">Tienda</span>
      <select data-selector-tienda style="width:auto;min-height:36px">${TIENDAS.map((x) => `<option value="${x.id}" ${x.id === tiendaId ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>`;

    const filas = rs.map((r) => {
      const e = estadoResultado(periodo, r);
      const obs = observaciones(periodo, { abiertas: true, vendedorId: r.vendedorId }).length > 0;
      const ap = aPagar(r, periodo);
      const clase = e === 'observada' ? 'fila--negativa' : e === 'bloqueada' || ap.estado === 'pendiente' ? 'fila--aviso' : '';
      const boton1 = puedeObservar
        ? boton({ texto: obs ? 'Observada' : 'Observar', clase: 'btn--s', icono: 'flag', accion: 'observar', id: r.vendedorId, deshabilitado: obs || estado !== 'En revisión', motivo: obs ? 'Ya tiene una observación abierta.' : 'Las observaciones se marcan cuando el período está en revisión.' })
        : '';
      return `<tr class="${clase}">
        <th scope="row" class="col-fija" data-val="${esc(r.nombre)}"><a class="enlace-fila" href="#/detalle/${r.vendedorId}?p=${periodo}">${esc(r.nombre)}</a></th>
        <td class="num" data-val="${r.meta ?? 0}">${r.meta === null ? '<span class="aviso-texto">Sin meta</span>' : q(r.meta)}</td>
        <td class="num" data-val="${r.netoComisionable}">${q(r.netoComisionable)}</td>
        <td data-val="${r.cumplimiento ?? -1}">${r.cumplimiento === null ? '<span class="secundario">—</span>' : `<span class="fila" style="gap:8px;flex-wrap:nowrap"><span style="min-width:52px;text-align:right">${pct(r.cumplimiento)}</span>${barraMini(r.cumplimiento)}</span>`}</td>
        <td class="num" data-val="${r.tasa}">${r.bloqueado ? '—' : pct(r.tasa)}</td>
        <td class="num" data-val="${r.comisionBase}">${q(r.comisionBase)}</td>
        <td class="num" data-val="${r.bono.monto}">${r.bono.aplica ? q(r.bono.monto) : '<span class="secundario">—</span>'}</td>
        <td class="num" data-val="${r.total}">${q(r.total)}${ap.estado === 'pendiente' ? `<div class="diminuto aviso-texto">${q(ap.retenido)} esperan autorización</div>` : ''}</td>
        <td>${chipResultado(e)}${r.tope.excede && ap.estado === 'pendiente' ? ' ' + chip('aviso', 'Requiere autorización', 'scale') : ''}</td>
        <td>${boton1}</td></tr>`;
    }).join('');

    const sumas = rs.reduce((a, r) => ({ v: a.v + r.netoComisionable, c: a.c + r.comisionBase, b: a.b + r.bono.monto }), { v: 0, c: 0, b: 0 });

    const indicador = `<div class="datos-fila">
      ${dato('Cumplimiento de la tienda', pct(t.cumplimiento, { fijo: true }), `${q(t.vendido)} de ${q(t.meta)}`, { grande: true })}
      ${dato('Bono de equipo', t.ganaBono ? '<span class="positivo">Gana el bono</span>' : '<span class="aviso-texto">No llega</span>', t.ganaBono ? 'Q500 a cada vendedor con 80 % o más' : `Faltan ${q(falta)} para el 100 %`)}
      ${dato('Total de la tienda', q(total), `${rs.length} vendedores`)}
      ${dato('Observaciones abiertas', String(observadas.length), observadas.length ? 'Bloquean solo a cada vendedor' : 'Nadie bloqueado')}
    </div>`;

    const html = `<div class="pagina">
      ${encabezado({
        titulo: `Revisión de ${esc(tienda.nombre)}`,
        descripcion: `${esc(nombrePeriodo(periodo))} · jefe de tienda: ${esc(tienda.jefe)}`,
        migas: migas('Mi tienda', esc(nombrePeriodo(periodo))),
        acciones: `${selectorTienda}${selectorPeriodo(ctx, periodo)}`,
      })}
      <div class="pila">
        ${estado !== 'En revisión' ? nota('info', `<strong>${esc(nombrePeriodo(periodo))} está “${esc(estado)}”.</strong> Las observaciones se marcan mientras el período está en revisión.`) : ''}
        ${panel({ cuerpo: indicador })}
        <section class="panel">
          <div class="panel__cabecera"><div><h2 style="font-size:var(--t-m)">Vendedores</h2><p>Pulsa el nombre para ver el detalle y la cascada de reglas. La marca vertical de la barra es el 100 % de la meta.</p></div></div>
          <div class="tabla-scroll"><table class="tabla">
            <caption class="solo-lectores">Vendedores de ${esc(tienda.nombre)} en ${esc(nombrePeriodo(periodo))}</caption>
            <thead><tr>${thOrden('Vendedor', { defecto: true })}${thOrden('Meta', { num: true })}${thOrden('Venta comisionable', { num: true })}${thOrden('Cumplimiento')}${thOrden('Tasa', { num: true })}${thOrden('Comisión', { num: true })}${thOrden('Bono', { num: true })}${thOrden('Total', { num: true })}<th scope="col">Estado</th><th scope="col"><span class="solo-lectores">Acciones</span></th></tr></thead>
            <tbody>${filas}</tbody>
            <tfoot><tr><td>Total de la tienda</td><td></td><td class="num">${q(sumas.v)}</td><td>${pct(t.cumplimiento, { fijo: true })}</td><td></td><td class="num">${q(sumas.c)}</td><td class="num">${q(sumas.b)}</td><td class="num">${q(total)}</td><td colspan="2"></td></tr></tfoot>
          </table></div>
        </section>
      </div></div>`;

    return {
      html,
      montar(raiz) {
        enlazarSelectores(raiz);
        raiz.querySelector('[data-selector-tienda]')?.addEventListener('change', (e) => {
          const params = new URLSearchParams(ctx.ruta.hash.split('?')[1] ?? '');
          params.set('t', e.target.value);
          location.hash = `#/tienda?${params.toString()}`;
        });
      },
      acciones: { observar: (id) => dialogoObservar(ctx, id, periodo) },
    };
  },
};
