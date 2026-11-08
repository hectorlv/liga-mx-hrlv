<p align="center">
  <img width="200" src="./src/assets/images/favicon.png"></img>
</p>

## Open-wc Starter App

[![Built with open-wc recommendations](https://img.shields.io/badge/built%20with-open--wc-blue.svg)](https://github.com/open-wc)

## Resumen rápido

Proyecto LitElement (starter basado en open-wc). Este repositorio contiene una pequeña PWA que muestra información de la liga —la app usa Web Components con Lit y algunas partes de Material Web Components—.

## Versiones
- 4.0.0 Clausura 2026 

## Estructura del proyecto

- **`src/app/`**: Contiene el shell de la aplicación y el entrypoint —`src/app/liga-mx-hrlv.js` es el módulo principal que se importa desde `index.html`.
- **`src/components/`**: Páginas y componentes reutilizables (p. ej. `matches-page`, `match-detail-page`, `table-page`, `playoff-page`, `team-page`, `login-page`, `my-navbar`).
- **`src/styles/`**: Estilos y tokens compartidos (`liga-mx-hrlv-styles.js`).
- **`src/utils/`**: Utilidades y servicios (firebase, calculadoras, utilidades de fecha e imagen, constants, version, etc.).
- **`src/images/`**: Imágenes y assets estáticos usados por la app.
- **`index.html`**: Entrada HTML que carga `./src/app/liga-mx-hrlv.js`.

Notas de migración:
- Las fuentes originales en la raíz de `src/` fueron reorganizadas en las carpetas anteriores. Los imports internos se actualizaron; el proyecto ya no depende de los antiguos shims en la raíz de `src/`.

## Scripts útiles

- **`pnpm start`**: Ejecuta la app en modo desarrollo con recarga en cambios.
- **`pnpm run build`**: Construye la app y genera la carpeta `dist/`.
- **`pnpm run start:build`**: Sirve la versión construida desde `dist/`.
- **`pnpm test`**: Ejecuta el test runner configurado (si hay tests).
- **`pnpm run lint`** y **`pnpm run format`**: Linter y formateador.

## Primeros tests unitarios (setup rápido)

Si quieres empezar con pruebas unitarias para utilidades en `src/utils`, estos son los pasos mínimos:

1. Instala Vitest y cobertura:

   ```bash
   pnpm i -D vitest @vitest/coverage-v8
   ```

2. Agrega scripts en `package.json`:

   ```json
   {
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

3. Crea `vitest.config.ts`:

   ```ts
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       environment: 'node',
       include: ['src/**/*.test.ts'],
     },
   });
   ```

4. Crea los primeros archivos de prueba en `src/utils`:
   - `tableCalculator.test.ts`
   - `dateUtils.test.ts`

5. Ejecuta validación local:

   ```bash
   pnpm run lint
   pnpm run typecheck
   pnpm test
   ```

Sugerencia: inicia con funciones puras (tabla/fechas) para obtener cobertura útil sin depender de DOM o Firebase.

Ejemplos de uso en macOS / `zsh`:

```bash
# Desarrollo
pnpm start

# Build para producción
pnpm run build

# Servir la build localmente (usa start:build)
pnpm run start:build
```

## Notas sobre la reorganización

- Se movieron módulos a `src/app`, `src/components`, `src/styles` y `src/utils` para mejorar la claridad del proyecto.
- `index.html` ha sido actualizado para importar `./src/app/liga-mx-hrlv.js` directamente.
- Tras verificar `pnpm run build` y pruebas locales, se eliminaron los shims raíz antiguos que exportaban desde rutas previas.

Si tienes integraciones externas que importaban módulos desde rutas antiguas de `src/`, actualízalas para que apunten a la nueva estructura.

## Siguientes pasos recomendados

- Si quieres llevar los cambios a la rama `main`, abre un PR desde `feature/update` hacia `main` y solicita revisión.
- Actualizar cualquier README/CONTRIBUTING adicional si hay instrucciones específicas para contribución o despliegue.
- (Opcional) Crear una etiqueta (`git tag`) y un release si deseas versionar este cambio.

## Fuente pública para Liga MX Social

La función `publicData` sirve consultas anónimas de solo lectura:

| Información | HTML sin JavaScript | JSON |
| --- | --- | --- |
| Jornada | `https://ligamx.hectorrlove.com/datos/jornadas/14` | `https://ligamx.hectorrlove.com/api/jornadas/14.json` |
| Tabla | `https://ligamx.hectorrlove.com/datos/tabla` | `https://ligamx.hectorrlove.com/api/tabla.json` |

