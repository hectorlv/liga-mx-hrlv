export const DEFAULT_BASE_URL = 'http://127.0.0.1:8011/';

export const WRITE_CONTROL_PATTERN =
  /(?:agregar|guardar|guardando|eliminar|transferir|mover|dar de baja|registrar|publicar|actualizar|iniciar partido|iniciar segunda mitad|finalizar|terminar|deshacer|confirmar)/iu;

const PASSWORD_PATTERN = /(?:contraseña|password)/iu;
const AUTH_CONTROL_PATTERN =
  /(?:iniciar sesión|ingresar|cerrar sesión|salir)/iu;
const ALLOWED_HOSTNAMES = new Set(['127.0.0.1', 'localhost']);

export function normalizeBaseUrl(value = DEFAULT_BASE_URL) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !ALLOWED_HOSTNAMES.has(url.hostname)) {
    throw new Error(
      'LIGA_MX_URL debe usar http://127.0.0.1 o http://localhost.',
    );
  }
  url.username = '';
  url.password = '';
  url.hash = '';
  return url;
}

export function assertAllowedUrl(value, baseUrl) {
  const candidate = new URL(value, baseUrl);
  if (
    candidate.protocol !== 'http:' ||
    !ALLOWED_HOSTNAMES.has(candidate.hostname) ||
    candidate.origin !== baseUrl.origin
  ) {
    throw new Error(
      'El MCP bloqueó una navegación fuera del origen local permitido.',
    );
  }
  return candidate;
}

export function assertSafeEditTarget({ action, name, role }) {
  if (PASSWORD_PATTERN.test(name)) {
    throw new Error(
      'liga_edit no puede manipular contraseñas; usa liga_login_admin.',
    );
  }
  if (
    action === 'click' &&
    (WRITE_CONTROL_PATTERN.test(name) ||
      AUTH_CONTROL_PATTERN.test(name) ||
      role === 'link')
  ) {
    throw new Error(
      WRITE_CONTROL_PATTERN.test(name) || AUTH_CONTROL_PATTERN.test(name)
        ? 'liga_edit bloqueó un control persistente; usa liga_commit.'
        : 'liga_edit no abre enlaces. Usa liga_navigate para rutas internas.',
    );
  }
}

export function assertCommitTarget(name) {
  if (AUTH_CONTROL_PATTERN.test(name)) {
    throw new Error(
      'Usa liga_login_admin o liga_logout para cambiar la sesión.',
    );
  }
  if (!WRITE_CONTROL_PATTERN.test(name)) {
    throw new Error(
      'liga_commit solo acepta controles persistentes reconocibles por su nombre.',
    );
  }
}
