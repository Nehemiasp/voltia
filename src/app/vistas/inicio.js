// Recorrido de la demo: qué es Voltia, los tres momentos de la historia y atajos a cada caso.

import { MOMENTOS } from '../semillas.js';
import { ORDEN_APLICACION } from '../../engine/reglas.js';
import { ROLES } from '../permisos.js';
import { ico, panel, encabezado, chipRegla2, boton } from '../ui.js';
import { esc } from '../../engine/formato.js';
import { ID } from '../../engine/datos.js';

const FLUJOS = [
  { id: 'reglas', titulo: 'Configurar una regla sin programar', texto: 'Editar R-001, ver la frase de lectura en vivo y probar el cambio con Marta antes de guardar.', pantallas: 'P01 · P02', momento: 'M1', rol: 'analista', ruta: '#/regla/R-001' },
  { id: 'explicar', titulo: 'Explicar cualquier número', texto: 'El detalle de Marta en enero: cascada de reglas, ventas excluidas y cada cifra clicable.', pantallas: 'P03', momento: 'M2', rol: 'analista', ruta: `#/detalle/${ID.marta}?p=2026-01` },
  { id: 'ciclo', titulo: 'El ciclo del mes, de la corrida al pago', texto: 'Ejecutar la corrida de enero, resolver a Sofía sin meta, revisar, aprobar y pagar. Cambia de rol para cada paso.', pantallas: 'P04 a P07', momento: 'M1', rol: 'analista', ruta: '#/periodos' },
  { id: 'tope', titulo: 'Una excepción que decide una persona', texto: 'Luis Ortega supera el tope. El Gerente decide; el sistema no recorta en silencio.', pantallas: 'P06', momento: 'M2', rol: 'gerente', ruta: '#/aprobacion' },
  { id: 'marta', titulo: 'El caso de Marta: por qué son Q3,780 y no Q600', texto: 'Antes y después de enero, la separación de la diferencia y la aplicación en marzo con el límite de 50 %.', pantallas: 'P09', momento: 'M2', rol: 'analista', ruta: '#/ajuste/AJ-2026-03-001' },
  { id: 'simulador', titulo: 'Antes de cambiar una regla', texto: 'Subir el escalón de 100 % de 5 % a 5.5 % y ver el costo, los ganadores y las tiendas.', pantallas: 'P10', momento: 'M2', rol: 'analista', ruta: '#/simulador' },
  { id: 'vendedor', titulo: 'Lo que ve el vendedor', texto: 'Marta a mitad de enero: cuánto lleva, cuánto le falta para el siguiente escalón y cuánto ganaría.', pantallas: 'P11', momento: 'M0', rol: 'vendedor', vendedor: ID.marta, ruta: '#/mi-comision' },
  { id: 'disputa', titulo: 'Una venta que no aparece', texto: 'Jorge Castillo reclama una venta que quedó a nombre de otro vendedor. El Analista la encuentra y genera los ajustes.', pantallas: 'P08', momento: 'M2', rol: 'analista', ruta: '#/disputa/D-014' },
  { id: 'auditoria', titulo: 'Reconstruir un número meses después', texto: 'Quién cambió qué, cuándo, con qué valor anterior y nuevo. Desde cada evento se llega a la entidad.', pantallas: 'P12', momento: 'M2', rol: 'auditoria', ruta: '#/auditoria' },
];

const GLOSARIO = [
  ['Meta', 'Monto de venta que se espera de un vendedor en un período.'],
  ['Cumplimiento', 'Venta comisionable del período dividida entre la meta.'],
  ['Escalón', 'Rango de cumplimiento que define la tasa de comisión.'],
  ['Tasa', 'Porcentaje de comisión según el escalón alcanzado.'],
  ['Factor de categoría', 'Multiplicador que ajusta la comisión según el tipo de producto.'],
  ['Venta comisionable', 'Venta vigente que no fue excluida por R-006.'],
  ['Corrida', 'Ejecución del cálculo de un período con una versión fija de las reglas.'],
  ['Versión de reglas', 'Conjunto de reglas vigentes congelado en un momento dado.'],
  ['Ajuste', 'Corrección aplicada en un período abierto que se refiere a un período anterior.'],
  ['Saldo pendiente', 'Parte de un ajuste negativo que se descuenta en períodos siguientes.'],
  ['Observación', 'Marca de revisión que detiene la aprobación de un vendedor.'],
  ['Disputa', 'Reclamo formal de un vendedor sobre su resultado.'],
  ['Trazabilidad', 'Posibilidad de explicar un número paso a paso hasta su origen.'],
];

