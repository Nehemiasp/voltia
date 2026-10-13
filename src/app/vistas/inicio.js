// Inicio: el estado del mes de un vistazo y lo que cada rol tiene que hacer ahora.

import {
  periodoRegistro, estadoPeriodo, resumenPeriodo, periodosConResultados, pendientesGerente, bloqueosAprobacion,
  observaciones, totalAPagar, eventosDe, fechaHoy,
} from '../selectores.js';
import { VENDEDOR } from '../../engine/datos.js';
import { esc, fmtPct, fmtFechaLarga, nombrePeriodo, mesCorto } from '../../engine/formato.js';
import {
  ico, chip, chipPeriodo, q, panel, encabezado, dato, boton, variacion, lineaEstados, eventos, estadoVista,
} from '../ui.js';
import { ROLES, rutasPermitidas } from '../permisos.js';
import { periodoDe, selectorPeriodo, enlazarSelectores } from './comun.js';

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

function fechasDelPeriodo(reg) {
  return {
    'Cerrado a ventas': reg.cerradoVentas, Calculado: reg.corridas[0]?.fecha, 'En revisión': reg.enviadoRevision, Aprobado: reg.aprobadoEn, Pagado: reg.pagadoEn,
  };
}

// ---------- Qué toca hacer ahora, según el rol y el estado del período ----------

function siguientePaso(ctx, periodo, estado) {
  const p = `?p=${periodo}`;
  const mes = nombrePeriodo(periodo);
  const bloqueos = estado === 'En revisión' ? bloqueosAprobacion(periodo) : [];
  const abiertas = observaciones(periodo, { abiertas: true });
  const pasos = {
    analista: {
      Abierto: ['Cerrar el período a ventas', `Cuando termine ${mes}, ciérralo para que las ventas tardías se traten como ajustes.`, `#/periodos${p}`, 'Ir a la corrida'],
      'Cerrado a ventas': ['Ejecutar la corrida', 'La corrida congela las reglas y calcula una comisión por vendedor.', `#/periodos${p}`, 'Ir a la corrida'],
      Calculado: ['Enviar a revisión', 'Revisa las alertas de la corrida y envía el período a los jefes de tienda.', `#/periodos${p}`, 'Ir a la corrida'],
      'En revisión': bloqueos.length
        ? ['Resolver lo que bloquea la aprobación', bloqueos.map((b) => b.texto).join(' '), `#/periodos${p}`, 'Ver alertas']
        : ['Esperar la aprobación del Gerente', 'No hay nada bloqueando. El Gerente Comercial aprueba el período.', null, ''],
      Aprobado: ['Esperar el pago', 'Contabilidad exporta el período y lo marca como pagado.', null, ''],
      Pagado: ['Período cerrado', 'Ya no se modifica. Cualquier corrección entra como ajuste en un período abierto.', `#/ajustes`, 'Ver ajustes'],
    },
    jefe: {
      'En revisión': ['Revisar a tu equipo', `Revisa a los vendedores de tu tienda en ${mes} y marca observaciones si algo no cuadra.`, `#/tienda${p}`, 'Revisar mi tienda'],
      default: ['Nada que revisar por ahora', `Las observaciones se marcan cuando el período está en revisión. Hoy ${mes} está “${estado}”.`, `#/tienda${p}`, 'Ver mi tienda'],
    },
    gerente: {
      'En revisión': bloqueos.length
        ? ['Decidir lo pendiente antes de aprobar', bloqueos.map((b) => b.texto).join(' '), '#/aprobacion', 'Ir a la aprobación']
        : [`Aprobar ${mes}`, 'No hay bloqueos. Aprobar es irreversible: después solo se corrige con ajustes.', '#/aprobacion', 'Ir a la aprobación'],
      default: ['Sin decisiones sobre este período', `${mes} está “${estado}”.`, `#/aprobacion${p}`, 'Ver la aprobación'],
    },
    contabilidad: {
      Aprobado: ['Exportar y marcar como pagado', `${mes} está aprobado. Exporta el archivo y comprueba que cuadra con lo aprobado.`, `#/pagos${p}`, 'Ir a pagos'],
      Pagado: ['Período pagado', 'Ya no se modifica.', `#/pagos${p}`, 'Ver el pago'],
      default: ['Esperando la aprobación', `${mes} está “${estado}”. Contabilidad recibe el período cuando el Gerente lo aprueba.`, null, ''],
    },
    auditoria: {
      default: ['Consultar el rastro', 'Cada cambio queda registrado con quién, cuándo, valor anterior y nuevo.', '#/auditoria', 'Abrir el historial'],
    },
  };
  const tabla = pasos[ctx.rol];
  const [titulo, texto, href, boton1] = tabla[estado] ?? tabla.default;
  const urgente = ctx.rol === 'jefe' ? estado === 'En revisión' && abiertas.length > 0 : false;
  return { titulo, texto, href, boton: boton1, urgente };
}

