// Estado inicial de Voltia: la fecha de trabajo es el 3 de abril de 2026. Enero y febrero están pagados,
// marzo está en revisión y abril está abierto. Todo es ficticio (ver docs/decisiones.md, D-11).

import { VERSIONES_REGLAS, CONJUNTOS, conjuntoDelPeriodo } from '../engine/reglas.js';
import { ID, PERSONAS } from '../engine/datos.js';
import { calcularPeriodo, recalcularRetroactivo } from '../engine/calculo.js';

/** Fecha de trabajo y período en foco. */
export const ESCENARIO = { fecha: '2026-04-03', reloj: '2026-04-03T09:00', periodo: '2026-03' };

export const FECHA_CORRIDA = (periodo) => {
  const [a, m] = periodo.split('-').map(Number);
  const sig = m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
  return `${sig}-02`;
};

let contadorEventos = 0;
function evento(fecha, rol, accion, entidad, anterior, nuevo, comentario = '', usuario = null) {
  contadorEventos += 1;
  const persona = PERSONAS[rol];
  return {
    id: `EV-${String(contadorEventos).padStart(4, '0')}`, fecha, usuario: usuario ?? persona?.nombre ?? 'Sistema', rol, accion,
    entidad, anterior, nuevo, comentario,
  };
}

const ent = (tipo, id, etiqueta, ruta) => ({ tipo, id, etiqueta, ruta });

function resumenCorrida(periodo, metas = {}) {
  const calc = calcularPeriodo({ periodo, config: conjuntoDelPeriodo(periodo).config, corte: FECHA_CORRIDA(periodo), metas });
  return {
    total: calc.totales.total, vendedores: calc.totales.vendedores, bloqueados: calc.totales.bloqueados,
    topes: calc.totales.requierenAutorizacion,
  };
}

function corrida(periodo, numero, fecha, hora, metas = {}) {
  const conjunto = conjuntoDelPeriodo(periodo);
  const r = resumenCorrida(periodo, metas);
  return {
    id: `C-${periodo}-${String(numero).padStart(2, '0')}`, periodo, numero, fecha, hora, por: PERSONAS.analista.nombre,
    version: conjunto.id, duracion: 36 + ((periodo.charCodeAt(6) + numero * 3) % 9), metas: { ...metas }, ...r,
  };
}

function periodoPagado(periodo, { corridas, enviado, aprobado, exportado, pagado, metas }) {
  const ultima = corridas[corridas.length - 1];
  return {
    id: periodo, estado: 'Pagado', cerradoVentas: `${periodo}-31`, corridas, corrida: ultima, enviadoRevision: enviado,
    aprobadoPor: PERSONAS.gerente.nombre, aprobadoEn: aprobado, exportado: { fecha: exportado, archivo: `voltia-comisiones-${periodo}.csv`, total: ultima.total },
    pagadoPor: PERSONAS.contabilidad.nombre, pagadoEn: pagado, metasCargadas: metas ?? {},
  };
}

function etiquetar(lista, extra) {
  return lista.map((e) => ({ ...e, ...extra }));
}

function eventosPeriodo(p) {
  const e = [];
  const ruta = `#/periodos?p=${p.id}`;
  const entidad = ent('Período', p.id, `Período ${p.id}`, ruta);
  p.corridas.forEach((c) => {
    e.push(evento(`${c.fecha}T${c.hora}`, 'analista', 'Ejecutar corrida', ent('Corrida', c.id, `${c.id} · reglas ${c.version}`, ruta), c.numero > 1 ? 'Calculado' : 'Cerrado a ventas', 'Calculado', `${c.vendedores} vendedores${c.bloqueados ? `, ${c.bloqueados} bloqueado por falta de meta` : ''}.`));
  });
  if (p.enviadoRevision) e.push(evento(`${p.enviadoRevision}T14:20`, 'analista', 'Enviar a revisión', entidad, 'Calculado', 'En revisión'));
  if (p.aprobadoEn) e.push(evento(`${p.aprobadoEn}T16:05`, 'gerente', 'Aprobar período', entidad, 'En revisión', 'Aprobado', 'Aprobado completo.'));
  if (p.exportado) e.push(evento(`${p.exportado.fecha}T10:30`, 'contabilidad', 'Exportar pago', entidad, '', p.exportado.archivo));
  if (p.pagadoEn) e.push(evento(`${p.pagadoEn}T15:45`, 'contabilidad', 'Marcar como pagado', entidad, 'Aprobado', 'Pagado'));
  return etiquetar(e, { periodo: p.id });
}

function reglasIniciales() {
  return {
    versiones: VERSIONES_REGLAS.map((r) => ({ ...r })),
    borradorR001: null,
    conjuntoActual: 'v14',
  };
}

