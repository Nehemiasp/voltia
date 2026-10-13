# Entrega

Reporte siguiendo el formato del estándar Lumacode (sección 14) y el plan por fases del documento maestro (sección 11).

## Ficha del proyecto

- **Cliente / marca:** Voltia (marca ficticia). Proyecto conceptual de portafolio.
- **Qué hace, en una frase:** sistema de gestión de comisiones de una cadena de retail ficticia.
- **Para quién:** seis roles internos y la fuerza de ventas; el lector del caso busca ver diseño de sistemas, no solo pantallas.
- **Trabajo principal:** explicar cualquier comisión y gobernar el ciclo mensual y sus correcciones.
- **Pantallas incluidas:** Inicio, Reglas (lista y constructor), Simulador, Período (corrida, tiendas, aprobación, pagos), Detalle de comisión, Correcciones (ajustes y disputas) e Historial. La página del caso quedó de una versión anterior.
- **Fuera de alcance:** servidor, base de datos, autenticación, las 14 tiendas completas, liquidación por renuncia, archivos de Figma.
- **Contenido disponible:** documento maestro (datos, reglas, pantallas).
- **Contenido faltante (marcadores):** `[Duración del proyecto]` en la portada del caso; dominio real en `canonical`, `sitemap.xml` y `robots.txt` (hoy `voltia.example`).
- **Identidad existente:** tokens de la sección 9.3 del documento maestro. No se usa la identidad de Lumacode.
- **Tono de voz:** neutro e institucional para roles internos; “tú” para el vendedor.
- **Idioma:** español. Moneda: quetzales.
- **Restricciones técnicas:** sin dependencias de ejecución; módulos ES; servidor estático.

## Qué se hizo

- **Motor de cálculo** (`src/engine/`): reglas R-001 a R-006 con versiones y conjuntos congelados por corrida, segunda pasada del bono de equipo, recálculo retroactivo con las reglas del período de origen, ajustes con límite de 50 %. **23 pruebas** reproducen las cifras de las secciones 4 y 5.
- **Aplicación** (`src/app/`): pantallas con sus estados de vacío, carga y error, cinco roles con la matriz de permisos aplicada, una fecha de trabajo fija (3 de abril de 2026), un inicio con el estado del mes y acciones reales (corrida, observaciones, decisiones, aprobación, exportación a CSV, pago, ajustes, disputas, versionado de reglas) con rastro de auditoría.
- **Sistema de diseño** (fase 4): tokens, tipografía, 12 componentes con variantes, documento de especificaciones de P02, P03 y P09.
- **Documentación de diseño:** 23 decisiones con alternativa descartada, modelo con diagramas, texto del caso.
- **Caso de estudio** maquetado, 19 imágenes (1600 px a 2x) y el video de la secuencia de Marta.
- **Herramientas de verificación:** `npm test` (23), `npm run e2e` (6 recorridos), `npm run revision` (4 anchos × 20 pantallas), `npm run lint`.

## Fases del documento maestro

| Fase | Entregable | Estado |
|---|---|---|
| 1 · Fundación | Modelo, P01, P02, P03, decisiones D-01 a D-08 | Hecho en código; wireframes sin hacer (ver “Qué falta”) |
| 2 · Ciclo operativo | P04 a P07, estados y permisos | Hecho; prototipo navegable del ciclo completo |
| 3 · Excepciones | P08 a P12, escenario de Marta, simulador, móvil | Hecho; secuencia animada en video y en P09 |
| 4 · Sistema | Componentes, tokens, specs y handoff | Hecho en `src/app/ui.js`, `src/styles/` y `docs/` |

## Qué no se tocó

Nada: el repositorio estaba vacío. El documento maestro y el estándar Lumacode se copiaron sin cambios a `docs/`.

## Decisiones tomadas y por qué

1. **Prototipo en código en lugar de Figma** (D-23): la conexión con Figma falló al empezar y el caso gira en torno a cifras que se calculan y cambian con cada acción.
2. **Datos generados de forma determinista** (D-11): dan la densidad que piden las pantallas y las pruebas obligan a que los totales por tienda sean los de la sección 4.1.
3. **Una corrida congela reglas y metas** (D-07, D-14): una corrida que cambia sola no se puede auditar.
4. **El tope no bloquea, escala** (D-04, D-15): hasta que se decide solo se compromete hasta el tope.
5. **Meta de marzo de Marta en Q100,000** (D-22): es la única forma realista de que su comisión sea exactamente Q5,200.

## Supuestos que debe confirmar quien revise el caso

- Nombres del Gerente Comercial, Contabilidad, Auditoría, jefes de tienda y de los 41 vendedores de relleno.
- Que el bono de equipo no cuenta para el tope (D-16) y que el Analista autoriza ajustes hasta Q1,000 (D-17).
- Que el vendedor ve su resultado cuando está aprobado (D-21).
- Que la vigencia de una regla no puede tocar un período con corrida (D-18).
- Luis Ortega vuelve a superar el tope en marzo (Q20,501.60) para que la bandeja del Gerente conviva con el ajuste de Marta (D-13). Es un dato generado, no de la sección 4.

