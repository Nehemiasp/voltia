# Voltia: documento maestro del caso de estudio

Sistema de gestión de comisiones para una cadena de retail ficticia.
Versión 1.0, octubre de 2026.

Este documento contiene todo lo necesario para hacer el caso de principio a fin: el negocio ficticio, el modelo de reglas, los datos de ejemplo, las pantallas, las decisiones de diseño, el plan por fases, la dirección visual, la estructura del caso en el portafolio e instrucciones listas para trabajar con IA.

---

## 0. Cómo usar este documento

- **Es la fuente de verdad.** Si una pantalla, un número o un texto contradice este documento, se corrige la pantalla o se actualiza el documento, nunca se dejan los dos distintos.
- **Para trabajar con IA:** colócalo en la raíz del proyecto (como `CLAUDE.md` o `AGENTS.md`) o pégalo al inicio de la conversación. La sección 14 trae instrucciones listas por fase.
- **Se trabaja por fases.** Cada fase termina en algo publicable. No hace falta terminar todo para subir el caso.

### Reglas del caso

1. **Todo es ficticio.** Voltia, sus tiendas, personas, cifras y documentos no existen. El caso se presenta como *proyecto conceptual*.
2. **No se usa nada de trabajos con restricción.** Ningún componente, flujo, texto ni captura de proyectos de clientes o empleadores. Todo se diseña desde cero.
3. **Ninguna empresa real** se menciona como inspiración, cliente o competidor.
4. **Los números cuadran.** Cada cifra que aparece en una pantalla sale de los datos de la sección 4 y se puede recalcular.
5. **Idioma:** español en la interfaz y en el caso. Moneda: quetzales (Q). Si el caso se adapta a lectores internacionales, el cambio a USD es un reemplazo global y no altera la lógica.

---

## 1. Qué debe demostrar el caso

Voltia existe para cubrir algo que los demás proyectos del portafolio no muestran: **diseño de sistemas con reglas, estados, roles y consecuencias en el tiempo**. Un lector debe salir convencido de que puedes diseñar herramientas internas complejas, no solo pantallas atractivas.

### Lo que el lector debe ver

| Capacidad | Dónde se demuestra |
|---|---|
| Modelar un dominio antes de dibujar | Modelo de reglas, entidades y estados (secciones 3 y 5) |
| Hacer configurable lo complejo | Constructor de reglas (P02) |
| Explicar un resultado sin intermediarios | Detalle con trazabilidad (P03) |
| Diseñar para varios roles con permisos distintos | Matriz de permisos y vistas por rol (3.6, P05 a P07, P11) |
| Resolver estados y acciones irreversibles | Ciclo del período y aprobación (P04 a P07) |
| Manejar excepciones retroactivas | Escenario de Marta y ajuste (sección 5, P09) |
| Anticipar el impacto de un cambio | Simulador (P10) |
| Pensar en sistema y entregar a desarrollo | Design system, specs y handoff (fase 4) |
| Criterio | Registro de decisiones con lo descartado (sección 8) |

### Criterio de éxito

- En los primeros 30 segundos de lectura se entiende el problema y para quién es.
- La pantalla del ajuste de Marta explica por qué la reversión es de Q3,780 y no de Q600, **sin texto adicional del caso**.
- Cada decisión importante muestra al menos una alternativa descartada y el motivo.

---

## 2. El negocio ficticio

**Voltia** es una cadena de electrodomésticos y electrónica con 14 tiendas y unos 180 vendedores de piso. Las comisiones se calculan cada mes.

### El problema actual

- Las comisiones viven en una hoja de cálculo que mantiene una sola persona de Compensaciones.
- Cuando un vendedor reclama, nadie puede explicar su número sin abrir la hoja y rastrear fórmulas a mano.
- Cambiar una regla (por ejemplo, el porcentaje de un escalón) requiere pedir ayuda a Sistemas y nadie sabe cuánto costará el cambio antes de aplicarlo.
- Las devoluciones de meses anteriores se corrigen "a ojo", sin dejar rastro de qué se ajustó ni por qué.
- No hay historial: si una regla cambió en febrero, no se puede saber con qué versión se calculó enero.

### Objetivos del sistema

1. Compensaciones configura reglas sin depender de Sistemas.
2. Cualquier persona autorizada entiende por qué una comisión dio el resultado que dio.
3. El ciclo mensual (calcular, revisar, aprobar, pagar) tiene responsables y estados claros.
4. Las correcciones posteriores al pago quedan registradas y explicadas.
5. Antes de cambiar una regla, se puede ver su impacto en dinero y en personas.

### Actores

| Rol | Qué hace en el sistema | Qué le preocupa |
|---|---|---|
| **Analista de Compensaciones** | Crea y versiona reglas, ejecuta cálculos, prepara ajustes y analiza disputas. No aprueba pagos. | Equivocarse en una regla y que afecte a 180 personas. |
| **Jefe de tienda** | Revisa los resultados de su tienda y marca observaciones. | Que su equipo cobre bien y a tiempo. |
| **Gerente Comercial** | Aprueba el período. Única figura que autoriza excepciones (topes, ajustes grandes). | Costo total y riesgo de aprobar algo mal. |
| **Contabilidad** | Recibe el período aprobado, exporta y lo marca como pagado. | Que lo aprobado cuadre con lo que se paga. |
| **Auditoría** | Solo consulta. Necesita el rastro completo. | Poder reconstruir cualquier número meses después. |
| **Vendedor** | Consulta su propio detalle y abre disputas. | Entender cuánto va a ganar y por qué. |

Cada rol ve la misma información con distinto nivel de detalle y de permiso. Resolver esa tensión visualmente es parte central del caso.

---

## 3. Modelo de dominio

### 3.1 Entidades

