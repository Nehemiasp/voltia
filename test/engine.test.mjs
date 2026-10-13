// Comprobaciones de que cada cifra del documento maestro (secciones 4 y 5) sale del motor.
import test from 'node:test';
import assert from 'node:assert/strict';

import { CONJUNTOS, conjuntoDelPeriodo, ESCALONES_V3 } from '../src/engine/reglas.js';
import { TIENDAS, VENDEDORES, ID } from '../src/engine/datos.js';
import { ventasDe, vendedoresDelPeriodo, CATALOGO, repartirCategoria, MAX_DESCUENTO_GENERADO } from '../src/engine/ventas.js';
import {
  calcularPeriodo, calcularVendedor, recalcularRetroactivo, aplicarAjuste, escalonPara, construirCascada,
} from '../src/engine/calculo.js';
import { fmtQ, fmtPct } from '../src/engine/formato.js';

const v14 = CONJUNTOS.v14.config;
const CORRIDA_ENERO = '2026-02-02';

const enero = calcularPeriodo({ periodo: '2026-01', config: v14, corte: CORRIDA_ENERO });

test('formato de montos y porcentajes', () => {
  assert.equal(fmtQ(9050), 'Q9,050');
  assert.equal(fmtQ(-3780), '−Q3,780');
  assert.equal(fmtQ(1234.5), 'Q1,234.50');
  assert.equal(fmtPct(105), '105 %');
  assert.equal(fmtPct(104.333), '104.3 %');
  assert.equal(fmtPct(107, { fijo: true }), '107.0 %');
});

test('escalones de R-001: el escalón se decide por el cumplimiento', () => {
  assert.equal(escalonPara(79.99, ESCALONES_V3).tasa, 0);
  assert.equal(escalonPara(80, ESCALONES_V3).tasa, 3);
  assert.equal(escalonPara(99.99, ESCALONES_V3).tasa, 3);
  assert.equal(escalonPara(100, ESCALONES_V3).tasa, 5);
  assert.equal(escalonPara(119.99, ESCALONES_V3).tasa, 5);
  assert.equal(escalonPara(120, ESCALONES_V3).tasa, 7);
});

test('4.1 · las tiendas de enero cuadran con la tabla de la sección 4', () => {
  const esperado = { T01: 107.0, T02: 90.9, T03: 105.0, T04: 103.0 };
  for (const t of TIENDAS) {
    const calculada = enero.porTienda[t.id];
    assert.equal(calculada.meta, t.meta, `meta ${t.id}`);
    assert.equal(calculada.vendido, t.vendido, `vendido ${t.id}`);
    assert.equal(Math.round(calculada.cumplimiento * 10) / 10, esperado[t.id], `cumplimiento ${t.id}`);
  }
});

test('4.3 · Marta Ruiz, enero: ventas, totales por categoría y la venta excluida', () => {
  const r = enero.porVendedor[ID.marta];
  assert.equal(r.meta, 150000);
  assert.equal(r.netoComisionable, 157500);
  assert.deepEqual(r.porCategoria.map((c) => c.venta), [90000, 50000, 10000, 7500]);
  assert.equal(r.excluidas.length, 1);
  assert.equal(r.excluidas[0].id, 'V-0180');
  assert.equal(r.excluidas[0].descuentoPct, 30);
  assert.equal(r.excluidas[0].bruto, 9000);
  assert.equal(r.devueltas.length, 0);
});

test('5.2 · enero original: 105 %, tasa 5 %, comisión Q8,550, bono Q500, total Q9,050', () => {
  const r = enero.porVendedor[ID.marta];
  assert.equal(r.cumplimiento, 105);
  assert.equal(r.tasa, 5);
  assert.deepEqual(r.porCategoria.map((c) => c.comision), [4500, 3000, 300, 750]);
  assert.equal(r.comisionBase, 8550);
  assert.equal(r.bono.monto, 500);
  assert.equal(r.total, 9050);
  assert.equal(r.tope.excede, false);
});