function panelPaso(ctx, periodo, estado, reg) {
  const paso = siguientePaso(ctx, periodo, estado);
  return panel({
    titulo: `${mayuscula(nombrePeriodo(periodo))} en el ciclo del mes`,
    subtitulo: `${chipPeriodo(estado)} ${reg?.corrida ? `· reglas congeladas ${esc(reg.corrida.version)}` : ''}`,
    cuerpo: `${lineaEstados(estado, reg ? fechasDelPeriodo(reg) : {})}
      <div class="siguiente-paso"><span class="siguiente-paso__icono">${ico('arrow-right')}</span><div><strong>${esc(paso.titulo)}</strong><p>${esc(paso.texto)}</p></div>
      ${paso.href ? boton({ texto: paso.boton, clase: 'btn--primario', href: paso.href }) : ''}</div>`,
  });
}

// ---------- Indicadores ----------

function indicadores(periodo, resumen) {
  const t = resumen.calc.totales;
  const vendido = resumen.calc.tiendas.reduce((s, x) => s + x.vendido, 0);
  const meta = resumen.calc.tiendas.reduce((s, x) => s + x.meta, 0);
  return `<div class="panel"><div class="panel__cuerpo"><div class="datos-fila">
    ${dato('Total a pagar', q(resumen.total), resumen.pendiente > 0 ? `${q(resumen.pendiente)} más esperan autorización` : 'Comprometido hoy', { grande: true })}
    ${dato('Contra el período anterior', resumen.diferencia === null ? '<span class="secundario">Sin período previo</span>' : variacion(resumen.diferencia, { inverso: true }), resumen.diferenciaPct === null ? '' : `${esc(fmtPct(resumen.diferenciaPct))} · ${esc(nombrePeriodo(resumen.previoId))}`)}
    ${dato('Cumplimiento de las tiendas', esc(fmtPct((vendido / meta) * 100, { fijo: true })), `${q(vendido)} de ${q(meta)}`)}
    ${dato('Vendedores', String(t.vendedores), `${q(t.bonos)} en bonos de equipo`)}
  </div></div></div>`;
}

// ---------- Lo que requiere atención ----------

function itemAtencion({ icono, tono = '', titulo, texto, href, enlace = 'Abrir' }) {
  return `<li class="pendiente"><span class="pendiente__icono${tono}">${ico(icono)}</span>
    <div><div class="pendiente__titulo">${esc(titulo)}</div><p class="pendiente__texto">${esc(texto)}</p></div>
    <div class="pendiente__acciones">${href ? boton({ texto: enlace, clase: 'btn--s', href }) : ''}</div></li>`;
}

function pendientesDelRol(ctx, periodo, resumen) {
  const permitidas = rutasPermitidas(ctx.rol);
  const items = [];
  if (ctx.rol === 'gerente') {
    for (const it of pendientesGerente()) {
      const [icono, tono, href] = {
        tope: ['scale', '', '#/aprobacion'],
        ajuste: ['git-compare', ' pendiente__icono--acento', `#/ajuste/${it.ajusteId}`],
        observacion: ['flag', ' pendiente__icono--negativo', `#/detalle/${it.vendedorId}?p=${it.periodo}`],
        regla: ['pencil', ' pendiente__icono--acento', `#/regla/${it.reglaId}`],
      }[it.tipo];
      items.push(itemAtencion({ icono, tono, titulo: it.titulo, texto: it.texto, href, enlace: it.tipo === 'tope' ? 'Decidir' : 'Revisar' }));
    }
    return items;
  }
  if (ctx.rol === 'jefe') {
    observaciones(periodo, { abiertas: true })
      .filter((o) => VENDEDOR[o.vendedorId].tienda === ctx.st.tiendaJefe)
      .forEach((o) => items.push(itemAtencion({ icono: 'flag', tono: ' pendiente__icono--negativo', titulo: `${VENDEDOR[o.vendedorId].nombre}: observación abierta`, texto: o.motivo, href: `#/detalle/${o.vendedorId}?p=${o.periodo}`, enlace: 'Ver detalle' })));
    return items;
  }
  if (ctx.rol === 'analista' || ctx.rol === 'auditoria') {
    for (const a of resumen.alertas) {
      const icono = a.tipo === 'bloqueada' ? 'ban' : a.tipo === 'tope' ? 'scale' : a.tipo === 'observacion' ? 'flag' : a.tipo === 'ajuste' ? 'git-compare' : 'rotate-ccw';
      const href = a.ref ? `#/ajuste/${a.ref}` : a.vendedorId ? `#/detalle/${a.vendedorId}?p=${periodo}` : permitidas.has('periodos') ? `#/periodos?p=${periodo}` : null;
      items.push(itemAtencion({ icono, tono: a.nivel === 'aviso' ? '' : ' pendiente__icono--acento', titulo: a.titulo, texto: a.texto, href, enlace: a.ref ? 'Ver ajuste' : 'Ver detalle' }));
    }
  }
  return items;
}