| Entidad | Campos | Notas |
|---|---|---|
| **Tienda** | `id, nombre, meta_mensual, jefe` | |
| **Vendedor** | `id, nombre, tienda, fecha_ingreso, estado` | |
| **Venta** | `id, fecha, tienda, vendedor, producto, categoría, monto_bruto, descuento_%, monto_neto, estado (vigente / devuelta), fecha_devolución` | Una venta pertenece a una sola categoría. |
| **Meta** | `vendedor, período, monto_objetivo, cargada_por, fecha_carga` | Se fija al inicio del mes. |
| **Regla** | Ver anatomía en 3.2 | Nunca se borra; se versiona. |
| **Período** | `id (AAAA-MM), estado, fecha_cierre_ventas, aprobado_por, pagado_por` | Estados en 3.5. |
| **Corrida de cálculo** | `id, período, fecha_ejecución, ejecutada_por, versión_del_conjunto_de_reglas, duración, resultado` | Congela las reglas vigentes. Es lo que permite recalcular y comparar. |
| **Resultado de comisión** | `vendedor, período, corrida, estado, cumplimiento_%, desglose_por_regla[], total` | Una línea por vendedor por período. |
| **Ajuste** | `id, resultado_afectado, motivo, monto, período_origen, período_aplicación, saldo_pendiente, preparado_por, autorizado_por` | Corrige períodos pagados sin reabrirlos. |
| **Disputa** | `id, vendedor, período, venta(s), motivo, estado, respuesta, resuelta_por` | Ver estados en 3.5. |
| **Evento de auditoría** | `fecha, usuario, rol, acción, entidad, valor_anterior, valor_nuevo, comentario` | Todo cambio genera uno. |

### 3.2 Anatomía de una regla

| Campo | Para qué sirve |
|---|---|
| `id` / `nombre` | Identificación legible (R-001, "Comisión base escalonada"). |
| `tipo` | escalonada, multiplicador, bono, reversión, tope o exclusión. |
| `alcance` | A quién aplica: todos, una tienda, una categoría de vendedor. |
| `condición` | Cuándo se dispara. |
| `base_de_cálculo` | Sobre qué monto opera: venta neta, venta bruta o comisión ya calculada. |
| `cálculo` | La fórmula o la tabla de escalones. |
| `prioridad` | Orden de aplicación cuando varias reglas coinciden. |
| `acumulable` | Si convive con otras reglas o las reemplaza. |
| `vigencia_desde` / `vigencia_hasta` | Rango de fechas en que la regla es válida. |
| `versión` | Número incremental. Las versiones anteriores se conservan. |
| `responsable` | Persona a cargo de la regla. |
| `fuente` | Documento o acuerdo que la origina (acta, política, instrucción de gerencia). |
| `estado` | borrador, vigente, suspendida o vencida. |

`fuente` y `versión` parecen campos menores, pero sostienen todo el caso: sin ellos no hay auditoría posible.

### 3.3 Catálogo de reglas

**R-006 · Exclusión por descuento.** Tipo: exclusión. Prioridad: 0.
Las ventas con descuento mayor a 25 % no generan comisión ni suman a la meta. Se evalúan antes que todo. La venta sigue visible en el detalle con su motivo de exclusión: ocultarla es lo que genera reclamos.

**R-001 · Comisión base escalonada.** Tipo: escalonada. Base: venta neta del período. Prioridad: 1.

| Cumplimiento de meta | Comisión |
|---|---|
| Menos de 80 % | 0 % |
| 80 % a 99.99 % | 3 % |
| 100 % a 119.99 % | 5 % |
| 120 % o más | 7 % |

El porcentaje del escalón alcanzado se aplica sobre **todo** lo vendido, no solo sobre el excedente. Es una decisión de negocio deliberada y debe ser evidente en la interfaz, porque es la que más confunde a los vendedores.

**R-002 · Multiplicador por categoría.** Tipo: multiplicador. Base: comisión calculada por R-001, venta por venta. Prioridad: 2.

| Categoría | Factor |
|---|---|
| Línea blanca | 1.0 |
| Electrónica | 1.2 |
| Accesorios | 0.6 |
| Garantía extendida | 2.0 |

**R-005 · Tope individual.** Tipo: tope. Prioridad: 3.
Ninguna comisión individual puede superar Q15,000 en un período sin autorización de Gerencia Comercial. No se bloquea: se marca y se escala.

**R-003 · Bono de equipo.** Tipo: bono. Base: monto fijo. Prioridad: 4.
Si la tienda alcanza el 100 % de su meta, cada vendedor con al menos 80 % de cumplimiento individual recibe Q500. Depende de un resultado agregado, por eso se calcula en una segunda pasada.

**R-004 · Reversión por devolución.** Tipo: reversión. Prioridad: 5.
Si se devuelve una venta, se recalcula el período original **con las reglas vigentes en ese período**, no con las actuales. La diferencia se aplica como ajuste en el período abierto más cercano.

**Orden de aplicación:** R-006 → R-001 → R-002 → R-005 → R-003 → R-004.

### 3.4 Fórmula de una comisión

```
Para cada vendedor y período:
  ventas_comisionables = ventas vigentes del período que no excluye R-006
  cumplimiento = suma(monto_neto de ventas_comisionables) / meta
  tasa = escalón de R-001 según cumplimiento
  comisión_por_venta = monto_neto × tasa × factor de categoría (R-002)
  comisión = suma(comisión_por_venta)
  si comisión > Q15,000 → marcar "requiere autorización" (R-005)
  + Q500 si la tienda ≥ 100 % y el vendedor ≥ 80 % (R-003)
  + ajustes aplicados al período (R-004 y otros)
```

### 3.5 Estados

**Período**

