# Especificaciones de interacción para desarrollo

Pantallas P02, P03 y P09. Cada especificación lista la estructura, el comportamiento, los estados y los casos borde. El código de referencia está en `src/app/vistas/` y los componentes en `src/app/ui.js` y `src/styles/componentes.css`.

Convenciones: cada número calculado sale del motor (`src/engine/calculo.js`); ningún componente tiene cifras escritas a mano. Los textos son definitivos salvo validación del cliente.

---

## P02 · Constructor de reglas

**Objetivo.** Que el Analista configure una regla sin programar y vea qué hará antes de guardar.

**Estructura (1440 px).** Columna principal de formulario (secciones: identificación, alcance y condición, cálculo, prioridad y acumulación, vigencia, fuente y responsable, versiones) y columna lateral fija de 420 px (frase de lectura, vista previa, validación y acciones). Por debajo de 1100 px la columna lateral baja bajo el formulario.

**Comportamiento**

| Elemento | Interacción | Resultado |
|---|---|---|
| Cualquier campo | `input` | Marca el borrador como modificado y actualiza frase, vista previa y validación sin recargar la pantalla ni perder el foco |
| Editor de escalones | Editar desde, hasta o tasa | Valida huecos y superposiciones fila por fila; el mensaje aparece bajo la fila |
| “Agregar escalón” | clic | Agrega un escalón 20 puntos más arriba, cierra el anterior en 0.01 menos, tasa +1 |
| Quitar escalón | clic en el bote | El último queda abierto (“o más”) |
| Vista previa | elegir vendedor | Compara vigente y edición con las ventas reales de enero y las metas congeladas de la corrida |
| “Guardar borrador” | clic | Crea la versión siguiente (v4) en borrador. La versión vigente no cambia |
| “Solicitar activación” | clic | Abre la confirmación; si hay conflicto de prioridad, muestra ambas reglas lado a lado y no avanza |
| “Aprobar activación” (Gerente) | clic | La versión pasa a vigente y la anterior a vencida un día antes del inicio de la nueva |

**Validaciones**

1. El primer escalón empieza en 0 %.
2. Cada escalón empieza 0.01 después de que termina el anterior: más es un **hueco**, menos o igual es una **superposición**.
3. El último escalón queda abierto.
4. Misma prioridad que otra regla vigente: **conflicto**; no se puede solicitar la activación.
5. Vigencia: no puede empezar antes de hoy ni dentro de un período cerrado a ventas, calculado o pagado.
6. Nombre, fuente y responsable obligatorios. La fuente es obligatoria para que haya auditoría posible.

Los errores no se muestran hasta que la persona toca el formulario.

**Estados de la pantalla**

| Estado | Qué ocurre |
|---|---|
| Borrador nuevo | Copia de la versión vigente, sin cambios; la validación invita a editar |
| Editando versión vigente | Muestra “v4 · borrador nuevo” y que la v3 no cambia |
| Error de validación | Mensajes junto al campo y resumen en el panel lateral; “Guardar” sigue disponible, “Solicitar” no |
| Conflicto con otra regla | Error en prioridad y diálogo comparativo al solicitar |
| Pendiente de aprobación | Formulario deshabilitado con aviso; el Analista puede retirar la solicitud, el Gerente aprobar o devolver |
| Solo lectura | Gerente y Auditoría ven el formulario sin edición |

**Casos borde.** Escalones con NaN (campo vacío) se tratan como error de ese campo. Si el simulador envía un cambio (`?e=0:0,80:3,100:5.5,120:7`) el formulario se abre ya modificado y con la fuente “Simulación de cambio de regla (P10)”.

**Accesibilidad.** Etiqueta visible en cada campo, `aria-invalid` en los inválidos, mensajes enlazados con `aria-describedby`, región `aria-live` para validación y vista previa.

---

## P03 · Detalle de comisión con trazabilidad

**Objetivo.** Que cualquier persona autorizada entienda por qué una comisión dio el resultado que dio.

**Estructura.** Encabezado (nombre, tienda, estado) → resumen (total, venta comisionable, cumplimiento, tasa, corrida y reglas) → barra de cumplimiento con la frase de D-01 → cascada de reglas junto al historial → tabla de ventas.

**Niveles de detalle por rol**

