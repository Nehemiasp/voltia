# Registro de decisiones

Cada decisión muestra qué se eligió, qué se descartó y dónde se ve en el diseño. Las diez primeras vienen del documento maestro (sección 8). De D-11 en adelante salieron al construir el prototipo: lo que se intentó, no alcanzó y se cambió.

Los supuestos están marcados como **(supuesto)**. Ninguno contradice una cifra de las secciones 4 y 5 del documento maestro.

---

## Decisiones del documento maestro

### D-01 · Mostrar que el escalón se aplica sobre el total
- **Contexto:** los vendedores creen que el 5 % solo aplica a lo que pasa del 100 %.
- **Opciones consideradas:** nota al pie con la explicación; tabla de escalones; barra de cumplimiento con los escalones dibujados y una frase.
- **Elegida:** barra de cumplimiento con los escalones dibujados y la frase “Tu tasa de 5 % se aplica a todo lo que vendiste este mes”.
- **Por qué:** el malentendido ocurre justo al mirar el número; la explicación tiene que estar donde se mira.
- **Descartada:** una nota al pie, porque nadie la lee.
- **Dónde se ve:** P03 (frase destacada bajo la barra), P11 (“Si sigues así”), P09 (la barra con el marcador de antes y de después).

### D-02 · Un período pagado no se reabre
- **Contexto:** una devolución llega dos meses después de pagar enero.
- **Opciones consideradas:** reabrir enero y recalcular; ajustar en el período abierto apuntando al de origen.
- **Elegida:** las correcciones se hacen con ajustes en el período abierto, y el ajuste apunta al período de origen.
- **Por qué:** lo que Contabilidad pagó y lo que Auditoría revisó no cambia nunca.
- **Descartada:** reabrir enero, porque rompe lo ya pagado y lo ya revisado.
- **Dónde se ve:** P09 (“Pagado: no se reabre”), P03 (aviso con enlace al ajuste), estados del período en P04.

### D-03 · Las ventas excluidas se muestran
- **Elegida:** aparecen en el detalle, atenuadas y tachadas, con su motivo (“Descuento de 30 % (máximo 25 %). No genera comisión ni suma a la meta (R-006)”).
- **Descartada:** ocultarlas, que es lo que provoca reclamos de “me falta una venta”.
- **Dónde se ve:** P03 con V-0180 de Marta y V-0323 de Ana Morales; el panel “Mostrar lo que no cuenta” del sistema.

### D-04 · El tope no bloquea, escala
- **Elegida:** la comisión se marca y pasa a la bandeja del Gerente, que autoriza o limita.
- **Descartada:** recortar automáticamente a Q15,000, porque esconde una decisión de negocio que le corresponde a una persona.
- **Dónde se ve:** P04 (alerta), P06 (bandeja con “Autorizar excepción” y “Limitar al tope”), P03 (cascada con la fila R-005).

### D-05 · Ajustes negativos con límite por período
- **Elegida:** descontar hasta el 50 % de la comisión del período y arrastrar el saldo.
- **Descartadas:** descontar todo de una vez (puede dejar al vendedor sin ingreso ese mes) y no cobrar la diferencia (premia el error).
- **Dónde se ve:** P09 (medidor con el límite y saldo de Q1,180 hacia abril), P11 (“Para no dejarte sin ingreso…”).

### D-06 · Una observación bloquea solo a ese vendedor
- **Elegida:** el resto de la tienda sigue su curso; el período no se puede aprobar mientras haya observaciones abiertas, pero cada una se resuelve por separado.
- **Descartada:** bloquear la tienda completa, porque una disputa retrasaría el pago de todos.
- **Dónde se ve:** P05 (fila “Observada” resaltada, el resto normal), P06 (bloqueo con el nombre de la persona).

### D-07 · La corrida congela la versión de las reglas
- **Elegida:** cada corrida guarda con qué conjunto de reglas se calculó (v13, v14…) y con qué metas. Los ajustes retroactivos recalculan con **las reglas de ese período**, no con las actuales.
- **Descartada:** recalcular siempre con las reglas actuales, porque impide explicar el pasado.
- **Dónde se ve:** P04 (“Reglas con las que se calcula” y tabla de corridas), P03 (corrida y reglas en el encabezado), P09 (“mismas reglas v14”). Una prueba automática verifica que usar otras reglas cambia la cifra.

### D-08 · Cómo se configura una regla
- **Opciones:** formulario estructurado con frase de lectura en vivo, editor de fórmulas libre, editor visual de nodos, lenguaje natural interpretado.
- **Elegida:** formulario estructurado con frase en vivo y vista previa con un vendedor real.
- **Descartadas:** fórmulas libres (requieren saber programar y fallan en silencio), nodos (potente pero excesivo para seis tipos de regla), lenguaje natural (ambiguo para algo que mueve dinero).
- **Dónde se ve:** P02.