```
Abierto → Cerrado a ventas → Calculado → En revisión → Aprobado → Pagado
                                  ↑            │
                                  └─ Recalculado ┘ (si hay observaciones)
```

- **Abierto:** entran ventas y devoluciones.
- **Cerrado a ventas:** ya no entran ventas con esa fecha; las tardías se tratan como ajustes.
- **Calculado:** la corrida terminó; nadie lo ha revisado.
- **En revisión:** los jefes de tienda revisan.
- **Aprobado:** Gerencia Comercial autorizó el período completo.
- **Pagado:** Contabilidad lo cerró. Ya no se modifica; solo se corrige con ajustes en períodos posteriores.

**Resultado de comisión (por vendedor)**

```
Calculada → En revisión → Aprobada → Pagada → Ajustada
                ↓
            Observada → (recálculo) → En revisión
```

- **Observada** bloquea la aprobación de ese vendedor, no la del resto de la tienda.
- **Pagada → Ajustada** es la transición más importante: un período pagado no se reabre; se corrige en el siguiente con un ajuste que apunta al período de origen.

**Regla:** Borrador → Vigente → Suspendida / Vencida. Editar una regla vigente crea una nueva versión en borrador.

**Disputa:** Abierta → En análisis → Resuelta a favor / Rechazada. Si se resuelve a favor, genera un ajuste.

### 3.6 Matriz de permisos

| Acción | Analista | Jefe de tienda | Gerente | Contabilidad | Auditoría | Vendedor |
|---|---|---|---|---|---|---|
| Crear y editar reglas | Sí | No | No | No | No | No |
| Activar una versión de regla | Sí, con aprobación del Gerente | No | Aprueba | No | No | No |
| Ejecutar corrida | Sí | No | No | No | No | No |
| Ver resultados de todas las tiendas | Sí | Solo su tienda | Sí | Sí | Sí | Solo el suyo |
| Marcar observaciones | Sí | Sí, su tienda | Sí | No | No | No |
| Aprobar período | No | No | Sí | No | No | No |
| Autorizar excepciones (tope) | No | No | Sí | No | No | No |
| Preparar ajustes | Sí | No | No | No | No | No |
| Autorizar ajustes mayores a Q1,000 | No | No | Sí | No | No | No |
| Exportar y marcar pagado | No | No | No | Sí | No | No |
| Abrir disputa | No | No | No | No | No | Sí |
| Resolver disputa | Sí | Opina | Aprueba si genera ajuste | No | No | No |
| Ver historial de auditoría | Sí | Su tienda | Sí | Sí | Sí, completo | No |

---

## 4. Datos de ejemplo

Todas las pantallas usan estos datos. Si hace falta más volumen (tablas de 180 vendedores), se generan siguiendo las mismas reglas y sin contradecir estos casos.

### 4.1 Tiendas (muestra)

| ID | Tienda | Meta enero | Vendido enero | Cumplimiento |
|---|---|---|---|---|
| T01 | Plaza Norte | Q1,600,000 | Q1,712,000 | 107.0 % |
| T02 | Paseo Central | Q1,450,000 | Q1,318,000 | 90.9 % |
| T03 | Galerías del Sur | Q1,800,000 | Q1,890,000 | 105.0 % |
| T04 | Centro Comercial Oriente | Q1,200,000 | Q1,236,000 | 103.0 % |

Los nombres de tiendas son genéricos y no corresponden a lugares reales.

### 4.2 Vendedores clave

| Vendedor | Tienda | Para qué sirve en el caso |
|---|---|---|
| **Marta Ruiz** | T03 | Escenario de la devolución (sección 5). |
| **Luis Ortega** | T01 | Supera el tope: requiere autorización (P06). |
| **Ana Morales** | T02 | Tiene una venta excluida por descuento (P03). |
| **Jorge Castillo** | T02 | Abre una disputa (P08). |
| **Sofía Ramírez** | T04 | Vendedora nueva sin meta cargada: corrida con alerta (P04). |
| **Diego Herrera** | T01 → T04 | Cambia de tienda a mitad de mes (caso borde). |

### 4.3 Marta Ruiz, enero

Meta de enero: **Q150,000**.

| Venta | Fecha | Producto | Categoría | Monto neto | Nota |
|---|---|---|---|---|---|
| V-0142 | 14 ene | Refrigeradora RF-480 | Línea blanca | Q12,000 | Devuelta el 9 de marzo |
| V-0151 | 15 ene | Lavadora LV-20 | Línea blanca | Q9,500 | |
| V-0163 | 17 ene | Lavadora LV-20 | Línea blanca | Q9,500 | |
| V-0170 | 18 ene | Estufa EG-6 | Línea blanca | Q7,800 | |
| V-0188 | 21 ene | Refrigeradora RF-360 | Línea blanca | Q10,400 | |
| V-0196 | 22 ene | Secadora SC-18 | Línea blanca | Q8,900 | |
| V-0204 | 24 ene | Lavavajillas LJ-12 | Línea blanca | Q11,200 | |
| V-0219 | 26 ene | Refrigeradora RF-480 | Línea blanca | Q12,000 | |
| V-0231 | 29 ene | Estufa EG-4 | Línea blanca | Q8,700 | |
| V-0136 | 12 ene | Televisor 65" TV-65Q | Electrónica | Q14,500 | |
| V-0158 | 16 ene | Televisor 55" TV-55U | Electrónica | Q9,800 | |
| V-0174 | 19 ene | Barra de sonido BS-3 | Electrónica | Q4,200 | |
| V-0192 | 22 ene | Laptop LT-14 | Electrónica | Q11,300 | |
| V-0210 | 25 ene | Televisor 50" TV-50U | Electrónica | Q7,600 | |
| V-0227 | 28 ene | Consola de videojuegos CV-1 | Electrónica | Q2,600 | |
| V-0139 | 13 ene | Soporte de pared | Accesorios | Q1,800 | |
| V-0167 | 17 ene | Kit de instalación | Accesorios | Q2,400 | |
| V-0185 | 20 ene | Regulador de voltaje | Accesorios | Q3,100 | |
| V-0199 | 23 ene | Cables y adaptadores | Accesorios | Q1,200 | |
| V-0224 | 27 ene | Protector de pantalla | Accesorios | Q1,500 | |
| V-0137 | 12 ene | Garantía extendida 3 años | Garantía extendida | Q2,500 | |
| V-0159 | 16 ene | Garantía extendida 3 años | Garantía extendida | Q2,500 | |
| V-0211 | 25 ene | Garantía extendida 3 años | Garantía extendida | Q2,500 | |
| V-0180 | 20 ene | Lavadora LV-16 | Línea blanca | Q6,300 | Excluida: descuento de 30 % (R-006) |

