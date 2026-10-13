// Roles, matriz de permisos (sección 3.6) y navegación por rol (mapa de la sección 7).

import { PERSONAS } from '../engine/datos.js';

export const ROLES = {
  analista: { id: 'analista', nombre: 'Analista de Compensaciones', corto: 'Analista', persona: PERSONAS.analista },
  jefe: { id: 'jefe', nombre: 'Jefe de tienda', corto: 'Jefe de tienda', persona: PERSONAS.jefe },
  gerente: { id: 'gerente', nombre: 'Gerente Comercial', corto: 'Gerente', persona: PERSONAS.gerente },
  contabilidad: { id: 'contabilidad', nombre: 'Contabilidad', corto: 'Contabilidad', persona: PERSONAS.contabilidad },
  auditoria: { id: 'auditoria', nombre: 'Auditoría', corto: 'Auditoría', persona: PERSONAS.auditoria },
};

export const ORDEN_ROLES = ['analista', 'jefe', 'gerente', 'contabilidad', 'auditoria'];

// acción → roles que pueden ejecutarla
const MATRIZ = {
  'reglas.editar': ['analista'],
  'reglas.solicitarActivacion': ['analista'],
  'reglas.aprobarActivacion': ['gerente'],
  'corrida.ejecutar': ['analista'],
  'periodo.cerrarVentas': ['analista'],
  'periodo.enviarRevision': ['analista'],
  'periodo.aprobar': ['gerente'],
  'meta.cargar': ['analista'],
  'observacion.marcar': ['analista', 'jefe', 'gerente'],
  'observacion.resolver': ['analista'],
  'tope.autorizar': ['gerente'],
  'ajuste.preparar': ['analista'],
  'ajuste.autorizar': ['gerente'],
  'pago.exportar': ['contabilidad'],
  'pago.marcarPagado': ['contabilidad'],
  'disputa.resolver': ['analista'],
  'disputa.opinar': ['jefe'],
  'disputa.aprobar': ['gerente'],
  'simulador.usar': ['analista'],
};

const SOLO = {
  'reglas.editar': 'Solo el Analista de Compensaciones crea y edita reglas.',
  'reglas.solicitarActivacion': 'Solo el Analista de Compensaciones solicita activar una versión de regla.',
  'reglas.aprobarActivacion': 'Solo el Gerente Comercial aprueba la activación de una regla.',
  'corrida.ejecutar': 'Solo el Analista de Compensaciones ejecuta corridas.',
  'periodo.cerrarVentas': 'Solo el Analista de Compensaciones cierra el período a ventas.',
  'periodo.enviarRevision': 'Solo el Analista de Compensaciones envía el período a revisión.',
  'periodo.aprobar': 'Solo el Gerente Comercial aprueba el período.',
  'meta.cargar': 'Solo el Analista de Compensaciones carga metas.',
  'observacion.marcar': 'Marcar observaciones corresponde al Analista, al Jefe de tienda (de su tienda) y al Gerente.',
  'observacion.resolver': 'Solo el Analista de Compensaciones responde y cierra observaciones.',
  'tope.autorizar': 'Solo el Gerente Comercial autoriza excepciones de tope.',
  'ajuste.preparar': 'Solo el Analista de Compensaciones prepara ajustes.',
  'ajuste.autorizar': 'Solo el Gerente Comercial autoriza ajustes mayores a Q1,000.',
  'pago.exportar': 'Solo Contabilidad exporta los pagos.',
  'pago.marcarPagado': 'Solo Contabilidad marca el período como pagado.',
  'disputa.resolver': 'Solo el Analista de Compensaciones resuelve disputas.',
  'disputa.opinar': 'Solo el Jefe de tienda opina sobre una disputa de su tienda.',
  'disputa.aprobar': 'Solo el Gerente Comercial aprueba un ajuste que nace de una disputa.',
  'simulador.usar': 'Solo el Analista de Compensaciones usa el simulador.',
};

export function puede(rol, accion) {
  return (MATRIZ[accion] ?? []).includes(rol);
}

export function motivoSinPermiso(accion) {
  return SOLO[accion] ?? 'Tu rol no tiene permiso para esta acción.';
}

/** Quién puede ver resultados de qué vendedores. */
export function veResultadosDe({ rol, tiendaJefe }, tiendaId) {
  if (rol === 'jefe') return tiendaId === tiendaJefe;
  return true;
}

export function veAuditoria(rol) {
  return ['analista', 'jefe', 'gerente', 'contabilidad', 'auditoria'].includes(rol);
}

// ---------- Navegación por rol ----------
// Cada rol ve solo las secciones que le corresponden. Una sección agrupa pantallas hermanas (pestañas).

