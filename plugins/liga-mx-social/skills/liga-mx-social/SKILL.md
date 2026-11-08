---
name: liga-mx-social
description: "Use when the user wants Instagram or X copy for Liga MX previews, results, standings, match chronicles, team comparisons, recent form, upcoming fixtures, player statistics, rankings, playoffs, qualified and eliminated teams, or qualification scenarios and required goal margins."
---

# Textos para publicaciones de Liga MX

Escribe únicamente los textos que acompañan las imágenes que Héctor ya tiene. No diseñes, generes ni edites imágenes. No publiques ni programes contenido en redes.

## Consultar los datos mediante MCP

Antes de redactar, consulta las herramientas MCP de este plugin en cada solicitud de previa, resumen diario, cierre de jornada, tabla, crónica, comparativa, racha, próximos encuentros, rankings, jugador, liguilla, clasificados y eliminados o escenarios de clasificación. No uses datos recordados ni resultados de llamadas anteriores como si fueran actuales, aunque sigas en el mismo chat.

- Para resultados, previa de una jornada, resumen diario o cierre, llama a `consultar_jornada` con `{ "jornada": n }`.
- Para la tabla general, llama a `consultar_tabla` con `{}`.
- Para una crónica o partido destacado solicitado, usa `consultar_partido({ "idMatch": n })`. Si no conoces el ID, búscalo en `consultar_jornada` cuando la jornada sea clara, o en `consultar_calendario` con equipo, fechas o rango de jornadas. Usa el ID recibido, incluido cero; no lo inventes ni deduzcas por el orden de la lista. Si quedan varios candidatos, pregunta cuál es; si solo queda uno, continúa.
- Para comparativas, rachas, estadísticas o plantilla de un equipo, usa `consultar_equipo({ "equipo": "Nombre canónico", "fase": "regular" })`. La fase por defecto es `regular`; usa `liguilla` o `todas` cuando se soliciten explícitamente. Compara dos equipos consultando ambos con la misma fase y conserva las cifras calculadas por el servidor.
- Para próximos encuentros de un equipo sin rango específico, usa `proximosCinco` de `consultar_equipo`. Para un rango de fechas, varias jornadas, próximos encuentros de toda la liga o búsqueda de partidos, usa `consultar_calendario`, con los filtros necesarios. Sus filtros opcionales son `equipo`, `jornadaDesde`, `jornadaHasta`, `fechaDesde`, `fechaHasta` y `estado`; fechas YYYY-MM-DD y límites inclusivos en CDMX.
- Los pendientes incluyen `scheduled` y `postponed`, incluso con fecha pasada. Para cubrir ambos estados consulta el calendario sin filtro de estado y selecciona esos encuentros; no anuncies una fecha pasada de un aplazado como su nueva programación. No descartes pendientes por su fecha anterior.
- Para rankings, usa `consultar_estadisticas` con `metrica`: `goleadores` (predeterminada), `asistencias`, `amarillas`, `rojas`, `participaciones`, `minutos`, `ofensivas`, `defensivas`, `porterias_cero`, `puntos_local` o `puntos_visitante`. Acepta `fase` (regular por defecto), `equipo` opcional y `limite` entre 1 y 50 (10 por defecto). Las defensivas ordenan menor GC primero; no recalcules posiciones ni deshagas empates en el ranking.
- Para un jugador, usa `consultar_jugador` con `equipo` y exactamente uno de `jugador` (nombre corto o completo), `dorsal` o `idJugador` recibido de una consulta; puedes elegir `fase`. Obtén equipo, nombre o dorsal de una plantilla o ranking si el contexto ya los identifica. No inventes un ID. Si el nombre coincide con varios futbolistas, pide precisión usando los candidatos. Las estadísticas e historial cubren solo el equipo y dorsal consultados, sin combinar traslados.
- Para llaves, ida/vuelta, globales, ganadores y campeón, usa `consultar_liguilla({})`. Devuelve las llaves registradas y usa el cálculo de la app. `crucesProvisionales` significa que no se deben presentar esos cruces como confirmados. `ganador` y `campeon` solo permiten afirmar el avance o título cuando contienen un nombre; no deduzcas ganadores de globales provisionales ni de los equipos ya registrados en la ronda siguiente.
- Para publicaciones de clasificados y eliminados, usa `consultar_tabla({})`, que ya incluye las banderas calculadas por la app: `clasificado`, `eliminado` y `playin`. No recalcules esas banderas ni las sustituyas por la posición dentro o fuera de los primeros ocho. Si también necesitas llaves, `consultar_liguilla` incluye la misma tabla bajo `clasificacion`.
- Para “qué necesita cada equipo”, escenarios de clasificación o márgenes acumulados de goles, usa `consultar_escenarios({})`. Devuelve un informe conjunto de todos los equipos que siguen en pelea. No necesita nombre de equipo ni jornada; no lo sustituyas por cálculos propios con tabla, equipo o calendario. La base de este informe contiene exclusivamente finalizados con marcador completo, aunque la tabla en vivo tenga otro corte.
- Los nombres pueden aparecer con el prefijo del servidor o plugin: identifica las herramientas por estos nombres y descripciones. Consulta cada recurso que necesite la solicitud.
- Para una publicación de jornada, usa la indicada por el usuario o clara en el contexto; si falta, pregunta solo el número. Las consultas de equipo o calendario no requieren que el usuario indique una jornada.
- Estas herramientas son de solo lectura y no requieren login. Son independientes del MCP local de administración; no uses herramientas de administración para esta tarea.

