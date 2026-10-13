// Recorridos completos del prototipo con Chromium. Falla (código 1) si alguna comprobación no se cumple.
// Uso: npm start (en otra terminal) y luego npm run e2e
import { abrir, irA, abrirControles } from './navegador.mjs';

let fallos = 0;
const verifica = (ok, texto) => { console.log(`  ${ok ? 'ok ' : 'FALLA'}  ${texto}`); if (!ok) fallos += 1; };

async function sesion(nombre, fn) {
  console.log(nombre);
  const { navegador, pagina, errores } = await abrir();
  const rol = async (r, ruta, vend) => { await abrirControles(pagina); await pagina.selectOption('#demo-rol', r); if (vend) await pagina.selectOption('#demo-vendedor', vend); await pagina.evaluate((x) => { location.hash = x; }, ruta); await pagina.waitForTimeout(250); };
  const texto = async () => (await pagina.locator('main').innerText()).replace(/\s+/g, ' ');
  const aceptar = async (marcar = false) => { if (marcar) await pagina.check('#dialogo input[type=checkbox]'); await pagina.click('#dialogo button[type=submit]'); await pagina.waitForTimeout(300); };
  try { await fn({ pagina, rol, texto, aceptar }); } catch (e) { verifica(false, `excepción: ${e.message.split('\n')[0]}`); }
  verifica(errores.length === 0, `consola sin errores${errores.length ? ': ' + errores[0] : ''}`);
  await navegador.close();
}

await sesion('Ciclo de enero (P04 a P07)', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { momento: 'M1', rol: 'analista', ruta: '#/periodos' });
  await pagina.click('[data-accion="corrida"]'); await aceptar();
  await pagina.waitForSelector('text=Alertas de la corrida', { timeout: 12000 });
  let t = await texto();
  verifica(/Sofía Ramírez: falta meta/.test(t) && /Luis Ortega: supera el tope/.test(t), 'la corrida alerta de Sofía sin meta y de Luis sobre el tope');
  verifica(await pagina.locator('[data-accion="revision"]').getAttribute('aria-disabled') === 'true', 'no se puede enviar a revisión con un vendedor bloqueado');
  await pagina.click('[data-accion="meta"]'); await pagina.fill('#dialogo input[type=number]', '70000'); await aceptar();
  verifica(/metas cargadas después de la corrida/.test(await texto()), 'una meta tardía exige otra corrida (D-14)');
  await pagina.click('[data-accion="corrida"] >> nth=-1'); await aceptar(); await pagina.waitForTimeout(3600);
  await pagina.click('[data-accion="revision"]'); await aceptar();
  verifica(/En revisión/.test(await texto()), 'el período pasa a revisión');
  await rol('jefe', '#/tienda?p=2026-01'); t = await texto();
  verifica(/Cumplimiento de la tienda 105\.0 %/.test(t) && /Gana el bono/.test(t), 'el Jefe ve su tienda al 105.0 % con bono');
  await pagina.locator('[data-accion="observar"]').first().click(); await pagina.fill('#dialogo textarea', 'Revisar ventas de la semana 3'); await aceptar();
  verifica(/Observada/.test(await texto()), 'el Jefe marca una observación');
  await rol('gerente', '#/aprobacion');
  verifica(await pagina.locator('[data-accion="aprobar"]').getAttribute('aria-disabled') === 'true', 'no se puede aprobar con bloqueos (tope y observación)');
  await pagina.locator('[data-accion="tope-autorizar"]').click(); await pagina.fill('#dialogo textarea', 'Campaña de electrónica'); await aceptar();
  await rol('analista', '#/periodos?p=2026-01'); await pagina.locator('[data-accion="responder"]').click(); await pagina.fill('#dialogo textarea', 'Revisado'); await aceptar();
  await rol('gerente', '#/aprobacion');
  await pagina.click('[data-accion="aprobar"]');
  verifica(await pagina.locator('#dialogo button[type=submit]').isDisabled(), 'aprobar exige aceptar que no se puede deshacer');
  await aceptar(true);
  verifica(/está aprobado/.test(await texto()), 'el Gerente aprueba el período');
  await rol('contabilidad', '#/pagos');
  verifica(/Todo cuadra/.test(await texto()), 'Contabilidad ve que lo exportado cuadra con lo aprobado');
  const [descarga] = await Promise.all([pagina.waitForEvent('download'), pagina.click('[data-accion="exportar"]')]);
  verifica(descarga.suggestedFilename() === 'voltia-comisiones-2026-01.csv', 'se descarga el CSV de pago');
  await pagina.click('[data-accion="pagar"]'); await aceptar(true);
  verifica(/Marcado como pagado por Héctor Lima/.test(await texto()), 'Contabilidad marca el período como pagado');
});

