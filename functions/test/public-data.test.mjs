import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rollup } from 'rollup';
import esbuildModule from 'rollup-plugin-esbuild';
import { createPublicData, renderPublicHtml } from '../generated/public-data.js';
import { createFirebaseReader, createPublicDataHandler } from '../public-api.js';

const now = new Date('2026-10-24T02:00:00Z');
const teams = ['América', 'Atlas', 'Toluca', 'Monterrey'];
const phase = name => ({ id: name, type: 'phase', phase: name, minute: 90, team: '', period: '2T', sequence: 1 });
const match = (overrides = {}) => ({
  local: 'América', visitante: 'Atlas', estadio: 'Estadio & HRLV',
  fecha: '2026/10/23', hora: '20:00', jornada: 14, events: [], ...overrides,
});
const data = (matches, route = { jornada: 14, format: 'json' }, allTeams = teams) => createPublicData(route, matches, allTeams, now);

test('jornada completa, claves dispersas, orden CDMX y marcadores pendientes', () => {
  const matches = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [String(index * 10 + 7), match({ hora: `${22 - index}:00` })]));
  const result = data(matches);
  assert.equal(result.partidos.length, 9);
  assert.deepEqual(result.partidos.map(game => game.idMatch), [87, 77, 67, 57, 47, 37, 27, 17, 7]);
  assert.equal(result.partidos[0].inicio, '2026-10-23T20:00:00.000Z');
  assert.equal(result.partidos[0].fecha, '2026-10-23');
  assert.equal(result.partidos[0].golLocal, null);
  assert.equal(result.partidos[0].golVisitante, null);
  assert.equal(result.consultadoEn, now.toISOString());
  assert.equal(result.zonaHoraria, 'America/Mexico_City');
  const sparse = [];
  sparse[42] = match();
  assert.equal(data(sparse).partidos[0].idMatch, 42);
});