export default {
  id: 'inicio',
  titulo: 'Recorrido de la demo',
  render(ctx) {
    const momentos = Object.values(MOMENTOS).map((m) => `
      <li class="momento${m.id === ctx.st.momento ? ' momento--actual' : ''}">
        <strong>${esc(m.etiqueta)}</strong>
        <p>${esc(m.descripcion)}</p>
        <button type="button" class="btn btn--s${m.id === ctx.st.momento ? '' : ''}" data-accion="momento" data-id="${m.id}" ${m.id === ctx.st.momento ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${m.id === ctx.st.momento ? 'Estás aquí' : 'Viajar a este momento'}</button>
      </li>`).join('');

    const flujos = FLUJOS.map((f) => `
      <li class="flujo">
        <div class="flujo__cab"><span class="chip chip--neutro">${esc(f.pantallas)}</span><span class="diminuto secundario">${esc(MOMENTOS[f.momento].etiqueta.split(' · ')[0])} · ${esc(ROLES[f.rol].corto)}</span></div>
        <h3>${esc(f.titulo)}</h3>
        <p>${esc(f.texto)}</p>
        <button type="button" class="btn btn--s" data-accion="flujo" data-id="${f.id}">Abrir este caso</button>
      </li>`).join('');

    const orden = ORDEN_APLICACION.map((r, i) => `${i ? ico('arrow-right') : ''}${chipRegla2(r)}`).join(' ');
    const glosario = GLOSARIO.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');

    return {
      html: `<div class="pagina">
        ${encabezado({
          titulo: 'Voltia: comisiones que se pueden explicar',
          descripcion: 'Un sistema de gestión de comisiones para una cadena de retail ficticia, con 14 tiendas y unos 180 vendedores de piso. Esta muestra tiene 4 tiendas y 47 vendedores.',
        })}
        <div class="pila">
          ${panel({
            titulo: 'El problema que resuelve',
            cuerpo: `<p>Las comisiones viven en una hoja de cálculo que mantiene una sola persona. Cuando un vendedor reclama, nadie puede explicar su número sin rastrear fórmulas a mano. Cambiar una regla requiere a Sistemas y nadie sabe cuánto costará antes de aplicarla. Las devoluciones de meses anteriores se corrigen “a ojo”.</p>
              <p>Voltia modela las reglas, los estados y los roles, y calcula cada cifra con los datos de ejemplo del caso. Todo lo que ves se puede recalcular.</p>`,
          })}
          <section aria-labelledby="h-momentos"><div class="seccion__titulo"><h2 id="h-momentos">Tres momentos de la historia</h2><p>Cambian el estado de todo el sistema. Los controles de la parte superior hacen lo mismo.</p></div>
            <ol class="momentos">${momentos}</ol></section>
          <section aria-labelledby="h-flujos"><div class="seccion__titulo"><h2 id="h-flujos">Casos para recorrer</h2><p>Cada uno abre la pantalla con el rol y el momento correctos.</p></div>
            <ul class="flujos">${flujos}</ul></section>
          ${panel({
            titulo: 'El modelo en una línea',
            subtitulo: 'Orden de aplicación de las reglas',
            cuerpo: `<p class="fila" style="gap:6px">${orden}</p>
              <p class="secundario pequeno" style="margin-top:12px">R-006 excluye antes que todo. R-001 fija la tasa por escalón sobre <em>toda</em> la venta. R-002 multiplica por categoría. R-005 marca el tope y lo escala. R-003 es un bono de equipo que se calcula en una segunda pasada. R-004 corrige períodos pagados con ajustes.</p>`,
          })}
          <details class="panel glosario"><summary>Glosario</summary><dl>${glosario}</dl></details>
        </div></div>`,
      acciones: {
        momento(id) { ctx.acc.cambiarMomento(id); },
        flujo(id) {
          const f = FLUJOS.find((x) => x.id === id);
          ctx.acc.cambiarMomento(f.momento);
          ctx.acc.cambiarRol(f.rol);
          if (f.vendedor) ctx.acc.cambiarVendedor(f.vendedor);
          ctx.ir(f.ruta);
        },
      },
    };
  },
};

export { boton };
