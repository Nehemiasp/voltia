// Carcasa de la aplicación: router por hash, barra de demostración, navegación por rol y delegación de eventos.

import { obtener, suscribir } from './estado.js';
import * as acc from './acciones.js';
import { ROLES, ORDEN_ROLES, NAVEGACION, rutasPermitidas, INICIO_POR_ROL, motivoSinPermiso } from './permisos.js';
import { MOMENTOS } from './semillas.js';
import { VISTAS } from './vistas/index.js';
import { abrirPanel, cerrarPanel, avisar } from './dialogos.js';
import { ico, estadoVista, esqueleto } from './ui.js';
import { esc } from '../engine/formato.js';
import { VENDEDORES, VENDEDOR } from '../engine/datos.js';

const raiz = document.getElementById('principal');
let vistaActual = null;
let demoAbierto = false;
let ultimaRuta = null;

// ---------- Ruta ----------

export function leerRuta() {
  const hash = location.hash.replace(/^#\/?/, '') || 'inicio';
  const [camino, consulta = ''] = hash.split('?');
  const [nombre, ...resto] = camino.split('/');
  const query = Object.fromEntries(new URLSearchParams(consulta));
  return { nombre, param: resto.join('/') ? decodeURIComponent(resto.join('/')) : null, query, hash: `#/${hash}` };
}

export function ir(destino) {
  if (location.hash === destino) renderVista({ conservarFoco: false });
  else location.hash = destino;
}

// ---------- Barra de demostración, cabecera y navegación ----------

function renderCabecera() {
  const st = obtener();
  const rol = ROLES[st.rol];
  const persona = st.rol === 'vendedor' ? { nombre: VENDEDOR[st.vendedorActivo].nombre, cargo: 'Vendedor' } : { nombre: rol.persona.nombre, cargo: rol.persona.cargo + (st.rol === 'jefe' ? ' · Galerías del Sur' : '') };
  const iniciales = persona.nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');
  document.getElementById('cabecera').innerHTML = `
    <a class="logo" href="#/inicio" aria-label="Voltia, inicio">Voltia <small>comisiones</small></a>
    <div class="usuario"><div><strong>${esc(persona.nombre)}</strong><span>${esc(persona.cargo)}</span></div><span class="iniciales" aria-hidden="true">${esc(iniciales)}</span></div>`;
}

function renderBarraDemo() {
  const st = obtener();
  const ruta = leerRuta();
  const momentos = Object.values(MOMENTOS).map((m) => `<option value="${m.id}" ${m.id === st.momento ? 'selected' : ''}>${esc(m.etiqueta)}</option>`).join('');
  const roles = ORDEN_ROLES.map((r) => `<option value="${r}" ${r === st.rol ? 'selected' : ''}>${esc(ROLES[r].nombre)}</option>`).join('');
  const vendedores = st.rol === 'vendedor'
    ? `<label>Vendedor <select id="demo-vendedor">${VENDEDORES.map((v) => `<option value="${v.id}" ${v.id === st.vendedorActivo ? 'selected' : ''}>${esc(v.nombre)}</option>`).join('')}</select></label>` : '';
  const estados = `<label>Vista <select id="demo-estado">${[['', 'Con datos'], ['cargando', 'Cargando'], ['vacio', 'Vacío'], ['error', 'Error']].map(([v, t]) => `<option value="${v}" ${ruta.query.estado === v || (!ruta.query.estado && v === '') ? 'selected' : ''}>${t}</option>`).join('')}</select></label>`;
  const abierto = demoAbierto || window.innerWidth >= 700;
  document.getElementById('barra-demo').innerHTML = `
    <span class="barra-demo__aviso">Proyecto conceptual. Voltia, sus datos y sus personas son ficticios.</span>
    <details class="demo-det" ${abierto ? 'open' : ''}><summary>Controles de la demostración</summary><div class="demo-controles">
      <label>Fecha <select id="demo-momento">${momentos}</select></label>
      <label>Rol <select id="demo-rol">${roles}</select></label>
      ${vendedores}${estados}
      <button type="button" class="btn btn--s" id="demo-reiniciar">${ico('rotate-ccw')} Restablecer demo</button></div></details>`;
  document.querySelector('.demo-det').addEventListener('toggle', (e) => { if (window.innerWidth < 700) demoAbierto = e.target.open; });
}

function renderNavegacion() {
  const st = obtener();
  const ruta = leerRuta();
  const grupos = NAVEGACION[st.rol].map((g) => `
    <div class="lateral__grupo"><p class="lateral__titulo">${esc(g.grupo)}</p><ul>${g.items.map((i) => {
      const base = i.ruta.replace('#/', '').split('/')[0];
      const activo = base === ruta.nombre || (i.codigo === 'P03' && ruta.nombre === 'detalle') || (i.codigo === 'P09' && ruta.nombre === 'ajuste') || (i.codigo === 'P08' && ruta.nombre === 'disputa') || (i.codigo === 'P02' && ruta.nombre === 'regla');
      return `<li><a href="${i.ruta}" ${activo ? 'aria-current="page"' : ''}>${ico(i.icono)}<span>${esc(i.texto)}</span><span class="codigo">${i.codigo}</span></a></li>`;
    }).join('')}</ul></div>`).join('');
  const inicio = `<div class="lateral__grupo"><ul><li><a href="#/inicio" ${ruta.nombre === 'inicio' ? 'aria-current="page"' : ''}>${ico('layout-dashboard')}<span>Recorrido de la demo</span></a></li><li><a href="#/sistema" ${ruta.nombre === 'sistema' ? 'aria-current="page"' : ''}>${ico('book-open')}<span>Sistema de diseño</span></a></li></ul></div>`;
  document.getElementById('nav').innerHTML = (st.rol === 'vendedor' ? '' : inicio) + grupos;
  document.getElementById('marco').classList.toggle('marco--movil', st.rol === 'vendedor');
}

// ---------- Vista ----------

function contexto() {
  const st = obtener();
  const ruta = leerRuta();
  return { st, rol: st.rol, ruta, param: ruta.param, query: ruta.query, ir, acc, avisar, abrirPanel, refrescar: () => renderVista({ conservarFoco: true }) };
}

function renderVista({ conservarFoco = true, enfocarTitulo = false } = {}) {
  const ctx = contexto();
  const { nombre } = ctx.ruta;
  const foco = conservarFoco ? document.activeElement?.dataset?.foco : null;
  const scroll = conservarFoco ? window.scrollY : 0;
  const vista = VISTAS[nombre];

  if (!vista) {
    raiz.innerHTML = `<div class="pagina">${estadoVista('vacio', { titulo: 'No encontramos esta pantalla', texto: 'La dirección no existe en el prototipo.', accion: `<a class="btn btn--primario" href="#/inicio">Ir al recorrido de la demo</a>` })}</div>`;
    vistaActual = null;
    document.title = 'Pantalla no encontrada · Voltia';
    return;
  }

  if (!rutasPermitidas(ctx.rol).has(nombre)) {
    raiz.innerHTML = `<div class="pagina">${estadoVista('sinPermiso', { titulo: 'Esta pantalla no es parte de tu rol', texto: `${ROLES[ctx.rol].nombre} no tiene acceso. ${vista.permiso ? motivoSinPermiso(vista.permiso) : ''}`.trim(), accion: `<a class="btn btn--primario" href="${INICIO_POR_ROL[ctx.rol]}">Ir a mi pantalla de inicio</a>` })}</div>`;
    vistaActual = null;
    document.title = `Sin acceso · Voltia`;
    return;
  }

  const estado = ctx.query.estado;
  let resultado;
  try {
    if (estado === 'cargando') resultado = { html: `<div class="pagina"><h1 id="titulo-vista" tabindex="-1">${esc(vista.titulo)}</h1><div style="margin-top:24px">${esqueleto()}</div></div>` };
    else if (estado === 'error') resultado = { html: `<div class="pagina"><h1 id="titulo-vista" tabindex="-1">${esc(vista.titulo)}</h1><div style="margin-top:24px">${estadoVista('error', { titulo: 'No pudimos cargar esta pantalla', texto: 'Revisa tu conexión e inténtalo de nuevo. Si el problema sigue, avisa a Sistemas con el código VLT-503.', accion: '<a class="btn btn--primario" href="' + ctx.ruta.hash.replace(/[?&]estado=error/, '') + '">Volver a intentar</a>' })}</div></div>` };
    else if (estado === 'vacio' && vista.vacio) resultado = { html: `<div class="pagina"><h1 id="titulo-vista" tabindex="-1">${esc(vista.titulo)}</h1><div style="margin-top:24px">${estadoVista('vacio', vista.vacio)}</div></div>` };
    else resultado = vista.render(ctx);
  } catch (error) {
    console.error(error);
    resultado = { html: `<div class="pagina">${estadoVista('error', { titulo: 'Esta pantalla tuvo un problema', texto: error.message })}</div>` };
  }

  vistaActual = resultado;
  raiz.innerHTML = resultado.html;
  document.title = `${resultado.titulo ?? vista.titulo} · Voltia`;
  resultado.montar?.(raiz, ctx);

  const huboCambioDeRuta = ultimaRuta !== ctx.ruta.hash;
  ultimaRuta = ctx.ruta.hash;
  if (huboCambioDeRuta || enfocarTitulo) {
    window.scrollTo(0, 0);
    raiz.querySelector('#titulo-vista')?.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, scroll);
    if (foco) raiz.querySelector(`[data-foco="${CSS.escape(foco)}"]`)?.focus({ preventScroll: true });
  }
}

