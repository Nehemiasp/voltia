// Sistema de diseño de Voltia (fase 4): tokens, tipografía y componentes con sus variantes y estados.
// Todo se dibuja con las mismas funciones y clases que usan las pantallas.

import { CONJUNTOS } from '../../engine/reglas.js';
import {
  ico, chip, chipPeriodo, chipResultado, chipRegla, chipDisputa, chipAjuste, nota, panel, encabezado, boton, barraCumplimiento, cascada, lineaEstados, eventos, fraseDeRegla, estadoVista, esqueleto, thOrden, explicable, motivoVisible, resumenImpacto,
} from '../ui.js';
import { confirmar, abrirPanel } from '../dialogos.js';
import { esc } from '../../engine/formato.js';

const TOKENS = [
  ['fondo', 'Fondo de la aplicación'], ['superficie', 'Tablas, paneles, formularios'], ['linea', 'Bordes decorativos y separadores'],
  ['borde-control', 'Bordes de campos y botones (3:1)'], ['texto', 'Texto principal'], ['texto-secundario', 'Metadatos y etiquetas'],
  ['acento', 'Acción principal, selección, foco'], ['positivo', 'Aprobado, a favor'], ['aviso', 'Requiere atención, pendiente'], ['negativo', 'Error, reversión, rechazado'],
];
const FONDOS_CHIP = [['acento-fondo', 'acento'], ['positivo-fondo', 'positivo'], ['aviso-fondo', 'aviso'], ['negativo-fondo', 'negativo'], ['neutro-fondo', 'texto-secundario']];
const ESCALA = [['--t-xs', '12 px', 'Metadatos y etiquetas pequeñas'], ['--t-s', '14 px', 'Tablas, controles densos'], ['--t-m', '16 px', 'Formularios y textos explicativos'], ['--t-l', '20 px', 'Títulos de sección'], ['--t-xl', '24 px', 'Título de pantalla y cifras destacadas'], ['--t-2xl', '32 px', 'Total de un resultado']];

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}
const valorToken = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(`--${nombre}`).trim();

function seccion(id, titulo, descripcion, cuerpo) {
  return `<section class="seccion" aria-labelledby="s-${id}"><div class="seccion__titulo"><h2 id="s-${id}">${esc(titulo)}</h2>${descripcion ? `<p>${descripcion}</p>` : ''}</div>${cuerpo}</section>`;
}

function muestra(titulo, html, nota_ = '') {
  return `<div class="muestra"><div class="muestra__cab"><strong>${esc(titulo)}</strong>${nota_ ? `<span class="secundario pequeno">${esc(nota_)}</span>` : ''}</div><div class="muestra__cuerpo">${html}</div></div>`;
}