Sustituye `14` por la jornada requerida. La respuesta incluye el torneo editorial vigente, `zonaHoraria` (`America/Mexico_City`) y `consultadoEn` (instante de lectura, no de edición). Las fechas de partido usan `YYYY-MM-DD`, la hora corresponde a Ciudad de México y `inicio` es el instante ISO equivalente. Fechas y marcadores pendientes son `null`.

Los estados son `scheduled`, `live`, `finished`, `postponed` y `cancelled`. Solo `finished` implica finalización; un marcador 0–0 no la demuestra. Los penales permanecen separados de los goles. La tabla usa `calculateTable`, igual que la app, y `provisional` indica si contribuyen marcadores no definitivos. No se recalculan posiciones en el skill.

Las cuatro rutas envían `Cache-Control: private, no-store, max-age=0`, tanto en respuestas correctas como en errores, para evitar almacenamiento en navegador y CDN. La función hace lecturas REST nuevas de `/matches` y `/teams`, que ya son públicas, sin caché del SDK ni escrituras. Admite `GET` y `HEAD`; responde 400 para una jornada inválida, 404 si no existe, 405 para otros métodos y 503 cuando no puede obtener los datos.

Las representaciones HTML/JSON siguen disponibles para consulta manual en el dominio anterior y en `https://ligamx-b16f7.firebaseapp.com`. La skill actual utiliza las herramientas del MCP público descrito abajo y conserva los enlaces JSON como recuperación manual. El parámetro opcional `consulta` distingue URLs sin cambiar los datos; no elimina copias internas de una herramienta ni garantiza que pueda acceder al sitio.

Las cabeceras del servidor y el parámetro no garantizan que la herramienta web de ChatGPT descarte sus propias copias ni que pueda acceder a la URL. `consultadoEn` permite detectar respuestas antiguas; no indica cuándo se modificaron los datos deportivos. La verificación HTTP con `curl` y la ejecución de la skill dentro de ChatGPT se comprueban por separado.

```bash
corepack pnpm run test:public-data
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
# Compilar antes de iniciar el emulador de Functions en un checkout nuevo:
corepack pnpm run build:functions
# Publicar cambios de la función:
firebase deploy --only functions:publicData --project ligamx-b16f7
# Solo si se añaden o modifican rutas de Hosting:
firebase deploy --only hosting --project ligamx-b16f7
```

Rollup compila las utilidades compartidas a `functions/generated/public-data.js`; el archivo generado no se versiona. El build y el predeploy de Functions lo regeneran. Los workflows actuales de Hosting no despliegan Functions: los cambios de la función requieren el despliegue específico de arriba. Las pruebas de la fuente pública usan fixtures y no escriben en Firebase.

### MCP público de Liga MX Datos

`ligaMcp` es una función HTTP de segunda generación (Node.js 22, `us-central1`) independiente del MCP local de administración. Expone nueve herramientas de lectura mediante Streamable HTTP en `/mcp`: `consultar_jornada({ jornada })`, `consultar_tabla({})`, `consultar_partido({ idMatch })`, `consultar_equipo({ equipo, fase? })`, `consultar_calendario({ equipo?, jornadaDesde?, jornadaHasta?, fechaDesde?, fechaHasta?, estado? })`, `consultar_estadisticas({ metrica?, fase?, equipo?, limite? })`, `consultar_jugador({ equipo, jugador? | dorsal? | idJugador?, fase? })`, `consultar_liguilla({})` y `consultar_escenarios({})`. Usa respuestas JSON, sin sesiones en memoria ni streams SSE; cada solicitud crea y cierra su servidor y transporte. El cuerpo JSON ya interpretado por Firebase se pasa al SDK directamente.

