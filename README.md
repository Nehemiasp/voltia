# Voltia: comisiones que se pueden explicar

> Proyecto conceptual. Voltia, sus tiendas, sus personas y sus cifras son ficticios.

Voltia es un sistema de gestión de comisiones para una cadena de retail con 14 tiendas y unos 180 vendedores. Cubre reglas configurables sin programar, cálculo con trazabilidad, ciclo mensual con responsables, ajustes retroactivos explicados y simulación antes de cambiar una regla.

La pieza central es el **ajuste de Marta**: una devolución de Q12,000 que le generó Q600 revierte **Q3,780**, porque al bajar de 105 % a 97 % de su meta cambió de escalón y la nueva tasa se aplica a todo lo demás que vendió. El sistema lo calcula, no lo cuenta.

## Probarlo

```
npm install        # solo para las pruebas con Chromium
npm start          # http://localhost:5173
```

HTML, CSS y JavaScript con módulos ES, sin dependencias en tiempo de ejecución. Necesita un servidor estático (los módulos no cargan desde `file://`).

Se abre en **Inicio**: el estado del mes, lo que requiere atención, las tiendas, la comisión por mes y la actividad reciente. La fecha de trabajo es el 3 de abril de 2026: enero y febrero están pagados y marzo está en revisión.

Cada rol ve solo lo que le corresponde. Para cambiar de usuario, abre el menú de la esquina superior derecha.

| Sección | Qué hace | Quién la usa |
|---|---|---|
| Inicio | Estado del período, siguiente paso, indicadores y pendientes | Todos |
| Reglas y Simulador | Reglas en orden de aplicación, constructor con frase de lectura en vivo, simulador de impacto | Analista (el Gerente consulta y aprueba activaciones) |
| Período | Corrida, revisión por tienda, aprobación irreversible y pago | Analista, Jefe de tienda, Gerente, Contabilidad |
| Detalle de comisión | Cascada de reglas, ventas con su motivo de exclusión y cada cifra explicable | Todos, según permisos |
| Correcciones | Ajustes retroactivos (el de Marta) y disputas | Analista, Gerente, Jefe de tienda |
| Historial | Quién cambió qué, cuándo, con valor anterior y nuevo | Auditoría y demás roles |

## Qué hay en el repositorio

| Carpeta | Contenido |
|---|---|
| `src/engine/` | Reglas R-001 a R-006, datos de ejemplo, generación determinista de ventas y motor de cálculo |
| `src/app/` | Aplicación: estado, permisos por rol, acciones, selectores y vistas |
| `test/` | 23 pruebas que reproducen las cifras de las secciones 4 y 5 del documento maestro |
| `docs/` | [Documento maestro](docs/VOLTIA-CASO-COMPLETO.md), [decisiones](docs/decisiones.md), [modelo](docs/modelo.md), [especificaciones de interacción](docs/specs-interaccion.md), [sistema de diseño](docs/sistema.md) y [reporte de entrega](docs/ENTREGA.md) |
| `caso/`, `portafolio/` | Página del caso de estudio con imágenes y video. Se hicieron con una versión anterior de la interfaz y no se regeneran |

## Que las cifras cuadran

`npm test` verifica, entre otras, estas cifras del caso:

- Enero de Marta: 105 %, tasa 5 %, comisión Q8,550, bono Q500, total Q9,050.
- Recalculado tras la devolución con las mismas reglas v14: 97 %, tasa 3 %, comisión Q4,770, total Q5,270. Diferencia: Q3,780, de los cuales Q600 son la venta y Q3,180 el cambio de escalón.
- Marzo: comisión de Q5,200, descuento máximo de Q2,600 (50 %) y saldo de Q1,180 para abril.
- Luis Ortega: comisión de Q20,160 sobre un tope de Q15,000 (exceso de Q5,160).
- Las cuatro tiendas de la muestra suman exactamente sus ventas de enero (Q1,712,000, Q1,318,000, Q1,890,000, Q1,236,000).

## Qué es de verdad y qué es de muestra

El motor de cálculo es real y probado. Los **datos** son de muestra: 4 de las 14 tiendas y 47 vendedores, con ventas generadas de forma determinista para que los totales coincidan con la sección 4 del documento maestro. Lo que no está en el documento se marca como supuesto en [`docs/decisiones.md`](docs/decisiones.md). No hay servidor, base de datos ni autenticación: el estado vive en el navegador (`localStorage`, opcional) y se restablece desde el menú de usuario.

## Créditos

Tipografías IBM Plex Sans e IBM Plex Mono (SIL Open Font License 1.1, [licencia](fonts/LICENSE-IBM-Plex.txt)), autoalojadas. Íconos Lucide (licencia ISC, [licencia](assets/LICENSE-lucide.txt)).