Totales comisionables: línea blanca Q90,000, electrónica Q50,000, accesorios Q10,000, garantía extendida Q7,500. **Total Q157,500.**

### 4.4 Luis Ortega, enero (caso del tope)

Meta Q200,000. Vendido Q260,000 (130 %, escalón de 7 %): electrónica Q180,000, línea blanca Q60,000, accesorios Q20,000.

| Categoría | Cálculo | Comisión |
|---|---|---|
| Electrónica | 180,000 × 7 % × 1.2 | Q15,120 |
| Línea blanca | 60,000 × 7 % × 1.0 | Q4,200 |
| Accesorios | 20,000 × 7 % × 0.6 | Q840 |
| **Total** | | **Q20,160** |

Supera el tope de Q15,000 por Q5,160: el resultado queda marcado como **Requiere autorización** y aparece en la pantalla de aprobación del Gerente.

---

## 5. El escenario que ordena todo el caso

### 5.1 La historia

Marta vendió una refrigeradora de Q12,000 en enero. Cerró el mes en 105 % de su meta, así que su tasa fue de 5 %. Esa venta, sola, le generó Q600.

En marzo, el cliente devuelve la refrigeradora.

Al quitar esos Q12,000, el cumplimiento de enero baja de 105 % a 97 %. Marta ya no estaba en el escalón de 5 % sino en el de 3 %, y ese escalón se aplica a **todo** lo que vendió en enero. La reversión no es de Q600: es de **Q3,780**.

### 5.2 Los números

**Enero, cálculo original (corrida del 2 de febrero, reglas v14)**

Cumplimiento: Q157,500 / Q150,000 = **105 %** → tasa 5 %.

| Categoría | Venta | Cálculo | Comisión |
|---|---|---|---|
| Línea blanca | Q90,000 | × 5 % × 1.0 | Q4,500 |
| Electrónica | Q50,000 | × 5 % × 1.2 | Q3,000 |
| Accesorios | Q10,000 | × 5 % × 0.6 | Q300 |
| Garantía extendida | Q7,500 | × 5 % × 2.0 | Q750 |
| **Comisión** | | | **Q8,550** |
| Bono de equipo (T03 al 105 %) | | | Q500 |
| **Total pagado en enero** | | | **Q9,050** |

**Enero, recalculado tras la devolución (mismas reglas v14)**

Cumplimiento: Q145,500 / Q150,000 = **97 %** → tasa 3 %.

| Categoría | Venta | Cálculo | Comisión |
|---|---|---|---|
| Línea blanca | Q78,000 | × 3 % × 1.0 | Q2,340 |
| Electrónica | Q50,000 | × 3 % × 1.2 | Q1,800 |
| Accesorios | Q10,000 | × 3 % × 0.6 | Q180 |
| Garantía extendida | Q7,500 | × 3 % × 2.0 | Q450 |
| **Comisión** | | | **Q4,770** |
| Bono de equipo (T03 baja a 104.3 %, sigue sobre 100 %; Marta sigue sobre 80 %) | | | Q500 |
| **Total que correspondía** | | | **Q5,270** |

**Diferencia: Q9,050 − Q5,270 = Q3,780.**

De esa diferencia, Q600 corresponden a la venta devuelta (lo que cualquiera esperaría) y **Q3,180** al cambio de escalón sobre el resto de sus ventas. Esa segunda cifra es la que el vendedor no entiende y la que la interfaz tiene que hacer obvia.

**Marzo: cómo se aplica el ajuste**

La comisión calculada de Marta en marzo es Q5,200. Por la decisión D-05 (sección 8), un ajuste negativo descuenta como máximo el 50 % de la comisión del período:

| Concepto | Monto |
|---|---|
| Comisión de marzo | Q5,200 |
| Ajuste por devolución V-0142 (origen: enero) | −Q2,600 |
| **Neto a pagar en marzo** | **Q2,600** |
| Saldo pendiente para abril | Q1,180 |

Como el ajuste supera Q1,000, requiere autorización del Gerente Comercial.

### 5.3 Lo que este escenario obliga a resolver

- Recálculo retroactivo con las reglas de enero, no las de marzo.
- Comparación antes y después de un período ya pagado.
- Un ajuste en marzo que explica un cambio en enero.
- La separación entre "lo que vale la venta devuelta" y "lo que cambió por el escalón".
- Un saldo que se arrastra a otro mes.
- Una cifra que el vendedor va a disputar y que alguien tiene que poder defender.

---

## 6. Casos borde