test('5.2 · enero recalculado tras la devolución con las mismas reglas v14', () => {
  const rr = recalcularRetroactivo({
    vendedorId: ID.marta, periodo: '2026-01', config: v14, corteOriginal: CORRIDA_ENERO, corteNuevo: '2026-03-10',
  });
  const r = rr.recalculado;
  assert.equal(r.netoComisionable, 145500);
  assert.equal(r.cumplimiento, 97);
  assert.equal(r.tasa, 3);
  assert.deepEqual(r.porCategoria.map((c) => c.venta), [78000, 50000, 10000, 7500]);
  assert.deepEqual(r.porCategoria.map((c) => c.comision), [2340, 1800, 180, 450]);
  assert.equal(r.comisionBase, 4770);
  assert.equal(r.bono.monto, 500, 'T03 baja a 104.3 % y Marta sigue sobre 80 %: conserva el bono');
  assert.equal(Math.round(rr.tiendaDespues.cumplimiento * 10) / 10, 104.3);
  assert.equal(r.total, 5270);
  assert.equal(rr.diferencia, -3780);
  assert.equal(rr.cambioDeEscalon, true);
});

test('5.2 · la diferencia se separa en Q600 (venta devuelta) y Q3,180 (cambio de escalón)', () => {
  const rr = recalcularRetroactivo({
    vendedorId: ID.marta, periodo: '2026-01', config: v14, corteOriginal: CORRIDA_ENERO, corteNuevo: '2026-03-10',
  });
  assert.equal(rr.componentes.ventaDevuelta, 600);
  assert.equal(rr.componentes.cambioEscalon, 3180);
  assert.equal(rr.componentes.cambioBono, 0);
  assert.equal(rr.componentes.ventaDevuelta + rr.componentes.cambioEscalon, 3780);
  assert.equal(rr.componentes.valorVentas, -600, 'con signo, para cualquier cambio de ventas');
  assert.equal(rr.componentes.efectoEscalon, -3180);
  assert.deepEqual(rr.porCategoria.map((c) => c.porEscalon), [1560, 1200, 120, 300]);
  assert.equal(rr.porCategoria[0].porVentaDevuelta, 600);
});

test('recalcular con las reglas vigentes ese mes, no las actuales (D-07 y R-004)', () => {
  const cambiada = { ...v14, R001: { ...v14.R001, escalones: v14.R001.escalones.map((e) => (e.desde === 80 ? { ...e, tasa: 4 } : e)) } };
  const conReglasActuales = recalcularRetroactivo({
    vendedorId: ID.marta, periodo: '2026-01', config: cambiada, corteOriginal: CORRIDA_ENERO, corteNuevo: '2026-03-10',
  });
  assert.notEqual(conReglasActuales.diferencia, -3780, 'usar otras reglas cambiaría la cifra');
});

test('5.2 · marzo: Q5,200 de comisión, ajuste limitado al 50 % y saldo de Q1,180', () => {
  const marzo = calcularPeriodo({ periodo: '2026-03', config: CONJUNTOS.v14.config, corte: '2026-04-02' });
  const marta = marzo.porVendedor[ID.marta];
  assert.equal(marta.comisionBase, 5200);
  assert.equal(marta.bono.monto, 0, 'T03 no llega al 100 % en marzo');
  assert.ok(marzo.porTienda.T03.cumplimiento < 100);
  const ajuste = aplicarAjuste({ deuda: 3780, comisionPeriodo: marta.comisionBase, config: v14 });
  assert.equal(ajuste.limite, 2600);
  assert.equal(ajuste.aplicado, -2600);
  assert.equal(ajuste.saldo, 1180);
  assert.equal(marta.comisionBase + ajuste.aplicado, 2600, 'neto a pagar en marzo');
});

test('4.4 · Luis Ortega: Q20,160 supera el tope de Q15,000 por Q5,160', () => {
  const r = enero.porVendedor[ID.luis];
  assert.equal(r.netoComisionable, 260000);
  assert.equal(r.cumplimiento, 130);
  assert.deepEqual(r.porCategoria.map((c) => [c.venta, c.comision]), [[60000, 4200], [180000, 15120], [20000, 840], [0, 0]]);
  assert.equal(r.comisionBase, 20160);
  assert.equal(r.tope.excede, true);
  assert.equal(r.tope.exceso, 5160);
});

