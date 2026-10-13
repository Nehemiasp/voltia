// P12 · Historial de auditoría. Quién, qué, cuándo, valor anterior y nuevo; desde cada evento se llega a la entidad.

import { obtener } from '../estado.js';
import { VENDEDOR } from '../../engine/datos.js';
import { esc, fmtFecha, fmtFechaLarga } from '../../engine/formato.js';
import { ico, panel, encabezado, boton, estadoVista, eventos, chip } from '../ui.js';
import { ROLES } from '../permisos.js';

const POR_PAGINA = 40;

function alcance(rol, st) {
  const todos = st.auditoria;
  if (rol === 'jefe') {
    return todos.filter((e) => (e.vendedorId && VENDEDOR[e.vendedorId]?.tienda === st.tiendaJefe) || ['Corrida', 'Período'].includes(e.entidad?.tipo));
  }
  return todos;
}

function csv(lista) {
  const celda = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = lista.map((e) => [e.fecha, e.usuario, e.rol, e.accion, e.entidad?.tipo, e.entidad?.etiqueta, e.anterior, e.nuevo, e.comentario].map(celda).join(','));
  return ['fecha,usuario,rol,accion,tipo_entidad,entidad,valor_anterior,valor_nuevo,comentario', ...filas].join('\n');
}

export default {
  id: 'auditoria',
  titulo: 'Historial de auditoría',
  permiso: 'auditoria.ver',
  vacio: { titulo: 'No hay eventos con estos filtros', texto: 'Prueba quitando algún filtro.' },
  render(ctx) {
    const base = alcance(ctx.rol, ctx.st);
    const f = { tipo: ctx.query.tipo ?? '', accion: ctx.query.accion ?? '', rol: ctx.query.rol ?? '', q: (ctx.query.q ?? '').trim().toLowerCase(), n: Number(ctx.query.n ?? POR_PAGINA) };
    const tipos = [...new Set(base.map((e) => e.entidad?.tipo).filter(Boolean))].sort();
    const acciones = [...new Set(base.map((e) => e.accion))].sort((a, b) => a.localeCompare(b, 'es'));
    const roles = [...new Set(base.map((e) => e.rol))];
    const filtrados = base
      .filter((e) => (!f.tipo || e.entidad?.tipo === f.tipo) && (!f.accion || e.accion === f.accion) && (!f.rol || e.rol === f.rol)
        && (!f.q || `${e.usuario} ${e.accion} ${e.entidad?.etiqueta} ${e.anterior} ${e.nuevo} ${e.comentario}`.toLowerCase().includes(f.q)))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const visibles = filtrados.slice(0, f.n);

    const dias = [];
    visibles.forEach((e) => {
      const dia = e.fecha.slice(0, 10);
      const ultimo = dias[dias.length - 1];
      if (ultimo?.dia === dia) ultimo.lista.push(e); else dias.push({ dia, lista: [e] });
    });

    const opciones = (lista, valor, etiqueta = (x) => x) => `<option value="">Todos</option>${lista.map((x) => `<option value="${esc(x)}" ${x === valor ? 'selected' : ''}>${esc(etiqueta(x))}</option>`).join('')}`;
    const filtros = `<form class="tabla-filtros" id="filtros-aud">
      <label>Buscar <input type="search" name="q" value="${esc(ctx.query.q ?? '')}" placeholder="Persona, entidad o texto"></label>
      <label>Tipo <select name="tipo">${opciones(tipos, f.tipo)}</select></label>
      <label>Acción <select name="accion">${opciones(acciones, f.accion)}</select></label>
      <label>Rol <select name="rol">${opciones(roles, f.rol, (r) => ROLES[r]?.corto ?? r)}</select></label></form>`;

    const html = `<div class="pagina">${encabezado({
      titulo: 'Historial de auditoría', descripcion: ctx.rol === 'jefe' ? 'Eventos de tu tienda y de los períodos. Todo cambio genera un evento.' : 'Todo cambio genera un evento: quién, qué, cuándo, con qué valor anterior y nuevo.',
      acciones: ctx.rol === 'auditoria' ? boton({ texto: 'Descargar CSV', icono: 'file-down', accion: 'csv' }) : '',
    })}
      <div class="pila">
        ${panel({ cuerpo: `<div class="fila fila--entre">${filtros}<span class="secundario pequeno">${filtrados.length} de ${base.length} eventos${ctx.rol === 'auditoria' ? ' · vista completa' : ''}</span></div>` })}
        ${visibles.length ? dias.map((d) => `<section class="panel"><div class="panel__cabecera"><h2 style="font-size:var(--t-m)">${esc(fmtFechaLarga(d.dia))}</h2><p>${d.lista.length} evento${d.lista.length > 1 ? 's' : ''}</p></div><div class="panel__cuerpo">${eventos(d.lista)}</div></section>`).join('')
          : estadoVista('vacio', { titulo: 'No hay eventos con estos filtros', texto: 'Prueba quitando algún filtro.', accion: '<a class="btn btn--primario" href="#/auditoria">Quitar los filtros</a>' })}
        ${filtrados.length > visibles.length ? `<div style="text-align:center">${boton({ texto: `Mostrar ${Math.min(POR_PAGINA, filtrados.length - visibles.length)} eventos más`, accion: 'mas' })}</div>` : ''}
      </div></div>`;

    return {
      html,
      montar(raiz) {
        const form = raiz.querySelector('#filtros-aud');
        const aplicar = () => {
          const datos = new FormData(form);
          const params = new URLSearchParams();
          for (const k of ['q', 'tipo', 'accion', 'rol']) if (datos.get(k)) params.set(k, datos.get(k));
          location.hash = params.toString() ? `#/auditoria?${params.toString()}` : '#/auditoria';
        };
        form.addEventListener('change', aplicar);
        form.addEventListener('submit', (e) => { e.preventDefault(); aplicar(); });
        raiz.querySelector('input[type=search]')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicar(); });
      },
      acciones: {
        mas() {
          const params = new URLSearchParams(ctx.ruta.hash.split('?')[1] ?? '');
          params.set('n', String(f.n + POR_PAGINA));
          location.hash = `#/auditoria?${params.toString()}`;
        },
        csv() {
          const blob = new Blob(['﻿', csv(filtrados)], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'voltia-auditoria.csv';
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          ctx.avisar(`${filtrados.length} eventos descargados.`, 'positivo');
        },
      },
    };
  },
};

export { ico, chip, fmtFecha, obtener };