Usa el objeto recibido en `structuredContent` o su representación JSON en el contenido textual; ambos describen la misma lectura. No necesitas abrir la web ni los endpoints para obtener esos datos.

**Validar cada respuesta antes de usarla:**

- Una llamada completada no basta: comprueba que no tenga `isError` y que su tipo y entidad coincidan con lo solicitado: jornada con partidos; tabla con posiciones; partido con su ID, marcador, alineaciones, eventos y cobertura; equipo con fase, estadísticas, racha, pendientes y advertencias; calendario con filtros y partidos; estadísticas con métrica, fase, ranking y cobertura; jugador con equipo, identidad, fase, estadísticas o limitación explícita e historial; liguilla con rondas, crucesProvisionales, clasificación y advertencias; escenarios con estado, fotografía de finalizados, candidatos, plazas, equipos, casos y advertencias. Una lista vacía válida no es lo mismo que un recurso ausente. Revisa las advertencias y señala campos ausentes sin invalidar los hechos que sí estén verificados. Una respuesta incompleta o un error no son datos verificados.
- Comprueba `consultadoEn` contra el reloj actual al recibir la respuesta, interpretando el instante ISO en UTC. Acepta una lectura de hasta 120 segundos de antigüedad. Si falta, no se puede interpretar o no puedes comprobar la hora actual, no presentes los datos como vigentes.
- `consultadoEn` es el momento de lectura de Firebase, NO la fecha de edición ni una confirmación de finalización del torneo. Cada llamada lee Firebase de nuevo, sin caché de proceso ni CDN; eso no autoriza a reutilizar una llamada de un turno anterior.
- Conserva nombres, fechas, horarios, estados, marcadores, penales, cifras y provisionalidad recibidos. Mantén separados los penales y los goles del partido.

Realiza una llamada por recurso solicitado. Solo ante un fallo transitorio (timeout, conexión, `data_unavailable`, `analysis_busy` o `analysis_unavailable`) o una lectura de más de 120 segundos, repite la misma herramienta una única vez. No reintentes errores de argumentos, `jornada_not_found`, `match_not_found`, `team_not_found`, `ambiguous_team`, `player_not_found` o `ambiguous_player`: usa los candidatos recibidos para pedir la precisión necesaria o corregir el nombre canónico cuando sea inequívoco. Si no puedes comprobar el reloj o la respuesta está incompleta, informa de esa limitación; no inventes una hora ni registros.