export default {
  id: 'sistema',
  titulo: 'Sistema de diseño',
  render() {
    const colores = TOKENS.map(([n, uso]) => {
      const v = valorToken(n);
      const sobre = n === 'texto' || n === 'texto-secundario' || n === 'acento' || n === 'positivo' || n === 'aviso' || n === 'negativo';
      const c = sobre ? contraste(v, valorToken('superficie')) : null;
      return `<div class="color"><span class="color__muestra" style="background:var(--${n})" aria-hidden="true"></span><div><strong>${esc(n)}</strong><div class="mono diminuto">${esc(v)}</div><div class="diminuto secundario">${esc(uso)}</div>${c ? `<div class="diminuto">${c.toFixed(2)}:1 sobre superficie ${c >= 4.5 ? '· AA' : ''}</div>` : ''}</div></div>`;
    }).join('');
    const pares = FONDOS_CHIP.map(([f, t]) => `<div class="color"><span class="color__muestra" style="background:var(--${f});color:var(--${t});display:grid;place-items:center;font-weight:600">Aa</span><div><strong>${esc(f)}</strong><div class="mono diminuto">${esc(valorToken(f))}</div><div class="diminuto">${contraste(valorToken(t), valorToken(f)).toFixed(2)}:1 con ${esc(t)}</div></div></div>`).join('');

    const escalas = ESCALA.map(([v, px, uso]) => `<div class="escala-tipo"><span style="font-size:var(${v});font-weight:600">Comisión Q9,050</span><span class="diminuto secundario">${esc(v)} · ${px} · ${esc(uso)}</span></div>`).join('');

    const botones = muestra('Botones', `<div class="fila">${boton({ texto: 'Acción principal', clase: 'btn--primario' })}${boton({ texto: 'Secundaria' })}${boton({ texto: 'Discreta', clase: 'btn--discreto' })}${boton({ texto: 'Destructiva', clase: 'btn--peligro' })}${boton({ texto: 'Con ícono', icono: 'download' })}</div>
      <div class="fila" style="margin-top:12px">${boton({ texto: 'Deshabilitado', deshabilitado: true, motivo: 'Motivo visible' })}<button class="btn btn--primario btn--cargando" type="button">Cargando</button>${boton({ texto: 'Pequeño', clase: 'btn--s' })}</div>
      ${motivoVisible('Un botón deshabilitado siempre explica por qué, sin depender del cursor.')}`, 'Normal · hover · foco con Tab · presionado · deshabilitado · cargando');

    const chips = muestra('Chips de estado', `<p class="etiqueta">Período</p><div class="fila">${['Abierto', 'Cerrado a ventas', 'Calculado', 'En revisión', 'Aprobado', 'Pagado'].map(chipPeriodo).join('')}</div>
      <p class="etiqueta" style="margin-top:12px">Resultado de un vendedor</p><div class="fila">${['calculada', 'en-revision', 'observada', 'aprobada', 'pagada', 'ajustada', 'bloqueada'].map(chipResultado).join('')}</div>
      <p class="etiqueta" style="margin-top:12px">Regla</p><div class="fila">${[{ estado: 'vigente' }, { estado: 'borrador' }, { estado: 'borrador', pendienteAprobacion: true }, { estado: 'suspendida' }, { estado: 'vencida' }].map(chipRegla).join('')}</div>
      <p class="etiqueta" style="margin-top:12px">Disputa y ajuste</p><div class="fila">${['Abierta', 'En análisis', 'Resuelta a favor', 'Rechazada'].map(chipDisputa).join('')}${['borrador', 'pendiente', 'devuelto', 'autorizado', 'aplicado'].map(chipAjuste).join('')}</div>`, 'Nunca dependen solo del color: llevan texto e ícono');

    const escalones = CONJUNTOS.v14.config.R001.escalones;
    const barra = muestra('Barra de cumplimiento con escalones', `<div class="pila">${[78, 105, 131].map((c) => barraCumplimiento({ cumplimiento: c, escalones })).join('<div style="height:12px"></div>')}</div>`, 'Muestra 78 %, 105 % y 131 %');

    const pasos = [
      { clave: 'registradas', regla: null, titulo: 'Ventas registradas', tipo: 'inicio', valor: 163800, detalle: '24 ventas' },
      { clave: 'excluidas', regla: 'R-006', titulo: 'Excluidas por descuento mayor a 25 %', tipo: 'resta', valor: -6300, detalle: 'V-0180' },
      { clave: 'comisionable', regla: null, titulo: 'Venta comisionable', tipo: 'subtotal', valor: 157500, detalle: '23 ventas' },
      { clave: 'cumplimiento', regla: 'R-001', titulo: 'Cumplimiento de meta', tipo: 'dato', valor: 105, formato: 'pct', detalle: '' },
      { clave: 'base', regla: 'R-001', titulo: 'Comisión base', tipo: 'subtotal', valor: 7875, detalle: 'Q157,500 × 5 %' },
      { clave: 'multiplicador', regla: 'R-002', titulo: 'Multiplicador por categoría', tipo: 'suma', valor: 675, detalle: '' },
      { clave: 'tope', regla: 'R-005', titulo: 'Tope individual', tipo: 'alerta', valor: 5160, detalle: 'Ejemplo de alerta que escala' },
      { clave: 'total', regla: null, titulo: 'Total del período', tipo: 'total', valor: 9050, detalle: '' },
    ];
    const cascadaEj = muestra('Cascada de reglas', `<div class="panel" style="overflow:hidden">${cascada(pasos, { explicadores: false })}</div>`, 'Filas: inicio, resta, subtotal, dato, suma, alerta, total');

    const comp = muestra('Comparador antes y después', `<table class="comparador"><thead><tr><th scope="col">Concepto</th><th scope="col">Antes</th><th scope="col">Después</th><th scope="col">Diferencia</th></tr></thead><tbody>
      <tr><td>Tasa</td><td>5 %</td><td><mark>3 %</mark></td><td class="cambio">−2 pts</td></tr><tr><td>Comisión</td><td>Q8,550</td><td>Q4,770</td><td class="cambio">−Q3,780</td></tr>
      <tr class="total"><td>Total</td><td>Q9,050</td><td>Q5,270</td><td class="cambio">−Q3,780</td></tr></tbody></table>`);

    const tabla = muestra('Tabla de datos densa', `<div class="tabla-scroll"><table class="tabla"><thead><tr>${thOrden('Venta', { defecto: true })}<th scope="col">Producto</th>${thOrden('Monto neto', { num: true })}<th scope="col">Nota</th></tr></thead><tbody>
      <tr><td class="mono">V-0136</td><td>Televisor 65" TV-65Q</td><td class="num">Q14,500</td><td></td></tr>
      <tr class="fila--atenuada"><td class="mono">V-0180</td><td><span class="atenuable">Lavadora LV-16</span></td><td class="num">Q6,300</td><td>${chip('aviso', 'Excluida · R-006', 'ban')}</td></tr>
      <tr class="fila--resaltada"><td class="mono">V-0142</td><td>Refrigeradora RF-480</td><td class="num">Q12,000</td><td>Fila seleccionada</td></tr></tbody>
      <tfoot><tr><td colspan="2">Total comisionable</td><td class="num">Q26,500</td><td></td></tr></tfoot></table></div>`, 'Orden, selección, totales, filas atenuadas, columnas fijas');

    const editor = muestra('Editor de escalones con validación', `<table class="tabla tabla-escalones"><thead><tr><th scope="col">N.º</th><th scope="col">Desde</th><th scope="col">Hasta</th><th scope="col">Tasa</th></tr></thead><tbody>
      <tr><th scope="row">1</th><td><input type="number" value="0" aria-label="Desde 1"></td><td><input type="number" value="79.99" aria-label="Hasta 1"></td><td><input type="number" value="0" aria-label="Tasa 1"></td></tr>
      <tr><th scope="row">2</th><td><input type="number" value="85" aria-invalid="true" aria-label="Desde 2"></td><td><input type="number" value="99.99" aria-label="Hasta 2"></td><td><input type="number" value="3" aria-label="Tasa 2"></td></tr>
      <tr class="fila-error"><td></td><td colspan="3"><p class="campo__error">${ico('circle-alert')}<span>Hay un hueco entre 79.99 % y 85 %: un cumplimiento de 80.00 % no tendría tasa.</span></p></td></tr></tbody></table>`, 'Detecta huecos y superposiciones');

    const lineas = muestra('Línea de tiempo de estados', lineaEstados('En revisión', { 'Cerrado a ventas': '2026-02-01', Calculado: '2026-02-02' }));
    const evs = muestra('Línea de tiempo de eventos', eventos([
      { accion: 'Aprobar período', entidad: { etiqueta: 'Período 2026-01', ruta: '#/periodos' }, usuario: 'Rodrigo Palacios', rol: 'gerente', fecha: '2026-02-06T16:05', anterior: 'En revisión', nuevo: 'Aprobado', comentario: 'Aprobado completo.' },
      { accion: 'Marcar observación', entidad: { etiqueta: 'O-005 · Ana Morales', ruta: '#/auditoria' }, usuario: 'Mónica Aguilar', rol: 'jefe', fecha: '2026-02-03T11:10', anterior: '', nuevo: 'Observada', comentario: '' },
    ]));
    const frase = muestra('Frase de lectura de una regla', fraseDeRegla(escalones), 'Se actualiza mientras se configura');
    const impacto = muestra('Resumen de impacto (confirmación)', resumenImpacto([['Qué se aprueba', 'El período de enero 2026'], ['Cuánto', '<strong>Q285,939</strong>'], ['Queda pendiente', 'Nada']]) + nota('negativo', '<strong>Esta acción no se puede deshacer.</strong>')
      + `<div class="fila" style="margin-top:12px">${boton({ texto: 'Abrir una confirmación de ejemplo', accion: 'dialogo' })}${boton({ texto: 'Abrir el panel lateral de ejemplo', accion: 'panel' })}</div>`, 'Diálogo para acciones irreversibles y panel lateral de detalle');
    const bandeja = muestra('Bandeja de pendientes por autorizar', `<ul class="bandeja"><li class="pendiente"><span class="pendiente__icono">${ico('scale')}</span><div><div class="pendiente__titulo">Excepción de tope · Luis Ortega</div><p class="pendiente__texto">Comisión de Q20,160 sobre un tope de Q15,000.</p></div><div class="pendiente__acciones">${boton({ texto: 'Autorizar excepción', clase: 'btn--s btn--primario' })}${boton({ texto: 'Limitar al tope', clase: 'btn--s' })}</div></li></ul>`);
    const estados = muestra('Estados vacío, cargando y error', `<div class="rejilla rejilla--3">${estadoVista('vacio', { titulo: 'Vacío', texto: 'Qué falta y cómo se llena.' })}<div>${esqueleto()}</div>${estadoVista('error', { titulo: 'Error', texto: 'Qué pasó y cómo resolverlo.' })}</div>`, 'Cada pantalla se puede ver así con el control “Vista” de la barra superior');
    const avisos = muestra('Avisos', `<div class="pila pila--s">${nota('info', '<strong>Información.</strong> Contexto que ayuda a decidir.')}${nota('aviso', '<strong>Atención.</strong> Algo requiere una decisión.')}${nota('negativo', '<strong>Error o bloqueo.</strong> Qué pasó y cómo seguir.')}${nota('positivo', '<strong>Listo.</strong> Todo en orden.')}</div>`);
    const numero = muestra('Número explicable', `<p>Comisión del período: ${explicable('total', 'Q9,050')}.</p><p class="secundario pequeno">Todo número que se calcula se puede pulsar y explica de dónde sale.</p>`);

    const html = `<div class="pagina">
      ${encabezado({ titulo: 'Sistema de diseño', descripcion: 'Tokens, tipografía y componentes de Voltia, con sus variantes y estados. Es la fuente de las pantallas y de la entrega a desarrollo.' })}
      <div class="pila">
        ${panel({ titulo: 'Principios del producto', cuerpo: `<ol class="principios"><li><strong>Todo número se puede explicar en un clic.</strong></li><li><strong>Nada se borra:</strong> todo se versiona y deja rastro.</li><li><strong>Mostrar lo que no cuenta</strong>, con su motivo.</li><li><strong>Las acciones irreversibles se confirman con contexto:</strong> qué, cuánto y a quién afecta.</li><li><strong>Densidad legible:</strong> mucha información por pantalla, ordenada por jerarquía y no por decoración.</li><li><strong>El estado siempre visible:</strong> en qué punto del ciclo está cada cosa.</li></ol>` })}
        ${seccion('color', 'Color', 'Los estados nunca dependen solo del color. Todos los pares de texto superan AA (4.5:1).', `<div class="colores">${colores}</div><h3 style="margin:16px 0 8px">Fondos de chips y avisos</h3><div class="colores">${pares}</div>`)}
        ${seccion('tipografia', 'Tipografía', 'IBM Plex Sans con números tabulares; IBM Plex Mono solo para identificadores (R-001, V-0142). Tres pesos: 400, 500 y 600.', `<div class="panel"><div class="panel__cuerpo pila">${escalas}<p class="mono">R-001 · V-0142 · C-2026-01-02</p><p>Montos alineados a la derecha: <span class="mono" style="font-family:var(--fuente)">Q1,234.00 · Q9,050.00 · Q157,500.00</span></p></div></div>`)}
        ${seccion('espaciado', 'Retícula, radios y sombras', 'Retícula de 8 px. Radios de 4 px en controles y 8 px en paneles. Sombra solo en menús, paneles laterales y diálogos.', `<div class="panel"><div class="panel__cuerpo fila" style="gap:24px">${[4, 8, 12, 16, 24, 32, 48, 64].map((n) => `<div style="text-align:center"><div style="width:${n}px;height:${n}px;background:var(--acento-fondo);border:1px solid var(--acento);margin:0 auto"></div><div class="diminuto secundario" style="margin-top:4px">${n}</div></div>`).join('')}</div></div>`)}
        ${seccion('componentes', 'Componentes', 'Doce componentes de la sección 9.4, con sus variantes.', `<div class="rejilla rejilla--2">${[botones, chips, barra, cascadaEj, comp, tabla, editor, lineas, evs, frase, impacto, bandeja, estados, avisos, numero].join('')}</div>`)}
        ${panel({ titulo: 'Entrega a desarrollo', cuerpo: '<p>Las especificaciones de interacción de P02, P03 y P09, con casos borde y anotaciones, están en <a href="docs/specs-interaccion.md">docs/specs-interaccion.md</a>. Los tokens y componentes están en este archivo y en <code>src/styles/</code>.</p>' })}
      </div></div>`;

    return {
      html,
      acciones: {
        async dialogo() {
          await confirmar({
            titulo: 'Aprobar enero 2026', descripcion: 'Revisa el impacto antes de confirmar.',
            resumen: [['Qué se aprueba', 'El período completo: 47 vendedores en 4 tiendas'], ['Cuánto', '<strong>Q285,939</strong>'], ['Queda pendiente', 'Nada']],
            aviso: { variante: 'negativo', html: '<strong>Esta acción no se puede deshacer.</strong>' }, irreversible: true, textoConfirmar: 'Aprobar enero 2026',
          });
        },
        panel() {
          abrirPanel({ titulo: 'Comisión del período', html: '<p>Suma de la comisión de cada categoría.</p><ul class="formula"><li><span>Línea blanca</span><span>Q4,500</span></li><li><span>Electrónica</span><span>Q3,000</span></li><li><span>Comisión</span><span>Q8,550</span></li></ul>' });
        },
      },
    };
  },
};
