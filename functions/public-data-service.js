import { createPublicData, createExtendedData, createTournamentData, prepareScenarioData, PublicDataError } from './generated/public-data.js';
import { runScenarioReport } from './scenario-service.mjs';

// Ramas públicas explícitas; no usa credenciales ni caché del SDK.
export function createFirebaseReader(databaseUrl, fetchData = fetch) {
  return async path => {
    if (!['matches', 'teams', 'players'].includes(path)) throw new Error('Unsupported public path');
    const response = await fetchData(`${databaseUrl.replace(/\/$/, '')}/${path}.json`, {
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) throw new Error(`Firebase read failed (${response.status})`);
    return response.json();
  };
}

export function createPublicDataLoader(readPath, { now = () => new Date(), scenarioRunner = runScenarioReport } = {}) {
  return async route => {
    const extended = ['partido', 'equipo', 'calendario'].includes(route.tipo);
    const tournament = ['estadisticas', 'jugador', 'liguilla'].includes(route.tipo);
    const [matches, teams, players] = await Promise.all([
      readPath('matches'),
      route.jornada === undefined && route.tipo !== 'partido' ? readPath('teams') : Promise.resolve(null),
      ['partido', 'equipo', 'estadisticas', 'jugador'].includes(route.tipo) ? readPath('players') : Promise.resolve(null),
    ]);
    if (!matches || typeof matches !== 'object') {
      throw new PublicDataError(503, 'data_unavailable', 'Los partidos no están disponibles.');
    }
    // Record the read time before the potentially expensive analysis.
    if (route.tipo === 'escenarios') return scenarioRunner(prepareScenarioData(matches, teams, now()));
    if (tournament) return createTournamentData(route, matches, teams, players, now());
    return extended ? createExtendedData(route, matches, teams, players, now()) : createPublicData(route, matches, teams, now());
  };
}