## Textos propuestos que se deben validar

Todo el texto de la interfaz y del caso lo escribió la IA a partir del documento maestro. Conviene validar con una persona de Compensaciones los términos “corrida”, “escalón” y “observación”, y los mensajes de error y de bloqueo.

## Imágenes

No hay fotos. Ver [`IMAGENES.md`](../IMAGENES.md).

## Checklist de calidad (sección 13 del documento maestro)

**Contenido**
- [x] Todos los números salen de la sección 4 y cuadran (pruebas automáticas).
- [x] Nombres de personas, tiendas y productos consistentes.
- [x] Sin lorem ipsum ni textos genéricos.
- [x] Aviso de proyecto conceptual presente en la barra superior, la portada y el pie del caso.
- [x] Nada de trabajos con restricción ni empresas reales.

**Diseño**
- [x] Cada pantalla tiene estados de vacío, carga y error en el código (`estadoVista`, `esqueleto`) y los propios del flujo.
- [x] Montos con números tabulares, alineados a la derecha.
- [x] Estados con texto e ícono; contraste AA de los tokens calculado.
- [x] Acciones irreversibles con confirmación y resumen de impacto.
- [x] Permisos reflejados (probado en `npm run e2e`).

**Caso**
- [x] El problema se entiende en tres frases y una imagen.
- [x] El escenario de Marta se entiende sin leer el texto (P09 y video).
- [x] Cada decisión importante tiene su alternativa descartada.
- [x] Más imágenes que texto.
- [x] Dice qué se dejó fuera y qué se haría después.

## Checklist del estándar Lumacode (sección 15), con sus excepciones

- [x] Hace lo que se pidió y nada que no se pidió. Los extras (README, `CLAUDE.md`, herramientas de prueba) son de ingeniería, no de producto.
- [x] No hay datos inventados presentados como reales: todo es ficticio y está rotulado así.
- [x] Tokens de tipografía, espaciado y color; ningún hex suelto en componentes.
- [x] Estados interactivos: normal, hover, foco visible, presionado, deshabilitado (con motivo visible), cargando.
- [x] Revisado en 360, 768, 1024 y 1440 px, sin scroll horizontal (`npm run revision`).
- [x] Un solo `h1`, `lang="es"`, `alt` en las imágenes, controles con nombre, `prefers-reduced-motion` respetado.
- [x] `title`, descripción, Open Graph, favicon, 404, `robots.txt` y `sitemap.xml`.
- [x] Consola limpia en todos los recorridos.
- [ ] **LCP, INP y CLS no se midieron con Lighthouse** (no hay Lighthouse en el entorno). Las imágenes del caso declaran ancho y alto y se cargan con `loading="lazy"`; la imagen principal usa `fetchpriority="high"`.
- [ ] **No se hizo una prueba manual con lector de pantalla** ni un recorrido completo solo con teclado. Hay HTML semántico, foco visible, diálogos nativos y regiones `aria-live`, pero no una auditoría formal.
- [ ] La verificación de contraste cubre los tokens y sus pares; no se ejecutó una herramienta como axe sobre cada pantalla.

## Marcadores pendientes

`[Duración del proyecto]` (portada del caso) y el dominio `voltia.example` en `canonical`, `sitemap.xml`, `robots.txt`.

## Cómo probarlo

```
npm install && npm start      # http://localhost:5173
npm test                      # 23 pruebas del motor
npm run e2e                   # recorridos con Chromium (con el servidor en marcha)
npm run revision              # revisión de anchos, h1, alt y consola
```

Recorrido sugerido: **Inicio** → cambiar a Gerente Comercial desde el menú de usuario → autorizar el tope y el ajuste de Marta → aprobar marzo → cambiar a Contabilidad → exportar y pagar.

## Qué falta del documento maestro

- **Archivos de Figma** (sección 12) y **wireframes** de la fase 1: la conexión con Figma falló. Puede generarse un archivo con las pantallas desde este prototipo si se reconecta.
- Una **medición de rendimiento** y una **auditoría de accesibilidad** formales (ver arriba).

## Sugerencias fuera de alcance (no construidas)

- Probar el constructor de reglas con alguien que nunca vio el modelo.
- Una vista de comparación de dos corridas de un mismo período.
- Exportar el historial de auditoría por rango de fechas desde el servidor, con firma del archivo.


## Cambios posteriores a la entrega

- Se quitó la barra de demostración (momentos de la historia, estado de la vista, restablecer), el recorrido de la demo, la pantalla del sistema de diseño y la vista del vendedor. La fecha de trabajo quedó fija en el 3 de abril de 2026 y los roles son cinco.
- Nuevo **Inicio** por rol. Las pantallas del ciclo se agrupan en pestañas (Período, Correcciones) y la navegación pasó de 16 entradas a entre 3 y 6 por rol.
- Se corrigió el espaciado de los `select` y de la búsqueda con ícono.
- Se quitaron los scripts que regeneraban capturas, video y caso (dependían de lo anterior).
