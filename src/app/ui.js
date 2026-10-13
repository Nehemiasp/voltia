// Piezas de interfaz reutilizables. Devuelven cadenas HTML; todo texto dinámico pasa por esc().

import { esc, fmtQ, fmtPct, fmtFecha, fmtFechaHora, MENOS } from '../engine/formato.js';
import { fraseEscalon } from '../engine/reglas.js';

// ---------- Íconos y chips ----------

export function ico(nombre, clase = '') {
  return `<svg class="ico ${clase}" aria-hidden="true" focusable="false"><use href="assets/iconos.svg#i-${nombre}"></use></svg>`;
}

export function chip(variante, texto, icono = null) {
  return `<span class="chip chip--${variante}">${icono ? ico(icono) : ''}${esc(texto)}</span>`;
}

const ESTADOS_PERIODO = {
  'Abierto': ['neutro', 'circle-dashed'],
  'Cerrado a ventas': ['neutro', 'lock'],
  'Calculado': ['acento', 'calculator'],
  'En revisión': ['aviso', 'eye'],
  'Aprobado': ['positivo', 'badge-check'],
  'Pagado': ['positivo', 'circle-check'],
};
export function chipPeriodo(estado) {
  const [v, i] = ESTADOS_PERIODO[estado] ?? ['neutro', 'circle'];
  return chip(v, estado, i);
}

const ESTADOS_RESULTADO = {
  'calculada': ['acento', 'Calculada', 'calculator'],
  'en-revision': ['aviso', 'En revisión', 'eye'],
  'observada': ['negativo', 'Observada', 'flag'],
  'aprobada': ['positivo', 'Aprobada', 'badge-check'],
  'pagada': ['positivo', 'Pagada', 'circle-check'],
  'ajustada': ['acento', 'Ajustada', 'git-compare'],
  'bloqueada': ['aviso', 'Bloqueada: falta meta', 'ban'],
};
export function chipResultado(clave) {
  const [v, t, i] = ESTADOS_RESULTADO[clave] ?? ['neutro', clave, 'circle'];
  return chip(v, t, i);
}
export const etiquetaResultado = (clave) => ESTADOS_RESULTADO[clave]?.[1] ?? clave;

const ESTADOS_REGLA = {
  vigente: ['positivo', 'Vigente', 'circle-check'],
  borrador: ['neutro', 'Borrador', 'pencil'],
  pendiente: ['aviso', 'Borrador · pendiente de aprobación', 'hourglass'],
  suspendida: ['aviso', 'Suspendida', 'pause'],
  vencida: ['neutro', 'Vencida', 'clock'],
};
export function chipRegla(regla) {
  const clave = regla.estado === 'borrador' && regla.pendienteAprobacion ? 'pendiente' : regla.estado;
  const [v, t, i] = ESTADOS_REGLA[clave];
  return chip(v, t, i);
}

const ESTADOS_DISPUTA = {
  'Abierta': ['aviso', 'circle-dot'],
  'En análisis': ['acento', 'search'],
  'Resuelta a favor': ['positivo', 'circle-check'],
  'Rechazada': ['neutro', 'circle-x'],
};
export function chipDisputa(estado) {
  const [v, i] = ESTADOS_DISPUTA[estado] ?? ['neutro', 'circle'];
  return chip(v, estado, i);
}

const ESTADOS_AJUSTE = {
  borrador: ['neutro', 'Borrador', 'pencil'],
  pendiente: ['aviso', 'Pendiente de autorización', 'hourglass'],
  devuelto: ['negativo', 'Devuelto al Analista', 'rotate-ccw'],
  autorizado: ['acento', 'Autorizado', 'badge-check'],
  aplicado: ['positivo', 'Aplicado', 'circle-check'],
};
export function chipAjuste(estado) {
  const [v, t, i] = ESTADOS_AJUSTE[estado] ?? ['neutro', estado, 'circle'];
  return chip(v, t, i);
}
export const etiquetaAjuste = (estado) => ESTADOS_AJUSTE[estado]?.[1] ?? estado;

export const chipRegla2 = (id) => `<span class="chip chip--regla">${esc(id)}</span>`;

// ---------- Montos ----------

export const q = (n, opciones) => esc(fmtQ(n, opciones));
export const pct = (n, opciones) => esc(fmtPct(n, opciones));

/** Variación con signo y color: baja en rojo, sube en verde. */
export function variacion(n, { inverso = false } = {}) {
  if (Math.abs(n) < 0.005) return `<span class="secundario">${q(0)}</span>`;
  const bueno = inverso ? n < 0 : n > 0;
  return `<span class="${bueno ? 'positivo' : 'negativo'}">${q(n, { signo: true })}</span>`;
}