function panelAtencion(ctx, periodo, resumen) {
  const items = pendientesDelRol(ctx, periodo, resumen);
  const cuerpo = items.length
    ? `<ul class="bandeja">${items.join('')}</ul>`
    : `<div class="vacio-simple">${ico('circle-check')}<div><strong>Todo al día</strong><p>No hay nada pendiente para ti en este momento.</p></div></div>`;
  return panel({
    titulo: ctx.rol === 'gerente' ? 'Pendiente de tu decisión' : 'Requiere atención',
    subtitulo: items.length ? `${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}` : '',
    cuerpo, sinRelleno: true,
  });
}

// ---------- Tiendas y evolución ----------

function panelTiendas(ctx, periodo, resumen) {
  const verTienda = rutasPermitidas(ctx.rol).has('tienda');
  const MAX = 140;
  const filas = resumen.calc.tiendas.map((t) => {
    const ancho = Math.min(100, (t.cumplimiento / MAX) * 100);
    const marca = (100 / MAX) * 100;
    const nombre = verTienda ? `<a href="#/tienda?p=${periodo}&t=${t.id}">${esc(t.nombre)}</a>` : esc(t.nombre);
    return `<li class="tienda-fila">
      <div class="tienda-fila__cab"><span class="tienda-fila__nombre">${nombre}</span><span class="tienda-fila__pct">${esc(fmtPct(t.cumplimiento, { fijo: true }))}</span></div>
      <div class="barra-simple" role="img" aria-label="${esc(t.nombre)}: ${esc(fmtPct(t.cumplimiento, { fijo: true }))} de la meta"><i style="width:${ancho.toFixed(1)}%"></i><b style="left:${marca.toFixed(1)}%"></b></div>
      <div class="tienda-fila__pie"><span class="secundario">${q(t.vendido)} de ${q(t.meta)}</span>${t.ganaBono ? chip('positivo', 'Gana el bono', 'circle-check') : chip('neutro', 'Sin bono de equipo')}</div></li>`;
  }).join('');
  return panel({ titulo: 'Tiendas', subtitulo: 'Cumplimiento de la meta. La marca vertical es el 100 %.', cuerpo: `<ul class="lista-tiendas">${filas}</ul>` });
}

function panelEvolucion(ctx, periodoActual) {
  const periodos = periodosConResultados();
  const totales = periodos.map((p) => ({ p, total: totalAPagar(p), estado: estadoPeriodo(p) }));
  const max = Math.max(...totales.map((t) => t.total), 1);
  const filas = totales.map((t) => `<li class="${t.p === periodoActual ? 'barras__actual' : ''}">
    <span class="barras__mes">${esc(mesCorto(t.p))} ${esc(t.p.slice(0, 4))}</span>
    <span class="barras__barra" aria-hidden="true"><i style="width:${((t.total / max) * 100).toFixed(1)}%"></i></span>
    <span class="barras__valor">${q(t.total)}</span>
    <span class="barras__estado">${esc(t.estado)}</span></li>`).join('');
  return panel({ titulo: 'Comisión a pagar por mes', subtitulo: 'Total por período, con ajustes y sin el exceso de tope que aún espera decisión.', cuerpo: `<ol class="barras">${filas}</ol>` });
}

function panelActividad(ctx) {
  if (ctx.rol === 'jefe') return '';
  const lista = eventosDe().slice(-5).reverse();
  return panel({
    titulo: 'Actividad reciente',
    acciones: rutasPermitidas(ctx.rol).has('auditoria') ? boton({ texto: 'Ver el historial', clase: 'btn--s btn--discreto', href: '#/auditoria' }) : '',
    cuerpo: eventos(lista),
  });
}

// ---------- Vista ----------

export default {
  id: 'inicio',
  titulo: 'Inicio',
  render(ctx) {
    const lista = periodosConResultados();
    if (!lista.length) {
      return { html: `<div class="pagina">${encabezado({ titulo: 'Inicio' })}${estadoVista('vacio', { titulo: 'Todavía no hay períodos calculados', texto: 'Cuando el Analista ejecute la primera corrida, aquí aparece el resumen del mes.' })}</div>` };
    }
    const periodo = periodoDe(ctx);
    const reg = periodoRegistro(periodo);
    const estado = estadoPeriodo(periodo);
    const resumen = resumenPeriodo(periodo);
    const rol = ROLES[ctx.rol];

    const html = `<div class="pagina">
      ${encabezado({
        titulo: 'Inicio',
        descripcion: `${esc(rol.persona.nombre)} · ${esc(rol.nombre)} · hoy es ${esc(fmtFechaLarga(fechaHoy()))}`,
        acciones: selectorPeriodo(ctx, periodo),
      })}
      <div class="pila">
        ${panelPaso(ctx, periodo, estado, reg)}
        ${indicadores(periodo, resumen)}
        <div class="rejilla rejilla--2" style="align-items:start">${panelAtencion(ctx, periodo, resumen)}${panelTiendas(ctx, periodo, resumen)}</div>
        <div class="rejilla rejilla--2" style="align-items:start">${panelEvolucion(ctx, periodo)}${panelActividad(ctx)}</div>
      </div></div>`;

    return { html, montar: (raiz) => enlazarSelectores(raiz), explicar: () => null };
  },
};
