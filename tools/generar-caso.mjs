// Genera caso/index.html a partir de las imágenes de portafolio/img (lee sus dimensiones) y del texto del caso.
// Uso: node tools/generar-caso.mjs
import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const RAIZ = new URL('../', import.meta.url).pathname;
const dims = (archivo) => {
  const ruta = `${RAIZ}portafolio/img/${archivo}`;
  if (!existsSync(ruta)) return null;
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', ruta]).toString().trim().split('x').map(Number);
  return { w, h };
};
const fig = (archivo, alt, leyenda = '', { clase = '', lazy = true } = {}) => {
  const d = dims(archivo);
  if (!d) return `<!-- falta ${archivo} -->`;
  return `<figure class="figura ${clase}"><img src="../portafolio/img/${archivo}" alt="${alt}" width="${d.w / 2}" height="${d.h / 2}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">${leyenda ? `<figcaption>${leyenda}</figcaption>` : ''}</figure>`;
};
const figMovil = (archivo, alt, leyenda) => {
  const d = dims(archivo);
  if (!d) return `<!-- falta ${archivo} -->`;
  return `<figure class="figura"><img src="../portafolio/img/${archivo}" alt="${alt}" width="${d.w / 3}" height="${d.h / 3}" loading="lazy" decoding="async"><figcaption>${leyenda}</figcaption></figure>`;
};

const video = existsSync(`${RAIZ}portafolio/video/ajuste-de-marta.mp4`)
  ? `<figure class="figura"><video controls muted playsinline preload="metadata" poster="../portafolio/img/01-p09-ajuste-de-marta.webp" aria-describedby="leyenda-video">
      <source src="../portafolio/video/ajuste-de-marta.webm" type="video/webm"><source src="../portafolio/video/ajuste-de-marta.mp4" type="video/mp4">
      Tu navegador no reproduce video. Mira el ajuste completo en <a href="../#/ajuste/AJ-2026-03-001">el prototipo</a>.</video>
      <figcaption id="leyenda-video">Secuencia de 18 segundos, sin audio: enero como se pagó, la devolución, la caída de 105 % a 97 %, el cambio de escalón, la separación de Q600 y Q3,180 y la aplicación en marzo.</figcaption></figure>`
  : fig('01-p09-ajuste-de-marta.webp', 'Pantalla del ajuste de Marta Ruiz con la comparación de enero antes y después de la devolución.', '');

const roles = [
  ['Analista de Compensaciones', 'Crea reglas, ejecuta cálculos y prepara ajustes.', 'Equivocarse en una regla y que afecte a 180 personas.'],
  ['Jefe de tienda', 'Revisa los resultados de su tienda y marca observaciones.', 'Que su equipo cobre bien y a tiempo.'],
  ['Gerente Comercial', 'Aprueba el período y decide las excepciones.', 'El costo total y el riesgo de aprobar algo mal.'],
  ['Contabilidad', 'Exporta lo aprobado y lo marca como pagado.', 'Que lo aprobado cuadre con lo que se paga.'],
  ['Auditoría', 'Solo consulta, con el rastro completo.', 'Poder reconstruir cualquier número meses después.'],
  ['Vendedor', 'Consulta su detalle y abre disputas.', 'Entender cuánto va a ganar y por qué.'],
];

const orden = [['R-006', 'Excluye ventas con más de 25 % de descuento'], ['R-001', 'Fija la tasa por escalón sobre toda la venta'], ['R-002', 'Multiplica por categoría'], ['R-005', 'Marca el tope y lo escala'], ['R-003', 'Bono de equipo, en segunda pasada'], ['R-004', 'Corrige períodos pagados con ajustes']];
const estados = ['Abierto', 'Cerrado a ventas', 'Calculado', 'En revisión', 'Aprobado', 'Pagado'];

const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Voltia: comisiones que se pueden explicar · Caso de estudio</title>
  <meta name="description" content="Caso de estudio de diseño UX/UI: un sistema de comisiones con reglas, estados, roles y ajustes retroactivos que explica cada número. Proyecto conceptual con datos ficticios.">
  <meta property="og:type" content="article">
  <meta property="og:title" content="Voltia: comisiones que se pueden explicar">
  <meta property="og:description" content="Por qué una devolución de Q12,000 revierte Q3,780 y no Q600. Caso de estudio de un sistema de comisiones, conceptual y con datos ficticios.">
  <meta property="og:image" content="../assets/og.png">
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="https://voltia.example/caso/">
  <link rel="preload" href="../fonts/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="../fonts/ibm-plex-sans-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="../src/styles/tokens.css">
  <link rel="stylesheet" href="../src/styles/base.css">
  <link rel="stylesheet" href="caso.css">
