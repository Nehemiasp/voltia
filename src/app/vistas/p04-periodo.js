// P04 · Período y corrida de cálculo.

import { periodoRegistro, estadoPeriodo, resumenPeriodo, hayResultados, metasPendientes, observaciones } from '../selectores.js';
import { CONJUNTOS, conjuntoDelPeriodo } from '../../engine/reglas.js';
import { VENDEDOR } from '../../engine/datos.js';
import { esc, fmtPct, fmtFecha, nombrePeriodo } from '../../engine/formato.js';
import {
  ico, chip, chipPeriodo, q, nota, panel, encabezado, dato, boton, motivoVisible, variacion, lineaEstados, estadoVista,
} from '../ui.js';
import { confirmar } from '../dialogos.js';
import { puede, motivoSinPermiso } from '../permisos.js';
import { periodoDe, selectorPeriodo, enlazarSelectores, migas } from './comun.js';

const PASOS_CORRIDA = [
  'Congelando el conjunto de reglas',
  'Aplicando R-006: excluyendo ventas con descuento mayor a 25 %',
  'Calculando cumplimiento y tasa por vendedor (R-001, R-002)',
  'Marcando topes individuales (R-005)',
  'Segunda pasada: bono de equipo por tienda (R-003)',
  'Guardando resultados',
];

function fechasDelPeriodo(reg) {
  return {
    'Cerrado a ventas': reg.cerradoVentas, Calculado: reg.corridas[0]?.fecha, 'En revisión': reg.enviadoRevision, Aprobado: reg.aprobadoEn, Pagado: reg.pagadoEn,
  };
}

function reglasCongeladas(version) {
  const c = CONJUNTOS[version];
  return Object.entries(c.versiones).map(([id, v]) => `<span class="chip chip--regla">${esc(id)} v${v}</span>`).join(' ');
}

function tablaCorridas(reg) {
  if (!reg.corridas.length) return `<p class="secundario pequeno" style="padding:16px">Todavía no se ejecutó ninguna corrida.</p>`;
  const filas = [...reg.corridas].reverse().map((c, i) => `<tr>
    <td><span class="mono">${esc(c.id)}</span> ${i === 0 ? chip('positivo', 'Vigente', 'circle-check') : chip('neutro', 'Reemplazada', 'history')}</td>
    <td>${esc(fmtFecha(c.fecha))} · ${esc(c.hora)}</td><td>${esc(c.por)}</td><td><span class="mono">${esc(c.version)}</span></td>
    <td class="num">${c.vendedores}</td><td class="num">${c.bloqueados}</td><td class="num">${c.topes}</td><td class="num">${q(c.total)}</td><td class="num">${c.duracion} s</td></tr>`).join('');
  return `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Corridas del período</caption>
    <thead><tr><th scope="col">Corrida</th><th scope="col">Ejecución</th><th scope="col">Ejecutada por</th><th scope="col">Reglas</th><th scope="col" class="num">Vendedores</th><th scope="col" class="num">Bloqueados</th><th scope="col" class="num">Sobre el tope</th><th scope="col" class="num">Total calculado</th><th scope="col" class="num">Duración</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`;
}

function alertasHtml(resumen, ctx, periodo) {
  if (!resumen.alertas.length) return nota('positivo', '<strong>Sin alertas.</strong> Todos los vendedores tienen meta y ninguna comisión supera el tope.');
  const items = resumen.alertas.map((a, i) => {
    const icono = a.tipo === 'bloqueada' ? 'ban' : a.tipo === 'tope' ? 'scale' : a.tipo === 'observacion' ? 'flag' : a.tipo === 'ajuste' ? 'git-compare' : 'rotate-ccw';
    const tono = a.nivel === 'aviso' ? '' : ' pendiente__icono--acento';
    let acciones = '';
    if (a.tipo === 'bloqueada' && puede(ctx.rol, 'meta.cargar')) acciones = boton({ texto: 'Cargar meta', clase: 'btn--s btn--primario', icono: 'flag', accion: 'meta', id: a.vendedorId, foco: `meta-${a.vendedorId}` });
    else if (a.tipo === 'observacion' && puede(ctx.rol, 'observacion.resolver')) {
      const o = observaciones(periodo, { abiertas: true, vendedorId: a.vendedorId })[0];
      acciones = boton({ texto: 'Responder', clase: 'btn--s', icono: 'message-square', accion: 'responder', id: o.id });
    }
    if (a.vendedorId) acciones += boton({ texto: 'Ver detalle', clase: 'btn--s btn--discreto', href: `#/detalle/${a.vendedorId}?p=${periodo}` });
    if (a.ref) acciones += boton({ texto: 'Ver ajuste', clase: 'btn--s btn--discreto', href: `#/ajuste/${a.ref}` });
    return `<li class="pendiente"><span class="pendiente__icono${tono}">${ico(icono)}</span>
      <div><div class="pendiente__titulo">${esc(a.titulo)}</div><p class="pendiente__texto">${esc(a.texto)}</p></div><div class="pendiente__acciones">${acciones}</div></li>`;
  }).join('');
  return `<ul class="bandeja">${items}</ul>`;
}

