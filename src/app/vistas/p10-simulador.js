// P10 · Simulador de cambio de regla. Antes de activar una versión, cuánto cuesta y a quién le cambia.

import { periodosConResultados, corteDe, configDe, metasDeCorrida } from '../selectores.js';
import { calcularPeriodo } from '../../engine/calculo.js';
import { CATEGORIAS } from '../../engine/reglas.js';
import { esc, fmtPct } from '../../engine/formato.js';
import { ico, q, pct, nota, panel, encabezado, dato, boton, variacion, estadoVista } from '../ui.js';
import { puede } from '../permisos.js';
import { periodoDe, selectorPeriodo, enlazarSelectores, migas } from './comun.js';

const PRESETS = {
  caso: { etiqueta: 'Escalón de 100 % de 5 % a 5.5 %', cambios: { tasa2: 5.5 } },
  umbral: { etiqueta: 'El umbral de 100 % baja a 95 %', cambios: { desde2: 95 } },
  tope: { etiqueta: 'El tope sube a Q18,000', cambios: { tope: 18000 } },
  cero: { etiqueta: 'Sin cambios', cambios: {} },
};

let parametros = null; // se conserva mientras la persona sigue en la pantalla

function parametrosBase(config) {
  return {
    desde: config.R001.escalones.map((e) => e.desde), tasa: config.R001.escalones.map((e) => e.tasa),
    factores: { ...config.R002.factores }, tope: config.R005.tope, bono: config.R003.monto, preset: 'caso',
  };
}

function aplicarPreset(base, nombre) {
  const p = { ...base, desde: [...base.desde], tasa: [...base.tasa], factores: { ...base.factores }, preset: nombre };
  const c = PRESETS[nombre].cambios;
  if (c.tasa2 !== undefined) p.tasa[2] = c.tasa2;
  if (c.desde2 !== undefined) p.desde[2] = c.desde2;
  if (c.tope !== undefined) p.tope = c.tope;
  return p;
}

function configSimulada(config, p) {
  const n = p.desde.length;
  const escalones = p.desde.map((d, i) => ({ desde: d, hasta: i < n - 1 ? Math.round((p.desde[i + 1] - 0.01) * 100) / 100 : null, tasa: p.tasa[i] }));
  return {
    ...config,
    R001: { ...config.R001, escalones }, R002: { factores: { ...p.factores } }, R005: { tope: p.tope }, R003: { ...config.R003, monto: p.bono },
  };
}

function hayCambioValido(p) {
  return p.desde.every((d, i) => Number.isFinite(d) && (i === 0 ? d === 0 : d > p.desde[i - 1])) && p.tasa.every((t) => Number.isFinite(t) && t >= 0);
}

function resultados(periodo, p) {
  const base = configDe(periodo);
  const sim = configSimulada(base, p);
  const corte = corteDe(periodo);
  const metas = metasDeCorrida(periodo);
  const hoy = calcularPeriodo({ periodo, config: base, corte, metas });
  const nuevo = calcularPeriodo({ periodo, config: sim, corte, metas });
  const filas = hoy.resultados.filter((r) => !r.bloqueado).map((r) => {
    const s = nuevo.porVendedor[r.vendedorId];
    return { id: r.vendedorId, nombre: r.nombre, tienda: r.tienda, antes: r.total, despues: s.total, delta: Math.round((s.total - r.total) * 100) / 100, escAntes: r.escalon.indice, escDespues: s.escalon.indice, tasaAntes: r.tasa, tasaDespues: s.tasa, cumplimiento: r.cumplimiento };
  });
  const gana = filas.filter((f) => f.delta > 0.004);
  const pierde = filas.filter((f) => f.delta < -0.004);
  const cambian = filas.filter((f) => f.escAntes !== f.escDespues);
  const costo = Math.round((nuevo.totales.total - hoy.totales.total) * 100) / 100;
  const porTienda = hoy.tiendas.map((t) => {
    const a = hoy.resultados.filter((r) => r.tienda === t.id).reduce((s, r) => s + r.total, 0);
    const b = nuevo.resultados.filter((r) => r.tienda === t.id).reduce((s, r) => s + r.total, 0);
    return { ...t, antes: a, despues: b, delta: Math.round((b - a) * 100) / 100 };
  });
  return {
    hoy, nuevo, filas, gana, pierde, cambian, costo, porTienda, base,
    promedio: gana.length ? gana.reduce((s, f) => s + f.delta, 0) / gana.length : 0,
    topes: nuevo.resultados.filter((r) => r.tope.excede).length - hoy.resultados.filter((r) => r.tope.excede).length,
  };
}