function renderTodo(opciones) {
  renderCabecera();
  renderBarraDemo();
  renderNavegacion();
  renderVista(opciones);
}

// ---------- Eventos ----------

document.addEventListener('click', async (e) => {
  const explica = e.target.closest('[data-explica]');
  if (explica && vistaActual?.explicar) {
    const r = vistaActual.explicar(explica.dataset.explica);
    if (r) abrirPanel(r);
    return;
  }
  if (e.target.closest('[data-cerrar-panel]')) {
    cerrarPanel();
    return;
  }
  const orden = e.target.closest('button.orden');
  if (orden) {
    ordenarTabla(orden);
    return;
  }
  const boton = e.target.closest('[data-accion]');
  if (boton && raiz.contains(boton)) {
    if (boton.getAttribute('aria-disabled') === 'true') {
      e.preventDefault();
      avisar(boton.getAttribute('title') || 'Esta acción no está disponible ahora.', 'negativo');
      return;
    }
    const manejador = vistaActual?.acciones?.[boton.dataset.accion];
    if (manejador) {
      e.preventDefault();
      boton.classList.add('btn--cargando');
      try {
        await manejador(boton.dataset.id, boton, contexto());
      } finally {
        boton.classList.remove('btn--cargando');
      }
    }
  }
});

document.querySelector('[data-saltar]')?.addEventListener('click', (e) => {
  e.preventDefault();
  raiz.focus();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrarPanel();
});

