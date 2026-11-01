import { createPublicData, PublicDataError } from './generated/public-data.js';

// Solo lee las dos ramas públicas; no usa credenciales ni caché del SDK.
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

export function createPublicDataLoader(readPath, { now = () => new Date() } = {}) {
  return async route => {
    const [matches, teams] = await Promise.all([
      readPath('matches'),
      route.jornada === undefined ? readPath('teams') : Promise.resolve(null),
    ]);
    if (!matches || typeof matches !== 'object') {
      throw new PublicDataError(503, 'data_unavailable', 'Los partidos no están disponibles.');
    }
    return createPublicData(route, matches, teams, now());
  };
}