/** Número que se puede explicar con un clic (principio 1 del producto). */
export function explicable(clave, textoHtml, { etiqueta = null } = {}) {
  const aria = etiqueta ? ` aria-label="${esc(etiqueta)}: ver de dónde sale"` : ' aria-label="Ver de dónde sale este número"';
  return `<button type="button" class="explicable" data-explica="${esc(clave)}"${aria}>${textoHtml}</button>`;
}

// ---------- Avisos y paneles ----------

const ICONO_NOTA = { info: 'info', aviso: 'triangle-alert', negativo: 'circle-alert', positivo: 'circle-check' };
export function nota(variante, contenidoHtml, { rol = null } = {}) {
  return `<div class="nota nota--${variante}"${rol ? ` role="${rol}"` : ''}>${ico(ICONO_NOTA[variante], 'ico--l')}<div class="nota__cuerpo">${contenidoHtml}</div></div>`;
}

export function panel({ titulo = '', subtitulo = '', acciones = '', cuerpo = '', sinRelleno = false, clase = '', id = '' }) {
  const cab = titulo || acciones
    ? `<div class="panel__cabecera"><div><h2 style="font-size:var(--t-m)">${esc(titulo)}</h2>${subtitulo ? `<p>${subtitulo}</p>` : ''}</div>${acciones ? `<div class="acciones">${acciones}</div>` : ''}</div>`
    : '';
  return `<section class="panel ${clase}"${id ? ` id="${id}"` : ''}>${cab}<div class="panel__cuerpo${sinRelleno ? ' panel__cuerpo--sin' : ''}">${cuerpo}</div></section>`;
}

export function encabezado({ titulo, descripcion = '', migas = '', acciones = '' }) {
  return `<header class="pagina__encabezado"><div>${migas ? `<div class="migas">${migas}</div>` : ''}<h1 id="titulo-vista" tabindex="-1">${titulo}</h1>${descripcion ? `<p>${descripcion}</p>` : ''}</div>${acciones ? `<div class="acciones">${acciones}</div>` : ''}</header>`;
}

export function dato(etiqueta, valorHtml, notaHtml = '', { grande = false } = {}) {
  return `<div class="dato"><span class="dato__etiqueta">${etiqueta}</span><span class="dato__valor${grande ? ' dato__valor--grande' : ''}">${valorHtml}</span>${notaHtml ? `<span class="dato__nota">${notaHtml}</span>` : ''}</div>`;
}

export function boton({ texto, clase = '', icono = '', accion = '', id = '', deshabilitado = false, motivo = '', tipo = 'button', href = '', foco = '' }) {
  const attrs = [
    `class="btn ${clase}"`,
    accion ? `data-accion="${esc(accion)}"` : '',
    id ? `data-id="${esc(id)}"` : '',
    foco ? `data-foco="${esc(foco)}"` : '',
    deshabilitado ? 'aria-disabled="true"' : '',
    deshabilitado && motivo ? `title="${esc(motivo)}"` : '',
  ].filter(Boolean).join(' ');
  const interior = `${icono ? ico(icono) : ''}${esc(texto)}`;
  if (href) return `<a ${attrs} href="${esc(href)}">${interior}</a>`;
  return `<button type="${tipo}" ${attrs}>${interior}</button>`;
}

/** Texto bajo un botón deshabilitado: el motivo no depende de pasar el cursor. */
export function motivoVisible(texto) {
  return texto ? `<p class="diminuto secundario" role="note" style="margin-top:6px">${ico('lock')} ${esc(texto)}</p>` : '';
}

// ---------- Estados de pantalla ----------

export function estadoVista(tipo, { titulo, texto = '', accion = '' }) {
  const icono = { vacio: 'inbox', error: 'circle-alert', sinPermiso: 'lock', cargando: 'hourglass' }[tipo] ?? 'info';
  return `<div class="estado-vista estado-vista--${tipo}" role="${tipo === 'error' ? 'alert' : 'status'}">${ico(icono)}<h2>${esc(titulo)}</h2>${texto ? `<p>${esc(texto)}</p>` : ''}${accion}</div>`;
}

export function esqueleto() {
  return `<div class="esqueleto" role="status" aria-label="Cargando"><i class="alto"></i><i></i><i></i><i></i><i></i><i></i></div>`;
}

// ---------- Barra de cumplimiento con escalones (D-01) ----------

const MAX_ESCALA = 140;