export default {
  id: 'periodos',
  titulo: 'Período y corrida',
  vacio: { titulo: 'Todavía no hay períodos', texto: 'Cuando exista un período abierto aparecerá aquí con su línea de estados.' },
  render(ctx) {
    const periodo = periodoDe(ctx, { conResultados: false });
    const reg = periodoRegistro(periodo);
    const estado = estadoPeriodo(periodo);
    const calculado = hayResultados(periodo);
    const resumen = calculado ? resumenPeriodo(periodo) : null;
    const analista = puede(ctx.rol, 'corrida.ejecutar');
    const pendMetas = calculado ? metasPendientes(periodo) : [];
    const bloqueados = resumen?.calc.totales.bloqueados ?? 0;

    // ---- acción principal según el estado ----
    const acciones = [];
    let motivo = '';
    if (analista) {
      if (estado === 'Abierto') acciones.push(boton({ texto: `Cerrar ${nombrePeriodo(periodo)} a ventas`, clase: 'btn--primario', icono: 'lock', accion: 'cerrar', foco: 'principal' }));
      if (estado === 'Cerrado a ventas') acciones.push(boton({ texto: `Ejecutar la corrida de ${nombrePeriodo(periodo)}`, clase: 'btn--primario', icono: 'play', accion: 'corrida', foco: 'principal' }));
      if (estado === 'Calculado') {
        const bloquea = bloqueados > 0 || pendMetas.length > 0;
        motivo = bloqueados ? `${bloqueados} vendedor sin meta: cárgala y ejecuta la corrida de nuevo.` : pendMetas.length ? 'Hay metas cargadas después de la corrida: ejecútala de nuevo.' : '';
        acciones.push(boton({ texto: 'Enviar a revisión', clase: 'btn--primario', icono: 'send', accion: 'revision', foco: 'principal', deshabilitado: bloquea, motivo }));
        acciones.push(boton({ texto: 'Ejecutar la corrida de nuevo', icono: 'rotate-ccw', accion: 'corrida' }));
      }
      if (estado === 'En revisión') acciones.push(boton({ texto: 'Recalcular (corrida nueva)', icono: 'rotate-ccw', accion: 'corrida', foco: 'principal' }));
    }
    const sinPermiso = !analista ? `<p class="secundario pequeno">${ico('lock')} ${esc(motivoSinPermiso('corrida.ejecutar'))}</p>` : '';

    const estadoPanel = panel({
      titulo: `${nombrePeriodo(periodo)}`,
      subtitulo: `${chipPeriodo(estado)} ${reg?.corrida ? `· reglas congeladas ${esc(reg.corrida.version)}` : ''}`,
      acciones: acciones.join(''),
      cuerpo: `${lineaEstados(estado, reg ? fechasDelPeriodo(reg) : {})}${motivoVisible(motivo)}${sinPermiso}`,
    });

    // ---- resumen ----
    let cuerpoResumen;
    if (!calculado) {
      cuerpoResumen = estadoVista('vacio', {
        titulo: estado === 'Abierto' ? 'El período sigue abierto' : 'Listo para calcular',
        texto: estado === 'Abierto' ? 'Entran ventas y devoluciones. Cuando cierre a ventas, el Analista ejecuta la corrida.' : 'La corrida congela las reglas vigentes y calcula una comisión por vendedor.',
      });
    } else {
      const t = resumen.calc.totales;
      const c = resumen.conteo;
      const conteo = [
        ['calculada', 'Calculadas', 'neutro'], ['en-revision', 'En revisión', 'aviso'], ['observada', 'Observadas', 'negativo'],
        ['aprobada', 'Aprobadas', 'positivo'], ['pagada', 'Pagadas', 'positivo'], ['ajustada', 'Ajustadas', 'acento'], ['bloqueada', 'Bloqueadas', 'aviso'],
      ].filter(([k]) => c[k] > 0).map(([k, texto, v]) => `<li>${chip(v, `${c[k]} ${texto.toLowerCase()}`)}</li>`).join('');
      cuerpoResumen = `<div class="datos-fila">
        ${dato('Total a pagar', q(resumen.total), resumen.pendiente > 0 ? `${q(resumen.pendiente)} más esperan autorización` : 'Comprometido hoy', { grande: true })}
        ${dato('Contra el período anterior', resumen.diferencia === null ? '<span class="secundario">Sin período previo</span>' : `${variacion(resumen.diferencia, { inverso: true })}`, resumen.diferenciaPct === null ? '' : `${esc(fmtPct(resumen.diferenciaPct))} · ${esc(nombrePeriodo(resumen.previoId))}`)}
        ${dato('Vendedores', String(t.vendedores), 'en 4 tiendas de muestra')}
        ${dato('Comisión y bonos', q(t.comision), `${q(t.bonos)} en bonos de equipo`)}
      </div><ul class="fila" style="list-style:none;padding:0;margin:16px 0 0">${conteo}</ul>`;
    }

    const alertas = calculado ? panel({
      titulo: 'Alertas de la corrida', subtitulo: 'Antes de pasar a revisión.', cuerpo: alertasHtml(resumen, ctx, periodo), sinRelleno: true,
    }) : '';

    const metaPend = pendMetas.length ? nota('aviso', `<strong>Hay metas cargadas después de la corrida:</strong> ${esc(pendMetas.map((v) => VENDEDOR[v].nombre).join(', '))}. Entran al cálculo cuando ejecutes la corrida de nuevo: una corrida no cambia después de ejecutarse.`) : '';

    const conjunto = reg?.corrida ? CONJUNTOS[reg.corrida.version] : conjuntoDelPeriodo(periodo);
    const congeladas = panel({
      titulo: 'Reglas con las que se calcula', subtitulo: `Conjunto ${esc(conjunto.id)}, vigente desde ${esc(fmtFecha(conjunto.vigenteDesde))} ${esc(conjunto.vigenteDesde.slice(0, 4))}`,
      cuerpo: `<p class="fila" style="gap:6px">${reglasCongeladas(conjunto.id)}</p><p class="secundario pequeno" style="margin-top:8px">La corrida guarda esta versión. Editar una regla después crea un borrador que no afecta a esta corrida (D-07).</p>`,
    });

    const html = `<div class="pagina">
      ${encabezado({ titulo: 'Período y corrida', migas: migas('Períodos', esc(nombrePeriodo(periodo))), acciones: selectorPeriodo(ctx, periodo, { conResultados: false }), descripcion: 'El ciclo de comisiones de un mes, de la corrida al pago.' })}
      <div class="pila">
        ${estadoPanel}
        <div id="zona-progreso"></div>
        ${metaPend}
        ${calculado ? panel({ titulo: 'Resumen de la corrida', cuerpo: cuerpoResumen }) : panel({ titulo: 'Resumen', cuerpo: cuerpoResumen })}
        ${alertas}
        <div class="rejilla rejilla--2">${congeladas}${panel({ titulo: 'Corridas de este período', cuerpo: reg ? tablaCorridas(reg) : '', sinRelleno: true })}</div>
        ${calculado ? `<p class="secundario pequeno">${ico('info')} Para revisar vendedor por vendedor, abre <a href="#/tienda?p=${periodo}">Revisión de tienda</a>.</p>` : ''}
      </div></div>`;

    const progreso = (pasosCompletos, pct) => `<div class="panel"><div class="panel__cuerpo"><div class="fila fila--entre"><strong>Ejecutando la corrida de ${esc(nombrePeriodo(periodo))}</strong><span class="secundario pequeno">${pct} %</span></div>
      <div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Progreso de la corrida"><i style="width:${pct}%"></i></div>
      <ul class="registro-corrida" aria-live="polite">${PASOS_CORRIDA.map((p, i) => `<li class="${i < pasosCompletos ? 'listo' : ''}">${ico(i < pasosCompletos ? 'check' : 'circle-dashed')}${esc(p)}</li>`).join('')}</ul></div></div>`;

    async function correr() {
      const metasNuevas = metasPendientes(periodo);
      const sinMeta = [...new Set(Object.keys(ctx.st.metas))].length;
      const { confirmado } = await confirmar({
        titulo: `Ejecutar la corrida de ${nombrePeriodo(periodo)}`,
        descripcion: 'La corrida congela las reglas y las metas de hoy. Después no cambia: si algo se corrige, se ejecuta otra.',
        resumen: [
          ['Conjunto de reglas', `<span class="mono">${esc(conjuntoDelPeriodo(periodo).id)}</span> · ${reglasCongeladas(conjuntoDelPeriodo(periodo).id)}`],
          ['Vendedores', '47 en 4 tiendas'],
          ['Metas cargadas a mano', metasNuevas.length ? `${metasNuevas.length} nueva${metasNuevas.length > 1 ? 's' : ''} entran ahora` : (sinMeta ? 'Ya incluidas' : 'Ninguna')],
        ],
        textoConfirmar: 'Ejecutar corrida',
      });
      if (!confirmado) return;
      const zona = document.getElementById('zona-progreso');
      const rapido = matchMedia('(prefers-reduced-motion: reduce)').matches;
      for (let i = 0; i <= PASOS_CORRIDA.length; i += 1) {
        zona.innerHTML = progreso(i, Math.round((i / PASOS_CORRIDA.length) * 100));
        if (!rapido) await new Promise((r) => setTimeout(r, 420));
      }
      const res = ctx.acc.ejecutarCorrida(periodo);
      ctx.avisar(res.ok ? `Corrida ${res.corrida.id} lista: ${res.corrida.vendedores} vendedores${res.corrida.bloqueados ? `, ${res.corrida.bloqueados} bloqueado` : ''}.` : res.motivo, res.ok ? 'positivo' : 'negativo');
    }

    return {
      html,
      explicar: () => null,
      montar: (raiz) => enlazarSelectores(raiz),
      acciones: {
        async cerrar() {
          const { confirmado } = await confirmar({
            titulo: `Cerrar ${nombrePeriodo(periodo)} a ventas`,
            descripcion: 'Ya no entran ventas con fecha de este período. Las que lleguen tarde se tratarán como ajustes.',
            resumen: [['Período', esc(nombrePeriodo(periodo))], ['Estado siguiente', 'Cerrado a ventas']], textoConfirmar: 'Cerrar a ventas',
          });
          if (!confirmado) return;
          const r = ctx.acc.cerrarVentas(periodo);
          ctx.avisar(r.ok ? 'Período cerrado a ventas.' : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        corrida: correr,
        async revision() {
          const { confirmado } = await confirmar({
            titulo: `Enviar ${nombrePeriodo(periodo)} a revisión`,
            descripcion: 'Los jefes de tienda revisan a su gente y pueden marcar observaciones.',
            resumen: [['Total calculado', q(resumen.total)], ['Vendedores', String(resumen.calc.totales.vendedores)], ['Sobre el tope', `${resumen.calc.totales.requierenAutorizacion} (escalan al Gerente)`]],
            textoConfirmar: 'Enviar a revisión',
          });
          if (!confirmado) return;
          const r = ctx.acc.enviarARevision(periodo);
          ctx.avisar(r.ok ? 'Período en revisión.' : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        async meta(vendedorId) {
          const v = VENDEDOR[vendedorId];
          const { confirmado, valor } = await confirmar({
            titulo: `Cargar la meta de ${v.nombre}`,
            descripcion: `${esc(v.nombre)} ingresó el ${esc(fmtFecha(v.ingreso))} ${esc(v.ingreso.slice(0, 4))} y no tiene meta para ${esc(nombrePeriodo(periodo))}.`,
            campo: { etiqueta: 'Meta del período (Q)', tipo: 'number', requerido: true, valor: 70000, min: 1, ayuda: 'La meta entra al cálculo en la siguiente corrida.', mensajeRequerido: 'Indica un monto mayor a cero.' },
            textoConfirmar: 'Cargar meta',
          });
          if (!confirmado) return;
          const r = ctx.acc.cargarMeta(vendedorId, periodo, Number(valor));
          ctx.avisar(r.ok ? `Meta de ${v.nombre} cargada. Ejecuta la corrida de nuevo para incluirla.` : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
        async responder(obsId) {
          const o = ctx.st.observaciones.find((x) => x.id === obsId);
          const { confirmado, valor } = await confirmar({
            titulo: `Responder la observación sobre ${VENDEDOR[o.vendedorId].nombre}`,
            descripcion: `${esc(o.por)}: ${esc(o.motivo)}`,
            campo: { etiqueta: 'Respuesta', requerido: true, mensajeRequerido: 'Escribe la respuesta para quien la marcó.' },
            textoConfirmar: 'Responder y devolver a revisión',
          });
          if (!confirmado) return;
          const r = ctx.acc.resolverObservacion(obsId, valor);
          ctx.avisar(r.ok ? 'Observación respondida.' : r.motivo, r.ok ? 'positivo' : 'negativo');
        },
      },
    };
  },
};
