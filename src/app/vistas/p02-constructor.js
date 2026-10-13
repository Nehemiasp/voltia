// P02 · Constructor de reglas (edita R-001). Formulario estructurado con frase de lectura en vivo (D-08).

import { obtener } from '../estado.js';
import { borradorDe, reglaVigenteActual, versionesDeRegla } from '../acciones.js';
import { fechaHoy, periodoRegistro, metasDeCorrida } from '../selectores.js';
import { CONJUNTOS, RESPONSABLES, fraseEscalon } from '../../engine/reglas.js';
import { calcularPeriodo } from '../../engine/calculo.js';
import { VENDEDOR, ID, TIENDAS } from '../../engine/datos.js';
import { vendedoresDelPeriodo } from '../../engine/ventas.js';
import { esc, fmtQ, fmtPct, fmtFechaLarga } from '../../engine/formato.js';
import { ico, chip, chipRegla, q, pct, nota, panel, encabezado, boton, motivoVisible, variacion, estadoVista, fraseDeRegla } from '../ui.js';
import { confirmar } from '../dialogos.js';
import { puede, motivoSinPermiso } from '../permisos.js';
import { validarBorrador, fechaMinimaVigencia, primerDiaMesSiguiente } from '../validacion.js';
import { migas } from './comun.js';

const formularios = {}; // cambios sin guardar, por regla
const BASES = ['venta neta', 'venta bruta', 'comisión calculada'];
const ALCANCES = ['Todos los vendedores', 'Una tienda', 'Una categoría de vendedor'];
let vendedorVista = ID.marta;

function textoCalculo(escalones) {
  return escalones
    .map((e, i) => (i === 0 ? `menos de ${escalones[1]?.desde ?? e.hasta} %: ${e.tasa} %` : e.hasta === null || e.hasta === undefined ? `${e.desde} % o más: ${e.tasa} %` : `${e.desde} % a ${e.hasta} %: ${e.tasa} %`))
    .join(' · ');
}

function formularioInicial(id, ctx) {
  const borrador = borradorDe(id);
  const base = borrador ?? reglaVigenteActual(id);
  const desde = borrador ? borrador.vigenciaDesde : primerDiaMesSiguiente(fechaHoy());
  const f = {
    id, version: borrador ? borrador.version : Math.max(...versionesDeRegla(id).map((r) => r.version)) + 1, nombre: base.nombre, tipo: base.tipo,
    alcance: base.alcance, alcanceDetalle: '', condicion: base.condicion, base: BASES.find((b) => b === base.base.toLowerCase().split(',')[0]) ?? 'venta neta',
    escalones: base.escalones ? base.escalones.map((e) => ({ ...e })) : null, calculo: base.calculo, prioridad: base.prioridad, acumulable: base.acumulable,
    vigenciaDesde: desde, vigenciaHasta: base.vigenciaHasta && borrador ? base.vigenciaHasta : '', fuente: borrador ? base.fuente : '', responsable: base.responsable,
    guardado: Boolean(borrador), sucio: false,
  };
  // el simulador puede enviar escalones propuestos: ?e=0:0,80:3,100:5.5,120:7
  if (ctx.query.e && f.escalones) {
    const partes = ctx.query.e.split(',').map((p) => p.split(':').map(Number));
    f.escalones = partes.map(([desde_, tasa], i) => ({ desde: desde_, tasa, hasta: null })).map((e, i, a) => ({ ...e, hasta: i < a.length - 1 ? Math.round((a[i + 1].desde - 0.01) * 100) / 100 : null }));
    f.sucio = true;
    f.fuente = 'Simulación de cambio de regla (P10)';
  }
  return f;
}

function datosParaGuardar(f) {
  return {
    nombre: f.nombre.trim(), alcance: f.alcance, condicion: f.condicion, base: f.base.charAt(0).toUpperCase() + f.base.slice(1),
    calculo: f.escalones ? `Tabla de escalones sobre toda la ${f.base} comisionable. ${textoCalculo(f.escalones)}.` : f.calculo,
    ...(f.escalones ? { escalones: f.escalones.map((e) => ({ ...e })) } : {}),
    prioridad: f.prioridad, acumulable: f.acumulable, vigenciaDesde: f.vigenciaDesde, vigenciaHasta: f.vigenciaHasta || null,
    fuente: f.fuente.trim(), responsable: f.responsable,
  };
}