function bloqueResultados(res, p, periodo) {
  const cambiado = res.costo !== 0 || res.cambian.length > 0;
  const max = Math.max(...res.porTienda.map((t) => Math.abs(t.delta)), 1);
  const tiendas = res.porTienda.map((t) => `<tr><th scope="row">${esc(t.nombre)}</th><td class="num">${q(t.antes)}</td><td class="num">${q(t.despues)}</td>
    <td style="min-width:120px"><div class="barra-fila__pista" aria-hidden="true"><div class="barra-fila__relleno" style="width:${(Math.abs(t.delta) / max) * 100}%"></div></div></td><td class="num">${variacion(t.delta, { inverso: true })}</td></tr>`).join('');
  const top = [...res.gana].sort((a, b) => b.delta - a.delta).slice(0, 6);
  const topHtml = top.length ? `<ol class="top-lista">${top.map((f) => `<li><a href="#/detalle/${f.id}?p=${periodo}">${esc(f.nombre)}</a><span class="secundario pequeno">${pct(f.cumplimiento)} · tasa ${pct(f.tasaAntes)}</span><span class="positivo medio">${q(f.delta, { signo: true })}</span></li>`).join('')}</ol>` : '<p class="secundario pequeno">Nadie gana con este cambio.</p>';
  const cambian = res.cambian.length
    ? `<ul class="top-lista">${res.cambian.map((f) => `<li><a href="#/detalle/${f.id}?p=${periodo}">${esc(f.nombre)}</a><span class="secundario pequeno">${pct(f.cumplimiento)}</span><span class="medio">${pct(f.tasaAntes)} ${ico('arrow-right')} ${pct(f.tasaDespues)}</span></li>`).join('')}</ul>`
    : '<p class="secundario pequeno">Nadie cambia de escalón. El cambio de tasa dentro de un escalón no mueve a nadie de lugar.</p>';

  return `<div class="pila">
    ${panel({ cuerpo: `<div class="datos-fila">
      ${dato('Costo adicional del período', `<span class="${res.costo > 0 ? 'negativo' : res.costo < 0 ? 'positivo' : ''}">${q(res.costo, { signo: true })}</span>`, `${res.costo >= 0 ? '+' : '−'}${esc(fmtPct(Math.abs(res.costo) / res.hoy.totales.total * 100, { decimales: 2 }))} sobre ${q(res.hoy.totales.total)}`, { grande: true })}
      ${dato('Vendedores que ganan', String(res.gana.length), `de ${res.filas.length}${res.pierde.length ? ` · ${res.pierde.length} pierden` : ''}`)}
      ${dato('Ganancia promedio', q(res.promedio), 'por vendedor que gana')}
      ${dato('Cambian de escalón', String(res.cambian.length), res.topes ? `${res.topes > 0 ? '+' : ''}${res.topes} sobre el tope` : 'Sin cambios en topes')}
    </div>${!cambiado ? `<p class="secundario pequeno" style="margin-top:12px">No hay cambios respecto de las reglas vigentes. Mueve un parámetro o elige un ejemplo.</p>` : ''}` })}
    ${panel({ titulo: 'Distribución por tienda', cuerpo: `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Efecto por tienda</caption><thead><tr><th scope="col">Tienda</th><th scope="col" class="num">Hoy</th><th scope="col" class="num">Simulado</th><th scope="col"><span class="solo-lectores">Barra</span></th><th scope="col" class="num">Diferencia</th></tr></thead><tbody>${tiendas}</tbody></table></div>`, sinRelleno: true })}
    <div class="rejilla rejilla--2">
      ${panel({ titulo: 'Quién gana más', subtitulo: 'Los seis mayores aumentos.', cuerpo: topHtml })}
      ${panel({ titulo: 'Cambiarían de escalón', cuerpo: cambian })}
    </div>
  </div>`;
}