test('Ana Morales: la venta con 28 % de descuento queda fuera y no suma a la meta (D-03, D-09)', () => {
  const r = enero.porVendedor[ID.ana];
  assert.equal(r.excluidas.length, 1);
  assert.equal(r.excluidas[0].id, 'V-0323');
  assert.equal(r.netoComisionable, 111200);
  assert.equal(r.tasa, 3);
  assert.equal(r.bono.aplica, false, 'T02 no alcanza su meta');
});

test('Sofía Ramírez: sin meta cargada queda bloqueada, no en 0 %', () => {
  const r = enero.porVendedor[ID.sofia];
  assert.equal(r.bloqueado, true);
  assert.equal(r.motivoBloqueo, 'Falta meta');
  assert.equal(r.total, 0);
  assert.equal(enero.totales.bloqueados, 1);
  const conMeta = calcularPeriodo({ periodo: '2026-01', config: v14, corte: CORRIDA_ENERO, metas: { [ID.sofia]: 70000 } });
  assert.equal(conMeta.porVendedor[ID.sofia].bloqueado, false);
  assert.equal(Math.round(conMeta.porVendedor[ID.sofia].cumplimiento * 10) / 10, 88.6);
});

test('Diego Herrera: cada venta cuenta para la tienda donde se registró', () => {
  const lineas = ventasDe(ID.diego, '2026-01');
  const t01 = lineas.filter((l) => l.tienda === 'T01').reduce((s, l) => s + l.neto, 0);
  const t04 = lineas.filter((l) => l.tienda === 'T04').reduce((s, l) => s + l.neto, 0);
  assert.equal(t01, 58000);
  assert.equal(t04, 71000);
  assert.equal(enero.porVendedor[ID.diego].tienda, 'T04', 'el bono se evalúa con la tienda asignada al cierre');
  assert.equal(enero.porVendedor[ID.diego].bono.aplica, true);
});

test('el bono depende de la tienda y del vendedor (segunda pasada)', () => {
  for (const r of enero.resultados) {
    if (r.bloqueado) continue;
    const t = enero.porTienda[r.tienda];
    const esperado = t.cumplimiento >= 100 && r.cumplimiento >= 80;
    assert.equal(r.bono.aplica, esperado, `${r.nombre}`);
  }
});

test('las ventas generadas son deterministas, únicas y no activan R-006 por accidente', () => {
  const ids = new Set();
  for (const periodo of ['2025-12', '2026-01', '2026-02', '2026-03']) {
    for (const v of vendedoresDelPeriodo(periodo)) {
      const lineas = ventasDe(v.id, periodo);
      assert.deepEqual(lineas, ventasDe(v.id, periodo));
      for (const l of lineas) {
        assert.ok(l.neto > 0, `${l.id} neto`);
        assert.ok(!ids.has(l.id), `id repetido ${l.id}`);
        ids.add(l.id);
        const manual = /^V-0/.test(l.id);
        if (!manual) assert.ok(l.descuentoPct <= MAX_DESCUENTO_GENERADO, `${l.id} descuento ${l.descuentoPct}`);
        assert.ok(l.fecha.startsWith(periodo), `${l.id} fecha ${l.fecha}`);
      }
    }
  }
});

test('el reparto por categoría siempre suma exactamente el total pedido', () => {
  let semilla = 7;
  const rng = () => {
    semilla = (semilla * 1664525 + 1013904223) % 4294967296;
    return semilla / 4294967296;
  };
  for (const categoria of Object.keys(CATALOGO)) {
    for (let total = 3000; total <= 200000; total += 100) {
      const lineas = repartirCategoria(total, categoria, rng);
      assert.equal(lineas.reduce((s, l) => s + l.neto, 0), total, `${categoria} ${total}`);
      for (const l of lineas) assert.ok(l.descuentoPct <= MAX_DESCUENTO_GENERADO + 0.05);
    }
  }
});