</head>
<body>
  <a class="saltar" href="#contenido" data-saltar>Saltar al contenido</a>
  <p class="aviso-caso">Proyecto conceptual. Voltia, sus datos y sus personas son ficticios.</p>
  <div class="caso">
    <header class="caso-cabecera"><a class="logo" href="../">Voltia <small>caso de estudio</small></a>
      <nav aria-label="Secciones del caso"><a href="#problema">El problema</a><a href="#marta">El caso de Marta</a><a href="#sistema">Sistema</a><a href="../#/inicio">Abrir el prototipo</a></nav></header>
    <main id="contenido" tabindex="-1">
      <section class="hero" aria-labelledby="titulo">
        <h1 id="titulo">Voltia: comisiones que se pueden explicar</h1>
        <p class="hero__frase">Diseñé un sistema donde cualquier persona autorizada entiende por qué una comisión dio lo que dio, incluso meses después.</p>
        <dl class="ficha">
          <div><dt>Rol</dt><dd>Diseño UX/UI y prototipo en código · proyecto conceptual</dd></div>
          <div><dt>Duración</dt><dd><span class="marcador">[Duración del proyecto]</span></dd></div>
          <div><dt>Herramientas</dt><dd>HTML, CSS y JavaScript sin dependencias · Chromium y ffmpeg para las capturas</dd></div>
          <div><dt>Alcance</dt><dd>12 pantallas, 6 roles, motor de cálculo con pruebas</dd></div>
        </dl>
        ${fig('01-p09-ajuste-de-marta.webp', 'Pantalla de ajuste de Marta Ruiz: la comparación de enero antes y después de la devolución, con la tasa que cambia de 5 % a 3 % y un total de Q9,050 contra Q5,270.', 'La pantalla central del caso: el ajuste de Marta, explicado sin texto adicional.', { lazy: false })}
      </section>

      <section class="bloque" id="problema" aria-labelledby="h-problema">
        <h2 id="h-problema">Nadie puede explicar el número</h2>
        <p>Las comisiones viven en una hoja de cálculo que mantiene una sola persona. Cuando un vendedor reclama, hay que rastrear fórmulas a mano. Y una devolución de hace dos meses se corrige “a ojo”.</p>
        ${fig('02-problema-hoja-de-calculo.webp', 'Ilustración de una hoja de cálculo de comisiones con una fórmula larga en la celda K14 y un comentario: “¿Por qué me salió esto?”.', 'Ilustración hecha para el caso. Ninguna hoja real, empresa o persona.')}
      </section>

      <section class="bloque" aria-labelledby="h-roles">
        <h2 id="h-roles">Seis personas, el mismo número, distinto detalle</h2>
        <p>Cada rol ve la misma verdad con otro nivel de detalle y de permiso. Resolver esa tensión es el centro del diseño.</p>
        <ul class="roles">${roles.map(([n, h, p]) => `<li><strong>${n}</strong><span>${h}</span><span class="que">Le preocupa: ${p.charAt(0).toLowerCase()}${p.slice(1)}</span></li>`).join('')}</ul>
      </section>

      <section class="bloque" aria-labelledby="h-modelo">
        <h2 id="h-modelo">El modelo antes que las pantallas</h2>
        <p>Antes de dibujar, definí las seis reglas y su orden, los estados de cada cosa y quién puede hacer qué. Después lo convertí en un motor con pruebas para que cada cifra se pueda recalcular.</p>
        <div class="modelo" id="modelo-figura">
          <div><h3>Orden de aplicación de las reglas</h3><ol class="cadena">${orden.map(([r, t], i) => `<li><div class="caja${r === 'R-001' ? ' caja--clave' : ''}"><b>${r}</b>${t}</div>${i < orden.length - 1 ? '<span class="flecha" aria-hidden="true">→</span>' : ''}</li>`).join('')}</ol></div>
          <div><h3>Estados de un período</h3><ol class="cadena">${estados.map((e, i) => `<li><div class="caja${e === 'Pagado' ? ' caja--clave' : ''}">${e}${e === 'Pagado' ? '<span>no se reabre</span>' : ''}</div>${i < estados.length - 1 ? '<span class="flecha" aria-hidden="true">→</span>' : ''}</li>`).join('')}</ol></div>
          <div><h3>Cómo se corrige un período pagado</h3><div class="correccion"><div class="caja"><strong>Enero · pagado</strong>Marta cobró Q9,050 con 105 % de su meta.</div><div class="cruz">9 de marzo: se devuelve una venta de Q12,000</div><div class="caja"><strong>Marzo · abierto</strong>Ajuste <span class="negativo">−Q3,780</span> que apunta a enero.</div></div></div>
        </div>
      </section>

      <section class="bloque" aria-labelledby="h-reglas">
        <h2 id="h-reglas">Configurar reglas sin programar</h2>
        <p>Un formulario estructurado con una frase de lectura en vivo y una vista previa con un vendedor real. Activar una regla requiere dos personas: el Analista prepara y el Gerente aprueba.</p>
        <p class="descartado">Descarté fórmulas libres (fallan en silencio), editor de nodos (excesivo para seis tipos de regla) y lenguaje natural (ambiguo con dinero). Decisiones D-08 y D-10.</p>
        <div class="par">${fig('05-p02-constructor.webp', 'Constructor de reglas editando R-001 con el escalón de 100 % en 5.5 %, la frase de lectura y la vista previa con Marta Ruiz.', 'La frase de lectura y la vista previa cambian mientras se configura.')}${fig('06-p02-validacion.webp', 'Constructor de reglas con errores de validación: un hueco entre escalones, un conflicto de prioridad y una vigencia que toca un período ya calculado.', 'Las validaciones dicen qué pasó y cuál es la primera fecha válida.')}</div>
      </section>

      <section class="bloque" aria-labelledby="h-explicar">
        <h2 id="h-explicar">Explicar cualquier número</h2>
        <p>La barra de cumplimiento dibuja los escalones y dice que la tasa se aplica a todo lo vendido. La cascada va del total vendido a la comisión, regla por regla. Cada cifra se puede pulsar.</p>
        <p class="descartado">Las ventas excluidas se muestran atenuadas, con su motivo, en lugar de ocultarse. Decisiones D-01, D-03 y D-07.</p>
        <div class="par">${fig('03-p03-detalle-de-marta.webp', 'Detalle de comisión de Marta Ruiz en enero: total de Q9,050, cumplimiento de 105 %, cascada de reglas y ventas.', 'Marta, enero: de Q163,800 registrados a Q9,050.')}${fig('04-p03-venta-excluida.webp', 'Tabla de ventas de Ana Morales con una venta excluida por un descuento de 28 % mostrada atenuada y con su motivo.', 'Ana Morales: la venta excluida sigue visible, con su motivo.')}</div>
      </section>

      <section class="bloque" aria-labelledby="h-ciclo">
        <h2 id="h-ciclo">El ciclo del mes, de la corrida al pago</h2>
        <p>Cada estado tiene un responsable. Un vendedor sin meta queda bloqueado en lugar de cobrar 0 %. El tope no recorta en silencio: escala. Aprobar y pagar son irreversibles y piden confirmación con el impacto.</p>
        <p class="descartado">Una observación bloquea solo a ese vendedor, no a la tienda. Decisiones D-04, D-06 y D-14.</p>
        ${fig('08-p04-corrida.webp', 'Período y corrida de enero: línea de estados, resumen con el total a pagar y alertas de Sofía Ramírez sin meta y Luis Ortega sobre el tope.', 'La corrida avisa antes de pasar a revisión: Sofía sin meta, Luis sobre el tope.')}
        <div class="par">${fig('09-p05-revision-de-tienda.webp', 'Revisión de la tienda Galerías del Sur con la tabla de vendedores, su cumplimiento y estado.', 'El Jefe de tienda ve solo su tienda.')}${fig('10-p06-aprobacion.webp', 'Aprobación del período con el costo total, la comparación con meses anteriores y la bandeja de decisiones del Gerente.', 'El Gerente decide el tope de Luis, el ajuste de Marta y la regla pendiente.')}</div>
        <div class="par">${fig('11-p06-confirmacion.webp', 'Diálogo de confirmación para aprobar enero con el resumen de qué se aprueba, cuánto y qué queda pendiente, y una casilla para aceptar que no se puede deshacer.', 'Qué se aprueba, cuánto y qué queda pendiente.')}${fig('12-p07-pagos.webp', 'Pantalla de pagos de Contabilidad con la validación de que el archivo exportado cuadra con lo aprobado.', 'Contabilidad exporta solo si lo exportado cuadra con lo aprobado.')}</div>
      </section>

      <section class="bloque" id="marta" aria-labelledby="h-marta">
        <h2 id="h-marta">El caso de Marta</h2>
        <p>Una refrigeradora de Q12,000 le generó Q600. Al devolverse en marzo, su cumplimiento de enero bajó de 105 % a 97 %, y la nueva tasa se aplica a todo lo demás que vendió. La reversión es de Q3,780.</p>
        <p class="descartado">Descarté reabrir enero. Y como el descuento no puede dejarla sin ingreso, en marzo se descuentan Q2,600 y Q1,180 pasan a abril. Decisiones D-02 y D-05.</p>
        ${video}
        ${fig('01-p09-ajuste-de-marta.webp', 'Pantalla de ajuste de Marta Ruiz completa: antes y después, la barra de Q600 y Q3,180 y la aplicación en marzo con el medidor del límite del 50 %.', 'La pantalla completa: antes y después, de dónde sale la diferencia y cómo se aplica.')}
      </section>

      <section class="bloque" aria-labelledby="h-simulador">
        <h2 id="h-simulador">Antes de cambiar una regla</h2>
        <p>El simulador usa las ventas reales de un período. Subir el escalón de 100 % de 5 % a 5.5 % cuesta Q13,213.30 en enero, lo ganan 17 personas y nadie cambia de escalón.</p>
        ${fig('14-p10-simulador.webp', 'Simulador de cambio de regla con el escalón de 100 % en 5.5 %: costo adicional, vendedores que ganan, distribución por tienda y quién gana más.', 'El simulador termina en un borrador; no activa nada por sí solo.')}
      </section>

      <section class="bloque" aria-labelledby="h-vendedor">
        <h2 id="h-vendedor">Lo que ve el vendedor</h2>
        <p>Cuánto va a ganar si sigue así, cuánto le falta para el siguiente escalón y qué significa un ajuste, en lenguaje simple. Ve su resultado cuando está aprobado, no antes.</p>
        <div class="moviles">${figMovil('15-p11-movil-en-curso.webp', 'Pantalla móvil de Mi comisión a mitad de enero con el avance, la proyección y el siguiente escalón.', 'A mitad de mes.')}${figMovil('16-p11-movil-ajuste.webp', 'Pantalla móvil de Mi comisión con la explicación en lenguaje simple del ajuste por la devolución y el saldo para abril.', 'Un ajuste explicado.')}</div>
        ${fig('13-p08-disputa-de-jorge.webp', 'Disputa de Jorge Castillo: búsqueda de la venta en el registro, el efecto de reasignarla y la trazabilidad del vendedor al lado.', 'Jorge reclama una venta que quedó a nombre de otro vendedor. El Analista la encuentra y el sistema calcula ambos ajustes.')}
      </section>

      <section class="bloque" id="sistema" aria-labelledby="h-sistema">
        <h2 id="h-sistema">Sistema y entrega a desarrollo</h2>
        <p>Tokens con contraste AA comprobado, doce componentes con sus variantes y estados, y especificaciones de interacción de P02, P03 y P09. El prototipo es la referencia de comportamiento.</p>
        ${fig('18-sistema-componentes.webp', 'Pantalla del sistema de diseño con los tokens de color, la escala tipográfica y los componentes.', 'Los componentes del sistema, dibujados con el mismo código de las pantallas.')}
        ${fig('17-p12-auditoria.webp', 'Historial de auditoría con eventos filtrables que muestran quién, qué, cuándo, valor anterior y valor nuevo.', 'Cualquier número se puede reconstruir meses después.')}
      </section>

      <section class="bloque" aria-labelledby="h-fuera">
        <h2 id="h-fuera">Lo que dejé fuera a propósito</h2>
        <ul class="dejado">
          <li>Un vendedor que cambia de tienda a mitad de mes: cada venta cuenta para la tienda donde se registró y el bono usa la tienda al cierre. Es una simplificación declarada (D-12).</li>
          <li>La liquidación de quien renuncia con saldo pendiente: se menciona, no se diseña.</li>
          <li>Las 14 tiendas: la muestra tiene 4 y 47 vendedores, con totales que cuadran con los del caso.</li>
          <li>Los archivos de Figma: el prototipo en código ocupó su lugar (D-23).</li>
        </ul>
      </section>

      <section class="bloque" aria-labelledby="h-despues">
        <h2 id="h-despues">Qué haría después</h2>
        <p>Validar con analistas y vendedores reales, no con datos de ejemplo. Medir el tiempo que toma resolver un reclamo antes y después. Probar el constructor con alguien que nunca vio las reglas.</p>
      </section>
    </main>
    <footer class="pie-caso"><span>Proyecto conceptual. Voltia, sus datos y sus personas son ficticios.</span><span><a href="../">Abrir el prototipo</a> · <a href="../docs/decisiones.md">Decisiones</a> · <a href="../docs/modelo.md">Modelo</a></span></footer>
  </div>
  <script>document.querySelector('[data-saltar]').addEventListener('click',function(e){e.preventDefault();document.getElementById('contenido').focus();});</script>
</body>
</html>
`;
writeFileSync(`${RAIZ}caso/index.html`, html);
console.log('caso/index.html generado');