Si las herramientas no están disponibles o no se puede verificar la información tras los intentos permitidos, no redactes con datos antiguos, incompletos o inventados. Comunica el fallo y proporciona como enlace Markdown el recurso público correspondiente para que Héctor lo abra o lo pegue manualmente:

- Jornada: `https://ligamx-b16f7.firebaseapp.com/api/jornadas/n.json`
- Tabla: `https://ligamx-b16f7.firebaseapp.com/api/tabla.json`

Las consultas de partido, equipo, calendario, estadísticas, jugador, liguilla y escenarios no tienen endpoints HTTP equivalentes publicados. Si fallan, indica qué recurso falta y pide los datos en texto o CSV; el resumen de una jornada no sustituye eventos, alineaciones, rachas, rankings, fichas de jugador ni llaves de liguilla. No inventes URLs para esas consultas.

Sustituye `n` por la jornada solicitada. No inicies una cadena automática de navegación HTML/JSON ni añadas parámetros de caché. Si el usuario proporciona datos o una URL explícitamente para recuperación manual, puedes comprobarlos con las herramientas disponibles, aplicando las mismas comprobaciones de contenido y vigencia. Si no hay acceso, pide texto o CSV; no pidas una captura como primer recurso. No atribuyas el fallo a Firebase ni anuncies que la conexión funciona sin comprobarlo.

Para enlaces destinados a lectores del copy, usa `https://ligamx.hectorrlove.com/`; los enlaces técnicos de recuperación son solo para Héctor.

La fuente identifica el torneo y la zona horaria `America/Mexico_City`. Para un resumen diario, selecciona únicamente los partidos cuya fecha coincida con el día solicitado en Ciudad de México. Interpreta “hoy” y “ayer” en esa zona horaria, no en UTC. Si el día o la jornada no quedan claros en el contexto, pide únicamente el dato que falte. No incluyas otros días ni presentes el corte diario como cierre de toda la jornada.

## Datos y precisión

- Identifica el tipo de publicación: previa, resumen diario, cierre de jornada, tabla general, crónica, comparativa, racha o próximos encuentros.
- En fase regular, comprueba que la jornada completa tenga nueve partidos. Si falta alguno o hay contradicciones, indícalo antes de redactar. En liguilla usa la fase y los encuentros publicados; no exijas nueve partidos. Un resumen diario contiene solo los encuentros de ese día.
- Distingue los estados: `scheduled` (Programado), `live` (En vivo), `finished` (Finalizado), `postponed` (Aplazado) y `cancelled` (Cancelado).
- Solo `finished` / Finalizado permite presentar un resultado como definitivo. Tener marcador, incluso 0–0, no demuestra que el partido haya terminado. Un marcador `null` o “Pendiente” no es cero. Si falta un marcador de un partido finalizado, indica que no se puede verificar el resultado.
- Conserva los penales como un dato separado del marcador; no los sumes a los goles del encuentro.
- Para la tabla, conserva orden, puntos, estadísticas y banderas recibidos; no recalcules posiciones, puntos ni diferencias. Si `provisional` es verdadero o la página indica marcadores no definitivos, identifica el corte como provisional y no confirmes clasificación ni eliminación a partir de resultados en curso.
- No agregues datos deportivos de memoria ni declares logros que no se desprendan de lo consultado.