test('Jorge Castillo: la venta que reclama está registrada a Pablo Nájera', () => {
  const pablo = ventasDe(ID.pablo, '2026-01');
  const disputada = pablo.find((l) => l.id === 'V-0388');
  assert.ok(disputada);
  assert.equal(disputada.neto, 9500);
});

test('Luis supera el tope también en marzo y T03 no cumple su meta (datos de los casos de P06 y P09)', () => {
  const marzo = calcularPeriodo({ periodo: '2026-03', config: v14, corte: '2026-04-02' });
  assert.equal(marzo.porVendedor[ID.luis].tope.excede, true);
  assert.ok(marzo.porTienda.T03.cumplimiento < 100);
});

test('diciembre se calcula con las reglas v13 (escalón superior de 6 %)', () => {
  assert.equal(conjuntoDelPeriodo('2025-12').id, 'v13');
  assert.equal(conjuntoDelPeriodo('2026-01').id, 'v14');
  assert.equal(CONJUNTOS.v13.config.R001.escalones[3].tasa, 6);
});

test('la cascada de Marta suma hasta el total', () => {
  const r = enero.porVendedor[ID.marta];
  const pasos = construirCascada(r, v14);
  const get = (clave) => pasos.find((p) => p.clave === clave);
  assert.equal(get('registradas').valor, 163800);
  assert.equal(get('excluidas').valor, -6300);
  assert.equal(get('comisionable').valor, 157500);
  assert.equal(get('base').valor, 7875);
  assert.equal(get('multiplicador').valor, 675);
  assert.equal(get('comision').valor, 8550);
  assert.equal(get('bono').valor, 500);
  assert.equal(get('total').valor, 9050);
});

test('un vendedor sin ajustes ni bono: total = comisión', () => {
  const r = calcularVendedor({ vendedorId: ID.ana, periodo: '2026-01', config: v14, corte: CORRIDA_ENERO });
  assert.equal(r.total, r.comisionBase);
});

test('hay 47 vendedores de muestra en 4 tiendas (de los ~180 de la cadena)', () => {
  assert.equal(VENDEDORES.length, 47);
  assert.equal(enero.totales.vendedores, 47);
});

test('P08 · reasignar la venta disputada: Jorge sube de escalón y Pablo conserva el suyo', () => {
  const pablo = ventasDe(ID.pablo, '2026-01');
  const jorge = ventasDe(ID.jorge, '2026-01');
  const venta = pablo.find((l) => l.id === 'V-0388');
  const nuevas = {
    [ID.pablo]: pablo.filter((l) => l.id !== 'V-0388'),
    [ID.jorge]: [...jorge, { ...venta, vendedor: ID.jorge }],
  };
  const comun = { periodo: '2026-01', config: v14, corteOriginal: CORRIDA_ENERO, corteNuevo: '2026-03-30', ventasNuevas: nuevas };
  const recibe = recalcularRetroactivo({ vendedorId: ID.jorge, ...comun });
  const pierde = recalcularRetroactivo({ vendedorId: ID.pablo, ...comun });

  assert.equal(recibe.original.tasa, 3);
  assert.equal(recibe.recalculado.tasa, 5, '124,000 + 9,500 = 133,500 sobre 130,000 → 102.7 %');
  assert.equal(recibe.diferencia, recibe.recalculado.total - recibe.original.total);
  assert.ok(recibe.diferencia > 1000, 'supera Q1,000: requiere al Gerente');
  assert.equal(recibe.agregadas.length, 1);
  // valor de la venta a la tasa nueva + efecto del escalón = diferencia de comisión
  assert.equal(
    Math.round((recibe.componentes.valorVentas + recibe.componentes.efectoEscalon) * 100) / 100,
    Math.round((recibe.recalculado.comisionBase - recibe.original.comisionBase) * 100) / 100,
  );

  assert.equal(pierde.original.tasa, 3);
  assert.equal(pierde.recalculado.tasa, 3, 'Pablo sigue en el mismo escalón');
  assert.equal(pierde.quitadas.length, 1);
  assert.equal(pierde.diferencia, -285, '9,500 × 3 % × 1.0');
  assert.equal(pierde.componentes.efectoEscalon, 0);
});
