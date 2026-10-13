// Acciones que cambian el estado. Cada una valida permisos y estado, y deja un evento de auditoría.
// Devuelven { ok: true, ...datos } o { ok: false, motivo } para que la pantalla explique por qué no se pudo.

import { obtener, reemplazar, emitir } from './estado.js';
import { estadoInicial } from './semillas.js';
import { ROLES, puede, motivoSinPermiso } from './permisos.js';
import {
  calculo, estadoPeriodo, periodoRegistro, bloqueosAprobacion, aPagar, metasPendientes,
  LIMITE_AJUSTE_SIN_GERENTE, observaciones, corteDe,
} from './selectores.js';
import { conjuntoDelPeriodo } from '../engine/reglas.js';
import { calcularPeriodo, recalcularRetroactivo } from '../engine/calculo.js';
import { ventasDe } from '../engine/ventas.js';
import { VENDEDOR } from '../engine/datos.js';
import { fmtQ, nombrePeriodo } from '../engine/formato.js';

const fallo = (motivo) => ({ ok: false, motivo });
const exito = (extra = {}) => ({ ok: true, ...extra });

function sumarMinutos(iso, minutos) {
  const [f, h] = iso.split('T');
  const [a, m, d] = f.split('-').map(Number);
  const [hh, mm] = h.split(':').map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d, hh, mm + minutos));
  return fecha.toISOString().slice(0, 16);
}

function tic(minutos = 4) {
  obtener().reloj = sumarMinutos(obtener().reloj, minutos);
}

function actor() {
  const st = obtener();
  const rol = ROLES[st.rol];
  if (st.rol === 'vendedor') return { usuario: VENDEDOR[st.vendedorActivo].nombre, rol: st.rol, vendedorId: st.vendedorActivo };
  return { usuario: rol.persona.nombre, rol: st.rol };
}

function registrar({ accion, entidad, anterior = '', nuevo = '', comentario = '', vendedorId = null, periodo = null }) {
  const st = obtener();
  const a = actor();
  st.auditoria.push({
    id: `EV-${String(st.auditoria.length + 1).padStart(4, '0')}-${st.reloj.slice(11, 16).replace(':', '')}`,
    fecha: st.reloj, usuario: a.usuario, rol: a.rol, accion, entidad, anterior, nuevo, comentario, vendedorId, periodo,
  });
}

const ent = (tipo, id, etiqueta, ruta) => ({ tipo, id, etiqueta, ruta });

function exigir(accion) {
  return puede(obtener().rol, accion) ? null : fallo(motivoSinPermiso(accion));
}

// ---------------------------------------------------------------------------
// Demostración
// ---------------------------------------------------------------------------

export function cambiarMomento(id) {
  const st = obtener();
  reemplazar(estadoInicial(id, { rol: st.rol, vendedorActivo: st.vendedorActivo }));
}

export function cambiarRol(rol) {
  obtener().rol = rol;
  emitir();
}

export function cambiarVendedor(id) {
  obtener().vendedorActivo = id;
  emitir();
}

export function reiniciar() {
  cambiarMomento(obtener().momento);
}

// ---------------------------------------------------------------------------
// Período
// ---------------------------------------------------------------------------

export function cerrarVentas(periodo) {
  const no = exigir('periodo.cerrarVentas');
  if (no) return no;
  const reg = periodoRegistro(periodo);
  if (!reg || reg.estado !== 'Abierto') return fallo('Solo se puede cerrar a ventas un período abierto.');
  reg.estado = 'Cerrado a ventas';
  reg.cerradoVentas = obtener().reloj.slice(0, 10);
  tic();
  registrar({ accion: 'Cerrar a ventas', entidad: ent('Período', periodo, `Período ${periodo}`, `#/periodos?p=${periodo}`), anterior: 'Abierto', nuevo: 'Cerrado a ventas', periodo });
  emitir();
  return exito();
}