const RUTAS = {
  analista: ['inicio', 'reglas', 'regla', 'simulador', 'periodos', 'tienda', 'detalle', 'ajustes', 'ajuste', 'disputas', 'disputa', 'auditoria'],
  jefe: ['inicio', 'tienda', 'detalle', 'disputas', 'disputa', 'auditoria'],
  gerente: ['inicio', 'aprobacion', 'periodos', 'tienda', 'detalle', 'ajustes', 'ajuste', 'disputas', 'disputa', 'reglas', 'regla', 'auditoria'],
  contabilidad: ['inicio', 'pagos', 'periodos', 'tienda', 'detalle', 'auditoria'],
  auditoria: ['inicio', 'auditoria', 'reglas', 'regla', 'periodos', 'tienda', 'detalle', 'ajustes', 'ajuste', 'disputas', 'disputa'],
};

/** Rutas permitidas por rol (primer segmento del hash). */
export function rutasPermitidas(rol) {
  return new Set(RUTAS[rol]);
}

// Pestañas de las secciones con varias pantallas.
export const SECCIONES = {
  periodo: {
    etiqueta: 'Secciones del período',
    pestanas: [
      { ruta: 'periodos', texto: 'Corrida', activas: ['periodos'] },
      { ruta: 'tienda', texto: 'Tiendas', activas: ['tienda'] },
      { ruta: 'aprobacion', texto: 'Aprobación', activas: ['aprobacion'] },
      { ruta: 'pagos', texto: 'Pagos', activas: ['pagos'] },
    ],
  },
  correcciones: {
    etiqueta: 'Correcciones',
    pestanas: [
      { ruta: 'ajustes', texto: 'Ajustes', activas: ['ajustes', 'ajuste'] },
      { ruta: 'disputas', texto: 'Disputas', activas: ['disputas', 'disputa'] },
    ],
  },
};

export function seccionDe(ruta) {
  return Object.entries(SECCIONES).find(([, s]) => s.pestanas.some((p) => p.activas.includes(ruta)))?.[0] ?? null;
}

/** Pestañas que el rol puede abrir dentro de una sección. */
export function pestanasDe(rol, seccion) {
  const permitidas = rutasPermitidas(rol);
  return SECCIONES[seccion].pestanas.filter((p) => permitidas.has(p.ruta));
}

const item = (ruta, texto, icono, activas = [ruta]) => ({ ruta: `#/${ruta}`, texto, icono, activas });

export const NAVEGACION = {
  analista: [
    item('inicio', 'Inicio', 'layout-dashboard'),
    item('reglas', 'Reglas', 'list-ordered', ['reglas', 'regla']),
    item('simulador', 'Simulador', 'calculator'),
    item('periodos', 'Período', 'play', ['periodos', 'tienda', 'detalle']),
    item('ajustes', 'Correcciones', 'git-compare', ['ajustes', 'ajuste', 'disputas', 'disputa']),
    item('auditoria', 'Historial', 'history'),
  ],
  jefe: [
    item('inicio', 'Inicio', 'layout-dashboard'),
    item('tienda', 'Mi tienda', 'store', ['tienda', 'detalle']),
    item('disputas', 'Disputas', 'message-square', ['disputas', 'disputa']),
    item('auditoria', 'Historial', 'history'),
  ],
  gerente: [
    item('inicio', 'Inicio', 'layout-dashboard'),
    item('aprobacion', 'Período', 'badge-check', ['aprobacion', 'periodos', 'tienda', 'detalle']),
    item('ajustes', 'Correcciones', 'git-compare', ['ajustes', 'ajuste', 'disputas', 'disputa']),
    item('reglas', 'Reglas', 'list-ordered', ['reglas', 'regla']),
    item('auditoria', 'Historial', 'history'),
  ],
  contabilidad: [
    item('inicio', 'Inicio', 'layout-dashboard'),
    item('pagos', 'Período', 'banknote', ['pagos', 'periodos', 'tienda', 'detalle']),
    item('auditoria', 'Historial', 'history'),
  ],
  auditoria: [
    item('inicio', 'Inicio', 'layout-dashboard'),
    item('auditoria', 'Historial', 'history'),
    item('reglas', 'Reglas', 'list-ordered', ['reglas', 'regla']),
    item('periodos', 'Período', 'play', ['periodos', 'tienda', 'detalle']),
    item('ajustes', 'Correcciones', 'git-compare', ['ajustes', 'ajuste', 'disputas', 'disputa']),
  ],
};

export const INICIO_POR_ROL = {
  analista: '#/inicio', jefe: '#/inicio', gerente: '#/inicio', contabilidad: '#/inicio', auditoria: '#/inicio',
};
