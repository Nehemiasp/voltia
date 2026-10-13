// P06 · Aprobación del período (Gerente Comercial). Aprobar es irreversible: la confirmación resume el impacto.

import {
  calculo, resumenPeriodo, estadoPeriodo, periodoRegistro, bloqueosAprobacion, pendientesGerente, periodosConResultados, saldosHaciaSiguiente,
  aPagar, observaciones, ajustesAplicablesA, LIMITE_AJUSTE_SIN_GERENTE,
} from '../selectores.js';
import { VENDEDOR } from '../../engine/datos.js';
import { esc, fmtQ, fmtPct, nombrePeriodo, fmtFecha, mesCorto } from '../../engine/formato.js';
import {
  ico, chip, chipPeriodo, q, pct, nota, panel, encabezado, dato, boton, motivoVisible, variacion, estadoVista,
} from '../ui.js';
import { confirmar } from '../dialogos.js';
import { puede, motivoSinPermiso } from '../permisos.js';
import { periodoDe, selectorPeriodo, enlazarSelectores, migas } from './comun.js';

function comparacion(actual) {
  const lista = periodosConResultados().slice(-5);
  const totales = lista.map((p) => ({ p, total: resumenPeriodo(p).total }));
  const max = Math.max(...totales.map((t) => t.total), 1);
  return `<div class="barras" role="list" aria-label="Costo de comisiones por período">${totales.map((t) => `
    <div class="barra-fila ${t.p === actual ? 'barra-fila--actual' : 'barra-fila--secundaria'}" role="listitem">
      <span>${esc(nombrePeriodo(t.p))}${t.p === actual ? ' <span class="diminuto secundario">(este)</span>' : ''}</span>
      <div class="barra-fila__pista"><div class="barra-fila__relleno" style="width:${(t.total / max) * 100}%"></div></div>
      <span class="num">${q(t.total)}</span></div>`).join('')}</div>`;
}

function distribucion(resumen) {
  const max = Math.max(...resumen.porTienda.map((t) => t.total), 1);
  const suma = resumen.porTienda.reduce((s, t) => s + t.total, 0) || 1;
  const filas = resumen.porTienda.map((t) => `<tr>
    <th scope="row">${esc(t.nombre)}</th><td class="num">${t.vendedores}</td><td class="num">${pct(t.cumplimiento, { fijo: true })}</td>
    <td style="min-width:140px"><div class="barra-fila__pista" aria-hidden="true"><div class="barra-fila__relleno" style="width:${(t.total / max) * 100}%"></div></div></td>
    <td class="num">${q(t.total)}</td><td class="num">${pct((t.total / suma) * 100)}</td></tr>`).join('');
  return `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Costo por tienda</caption>
    <thead><tr><th scope="col">Tienda</th><th scope="col" class="num">Vendedores</th><th scope="col" class="num">Cumplimiento</th><th scope="col"><span class="solo-lectores">Barra</span></th><th scope="col" class="num">A pagar</th><th scope="col" class="num">% del costo</th></tr></thead>
    <tbody>${filas}</tbody></table></div>`;
}

