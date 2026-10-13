// Contenedor del estado de la demostración. Se guarda en localStorage solo como comodidad:
// la aplicación funciona igual si el almacenamiento no está disponible.

import { estadoInicial } from './semillas.js';

const CLAVE = 'voltia-demo-v3';
const VERSION = 3;

let estado = leer() ?? estadoInicial('M1');
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
    /* sin almacenamiento: la demostración sigue funcionando en memoria */
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