### D-09 · Las ventas excluidas no suman a la meta
- **Elegida:** no generan comisión ni cuentan para el cumplimiento.
- **Descartada:** contarlas para la meta pero no para la comisión, porque permite inflar el cumplimiento con descuentos agresivos.
- **Dónde se ve:** P03 (cumplimiento calculado sobre la venta comisionable), explicación del número “Cumplimiento”.

### D-10 · Activar una regla requiere dos personas
- **Elegida:** el Analista prepara y el Gerente aprueba.
- **Descartada:** activación directa del Analista, porque un error de configuración afecta a 180 personas.
- **Dónde se ve:** P02 (“Solicitar activación”), P06 (“Activación de R-002 v3” en la bandeja), P01 (“Borrador · pendiente de aprobación”).

---

## Decisiones que salieron al construir

### D-11 · Qué datos se inventan y cuáles no
- **Contexto:** la sección 4 define cuatro tiendas, seis personas y dos casos completos. Las pantallas necesitan tablas de 12 vendedores por tienda, períodos distintos de enero y jefes de tienda.
- **Opciones:** dejar tablas con pocos datos; generar volumen sin control; generar volumen de forma determinista y verificada.
- **Elegida:** 47 vendedores en 4 tiendas, con ventas generadas por una función determinista (mismas entradas, mismas ventas) y pruebas que obligan a que los totales por tienda sean exactamente los de la sección 4.1 (Q1,712,000, Q1,318,000, Q1,890,000 y Q1,236,000). Los nombres de jefes de tienda, Gerente, Contabilidad y Auditoría son ficticios **(supuesto)**.
- **Descartadas:** tablas con 5 filas (no se ve la densidad que pide el caso) y datos aleatorios (no se pueden defender ni recalcular).
- **Dónde se ve:** P05, P04, P06, P10. El motor y las pruebas están en `src/engine/` y `test/`.

### D-12 · Diego Herrera: cada venta cuenta para la tienda donde se registró
- **Contexto:** Diego cambia de T01 a T04 el 15 de enero.
- **Elegida:** Q58,000 de sus ventas cuentan para Plaza Norte y Q71,000 para Centro Comercial Oriente. Su cumplimiento individual suma las dos partes (Q129,000 sobre Q130,000: 99.2 %, escalón de 3 %). El bono de equipo se evalúa con la tienda asignada al cierre. Es una simplificación deliberada.
- **Descartada:** repartir el bono proporcionalmente entre las dos tiendas, que exigiría reglas que el modelo no tiene.
- **Dónde se ve:** pruebas del motor (`Diego Herrera: cada venta cuenta…`); P05 de T04.

### D-13 · La bandeja del Gerente junta los pendientes de todos los períodos
- **Contexto:** el documento pide que P06 muestre el tope de Luis (caso de enero) y el ajuste de Marta (caso de marzo).
- **Opciones:** una pantalla por período; una bandeja única que lista todo lo pendiente con su período.
- **Elegida:** bandeja única, cada elemento etiquetado con su período. En el momento de abril conviven el tope de Luis en marzo (Q20,501.60 **(supuesto de datos)**; los Q20,160 son los de enero), el ajuste de Marta, una observación abierta y la activación de R-002 v3.
- **Descartada:** una bandeja por período, porque el Gerente tendría que recordar dónde mirar.
- **Dónde se ve:** P06.

### D-14 · La corrida congela también las metas; una meta tardía exige otra corrida
- **Contexto:** Sofía Ramírez no tiene meta. Si el sistema le asigna 0 %, la penaliza por un olvido administrativo.
- **Elegida:** queda “Bloqueada: falta meta”. Cuando el Analista carga la meta, la corrida ya ejecutada **no cambia**: hay que ejecutar otra. Mientras haya bloqueados, no se puede enviar a revisión.
- **Descartada:** recalcular en silencio al cargar la meta, porque una corrida que cambia sola no se puede auditar.
- **Dónde se ve:** P04 (alerta, “Cargar meta”, aviso de meta posterior a la corrida), P03 (Sofía bloqueada).

### D-15 · Mientras el tope no se decide, solo se compromete hasta el tope
- **Contexto:** D-04 dice que el tope escala; falta decir cuánto se paga si nadie decide.
- **Elegida:** el total a pagar incluye hasta Q15,000 de la comisión y muestra aparte lo que espera autorización. Si el Gerente limita, esa parte nunca se paga; si autoriza, se paga completa.
- **Descartada:** contar todo como pagable, porque el costo del período quedaría inflado por algo que nadie aprobó.
- **Dónde se ve:** P04, P05 (“Q5,160 esperan autorización”), P06, P07 (columna “Retenido”).