/** Calcula con las reglas del período y las metas cargadas hoy, y congela ambas en la corrida (D-07). */
export function ejecutarCorrida(periodo) {
  const no = exigir('corrida.ejecutar');
  if (no) return no;
  const reg = periodoRegistro(periodo);
  if (!reg || !['Cerrado a ventas', 'Calculado', 'En revisión'].includes(reg.estado)) {
    return fallo('La corrida se ejecuta cuando el período está cerrado a ventas, o para recalcular antes de aprobar.');
  }
  const st = obtener();
  const anteriorEstado = reg.estado;
  const metas = {};
  for (const [clave, monto] of Object.entries(st.metas)) {
    const [vid, p] = clave.split('|');
    if (p === periodo) metas[vid] = monto;
  }
  const conjunto = conjuntoDelPeriodo(periodo);
  const corte = st.reloj.slice(0, 10);
  const calc = calcularPeriodo({ periodo, config: conjunto.config, corte, metas });
  const numero = reg.corridas.length + 1;
  tic(7);
  const c = {
    id: `C-${periodo}-${String(numero).padStart(2, '0')}`, periodo, numero, fecha: corte,
    hora: st.reloj.slice(11, 16), por: ROLES.analista.persona.nombre, version: conjunto.id, duracion: 38 + (numero % 5),
    total: calc.totales.total, vendedores: calc.totales.vendedores, bloqueados: calc.totales.bloqueados, topes: calc.totales.requierenAutorizacion,
    metas: { ...metas },
  };
  reg.corridas.push(c);
  reg.corrida = c;
  reg.estado = 'Calculado';
  reg.enviadoRevision = null;
  registrar({
    accion: numero > 1 ? 'Recalcular corrida' : 'Ejecutar corrida', entidad: ent('Corrida', c.id, `${c.id} · reglas ${c.version}`, `#/periodos?p=${periodo}`),
    anterior: anteriorEstado, nuevo: 'Calculado', periodo,
    comentario: `${c.vendedores} vendedores${c.bloqueados ? `, ${c.bloqueados} bloqueado por falta de meta` : ''}${c.topes ? `, ${c.topes} sobre el tope` : ''}.`,
  });
  emitir();
  return exito({ corrida: c });
}

export function cargarMeta(vendedorId, periodo, monto) {
  const no = exigir('meta.cargar');
  if (no) return no;
  if (!(monto > 0)) return fallo('La meta debe ser un monto mayor a cero.');
  if (estadoPeriodo(periodo) === 'Pagado') return fallo('El período ya está pagado. Una meta tardía se trata como ajuste.');
  const st = obtener();
  const clave = `${vendedorId}|${periodo}`;
  const antes = st.metas[clave];
  st.metas[clave] = monto;
  tic();
  registrar({
    accion: 'Cargar meta', entidad: ent('Meta', clave, `Meta de ${VENDEDOR[vendedorId].nombre} · ${periodo}`, `#/periodos?p=${periodo}`),
    anterior: antes === undefined ? 'Sin meta' : fmtQ(antes), nuevo: fmtQ(monto), vendedorId, periodo,
    comentario: 'La meta entra al cálculo en la siguiente corrida.',
  });
  emitir();
  return exito();
}

export function enviarARevision(periodo) {
  const no = exigir('periodo.enviarRevision');
  if (no) return no;
  const reg = periodoRegistro(periodo);
  if (!reg || reg.estado !== 'Calculado') return fallo('El período debe estar calculado.');
  const calc = calculo(periodo);
  if (calc.totales.bloqueados) return fallo('Hay vendedores bloqueados por falta de meta. Cárgala y ejecuta la corrida de nuevo.');
  if (metasPendientes(periodo).length) return fallo('Hay metas cargadas después de la corrida. Ejecuta la corrida de nuevo.');
  reg.estado = 'En revisión';
  reg.enviadoRevision = obtener().reloj.slice(0, 10);
  tic();
  registrar({ accion: 'Enviar a revisión', entidad: ent('Período', periodo, `Período ${periodo}`, `#/periodos?p=${periodo}`), anterior: 'Calculado', nuevo: 'En revisión', periodo });
  emitir();
  return exito();
}