function configEditada(f) {
  const v14 = CONJUNTOS.v14.config;
  return f.escalones ? { ...v14, R001: { ...v14.R001, escalones: f.escalones, base: f.base } } : v14;
}

function vistaPrevia(f, valido) {
  if (!f.escalones) return `<p class="secundario pequeno">La vista previa con un vendedor está disponible para reglas escalonadas.</p>`;
  if (!valido) return nota('aviso', '<strong>Corrige los escalones para ver la vista previa.</strong>');
  const corte = periodoRegistro('2026-01')?.corrida?.fecha ?? '2026-02-02';
  const metas = metasDeCorrida('2026-01');
  const vigente = calcularPeriodo({ periodo: '2026-01', config: CONJUNTOS.v14.config, corte, metas });
  const editada = calcularPeriodo({ periodo: '2026-01', config: configEditada(f), corte, metas });
  const a = vigente.porVendedor[vendedorVista];
  const b = editada.porVendedor[vendedorVista];
  if (a.bloqueado) return nota('aviso', `<strong>${esc(a.nombre)} no tiene meta en enero.</strong> Elige a otra persona para comparar.`);
  const fila = (t, x, y, tipo = 'q') => {
    const fmt = (n) => (tipo === 'pct' ? pct(n) : q(n));
    const d = y - x;
    return `<tr><td>${t}</td><td>${fmt(x)}</td><td>${fmt(y)}</td><td class="${d < 0 ? 'cambio' : d > 0 ? 'cambio cambio--sube' : ''}">${Math.abs(d) < 0.005 ? '<span class="secundario">sin cambio</span>' : tipo === 'pct' ? `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} pts` : variacion(d)}</td></tr>`;
  };
  return `<table class="comparador"><caption class="solo-lectores">Resultado con la versión vigente y con la versión en edición</caption>
    <thead><tr><th scope="col">${esc(a.nombre)}, enero</th><th scope="col">Vigente<small>v${reglaVigenteActual(f.id).version}</small></th><th scope="col">En edición<small>v${f.version}</small></th><th scope="col">Diferencia</th></tr></thead>
    <tbody>${fila('Cumplimiento', a.cumplimiento, b.cumplimiento, 'pct')}${fila('Tasa del escalón', a.tasa, b.tasa, 'pct')}${fila('Comisión', a.comisionBase, b.comisionBase)}${fila('Bono de equipo', a.bono.monto, b.bono.monto)}
    <tr class="total"><td>Total de enero</td><td>${q(a.total)}</td><td>${q(b.total)}</td><td class="${b.total < a.total ? 'cambio' : b.total > a.total ? 'cambio cambio--sube' : ''}">${Math.abs(b.total - a.total) < 0.005 ? 'sin cambio' : variacion(b.total - a.total)}</td></tr></tbody></table>
    <p class="diminuto secundario" style="margin-top:8px">Con las ventas reales de ${esc(a.nombre.split(' ')[0])} en enero. Para ver el efecto en las 47 personas, usa el <a href="#/simulador">simulador</a>.</p>`;
}

function filaEscalon(e, i, total, bloqueado) {
  const ultimo = i === total - 1;
  const campo = (nombre, valor, extra = '') => `<input type="number" step="0.01" inputmode="decimal" data-esc="${i}" data-campo="${nombre}" value="${valor ?? ''}" ${bloqueado ? 'disabled' : ''} ${extra} aria-label="${nombre === 'desde' ? 'Desde' : nombre === 'hasta' ? 'Hasta' : 'Tasa'} del escalón ${i + 1}">`;
  return `<tr><th scope="row">${i + 1}</th><td>${campo('desde', e.desde)}</td>
    <td>${ultimo ? '<span class="secundario">o más</span>' : campo('hasta', e.hasta)}</td><td>${campo('tasa', e.tasa)}</td>
    <td>${total > 1 && !bloqueado ? `<button type="button" class="btn btn--s btn--discreto" data-quitar="${i}" aria-label="Quitar el escalón ${i + 1}">${ico('trash-2')}</button>` : ''}</td></tr>
    <tr class="fila-error" hidden><td></td><td colspan="4"><p class="campo__error" data-error-escalon="${i}">${ico('circle-alert')}<span></span></p></td></tr>`;
}