export default {
  id: 'aprobacion',
  titulo: 'Aprobación del período',
  permiso: 'periodo.aprobar',
  vacio: { titulo: 'Nada para aprobar', texto: 'Cuando un período pase a revisión, aparecerá aquí con lo que necesita tu decisión.' },
  render(ctx) {
    const lista = periodosConResultados();
    if (!lista.length) return { html: `<div class="pagina">${encabezado({ titulo: 'Aprobación del período' })}${estadoVista('vacio', { titulo: 'Todavía no hay períodos calculados', texto: 'El Analista debe ejecutar la corrida primero.' })}</div>` };
    const enRevision = lista.find((p) => estadoPeriodo(p) === 'En revisión');
    const periodo = ctx.query.p && lista.includes(ctx.query.p) ? ctx.query.p : enRevision ?? periodoDe(ctx);
    const estado = estadoPeriodo(periodo);
    const reg = periodoRegistro(periodo);
    const resumen = resumenPeriodo(periodo);
    const calc = resumen.calc;
    const bloqueos = bloqueosAprobacion(periodo);
    const puedeAprobar = puede(ctx.rol, 'periodo.aprobar');
    const pendientes = pendientesGerente();
    const decidible = puedeAprobar && estado === 'En revisión';

    // ---- bandeja ----
    const itemBandeja = (it) => {
      let icono = 'scale'; let tono = ''; let acciones = '';
      if (it.tipo === 'tope') {
        icono = 'scale';
        if (decidible || puedeAprobar) {
          acciones = boton({ texto: 'Autorizar excepción', clase: 'btn--s btn--primario', accion: 'tope-autorizar', id: `${it.vendedorId}|${it.periodo}` })
            + boton({ texto: 'Limitar al tope', clase: 'btn--s', accion: 'tope-limitar', id: `${it.vendedorId}|${it.periodo}` });
        }
        acciones += boton({ texto: 'Ver detalle', clase: 'btn--s btn--discreto', href: `#/detalle/${it.vendedorId}?p=${it.periodo}` });
      } else if (it.tipo === 'ajuste') {
        icono = 'git-compare'; tono = ' pendiente__icono--acento';
        acciones = (puedeAprobar ? boton({ texto: 'Revisar y autorizar', clase: 'btn--s btn--primario', href: `#/ajuste/${it.ajusteId}` }) : '');
      } else if (it.tipo === 'observacion') {
        icono = 'flag'; tono = ' pendiente__icono--negativo';
        acciones = boton({ texto: 'Ver detalle', clase: 'btn--s btn--discreto', href: `#/detalle/${it.vendedorId}?p=${it.periodo}` });
      } else if (it.tipo === 'regla') {
        icono = 'pencil'; tono = ' pendiente__icono--acento';
        acciones = boton({ texto: 'Aprobar activación', clase: 'btn--s btn--primario', accion: 'regla-aprobar', id: `${it.reglaId}` }) + boton({ texto: 'Ver regla', clase: 'btn--s btn--discreto', href: `#/regla/${it.reglaId}` });
      }
      return `<li class="pendiente"><span class="pendiente__icono${tono}">${ico(icono)}</span>
        <div><div class="pendiente__titulo">${esc(it.titulo)}${it.periodo ? ` <span class="chip chip--neutro">${esc(nombrePeriodo(it.periodo))}</span>` : ''}</div><p class="pendiente__texto">${esc(it.texto)}</p></div>
        <div class="pendiente__acciones">${acciones}</div></li>`;
    };
    const bandeja = pendientes.length
      ? `<ul class="bandeja">${pendientes.map(itemBandeja).join('')}</ul>`
      : `<div style="padding:16px">${nota('positivo', '<strong>No hay nada pendiente de tu decisión.</strong>')}</div>`;

    // ---- aprobar ----
    const motivoBloqueo = bloqueos.length ? bloqueos.map((b) => b.texto).join(' ') : '';
    let bloqueAprobar;
    if (estado === 'En revisión') {
      bloqueAprobar = `<div class="fila fila--entre"><div><strong>¿Todo listo?</strong><p class="secundario pequeno">Aprobar autoriza el período completo. No se puede deshacer: después solo se corrige con ajustes.</p></div>
        ${boton({ texto: `Aprobar ${nombrePeriodo(periodo)}`, clase: 'btn--primario', icono: 'badge-check', accion: 'aprobar', foco: 'aprobar', deshabilitado: !puedeAprobar || bloqueos.length > 0, motivo: !puedeAprobar ? motivoSinPermiso('periodo.aprobar') : motivoBloqueo })}</div>
        ${!puedeAprobar ? motivoVisible(motivoSinPermiso('periodo.aprobar')) : ''}
        ${bloqueos.length ? `<ul class="bloqueos">${bloqueos.map((b) => `<li>${ico('triangle-alert')}<span>${esc(b.texto)} <a href="${esc(b.ruta)}">Resolver</a></span></li>`).join('')}</ul>` : nota('positivo', '<strong>Sin bloqueos.</strong> Puedes aprobar el período.')}`;
    } else if (['Aprobado', 'Pagado'].includes(estado)) {
      bloqueAprobar = nota('positivo', `<strong>${esc(nombrePeriodo(periodo))} está ${estado === 'Pagado' ? 'pagado' : 'aprobado'}.</strong><p>Aprobado por ${esc(reg.aprobadoPor)} el ${esc(fmtFecha(reg.aprobadoEn))}.${estado === 'Pagado' ? ` Pagado el ${esc(fmtFecha(reg.pagadoEn))}: ya no se modifica.` : ' Contabilidad lo exporta y lo marca como pagado.'}</p>`);
    } else {
      bloqueAprobar = nota('info', `<strong>${esc(nombrePeriodo(periodo))} está “${esc(estado)}”.</strong> Solo se aprueba un período que está en revisión.`);
    }

    const html = `<div class="pagina">
      ${encabezado({
        titulo: 'Aprobación del período', descripcion: 'Resumen ejecutivo y lo que necesita una decisión tuya.', migas: migas('Decisiones', esc(nombrePeriodo(periodo))),
        acciones: `${chipPeriodo(estado)}${selectorPeriodo(ctx, periodo)}`,
      })}
      <div class="pila">
        ${panel({ cuerpo: `<div class="datos-fila">
          ${dato('Costo a pagar', q(resumen.total), resumen.pendiente > 0 ? `${q(resumen.pendiente)} más si autorizas los topes` : 'Comprometido hoy', { grande: true })}
          ${dato('Contra el período anterior', resumen.diferencia === null ? '<span class="secundario">Sin período previo</span>' : variacion(resumen.diferencia, { inverso: true }), resumen.diferenciaPct === null ? '' : `${esc(fmtPct(resumen.diferenciaPct))} contra ${esc(nombrePeriodo(resumen.previoId))}`)}
          ${dato('Vendedores', String(calc.totales.vendedores), `${calc.totales.requierenAutorizacion} sobre el tope`)}
          ${dato('Bonos de equipo', q(calc.totales.bonos), `${calc.resultados.filter((r) => r.bono.aplica).length} vendedores`)}
        </div>` })}
        <div class="rejilla rejilla--2">
          ${panel({ titulo: 'Costo por período', subtitulo: 'Total a pagar de los últimos períodos calculados.', cuerpo: comparacion(periodo) })}
          ${panel({ titulo: 'Distribución por tienda', cuerpo: distribucion(resumen), sinRelleno: true })}
        </div>
        ${panel({ titulo: 'Requiere tu decisión', subtitulo: 'Excepciones de tope, ajustes mayores a Q1,000, observaciones abiertas y activaciones de reglas, de todos los períodos.', cuerpo: bandeja, sinRelleno: true, id: 'bandeja' })}
        ${panel({ titulo: `Aprobar ${nombrePeriodo(periodo)}`, cuerpo: bloqueAprobar })}
      </div></div>`;

    const resolverTope = async (clave, decision) => {
      const [vid, p] = clave.split('|');
      const r = calculo(p).porVendedor[vid];
      const autorizar = decision === 'autorizar';
      const { confirmado, valor } = await confirmar({
        titulo: autorizar ? `Autorizar la excepción de tope de ${VENDEDOR[vid].nombre}` : `Limitar la comisión de ${VENDEDOR[vid].nombre} al tope`,
        resumen: [['Comisión calculada', q(r.comisionBase)], ['Tope', q(r.tope.limite)], ['Exceso', q(r.tope.exceso)], ['Se pagará', q(autorizar ? r.total : r.total - r.tope.exceso)]],
        aviso: { variante: 'aviso', html: autorizar ? 'Es una decisión de negocio que corresponde a una persona (D-04). Queda registrada con tu nombre.' : `No se pagarán ${q(r.tope.exceso)} de esta comisión.` },
        campo: { etiqueta: 'Motivo', requerido: false, placeholder: 'Opcional, pero ayuda a Auditoría.' },
        textoConfirmar: autorizar ? 'Autorizar excepción' : `Limitar a ${fmtQ(r.tope.limite)}`, peligro: !autorizar,
      });
      if (!confirmado) return;
      const res = ctx.acc.decidirTope(vid, p, decision, valor);
      ctx.avisar(res.ok ? (autorizar ? 'Excepción autorizada.' : 'Comisión limitada al tope.') : res.motivo, res.ok ? 'positivo' : 'negativo');
    };

    return {
      html,
      montar: (raiz) => enlazarSelectores(raiz),
      acciones: {
        'tope-autorizar': (id) => resolverTope(id, 'autorizar'),
        'tope-limitar': (id) => resolverTope(id, 'limitar'),
        async 'regla-aprobar'(id) {
          const b = ctx.st.reglas.versiones.find((r) => r.id === id && r.estado === 'borrador' && r.pendienteAprobacion);
          const { confirmado } = await confirmar({
            titulo: `Aprobar la activación de ${id} v${b.version}`, descripcion: 'El Analista prepara y tú apruebas: un error de configuración afecta a 180 personas (D-10).',
            resumen: [['Regla', esc(`${b.id} v${b.version} · ${b.nombre}`)], ['Cálculo', esc(b.calculo)], ['Vigente desde', esc(b.vigenciaDesde)], ['Fuente', esc(b.fuente)]], textoConfirmar: 'Aprobar activación',
          });
          if (!confirmado) return;
          const res = ctx.acc.aprobarActivacion(id);
          ctx.avisar(res.ok ? `${id} v${b.version} quedó vigente.` : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
        async aprobar() {
          const rs = calc.resultados;
          const retenido = rs.reduce((s, r) => s + aPagar(r, periodo).retenido, 0);
          const aj = ajustesAplicablesA(periodo);
          const saldos = saldosHaciaSiguiente(periodo);
          const filas = [
            ['Qué se aprueba', `El período completo de ${esc(nombrePeriodo(periodo))}: ${calc.totales.vendedores} vendedores en 4 tiendas`],
            ['Cuánto', `<strong>${q(resumen.total)}</strong>${resumen.diferencia === null ? '' : ` · ${esc(fmtPct(resumen.diferenciaPct))} contra ${esc(nombrePeriodo(resumen.previoId))}`}`],
            ['Ajustes que se aplican', aj.length ? `${aj.length} · ${aj.map((a) => `${esc(VENDEDOR[a.vendedorId].nombre)} ${q(a.montoSolicitado)}`).join(', ')}` : 'Ninguno'],
          ];
          if (retenido > 0) filas.push(['Retenido por tope', `${q(retenido)} que no se pagan por limitar al tope`]);
          filas.push(['Queda pendiente', saldos.length ? saldos.map((s) => `${q(s.saldo)} de ${esc(VENDEDOR[s.vendedorId].nombre)} pasa al período siguiente`).join('; ') : 'Nada: no hay saldos ni decisiones abiertas']);
          filas.push(['Qué sigue', 'Contabilidad exporta el archivo y marca el período como pagado']);
          const { confirmado } = await confirmar({
            titulo: `Aprobar ${nombrePeriodo(periodo)}`, descripcion: 'Revisa el impacto antes de confirmar.', resumen: filas,
            aviso: { variante: 'negativo', html: '<strong>Esta acción no se puede deshacer.</strong> Un período aprobado no vuelve a revisión: cualquier corrección posterior se hace con ajustes.' },
            irreversible: true, textoConfirmar: `Aprobar ${nombrePeriodo(periodo)}`,
          });
          if (!confirmado) return;
          const res = ctx.acc.aprobarPeriodo(periodo);
          ctx.avisar(res.ok ? `${nombrePeriodo(periodo)} aprobado.` : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
      },
    };
  },
};

export { chip, fmtQ, mesCorto, observaciones, LIMITE_AJUSTE_SIN_GERENTE, VENDEDOR };