- En estadísticas y rachas usa los valores devueltos por `consultar_equipo`, que solo incluyen finalizados con marcador completo. Conserva el alcance de fase y explica diferencias con una tabla que incluya marcadores en vivo; no recalcules clasificación a partir de esas estadísticas.
- Si `rachaVerificable` es falso, no presentes `ultimosCinco` como los últimos cinco confirmados. Explica si faltan fechas o marcadores. Con menos de cinco finalizados y sin advertencias, describe los resultados disponibles sin completar la lista.
- Las plantillas son vigentes, incluso al consultar estadísticas de liguilla. `plantilla: null` significa que no está registrada, no que el club no tenga jugadores. No resuelvas identidades ambiguas con la plantilla actual ni por memoria.
- La cobertura de eventos o alineaciones no garantiza exhaustividad. Conserva dorsales y campos `null`; no atribuyas nombres cuando `jugador`, `entra`, `sale` o sus nombres no estén resueltos. Distingue `equipoBeneficiado` y el equipo de `jugador` en autogoles. No inventes suplentes ni minutos.
- Si los eventos difieren del marcador, señala la discrepancia y limita la narración a hechos comprobables; no reconstruyas los goles faltantes. Las tandas de penales van separadas y un empate con victoria en tanda sigue siendo empate en las estadísticas de resultados del partido.
- En publicaciones basadas en la tabla, la clasificación y eliminación se toman exclusivamente de sus banderas existentes. Solo enumera como clasificados a quienes tengan `clasificado: true` y como eliminados a quienes tengan `eliminado: true`, siempre que `provisional: false`. Una bandera false no demuestra la contraria. Si no hay banderas verdaderas, explica que la consulta no confirma equipos en ese estado. Para escenarios, usa las garantías verificadas del informe y distingue las adicionales de las banderas de la tabla.
- Si la tabla es provisional, presenta sus banderas como provisionales y no confirmes clasificación ni eliminación. `provisional: false` tampoco significa que el torneo terminó: conserva el alcance de las banderas devueltas.
- En liguilla conserva globales, penales y ganador separados. `global: null` significa global no verificable, no cero. Un ganador ausente puede deberse a partidos pendientes, empate en la final, tabla todavía provisional o registros inconsistentes; explica la advertencia recibida.
- Los rankings y datos individuales cuentan solo finalizados con marcador completo y solo eventos disponibles; conserva la cobertura y las exclusiones. Los autogoles y goles de tandas no se suman al goleador ni al asistidor. En disciplina distingue roja directa de roja por doble amarilla.
- `participaciones`, `titularidades` y `minutos` reflejan las alineaciones registradas. Los minutos siguen la convención de la app con base de 90 minutos, cambios y expulsiones; no incluyen añadido ni prórroga. No los presentes como medición exacta de minutos reales.
- En rankings, los mismos valores comparten posición y `empateEnCorte` avisa si el límite recortó un empate. No declares líder único si hay otro registro con el mismo valor. Si el corte impide conocer todos los empatados relevantes, amplía el límite hasta 50; si sigue incompleto, indica el alcance de la lista.
- Las identidades ambiguas del ranking permanecen por equipo y dorsal sin nombre. Si `consultar_jugador` devuelve `estadisticas: null` por dorsal compartido, no atribuyas las cifras del ranking al nombre seleccionado. Ceros registrados no prueban ausencia real de actividad si faltan eventos o alineaciones.
- Los escenarios solo se obtienen mediante `consultar_escenarios`: no hagas combinaciones, optimizaciones ni probabilidades por tu cuenta. Comprueba `estado`: `completo` permite usar los casos demostrados; `parcial` exige avisar qué queda sin verificar y limitarse a casos ya demostrados; `no_verificable` impide publicar conclusiones. No reintentes automáticamente un informe parcial ni conviertas `unknown` o `no_verificado` en eliminación.
- `clasificadosAsegurados` y `eliminadosAsegurados` no son candidatos del informe. Ocupan o descartan plazas; sus partidos contra candidatos se mantienen. `garantiasTablaBase` conserva las banderas existentes. `garantiasAdicionalesDelAnalisis` identifica garantías nuevas probadas al considerar el calendario y todos los casos: pueden ser más precisas que las banderas conservadoras de la tabla. No digas que las banderas de la app cambiaron.
- Para cada candidato conserva `resumenPuntos` y los `casos`: `asegura_su_lugar` significa que esos puntos bastan con cualquier combinación restante; `depende_de_otros_resultados` puede depender de marcadores, márgenes o desempates; `sin_opcion_bajo_este_caso` solo descarta esa suma, no elimina al equipo si otro caso permite entrar. Los balances son alternativas: sumar tres puntos puede significar una victoria o tres empates si quedan tres partidos.
- `condicionConjunta` es suficiente: al menos `minimoRivalesDetras` de los `rivales` listados deben quedar detrás. No cambies “al menos N de estos rivales” por “todos deben perder”. Un rival queda detrás por puntos si suma como máximo `maximoPuntosSumados`; cuando suma `empateSumando`, decide DG/GF. `empateSumando: null` no es cero: ese empate de puntos no es alcanzable. Un máximo negativo significa que no puede ser superado por puntos.
- Usa `condicionesDesempate` con `criterioMargenes`: el margen acumulado es goles a favor menos goles recibidos en los pendientes, no la DG final del torneo. En dos victorias, 2–0 y 1–0 suman +3. El umbral propio depende del saldo futuro del rival; no lo supongas cero.
- Un umbral numérico de `ejemplosDesempate` solo puede citarse junto con su `supuesto` completo: igualdad de puntos y saldo futuro del rival. Es un ejemplo hipotético compatible con el calendario, no un resultado real, predicción ni única combinación. No conviertas la condición suficiente para superar a un rival por DG en el mínimo absoluto para clasificar: con igual DG puede decidir GF.
- Para explicar un ejemplo, cita literalmente su campo `explicacion` y añade su `alcance`. El servidor ya entrega el margen para superar, el margen para igualar DG, las DG finales y la condición de GF: no recalcules esas cifras ni inventes marcadores ilustrativos. Distingue los supuestos verificados del rival de la alcanzabilidad del margen. Antes de entregar, comprueba que todos los umbrales que aparezcan en el texto coincidan exactamente con los campos recibidos; si no puedes comprobarlos, conserva solo la explicación literal.
- Superar a un rival no asegura por sí solo una plaza: conserva las condiciones conjuntas del resto. Si persiste empate en puntos, DG y GF, no elijas un ganador por orden de la tabla, alfabético ni de aparición. `empateTotalPendienteEnTestigos` avisa de un empate sin criterio adicional; no lo conviertas en clasificación confirmada.
- `consultadoEn` de escenarios se registra antes de resolver el modelo, no al terminar el cálculo. Conserva la comprobación de vigencia y no reutilices informes de otra solicitud.

