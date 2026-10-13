// Carcasa de la aplicación: router por hash, menú de usuario, navegación por rol y delegación de eventos.

import { obtener, suscribir } from './estado.js';
import * as acc from './acciones.js';
import { ROLES, ORDEN_ROLES, NAVEGACION, rutasPermitidas, INICIO_POR_ROL, motivoSinPermiso, seccionDe, pestanasDe } from './permisos.js';
import { VISTAS } from './vistas/index.js';
import { abrirPanel, cerrarPanel, avisar } from './dialogos.js';
import { ico, estadoVista } from './ui.js';
import { esc } from '../engine/formato.js';

const raiz = document.getElementById('principal');
let vistaActual = null;
let ultimaRuta = null;
let menuAbierto = false;

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

// ---------- Cabecera, menú de usuario y navegación ----------

const iniciales = (nombre) => nombre.split(' ').map((p) => p[0]).slice(0, 2).join('');
const cargoDe = (rol) => ROLES[rol].persona.cargo + (rol === 'jefe' ? ' · Galerías del Sur' : '');

function renderCabecera() {
  const st = obtener();
  const persona = ROLES[st.rol].persona;
  const opciones = ORDEN_ROLES.map((r) => {
    const p = ROLES[r].persona;
    return `<li><button type="button" class="menu__opcion" data-rol="${r}" aria-pressed="${r === st.rol}">
      <span class="iniciales" aria-hidden="true">${esc(iniciales(p.nombre))}</span>
      <span class="menu__texto"><strong>${esc(p.nombre)}</strong><small>${esc(cargoDe(r))}</small></span>${r === st.rol ? ico('check') : ''}</button></li>`;
  }).join('');
  document.getElementById('cabecera').innerHTML = `
    <a class="logo" href="#/inicio" aria-label="Voltia, inicio">Voltia <small>comisiones</small></a>
    <div class="menu-usuario">
      <button type="button" class="usuario" id="btn-usuario" aria-haspopup="true" aria-expanded="${menuAbierto}" aria-controls="menu-usuario">
        <span class="usuario__texto"><strong>${esc(persona.nombre)}</strong><span>${esc(cargoDe(st.rol))}</span></span>
        <span class="iniciales" aria-hidden="true">${esc(iniciales(persona.nombre))}</span>${ico('chevron-down', 'usuario__flecha')}
      </button>
      <div class="menu" id="menu-usuario" aria-label="Cambiar de usuario" ${menuAbierto ? '' : 'hidden'}>
        <p class="menu__titulo">Cambiar de usuario</p>
        <p class="menu__ayuda">Cada rol ve solo lo que le corresponde.</p>
        <ul>${opciones}</ul>
        <button type="button" class="menu__pie" id="btn-reiniciar">${ico('rotate-ccw')}Restablecer los datos</button>
      </div>
    </div>`;
}

function cerrarMenu({ devolverFoco = false } = {}) {
  if (!menuAbierto) return;
  menuAbierto = false;
  document.getElementById('menu-usuario')?.setAttribute('hidden', '');
  const boton = document.getElementById('btn-usuario');
  boton?.setAttribute('aria-expanded', 'false');
  if (devolverFoco) boton?.focus();
}

function renderNavegacion() {
  const st = obtener();
  const ruta = leerRuta();
  const items = NAVEGACION[st.rol].map((i) => {
    const activo = i.activas.includes(ruta.nombre);
    return `<li><a href="${i.ruta}" ${activo ? 'aria-current="page"' : ''}>${ico(i.icono)}<span>${esc(i.texto)}</span></a></li>`;
  }).join('');
  document.getElementById('nav').innerHTML = `<ul>${items}</ul>`;
}

/** Pestañas de las secciones con varias pantallas (período, correcciones). */
function pestanasHtml(ctx) {
  const seccion = seccionDe(ctx.ruta.nombre);
  if (!seccion) return '';
  const lista = pestanasDe(ctx.rol, seccion);
  if (lista.length < 2) return '';
  const periodo = ctx.query.p ? `?p=${encodeURIComponent(ctx.query.p)}` : '';
  const enlaces = lista.map((t) => `<a href="#/${t.ruta}${seccion === 'periodo' ? periodo : ''}" ${t.activas.includes(ctx.ruta.nombre) ? 'aria-current="page"' : ''}>${esc(t.texto)}</a>`).join('');
  return `<nav class="pestanas pestanas--seccion" aria-label="${esc(seccion === 'periodo' ? 'Secciones del período' : 'Correcciones')}">${enlaces}</nav>`;
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
    raiz.innerHTML = `<div class="pagina">${estadoVista('vacio', { titulo: 'No encontramos esta pantalla', texto: 'La dirección no existe en Voltia.', accion: `<a class="btn btn--primario" href="#/inicio">Ir al inicio</a>` })}</div>`;
    vistaActual = null;
    document.title = 'Pantalla no encontrada · Voltia';
    return;
  }

  if (!rutasPermitidas(ctx.rol).has(nombre)) {
    raiz.innerHTML = `<div class="pagina">${estadoVista('sinPermiso', { titulo: 'Esta pantalla no es parte de tu rol', texto: `${ROLES[ctx.rol].nombre} no tiene acceso. ${vista.permiso ? motivoSinPermiso(vista.permiso) : ''}`.trim(), accion: `<a class="btn btn--primario" href="${INICIO_POR_ROL[ctx.rol]}">Ir al inicio</a>` })}</div>`;
    vistaActual = null;
    document.title = `Sin acceso · Voltia`;
    return;
  }

  let resultado;
  try {
    resultado = vista.render(ctx);
    const pestanas = pestanasHtml(ctx);
    if (pestanas) resultado.html = resultado.html.replace('<div class="pagina">', `<div class="pagina">${pestanas}`);
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
  if (e.key !== 'Escape') return;
  cerrarPanel();
  cerrarMenu({ devolverFoco: true });
});

// Menú de usuario: abrir, cambiar de rol, restablecer los datos y cerrar al pulsar fuera.
document.addEventListener('click', (e) => {
  const abrir = e.target.closest('#btn-usuario');
  if (abrir) {
    menuAbierto = !menuAbierto;
    document.getElementById('menu-usuario').toggleAttribute('hidden', !menuAbierto);
    abrir.setAttribute('aria-expanded', String(menuAbierto));
    return;
  }
  const opcion = e.target.closest('[data-rol]');
  if (opcion && opcion.closest('#menu-usuario')) {
    const rol = opcion.dataset.rol;
    menuAbierto = false;
    acc.cambiarRol(rol);
    if (!rutasPermitidas(rol).has(leerRuta().nombre)) ir(INICIO_POR_ROL[rol]);
    return;
  }
  if (e.target.closest('#btn-reiniciar')) {
    menuAbierto = false;
    acc.reiniciar();
    avisar('Datos restablecidos al 3 de abril de 2026.', 'positivo');
    ir(INICIO_POR_ROL[obtener().rol]);
    return;
  }
  if (!e.target.closest('#menu-usuario')) cerrarMenu();
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
    renderNavegacion();
    renderVista({ conservarFoco: true });
  }, 0);
});

window.addEventListener('hashchange', () => {
  cerrarPanel();
  menuAbierto = false;
  renderTodo({ conservarFoco: false });
});

renderTodo({ conservarFoco: false });
