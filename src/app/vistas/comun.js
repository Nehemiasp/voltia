// Ayudas compartidas por las vistas.

import { periodoFoco, periodosDisponibles, periodosConResultados, estadoPeriodo } from '../selectores.js';
import { esc, nombrePeriodo } from '../../engine/formato.js';
import { estadoVista } from '../ui.js';
import { INICIO_POR_ROL } from '../permisos.js';

/** Período pedido en la URL, o el más relevante según la fecha de trabajo. */
export function periodoDe(ctx, { conResultados = true } = {}) {
  const pedido = ctx.query.p;
  const lista = conResultados ? periodosConResultados() : periodosDisponibles();
  if (pedido && lista.includes(pedido)) return pedido;
  const foco = periodoFoco();
  if (lista.includes(foco)) return foco;
  return lista[lista.length - 1] ?? foco;
}

export function selectorPeriodo(ctx, actual, { conResultados = true, etiqueta = 'Período' } = {}) {
  const lista = conResultados ? periodosConResultados() : periodosDisponibles();
  const base = ctx.ruta.hash.split('?')[0];
  const otros = new URLSearchParams(ctx.ruta.hash.split('?')[1] ?? '');
  return `<label class="campo campo--fila" style="gap:8px"><span class="pequeno secundario">${esc(etiqueta)}</span>
    <select data-selector-periodo data-base="${esc(base)}" data-otros="${esc(otros.toString())}" style="width:auto;min-height:36px">
      ${lista.map((p) => `<option value="${p}" ${p === actual ? 'selected' : ''}>${esc(nombrePeriodo(p))} · ${esc(estadoPeriodo(p))}</option>`).join('')}
    </select></label>`;
}

/** Conecta los selectores de período de la vista con la ruta. */
export function enlazarSelectores(raiz) {
  raiz.querySelectorAll('[data-selector-periodo]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const params = new URLSearchParams(sel.dataset.otros);
      params.set('p', sel.value);
      location.hash = `${sel.dataset.base}?${params.toString()}`;
    });
  });
}

export function migas(...partes) {
  return partes.map((p, i) => (i < partes.length - 1 ? p + ' / ' : `<span aria-current="page">${p}</span>`)).join('');
}

export function sinAcceso(ctx, texto) {
  return `<div class="pagina">${estadoVista('sinPermiso', {
    titulo: 'No puedes ver esta información', texto,
    accion: `<a class="btn btn--primario" href="${INICIO_POR_ROL[ctx.rol]}">Ir a mi pantalla de inicio</a>`,
  })}</div>`;
}

export function enlace(ruta, texto, clase = '') {
  return `<a class="${clase}" href="${esc(ruta)}">${texto}</a>`;
}

// ---------- Observación de un vendedor (la usan P03 y P05) ----------

import { confirmar } from '../dialogos.js';
import { VENDEDOR } from '../../engine/datos.js';
import { fmtQ } from '../../engine/formato.js';
import { resultado } from '../selectores.js';

export async function dialogoObservar(ctx, vendedorId, periodo) {
  const v = VENDEDOR[vendedorId];
  const r = resultado(vendedorId, periodo);
  const { confirmado, valor } = await confirmar({
    titulo: `Marcar una observación sobre ${v.nombre}`,
    descripcion: 'La observación bloquea la aprobación de este vendedor. El resto de la tienda sigue su curso.',
    resumen: [['Vendedor', esc(v.nombre)], ['Período', esc(nombrePeriodo(periodo))], ['Total del período', esc(fmtQ(r.total))]],
    campo: { etiqueta: 'Motivo de la observación', requerido: true, placeholder: 'Por ejemplo: falta una venta del 28 de enero.', mensajeRequerido: 'Escribe el motivo para que el Analista sepa qué revisar.' },
    textoConfirmar: 'Marcar observación',
  });
  if (!confirmado) return;
  const res = ctx.acc.marcarObservacion({ vendedorId, periodo, motivo: valor });
  ctx.avisar(res.ok ? `Observación marcada sobre ${v.nombre}.` : res.motivo, res.ok ? 'positivo' : 'negativo');
}
