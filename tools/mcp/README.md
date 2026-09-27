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

## Registro en una copia nueva

`.codex/` está ignorado por Git: el registro local no se incluye al clonar.
Después de instalar las dependencias con `corepack pnpm install`, crea
`.codex/config.toml` en la raíz del proyecto (o añade este bloque si ya existe).
Sustituye `cwd` por la ruta absoluta de tu copia:

```toml
[mcp_servers.liga_mx_local]
command = "corepack"
args = ["pnpm", "run", "mcp:liga"]
cwd = "/ruta/absoluta/liga-mx-hrlv"
env_vars = ["LIGA_MX_ADMIN_EMAIL", "LIGA_MX_ADMIN_PASSWORD", "LIGA_MX_HEADLESS"]
startup_timeout_sec = 20
tool_timeout_sec = 90
default_tools_approval_mode = "writes"
enabled = true

[mcp_servers.liga_mx_local.tools.liga_login_admin]
approval_mode = "prompt"

[mcp_servers.liga_mx_local.tools.liga_logout]
approval_mode = "prompt"

[mcp_servers.liga_mx_local.tools.liga_commit]
approval_mode = "prompt"
```

Mantén los valores de las credenciales solo en el entorno; `env_vars` enumera
los nombres que Codex debe pasar al proceso, sin guardar sus valores.
La configuración por proyecto se carga en proyectos de confianza, según la
[documentación oficial de MCP](https://developers.openai.com/codex/mcp/).
Reinicia Codex o la extensión y usa `/mcp` para comprobar que `liga_mx_local`
está conectado; en la CLI también puedes ejecutar `codex mcp list` desde la
raíz del proyecto. Si falta `corepack`, corrige su disponibilidad en el PATH
del proceso que inicia Codex.