Endpoint de producción: `https://us-central1-ligamx-b16f7.cloudfunctions.net/ligaMcp/mcp`.

El servicio no requiere login y solo lee las ramas públicas `/matches`, `/teams` y `/players`, usando el mismo cargador y normalización que `publicData`. La consulta de jornada y la tabla conservan su estructura y cálculo. Partido, equipo, estadísticas y jugador leen `/players`; no se ofrecen rutas arbitrarias ni registros completos de jugadores. No ofrece acceso genérico a rutas, URLs ni operaciones de escritura. Las respuestas conservan la estructura de la API pública en `structuredContent` y en contenido textual JSON; los errores no incluyen diagnósticos internos ni sustituyen datos anteriores. No hay caché de proceso, navegador ni CDN. Se aceptan llamadas servidor-a-servidor sin `Origin` y llamadas con `Origin: https://chatgpt.com`; el endpoint no habilita llamadas desde otras páginas web.

Se configura con cero instancias mínimas, dos máximas, 1 GiB de memoria y timeout de 60 segundos; cada lectura de Firebase tiene timeout de 10 segundos. El análisis de escenarios tiene su propio presupuesto de 20 segundos y un worker activo por instancia, sin bloquear las consultas habituales. El límite de instancias acota la concurrencia del servicio, no constituye un límite de gasto. Los logs `Liga MCP request` y `Liga MCP tool` registran método/herramienta, resultado y duración, sin cuerpos de datos deportivos ni credenciales.

```bash
corepack pnpm run test:public-data
corepack pnpm run test:mcp:public
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm --dir functions run lint
corepack pnpm run build
firebase deploy --only functions:ligaMcp --project ligamx-b16f7
# Añadir /mcp a la URL de la función que devuelve el despliegue:
node functions/test/liga-mcp-production.mjs 'https://URL-DE-LA-FUNCION/mcp'
firebase functions:log --only ligaMcp --project ligamx-b16f7
```

El cliente de verificación comprueba inicialización, descubrimiento de las nueve herramientas, datos de jornada 15 y tabla, equivalencia de las consultas anteriores con la API HTTP, detalle de partido, estadísticas de equipo, calendario filtrado, rankings, jugador, liguilla y lecturas repetidas. Comprueba además la igualdad de las banderas de clasificación de liguilla con la tabla existente. No escribe en Firebase. Para conectar el servicio en ChatGPT web, registrar la URL verificada con «Agregar servidor MCP personalizado» y «Sin autenticación». La conexión registrada se llama **Liga MX Datos** y se vincula al plugin privado existente **Liga MX Social** mediante `.app.json` y `extensions.com.openai.apps`, conservando su identidad, presentación y prompts. La versión con esta conexión es `0.5.1`.

Un `mcp.json` portátil con tipo `streamable-http` y `extensions.com.openai.auth.type: none` describe el transporte para clientes que admiten esa configuración, pero durante la validación ChatGPT web lo clasificó como solo escritorio. Por eso el paquete final usa la conexión registrada en lugar de conservar `mcp.json` y su compatibilidad `.mcp.json`. La publicación del paquete no demuestra que ChatGPT haya conectado las herramientas: se verifica en un chat nuevo seleccionando Liga MX Social, sin pegar endpoints.

La skill usa MCP en cada solicitud, comprueba `consultadoEn` (hasta 120 segundos) y admite un único reintento si falla de forma transitoria o recibe una lectura antigua. Si falta la conexión o no se puede verificar la información, devuelve el enlace público de recuperación manual y no vuelve al bucle de navegación web.

Verificación del 31 de octubre de 2026: en un chat nuevo de ChatGPT web, Liga MX Social consultó jornada 15 y tabla sin recibir URLs, obtuvo nueve partidos y 18 posiciones y repitió ambas llamadas con nuevos `consultadoEn`. La segunda consulta generó copys de Instagram y X indicando provisionalidad. Los logs de Firebase confirmaron las cuatro llamadas y las pruebas directas comprobaron paridad con la API. Evidencia local en `.firebase/liga-mcp-verification/` (ignorada por Git).