| Caso | Decisión | Fase |
|---|---|---|
| Vendedor sin meta cargada (Sofía) | La corrida no le asigna 0 %: queda **Bloqueada: falta meta** y aparece como alerta antes de pasar a revisión. | 2 |
| Regla editada mientras una corrida está en proceso | La corrida usa una copia congelada del conjunto de reglas. La edición crea una versión en borrador que no afecta la corrida. | 2 |
| Venta registrada con fecha de un período ya pagado | Entra como ajuste en el período abierto, con el mismo mecanismo que una devolución. | 3 |
| Dos reglas con la misma prioridad que se contradicen | El constructor detecta el conflicto al intentar activar y muestra ambas reglas lado a lado. No se puede activar hasta resolverlo. | 1 |
| Vendedor que cambia de tienda a mitad de mes (Diego) | Cada venta cuenta para la tienda donde se registró. El bono de equipo se evalúa con la tienda asignada al cierre del período. Se documenta como simplificación deliberada. | Fuera de alcance, va en el registro de decisiones |
| Ajuste negativo mayor a la comisión del período | Se descuenta hasta el 50 % y el resto pasa como saldo pendiente (D-05). | 3 |
| Vendedor que renuncia con saldo pendiente | Se envía a Contabilidad como liquidación. Se menciona, no se diseña. | Fuera de alcance |
| Cambio retroactivo de una regla (corregir un error de configuración) | Nunca modifica períodos pagados: se crea una versión nueva con vigencia futura y, si hace falta, ajustes explícitos. | 3 |

---

## 7. Pantallas

Escritorio a 1440 px para los roles internos. Vista móvil para el vendedor.

### Mapa por rol

```
Analista de Compensaciones
├── Reglas ............ P01 lista · P02 constructor · P10 simulador
├── Períodos .......... P04 corrida · P03 detalle
├── Ajustes ........... P09
└── Disputas .......... P08

Jefe de tienda
├── Mi tienda ......... P05 revisión
└── Detalle ........... P03 (solo su tienda)

Gerente Comercial
├── Aprobación ........ P06
├── Ajustes y excepciones por autorizar
└── Detalle ........... P03

Contabilidad
└── Pagos ............. P07

Auditoría
└── Historial ......... P12 (y P03 en solo lectura)

Vendedor (móvil)
└── Mi comisión ....... P11 · disputa P08
```

### Fase 1: las pantallas ancla

**P01 · Lista de reglas**
- Usuario: Analista.
- Contenido: tabla con ID, nombre, tipo, prioridad, vigencia, versión, estado, responsable y última modificación. Filtros por estado y tipo.
- Detalle importante: el orden de aplicación visible (R-006 → R-004), no solo una lista alfabética.
- Estados: lista con reglas, filtro sin resultados, borrador pendiente de aprobación.

**P02 · Constructor de reglas** (editando R-001)
- Usuario: Analista.
- Secciones: identificación, alcance, condición, cálculo (editor de escalones), prioridad y acumulación, vigencia, fuente y responsable.
- **Frase de lectura en vivo:** mientras se configura, la regla se describe en lenguaje natural. Ejemplo: "Si el cumplimiento está entre 100 % y 119.99 %, paga 5 % sobre toda la venta neta del período".
- **Vista previa con un vendedor real:** elegir a Marta y ver qué resultado daría con la versión en edición frente a la vigente.
- Validaciones: escalones con huecos o superpuestos, conflicto de prioridad, vigencia que toca un período pagado.
- Guardar crea una versión en borrador; activar requiere aprobación del Gerente.
- Estados: borrador nuevo, editando versión vigente, error de validación, conflicto con otra regla, pendiente de aprobación.

**P03 · Detalle de comisión con trazabilidad** (Marta, enero)
- Usuarios: todos los roles con permiso, con distinto nivel de detalle.
- Arriba: total, estado, cumplimiento contra meta con los escalones dibujados, corrida y versión de reglas usada.
- **Cascada de reglas:** cómo se llega del total vendido a la comisión, regla por regla, en el orden de aplicación.
- Ventas línea por línea, agrupables por categoría, **incluidas las excluidas** con su motivo.
- Historial del resultado: corridas, observaciones, aprobaciones, ajustes.
- Cada número es clicable y explica de dónde sale.

### Fase 2: el ciclo operativo

**P04 · Período y corrida de cálculo**
- Usuario: Analista.
- Estado del período en una línea de tiempo (sección 3.5).
- Ejecutar corrida: confirmación con la versión de reglas que se usará, progreso y resumen.
- Resumen: total a pagar, diferencia contra el período anterior, número de vendedores por estado y alertas (Sofía sin meta, Luis sobre el tope).

**P05 · Revisión de tienda**
- Usuario: Jefe de tienda (T03).
- Tabla densa de vendedores: cumplimiento, tasa, comisión, bono, estado.
- Marcar observación sobre un vendedor, con motivo.
- Indicadores de la tienda: cumplimiento total y si gana el bono de equipo.

**P06 · Aprobación del período**
- Usuario: Gerente Comercial.
- Resumen ejecutivo: costo total, comparación con meses anteriores, distribución por tienda.
- Bandeja de lo que requiere decisión: excepciones de tope (Luis), ajustes mayores a Q1,000 (Marta en marzo), observaciones abiertas.
- Aprobar: confirmación que resume qué se está aprobando, cuánto y qué queda pendiente. Acción irreversible.

**P07 · Pagos**
- Usuario: Contabilidad.
- Período aprobado, exportación y marcado como pagado.
- Validación de que lo exportado cuadra con lo aprobado.

### Fase 3: excepciones y simulación

**P08 · Disputas**
- Vendedor (móvil): abrir una disputa desde su detalle, seleccionando las ventas en cuestión.
- Analista: bandeja de disputas, análisis con el detalle de trazabilidad al lado, respuesta y resolución.
- Caso de ejemplo: Jorge Castillo reclama una venta que no aparece; resulta registrada a otro vendedor.

