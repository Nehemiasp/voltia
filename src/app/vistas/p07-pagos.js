// P07 · Pagos (Contabilidad): exportar lo aprobado, comprobar que cuadra y marcar como pagado.

import { estadoPeriodo, periodoRegistro, resumenPeriodo, periodosConResultados } from '../selectores.js';
import { filasDePago, generarCsv, validarExportacion } from '../acciones.js';
import { esc, fmtFecha, nombrePeriodo, fmtQ } from '../../engine/formato.js';
import { ico, chip, chipPeriodo, q, nota, panel, encabezado, dato, boton, motivoVisible, estadoVista } from '../ui.js';
import { confirmar } from '../dialogos.js';
import { puede, motivoSinPermiso } from '../permisos.js';
import { selectorPeriodo, enlazarSelectores, migas } from './comun.js';

function descargar(nombre, texto) {
  const blob = new Blob(['﻿', texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function tablaValidacion(v) {
  const marca = (ok) => (ok ? `${chip('positivo', 'Cuadra', 'circle-check')}` : `${chip('negativo', 'No cuadra', 'circle-x')}`);
  const filas = [
    `<tr><th scope="row">Filas del archivo</th><td class="num">${v.filas.exportado}</td><td class="num">${v.filas.aprobado}</td><td>${marca(v.filas.coincide)}</td></tr>`,
    `<tr><th scope="row">Total general</th><td class="num">${q(v.total.exportado)}</td><td class="num">${q(v.total.aprobado)}</td><td>${marca(v.total.coincide)}</td></tr>`,
    ...v.porTienda.map((t) => `<tr><th scope="row">${esc(t.nombre)}</th><td class="num">${q(t.exportado)}</td><td class="num">${q(t.aprobado)}</td><td>${marca(t.coincide)}</td></tr>`),
  ].join('');
  return `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Validación del archivo contra lo aprobado</caption>
    <thead><tr><th scope="col">Comprobación</th><th scope="col" class="num">Archivo</th><th scope="col" class="num">Aprobado</th><th scope="col">Resultado</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}

export default {
  id: 'pagos',
  titulo: 'Pagos',
  permiso: 'pago.marcarPagado',
  vacio: { titulo: 'No hay períodos para pagar', texto: 'Cuando el Gerente Comercial apruebe un período, podrás exportarlo desde aquí.' },
  render(ctx) {
    const pagables = periodosConResultados().filter((p) => ['Aprobado', 'Pagado'].includes(estadoPeriodo(p)));
    if (!pagables.length) {
      return { html: `<div class="pagina">${encabezado({ titulo: 'Pagos', descripcion: 'Exporta lo aprobado y marca el período como pagado.' })}
        ${estadoVista('vacio', { titulo: 'Todavía no hay un período aprobado', texto: 'El Gerente Comercial debe aprobar el período antes de que puedas exportarlo.',
          accion: '<a class="btn" href="#/periodos">Ver el estado del período</a>' })}</div>` };
    }
    const aprobado = pagables.find((p) => estadoPeriodo(p) === 'Aprobado');
    const periodo = ctx.query.p && pagables.includes(ctx.query.p) ? ctx.query.p : aprobado ?? pagables[pagables.length - 1];
    const estado = estadoPeriodo(periodo);
    const reg = periodoRegistro(periodo);
    const resumen = resumenPeriodo(periodo);
    const csv = generarCsv(periodo);
    const validacion = validarExportacion(periodo, csv);
    const filas = filasDePago(periodo);
    const puedeExportar = puede(ctx.rol, 'pago.exportar') && estado === 'Aprobado';
    const exportado = Boolean(reg.exportado);
    const puedePagar = puede(ctx.rol, 'pago.marcarPagado') && estado === 'Aprobado' && exportado;
    const retenido = filas.reduce((s, f) => s + f.retenido, 0);

    const pasos = `<ol class="pasos-pago">
      <li class="${estado ? 'hecho' : ''}">${ico('check')} <span>Período aprobado${reg.aprobadoPor ? ` por ${esc(reg.aprobadoPor)} el ${esc(fmtFecha(reg.aprobadoEn))}` : ''}</span></li>
      <li class="${validacion.ok ? 'hecho' : 'error'}">${ico(validacion.ok ? 'check' : 'circle-x')} <span>Lo exportado ${validacion.ok ? 'cuadra con' : 'no cuadra con'} lo aprobado</span></li>
      <li class="${exportado ? 'hecho' : ''}">${ico(exportado ? 'check' : 'circle-dashed')} <span>Archivo exportado${exportado ? `: ${esc(reg.exportado.archivo)} el ${esc(fmtFecha(reg.exportado.fecha))}` : ''}</span></li>
      <li class="${estado === 'Pagado' ? 'hecho' : ''}">${ico(estado === 'Pagado' ? 'check' : 'circle-dashed')} <span>Marcado como pagado${estado === 'Pagado' ? ` por ${esc(reg.pagadoPor)} el ${esc(fmtFecha(reg.pagadoEn))}` : ''}</span></li></ol>`;

    const filasTabla = filas.map((f) => `<tr><th scope="row">${esc(f.nombre)}</th><td>${esc(f.tienda)}</td><td class="num">${q(f.comision)}</td><td class="num">${f.bono ? q(f.bono) : '<span class="secundario">—</span>'}</td>
      <td class="num">${f.ajustes ? q(f.ajustes, { signo: true }) : '<span class="secundario">—</span>'}</td><td class="num">${f.retenido ? q(f.retenido) : '<span class="secundario">—</span>'}</td><td class="num">${q(f.total)}</td></tr>`).join('');
    const sum = (k) => filas.reduce((s, f) => s + f[k], 0);

    const html = `<div class="pagina">
      ${encabezado({ titulo: 'Pagos', descripcion: 'Exporta lo aprobado, comprueba que cuadra y márcalo como pagado.', migas: migas('Pagos', esc(nombrePeriodo(periodo))), acciones: `${chipPeriodo(estado)}${selectorPeriodo(ctx, periodo, { conResultados: true })}` })}
      <div class="pila">
        ${panel({ cuerpo: `<div class="datos-fila">
          ${dato('Total a pagar', q(resumen.total), `${filas.length} vendedores`, { grande: true })}
          ${dato('Retenido por tope', q(retenido), retenido ? 'No se paga: decisión del Gerente' : 'Ninguna retención')}
          ${dato('Archivo', `<span class="mono" style="font-size:var(--t-m)">voltia-comisiones-${esc(periodo)}.csv</span>`, 'CSV, una fila por vendedor')}
        </div>` })}
        <div class="rejilla rejilla--principal">
          ${panel({ titulo: 'Validación contra lo aprobado', subtitulo: validacion.ok ? 'Todo cuadra: puedes exportar.' : 'Hay diferencias: no se puede exportar.', cuerpo: tablaValidacion(validacion), sinRelleno: true })}
          ${panel({ titulo: 'Avance', cuerpo: `${pasos}<div class="pila pila--s" style="margin-top:16px">
            ${boton({ texto: exportado ? 'Descargar el archivo de nuevo' : 'Exportar archivo de pago', clase: exportado ? '' : 'btn--primario', icono: 'file-down', accion: 'exportar', foco: 'exportar', deshabilitado: !(puede(ctx.rol, 'pago.exportar') && estado !== 'Pagado') || !validacion.ok, motivo: !puede(ctx.rol, 'pago.exportar') ? motivoSinPermiso('pago.exportar') : estado === 'Pagado' ? 'El período ya está pagado.' : 'Lo exportado no cuadra con lo aprobado.' })}
            ${boton({ texto: `Marcar ${nombrePeriodo(periodo)} como pagado`, clase: exportado && estado === 'Aprobado' ? 'btn--primario' : '', icono: 'banknote', accion: 'pagar', foco: 'pagar', deshabilitado: !puedePagar, motivo: !puede(ctx.rol, 'pago.marcarPagado') ? motivoSinPermiso('pago.marcarPagado') : estado === 'Pagado' ? 'El período ya está pagado.' : 'Exporta el archivo antes de marcar el período como pagado.' })}
            ${!puede(ctx.rol, 'pago.exportar') ? motivoVisible(motivoSinPermiso('pago.exportar')) : ''}</div>` })}
        </div>
        ${panel({ titulo: 'Detalle de lo que se paga', cuerpo: `<div class="tabla-scroll"><table class="tabla"><caption class="solo-lectores">Pago por vendedor</caption>
          <thead><tr><th scope="col">Vendedor</th><th scope="col">Tienda</th><th scope="col" class="num">Comisión</th><th scope="col" class="num">Bono</th><th scope="col" class="num">Ajustes</th><th scope="col" class="num">Retenido</th><th scope="col" class="num">Total</th></tr></thead>
          <tbody>${filasTabla}</tbody>
          <tfoot><tr><td colspan="2">Total</td><td class="num">${q(sum('comision'))}</td><td class="num">${q(sum('bono'))}</td><td class="num">${q(sum('ajustes'), { signo: true })}</td><td class="num">${q(sum('retenido'))}</td><td class="num">${q(sum('total'))}</td></tr></tfoot></table></div>`, sinRelleno: true })}
      </div></div>`;

    return {
      html,
      montar: (raiz) => enlazarSelectores(raiz),
      acciones: {
        exportar() {
          const res = estado === 'Pagado' ? { ok: true, csv, archivo: reg.exportado.archivo } : ctx.acc.exportarPago(periodo);
          if (!res.ok) { ctx.avisar(res.motivo, 'negativo'); return; }
          descargar(res.archivo, res.csv ?? csv);
          ctx.avisar(`Archivo ${res.archivo} descargado.`, 'positivo');
        },
        async pagar() {
          const { confirmado } = await confirmar({
            titulo: `Marcar ${nombrePeriodo(periodo)} como pagado`,
            resumen: [['Período', esc(nombrePeriodo(periodo))], ['Total pagado', `<strong>${q(resumen.total)}</strong>`], ['Vendedores', String(filas.length)], ['Archivo', `<span class="mono">${esc(reg.exportado.archivo)}</span>`], ['Qué cambia', 'Los resultados pasan a “Pagada”. El período ya no se modifica: se corrige con ajustes en períodos posteriores.']],
            aviso: { variante: 'negativo', html: '<strong>Esta acción no se puede deshacer.</strong>' }, irreversible: true, textoConfirmar: 'Marcar como pagado',
          });
          if (!confirmado) return;
          const res = ctx.acc.marcarPagado(periodo);
          ctx.avisar(res.ok ? `${nombrePeriodo(periodo)} marcado como pagado.` : res.motivo, res.ok ? 'positivo' : 'negativo');
        },
      },
    };
  },
};

export { fmtQ, nota };