Para revertir la integración del plugin, conservar una copia del paquete y release anteriores antes de actualizar, retirar la conexión MCP y restaurar las instrucciones previas mediante una nueva versión del mismo plugin privado. Usar el release vigente como protección al publicar y comprobar los archivos guardados. La función independiente puede permanecer desplegada mientras se diagnostica; no es necesario tocar reglas, datos ni las otras funciones. Para revertir código del servicio, desplegar su versión anterior con el mismo nombre. Una conexión fallida en ChatGPT se comunica separadamente del estado del despliegue y de las pruebas HTTP.

## Contribuir

Si vas a contribuir, crea una rama a partir de `feature/update` o `main` (según el flujo que uses), realiza los cambios y abre un PR.

Gracias por mantener el repo ordenado —si quieres, puedo crear el PR desde `feature/update` a `main` y/o generar la nota de release.

### Detalle, equipos y calendario

- `consultar_partido` acepta el ID persistente de Firebase (incluido cero), obtenido en jornada o calendario. Devuelve `partido`, `alineaciones`, `eventos`, `cobertura` y `advertencias`. Los eventos se ordenan por periodo, minuto, añadido y secuencia. En autogoles, `team` y `equipoBeneficiado` identifican al beneficiario; `jugador.equipo` identifica al autor. Los dorsales se conservan y los nombres ambiguos o ausentes son `null`; no se elige automáticamente al titular actual del dorsal. No se exponen fechas de nacimiento, imágenes ni URLs de perfiles.
- `consultar_equipo` admite `fase: regular | liguilla | todas` (predeterminada: `regular`). Devuelve plantilla vigente, estadísticas `total/local/visitante` (JJ, JG, JE, JP, GF, GC, DG, PTS), `ultimosCinco` en orden reciente primero, `rachaVerificable`, `proximosCinco`, `pendientesRegistrados`, exclusiones y advertencias. Solo cuentan finalizados con marcador finito completo; los penales se conservan aparte. Los puntos son descriptivos (3/1/0) y no certifican clasificación. La tabla existente puede diferir mientras incluya marcadores en vivo. Una plantilla ausente es `null`, no una lista vacía.
- `consultar_calendario` combina filtros opcionales inclusivos por equipo, jornadas, fechas `YYYY-MM-DD` CDMX y estado (`scheduled`, `live`, `finished`, `postponed`, `cancelled`). Sin filtros devuelve todo el calendario registrado, sin eventos ni alineaciones. Un resultado de búsqueda vacío es válido. Fechas desconocidas se colocan al final; con filtro de fecha se excluyen y se advierte.
- Los próximos partidos de equipo respetan la fase elegida e incluyen programados y aplazados, aunque conserven una fecha pasada. Las fechas desconocidas impiden asegurar el orden de próximos cinco. Las rachas con finalizados sin fecha o sin marcador se marcan como no verificables; las estadísticas excluyen los marcadores incompletos e identifican los IDs afectados.
- Los equipos se resuelven por nombre canónico, ignorando mayúsculas y acentos solo si existe una coincidencia única. Los errores `ambiguous_team` y `team_not_found` incluyen candidatos; `match_not_found` identifica un ID inexistente. No se reintentan como errores transitorios.

Las nuevas consultas se publican únicamente por MCP; no se crean rutas HTTP equivalentes. La primera ampliación (Liga MX Social 0.6.0) añadió crónicas, comparativas, rachas y próximos encuentros con la misma comprobación de vigencia (120 segundos), reintento limitado y entrega de copys de Instagram/X. No genera imágenes ni publica en redes. Las consultas posteriores de rankings, jugadores y liguilla se describen más abajo; el código vigente del plugin está en `plugins/liga-mx-social/`.