**P09 · Ajuste retroactivo** (Marta)
- Usuario: Analista prepara; Gerente autoriza.
- **Antes y después de enero lado a lado**, con la misma versión de reglas.
- Separación visual de los Q3,780 en Q600 (la venta devuelta) y Q3,180 (cambio de escalón).
- Aplicación en marzo con el tope de 50 % y el saldo de Q1,180 hacia abril.
- Es la pantalla más importante del caso.

**P10 · Simulador de cambio de regla**
- Usuario: Analista, antes de activar una versión.
- Ejemplo: subir el escalón de 100 % de 5 % a 5.5 %.
- Resultado: costo adicional del período, cuántos vendedores ganan, cuánto en promedio, distribución por tienda, y vendedores cuyo resultado cambiaría de escalón.

**P11 · Mi comisión** (vendedor, móvil)
- Cuánto voy a ganar este mes si sigo así, cuánto me falta para el siguiente escalón y cuánto ganaría al alcanzarlo.
- Detalle de meses anteriores con la misma trazabilidad simplificada.
- Ajustes explicados en lenguaje simple: "Se devolvió una refrigeradora que vendiste en enero. Al bajar tu cumplimiento de ese mes, la tasa pasó de 5 % a 3 %".

**P12 · Historial de auditoría**
- Usuario: Auditoría.
- Línea de tiempo filtrable de eventos: quién, qué, cuándo, valor anterior y nuevo.
- Desde cualquier evento se llega a la entidad afectada.

### Fase 4: sistema y entrega

- Design system con los componentes de la sección 9.4.
- Especificaciones de interacción de P02, P03 y P09.
- Archivo listo para desarrollo: componentes con variantes, tokens, anotaciones y casos borde.

---

## 8. Registro de decisiones

Cada decisión se documenta con este formato. Es la sección que más pesa en el caso, porque muestra criterio.

```markdown
### D-XX · Título
- Contexto:
- Opciones consideradas:
- Elegida:
- Por qué:
- Descartadas y por qué:
- Dónde se ve en el diseño:
```

### Decisiones iniciales

**D-01 · Mostrar que el escalón se aplica sobre el total**
- Contexto: los vendedores creen que el 5 % solo aplica a lo que pasa del 100 %.
- Elegida: barra de cumplimiento con los escalones dibujados y la frase "Tu tasa de 5 % se aplica a todo lo que vendiste este mes".
- Descartada: una nota al pie con la explicación, porque nadie la lee.
- Dónde: P03, P11.

**D-02 · Un período pagado no se reabre**
- Elegida: las correcciones se hacen con ajustes en el período abierto, apuntando al período de origen.
- Descartada: reabrir enero y recalcular, porque rompe lo que Contabilidad ya pagó y lo que Auditoría ya revisó.
- Dónde: P09, estados de 3.5.

**D-03 · Las ventas excluidas se muestran**
- Elegida: aparecen en el detalle, atenuadas, con su motivo.
- Descartada: ocultarlas, que es lo que provoca reclamos de "me falta una venta".
- Dónde: P03 (Ana Morales).

**D-04 · El tope no bloquea, escala**
- Elegida: el resultado se marca y pasa a la bandeja del Gerente.
- Descartada: recortar automáticamente a Q15,000, porque esconde una decisión de negocio que le corresponde a una persona.
- Dónde: P04, P06 (Luis Ortega).

**D-05 · Ajustes negativos con límite por período**
- Elegida: descontar hasta el 50 % de la comisión del período y arrastrar el saldo.
- Descartadas: descontar todo de una vez (puede dejar al vendedor sin ingreso ese mes) y no cobrar la diferencia (premia el error).
- Dónde: P09, P11.

**D-06 · Una observación bloquea solo a ese vendedor**
- Elegida: el resto de la tienda sigue su curso.
- Descartada: bloquear la tienda completa, porque una disputa retrasaría el pago de todos.
- Dónde: P05, P06.

**D-07 · La corrida congela la versión de las reglas**
- Elegida: cada resultado guarda con qué versión se calculó.
- Descartada: recalcular siempre con las reglas actuales, porque impide explicar el pasado.
- Dónde: P03, P04, P09.

**D-08 · Cómo se configura una regla**
- Opciones: formulario estructurado con frase de lectura en vivo, editor de fórmulas libre, editor visual de nodos, lenguaje natural interpretado.
- Elegida: formulario estructurado con frase en vivo y vista previa con un vendedor real.
- Descartadas: fórmulas libres (requieren saber programar y fallan en silencio), nodos (potente pero excesivo para seis tipos de regla), lenguaje natural (ambiguo para algo que mueve dinero).
- Dónde: P02.

**D-09 · Las ventas excluidas no suman a la meta**
- Elegida: no generan comisión ni cuentan para el cumplimiento.
- Descartada: contarlas para la meta pero no para la comisión, porque permite inflar el cumplimiento con descuentos agresivos.
- Dónde: P03.

**D-10 · Activar una regla requiere dos personas**
- Elegida: el Analista prepara y el Gerente aprueba.
- Descartada: activación directa del Analista, porque un error de configuración afecta a 180 personas.
- Dónde: P02, P06.

Agrega decisiones nuevas a medida que aparezcan. Las mejores salen al diseñar: lo que se intentó, no funcionó y se cambió.

---

## 9. Dirección visual

Voltia es una herramienta interna de trabajo diario, no un sitio de marketing. La calidad se mide por lo rápido que alguien encuentra y entiende un número.

### 9.1 Principios del producto

1. **Todo número se puede explicar en un clic.**
2. **Nada se borra:** todo se versiona y deja rastro.
3. **Mostrar lo que no cuenta**, con su motivo.
4. **Las acciones irreversibles se confirman con contexto:** qué, cuánto y a quién afecta.
5. **Densidad legible:** mucha información por pantalla, ordenada por jerarquía y no por decoración.
6. **El estado siempre visible:** en qué punto del ciclo está cada cosa.

