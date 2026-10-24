import { createPublicData, parsePublicRoute, PublicDataError, renderDocument, renderPublicHtml } from './generated/public-data.js';

// Sin caché de proceso ni SDK: cada fallo de caché de Hosting lee el servidor.
// Solo utiliza las dos ramas que ya son públicas en las reglas de Firebase.
export function createFirebaseReader(databaseUrl, fetchData = fetch) {
  return async path => {
    if (path !== 'matches' && path !== 'teams') throw new Error('Unsupported public path');
    const response = await fetchData(`${databaseUrl.replace(/\/$/, '')}/${path}.json`, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) throw new Error(`Firebase read failed (${response.status})`);
    return response.json();
  };
}

export function createPublicDataHandler(readPath, { now = () => new Date(), logError = console.error } = {}) {
  return async (request, response) => {
    const html = request.path.startsWith('/datos/');
    response.set('Cache-Control', 'no-store');
    response.set('X-Content-Type-Options', 'nosniff');
    response.set('Content-Security-Policy', "default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    response.type(html ? 'html' : 'json');
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.set('Allow', 'GET, HEAD');
        throw new PublicDataError(405, 'method_not_allowed', 'Solo se permiten consultas GET y HEAD.');
      }
      const route = parsePublicRoute(request.path);
      const [matches, teams] = await Promise.all([
        readPath('matches'),
        route.jornada === undefined ? readPath('teams') : Promise.resolve(null),
      ]);
      if (!matches || typeof matches !== 'object') {
        throw new PublicDataError(503, 'data_unavailable', 'Los partidos no están disponibles.');
      }
      const data = createPublicData(route, matches, teams, now());
      // Una sola capa de caché: CDN 30 s; navegador siempre revalida.
      response.set('Cache-Control', 'public, max-age=0, s-maxage=30, must-revalidate');
      if (request.method === 'HEAD') return response.status(200).end();
      return response.status(200).send(route.format === 'html' ? renderPublicHtml(data) : data);
    } catch (error) {
      const known = error instanceof PublicDataError;
      if (!known) logError('Public data read failed', error);
      const status = known ? error.status : 503;
      const code = known ? error.code : 'data_unavailable';
      const message = known ? error.message : 'No se pudieron consultar los datos. Inténtalo de nuevo.';
      response.set('Cache-Control', 'no-store');
      response.status(status);
      if (request.method === 'HEAD') return response.end();
      return response.send(html
        ? renderDocument('Datos no disponibles', `<p>${message}</p>`)
        : { error: { code, message } });
    }
  };
}