export function barraCumplimiento({ cumplimiento, escalones, anterior = null, etiquetaMarca = null }) {
  const x = (v) => Math.min(100, (Math.max(0, v) / MAX_ESCALA) * 100);
  const actual = escalones.reduce((i, e, k) => (cumplimiento >= e.desde ? k : i), 0);
  const tramos = escalones.map((e, i) => {
    const hasta = i < escalones.length - 1 ? escalones[i + 1].desde : MAX_ESCALA;
    const ancho = hasta - e.desde;
    const rango = i === 0 ? `menos de ${e.hasta === null ? hasta : escalones[i + 1].desde} %` : i === escalones.length - 1 ? `${e.desde} % o más` : `${e.desde} % a ${e.hasta} %`;
    return `<div class="tramo tramo--${i + 1}${i === actual ? ' tramo--actual' : ''}" style="flex:${ancho} 1 0">
      <span class="tramo__tasa">${esc(String(e.tasa))} %</span><span class="tramo__rango">${esc(rango)}</span></div>`;
  }).join('');
  const marcaIzq = cumplimiento > MAX_ESCALA - 14;
  const texto = etiquetaMarca ?? fmtPct(cumplimiento);
  const fantasma = anterior !== null
    ? `<span class="escala__fantasma" style="left:${x(anterior)}%"></span><span class="escala__etiqueta escala__etiqueta--antes" style="left:${x(anterior)}%">Antes: ${esc(fmtPct(anterior))}</span>`
    : '';
  return `<div class="escala" role="img" aria-label="Cumplimiento de ${esc(fmtPct(cumplimiento))}. Tasa del escalón: ${esc(String(escalones[actual].tasa))} %">
    <div class="escala__tramos" aria-hidden="true">${tramos}</div>
    <div class="escala__pista" aria-hidden="true">
      <div class="escala__relleno" style="width:${x(cumplimiento)}%"></div>
      <span class="escala__marca" style="left:${x(cumplimiento)}%"></span>
      <span class="escala__etiqueta${marcaIzq ? ' escala__etiqueta--izq' : ''}" style="left:${x(cumplimiento)}%">${esc(texto)}</span>
      ${fantasma}
    </div>
  </div>`;
}

// ---------- Cascada de reglas (P03) ----------

const FASE_VENTAS = new Set(['registradas', 'devueltas', 'excluidas', 'comisionable']);

export function cascada(pasos, { explicadores = true } = {}) {
  // Las ventas y las comisiones tienen órdenes de magnitud distintos: cada fase usa su propia escala.
  const topes = { ventas: 1, comision: 1 };
  pasos.filter((p) => p.formato !== 'pct' && p.tipo !== 'dato').forEach((p) => {
    const fase = FASE_VENTAS.has(p.clave) ? 'ventas' : 'comision';
    topes[fase] = Math.max(topes[fase], Math.abs(p.valor));
  });
  let acumulado = 0;
  let faseAnterior = null;
  const filas = pasos.map((p) => {
    const esDato = p.tipo === 'dato';
    const fase = FASE_VENTAS.has(p.clave) ? 'ventas' : 'comision';
    const tope = topes[fase];
    if (fase !== faseAnterior && !esDato) {
      acumulado = 0;
      faseAnterior = fase;
    }
    let inicio = 0;
    let ancho = 0;
    if (!esDato) {
      if (['inicio', 'subtotal', 'total'].includes(p.tipo)) {
        acumulado = p.valor;
        ancho = (Math.abs(p.valor) / tope) * 100;
      } else if (p.tipo === 'resta') {
        inicio = ((acumulado + p.valor) / tope) * 100;
        ancho = (Math.abs(p.valor) / tope) * 100;
        acumulado += p.valor;
      } else if (p.tipo === 'suma' || p.tipo === 'alerta') {
        inicio = (acumulado / tope) * 100;
        ancho = (Math.abs(p.valor) / tope) * 100;
        if (p.tipo === 'suma') acumulado += p.valor;
      }
    }
    const valorTxt = p.formato === 'pct' ? pct(p.valor) : p.tipo === 'resta' || p.tipo === 'suma' ? q(p.valor, { signo: true }) : q(p.valor);
    const valorHtml = explicadores ? explicable(p.clave, valorTxt, { etiqueta: p.titulo }) : valorTxt;
    return `<li class="paso paso--${p.tipo}">
      <span>${p.regla ? chipRegla2(p.regla) : ''}</span>
      <div><div class="paso__titulo">${esc(p.titulo)}</div>${p.detalle ? `<div class="paso__detalle">${esc(p.detalle)}</div>` : ''}</div>
      <div class="paso__barra" aria-hidden="true">${ancho > 0 ? `<span style="left:${Math.max(0, inicio).toFixed(2)}%;width:${Math.max(0.8, ancho).toFixed(2)}%"></span>` : ''}</div>
      <div class="paso__valor">${valorHtml}</div>
    </li>`;
  }).join('');
  return `<ol class="cascada" aria-label="Cascada de reglas">${filas}</ol>`;
}

