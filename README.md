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

Hosting es la única caché, con `public, max-age=0, s-maxage=30, must-revalidate`. La función hace lecturas REST nuevas de `/matches` y `/teams`, que ya son públicas, sin caché del SDK ni escrituras. Admite `GET` y `HEAD`; responde 400 para una jornada inválida, 404 si no existe, 405 para otros métodos y 503 cuando no puede obtener los datos. Los errores usan `no-store`.

```bash
corepack pnpm run test:public-data
corepack pnpm run typecheck
corepack pnpm run lint
corepack pnpm run build
# Compilar antes de iniciar el emulador de Functions en un checkout nuevo:
corepack pnpm run build:functions
# Publicar únicamente la función nueva y después las rutas de Hosting:
firebase deploy --only functions:publicData --project ligamx-b16f7
firebase deploy --only hosting --project ligamx-b16f7
```

Rollup compila las utilidades compartidas a `functions/generated/public-data.js`; el archivo generado no se versiona. El build y el predeploy de Functions lo regeneran. Los workflows actuales de Hosting no despliegan Functions: los cambios de la función requieren el despliegue específico de arriba. Las pruebas de la fuente pública usan fixtures y no escriben en Firebase.

## Contribuir

Si vas a contribuir, crea una rama a partir de `feature/update` o `main` (según el flujo que uses), realiza los cambios y abre un PR.

Gracias por mantener el repo ordenado —si quieres, puedo crear el PR desde `feature/update` a `main` y/o generar la nota de release.