await sesion('Permisos por rol', async ({ pagina, rol, texto }) => {
  await irA(pagina, { momento: 'M2', rol: 'vendedor', vendedor: 'E-1201', ruta: '#/periodos' });
  verifica(/no es parte de tu rol/.test(await texto()), 'el vendedor no entra a Período y corrida');
  await rol('jefe', '#/detalle/E-1101?p=2026-01');
  verifica(/No puedes ver esta información/.test(await texto()), 'el Jefe de T03 no ve a una vendedora de T02');
  await rol('analista', '#/aprobacion');
  verifica(/no es parte de tu rol/.test(await texto()), 'el Analista no entra a Aprobación');
  await rol('auditoria', '#/ajuste/AJ-2026-03-001');
  verifica((await pagina.locator('[data-accion="autorizar"]').count()) === 0, 'Auditoría ve el ajuste sin botones de autorizar');
});

await sesion('El caso de Marta (P09, P03, P11)', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { momento: 'M2', rol: 'analista', ruta: '#/ajuste/AJ-2026-03-001' });
  let t = await texto();
  verifica(/Q9,050/.test(t) && /Q5,270/.test(t) && /−Q3,780/.test(t), 'enero antes y después: Q9,050 → Q5,270, diferencia −Q3,780');
  verifica(/Q600/.test(t) && /Q3,180/.test(t), 'la diferencia se separa en Q600 y Q3,180');
  verifica(/Q2,600/.test(t) && /Q1,180/.test(t), 'marzo descuenta Q2,600 y deja Q1,180 de saldo');
  await rol('gerente', '#/ajuste/AJ-2026-03-001'); await pagina.click('[data-accion="autorizar"]'); await aceptar();
  verifica(/Autorizado/.test(await texto()), 'el Gerente autoriza el ajuste');
  await rol('analista', '#/detalle/E-1201?p=2026-03'); t = await texto();
  verifica(/Total del período Q2,600/.test(t), 'el total de marzo de Marta baja a Q2,600');
  await rol('vendedor', '#/mi-comision', 'E-1201'); t = await texto();
  verifica(/pasó de 5 % a 3 %/.test(t) && /Q1,180/.test(t), 'Marta recibe la explicación en lenguaje simple');
});

await sesion('Disputa de Jorge (P08)', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { momento: 'M2', rol: 'analista', ruta: '#/disputa/D-014' });
  await pagina.click('[data-accion="tomar"]'); await pagina.waitForTimeout(250);
  await pagina.locator('tr', { hasText: 'V-0388' }).locator('[data-accion="elegir"]').click(); await pagina.waitForTimeout(250);
  verifica(/Jorge Castillo.*3 % → 5 %/.test(await texto()), 'la venta reasignada sube a Jorge de 3 % a 5 %');
  await pagina.click('[data-accion="favor"]'); await pagina.fill('#dialogo textarea', 'Estaba a nombre de otro vendedor.'); await aceptar();
  verifica(/Resuelta a favor/.test(await texto()), 'la disputa se resuelve a favor');
  await rol('analista', '#/ajustes'); const t = await texto();
  verifica(/\+Q3,163\.80/.test(t) && /−Q285/.test(t), 'se generan los ajustes de Jorge (+Q3,163.80) y de Pablo (−Q285)');
});

await sesion('Constructor de reglas (P02)', async ({ pagina, rol, texto, aceptar }) => {
  await irA(pagina, { momento: 'M1', rol: 'analista', ruta: '#/regla/R-001' });
  await pagina.fill('[data-esc="2"][data-campo="tasa"]', '5.5'); await pagina.waitForTimeout(150);
  let t = await texto();
  verifica(/paga 5\.5 %/.test(t) && /Total de enero Q9,050 Q9,905/.test(t), 'la frase y la vista previa con Marta cambian en vivo (+Q855)');
  await pagina.fill('[data-esc="2"][data-campo="desde"]', '102'); await pagina.waitForTimeout(150);
  verifica(/hueco entre 99\.99 % y 102 %/.test(await texto()), 'detecta un hueco entre escalones');
  await pagina.fill('[data-esc="2"][data-campo="desde"]', '100');
  await pagina.fill('[name="prioridad"]', '2'); await pagina.fill('[name="vigenciaDesde"]', '2026-01-01'); await pagina.fill('[name="fuente"]', 'Acta CC-2026-02'); await pagina.waitForTimeout(150);
  t = await texto();
  verifica(/Conflicto: R-002/.test(t) && /La vigencia desde/.test(t), 'detecta el conflicto de prioridad y la vigencia que toca un período cerrado');
  await pagina.fill('[name="prioridad"]', '1'); await pagina.fill('[name="vigenciaDesde"]', '2026-03-01'); await pagina.waitForTimeout(150);
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
