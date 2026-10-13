# Caso de estudio: texto y ubicación de imágenes

Sigue la sección 10 del documento maestro: más imágenes que texto, máximo cuatro líneas por bloque. La versión maquetada es [`caso/index.html`](../caso/index.html) (se genera con `npm run caso`). Las imágenes están en `portafolio/img/` y el video en `portafolio/video/`.

> Proyecto conceptual. Voltia, sus datos y sus personas son ficticios.

---

## Portada

**Voltia: comisiones que se pueden explicar**

Diseñé un sistema donde cualquier persona autorizada entiende por qué una comisión dio lo que dio, incluso meses después.

- Rol: diseño UX/UI y prototipo en código · proyecto conceptual
- Duración: `[Duración del proyecto]`
- Herramientas: HTML, CSS y JavaScript sin dependencias · Chromium y ffmpeg para las capturas
- Alcance: 12 pantallas, 6 roles, motor de cálculo con pruebas

**Imagen:** `01-p09-ajuste-de-marta` (pantalla completa del ajuste de Marta).

## Nadie puede explicar el número

Las comisiones viven en una hoja de cálculo que mantiene una sola persona. Cuando un vendedor reclama, hay que rastrear fórmulas a mano. Y una devolución de hace dos meses se corrige “a ojo”.

**Imagen:** `02-problema-hoja-de-calculo` (ilustración propia).

## Seis personas, el mismo número, distinto detalle

Cada rol ve la misma verdad con otro nivel de detalle y de permiso. Resolver esa tensión es el centro del diseño.

Analista de Compensaciones (equivocarse en una regla y afectar a 180 personas) · Jefe de tienda (que su equipo cobre bien y a tiempo) · Gerente Comercial (el costo total y el riesgo de aprobar algo mal) · Contabilidad (que lo aprobado cuadre con lo que se paga) · Auditoría (reconstruir cualquier número meses después) · Vendedor (entender cuánto va a ganar y por qué).

**Imagen:** tarjetas de rol (maquetadas en la página, sin captura).

## El modelo antes que las pantallas

Antes de dibujar, definí las seis reglas y su orden, los estados de cada cosa y quién puede hacer qué. Después lo convertí en un motor con pruebas para que cada cifra se pueda recalcular.

**Imagen:** `19-modelo` (orden de aplicación, estados del período y cómo se corrige un período pagado). Detalle en [`modelo.md`](modelo.md).

## Configurar reglas sin programar

Un formulario estructurado con una frase de lectura en vivo y una vista previa con un vendedor real. Activar una regla requiere dos personas: el Analista prepara y el Gerente aprueba.

*Descartado:* fórmulas libres (fallan en silencio), editor de nodos (excesivo para seis tipos de regla) y lenguaje natural (ambiguo con dinero). Decisiones D-08 y D-10.

**Imágenes:** `05-p02-constructor`, `06-p02-validacion`.

## Explicar cualquier número

La barra de cumplimiento dibuja los escalones y dice que la tasa se aplica a todo lo vendido. La cascada va del total vendido a la comisión, regla por regla. Cada cifra se puede pulsar.

*Descartado:* ocultar las ventas excluidas. Se muestran atenuadas, con su motivo. Decisiones D-01, D-03 y D-07.

**Imágenes:** `03-p03-detalle-de-marta`, `04-p03-venta-excluida`.

## El ciclo del mes, de la corrida al pago

Cada estado tiene un responsable. Un vendedor sin meta queda bloqueado en lugar de cobrar 0 %. El tope no recorta en silencio: escala. Aprobar y pagar son irreversibles y piden confirmación con el impacto.

*Descartado:* bloquear la tienda entera por una observación. Decisiones D-04, D-06 y D-14.

**Imágenes:** `08-p04-corrida`, `09-p05-revision-de-tienda`, `10-p06-aprobacion`, `11-p06-confirmacion`, `12-p07-pagos`.

## El caso de Marta

Una refrigeradora de Q12,000 le generó Q600. Al devolverse en marzo, su cumplimiento de enero bajó de 105 % a 97 %, y la nueva tasa se aplica a todo lo demás que vendió. La reversión es de Q3,780.

*Descartado:* reabrir enero. Y como el descuento no puede dejarla sin ingreso, en marzo se descuentan Q2,600 y Q1,180 pasan a abril. Decisiones D-02 y D-05.

**Video:** `ajuste-de-marta.mp4` / `.webm` (19 s, sin audio; los siete pasos de la secuencia de P09). **Imagen:** `01-p09-ajuste-de-marta`.

## Antes de cambiar una regla

El simulador usa las ventas reales de un período. Subir el escalón de 100 % de 5 % a 5.5 % cuesta Q13,213.30 en enero, lo ganan 17 personas y nadie cambia de escalón.

**Imagen:** `14-p10-simulador`.

## Lo que ve el vendedor

Cuánto va a ganar si sigue así, cuánto le falta para el siguiente escalón y qué significa un ajuste, en lenguaje simple. Ve su resultado cuando está aprobado, no antes.

**Imágenes:** `15-p11-movil-en-curso`, `16-p11-movil-ajuste`, `13-p08-disputa-de-jorge`.

## Sistema y entrega a desarrollo

Tokens con contraste AA comprobado, doce componentes con sus variantes y estados, y especificaciones de interacción de P02, P03 y P09. El prototipo es la referencia de comportamiento.

**Imágenes:** `18-sistema-componentes`, `17-p12-auditoria`. Documentos: [`sistema.md`](sistema.md), [`specs-interaccion.md`](specs-interaccion.md).

## Lo que dejé fuera a propósito

- Un vendedor que cambia de tienda a mitad de mes: cada venta cuenta para la tienda donde se registró y el bono usa la tienda al cierre. Es una simplificación declarada (D-12).
- La liquidación de quien renuncia con saldo pendiente: se menciona, no se diseña.
- Las 14 tiendas: la muestra tiene 4 y 47 vendedores, con totales que cuadran con los del caso.
- Los archivos de Figma: el prototipo en código ocupó su lugar (D-23).

## Qué haría después

Validar con analistas y vendedores reales, no con datos de ejemplo. Medir el tiempo que toma resolver un reclamo antes y después. Probar el constructor con alguien que nunca vio las reglas.
