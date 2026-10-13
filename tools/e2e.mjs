// Recorridos completos de Voltia con Chromium. Falla (código 1) si alguna comprobación no se cumple.
// Uso: npm start (en otra terminal) y luego npm run e2e
import { abrir, irA, cambiarRol, BASE } from './navegador.mjs';

let fallos = 0;
const verifica = (ok, texto) => { console.log(`  ${ok ? 'ok ' : 'FALLA'}  ${texto}`); if (!ok) fallos += 1; };

async function sesion(nombre, fn) {
  console.log(nombre);
  const { navegador, pagina, errores } = await abrir();
  const rol = async (r, ruta) => { await cambiarRol(pagina, r); await pagina.evaluate((x) => { location.hash = x; }, ruta); await pagina.waitForTimeout(250); };
  const texto = async () => (await pagina.locator('main').innerText()).replace(/\s+/g, ' ');
  const aceptar = async (marcar = false) => { if (marcar) await pagina.check('#dialogo input[type=checkbox]'); await pagina.click('#dialogo button[type=submit]'); await pagina.waitForTimeout(300); };
  try { await fn({ pagina, rol, texto, aceptar }); } catch (e) { verifica(false, `excepción: ${e.message.split('\n')[0]}`); }
  verifica(errores.length === 0, `consola sin errores${errores.length ? ': ' + errores[0] : ''}`);
  await navegador.close();
}

await sesion('Inicio y menú de usuario', async ({ pagina, rol, texto }) => {
  await irA(pagina, { rol: 'analista', ruta: '#/inicio' });
  let t = await texto();
  verifica(/Marzo 2026 en el ciclo del mes/.test(t) && /Q250,407\.60/.test(t), 'el Analista ve marzo en revisión con el total a pagar');
  verifica(/Luis Ortega: supera el tope/.test(t) && /Marta Ruiz: ajuste pendiente/.test(t), 'el Analista ve las alertas del período');
  verifica((await pagina.locator('#barra-demo, [data-accion="momento"]').count()) === 0, 'no queda ninguna barra ni control de demostración');
  const select = await pagina.evaluate(() => { const e = document.querySelector('select'); const c = getComputedStyle(e); return { izq: parseFloat(c.paddingLeft), der: parseFloat(c.paddingRight), ap: c.appearance }; });
  verifica(select.ap === 'none' && select.izq === 12 && select.der >= 36, 'el select usa flecha propia con 12 px de margen');
  await rol('gerente', '#/inicio'); t = await texto();
  verifica(/Pendiente de tu decisión/.test(t) && /Excepción de tope · Luis Ortega/.test(t) && /Activación de R-002 v3/.test(t), 'el Gerente ve su bandeja de decisiones');
  await rol('jefe', '#/inicio'); t = await texto();
  verifica(/Revisar a tu equipo/.test(t), 'el Jefe de tienda ve revisar a su equipo');
  await rol('contabilidad', '#/inicio'); t = await texto();
  verifica(/Esperando la aprobación/.test(t), 'Contabilidad espera la aprobación de marzo');
  await rol('auditoria', '#/inicio');
  verifica(/Consultar el rastro/.test(await texto()), 'Auditoría ve el rastro');
  verifica((await pagina.locator('#nav a').allInnerTexts()).join('|') === 'Inicio|Historial|Reglas|Período|Correcciones', 'cada rol tiene su navegación');
});

await sesion('Ciclo de marzo: de la revisión al pago', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { rol: 'analista', ruta: '#/periodos' });
  await pagina.locator('[data-accion="responder"]').click(); await pagina.fill('#dialogo textarea', 'La venta ya está registrada'); await aceptar();
  await rol('gerente', '#/aprobacion');
  verifica(await pagina.locator('[data-accion="aprobar"]').getAttribute('aria-disabled') === 'true', 'no se puede aprobar con el tope y el ajuste sin decidir');
  await pagina.locator('[data-accion="tope-autorizar"]').click(); await pagina.fill('#dialogo textarea', 'Campaña de electrónica'); await aceptar();
  await pagina.goto(`${BASE}/#/ajuste/AJ-2026-03-001`); await pagina.waitForTimeout(250);
  await pagina.click('[data-accion="autorizar"]'); await aceptar();
  await pagina.goto(`${BASE}/#/aprobacion`); await pagina.waitForTimeout(250);
  await pagina.click('[data-accion="aprobar"]');
  verifica(await pagina.locator('#dialogo button[type=submit]').isDisabled(), 'aprobar exige aceptar que no se puede deshacer');
  await aceptar(true);
  verifica(/está aprobado/.test(await texto()), 'el Gerente aprueba el período');
  await rol('contabilidad', '#/pagos');
  verifica(/Todo cuadra/.test(await texto()), 'Contabilidad ve que lo exportado cuadra con lo aprobado');
  const [descarga] = await Promise.all([pagina.waitForEvent('download'), pagina.click('[data-accion="exportar"]')]);
  verifica(descarga.suggestedFilename() === 'voltia-comisiones-2026-03.csv', 'se descarga el CSV de pago');
  await pagina.click('[data-accion="pagar"]'); await aceptar(true);
  verifica(/Marcado como pagado por Héctor Lima/.test(await texto()), 'Contabilidad marca el período como pagado');
});

