import { parsePublicRoute, PublicDataError, renderDocument, renderPublicHtml } from './generated/public-data.js';
import { createPublicDataLoader } from './public-data-service.js';
export { createFirebaseReader } from './public-data-service.js';

export function createPublicDataHandler(readPath, { now = () => new Date(), logError = console.error } = {}) {
  const loadData = createPublicDataLoader(readPath, { now });
  return async (request, response) => {
    const html = request.path.startsWith('/datos/');
    response.set('Cache-Control', 'private, no-store, max-age=0');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    response.type(html ? 'html' : 'json');
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.set('Allow', 'GET, HEAD');
        throw new PublicDataError(405, 'method_not_allowed', 'Solo se permiten consultas GET y HEAD.');
      }
      const route = parsePublicRoute(request.path);
      const data = await loadData(route);
      if (request.method === 'HEAD') return response.status(200).end();
      return response.status(200).send(route.format === 'html' ? renderPublicHtml(data) : data);
    } catch (error) {
      const known = error instanceof PublicDataError;
      if (!known) logError('Public data read failed', error);
      const status = known ? error.status : 503;
      const code = known ? error.code : 'data_unavailable';
      const message = known ? error.message : 'No se pudieron consultar los datos. Inténtalo de nuevo.';
      response.status(status);
      if (request.method === 'HEAD') return response.end();
      return response.send(html
        ? renderDocument('Datos no disponibles', `<p>${message}</p>`)
        : { error: { code, message } });
    }
  };
}
