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

### MCP público de jornadas y tabla

`ligaMcp` es una función HTTP de segunda generación (Node.js 22, `us-central1`) independiente del MCP local de administración. Expone únicamente `consultar_jornada({ jornada })` y `consultar_tabla({})` mediante Streamable HTTP en `/mcp`. Usa respuestas JSON, sin sesiones en memoria ni streams SSE; cada solicitud crea y cierra su servidor y transporte. El cuerpo JSON ya interpretado por Firebase se pasa al SDK directamente.

Endpoint de producción: `https://us-central1-ligamx-b16f7.cloudfunctions.net/ligaMcp/mcp`.

El servicio no requiere login y solo lee las ramas públicas `/matches` y `/teams`, usando el mismo cargador y las mismas reglas de cálculo que `publicData`. No ofrece acceso genérico a rutas, URLs ni operaciones de escritura. Las respuestas conservan la estructura de la API pública en `structuredContent` y en contenido textual JSON; los errores no incluyen diagnósticos internos ni sustituyen datos anteriores. No hay caché de proceso, navegador ni CDN. Se aceptan llamadas servidor-a-servidor sin `Origin` y llamadas con `Origin: https://chatgpt.com`; el endpoint no habilita llamadas desde otras páginas web.

Se configura con cero instancias mínimas, dos máximas y timeout de 30 segundos; cada lectura de Firebase tiene timeout de 10 segundos. El límite de instancias acota la concurrencia del servicio, no constituye un límite de gasto. Los logs `Liga MCP request` y `Liga MCP tool` registran método/herramienta, resultado y duración, sin cuerpos de datos deportivos ni credenciales.

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

El cliente de verificación comprueba inicialización, descubrimiento de las dos herramientas, datos de jornada 15 y tabla, equivalencia con la API HTTP y lecturas repetidas. No escribe en Firebase. Para conectar el servicio en ChatGPT web, registrar la URL verificada con «Agregar servidor MCP personalizado» y «Sin autenticación». La conexión registrada se llama **Liga MX Datos** y se vincula al plugin privado existente **Liga MX Social** mediante `.app.json` y `extensions.com.openai.apps`, conservando su identidad, presentación y prompts. La versión con esta conexión es `0.5.1`.

Un `mcp.json` portátil con tipo `streamable-http` y `extensions.com.openai.auth.type: none` describe el transporte para clientes que admiten esa configuración, pero durante la validación ChatGPT web lo clasificó como solo escritorio. Por eso el paquete final usa la conexión registrada en lugar de conservar `mcp.json` y su compatibilidad `.mcp.json`. La publicación del paquete no demuestra que ChatGPT haya conectado las herramientas: se verifica en un chat nuevo seleccionando Liga MX Social, sin pegar endpoints.

La skill usa MCP en cada solicitud, comprueba `consultadoEn` (hasta 120 segundos) y admite un único reintento si falla de forma transitoria o recibe una lectura antigua. Si falta la conexión o no se puede verificar la información, devuelve el enlace público de recuperación manual y no vuelve al bucle de navegación web.

Verificación del 31 de octubre de 2026: en un chat nuevo de ChatGPT web, Liga MX Social consultó jornada 15 y tabla sin recibir URLs, obtuvo nueve partidos y 18 posiciones y repitió ambas llamadas con nuevos `consultadoEn`. La segunda consulta generó copys de Instagram y X indicando provisionalidad. Los logs de Firebase confirmaron las cuatro llamadas y las pruebas directas comprobaron paridad con la API. Evidencia local en `.firebase/liga-mcp-verification/` (ignorada por Git).

Para revertir la integración del plugin, conservar una copia del paquete y release anteriores antes de actualizar, retirar la conexión MCP y restaurar las instrucciones previas mediante una nueva versión del mismo plugin privado. Usar el release vigente como protección al publicar y comprobar los archivos guardados. La función independiente puede permanecer desplegada mientras se diagnostica; no es necesario tocar reglas, datos ni las otras funciones. Para revertir código del servicio, desplegar su versión anterior con el mismo nombre. Una conexión fallida en ChatGPT se comunica separadamente del estado del despliegue y de las pruebas HTTP.

## Contribuir

Si vas a contribuir, crea una rama a partir de `feature/update` o `main` (según el flujo que uses), realiza los cambios y abre un PR.

Gracias por mantener el repo ordenado —si quieres, puedo crear el PR desde `feature/update` a `main` y/o generar la nota de release.