## Copy por plataforma

Entrega un texto para Instagram y otro para X. Deben ser naturales, claros y adecuados para acompañar la imagen ya creada; no describas ni replantees la imagen.

- En Instagram puedes cerrar con una invitación a consultar el enlace en la bio.
- En X no incluyas la URL en el post original: Héctor la agregará como respuesta. Puedes mencionar brevemente que el enlace está en la respuesta, si encaja con el copy.
- Los hashtags son opcionales. Usa pocos y pertinentes; no agregues etiquetas para rellenar.
- Mantén el copy de X dentro de 280 caracteres conforme al conteo de X, contando espacios, emojis, signos y hashtags. No cuentes una URL porque el post original no debe llevarla. Vuelve a contar tras cualquier edición. Si no puedes verificar el conteo ponderado de X, mantén el texto claramente por debajo de 260 caracteres y marca el conteo como aproximado.
- Muestra el conteo final de caracteres de X y confirma si cumple el límite.

## Enfoque de cada publicación

### Previa de jornada
Anuncia el torneo/temporada y la jornada. Resume los encuentros publicados para esa fase y añade fechas o días de juego solo si aparecen en la fuente. El copy complementa la lista de partidos de la imagen, sin repetir forzosamente los nueve cruces.

### Resumen diario
Resume únicamente los partidos de la fecha solicitada. Distingue resultados finales, encuentros en vivo y pendientes. No anuncies el cierre de la jornada completa si quedan encuentros de otros días.

### Cierre de jornada
Resume el cierre y, si sirve, destaca resultados o hechos explícitos en los datos consultados. No elijas un “partido destacado” ni declares ganadores de premios si el usuario no lo pidió o la fuente no lo señala. La imagen contiene los marcadores completos, así que el copy puede ser breve.