await sesion('Permisos por rol', async ({ pagina, rol, texto }) => {
  await irA(pagina, { rol: 'contabilidad', ruta: '#/reglas' });
  verifica(/no es parte de tu rol/.test(await texto()), 'Contabilidad no entra a Reglas');
  await rol('jefe', '#/detalle/E-1101?p=2026-01');
  verifica(/No puedes ver esta información/.test(await texto()), 'el Jefe de T03 no ve a una vendedora de T02');
  await rol('analista', '#/aprobacion');
  verifica(/no es parte de tu rol/.test(await texto()), 'el Analista no entra a Aprobación');
  await rol('auditoria', '#/ajuste/AJ-2026-03-001');
  verifica((await pagina.locator('[data-accion="autorizar"]').count()) === 0, 'Auditoría ve el ajuste sin botones de autorizar');
  await rol('analista', '#/periodos');
  verifica((await pagina.locator('.pestanas--seccion a').allInnerTexts()).join('|') === 'Corrida|Tiendas', 'el Analista ve las pestañas Corrida y Tiendas');
});

await sesion('El ajuste de Marta', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { rol: 'analista', ruta: '#/ajuste/AJ-2026-03-001' });
  let t = await texto();
  verifica(/Q9,050/.test(t) && /Q5,270/.test(t) && /−Q3,780/.test(t), 'enero antes y después: Q9,050 → Q5,270, diferencia −Q3,780');
  verifica(/Q600/.test(t) && /Q3,180/.test(t), 'la diferencia se separa en Q600 y Q3,180');
  verifica(/Q2,600/.test(t) && /Q1,180/.test(t), 'marzo descuenta Q2,600 y deja Q1,180 de saldo');
  await rol('gerente', '#/ajuste/AJ-2026-03-001'); await pagina.click('[data-accion="autorizar"]'); await aceptar();
  verifica(/Autorizado/.test(await texto()), 'el Gerente autoriza el ajuste');
  await rol('analista', '#/detalle/E-1201?p=2026-03'); t = await texto();
  verifica(/Total del período Q2,600/.test(t), 'el total de marzo de Marta baja a Q2,600');
});

await sesion('Disputa de Jorge', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { rol: 'analista', ruta: '#/disputa/D-014' });
  await pagina.click('[data-accion="tomar"]'); await pagina.waitForTimeout(250);
  await pagina.locator('tr', { hasText: 'V-0388' }).locator('[data-accion="elegir"]').click(); await pagina.waitForTimeout(250);
  verifica(/Jorge Castillo.*3 % → 5 %/.test(await texto()), 'la venta reasignada sube a Jorge de 3 % a 5 %');
  await pagina.click('[data-accion="favor"]'); await pagina.fill('#dialogo textarea', 'Estaba a nombre de otro vendedor.'); await aceptar();
  verifica(/Resuelta a favor/.test(await texto()), 'la disputa se resuelve a favor');
  await rol('analista', '#/ajustes'); const t = await texto();
  verifica(/\+Q3,163\.80/.test(t) && /−Q285/.test(t), 'se generan los ajustes de Jorge (+Q3,163.80) y de Pablo (−Q285)');
});

await sesion('Constructor de reglas', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { rol: 'analista', ruta: '#/regla/R-001' });
  await pagina.fill('[data-esc="2"][data-campo="tasa"]', '5.5'); await pagina.waitForTimeout(150);
  let t = await texto();
  verifica(/paga 5\.5 %/.test(t) && /Total de enero Q9,050 Q9,905/.test(t), 'la frase y la vista previa con Marta cambian en vivo (+Q855)');
  await pagina.fill('[data-esc="2"][data-campo="desde"]', '102'); await pagina.waitForTimeout(150);
  verifica(/hueco entre 99\.99 % y 102 %/.test(await texto()), 'detecta un hueco entre escalones');
  await pagina.fill('[data-esc="2"][data-campo="desde"]', '100');
  await pagina.fill('[name="prioridad"]', '2'); await pagina.fill('[name="vigenciaDesde"]', '2026-01-01'); await pagina.fill('[name="fuente"]', 'Acta CC-2026-02'); await pagina.waitForTimeout(150);
  t = await texto();
  verifica(/Conflicto: R-002/.test(t) && /La vigencia desde/.test(t), 'detecta el conflicto de prioridad y la vigencia que toca un período cerrado');
  await pagina.fill('[name="prioridad"]', '1'); await pagina.fill('[name="vigenciaDesde"]', '2026-05-01'); await pagina.waitForTimeout(150);
  await pagina.click('[data-accion="guardar"]'); await pagina.waitForTimeout(250);
  await pagina.click('[data-accion="solicitar"]'); await aceptar();
  verifica(/espera la aprobación del Gerente/.test(await texto()), 'solicita la activación');
  await rol('gerente', '#/aprobacion');
  await pagina.locator('[data-accion="regla-aprobar"][data-id="R-001"]').click(); await aceptar();
  await rol('analista', '#/reglas');
  verifica(/R-001[\s\S]*v4[\s\S]*Vigente/.test(await texto()), 'R-001 v4 queda vigente después de la aprobación');
});

console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nTodas las comprobaciones pasaron');
process.exit(fallos ? 1 : 0);