| Rol | Ve | Puede |
|---|---|---|
| Analista | Todo | Preparar ajuste si hay una devolución sin ajuste; observar |
| Jefe de tienda | Su tienda | Marcar observación (período en revisión) |
| Gerente | Todo | Autorizar o limitar un tope |
| Contabilidad | Todo | Solo lectura |
| Auditoría | Todo, con aviso de solo lectura | Nada |
| Vendedor | Solo el suyo, sin corrida ni historial interno y en lenguaje de “tú” | Abrir disputa desde P11 |

**Comportamiento**

- Cada cifra de la cascada y del resumen es un botón (`.explicable`) que abre un panel lateral con la fórmula, los valores de esa cifra y su regla. `Esc` o “Cerrar” lo cierra y devuelve el foco al número.
- “Agrupar por categoría” reordena la tabla con subtotales. La columna de fecha y la de monto se ordenan.
- Las ventas excluidas (R-006) y las devueltas se muestran atenuadas, con su motivo, y no suman al total.
- Si hay una devolución posterior a la corrida, aparecen dos pestañas: “Como se pagó” y “Recalculado con lo que sabemos hoy”, y un aviso con enlace al ajuste.

**Estados.** Con datos; período sin calcular (“Todavía no se calcula”); vendedor sin meta (“Bloqueada: falta meta”, sin cascada); observada; sobre el tope (pendiente o decidido); ajustada; cargando; error.

**Casos borde.** Una venta con descuento de exactamente 25 % no se excluye (la regla es “mayor a 25 %”). Un vendedor que cambió de tienda muestra la tienda asignada al cierre y sus ventas por tienda de registro.

---

## P09 · Ajuste retroactivo

**Objetivo.** Que cualquiera entienda, sin texto adicional del caso, por qué la reversión de Marta es de Q3,780 y no de Q600.

**Estructura.** Resumen (monto, origen, aplicación, estado) → **antes y después de enero** con la misma versión de reglas → **por qué son Q3,780 y no Q600** (barra apilada de Q600 y Q3,180 con su leyenda y la frase explicativa) → **aplicación en marzo** (medidor del límite del 50 %, tabla y saldo) → autorización (línea de estados del ajuste).

**Comportamiento**

| Rol | Acciones |
|---|---|
| Analista | “Enviar a autorización” si supera Q1,000, o “Autorizar y aplicar” si no |
| Gerente | “Autorizar ajuste” (con resumen del impacto) o “Devolver al Analista” (comentario obligatorio) |
| Auditoría | Solo lectura |

**Secuencia (“Ver la secuencia”).** Siete pasos con reproducción automática de 2.6 s por paso (unos 18 s), pausa, anterior, siguiente y salto directo por punto. Cada paso revela su bloque y lo enmarca; los demás se atenúan. Con `prefers-reduced-motion` no hay reproducción automática. `?secuencia=1` la inicia al abrir.

1. Enero, como se pagó. 2. Se devuelve V-0142. 3. El cumplimiento baja de 105 % a 97 %. 4. Cruza el 100 %: la tasa pasa de 5 % a 3 %. 5. Q600 por la venta, Q3,180 por el escalón. 6. En marzo se descuenta hasta el 50 %. 7. Neto de Q2,600 y saldo de Q1,180 para abril.

**Reglas de cálculo**

- Se recalcula el período de origen con el conjunto de reglas **de ese período** (D-07), con las ventas conocidas a la fecha del ajuste.
- Componentes: valor de las ventas que salen o entran (a la tasa de antes o de después) y efecto del cambio de escalón. Suman exactamente la diferencia de comisión; el cambio de bono va aparte.
- Aplicación: descuento máximo = 50 % de la comisión del período de aplicación; el resto es saldo pendiente para el período siguiente. Un ajuste a favor no tiene límite.

**Estados.** Borrador, pendiente de autorización, devuelto, autorizado, aplicado; período de aplicación sin calcular (“se aplicará con su corrida”); ajuste que nace de una disputa (sin la separación Q600/Q3,180 si no hay cambio de escalón); sin secuencia disponible; cargando; error.

**Casos borde.** Si el ajuste deja saldo, la tarjeta del vendedor en P11 lo anuncia. Si la comisión del período de aplicación fuera cero, el descuento es cero y todo pasa a saldo.