const sinCorrida = (id, estado, extra = {}) => ({
  id, estado, cerradoVentas: null, corridas: [], corrida: null, enviadoRevision: null, aprobadoPor: null, aprobadoEn: null,
  exportado: null, pagadoPor: null, pagadoEn: null, metasCargadas: {}, ...extra,
});

const DIC = () =>
  periodoPagado('2025-12', {
    corridas: [corrida('2025-12', 1, '2026-01-02', '09:12')],
    enviado: '2026-01-05', aprobado: '2026-01-07', exportado: '2026-01-09', pagado: '2026-01-12',
  });

const META_SOFIA = 70000;

const ENE_PAGADO = () => {
  const c1 = corrida('2026-01', 1, '2026-02-02', '09:14');
  const c2 = corrida('2026-01', 2, '2026-02-02', '10:05', { [ID.sofia]: META_SOFIA });
  return periodoPagado('2026-01', {
    corridas: [c1, c2], enviado: '2026-02-03', aprobado: '2026-02-06', exportado: '2026-02-09', pagado: '2026-02-11',
    metas: { [ID.sofia]: META_SOFIA },
  });
};

const FEB_PAGADO = () =>
  periodoPagado('2026-02', {
    corridas: [corrida('2026-02', 1, '2026-03-02', '09:08')],
    enviado: '2026-03-03', aprobado: '2026-03-06', exportado: '2026-03-09', pagado: '2026-03-11',
  });

function eventosReglas() {
  const r1 = ent('Regla', 'R-001 v3', 'R-001 v3 · Comisión base escalonada', '#/regla/R-001');
  const r2 = ent('Regla', 'R-002 v3', 'R-002 v3 · Multiplicador por categoría', '#/reglas');
  return [
    evento('2025-12-10T09:30', 'analista', 'Crear borrador de regla', r1, 'R-001 v2 · escalón superior 6 %', 'R-001 v3 · escalón superior 7 %', 'Origen: acta del Comité Comercial CC-2025-12.'),
    evento('2025-12-16T11:05', 'analista', 'Solicitar activación', r1, 'borrador', 'pendiente de aprobación'),
    evento('2025-12-18T16:40', 'gerente', 'Aprobar activación', r1, 'pendiente de aprobación', 'vigente desde 2026-01-01', 'Conjunto de reglas v14.'),
    evento('2026-01-19T15:10', 'analista', 'Crear borrador de regla', r2, 'R-002 v2 · accesorios 0.6', 'R-002 v3 · accesorios 0.7', 'Origen: solicitud de Gerencia Comercial GC-2026-02.'),
    evento('2026-01-19T15:25', 'analista', 'Solicitar activación', r2, 'borrador', 'pendiente de aprobación'),
  ];
}

const VENDEDOR_DE = { 'AJ-2026-03-001': ID.marta, 'D-014': ID.jorge, 'D-011': 'E-1108' };

/** Marca cada evento con el vendedor y el período a los que se refiere, para filtrarlos en P03 y P12. */
function etiquetarEventos(eventos) {
  for (const e of eventos) {
    const m = e.entidad?.ruta?.match(/detalle\/(E-\d+)\?p=(\d{4}-\d{2})/);
    if (m) {
      e.vendedorId ??= m[1];
      e.periodo ??= m[2];
    }
    if (VENDEDOR_DE[e.entidad?.id]) {
      e.vendedorId ??= VENDEDOR_DE[e.entidad.id];
      e.periodo ??= '2026-01';
    }
    const p = e.entidad?.id?.match(/^(?:C-)?(\d{4}-\d{2})/);
    if (p && ['Corrida', 'Período'].includes(e.entidad.tipo)) e.periodo ??= p[1];
  }
}

// ---------------------------------------------------------------------------