export function aprobarPeriodo(periodo) {
  const no = exigir('periodo.aprobar');
  if (no) return no;
  const reg = periodoRegistro(periodo);
  if (!reg || reg.estado !== 'En revisión') return fallo('Solo se aprueba un período que está en revisión.');
  const bloqueos = bloqueosAprobacion(periodo);
  if (bloqueos.length) return fallo(`No se puede aprobar todavía: ${bloqueos[0].texto}`);
  const st = obtener();
  reg.estado = 'Aprobado';
  reg.aprobadoPor = ROLES.gerente.persona.nombre;
  reg.aprobadoEn = st.reloj.slice(0, 10);
  st.ajustes.filter((a) => a.periodoAplicacion === periodo && a.estado === 'autorizado').forEach((a) => { a.estado = 'aplicado'; });
  tic();
  const calc = calculo(periodo);
  const total = calc.resultados.reduce((s, r) => s + aPagar(r, periodo).monto, 0);
  registrar({
    accion: 'Aprobar período', entidad: ent('Período', periodo, `Período ${periodo}`, `#/periodos?p=${periodo}`), anterior: 'En revisión', nuevo: 'Aprobado', periodo,
    comentario: `${calc.totales.vendedores} vendedores · ${fmtQ(total)}.`,
  });
  emitir();
  return exito();
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------

export function filasDePago(periodo) {
  const calc = calculo(periodo);
  return calc.resultados
    .filter((r) => !r.bloqueado)
    .map((r) => {
      const ap = aPagar(r, periodo);
      return {
        vendedorId: r.vendedorId, nombre: r.nombre, tienda: r.tienda, comision: r.comisionBase, bono: r.bono.monto,
        ajustes: r.ajustes.reduce((s, a) => s + a.monto, 0), retenido: ap.retenido, total: ap.monto,
      };
    });
}

export function generarCsv(periodo) {
  const filas = filasDePago(periodo);
  const encabezado = ['id_vendedor', 'vendedor', 'tienda', 'periodo', 'comision', 'bono_equipo', 'ajustes', 'retenido_por_tope', 'total_a_pagar'];
  const lineas = filas.map((f) =>
    [f.vendedorId, `"${f.nombre}"`, f.tienda, periodo, f.comision.toFixed(2), f.bono.toFixed(2), f.ajustes.toFixed(2), f.retenido.toFixed(2), f.total.toFixed(2)].join(','));
  return [encabezado.join(','), ...lineas].join('\n');
}

/** Valida lo exportado contra lo aprobado: cantidad de filas, total general y total por tienda. */
export function validarExportacion(periodo, csv) {
  const calc = calculo(periodo);
  const lineas = csv.trim().split('\n').slice(1).filter(Boolean);
  const exportado = lineas.map((l) => {
    const c = l.split(',');
    return { tienda: c[c.length - 7], total: Number(c[c.length - 1]) };
  });
  const totalCsv = Math.round(exportado.reduce((s, f) => s + f.total, 0) * 100) / 100;
  const esperado = calc.resultados.filter((r) => !r.bloqueado);
  const totalAprobado = Math.round(esperado.reduce((s, r) => s + aPagar(r, periodo).monto, 0) * 100) / 100;
  const porTienda = calc.tiendas.map((t) => {
    const csvT = Math.round(exportado.filter((f) => f.tienda === t.id).reduce((s, f) => s + f.total, 0) * 100) / 100;
    const apr = Math.round(esperado.filter((r) => r.tienda === t.id).reduce((s, r) => s + aPagar(r, periodo).monto, 0) * 100) / 100;
    return { id: t.id, nombre: t.nombre, exportado: csvT, aprobado: apr, coincide: csvT === apr };
  });
  return {
    filas: { exportado: lineas.length, aprobado: esperado.length, coincide: lineas.length === esperado.length },
    total: { exportado: totalCsv, aprobado: totalAprobado, coincide: totalCsv === totalAprobado },
    porTienda,
    ok: lineas.length === esperado.length && totalCsv === totalAprobado && porTienda.every((t) => t.coincide),
  };
}

export function exportarPago(periodo) {
  const no = exigir('pago.exportar');
  if (no) return no;
  const reg = periodoRegistro(periodo);
  if (!reg || reg.estado !== 'Aprobado') return fallo('Solo se exporta un período aprobado.');
  const csv = generarCsv(periodo);
  const validacion = validarExportacion(periodo, csv);
  if (!validacion.ok) return fallo('Lo exportado no cuadra con lo aprobado. No se generó el archivo.');
  tic();
  reg.exportado = { fecha: obtener().reloj.slice(0, 10), archivo: `voltia-comisiones-${periodo}.csv`, total: validacion.total.exportado };
  registrar({ accion: 'Exportar pago', entidad: ent('Período', periodo, `Período ${periodo}`, `#/pagos?p=${periodo}`), nuevo: reg.exportado.archivo, periodo, comentario: `${validacion.filas.exportado} filas · ${fmtQ(validacion.total.exportado)}.` });
  emitir();
  return exito({ csv, archivo: reg.exportado.archivo, validacion });
}

export function marcarPagado(periodo) {
  const no = exigir('pago.marcarPagado');
  if (no) return no;
  const reg = periodoRegistro(periodo);
  if (!reg || reg.estado !== 'Aprobado') return fallo('Solo se marca como pagado un período aprobado.');
  if (!reg.exportado) return fallo('Exporta el archivo de pago antes de marcar el período como pagado.');
  reg.estado = 'Pagado';
  reg.pagadoPor = ROLES.contabilidad.persona.nombre;
  reg.pagadoEn = obtener().reloj.slice(0, 10);
  tic();
  registrar({ accion: 'Marcar como pagado', entidad: ent('Período', periodo, `Período ${periodo}`, `#/pagos?p=${periodo}`), anterior: 'Aprobado', nuevo: 'Pagado', periodo, comentario: 'Desde este momento el período no se modifica: se corrige con ajustes.' });
  emitir();
  return exito();
}

// ---------------------------------------------------------------------------
// Observaciones y excepciones
// ---------------------------------------------------------------------------

export function marcarObservacion({ vendedorId, periodo, motivo }) {
  const no = exigir('observacion.marcar');
  if (no) return no;
  const st = obtener();
  if (estadoPeriodo(periodo) !== 'En revisión') return fallo('Las observaciones se marcan cuando el período está en revisión.');
  if (st.rol === 'jefe' && VENDEDOR[vendedorId].tienda !== st.tiendaJefe) return fallo('Solo puedes observar a vendedores de tu tienda.');
  if (!motivo?.trim()) return fallo('Escribe el motivo de la observación.');
  if (observaciones(periodo, { abiertas: true, vendedorId }).length) return fallo('Este vendedor ya tiene una observación abierta.');
  st.contadores.observacion += 1;
  const id = `O-${String(st.contadores.observacion).padStart(3, '0')}`;
  tic();
  const a = actor();
  st.observaciones.push({ id, vendedorId, periodo, motivo: motivo.trim(), por: a.usuario, rol: a.rol, fecha: st.reloj, estado: 'abierta', respuesta: '', resueltaPor: null, resueltaEn: null });
  registrar({
    accion: 'Marcar observación', entidad: ent('Observación', id, `${id} · ${VENDEDOR[vendedorId].nombre}`, `#/detalle/${vendedorId}?p=${periodo}`), anterior: 'En revisión', nuevo: 'Observada',
    comentario: motivo.trim(), vendedorId, periodo,
  });
  emitir();
  return exito({ id });
}

export function resolverObservacion(id, respuesta) {
  const no = exigir('observacion.resolver');
  if (no) return no;
  const o = obtener().observaciones.find((x) => x.id === id);
  if (!o || o.estado !== 'abierta') return fallo('La observación ya no está abierta.');
  if (!respuesta?.trim()) return fallo('Escribe la respuesta para quien la marcó.');
  o.estado = 'resuelta';
  o.respuesta = respuesta.trim();
  o.resueltaPor = actor().usuario;
  tic();
  o.resueltaEn = obtener().reloj;
  registrar({
    accion: 'Resolver observación', entidad: ent('Observación', id, `${id} · ${VENDEDOR[o.vendedorId].nombre}`, `#/detalle/${o.vendedorId}?p=${o.periodo}`), anterior: 'Observada', nuevo: 'En revisión',
    comentario: respuesta.trim(), vendedorId: o.vendedorId, periodo: o.periodo,
  });
  emitir();
  return exito();
}

export function decidirTope(vendedorId, periodo, decision, comentario = '') {
  const no = exigir('tope.autorizar');
  if (no) return no;
  if (!['autorizar', 'limitar'].includes(decision)) return fallo('Decisión no válida.');
  const r = calculo(periodo).porVendedor[vendedorId];
  if (!r?.tope.excede) return fallo('Este resultado no supera el tope.');
  const st = obtener();
  tic();
  st.decisiones[`${vendedorId}|${periodo}`] = { decision, por: ROLES.gerente.persona.nombre, fecha: st.reloj, comentario };
  registrar({
    accion: decision === 'autorizar' ? 'Autorizar excepción de tope' : 'Limitar al tope', entidad: ent('Resultado', `${vendedorId}|${periodo}`, `${VENDEDOR[vendedorId].nombre} · ${periodo}`, `#/detalle/${vendedorId}?p=${periodo}`),
    anterior: 'Requiere autorización', nuevo: decision === 'autorizar' ? 'Autorizada' : `Limitada a ${fmtQ(r.tope.limite)}`, comentario: comentario || `Comisión de ${fmtQ(r.comisionBase)} sobre un tope de ${fmtQ(r.tope.limite)}.`,
    vendedorId, periodo,
  });
  emitir();
  return exito();
}

// ---------------------------------------------------------------------------
// Ajustes
// ---------------------------------------------------------------------------

function siguienteIdAjuste(periodoAplicacion) {
  const st = obtener();
  st.contadores.ajuste += 1;
  return `AJ-${periodoAplicacion}-${String(st.contadores.ajuste).padStart(3, '0')}`;
}

export function crearAjuste({ vendedorId, tipo, motivo, periodoOrigen, periodoAplicacion, montoSolicitado, referencia = {} }) {
  const no = exigir('ajuste.preparar');
  if (no) return no;
  const st = obtener();
  const id = siguienteIdAjuste(periodoAplicacion);
  tic();
  st.ajustes.push({
    id, vendedorId, tipo, motivo, periodoOrigen, periodoAplicacion, montoSolicitado, estado: 'borrador', preparadoPor: actor().usuario, preparadoEn: st.reloj,
    autorizadoPor: null, autorizadoEn: null, referencia, comentarios: [],
  });
  registrar({
    accion: 'Preparar ajuste', entidad: ent('Ajuste', id, `${id} · ${VENDEDOR[vendedorId].nombre}`, `#/ajuste/${id}`), nuevo: fmtQ(montoSolicitado),
    comentario: motivo, vendedorId, periodo: periodoOrigen,
  });
  emitir();
  return exito({ id });
}

export function enviarAjuste(id) {
  const no = exigir('ajuste.preparar');
  if (no) return no;
  const a = obtener().ajustes.find((x) => x.id === id);
  if (!a || !['borrador', 'devuelto'].includes(a.estado)) return fallo('El ajuste ya fue enviado.');
  tic();
  a.enviadoEn = obtener().reloj;
  if (Math.abs(a.montoSolicitado) > LIMITE_AJUSTE_SIN_GERENTE) {
    a.estado = 'pendiente';
    registrar({ accion: 'Enviar ajuste a autorización', entidad: ent('Ajuste', id, `${id} · ${VENDEDOR[a.vendedorId].nombre}`, `#/ajuste/${id}`), anterior: 'Borrador', nuevo: 'Pendiente de autorización', comentario: `Supera ${fmtQ(LIMITE_AJUSTE_SIN_GERENTE)}: requiere al Gerente Comercial.`, vendedorId: a.vendedorId, periodo: a.periodoOrigen });
  } else {
    a.estado = 'autorizado';
    a.autorizadoPor = actor().usuario;
    a.autorizadoEn = obtener().reloj;
    registrar({ accion: 'Autorizar ajuste', entidad: ent('Ajuste', id, `${id} · ${VENDEDOR[a.vendedorId].nombre}`, `#/ajuste/${id}`), anterior: 'Borrador', nuevo: 'Autorizado', comentario: `Dentro del límite de ${fmtQ(LIMITE_AJUSTE_SIN_GERENTE)} del Analista.`, vendedorId: a.vendedorId, periodo: a.periodoOrigen });
  }
  emitir();
  return exito({ estado: a.estado });
}

export function autorizarAjuste(id, comentario = '') {
  const no = exigir('ajuste.autorizar');
  if (no) return no;
  const a = obtener().ajustes.find((x) => x.id === id);
  if (!a || a.estado !== 'pendiente') return fallo('El ajuste no está pendiente de autorización.');
  tic();
  a.estado = 'autorizado';
  a.autorizadoPor = ROLES.gerente.persona.nombre;
  a.autorizadoEn = obtener().reloj;
  if (comentario) a.comentarios.push({ por: a.autorizadoPor, fecha: a.autorizadoEn, texto: comentario });
  registrar({ accion: 'Autorizar ajuste', entidad: ent('Ajuste', id, `${id} · ${VENDEDOR[a.vendedorId].nombre}`, `#/ajuste/${id}`), anterior: 'Pendiente de autorización', nuevo: 'Autorizado', comentario: comentario || `Se aplicará en ${nombrePeriodo(a.periodoAplicacion)}.`, vendedorId: a.vendedorId, periodo: a.periodoOrigen });
  emitir();
  return exito();
}

export function devolverAjuste(id, comentario) {
  const no = exigir('ajuste.autorizar');
  if (no) return no;
  const a = obtener().ajustes.find((x) => x.id === id);
  if (!a || a.estado !== 'pendiente') return fallo('El ajuste no está pendiente de autorización.');
  if (!comentario?.trim()) return fallo('Explica qué debe revisar el Analista.');
  tic();
  a.estado = 'devuelto';
  a.comentarios.push({ por: ROLES.gerente.persona.nombre, fecha: obtener().reloj, texto: comentario.trim() });
  registrar({ accion: 'Devolver ajuste', entidad: ent('Ajuste', id, `${id} · ${VENDEDOR[a.vendedorId].nombre}`, `#/ajuste/${id}`), anterior: 'Pendiente de autorización', nuevo: 'Devuelto al Analista', comentario: comentario.trim(), vendedorId: a.vendedorId, periodo: a.periodoOrigen });
  emitir();
  return exito();
}

// ---------------------------------------------------------------------------
// Disputas
// ---------------------------------------------------------------------------

export function abrirDisputa({ periodo, ventas = [], faltante = null, motivo }) {
  const no = exigir('disputa.abrir');
  if (no) return no;
  const st = obtener();
  if (!motivo?.trim()) return fallo('Cuéntanos qué parte de tu resultado no coincide.');
  if (!ventas.length && !faltante) return fallo('Elige las ventas en cuestión o indica la venta que falta.');
  st.contadores.disputa += 1;
  const id = `D-${String(st.contadores.disputa).padStart(3, '0')}`;
  tic();
  st.disputas.push({
    id, vendedorId: st.vendedorActivo, periodo, ventas, faltante, motivo: motivo.trim(), estado: 'Abierta', abierta: st.reloj,
    respuesta: '', resueltaPor: null, resueltaEn: null, opiniones: [], ajusteIds: [],
  });
  registrar({ accion: 'Abrir disputa', entidad: ent('Disputa', id, `${id} · ${VENDEDOR[st.vendedorActivo].nombre}`, `#/disputa/${id}`), nuevo: 'Abierta', comentario: motivo.trim(), vendedorId: st.vendedorActivo, periodo });
  emitir();
  return exito({ id });
}

export function tomarDisputa(id) {
  const no = exigir('disputa.resolver');
  if (no) return no;
  const d = obtener().disputas.find((x) => x.id === id);
  if (!d || d.estado !== 'Abierta') return fallo('La disputa ya está en análisis.');
  d.estado = 'En análisis';
  tic();
  registrar({ accion: 'Analizar disputa', entidad: ent('Disputa', id, `${id} · ${VENDEDOR[d.vendedorId].nombre}`, `#/disputa/${id}`), anterior: 'Abierta', nuevo: 'En análisis', vendedorId: d.vendedorId, periodo: d.periodo });
  emitir();
  return exito();
}

export function opinarDisputa(id, texto) {
  const no = exigir('disputa.opinar');
  if (no) return no;
  const d = obtener().disputas.find((x) => x.id === id);
  if (!d) return fallo('No se encontró la disputa.');
  if (VENDEDOR[d.vendedorId].tienda !== obtener().tiendaJefe) return fallo('Solo puedes opinar sobre disputas de tu tienda.');
  if (!texto?.trim()) return fallo('Escribe tu opinión.');
  tic();
  d.opiniones.push({ por: ROLES.jefe.persona.nombre, fecha: obtener().reloj, texto: texto.trim() });
  registrar({ accion: 'Opinar sobre disputa', entidad: ent('Disputa', id, `${id} · ${VENDEDOR[d.vendedorId].nombre}`, `#/disputa/${id}`), comentario: texto.trim(), vendedorId: d.vendedorId, periodo: d.periodo });
  emitir();
  return exito();
}

/** Calcula los ajustes que produciría mover una venta entre vendedores (reasignación). */
export function simularReasignacion({ ventaId, deVendedor, aVendedor, periodo }) {
  const config = conjuntoDelPeriodo(periodo).config;
  const origen = ventasDe(deVendedor, periodo);
  const venta = origen.find((l) => l.id === ventaId);
  if (!venta) return null;
  const nuevas = {
    [deVendedor]: origen.filter((l) => l.id !== ventaId),
    [aVendedor]: [...ventasDe(aVendedor, periodo), { ...venta, vendedor: aVendedor }],
  };
  const corte = corteDe(periodo);
  const fin = obtener().reloj.slice(0, 10);
  return {
    venta,
    recibe: recalcularRetroactivo({ vendedorId: aVendedor, periodo, config, corteOriginal: corte, corteNuevo: fin, ventasNuevas: nuevas }),
    pierde: recalcularRetroactivo({ vendedorId: deVendedor, periodo, config, corteOriginal: corte, corteNuevo: fin, ventasNuevas: nuevas }),
  };
}

export function resolverDisputa(id, { resultado, respuesta, reasignacion = null, montoManual = null }) {
  const no = exigir('disputa.resolver');
  if (no) return no;
  const st = obtener();
  const d = st.disputas.find((x) => x.id === id);
  if (!d || !['Abierta', 'En análisis'].includes(d.estado)) return fallo('La disputa ya está resuelta.');
  if (!respuesta?.trim()) return fallo('Escribe la respuesta que verá el vendedor.');
  // El período abierto más cercano al de origen (un período pagado no se reabre, D-02).
  const periodoAplicacion = Object.keys(st.periodos).sort().find((p) => p > d.periodo && st.periodos[p].estado !== 'Pagado');
  const anterior = d.estado;
  tic();
  d.respuesta = respuesta.trim();
  d.resueltaPor = ROLES.analista.persona.nombre;
  d.resueltaEn = st.reloj;

  if (resultado === 'rechazada') {
    d.estado = 'Rechazada';
  } else {
    d.estado = 'Resuelta a favor';
    if (reasignacion) {
      const sim = simularReasignacion({ ...reasignacion, periodo: d.periodo });
      const crea = (res, vendedorId, texto) => {
        const aid = siguienteIdAjuste(periodoAplicacion);
        st.ajustes.push({
          id: aid, vendedorId, tipo: 'disputa', motivo: `Disputa ${id}: ${texto}`, periodoOrigen: d.periodo, periodoAplicacion, montoSolicitado: res.diferencia, estado: 'borrador',
          preparadoPor: ROLES.analista.persona.nombre, preparadoEn: st.reloj, autorizadoPor: null, autorizadoEn: null, referencia: { disputa: id, venta: reasignacion.ventaId, deVendedor: reasignacion.deVendedor, aVendedor: reasignacion.aVendedor }, comentarios: [],
        });
        d.ajusteIds.push(aid);
        registrar({ accion: 'Preparar ajuste', entidad: ent('Ajuste', aid, `${aid} · ${VENDEDOR[vendedorId].nombre}`, `#/ajuste/${aid}`), nuevo: fmtQ(res.diferencia, { signo: true }), comentario: `Nace de la disputa ${id}.`, vendedorId, periodo: d.periodo });
      };
      crea(sim.recibe, reasignacion.aVendedor, `la venta ${reasignacion.ventaId} se reasigna a ${VENDEDOR[reasignacion.aVendedor].nombre}`);
      crea(sim.pierde, reasignacion.deVendedor, `la venta ${reasignacion.ventaId} pasa a ${VENDEDOR[reasignacion.aVendedor].nombre}`);
    } else if (montoManual) {
      const aid = siguienteIdAjuste(periodoAplicacion);
      st.ajustes.push({
        id: aid, vendedorId: d.vendedorId, tipo: 'disputa', motivo: `Disputa ${id}: corrección a favor del vendedor`, periodoOrigen: d.periodo, periodoAplicacion, montoSolicitado: montoManual, estado: 'borrador',
        preparadoPor: ROLES.analista.persona.nombre, preparadoEn: st.reloj, autorizadoPor: null, autorizadoEn: null, referencia: { disputa: id }, comentarios: [],
      });
      d.ajusteIds.push(aid);
    }
  }
  registrar({ accion: 'Resolver disputa', entidad: ent('Disputa', id, `${id} · ${VENDEDOR[d.vendedorId].nombre}`, `#/disputa/${id}`), anterior, nuevo: d.estado, comentario: d.respuesta, vendedorId: d.vendedorId, periodo: d.periodo });
  emitir();
  return exito({ ajustes: d.ajusteIds });
}

// ---------------------------------------------------------------------------
// Reglas
// ---------------------------------------------------------------------------

export function versionesDeRegla(id) {
  return obtener().reglas.versiones.filter((r) => r.id === id).sort((a, b) => a.version - b.version);
}

export function reglaVigenteActual(id) {
  return obtener().reglas.versiones.find((r) => r.id === id && r.estado === 'vigente');
}

export function borradorDe(id) {
  return obtener().reglas.versiones.find((r) => r.id === id && r.estado === 'borrador');
}

export function guardarBorradorRegla(id, datos) {
  const no = exigir('reglas.editar');
  if (no) return no;
  const st = obtener();
  const vigente = reglaVigenteActual(id);
  let borrador = borradorDe(id);
  const anterior = borrador ? 'borrador' : `${id} v${vigente.version}`;
  tic();
  if (!borrador) {
    const version = Math.max(...versionesDeRegla(id).map((r) => r.version)) + 1;
    borrador = { ...vigente, version, estado: 'borrador', pendienteAprobacion: false, vigenciaDesde: datos.vigenciaDesde, vigenciaHasta: datos.vigenciaHasta ?? null };
    st.reglas.versiones.push(borrador);
  }
  Object.assign(borrador, datos, { estado: 'borrador', modificada: st.reloj.slice(0, 10), modificadaPor: actor().usuario, pendienteAprobacion: false });
  registrar({ accion: 'Guardar borrador de regla', entidad: ent('Regla', `${id} v${borrador.version}`, `${id} v${borrador.version} · ${borrador.nombre}`, `#/regla/${id}`), anterior, nuevo: `borrador v${borrador.version}` });
  emitir();
  return exito({ version: borrador.version });
}

export function solicitarActivacion(id) {
  const no = exigir('reglas.solicitarActivacion');
  if (no) return no;
  const b = borradorDe(id);
  if (!b) return fallo('No hay un borrador que activar. Guarda tus cambios primero.');
  tic();
  b.pendienteAprobacion = true;
  registrar({ accion: 'Solicitar activación', entidad: ent('Regla', `${id} v${b.version}`, `${id} v${b.version} · ${b.nombre}`, `#/regla/${id}`), anterior: 'borrador', nuevo: 'pendiente de aprobación' });
  emitir();
  return exito();
}

export function retirarSolicitud(id) {
  const no = exigir('reglas.solicitarActivacion');
  if (no) return no;
  const b = borradorDe(id);
  if (!b) return fallo('No hay un borrador.');
  b.pendienteAprobacion = false;
  tic();
  registrar({ accion: 'Retirar solicitud de activación', entidad: ent('Regla', `${id} v${b.version}`, `${id} v${b.version} · ${b.nombre}`, `#/regla/${id}`), anterior: 'pendiente de aprobación', nuevo: 'borrador' });
  emitir();
  return exito();
}

export function aprobarActivacion(id, comentario = '') {
  const no = exigir('reglas.aprobarActivacion');
  if (no) return no;
  const st = obtener();
  const b = borradorDe(id);
  if (!b || !b.pendienteAprobacion) return fallo('No hay una activación pendiente para esta regla.');
  const vigente = reglaVigenteActual(id);
  tic();
  if (vigente) {
    vigente.estado = 'vencida';
    const dia = new Date(`${b.vigenciaDesde}T00:00:00Z`);
    dia.setUTCDate(dia.getUTCDate() - 1);
    vigente.vigenciaHasta = dia.toISOString().slice(0, 10);
  }
  b.estado = 'vigente';
  b.pendienteAprobacion = false;
  const numero = Number(st.reglas.conjuntoActual.slice(1)) + 1;
  st.reglas.conjuntoActual = `v${numero}`;
  registrar({
    accion: 'Aprobar activación', entidad: ent('Regla', `${id} v${b.version}`, `${id} v${b.version} · ${b.nombre}`, '#/reglas'), anterior: 'pendiente de aprobación', nuevo: `vigente desde ${b.vigenciaDesde}`,
    comentario: comentario || `Nuevo conjunto de reglas ${st.reglas.conjuntoActual}.`,
  });
  emitir();
  return exito();
}

export function devolverActivacion(id, comentario) {
  const no = exigir('reglas.aprobarActivacion');
  if (no) return no;
  const b = borradorDe(id);
  if (!b || !b.pendienteAprobacion) return fallo('No hay una activación pendiente para esta regla.');
  if (!comentario?.trim()) return fallo('Explica qué debe cambiar el Analista.');
  b.pendienteAprobacion = false;
  tic();
  registrar({ accion: 'Devolver activación', entidad: ent('Regla', `${id} v${b.version}`, `${id} v${b.version} · ${b.nombre}`, `#/regla/${id}`), anterior: 'pendiente de aprobación', nuevo: 'borrador', comentario: comentario.trim() });
  emitir();
  return exito();
}