### 9.2 Identidad de Voltia

- Nombre de producto con un logotipo tipográfico simple. No necesita un símbolo elaborado: es una herramienta interna.
- La identidad se nota en la precisión y el orden, no en ilustraciones o degradados.
- No usar la identidad de Lumacode.

### 9.3 Tokens (propuesta inicial, validar contraste antes de usar)

| Token | Valor | Uso |
|---|---|---|
| `fondo` | #F5F6F8 | Fondo de la aplicación |
| `superficie` | #FFFFFF | Tablas, paneles, formularios |
| `línea` | #DCE0E6 | Bordes y separadores |
| `texto` | #161A22 | Texto principal |
| `texto-secundario` | #5B6472 | Metadatos y etiquetas |
| `acento` | #2E4FD6 | Acción principal, selección, foco |
| `positivo` | #137A55 | Aprobado, a favor |
| `aviso` | #9A5B00 | Requiere atención, pendiente |
| `negativo` | #B42318 | Error, reversión, rechazado |

- Los estados nunca dependen solo del color: siempre van con texto.
- Tipografía: una sans con **números tabulares** y buena distinción entre 0/O y 1/l/I (por ejemplo, IBM Plex Sans o Source Sans 3). Montos alineados a la derecha. Los identificadores (R-001, V-0142) pueden ir en una monoespaciada porque son datos técnicos.
- Escala compacta: cuerpo de 14 px en tablas, 16 px en formularios y textos explicativos.
- Retícula de 8 px; radios pequeños y consistentes (4 px en controles, 8 px en paneles).
- Sin sombras salvo en menús, paneles laterales y modales.

### 9.4 Componentes del sistema

- Tabla de datos densa: orden, filtros, selección, columnas fijas, totales, filas expandibles.
- Chip de estado con sus variantes (período, resultado, regla, disputa).
- Editor de escalones con validación de huecos y superposiciones.
- Barra de cumplimiento con escalones marcados.
- Cascada de reglas (de venta total a comisión).
- Comparador antes y después.
- Línea de tiempo de eventos y de estados del período.
- Panel lateral de detalle.
- Diálogo de confirmación para acciones irreversibles con resumen de impacto.
- Bandeja de pendientes por autorizar.
- Frase de lectura de una regla.
- Estados vacíos, de carga y de error para cada vista principal.

---

## 10. Estructura del caso en el portafolio

Formato visual, con más imágenes que texto. Cada bloque de texto tiene como máximo tres o cuatro líneas.

1. **Portada:** título ("Voltia: comisiones que se pueden explicar"), frase de una línea, rol (Diseño UX/UI, proyecto conceptual), duración, herramientas, imagen principal de P03 o P09.
2. **El problema**, en tres frases y una imagen: la hoja de cálculo, el reclamo, nadie puede explicar el número.
3. **Quiénes lo usan:** los seis roles con lo que le preocupa a cada uno.
4. **El modelo antes que las pantallas:** diagrama de reglas, orden de aplicación y estados. Muestra que se pensó antes de dibujar.
5. **Decisión 1: configurar reglas sin programar** (D-08 y D-10). Constructor con la frase en vivo.
6. **Decisión 2: explicar cualquier número** (D-01, D-03, D-07). Detalle con trazabilidad.
7. **El ciclo del mes:** de la corrida al pago, con estados y roles.
8. **El caso de Marta:** animación o secuencia de P09. Es el momento central del caso.
9. **Antes de cambiar una regla:** el simulador.
10. **Lo que ve el vendedor:** pantallas móviles.
11. **Sistema:** componentes, tokens y cómo se entrega a desarrollo.
12. **Lo que dejé fuera a propósito:** casos borde fuera de alcance y por qué.
13. **Qué haría después:** validar con usuarios reales, medir tiempo de resolución de reclamos.

Agrega al inicio o al final: *"Proyecto conceptual. Voltia, sus datos y sus personas son ficticios."*

---

## 11. Plan por fases

Ritmo de referencia: 6 a 8 horas por semana.

| Fase | Contenido | Duración estimada | Se puede publicar |
|---|---|---|---|
| 1 · Fundación | Modelo (este documento), P01, P02, P03, decisiones D-01 a D-08 | 3 semanas | Sí: caso corto con constructor y trazabilidad |
| 2 · Ciclo operativo | P04 a P07, estados y permisos | 2 semanas | Sí: el caso pasa a mostrar un producto completo |
| 3 · Excepciones | P08 a P12, escenario de Marta, simulador, móvil | 3 semanas | Sí: versión fuerte del caso |
| 4 · Sistema | Componentes, tokens, specs, handoff | 2 semanas | Sí: versión final |

### Entregables por fase

**Fase 1**
- [ ] Wireframes de P01, P02 y P03.
- [ ] Alta fidelidad de P02 y P03 con los datos de Marta (antes de la devolución).
- [ ] Diagrama del modelo de reglas y de estados.
- [ ] Primeras ocho decisiones escritas.
- [ ] Primera versión del caso publicada.

**Fase 2**
- [ ] P04 a P07 en alta fidelidad.
- [ ] Prototipo navegable del ciclo: corrida, revisión, aprobación, pago.
- [ ] Matriz de permisos aplicada a las vistas.

**Fase 3**
- [ ] P08 a P12.
- [ ] Secuencia animada del ajuste de Marta.
- [ ] Simulador con el ejemplo del escalón de 5.5 %.
- [ ] Vistas móviles del vendedor.

**Fase 4**
- [ ] Librería de componentes con variantes y estados.
- [ ] Tokens documentados.
- [ ] Specs de interacción de P02, P03 y P09.
- [ ] Caso de estudio final.