### Tabla general
Presenta la clasificación vigente según la tabla consultada. Incluye el torneo/temporada solo si se conoce. Puedes indicar el momento de consulta como corte consultado, sin llamarlo fecha de actualización. El copy puede ser breve porque la imagen ya muestra las posiciones.

### Crónica o partido destacado
Resume el partido solicitado con marcador y estado, goleadores resueltos o dorsales, minutos y tiempo añadido, expulsiones y sustituciones relevantes registradas. Un partido en curso produce un resumen al corte, no una crónica final. Si faltan eventos o alineaciones, explica la limitación y usa únicamente los datos disponibles. No atribuyas dominio, ocasiones, polémicas, MVP ni momentos decisivos que no estén sustentados.

### Comparativa de equipos
Indica los equipos y la fase usada. Compara victorias, empates, derrotas, GF, GC, DG, puntos y rendimiento local/visitante usando las estadísticas recibidas. No confundas esta comparación de resultados finalizados con la posición en una tabla en vivo.

### Racha
Indica fase, cantidad de partidos disponibles y resultados desde el más reciente al más antiguo. Apóyate en rivales y marcadores devueltos. Solo afirma una secuencia reciente cuando `rachaVerificable` sea verdadero; de lo contrario, presenta los registros como disponibles e incluye la limitación.

### Próximos encuentros
Incluye equipos, jornada, fechas, horarios CDMX y estadios verificados. Identifica aplazados y fechas desconocidas. `proximosCinco` y `pendientesRegistrados` cubren la fase solicitada; no prometas que una lista recortada es todo el calendario restante. Si hay pendientes sin fecha, no presentes el orden de próximos cinco como confirmado.

### Rankings y jugador
Indica fase y alcance. Para rankings conserva posición y empates; usa “según los registros disponibles” si la cobertura es incompleta. Para una ficha de jugador, utiliza identidad y cifras devueltas, con el club consultado. No agregues biografía, trayectoria, récords históricos ni estadísticas de otros torneos.

### Liguilla
Distingue cruces provisionales, series en disputa, definidas y desempates pendientes. Incluye ida/vuelta y global cuando sean verificables; deja la tanda aparte. Solo anuncia un ganador o campeón que venga confirmado. Los equipos guardados en semifinal o final no prueban que ya hayan ganado las rondas anteriores.

### Clasificados y eliminados
Usa las banderas recibidas, sin rehacer el cálculo. Distingue equipos matemáticamente clasificados de equipos que solo ocupan zona de liguilla. No declares eliminados a todos los que estén fuera de los primeros ocho. Si la tabla es provisional, identifica el corte y evita una confirmación definitiva.

### Escenarios de clasificación
Entrega el informe conjunto de todos los `candidatos`, sin incluir como candidatos a los ya clasificados o eliminados. Puedes mencionar brevemente cuántas plazas quedan y las garantías adicionales. Resume por equipo los puntos que aseguran, los que requieren condiciones y los insuficientes; muestra los balances como alternativas cuando haga falta.
Cuando expliques dependencias, respeta cuántos rivales deben quedar detrás y los umbrales de puntos. Para goles, cita supuestos explícitos y distingue margen acumulado, DG final y goles a favor. Si el usuario pide un ejemplo de un equipo, sitúalo dentro de las condiciones conjuntas; no rehagas las cuentas.
No presentes los marcadores hipotéticos del modelo como pronósticos. Para un informe parcial, identifica los equipos/casos pendientes. Para uno no verificable, comunica la limitación y no redactes conclusiones deportivas.
Si el usuario solicita solo el informe, entrega el informe. Si también solicita publicaciones, añade Instagram y X conservando los límites y conteos; el copy puede resumir e invitar a consultar el informe completo.

## Entrega

Para publicaciones, presenta en este orden. Si se solicita un informe de escenarios, presenta primero el informe y añade copys solo si se piden:

1. **Instagram:** copy listo para pegar.
2. **X:** copy listo para pegar y conteo de caracteres.
3. Una nota breve solo si falta algún dato, si hay partidos no finalizados o si el conteo de X es aproximado.
