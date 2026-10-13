// Roles, matriz de permisos (sección 3.6) y navegación por rol (mapa de la sección 7).

import { PERSONAS } from '../engine/datos.js';

export const ROLES = {
  analista: { id: 'analista', nombre: 'Analista de Compensaciones', corto: 'Analista', persona: PERSONAS.analista },
  jefe: { id: 'jefe', nombre: 'Jefe de tienda', corto: 'Jefe de tienda', persona: PERSONAS.jefe },
  gerente: { id: 'gerente', nombre: 'Gerente Comercial', corto: 'Gerente', persona: PERSONAS.gerente },
  contabilidad: { id: 'contabilidad', nombre: 'Contabilidad', corto: 'Contabilidad', persona: PERSONAS.contabilidad },
  auditoria: { id: 'auditoria', nombre: 'Auditoría', corto: 'Auditoría', persona: PERSONAS.auditoria },
  vendedor: { id: 'vendedor', nombre: 'Vendedor', corto: 'Vendedor', persona: null },
};

export const ORDEN_ROLES = ['analista', 'jefe', 'gerente', 'contabilidad', 'auditoria', 'vendedor'];

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
  'disputa.abrir': ['vendedor'],
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
  'disputa.abrir': 'Solo el vendedor abre una disputa sobre su propio resultado.',
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
export function veResultadosDe({ rol, tiendaJefe, vendedorActivo }, vendedorId, tiendaId) {
  if (['analista', 'gerente', 'contabilidad', 'auditoria'].includes(rol)) return true;
  if (rol === 'jefe') return tiendaId === tiendaJefe;
  if (rol === 'vendedor') return vendedorId === vendedorActivo;
  return false;
}

export function veAuditoria(rol) {
  return ['analista', 'jefe', 'gerente', 'contabilidad', 'auditoria'].includes(rol);
}

// ---------- Navegación por rol ----------

const item = (ruta, texto, icono, codigo) => ({ ruta, texto, icono, codigo });

export const NAVEGACION = {
  analista: [
    { grupo: 'Reglas', items: [item('#/reglas', 'Lista de reglas', 'list-ordered', 'P01'), item('#/regla/R-001', 'Constructor', 'sliders-horizontal', 'P02'), item('#/simulador', 'Simulador', 'calculator', 'P10')] },
    { grupo: 'Períodos', items: [item('#/periodos', 'Período y corrida', 'play', 'P04'), item('#/tienda', 'Revisión de tienda', 'store', 'P05'), item('#/detalle/E-1201', 'Detalle de comisión', 'receipt-text', 'P03')] },
    { grupo: 'Correcciones', items: [item('#/ajustes', 'Ajustes', 'git-compare', 'P09'), item('#/disputas', 'Disputas', 'message-square', 'P08')] },
    { grupo: 'Rastro', items: [item('#/auditoria', 'Historial', 'history', 'P12')] },
  ],
  jefe: [
    { grupo: 'Mi tienda', items: [item('#/tienda', 'Revisión de tienda', 'store', 'P05'), item('#/disputas', 'Disputas de mi tienda', 'message-square', 'P08')] },
    { grupo: 'Rastro', items: [item('#/auditoria', 'Historial de mi tienda', 'history', 'P12')] },
  ],
  gerente: [
    { grupo: 'Decisiones', items: [item('#/aprobacion', 'Aprobación del período', 'badge-check', 'P06'), item('#/ajustes', 'Ajustes y excepciones', 'git-compare', 'P09')] },
    { grupo: 'Consulta', items: [item('#/periodos', 'Período y corrida', 'play', 'P04'), item('#/tienda', 'Tiendas', 'store', 'P05'), item('#/reglas', 'Reglas', 'list-ordered', 'P01'), item('#/disputas', 'Disputas', 'message-square', 'P08')] },
    { grupo: 'Rastro', items: [item('#/auditoria', 'Historial', 'history', 'P12')] },
  ],
  contabilidad: [
    { grupo: 'Pagos', items: [item('#/pagos', 'Pagos', 'banknote', 'P07')] },
    { grupo: 'Consulta', items: [item('#/periodos', 'Período y corrida', 'play', 'P04'), item('#/tienda', 'Tiendas', 'store', 'P05')] },
    { grupo: 'Rastro', items: [item('#/auditoria', 'Historial', 'history', 'P12')] },
  ],
  auditoria: [
    { grupo: 'Rastro', items: [item('#/auditoria', 'Historial', 'history', 'P12')] },
    { grupo: 'Solo lectura', items: [item('#/reglas', 'Reglas', 'list-ordered', 'P01'), item('#/periodos', 'Período y corrida', 'play', 'P04'), item('#/tienda', 'Tiendas', 'store', 'P05'), item('#/ajustes', 'Ajustes', 'git-compare', 'P09'), item('#/disputas', 'Disputas', 'message-square', 'P08')] },
  ],
  vendedor: [
    { grupo: 'Mi comisión', items: [item('#/mi-comision', 'Mi comisión', 'wallet', 'P11'), item('#/disputas', 'Mis disputas', 'message-square', 'P08')] },
  ],
};

/** Rutas permitidas por rol (primer segmento del hash). */
export function rutasPermitidas(rol) {
  const base = new Set(['inicio', 'sistema']);
  for (const g of NAVEGACION[rol]) for (const i of g.items) base.add(i.ruta.replace('#/', '').split('/')[0]);
  if (rol === 'analista' || rol === 'gerente' || rol === 'auditoria') {
    base.add('detalle');
    base.add('ajuste');
    base.add('disputa');
    base.add('regla');
  }
  if (rol === 'jefe') {
    base.add('detalle');
    base.add('disputa');
  }
  if (rol === 'contabilidad') base.add('detalle');
  if (rol === 'vendedor') {
    base.add('disputa');
    base.add('detalle');
  }
  return base;
}

export const INICIO_POR_ROL = {
  analista: '#/periodos', jefe: '#/tienda', gerente: '#/aprobacion', contabilidad: '#/pagos', auditoria: '#/auditoria', vendedor: '#/mi-comision',
};
