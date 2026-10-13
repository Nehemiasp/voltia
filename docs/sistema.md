# Sistema de diseño

La referencia viva está en la pantalla **Sistema de diseño** del prototipo (`#/sistema`), que dibuja cada componente con las mismas funciones y clases que usan las pantallas. Este documento resume lo esencial.

## Principios

1. Todo número se puede explicar en un clic.
2. Nada se borra: todo se versiona y deja rastro.
3. Mostrar lo que no cuenta, con su motivo.
4. Las acciones irreversibles se confirman con contexto: qué, cuánto y a quién afecta.
5. Densidad legible: mucha información por pantalla, ordenada por jerarquía y no por decoración.
6. El estado siempre visible.

## Tokens

Definidos en `src/styles/tokens.css`. Los pares de texto sobre fondo superan AA (4.5:1); los bordes de controles superan 3:1.

| Token | Valor | Uso | Contraste |
|---|---|---|---|
| `--fondo` | `#F5F6F8` | Fondo de la aplicación | texto 16.1:1 |
| `--superficie` | `#FFFFFF` | Tablas, paneles, formularios | texto 17.4:1 |
| `--linea` | `#DCE0E6` | Separadores decorativos | solo decorativo |
| `--borde-control` | `#7C8696` | Bordes de campos y botones | 3.7:1 sobre superficie |
| `--texto` | `#161A22` | Texto principal | |
| `--texto-secundario` | `#5B6472` | Metadatos y etiquetas | 6.0:1 sobre superficie, 5.5:1 sobre fondo |
| `--acento` | `#2E4FD6` | Acción principal, selección, foco | 6.6:1 (texto blanco sobre acento: 6.6:1) |
| `--positivo` | `#137A55` | Aprobado, a favor | 5.3:1 sobre superficie |
| `--aviso` | `#9A5B00` | Requiere atención, pendiente | 5.4:1 sobre superficie |
| `--negativo` | `#B42318` | Error, reversión, rechazado | 6.6:1 sobre superficie |

Fondos de estado añadidos al validar contraste (el documento los dejaba por definir): `--acento-fondo #E8EDFC` (5.6:1 con acento), `--positivo-fondo #E3F3EC` (4.6:1), `--aviso-fondo #FBF0DC` (4.8:1), `--negativo-fondo #FBE9E7` (5.6:1), `--neutro-fondo #ECEEF2` (5.2:1 con texto secundario).

**Tipografía.** IBM Plex Sans (400, 500, 600) con números tabulares; IBM Plex Mono (400, 500) solo para identificadores como R-001 o V-0142. Escala: 12, 14 (tablas), 16 (formularios y texto explicativo), 20, 24, 32 px. Montos alineados a la derecha. Autoalojadas en `fonts/` con `font-display: swap`.

**Retícula.** 4, 8, 12, 16, 24, 32, 48 y 64 px. Radios de 4 px en controles y 8 px en paneles. Sombra solo en menús, panel lateral y diálogos.

**Movimiento.** 150–250 ms con salida suave; la única secuencia orquestada es la de P09, y respeta `prefers-reduced-motion`.

## Componentes (sección 9.4)

| Componente | Variantes y estados | Dónde |
|---|---|---|
| Tabla de datos densa | orden, filas atenuadas, resaltadas, de aviso, totales, columna fija, filas agrupadas | P01, P03, P05, P07, P12 |
| Chip de estado | período (6), resultado (7), regla (5), disputa (4), ajuste (5); siempre con ícono y texto | todas |
| Editor de escalones | normal, con hueco, con superposición, solo lectura | P02, P10 |
| Barra de cumplimiento con escalones | escalón actual enmarcado, marcador, marcador “antes” | P03, P09, P11 |
| Cascada de reglas | inicio, resta, subtotal, dato, suma, alerta, total; cifras explicables | P03, P08 |
| Comparador antes y después | fila de cambio, de total, de subtotal, marca de cambio de escalón | P02, P09, P10 |
| Línea de tiempo | de estados del período y del ajuste; de eventos con valor anterior y nuevo | P04, P09, P12 |
| Panel lateral de detalle | cerrado, abierto; cierra con `Esc` y devuelve el foco | P03 |
| Diálogo de confirmación | con resumen de impacto, con campo, con casilla “no se puede deshacer” | P04, P06, P07, P09 |
| Bandeja de pendientes | tope, ajuste, observación, regla | P06 |
| Frase de lectura | una frase por escalón | P02 |
| Estados vacío, cargando y error | cada pantalla, desde el control “Vista” | todas |

Además: botones (principal, secundario, discreto, destructivo, con ícono, deshabilitado con motivo visible, cargando), avisos (información, atención, error, listo), avisos temporales, medidor del límite, barra apilada y pestañas.

## Iconos

Un solo set: Lucide (licencia ISC), en `assets/iconos.svg`, generado con `tools/sprite-iconos.mjs`. Nunca emojis.