Verificación del 1 de noviembre de 2026: MCP actualizado a 1.1.0 y Liga MX Social a 0.6.0. Las 14 pruebas MCP y 8 pruebas de datos públicos, typecheck, lint y build pasaron. El cliente de producción descubrió las cinco herramientas, consultó 170 encuentros y comprobó lecturas renovadas. Después de usar «Actualizar herramientas» en la conexión existente, ChatGPT mostró las cinco herramientas. Un chat nuevo con Liga MX Social generó crónica de Necaxa–Atlante (J1), comparativa América–Atlas, racha y próximos encuentros de América; una segunda solicitud ejecutó `consultar_calendario` para J16–J17. Marcadores, goleadores, minutos, estadísticas, racha y próximos partidos se contrastaron con lecturas de Firebase. Evidencia y respaldo del plugin anterior en `.firebase/liga-mcp-expansion/` (ignorada por Git).

### Rankings, jugadores, liguilla y clasificación

El MCP 1.2.0 añade tres herramientas; Liga MX Social 0.7.0 añade instrucciones para sus publicaciones. Las consultas anteriores conservan sus respuestas.

- `consultar_estadisticas({ metrica?, fase?, equipo?, limite? })`: métricas de jugadores `goleadores` (predeterminada), `asistencias`, `amarillas`, `rojas`, `participaciones` y `minutos`; métricas de equipos `ofensivas`, `defensivas`, `porterias_cero`, `puntos_local` y `puntos_visitante`. Fase regular por defecto; admite liguilla y todas. Límite 1–50, predeterminado 10. Usa finalizados con marcador completo, conserva cobertura y exclusiones y no suma autogoles ni tandas al goleador/asistidor. Defensivas ordena GC ascendente; las demás, valor descendente. Valores iguales comparten posición, con orden alfabético de presentación; `empateEnCorte` indica empates recortados por el límite. Equipos sin juegos finalizados se excluyen del ranking.
- `consultar_jugador({ equipo, jugador? | dorsal? | idJugador?, fase? })`: exige exactamente un selector, con nombre corto/completo sin distinguir acentos o mayúsculas, dorsal o ID recibido de otra consulta. Devuelve identidad deportiva, estadísticas e historial del equipo y dorsal, sin combinar traslados. Usa el cálculo compartido de participaciones/minutos de la app: base 90, cambios y expulsiones, sin añadido ni prórroga; las estimaciones heredadas están documentadas en `criterioMinutos`. No expone fecha de nacimiento, imágenes ni enlaces de perfil. Si el dorsal pertenece a varias identidades, no atribuye sus cifras al nombre seleccionado. Errores `ambiguous_player` y `player_not_found` devuelven candidatos; la ausencia de plantilla devuelve `data_unavailable`.
- `consultar_liguilla({})`: lee matches/teams, sin jugadores, y devuelve las siete llaves registradas (cuatro cuartos, dos semifinales y final), ida/vuelta, globales, penales y ganadores. Reutiliza `getPlayoffSeriesResult`: mejor posición en tabla para empates de cuartos/semifinales y penales en final empatada. Exige ambos encuentros finalizados y coherentes para anunciar un ganador; la siembra debe ser definitiva cuando decide un desempate. No escribe ni proyecta nuevos cruces. Conserva `crucesProvisionales`, `globalProvisional`, advertencias y campeón pendiente como `null`.
- Clasificados y eliminados: **no hay un cálculo nuevo**. `consultar_tabla` sigue usando `calculateTable` y sus banderas `clasificado`, `eliminado` y `playin`; `consultar_liguilla.clasificacion` incluye exactamente esa misma tabla. Liga MX Social las conserva sin recalcular; con tabla provisional no anuncia confirmaciones, y una bandera false no implica la contraria. El informe de escenarios descrito abajo complementa estas consultas sin sustituir esas banderas de la tabla.

Estas herramientas tampoco crean endpoints HTTP nuevos ni cambian reglas o datos de Firebase. El código fuente del plugin se conserva en `plugins/liga-mx-social/`; los despliegues y pruebas remotas se registran en `.firebase/`.