// ---------- Línea de tiempo de estados del período (3.5) ----------

export function lineaEstados(actual, fechas = {}) {
  const orden = ['Abierto', 'Cerrado a ventas', 'Calculado', 'En revisión', 'Aprobado', 'Pagado'];
  const idx = orden.indexOf(actual);
  const items = orden.map((e, i) => {
    const clase = i < idx ? 'hecho' : i === idx ? 'actual' : '';
    const punto = i < idx ? ico('check') : i === idx ? ico('circle-dot') : '';
    return `<li class="${clase}"${i === idx ? ' aria-current="step"' : ''}><span class="punto">${punto}</span>${esc(e)}<small>${fechas[e] ? esc(fmtFecha(fechas[e])) : i > idx ? 'pendiente' : ''}</small></li>`;
  }).join('');
  return `<ol class="estados" aria-label="Estados del período">${items}</ol>
    <p class="estados-nota">${ico('rotate-ccw')} Si hay observaciones, el período vuelve de “En revisión” a “Calculado” con una corrida nueva.</p>`;
}

// ---------- Línea de tiempo de eventos ----------

const ICONO_EVENTO = [
  [/aprobar|autorizar/i, 'badge-check', 'positivo'],
  [/pagado|exportar/i, 'banknote', 'positivo'],
  [/observaci|devolver|rechaz/i, 'flag', 'aviso'],
  [/corrida|calcul/i, 'calculator', 'acento'],
  [/ajuste/i, 'git-compare', 'acento'],
  [/regla|borrador|activaci/i, 'pencil', 'acento'],
  [/disputa/i, 'message-square', 'aviso'],
  [/meta/i, 'flag', 'acento'],
];

export function eventos(lista, { vacio = 'Todavía no hay eventos.', enlaces = true } = {}) {
  if (!lista.length) return `<p class="secundario pequeno">${esc(vacio)}</p>`;
  const items = lista.map((e) => {
    const [, icono, tono] = ICONO_EVENTO.find(([re]) => re.test(e.accion)) ?? [null, 'circle', 'neutro'];
    const titulo = enlaces && e.entidad?.ruta ? `<a href="${esc(e.entidad.ruta)}">${esc(e.entidad.etiqueta)}</a>` : esc(e.entidad?.etiqueta ?? '');
    const cambio = e.anterior || e.nuevo
      ? `<div class="evento__cambio">${e.anterior ? `<del>${esc(e.anterior)}</del>` : ''}${e.anterior && e.nuevo ? ico('arrow-right') : ''}${e.nuevo ? `<ins>${esc(e.nuevo)}</ins>` : ''}</div>`
      : '';
    return `<li class="evento"><span class="evento__punto evento__punto--${tono}">${ico(icono)}</span><div>
      <div class="evento__titulo">${esc(e.accion)} · ${titulo}</div>
      <div class="evento__meta">${esc(e.usuario)} · ${esc(e.rol)} · ${esc(fmtFechaHora(e.fecha))}</div>${cambio}
      ${e.comentario ? `<div class="pequeno" style="margin-top:4px">${esc(e.comentario)}</div>` : ''}</div></li>`;
  }).join('');
  return `<ol class="eventos">${items}</ol>`;
}

// ---------- Frase de lectura de una regla ----------

export function fraseDeRegla(escalones, base = 'venta neta') {
  const items = escalones.map((_, i) => `<li>${esc(fraseEscalon(escalones, i, base))}</li>`).join('');
  return `<ul class="frase">${items}</ul>`;
}

// ---------- Tablas ----------

export function thOrden(texto, { num = false, defecto = false } = {}) {
  return `<th scope="col" class="${num ? 'num' : ''}" aria-sort="${defecto ? 'ascending' : 'none'}"><button type="button" class="orden">${esc(texto)}${ico('arrow-up', 'ico-orden')}</button></th>`;
}

export function resumenImpacto(filas) {
  return `<ul class="impacto">${filas.map(([k, v]) => `<li><span>${esc(k)}</span><span>${v}</span></li>`).join('')}</ul>`;
}

export function textoMenos(n) {
  return n < 0 ? `${MENOS}${Math.abs(n)}` : String(n);
}
