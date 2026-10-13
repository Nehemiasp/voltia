// Contenedor del estado de la aplicación. Se guarda en localStorage solo como comodidad:
// la aplicación funciona igual si el almacenamiento no está disponible.

import { estadoInicial } from './semillas.js';

const CLAVE = 'voltia-v4';
const VERSION = 4;

let estado = leer() ?? estadoInicial();
const oyentes = new Set();

function leer() {
  try {
    const texto = globalThis.localStorage?.getItem(CLAVE);
    if (!texto) return null;
    const guardado = JSON.parse(texto);
    return guardado?.version === VERSION ? guardado : null;
  } catch {
    return null;
  }
}

function guardar() {
  try {
    globalThis.localStorage?.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    /* sin almacenamiento: la aplicación sigue funcionando en memoria */
  }
}

export const obtener = () => estado;

export function reemplazar(nuevo) {
  estado = nuevo;
  emitir();
}

export function suscribir(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function emitir() {
  guardar();
  oyentes.forEach((fn) => fn(estado));
}