### D-16 · El bono de equipo no cuenta para el tope
- **Contexto:** el orden de aplicación pone R-005 antes que R-003.
- **Elegida:** el tope se evalúa sobre la comisión (Q20,160 en el caso de Luis); el bono de Q500 se suma después.
- **Descartada:** sumar el bono antes de evaluar el tope, que contradice el orden de la sección 3.3.
- **Dónde se ve:** cascada de P03.

### D-17 · Los ajustes hasta Q1,000 los autoriza el Analista; los mayores, el Gerente
- **Contexto:** la matriz de permisos dice “Autorizar ajustes mayores a Q1,000: Gerente”.
- **Elegida:** al enviar un ajuste, si no supera Q1,000 queda autorizado por quien lo prepara; si lo supera, pasa a la bandeja del Gerente. El Gerente también puede devolverlo con un comentario.
- **Descartada:** que todo ajuste pase por el Gerente, que lo saturaría con correcciones de centavos.
- **Dónde se ve:** P09 (botón “Enviar a autorización” o “Autorizar y aplicar”), línea de estados del ajuste.

### D-18 · La vigencia de una regla nunca toca un período con corrida
- **Elegida:** el constructor rechaza una vigencia que empiece antes de hoy o dentro de un período cerrado a ventas, calculado o pagado, y dice cuál es la primera fecha válida. Es la validación “vigencia que toca un período pagado” de la sección 7 llevada un paso más allá, porque una corrida ya ejecutada tiene las reglas congeladas (D-07).
- **Descartada:** permitir la fecha y recalcular, que contradice D-02.
- **Dónde se ve:** P02, bloque “Vigencia”.

### D-19 · Una disputa a favor genera ajustes en borrador, no cambios directos
- **Contexto:** la venta que reclama Jorge Castillo está a nombre de Pablo Nájera. Moverla cambia el resultado de los dos.
- **Elegida:** el Analista busca la venta, el sistema recalcula a ambos con las reglas de enero y propone dos ajustes (+Q3,163.80 para Jorge, −Q285 para Pablo). Quedan en borrador y siguen el mismo camino que cualquier otro ajuste.
- **Descartada:** modificar enero, que contradice D-02, y generar solo el ajuste del reclamante, que deja a Pablo cobrando de más.
- **Dónde se ve:** P08 (búsqueda, impacto, resolución), P09.

### D-20 · El simulador no guarda nada: termina en un borrador
- **Elegida:** simula con las ventas reales de un período ya calculado y, si el cambio es sobre los escalones de R-001, “Crear borrador” abre P02 con ese cambio.
- **Descartada:** activar directamente desde el simulador, que saltaría D-10.
- **Dónde se ve:** P10.

### D-21 · El vendedor ve su resultado cuando está aprobado
- **Contexto:** mostrar un número que todavía puede cambiar genera reclamos prematuros.
- **Elegida:** mientras el período está calculado o en revisión, el vendedor ve “Estamos revisando los resultados”. Desde “Aprobado” ve el total con su explicación. Durante el mes en curso ve una estimación marcada como tal.
- **Descartada:** mostrar el cálculo provisional, porque una cifra que cambia después se siente como un error.
- **Dónde se ve:** P11.

### D-22 · La meta de Marta en marzo es de Q100,000 **(supuesto de datos)**
- **Contexto:** la sección 5.2 dice que su comisión de marzo es de Q5,200. Con la meta de Q150,000 de enero no sale de forma exacta: en el escalón de 3 % haría falta una venta ponderada de Q173,333.33 (no es un monto posible), y en el de 5 % una de Q104,000, que con Q150,000 vendidos exigiría que casi todo fueran accesorios (factor 0.6).
- **Elegida:** meta de marzo de Q100,000 y 13 ventas (Q100,700, 100.7 %) que dan exactamente Q5,200. T03 queda por debajo del 100 % en marzo, así que no hay bono de equipo y el neto de Q2,600 de la sección 5.2 se cumple.
- **Descartada:** forzar la cifra sin ventas que la respalden, que rompe el principio de “todo número se puede recalcular”.
- **Dónde se ve:** P09 (aplicación en marzo) y una prueba automática.

### D-23 · El prototipo se hizo en código, no en Figma
- **Contexto:** el documento prevé Figma para las fases 1 y 2 y deja como opcional un prototipo en código “con los números calculados de verdad”. La conexión con Figma falló al empezar la sesión (el proxy rechazó el túnel).
- **Elegida:** prototipo navegable en código con un motor de cálculo probado, más documentación de diseño en Markdown y capturas para el portafolio.
- **Descartada:** esperar a Figma, porque el caso entero gira alrededor de cifras que se calculan y que cambian con las acciones de cada rol.
- **Qué falta:** los archivos de Figma (sección 12) quedan pendientes y se pueden generar a partir de este prototipo.