test('0–0 no significa finalizado; estados, penales y fecha pendiente', () => {
  const result = data({
    3: match({ golLocal: 0, golVisitante: 0 }),
    4: match({ golLocal: 0, golVisitante: 0, events: [phase('start')], liveMinute: 35 }),
    5: match({ golLocal: 0, golVisitante: 0, events: [phase('fulltime')], penaltyLocal: 4, penaltyVisitante: 3 }),
    6: match({ status: 'postponed', events: [phase('start')] }),
    7: match({ status: 'cancelled', events: [phase('fulltime')] }),
    8: match({ fecha: '', hora: '' }),
  });
  assert.deepEqual(result.partidos.map(game => game.estado), ['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'scheduled']);
  assert.equal(result.partidos[1].minutoEnVivo, 35);
  assert.equal(result.partidos[2].golLocal, 0);
  assert.equal(result.partidos[2].penaltyLocal, 4);
  assert.equal(result.partidos[2].penaltyVisitante, 3);
  assert.equal(result.partidos[5].fecha, null);
  assert.equal(result.partidos[5].inicio, null);
  assert.equal(data({ 10: match({ jornada: 20 }) }, { jornada: 20, format: 'json' }).fase, 'liguilla');
});

test('tabla idéntica al cálculo de la app: desempates, cancelados, liguilla y provisional', async () => {
  const esbuild = esbuildModule.default || esbuildModule;
  const bundle = await rollup({ input: 'src/utils/tableCalculator.ts', plugins: [esbuild({ tsconfig: 'tsconfig.json' })] });
  const { output } = await bundle.generate({ format: 'es' });
  await bundle.close();
  const { calculateTable } = await import(`data:text/javascript;base64,${Buffer.from(output[0].code).toString('base64')}`);
  const fixture = {
    1: match({ golLocal: 2, golVisitante: 0, events: [phase('fulltime')] }),
    2: match({ local: 'Toluca', visitante: 'Monterrey', golLocal: 3, golVisitante: 1, events: [phase('fulltime')] }),
    3: match({ jornada: 20, golLocal: 99, golVisitante: 0 }),
    4: match({ golLocal: 99, golVisitante: 0, status: 'cancelled' }),
  };
  const result = data(fixture, { format: 'json' });
  assert.deepEqual(result.posiciones.map(({ posicion, ...entry }) => entry), calculateTable(teams, Object.values(fixture)));
  assert.deepEqual(result.posiciones.map(team => team.equipo), ['Toluca', 'América', 'Monterrey', 'Atlas']);
  assert.deepEqual(result.posiciones.map(team => team.posicion), [1, 2, 3, 4]);
  assert.equal(result.provisional, false);
  fixture[5] = match({ golLocal: 0, golVisitante: 0, events: [phase('start')] });
  assert.equal(data(fixture, { format: 'json' }).provisional, true);
});

test('HTML sin JavaScript conserva datos, estados y banderas; escapa contenido', () => {
  const result = data({ 7: match({ local: '<script>alert(1)</script>', golLocal: 0, golVisitante: 0, events: [phase('fulltime')], penaltyLocal: 4, penaltyVisitante: 3 }) });
  const html = renderPublicHtml(result);
  assert.match(html, /<html lang="es">/);
  assert.doesNotMatch(html, /<script|onload=/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /Estadio &amp; HRLV/);
  assert.match(html, /Finalizado/);
  assert.match(html, /<td>0<\/td><td>0<\/td>/);
  assert.match(html, /<td>4<\/td><td>3<\/td>/);
  assert.match(html, new RegExp(result.consultadoEn, 'u'));
  const table = data({ 7: match({ golLocal: 2, golVisitante: 0 }) }, { format: 'html' });
  const tableHtml = renderPublicHtml(table);
  for (const entry of table.posiciones) {
    const expectedCells = [entry.posicion, entry.equipo, entry.jj, entry.jg, entry.je, entry.jp, entry.gf, entry.gc, entry.dg, entry.pts, entry.clasificado ? 'Sí' : 'No', entry.playin ? 'Sí' : 'No', entry.eliminado ? 'Sí' : 'No'].map(value => `<td>${value}</td>`).join('');
    assert.ok(tableHtml.includes(`<tr>${expectedCells}</tr>`));
  }
  assert.match(tableHtml, /Incluye marcadores no definitivos: Sí/);
});

async function request(path, { method = 'GET', read = async key => key === 'teams' ? teams : { 7: match() } } = {}) {
  const response = {
    headers: {}, statusCode: 200,
    set(name, value) { this.headers[name] = value; return this; },
    type(value) { this.contentType = value; return this; },
    status(value) { this.statusCode = value; return this; },
    send(value) { this.body = value; return this; },
    end() { this.ended = true; return this; },
  };
  await createPublicDataHandler(read, { now: () => now, logError: () => {} })({ path, method }, response);
  return response;
}

test('GET/HEAD: caché CDN 30 segundos, misma representación y ninguna caché de proceso', async () => {
  let reads = 0;
  const options = { read: async () => { reads += 1; return { 7: match() }; } };
  const json = await request('/api/jornadas/14.json', options);
  const html = await request('/datos/jornadas/14', options);
  assert.equal(reads, 2);
  assert.equal(json.headers['Cache-Control'], 'public, max-age=0, s-maxage=30, must-revalidate');
  assert.equal(json.headers['Set-Cookie'], undefined);
  assert.equal(html.body, renderPublicHtml(json.body));
  const head = await request('/api/tabla.json', { method: 'HEAD' });
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, undefined);
  assert.equal(head.ended, true);
});

test('rutas inválidas, ausentes, métodos de escritura y fallos sin caché', async () => {
  for (const [path, status] of [
    ['/api/jornadas/0.json', 400], ['/datos/jornadas/1.5', 400],
    ['/api/jornadas/999.json', 404], ['/api/desconocido', 404],
  ]) {
    const response = await request(path);
    assert.equal(response.statusCode, status, path);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const response = await request('/api/tabla.json', { method, read: () => assert.fail('No debe leer ni escribir Firebase') });
    assert.equal(response.statusCode, 405);
    assert.equal(response.headers.Allow, 'GET, HEAD');
  }
  for (const read of [async () => { throw new Error('private diagnostic'); }, async () => null]) {
    const response = await request('/api/tabla.json', { read });
    assert.equal(response.statusCode, 503);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.doesNotMatch(JSON.stringify(response.body), /private diagnostic/);
  }
  const emptyTeams = await request('/datos/tabla', { read: async key => key === 'teams' ? [] : { 7: match() } });
  assert.equal(emptyTeams.statusCode, 503);
  assert.match(emptyTeams.body, /Datos no disponibles/);
});

test('lector Firebase GET sin SDK ni caché, con límite de tiempo y errores explícitos', async () => {
  const calls = [];
  const reader = createFirebaseReader('https://example.firebaseio.com/', async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ 7: match() }) };
  });
  await reader('matches');
  await reader('matches');
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://example.firebaseio.com/matches.json');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  await assert.rejects(reader('adminRevisions'));
  const failing = createFirebaseReader('https://example.firebaseio.com', async () => ({ ok: false, status: 403 }));
  await assert.rejects(failing('matches'), /403/);
});