Verificación de la segunda ampliación, 1 de noviembre de 2026: MCP 1.2.0 desplegado y Liga MX Social 0.7.0 actualizado, con lectura de archivos de vuelta y conexión preservada. Pasaron 22 pruebas MCP, 8 pruebas de datos públicos, typecheck, lint del proyecto, lint de los módulos TypeScript de Functions, comprobación de sintaxis de Functions y build. El cliente de producción verificó las ocho herramientas, lecturas renovadas, rankings, estadísticas/historial del jugador y paridad exacta de clasificación entre tabla y liguilla. Después de actualizar herramientas en la conexión existente, ChatGPT mostró ocho herramientas y en un chat nuevo generó rankings de goleo/defensivas conservando empates, ficha de José Rondón, estado provisional de las llaves y clasificados/eliminados a partir de las banderas existentes. Datos contrastados con lecturas de referencia, sin escribir datos deportivos ni reglas. Evidencia y respaldo del plugin 0.6.0 en `.firebase/liga-mcp-tournament/` (ignorada por Git).

### Informe conjunto de escenarios

`consultar_escenarios({})` (MCP 1.3.0, Liga MX Social 0.8.0 y parche 0.8.1) devuelve las condiciones de todos los equipos que siguen en pelea por las plazas directas. Lee únicamente matches/teams y fija `consultadoEn` antes del análisis. Construye la tabla base con finalizados y marcadores completos, valida equipos, jornadas y oponentes de la vuelta regular y mantiene aplazados, partidos en vivo y pendientes contra equipos ya clasificados o eliminados. Los marcadores en vivo no se fijan como resultados finales. No escribe en Firebase ni modifica la tabla existente.

El motor usa `z3-solver` 5.3.3 en un worker de Node. Cada partido comparte dos goles enteros no negativos entre ambos equipos; no hay un techo artificial de goles. Los puntos, DG y GF futuros se comparan conjuntamente con los enfrentamientos directos. Cada caso agrupa una suma de puntos propios con sus balances posibles y busca tanto una clasificación posible como una finalización que deje fuera al equipo. Una abstracción de puntos con restricciones pseudobooleanas prueba imposibilidades; cada resultado posible se valida con marcadores concretos o se refina en el modelo entero de goles. Los testigos SAT se recalculan independientemente con enteros exactos; los empates en puntos, DG y GF se consideran indeterminados en el corte, sin desempatar por orden de aparición.

- `estado`: `completo`, `parcial` o `no_verificable`. Cada caso usa `asegura_su_lugar`, `depende_de_otros_resultados`, `sin_opcion_bajo_este_caso` o `no_verificado`. Un caso sin opción no elimina al equipo si otra suma todavía permite entrar; unknown no implica eliminación.
- `clasificadosAsegurados`, `eliminadosAsegurados`, `candidatos` y `plazasDisponibles` delimitan el informe. Se verifican las exclusiones de la tabla base antes de publicar conclusiones. Si todos los casos posibles de un equipo demuestran una garantía adicional, se retira de candidatos y se registra en `garantiasAdicionalesDelAnalisis`; las banderas originales permanecen intactas en `tablaBase` y `garantiasTablaBase`. Esto puede detectar garantías más fuertes que el cálculo conservador de la app al considerar enfrentamientos entre rivales.
- `equipos[].resumenPuntos` agrupa sumas que aseguran, sumas condicionales e insuficientes. En casos condicionales, `condicionConjunta` indica cuántos de los rivales listados deben quedar detrás y sus umbrales de puntos; no exige que todos pierdan. Es una condición suficiente para asegurar la plaza, con resultados compatibles en todo el calendario.
- `condicionesDesempate` usa el saldo futuro acumulado, no la DG final: saldo propio ≥ saldo rival + `diferenciaSobreSaldoFuturoRival` para superar por DG cuando igualan puntos. Si también igualan DG, se aplica la condición análoga de GF. `ejemplosDesempate` da umbrales numéricos solo junto con los supuestos de igualdad de puntos y saldo futuro del rival; son ejemplos hipotéticos, no pronósticos ni resultados reales. El servidor entrega también el margen para igualar DG, la DG final y una explicación literal comprobada; el plugin debe conservarla sin recalcular ni inventar marcadores. Se verifica la compatibilidad de los supuestos del rival, no la alcanzabilidad de cada umbral de comparación. Superar a un rival no garantiza por sí solo una plaza.
- Un slot por instancia, presupuesto total de 20 segundos incluido el arranque y limpieza del worker. Las consultas habituales siguen disponibles. `analysis_busy` y `analysis_unavailable` son errores sanitizados y transitorios; el plugin admite su reintento limitado. Al agotar el presupuesto, el informe conserva los casos probados y marca los pendientes; si no se validaron las exclusiones, no publica conclusiones. No hay caché de resultados.