export default {
  id: 'simulador',
  titulo: 'Simulador de cambio de regla',
  permiso: 'simulador.usar',
  vacio: { titulo: 'No hay un período calculado para simular', texto: 'El simulador usa las ventas de un período ya calculado.' },
  render(ctx) {
    const periodos = periodosConResultados();
    if (!periodos.length) return { html: `<div class="pagina">${encabezado({ titulo: 'Simulador de cambio de regla' })}${estadoVista('vacio', { titulo: 'Todavía no hay un período calculado', texto: 'Ejecuta la corrida de un período para simular con sus ventas.' })}</div>` };
    const periodo = ctx.query.p && periodos.includes(ctx.query.p) ? ctx.query.p : periodos.includes('2026-01') ? '2026-01' : periodoDe(ctx);
    const base = parametrosBase(configDe(periodo));
    if (!parametros || parametros.periodo !== periodo) parametros = { ...aplicarPreset(base, 'caso'), periodo };
    const p = parametros;
    const analista = puede(ctx.rol, 'simulador.usar');
    const esc1 = configDe(periodo).R001.escalones;

    const filasEsc = p.desde.map((d, i) => `<tr><th scope="row">${i + 1}</th>
      <td><input type="number" step="0.01" data-sim="desde" data-i="${i}" value="${d}" ${i === 0 ? 'disabled' : ''} aria-label="Desde del escalón ${i + 1}"></td>
      <td><input type="number" step="0.1" min="0" data-sim="tasa" data-i="${i}" value="${p.tasa[i]}" aria-label="Tasa del escalón ${i + 1}"></td>
      </tr>`).join('');
    const filasFac = CATEGORIAS.map((c) => `<tr><th scope="row">${esc(c)}</th><td><input type="number" step="0.1" min="0" data-sim="factor" data-c="${esc(c)}" value="${p.factores[c]}" aria-label="Factor de ${esc(c)}"> <span class="diminuto secundario">hoy ${configDe(periodo).R002.factores[c].toFixed(1)}</span></td></tr>`).join('');

    const presets = Object.entries(PRESETS).map(([k, v]) => `<button type="button" class="btn btn--s ${p.preset === k ? 'btn--primario' : ''}" data-accion="preset" data-id="${k}" aria-pressed="${p.preset === k}">${esc(v.etiqueta)}</button>`).join('');

    const html = `<div class="pagina">
      ${encabezado({ titulo: 'Simulador de cambio de regla', descripcion: 'Antes de activar una versión, mira cuánto cuesta y a quién le cambia. Usa las ventas reales del período elegido.', migas: migas('Reglas', 'Simulador'), acciones: selectorPeriodo(ctx, periodo) })}
      <div class="rejilla rejilla--principal" style="align-items:start">
        <div class="pila" id="sim-resultados" aria-live="polite"></div>
        <div class="pila panel--sticky">
          ${panel({ titulo: 'Qué cambiar', subtitulo: 'Parte de las reglas vigentes. Nada de esto se guarda.', cuerpo: `
            <p class="etiqueta" style="margin-bottom:8px">Ejemplos</p><div class="fila" style="margin-bottom:16px">${presets}</div>
            <p class="etiqueta">R-001 · Escalones</p>
            <div class="tabla-scroll"><table class="tabla tabla-escalones"><thead><tr><th scope="col">N.º</th><th scope="col">Desde (%)</th><th scope="col">Tasa (%)</th></tr></thead><tbody>${filasEsc}</tbody></table></div>
            <p class="diminuto secundario">Hoy: ${esc1.map((e) => `${e.desde} % → ${e.tasa} %`).join(' · ')}</p>
            <p class="etiqueta" style="margin-top:16px">R-002 · Factor por categoría</p>
            <div class="tabla-scroll"><table class="tabla tabla-escalones"><thead><tr><th scope="col">Categoría</th><th scope="col">Factor</th></tr></thead><tbody>${filasFac}</tbody></table></div>
            <div class="rejilla rejilla--2" style="margin-top:16px"><div class="campo"><label for="sim-tope">R-005 · Tope (Q)</label><input id="sim-tope" type="number" step="500" min="0" data-sim="tope" value="${p.tope}"></div>
              <div class="campo"><label for="sim-bono">R-003 · Bono (Q)</label><input id="sim-bono" type="number" step="50" min="0" data-sim="bono" value="${p.bono}"></div></div>` })}
          <div id="sim-acciones"></div>
        </div>
      </div></div>`;

    function pintar(raiz) {
      const ok = hayCambioValido(p);
      const zona = raiz.querySelector('#sim-resultados');
      zona.innerHTML = ok ? bloqueResultados(resultados(periodo, p), p, periodo) : nota('aviso', '<strong>Los escalones no son válidos.</strong><p>El primero empieza en 0 % y cada uno empieza después del anterior.</p>');
      const soloR001 = p.tope === base.tope && p.bono === base.bono && CATEGORIAS.every((c) => p.factores[c] === base.factores[c]);
      const cambioEsc = p.desde.some((d, i) => d !== base.desde[i]) || p.tasa.some((t, i) => t !== base.tasa[i]);
      const acciones = raiz.querySelector('#sim-acciones');
      acciones.innerHTML = `<div class="pila pila--s">${boton({ texto: 'Crear borrador de R-001 con este cambio', clase: 'btn--primario', icono: 'pencil', accion: 'borrador', deshabilitado: !ok || !soloR001 || !cambioEsc || !analista, motivo: !analista ? 'Solo el Analista crea borradores.' : !cambioEsc ? 'Cambia un escalón para crear un borrador.' : !soloR001 ? 'El borrador se crea desde cambios a los escalones de R-001.' : 'Los escalones no son válidos.' })}
        <p class="diminuto secundario">El borrador necesita aprobación del Gerente antes de activarse.</p></div>`;
    }

    return {
      html,
      montar(raiz) {
        enlazarSelectores(raiz);
        raiz.addEventListener('input', (e) => {
          const t = e.target;
          if (!t.dataset.sim) return;
          const v = t.value === '' ? NaN : Number(t.value);
          if (t.dataset.sim === 'desde') p.desde[Number(t.dataset.i)] = v;
          else if (t.dataset.sim === 'tasa') p.tasa[Number(t.dataset.i)] = v;
          else if (t.dataset.sim === 'factor') p.factores[t.dataset.c] = v;
          else p[t.dataset.sim] = v;
          p.preset = '';
          raiz.querySelectorAll('[data-accion="preset"]').forEach((b) => { b.classList.remove('btn--primario'); b.setAttribute('aria-pressed', 'false'); });
          pintar(raiz);
        });
        pintar(raiz);
      },
      acciones: {
        preset(nombre) {
          parametros = { ...aplicarPreset(base, nombre), periodo };
          ctx.refrescar();
        },
        borrador() {
          const e = p.desde.map((d, i) => `${d}:${p.tasa[i]}`).join(',');
          ctx.ir(`#/regla/R-001?e=${e}`);
        },
      },
    };
  },
};