export function estadoInicial(previo = {}) {
  contadorEventos = 0;
  const base = {
    version: 4,
    reloj: ESCENARIO.reloj,
    rol: previo.rol ?? 'analista',
    tiendaJefe: 'T03',
    periodos: {},
    metas: {},
    observaciones: [],
    decisiones: {},
    disputas: [],
    ajustes: [],
    reglas: reglasIniciales(),
    auditoria: [...eventosReglas()],
    contadores: { observacion: 7, disputa: 14, ajuste: 1, corrida: 0 },
  };

  const dic = DIC();
  const ene = ENE_PAGADO();
  const feb = FEB_PAGADO();
  const c = corrida('2026-03', 1, '2026-04-02', '09:20');
  const mar = {
    ...sinCorrida('2026-03', 'En revisión', { cerradoVentas: '2026-03-31', corridas: [c], corrida: c, enviadoRevision: '2026-04-02' }),
  };
  base.periodos = { '2025-12': dic, '2026-01': ene, '2026-02': feb, '2026-03': mar, '2026-04': sinCorrida('2026-04', 'Abierto') };
  base.metas = { [`${ID.sofia}|2026-01`]: META_SOFIA };
  base.auditoria.push(...eventosPeriodo(dic), ...eventosPeriodo(ene), ...eventosPeriodo(feb));
  base.auditoria.push(evento('2026-02-02T09:31', 'analista', 'Cargar meta', ent('Meta', 'E-1301|2026-01', 'Meta de Sofía Ramírez · 2026-01', '#/periodos?p=2026-01'), 'Sin meta', 'Q70,000', 'La corrida marcó a Sofía como bloqueada; se recalculó.'));

  // Enero: observación de tienda y tope autorizado (historia)
  base.observaciones.push({
    id: 'O-005', vendedorId: ID.ana, periodo: '2026-01', motivo: 'Revisar la venta V-0323: no aparece como comisionable.', por: 'Mónica Aguilar', rol: 'jefe',
    fecha: '2026-02-03T11:10', estado: 'resuelta', respuesta: 'La venta tuvo 28 % de descuento y supera el máximo de 25 %. Queda excluida por R-006.', resueltaPor: PERSONAS.analista.nombre, resueltaEn: '2026-02-04T09:40',
  });
  base.decisiones[`${ID.luis}|2026-01`] = {
    decision: 'autorizar', por: PERSONAS.gerente.nombre, fecha: '2026-02-05T17:15',
    comentario: 'Autorizado: cerró la mejor campaña de electrónica del trimestre.',
  };
  base.auditoria.push(
    evento('2026-02-03T11:10', 'jefe', 'Marcar observación', ent('Observación', 'O-005', 'O-005 · Ana Morales', `#/detalle/${ID.ana}?p=2026-01`), '', 'Observada', 'Revisar la venta V-0323.', 'Mónica Aguilar'),
    evento('2026-02-04T09:40', 'analista', 'Resolver observación', ent('Observación', 'O-005', 'O-005 · Ana Morales', `#/detalle/${ID.ana}?p=2026-01`), 'Observada', 'En revisión', 'Exclusión por R-006 confirmada.'),
    evento('2026-02-05T17:15', 'gerente', 'Autorizar excepción de tope', ent('Resultado', `${ID.luis}|2026-01`, 'Luis Ortega · 2026-01', `#/detalle/${ID.luis}?p=2026-01`), 'Requiere autorización', 'Autorizada', 'Comisión de Q20,160 sobre un tope de Q15,000.'),
  );

  // Disputas anteriores
  base.disputas.push(
    {
      id: 'D-011', vendedorId: 'E-1108', periodo: '2026-01', ventas: [], faltante: null,
      motivo: 'Mi meta de enero no coincide con la que me comunicaron.', estado: 'Rechazada', abierta: '2026-02-14T08:30',
      respuesta: 'La meta cargada (Q130,000) es la que consta en el acta de metas del 29 de diciembre.', resueltaPor: PERSONAS.analista.nombre, resueltaEn: '2026-02-19T10:15',
      opiniones: [], ajusteIds: [],
    },
    {
      id: 'D-012', vendedorId: 'E-1202', periodo: '2026-01', ventas: [], faltante: null,
      motivo: 'Falta una garantía extendida vendida el 27 de enero.', estado: 'Resuelta a favor', abierta: '2026-02-12T13:05',
      respuesta: 'La garantía estaba registrada en otro código de producto. Se corrige con un ajuste de Q250.', resueltaPor: PERSONAS.analista.nombre, resueltaEn: '2026-02-17T16:00',
      opiniones: [], ajusteIds: ['AJ-2026-02-001'],
    },
  );
  base.disputas.push({
    id: 'D-014', vendedorId: ID.jorge, periodo: '2026-01', ventas: [], faltante: {
      descripcion: 'Lavadora LV-20 vendida el 23 de enero. El cliente pidió entrega el 25 y la venta no aparece en mi detalle.', producto: 'Lavadora LV-20', fecha: '2026-01-23',
    },
    motivo: 'Una venta que hice no aparece en mi detalle de enero.', estado: 'Abierta', abierta: '2026-03-28T09:50',
    respuesta: '', resueltaPor: null, resueltaEn: null, opiniones: [], ajusteIds: [],
  });
  base.auditoria.push(
    evento('2026-02-14T08:30', 'vendedor', 'Abrir disputa', ent('Disputa', 'D-011', 'D-011 · Rebeca Cordón', '#/disputas'), '', 'Abierta', '', 'Rebeca Cordón'),
    evento('2026-02-19T10:15', 'analista', 'Resolver disputa', ent('Disputa', 'D-011', 'D-011 · Rebeca Cordón', '#/disputas'), 'En análisis', 'Rechazada'),
    evento('2026-03-28T09:50', 'vendedor', 'Abrir disputa', ent('Disputa', 'D-014', 'D-014 · Jorge Castillo', '#/disputa/D-014'), '', 'Abierta', 'Reclama una venta que no aparece.', 'Jorge Castillo'),
  );

  // Ajustes: febrero (disputa resuelta) y marzo (devolución de Marta)
  base.ajustes.push({
    id: 'AJ-2026-02-001', vendedorId: 'E-1202', tipo: 'disputa', motivo: 'Disputa D-012: garantía extendida mal codificada', periodoOrigen: '2026-01',
    periodoAplicacion: '2026-02', montoSolicitado: 250, estado: 'aplicado', preparadoPor: PERSONAS.analista.nombre, preparadoEn: '2026-02-17T16:00',
    autorizadoPor: PERSONAS.analista.nombre, autorizadoEn: '2026-02-17T16:00', referencia: { disputa: 'D-012' }, comentarios: [],
  });
  const rr = recalcularRetroactivo({
    vendedorId: ID.marta, periodo: '2026-01', config: CONJUNTOS.v14.config, corteOriginal: FECHA_CORRIDA('2026-01'), corteNuevo: '2026-03-10',
  });
  base.ajustes.push({
    id: 'AJ-2026-03-001', vendedorId: ID.marta, tipo: 'devolucion', motivo: 'Devolución de la venta V-0142 (9 de marzo)', periodoOrigen: '2026-01',
    periodoAplicacion: '2026-03', montoSolicitado: rr.diferencia, estado: 'pendiente', preparadoPor: PERSONAS.analista.nombre, preparadoEn: '2026-03-10T10:20',
    enviadoEn: '2026-03-10T10:42', autorizadoPor: null, autorizadoEn: null, referencia: { venta: 'V-0142' }, comentarios: [],
  });
  base.contadores.ajuste = 1;
  base.auditoria.push(
    evento('2026-03-09T12:30', 'analista', 'Registrar devolución', ent('Venta', 'V-0142', 'V-0142 · Refrigeradora RF-480', `#/detalle/${ID.marta}?p=2026-01`), 'vigente', 'devuelta', 'El cliente devolvió la refrigeradora. Período de origen: 2026-01 (pagado).'),
    evento('2026-03-10T10:20', 'analista', 'Preparar ajuste', ent('Ajuste', 'AJ-2026-03-001', 'AJ-2026-03-001 · Marta Ruiz', '#/ajuste/AJ-2026-03-001'), '', `−Q3,780 · origen 2026-01`, 'Recalculado con las reglas v14 de enero.'),
    evento('2026-03-10T10:42', 'analista', 'Enviar ajuste a autorización', ent('Ajuste', 'AJ-2026-03-001', 'AJ-2026-03-001 · Marta Ruiz', '#/ajuste/AJ-2026-03-001'), 'Borrador', 'Pendiente de autorización', 'Supera Q1,000.'),
    evento('2026-04-02T09:20', 'analista', 'Ejecutar corrida', ent('Corrida', 'C-2026-03-01', 'C-2026-03-01 · reglas v14', '#/periodos?p=2026-03'), 'Cerrado a ventas', 'Calculado', '47 vendedores.'),
    evento('2026-04-02T14:20', 'analista', 'Enviar a revisión', ent('Período', '2026-03', 'Período 2026-03', '#/periodos?p=2026-03'), 'Calculado', 'En revisión'),
  );

  // Marzo: una observación abierta de otra tienda
  base.observaciones.push({
    id: 'O-006', vendedorId: 'E-1010', periodo: '2026-03', motivo: 'Falta una venta del 28 de marzo en el registro.', por: 'Iván Calderón', rol: 'jefe',
    fecha: '2026-04-02T16:45', estado: 'abierta', respuesta: '', resueltaPor: null, resueltaEn: null,
  });
  base.auditoria.push(evento('2026-04-02T16:45', 'jefe', 'Marcar observación', ent('Observación', 'O-006', 'O-006 · Hugo Samayoa', '#/detalle/E-1010?p=2026-03'), '', 'Observada', 'Falta una venta del 28 de marzo en el registro.', 'Iván Calderón'));
  base.contadores.observacion = 7;

  etiquetarEventos(base.auditoria);
  base.auditoria.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return base;
}