export default {
  id: 'regla',
  titulo: 'Constructor de reglas',
  permiso: 'reglas.editar',
  render(ctx) {
    const id = ctx.param ?? 'R-001';
    const vigente = reglaVigenteActual(id);
    if (!vigente) return { html: `<div class="pagina">${encabezado({ titulo: 'Constructor de reglas' })}${estadoVista('vacio', { titulo: 'No encontramos esa regla', texto: `${esc(id)} no existe.`, accion: '<a class="btn" href="#/reglas">Ver las reglas</a>' })}</div>` };

    const guardado = borradorDe(id);
    if (!formularios[id] || ctx.query.e) formularios[id] = formularioInicial(id, ctx);
    const f = formularios[id];
    const pendiente = Boolean(guardado?.pendienteAprobacion);
    const analista = puede(ctx.rol, 'reglas.editar');
    const gerente = puede(ctx.rol, 'reglas.aprobarActivacion');
    const bloqueado = !analista || pendiente;
    const versiones = versionesDeRegla(id).filter((r) => r.estado !== 'borrador' || r.version === f.version).reverse();
    const estadoVersion = pendiente ? 'pendiente' : guardado ? 'borrador' : 'nuevo';

    const dis = bloqueado ? 'disabled' : '';
    const campoTexto = (n, etiqueta, valor, { ayuda = '', tipo = 'text', requerido = true } = {}) => `<div class="campo"><label for="f-${n}">${esc(etiqueta)}</label>
      <input id="f-${n}" name="${n}" type="${tipo}" value="${esc(valor ?? '')}" ${dis} ${requerido ? 'required' : ''} aria-describedby="e-${n}">
      ${ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : ''}<p class="campo__error" id="e-${n}" data-error-de="${n}" hidden>${ico('circle-alert')}<span></span></p></div>`;
    const seleccion = (n, etiqueta, opciones, valor, ayuda = '') => `<div class="campo"><label for="f-${n}">${esc(etiqueta)}</label>
      <select id="f-${n}" name="${n}" ${dis}>${opciones.map((o) => `<option ${o === valor ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>${ayuda ? `<span class="campo__ayuda">${ayuda}</span>` : ''}</div>`;

    const secciones = `
      ${panel({ titulo: 'Identificación', cuerpo: `<div class="rejilla rejilla--2">
        <div class="campo"><span class="etiqueta">ID y versión</span><div class="fila"><span class="chip chip--regla">${esc(id)}</span> ${chip('neutro', `v${f.version} · ${estadoVersion === 'nuevo' ? 'borrador nuevo' : estadoVersion === 'pendiente' ? 'pendiente de aprobación' : 'borrador'}`, 'pencil')}</div>
          <span class="campo__ayuda">Editar la versión vigente (v${vigente.version}) crea esta versión nueva. La vigente no cambia hasta que se active.</span></div>
        ${campoTexto('nombre', 'Nombre de la regla', f.nombre)}
        <div class="campo"><span class="etiqueta">Tipo</span><div>${esc(f.tipo)}</div><span class="campo__ayuda">El tipo no cambia entre versiones.</span></div></div>` })}
      ${panel({ titulo: 'Alcance y condición', cuerpo: `<div class="rejilla rejilla--2">
        ${seleccion('alcance', 'A quién aplica', ALCANCES.includes(f.alcance) ? ALCANCES : [f.alcance, ...ALCANCES], f.alcance)}
        ${campoTexto('condicion', 'Cuándo se dispara', f.condicion)}
        ${seleccion('base', 'Base de cálculo', BASES, f.base, 'Sobre qué monto opera la regla.')}</div>` })}
      ${panel({ titulo: 'Cálculo', subtitulo: f.escalones ? 'Cada escalón define la tasa. La tasa se aplica sobre toda la venta, no solo sobre el excedente.' : 'Describe el cálculo de la regla.',
        cuerpo: f.escalones ? `<div class="tabla-scroll"><table class="tabla tabla-escalones"><caption class="solo-lectores">Escalones de la regla</caption>
          <thead><tr><th scope="col">N.º</th><th scope="col">Desde (% de cumplimiento)</th><th scope="col">Hasta (%)</th><th scope="col">Tasa (%)</th><th scope="col"><span class="solo-lectores">Acciones</span></th></tr></thead>
          <tbody id="esc-cuerpo">${f.escalones.map((e, i) => filaEscalon(e, i, f.escalones.length, bloqueado)).join('')}</tbody></table></div>
          <div class="fila" style="margin-top:12px">${bloqueado ? '' : boton({ texto: 'Agregar escalón', icono: 'plus', accion: 'agregar-escalon', clase: 'btn--s' })}<p class="campo__error" data-error-escalones hidden style="margin:0">${ico('circle-alert')}<span></span></p></div>`
          : `<div class="campo"><label for="f-calculo">Cálculo</label><textarea id="f-calculo" name="calculo" ${dis}>${esc(f.calculo)}</textarea></div>` })}
      ${panel({ titulo: 'Prioridad y acumulación', cuerpo: `<div class="rejilla rejilla--2">
        <div class="campo"><label for="f-prioridad">Prioridad</label><input id="f-prioridad" name="prioridad" type="number" min="0" step="1" value="${f.prioridad}" ${dis} aria-describedby="e-prioridad">
          <span class="campo__ayuda">Orden de aplicación cuando varias reglas coinciden. Dos reglas con la misma prioridad se contradicen.</span><p class="campo__error" id="e-prioridad" data-error-de="prioridad" hidden>${ico('circle-alert')}<span></span></p></div>
        <label class="opcion"><input type="checkbox" name="acumulable" ${f.acumulable ? 'checked' : ''} ${dis}><span>Es acumulable<small>Convive con otras reglas en lugar de reemplazarlas.</small></span></label></div>` })}
      ${panel({ titulo: 'Vigencia', cuerpo: `<div class="rejilla rejilla--2">
        <div class="campo"><label for="f-vigenciaDesde">Vigente desde</label><input id="f-vigenciaDesde" name="vigenciaDesde" type="date" value="${esc(f.vigenciaDesde)}" min="${esc(fechaMinimaVigencia())}" ${dis} aria-describedby="e-vigencia">
          <span class="campo__ayuda">Desde ${esc(fmtFechaLarga(fechaMinimaVigencia()))}. Un período pagado o calculado no se toca.</span><p class="campo__error" id="e-vigencia" data-error-de="vigencia" hidden>${ico('circle-alert')}<span></span></p></div>
        <div class="campo"><label for="f-vigenciaHasta">Vigente hasta (opcional)</label><input id="f-vigenciaHasta" name="vigenciaHasta" type="date" value="${esc(f.vigenciaHasta)}" ${dis}></div></div>` })}
      ${panel({ titulo: 'Fuente y responsable', cuerpo: `<div class="rejilla rejilla--2">
        ${campoTexto('fuente', 'Fuente', f.fuente, { ayuda: 'Documento o acuerdo que origina el cambio: acta, política, instrucción de gerencia.' })}
        ${seleccion('responsable', 'Responsable', RESPONSABLES, f.responsable)}</div>` })}`;

    const opcionesVendedor = vendedoresDelPeriodo('2026-01').map((v) => `<option value="${v.id}" ${v.id === vendedorVista ? 'selected' : ''}>${esc(v.nombre)} · ${esc(TIENDAS.find((t) => t.id === v.tienda).nombre)}</option>`).join('');

    const lateral = `<div class="pila panel--sticky">
      ${panel({ titulo: 'Cómo se lee', subtitulo: 'Se actualiza mientras configuras.', cuerpo: `<div id="vivo-frase"></div>` })}
      ${panel({ titulo: 'Vista previa con un vendedor real', cuerpo: `<div class="campo" style="margin-bottom:12px"><label for="vista-vendedor">Vendedor</label><select id="vista-vendedor">${opcionesVendedor}</select></div><div id="vivo-previa" aria-live="polite"></div>` })}
      ${panel({ titulo: 'Validación', cuerpo: `<div id="vivo-validacion" aria-live="polite"></div>
        <div class="pila pila--s" style="margin-top:16px" id="vivo-acciones"></div>` })}
    </div>`;

    const cabecera = pendiente
      ? nota('aviso', `<strong>${esc(id)} v${f.version} espera la aprobación del Gerente Comercial.</strong><p>Mientras tanto no se puede editar. ${analista ? 'Puedes retirar la solicitud para seguir cambiándola.' : ''}</p>`)
      : !analista ? nota('info', `<strong>Vista de solo lectura.</strong> ${esc(motivoSinPermiso('reglas.editar'))}`) : '';

    const historial = panel({
      titulo: 'Versiones de esta regla', cuerpo: `<ol class="eventos">${versiones.map((r) => `<li class="evento"><span class="evento__punto evento__punto--${r.estado === 'vigente' ? 'positivo' : r.estado === 'borrador' ? 'aviso' : 'neutro'}">${ico(r.estado === 'vigente' ? 'check' : 'clock')}</span><div><div class="evento__titulo">v${r.version} · ${esc(r.estado)}</div><div class="evento__meta">${esc(r.vigenciaDesde)} a ${r.vigenciaHasta ? esc(r.vigenciaHasta) : 'sin fin'} · ${esc(r.fuente)}</div><div class="pequeno" style="margin-top:2px">${esc(r.calculo)}</div></div></li>`).join('')}</ol>`,
    });

    const html = `<div class="pagina">
      ${encabezado({ titulo: `${esc(id)} · ${esc(vigente.nombre)}`, descripcion: 'Configura la regla sin programar: la frase de lectura y la vista previa te dicen qué hará antes de guardar.', migas: migas('<a href="#/reglas">Reglas</a>', esc(id)) })}
      ${cabecera}
      <div class="rejilla rejilla--principal-ancha" style="margin-top:var(--e-4)">
        <form class="pila" id="form-regla" novalidate autocomplete="off">${secciones}${historial}</form>
        <div>${lateral}</div>
      </div></div>`;

    // ---------- comportamiento ----------

    function pintar(raiz) {
      const completo = validarBorrador({ id, ...f });
      const valido = completo.ok;
      const ver = f.sucio || f.guardado || pendiente;
      // sin cambios todavía no se muestran errores: la regla vigente tiene todo lo que pide, salvo una fuente nueva
      const v = ver ? completo : { ...completo, campos: {}, escalones: { global: [], filas: {}, hayErrores: completo.escalones.hayErrores } };
      // frase
      raiz.querySelector('#vivo-frase').innerHTML = f.escalones
        ? fraseDeRegla(f.escalones, f.base)
        : `<p>${esc(f.nombre)}: ${esc(f.calculo)}</p>`;
      // errores de campo
      raiz.querySelectorAll('[data-error-de]').forEach((p) => {
        const msgs = v.campos[p.dataset.errorDe] ?? [];
        p.hidden = !msgs.length;
        p.querySelector('span').textContent = msgs.join(' ');
        const entrada = raiz.querySelector(`[name="${p.dataset.errorDe}"], [name="${p.dataset.errorDe}Desde"]`);
        entrada?.setAttribute('aria-invalid', msgs.length ? 'true' : 'false');
      });
      // errores de escalón
      raiz.querySelectorAll('[data-error-escalon]').forEach((p) => {
        const i = Number(p.dataset.errorEscalon);
        const msgs = v.escalones.filas[i] ?? [];
        p.closest('tr').hidden = !msgs.length;
        p.querySelector('span').textContent = msgs.join(' ');
        raiz.querySelectorAll(`[data-esc="${i}"]`).forEach((inp) => inp.setAttribute('aria-invalid', msgs.some((m) => !m.startsWith('Aviso')) ? 'true' : 'false'));
      });
      const general = raiz.querySelector('[data-error-escalones]');
      if (general) {
        general.hidden = !v.escalones.global.length;
        general.querySelector('span').textContent = v.escalones.global.join(' ');
      }
      // resumen de validación
      const lista = [];
      Object.entries(v.campos).forEach(([k, m]) => m.forEach((t) => lista.push(t)));
      Object.values(v.escalones.filas).flat().filter((m) => !m.startsWith('Aviso')).forEach((t) => lista.push(t));
      v.escalones.global.forEach((t) => lista.push(t));
      raiz.querySelector('#vivo-validacion').innerHTML = !ver
        ? nota('info', 'Todavía no hay cambios. Edita los escalones, la vigencia o la fuente y la validación aparece aquí.')
        : lista.length
        ? `<ul class="bloqueos">${lista.map((t) => `<li>${ico('circle-alert')}<span>${esc(t)}</span></li>`).join('')}</ul>`
        : nota('positivo', '<strong>Todo en orden.</strong> Sin huecos ni escalones superpuestos, sin conflicto de prioridad y con la vigencia en un período abierto.');
      // vista previa
      raiz.querySelector('#vivo-previa').innerHTML = vistaPrevia(f, !v.escalones.hayErrores && f.escalones?.length > 0);
      // acciones
      const acciones = raiz.querySelector('#vivo-acciones');
      const botones = [];
      if (gerente && pendiente) {
        botones.push(boton({ texto: 'Aprobar activación', clase: 'btn--primario', icono: 'badge-check', accion: 'aprobar', foco: 'aprobar' }), boton({ texto: 'Devolver al Analista', icono: 'rotate-ccw', accion: 'devolver' }));
      } else if (analista && pendiente) {
        botones.push(boton({ texto: 'Retirar la solicitud', icono: 'rotate-ccw', accion: 'retirar' }));
      } else if (analista) {
        const motivoGuardar = !f.sucio ? 'No hay cambios por guardar.' : '';
        botones.push(boton({ texto: 'Guardar borrador', clase: f.sucio ? 'btn--primario' : '', icono: 'pencil', accion: 'guardar', foco: 'guardar', deshabilitado: !f.sucio, motivo: motivoGuardar }));
        const motivoActivar = f.sucio ? 'Guarda el borrador antes de solicitar la activación.' : !f.guardado ? 'Primero modifica y guarda la regla.' : !valido ? 'Corrige los errores de validación.' : '';
        botones.push(boton({ texto: 'Solicitar activación', icono: 'send', accion: 'solicitar', foco: 'solicitar', deshabilitado: Boolean(motivoActivar), motivo: motivoActivar }));
        if (f.sucio || f.guardado) botones.push(boton({ texto: 'Descartar cambios', clase: 'btn--discreto', icono: 'x', accion: 'descartar' }));
        botones.push(motivoVisible(motivoActivar || motivoGuardar));
        botones.push(`<p class="diminuto secundario">Activar una versión requiere la aprobación del Gerente Comercial: el Analista prepara y el Gerente aprueba (D-10).</p>`);
      } else {
        botones.push(motivoVisible(motivoSinPermiso('reglas.editar')));
      }
      acciones.innerHTML = botones.join('');
    }

    return {
      html,
      explicar: () => null,
      montar(raiz) {
        const form = raiz.querySelector('#form-regla');
        const marcar = () => { f.sucio = true; pintar(raiz); };
        form.addEventListener('input', (e) => {
          const t = e.target;
          if (t.dataset.esc !== undefined) {
            const i = Number(t.dataset.esc);
            f.escalones[i][t.dataset.campo] = t.value === '' ? NaN : Number(t.value);
            marcar();
            return;
          }
          if (!t.name) return;
          if (t.type === 'checkbox') f[t.name] = t.checked;
          else if (t.name === 'prioridad') f.prioridad = t.value === '' ? NaN : Number(t.value);
          else f[t.name] = t.value;
          marcar();
        });
        form.addEventListener('submit', (e) => e.preventDefault());
        form.addEventListener('click', (e) => {
          const quitar = e.target.closest('[data-quitar]');
          if (quitar) {
            f.escalones.splice(Number(quitar.dataset.quitar), 1);
            if (f.escalones.length) f.escalones[f.escalones.length - 1].hasta = null;
            f.sucio = true;
            redibujarEscalones();
          }
        });
        function redibujarEscalones() {
          raiz.querySelector('#esc-cuerpo').innerHTML = f.escalones.map((e, i) => filaEscalon(e, i, f.escalones.length, bloqueado)).join('');
          pintar(raiz);
        }
        raiz.querySelector('#vista-vendedor').addEventListener('change', (e) => { vendedorVista = e.target.value; pintar(raiz); });
        raiz.__redibujarEscalones = redibujarEscalones;
        pintar(raiz);
      },
      acciones: {
        'agregar-escalon'() {
          const ultimo = f.escalones[f.escalones.length - 1];
          const nuevoDesde = Math.round(((Number.isFinite(ultimo.desde) ? ultimo.desde : 0) + 20) * 100) / 100;
          ultimo.hasta = Math.round((nuevoDesde - 0.01) * 100) / 100;
          f.escalones.push({ desde: nuevoDesde, hasta: null, tasa: (Number.isFinite(ultimo.tasa) ? ultimo.tasa : 0) + 1 });
          f.sucio = true;
          document.getElementById('principal').__redibujarEscalones();
        },
        guardar() {
          const v = validarBorrador({ id, ...f });
          if (v.campos.nombre || v.campos.fuente || v.campos.responsable) { ctx.avisar('Completa el nombre, la fuente y el responsable para guardar el borrador.', 'negativo'); return; }
          const res = ctx.acc.guardarBorradorRegla(id, datosParaGuardar(f));
          if (res.ok) { f.guardado = true; f.sucio = false; f.version = res.version; }
          ctx.avisar(res.ok ? `Borrador ${id} v${res.version} guardado. La versión vigente no cambió.` : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        async solicitar() {
          const v = validarBorrador({ id, ...f });
          if (v.conflictos.length) {
            const otra = v.conflictos[0];
            await confirmar({
              titulo: 'No se puede activar: dos reglas se contradicen',
              descripcion: `${esc(id)} y ${esc(otra.id)} tienen la misma prioridad (${f.prioridad}). El sistema no puede decidir cuál aplica primero.`,
              aviso: { variante: 'negativo', html: `<table class="comparador"><thead><tr><th scope="col">Campo</th><th scope="col">${esc(id)} v${f.version} (borrador)</th><th scope="col">${esc(otra.id)} v${otra.version} (vigente)</th></tr></thead><tbody>
                <tr><td>Nombre</td><td>${esc(f.nombre)}</td><td>${esc(otra.nombre)}</td></tr><tr><td>Tipo</td><td>${esc(f.tipo)}</td><td>${esc(otra.tipo)}</td></tr>
                <tr><td>Prioridad</td><td><mark>${f.prioridad}</mark></td><td><mark>${otra.prioridad}</mark></td></tr><tr><td>Alcance</td><td>${esc(f.alcance)}</td><td>${esc(otra.alcance)}</td></tr>
                <tr><td>Cálculo</td><td>${esc(f.escalones ? textoCalculo(f.escalones) : f.calculo)}</td><td>${esc(otra.calculo)}</td></tr></tbody></table>` },
              textoConfirmar: 'Entendido, voy a resolverlo',
            });
            return;
          }
          const { confirmado } = await confirmar({
            titulo: `Solicitar la activación de ${id} v${f.version}`,
            resumen: [['Regla', esc(`${id} v${f.version} · ${f.nombre}`)], ['Cambio', esc(f.escalones ? textoCalculo(f.escalones) : f.calculo)], ['Vigente desde', esc(fmtFechaLarga(f.vigenciaDesde))], ['Fuente', esc(f.fuente)], ['Quién aprueba', 'Gerente Comercial']],
            aviso: { variante: 'info', html: 'La versión vigente sigue calculando hasta que el Gerente apruebe. Ninguna corrida ejecutada cambia (D-07).' }, textoConfirmar: 'Solicitar activación',
          });
          if (!confirmado) return;
          const res = ctx.acc.solicitarActivacion(id);
          ctx.avisar(res.ok ? 'Solicitud enviada al Gerente Comercial.' : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        retirar() { const r = ctx.acc.retirarSolicitud(id); ctx.avisar(r.ok ? 'Solicitud retirada.' : r.motivo, r.ok ? 'positivo' : 'negativo'); },
        async aprobar() {
          const b = borradorDe(id);
          const { confirmado, valor } = await confirmar({
            titulo: `Aprobar la activación de ${id} v${b.version}`,
            resumen: [['Regla', esc(`${b.id} v${b.version} · ${b.nombre}`)], ['Cálculo', esc(b.calculo)], ['Vigente desde', esc(fmtFechaLarga(b.vigenciaDesde))], ['Fuente', esc(b.fuente)]],
            campo: { etiqueta: 'Comentario', requerido: false }, textoConfirmar: 'Aprobar activación',
          });
          if (!confirmado) return;
          const r = ctx.acc.aprobarActivacion(id, valor);
          if (r.ok) delete formularios[id];
          ctx.avisar(r.ok ? `${id} v${b.version} quedó vigente.` : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        async devolver() {
          const { confirmado, valor } = await confirmar({ titulo: `Devolver ${id} al Analista`, campo: { etiqueta: 'Qué debe cambiar', requerido: true, mensajeRequerido: 'Explica qué debe cambiar el Analista.' }, textoConfirmar: 'Devolver' });
          if (!confirmado) return;
          const r = ctx.acc.devolverActivacion(id, valor);
          ctx.avisar(r.ok ? 'Activación devuelta al Analista.' : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        descartar() { delete formularios[id]; ctx.refrescar(); },
      },
    };
  },
};

export { VENDEDOR, fmtQ, fmtPct, chipRegla, obtener, fraseEscalon };
