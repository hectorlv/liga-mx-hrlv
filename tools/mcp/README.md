# MCP local de Liga MX HRLV

Este servidor controla la interfaz local en `http://127.0.0.1:8011`. La interfaz
sigue conectada al Firebase de producción, por lo que `liga_commit` requiere
aprobación en cada llamada.

## Credenciales

Define las variables fuera del repositorio antes de reiniciar Codex:

```sh
export LIGA_MX_ADMIN_EMAIL='correo@example.com'
export LIGA_MX_ADMIN_PASSWORD='contraseña'
```

No son necesarias para navegar, inspeccionar ni tomar capturas. Usa
`LIGA_MX_HEADLESS=0` si quieres ver la ventana de Chromium administrada por el
MCP.

El servidor queda registrado para este proyecto en `.codex/config.toml`.
Reinicia Codex o la extensión después de instalarlo y usa `/mcp` para comprobar
que `liga_mx_local` está conectado.
