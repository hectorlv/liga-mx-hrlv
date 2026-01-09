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

- **`npm start`**: Ejecuta la app en modo desarrollo con recarga en cambios.
- **`npm run build`**: Construye la app y genera la carpeta `dist/`.
- **`npm run start:build`**: Sirve la versión construida desde `dist/`.
- **`npm test`**: Ejecuta el test runner configurado (si hay tests).
- **`npm run lint`** y **`npm run format`**: Linter y formateador.

Ejemplos de uso en macOS / `zsh`:

```bash
# Desarrollo
npm start

# Build para producción
npm run build

# Servir la build localmente (usa start:build)
npm run start:build
```

## Notas sobre la reorganización

- Se movieron módulos a `src/app`, `src/components`, `src/styles` y `src/utils` para mejorar la claridad del proyecto.
- `index.html` ha sido actualizado para importar `./src/app/liga-mx-hrlv.js` directamente.
- Tras verificar `npm run build` y pruebas locales, se eliminaron los shims raíz antiguos que exportaban desde rutas previas.

Si tienes integraciones externas que importaban módulos desde rutas antiguas de `src/`, actualízalas para que apunten a la nueva estructura.

## Siguientes pasos recomendados

- Si quieres llevar los cambios a la rama `main`, abre un PR desde `feature/update` hacia `main` y solicita revisión.
- Actualizar cualquier README/CONTRIBUTING adicional si hay instrucciones específicas para contribución o despliegue.
- (Opcional) Crear una etiqueta (`git tag`) y un release si deseas versionar este cambio.

## Contribuir

Si vas a contribuir, crea una rama a partir de `feature/update` o `main` (según el flujo que uses), realiza los cambios y abre un PR.

Gracias por mantener el repo ordenado —si quieres, puedo crear el PR desde `feature/update` a `main` y/o generar la nota de release.