document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'demo-momento') {
    acc.cambiarMomento(e.target.value);
    ir(INICIO_POR_ROL[obtener().rol]);
  } else if (id === 'demo-rol') {
    acc.cambiarRol(e.target.value);
    const ruta = leerRuta();
    if (!rutasPermitidas(e.target.value).has(ruta.nombre)) ir(INICIO_POR_ROL[e.target.value]);
  } else if (id === 'demo-vendedor') {
    acc.cambiarVendedor(e.target.value);
  } else if (id === 'demo-estado') {
    const ruta = leerRuta();
    const [camino, consulta = ''] = ruta.hash.split('?');
    const params = new URLSearchParams(consulta);
    if (e.target.value) params.set('estado', e.target.value);
    else params.delete('estado');
    const texto = params.toString();
    location.hash = texto ? `${camino}?${texto}` : camino;
  }
});

document.addEventListener('click', (e) => {
  if (e.target.closest('#demo-reiniciar')) {
    acc.reiniciar();
    avisar('Demo restablecida a su punto de partida.', 'positivo');
    ir(INICIO_POR_ROL[obtener().rol]);
  }
});

function ordenarTabla(boton) {
  const th = boton.closest('th');
  const tabla = th.closest('table');
  const indice = [...th.parentElement.children].indexOf(th);
  const ascendente = th.getAttribute('aria-sort') !== 'ascending';
  const cuerpo = tabla.tBodies[0];
  const filas = [...cuerpo.rows].filter((f) => !f.classList.contains('grupo') && !f.dataset.fijo);
  const valor = (fila) => {
    const celda = fila.cells[indice];
    const v = celda?.dataset.val ?? celda?.textContent.trim() ?? '';
    const n = Number(v);
    return v !== '' && Number.isFinite(n) ? n : v.toLowerCase();
  };
  filas.sort((a, b) => {
    const va = valor(a);
    const vb = valor(b);
    const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
    return ascendente ? r : -r;
  });
  filas.forEach((f) => cuerpo.appendChild(f));
  th.parentElement.querySelectorAll('th').forEach((t) => t.setAttribute('aria-sort', 'none'));
  th.setAttribute('aria-sort', ascendente ? 'ascending' : 'descending');
}

let temporizador = null;
suscribir(() => {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    renderCabecera();
    renderBarraDemo();
    renderNavegacion();
    renderVista({ conservarFoco: true });
  }, 0);
});

window.addEventListener('hashchange', () => {
  cerrarPanel();
  renderTodo({ conservarFoco: false });
});

// Menú de estado de la vista: siempre refleja la ruta actual.
renderTodo({ conservarFoco: false });