---

## 12. Archivos y formatos

### Archivo de Figma

```
00 Portada
01 Modelo y flujos (diagramas, estados, mapa por rol)
02 Wireframes
03 Pantallas: Fase 1
04 Pantallas: Fase 2
05 Pantallas: Fase 3
06 Design system (tokens, componentes)
07 Specs y handoff
08 Imágenes para el portafolio
```

### Imágenes para el caso

- Ancho de exportación: 1600 px a 2x.
- Las pantallas se muestran completas o en recortes que se entiendan solos, siempre con datos reales del documento (nunca lorem ipsum).
- La secuencia de Marta, como GIF o video corto de 10 a 20 segundos, sin audio.
- Fondo neutro coherente para todas las imágenes del caso.

### Prototipo

- Figma para fases 1 y 2.
- Opcional en fase 3: prototipo en código del detalle y el ajuste, con los números calculados de verdad a partir de la sección 4.

---

## 13. Checklist de calidad

**Contenido**
- [ ] Todos los números salen de la sección 4 y cuadran.
- [ ] Nombres de personas, tiendas y productos consistentes en todas las pantallas.
- [ ] No hay lorem ipsum ni textos genéricos.
- [ ] El aviso de proyecto conceptual está presente.
- [ ] No aparece nada de trabajos con restricción ni empresas reales.

**Diseño**
- [ ] Cada pantalla tiene sus estados: vacío, carga, error y los propios del flujo.
- [ ] Montos con números tabulares y alineados a la derecha.
- [ ] Estados con texto, no solo color. Contraste AA.
- [ ] Las acciones irreversibles tienen confirmación con resumen de impacto.
- [ ] Los permisos se reflejan: cada rol ve solo lo que le corresponde.

**Caso**
- [ ] El problema se entiende en 30 segundos.
- [ ] El escenario de Marta se entiende sin leer el texto.
- [ ] Cada decisión importante tiene su alternativa descartada.
- [ ] Más imágenes que texto.
- [ ] Dice qué se dejó fuera y qué se haría después.

---

## 14. Instrucciones para trabajar con IA

Pega estas instrucciones junto con este documento. La IA propone y ejecuta; tú revisas.

**Regla general para cualquier tarea**

> Lee el documento maestro de Voltia completo. Usa solo los datos de la sección 4 y respeta las reglas, estados y permisos de la sección 3. No inventes reglas, campos ni cifras. Si algo no está definido, propón una opción, márcala como supuesto y agrégala al registro de decisiones con su alternativa descartada. Al terminar, di qué hiciste, qué supusiste y qué quedó pendiente.

**Fase 1, wireframes**

> Diseña los wireframes de P01, P02 y P03 según la sección 7. En P02 edita R-001 y muestra la frase de lectura en vivo y la vista previa con Marta Ruiz. En P03 muestra a Marta en enero antes de la devolución: Q157,500 vendidos, 105 %, tasa 5 %, comisión Q8,550, bono Q500. Incluye la venta excluida V-0180. Para cada pantalla, lista sus estados.

**Fase 1, alta fidelidad**

> Aplica los tokens y principios de la sección 9 a P02 y P03. Prioriza la legibilidad de los números y la cascada de reglas. Revisa contraste AA y muestra las variantes de estado de cada componente usado.

**Fase 2**

> Diseña P04 a P07. Usa la matriz de permisos de 3.6 para decidir qué ve cada rol. Incluye a Sofía Ramírez sin meta (alerta en P04) y a Luis Ortega sobre el tope (bandeja del Gerente en P06). La aprobación del período es irreversible: diseña la confirmación con el resumen de impacto.

**Fase 3, el ajuste de Marta**

> Diseña P09 con los números exactos de la sección 5.2. El objetivo es que cualquiera entienda, sin texto adicional, por qué la reversión es de Q3,780: Q600 por la venta devuelta y Q3,180 por el cambio de escalón de 5 % a 3 % sobre el resto de sus ventas. Muestra la aplicación en marzo con el límite de 50 % y el saldo de Q1,180 hacia abril.

**Fase 4**

> A partir de las pantallas existentes, extrae los componentes de la sección 9.4 con todas sus variantes y estados, documenta los tokens y escribe las specs de interacción de P02, P03 y P09 para desarrollo.

**Caso de estudio**

> Redacta el caso siguiendo la sección 10. Máximo cuatro líneas por bloque de texto. Usa las decisiones de la sección 8 con sus descartes. Tono claro y concreto, sin frases de relleno. Indica qué imagen va en cada bloque.

---

## 15. Glosario

| Término | Significado |
|---|---|
| **Meta** | Monto de venta que se espera de un vendedor en un período. |
| **Cumplimiento** | Venta comisionable del período dividida entre la meta. |
| **Escalón** | Rango de cumplimiento que define la tasa de comisión. |
| **Tasa** | Porcentaje de comisión según el escalón alcanzado. |
| **Factor de categoría** | Multiplicador que ajusta la comisión según el tipo de producto. |
| **Venta comisionable** | Venta vigente que no fue excluida por R-006. |
| **Corrida** | Ejecución del cálculo de un período con una versión fija de las reglas. |
| **Versión de reglas** | Conjunto de reglas vigentes congelado en un momento dado. |
| **Ajuste** | Corrección aplicada en un período abierto que se refiere a un período anterior. |
| **Saldo pendiente** | Parte de un ajuste negativo que se descuenta en períodos siguientes. |
| **Observación** | Marca de revisión que detiene la aprobación de un vendedor. |
| **Disputa** | Reclamo formal de un vendedor sobre su resultado. |
| **Trazabilidad** | Posibilidad de explicar un número paso a paso hasta su origen. |