Comprobaciones adicionales:

```sh
corepack pnpm run test:scenarios:benchmark
```

El benchmark lee la fotografía actual de Firebase, exige informe completo en el presupuesto y conserva evidencia local ignorada por Git en `.firebase/liga-mcp-scenarios/`. Las pruebas pequeñas contrastan el modelo con enumeración exhaustiva independiente, incluyen márgenes acumulados de +3 y goleadas superiores a 100, verifican timeout/fallo/liberación del slot y preservación de las ocho consultas anteriores.

Verificación del 1 de noviembre de 2026: MCP 1.3.0 desplegado con nueve herramientas y lecturas renovadas; dos consultas consecutivas completaron el informe dentro de 20 segundos (la primera de la comprobación final, 13,3 s). Pasaron 48 pruebas, typecheck, lint, sintaxis de Functions y `corepack pnpm run build`. El fixture reconstituido de 21 pendientes y 15 candidatos iniciales completó el análisis en 2,1 s en local. Liga MX Social se publicó como 0.8.0 y después como parche 0.8.1: la primera prueba en ChatGPT detectó un umbral mal redactado y motivó añadir explicaciones exactas del servidor. La segunda prueba, en un chat nuevo, conservó los umbrales, supuestos y condiciones conjuntas, generó ambos copys y reflejó la nueva fotografía tras finalizar Cruz Azul–León: 19 pendientes, 11 candidatos y cinco plazas. Se contrastó con una nueva consulta directa, sin cambiar banderas, reglas ni datos deportivos. El copy de X tenía 230 caracteres Unicode y 231 ponderados, dentro del límite. Fuente publicada leída de vuelta y conexión/presentación preservadas; evidencia y respaldos en `.firebase/liga-mcp-scenarios/`.

### Garantías locales de clasificación

La bandera `clasificado` de `calculateTable`, compartida por la app, la API pública y el MCP, se calcula exclusivamente con resultados regulares finalizados y marcadores enteros completos. Cuenta todos los rivales que podrían alcanzar los puntos del candidato, incluidos los que ya están arriba: menos de ocho garantizan una plaza. El máximo rival es puntos finalizados + 3 × (17 − JJ finalizados), de modo que un calendario incompleto no elimina partidos potenciales. Los empates de puntos siguen siendo un riesgo mientras cualquiera de los dos equipos tenga partidos por jugar. Cuando ambos terminan, decide DG y después GF; un empate total en el corte no confirma clasificación.

La tabla conserva sus estadísticas y orden en vivo y las reglas anteriores de eliminación/play-in. La nueva garantía se asocia por equipo, sin depender de la posición provisional. Equipos incompletos, identidades duplicadas, jornadas u oponentes repetidos y resultados finales inválidos impiden confirmar plazas. Los escenarios conjuntos siguen pudiendo aportar garantías adicionales al considerar enfrentamientos pendientes. La comprobación con la fotografía del 1 de noviembre identificó América, Guadalajara y Cruz Azul, conservando todas las demás cifras y banderas; evidencia local en `.firebase/qualification-fix/`.

Verificación y publicación: 57 pruebas de datos públicos, clasificación y MCP correctas, junto con typecheck, lint, sintaxis de Functions y build. Las tres pruebas de reglamento y la prueba de interfaz se repitieron cinco veces sin fallos. Hosting, `publicData` y `ligaMcp` desplegados; la tabla publicada muestra las tres marcas y coincide con la API, tabla/liguilla del MCP y base de escenarios. Las lecturas renovadas mantienen 11 candidatos para cinco plazas; el informe de producción completó el cálculo en 11,6 s. No se escribieron datos deportivos ni reglas de Firebase.
