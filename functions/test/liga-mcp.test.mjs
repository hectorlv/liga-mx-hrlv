import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createLigaMcpHandler } from '../liga-mcp.js';
import { createPublicDataHandler } from '../public-api.js';
import { createFirebaseReader } from '../public-data-service.js';

const NOW = new Date('2026-11-01T04:15:00Z');
const teams = ['América', 'Atlas', 'Toluca', 'Monterrey'];
const phase = name => ({ id: name, type: 'phase', phase: name, minute: 90, team: '', period: '2T', sequence: 1 });
const match = overrides => ({ local: 'América', visitante: 'Atlas', estadio: 'Estadio HRLV', fecha: '2026/10/31', hora: '20:00', jornada: 15, events: [], ...overrides });
const matches = {
  7: match({ golLocal: 0, golVisitante: 0, events: [phase('start')] }),
  9: match({ local: 'Toluca', visitante: 'Monterrey', golLocal: 2, golVisitante: 2, penaltyLocal: 4, penaltyVisitante: 3, events: [phase('fulltime')] }),
  12: match({ fecha: '', hora: '' }),
};
const defaultRead = async path => path === 'teams' ? teams : matches;

async function fixture(t, { read = defaultRead, now = () => NOW, logInfo = () => {}, logError = () => {}, scenarioRunner } = {}) {
  const handler = createLigaMcpHandler(read, { now, logInfo, logError, scenarioRunner });
  const http = createServer(async (req, res) => {
    // Reproduce el cuerpo JSON ya interpretado de onRequest en Firebase.
    let body = '';
    for await (const chunk of req) body += chunk;
    req.body = body ? JSON.parse(body) : undefined;
    await handler(req, res);
  });
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    http.closeAllConnections();
    await new Promise(resolve => http.close(resolve));
  });
  const url = new URL(`http://127.0.0.1:${http.address().port}/mcp`);
  const client = new Client({ name: 'liga-mcp-test', version: '1.0.0' });
  const receipts = [];
  await client.connect(new StreamableHTTPClientTransport(url, { fetch: async (input, init) => {
    const response = await fetch(input, init);
    receipts.push({ status: response.status, headers: response.headers });
    return response;
  } }));
  t.after(() => client.close());
  return { client, url, receipts };
}

async function api(path, read = defaultRead, now = () => NOW) {
  const response = {
    set() { return this; }, type() { return this; }, status() { return this; },
    send(body) { this.body = body; return this; },
  };
  await createPublicDataHandler(read, { now })({ path, method: 'GET' }, response);
  return response.body;
}

test('cliente HTTP real descubre las nueve herramientas públicas de lectura y no mantiene sesiones', async t => {
  let reads = 0;
  const { client, receipts } = await fixture(t, { read: async () => { reads++; return matches; } });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['consultar_jornada', 'consultar_tabla', 'consultar_partido', 'consultar_equipo', 'consultar_calendario', 'consultar_estadisticas', 'consultar_jugador', 'consultar_liguilla', 'consultar_escenarios']);
  assert.equal(reads, 0);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.idempotentHint, true);
    assert.deepEqual(tool._meta.securitySchemes, [{ type: 'noauth' }]);
    assert.equal(tool.inputSchema.additionalProperties, false);
  }
  for (const receipt of receipts) {
    assert.equal(receipt.headers.get('mcp-session-id'), null);
    assert.equal(receipt.headers.get('cache-control'), 'private, no-store, max-age=0');
  }
});

test('nuevas herramientas rechazan argumentos y rangos inválidos sin leer Firebase', async t => {
  let reads = 0;
  const { client } = await fixture(t, { read: async () => { reads++; return matches; } });
  for (const [name, cases] of [
    ['consultar_partido', [{}, { idMatch: -1 }, { idMatch: 0.5 }, { idMatch: '7' }, { idMatch: 7, path: 'players' }]],
    ['consultar_equipo', [{}, { equipo: ' ' }, { equipo: 'Atlas', fase: 'otra' }, { equipo: 'Atlas', url: 'http://test' }]],
    ['consultar_calendario', [{ jornadaDesde: 0 }, { jornadaDesde: 4, jornadaHasta: 3 }, { fechaDesde: '2026-02-30' },
      { fechaDesde: '2026-11-02', fechaHasta: '2026-11-01' }, { fechaHasta: 'ayer' }, { estado: 'pendiente' }, { path: 'adminRevisions' }]],
  ]) {
    for (const args of cases) assert.equal((await client.callTool({ name, arguments: args })).isError, true, JSON.stringify(args));
  }
  assert.equal(reads, 0);
});

test('detalle ordena cronología, identifica autogoles y conserva penales sin exponer campos privados', async t => {
  const events = [
    { id: 'card', type: 'card', team: 'local', player: 8, cardType: 'red', minute: 45, addedTime: 2, period: '1T', sequence: 2 },
    { id: 'own', type: 'goal', team: 'local', player: 4, ownGoal: true, minute: 45, addedTime: 2, period: '1T', sequence: 1 },
    { id: 'sub', type: 'substitution', team: 'visitor', playerIn: 9, playerOut: 4, minute: 46, period: '2T', sequence: 1 },
    { id: 'goal', type: 'goal', team: 'visitor', player: 9, assist: 4, minute: 45, period: '1T', sequence: 1 },
    phase('fulltime'),
  ];
  const players = { 'América': [{ number: 8, name: 'Jugador A', fullName: 'Jugador A completo', birthDate: 'privado', imgSrc: 'secreto', profileUrl: 'secreto' }],
    Atlas: [{ number: 4, name: 'Jugador B' }, { number: 9, name: 'Jugador C' }] };
  const data = { matches: { 0: match({ golLocal: 1, golVisitante: 1, penaltyLocal: 4, penaltyVisitante: 5, events,
    lineupLocal: [{ number: 8, titular: true }], lineupVisitor: [{ number: 4, titular: true }, { number: 9, entroDeCambio: true }] }) }, players };
  const { client } = await fixture(t, { read: async path => data[path] });
  const result = await client.callTool({ name: 'consultar_partido', arguments: { idMatch: 0 } });
  assert.ok(!result.isError);
  const detail = result.structuredContent;
  assert.deepEqual(JSON.parse(result.content[0].text), detail);
  assert.deepEqual(detail.eventos.map(event => event.id), ['goal', 'own', 'card', 'sub', 'fulltime']);
  assert.equal(detail.eventos[1].jugador.name, 'Jugador B');
  assert.equal(detail.eventos[1].equipoBeneficiado, 'América');
  assert.equal(detail.eventos[1].addedTime, 2);
  assert.equal(detail.eventos[0].asistencia.name, 'Jugador B');
  assert.equal(detail.eventos[3].entra.name, 'Jugador C');
  assert.equal(detail.alineaciones.local[0].name, 'Jugador A');
  assert.equal(detail.cobertura.alineacionLocal, 'parcial');
  assert.equal(detail.partido.golLocal, 1);
  assert.equal(detail.partido.penaltyLocal, 4);
  assert.ok(!detail.advertencias.some(item => item.includes('no coinciden')));
  assert.doesNotMatch(JSON.stringify(detail), /privado|secreto|profileUrl|birthDate|imgSrc/);
});

test('detalle señala identidades ambiguas, registros ausentes y discrepancias sin inventar eventos', async t => {
  const data = { matches: { 7: match({ golLocal: 2, golVisitante: 0, events: [phase('fulltime'),
    { id: 'goal', type: 'goal', team: 'local', player: 8, minute: 1, period: '1T', sequence: 1 }],
    lineupLocal: [{ number: 99 }] }) },
    players: { 'América': [{ number: 8, name: 'Actual' }, { number: 8, name: 'Anterior', historical: true }] } };
  const { client } = await fixture(t, { read: async path => data[path] });
  const detail = (await client.callTool({ name: 'consultar_partido', arguments: { idMatch: 7 } })).structuredContent;
  assert.equal(detail.eventos[0].jugador.name, null);
  assert.equal(detail.eventos[0].player, 8);
  assert.equal(detail.alineaciones.local[0].name, null);
  assert.equal(detail.cobertura.alineacionVisitante, 'sin_registro');
  assert.ok(detail.advertencias.some(item => item.includes('ambigua')));
  assert.ok(detail.advertencias.some(item => item.includes('no coinciden')));
  assert.equal(detail.eventos.filter(event => event.type === 'goal').length, 1);
  const absent = await client.callTool({ name: 'consultar_partido', arguments: { idMatch: 100 } });
  assert.equal(JSON.parse(absent.content[0].text).error.code, 'match_not_found');
  const { client: empty } = await fixture(t, { read: async path => path === 'matches' ? { 1: match({}) } : null });
  const noEvents = (await empty.callTool({ name: 'consultar_partido', arguments: { idMatch: 1 } })).structuredContent;
  assert.deepEqual(noEvents.eventos, []);
  assert.equal(noEvents.cobertura.eventos, 'sin_registro');
});

test('equipo limita fase y estadísticas a finalizados, preserva pendientes pasados y plantilla vigente', async t => {
  const finished = overrides => match({ events: [phase('fulltime')], golLocal: 2, golVisitante: 0, ...overrides });
  const data = { teams, players: { 'América': [{ number: 9, name: 'Actual' }, { number: 8, name: 'Anterior', historical: true }] }, matches: {
    1: finished({ fecha: '2026/10/01' }),
    2: finished({ local: 'Atlas', visitante: 'América', golLocal: 1, golVisitante: 1, fecha: '2026/10/02' }),
    3: match({ golLocal: 6, golVisitante: 0, events: [phase('start')] }),
    4: finished({ status: 'cancelled' }),
    5: finished({ status: 'postponed', fecha: '2026/09/01' }),
    6: finished({ jornada: 20, golLocal: 1, golVisitante: 1, penaltyLocal: 5, penaltyVisitante: 4 }),
    7: match({ fecha: '', hora: '' }),
  } };
  const { client } = await fixture(t, { read: async path => data[path] });
  const regular = (await client.callTool({ name: 'consultar_equipo', arguments: { equipo: 'america' } })).structuredContent;
  assert.equal(regular.equipo, 'América');
  assert.equal(regular.fase, 'regular');
  assert.deepEqual(regular.estadisticas.total, { jj: 2, jg: 1, je: 1, jp: 0, gf: 3, gc: 1, dg: 2, pts: 4 });
  assert.equal(regular.estadisticas.local.jj, 1);
  assert.equal(regular.estadisticas.visitante.je, 1);
  assert.deepEqual(regular.ultimosCinco.map(item => item.idMatch), [2, 1]);
  assert.equal(regular.rachaVerificable, true);
  assert.deepEqual(regular.proximosCinco.map(item => item.idMatch), [5, 7]);
  assert.equal(regular.proximosCinco[0].estado, 'postponed');
  assert.deepEqual(regular.plantilla.map(player => player.number), [9]);
  const playoffs = (await client.callTool({ name: 'consultar_equipo', arguments: { equipo: 'América', fase: 'liguilla' } })).structuredContent;
  assert.equal(playoffs.estadisticas.total.je, 1);
  assert.equal(playoffs.estadisticas.total.jg, 0);
  assert.equal(playoffs.ultimosCinco[0].penaltyLocal, 5);
  assert.equal(playoffs.ultimosCinco[0].resultado, 'empate');
  const all = (await client.callTool({ name: 'consultar_equipo', arguments: { equipo: 'América', fase: 'todas' } })).structuredContent;
  assert.equal(all.estadisticas.total.jj, 3);
});

test('racha ordena últimos cinco y señala finalizados sin fecha o sin marcador; cero no significa datos ausentes', async t => {
  const games = Object.fromEntries(Array.from({ length: 7 }, (_, index) => [index,
    match({ golLocal: 0, golVisitante: 0, fecha: `2026/10/0${index + 1}`, events: [phase('fulltime')] })]));
  let data = games;
  const { client } = await fixture(t, { read: async path => path === 'matches' ? data : path === 'teams' ? teams : null });
  const get = async () => (await client.callTool({ name: 'consultar_equipo', arguments: { equipo: 'América' } })).structuredContent;
  const regular = await get();
  assert.deepEqual(regular.ultimosCinco.map(item => item.idMatch), [6, 5, 4, 3, 2]);
  assert.equal(regular.estadisticas.total.je, 7);
  assert.equal(regular.plantilla, null);
  data = { ...games, 9: match({ fecha: '', hora: '', golLocal: 3, golVisitante: 1, events: [phase('fulltime')] }),
    10: match({ events: [phase('fulltime')] }) };
  const incomplete = await get();
  assert.equal(incomplete.rachaVerificable, false);
  assert.deepEqual(incomplete.excluidosSinMarcador, [10]);
  assert.deepEqual(incomplete.finalizadosSinFecha, [9]);
  assert.equal(incomplete.estadisticas.total.jj, 8);
  const noGames = (await client.callTool({ name: 'consultar_equipo', arguments: { equipo: 'Monterrey' } })).structuredContent;
  assert.equal(noGames.estadisticas.total.jj, 0);
  assert.deepEqual(noGames.ultimosCinco, []);
});

test('calendario combina filtros inclusivos CDMX y ordena IDs y fechas desconocidas sin leer plantillas', async t => {
  const games = { 9: match({ fecha: '2026/10/31', hora: '23:30' }), 7: match({ fecha: '2026/10/31', hora: '23:30' }),
    8: match({ fecha: '2026/11/01', hora: '00:30' }), 1: match({ fecha: '', hora: '' }),
    2: match({ jornada: 16 }), 3: match({ local: 'Toluca', visitante: 'Monterrey' }) };
  const reads = [];
  const { client } = await fixture(t, { read: async path => { reads.push(path); return path === 'teams' ? teams : games; } });
  const filtered = (await client.callTool({ name: 'consultar_calendario', arguments: {
    equipo: 'AMERICA', jornadaDesde: 15, jornadaHasta: 15, fechaDesde: '2026-10-31', fechaHasta: '2026-10-31', estado: 'scheduled',
  } })).structuredContent;
  assert.deepEqual(filtered.partidos.map(item => item.idMatch), [7, 9]);
  assert.equal(filtered.partidos[0].inicio, '2026-11-01T05:30:00.000Z');
  assert.equal(filtered.filtros.equipo, 'América');
  assert.equal(filtered.advertencias.length, 1);
  assert.deepEqual(reads, ['matches', 'teams']);
  const all = (await client.callTool({ name: 'consultar_calendario', arguments: {} })).structuredContent;
  assert.equal(all.partidos.length, 6);
  assert.equal(all.partidos.at(-1).idMatch, 1);
  assert.ok(all.partidos.every(item => !('events' in item) && !('lineupLocal' in item)));
  const empty = (await client.callTool({ name: 'consultar_calendario', arguments: { jornadaDesde: 100 } })).structuredContent;
  assert.deepEqual(empty.partidos, []);
});

test('equipos ambiguos devuelven candidatos; solo se permiten las ramas públicas declaradas', async t => {
  const { client } = await fixture(t, { read: async path => path === 'teams' ? ['León', 'Leon'] : path === 'players' ? null : matches });
  const ambiguous = await client.callTool({ name: 'consultar_equipo', arguments: { equipo: 'LEON' } });
  assert.deepEqual(JSON.parse(ambiguous.content[0].text).error.candidatos, ['León', 'Leon']);
  const missing = await client.callTool({ name: 'consultar_calendario', arguments: { equipo: 'No existe' } });
  assert.equal(JSON.parse(missing.content[0].text).error.code, 'team_not_found');
  const paths = [];
  const read = createFirebaseReader('https://example.com/', async url => {
    paths.push(url); return { ok: true, json: async () => ({}) };
  });
  for (const path of ['matches', 'teams', 'players']) await read(path);
  for (const path of ['adminRevisions', 'players/América', '../teams', 'https://test']) await assert.rejects(read(path));
  assert.equal(paths.length, 3);
});

test('consultas nuevas renuevan datos y hora, y un fallo de lectura nunca reutiliza una respuesta anterior', async t => {
  let goals = 1;
  let fail = false;
  let tick = 0;
  const reads = [];
  const { client } = await fixture(t, {
    now: () => new Date(NOW.getTime() + ++tick * 1000),
    read: async path => {
      reads.push(path);
      if (fail) throw new Error('private credentials must not escape');
      return path === 'matches' ? { 7: match({ golLocal: goals, golVisitante: 0, events: [phase('fulltime')] }) }
        : path === 'teams' ? teams : { 'América': [{ number: 9, name: `Jugador ${goals}` }] };
    },
  });
  const queries = [['consultar_partido', { idMatch: 7 }], ['consultar_equipo', { equipo: 'América' }], ['consultar_calendario', {}]];
  const callAll = () => Promise.all(queries.map(([name, args]) => client.callTool({ name, arguments: args })));
  const first = await callAll();
  goals = 3;
  const second = await callAll();
  assert.equal(first[0].structuredContent.partido.golLocal, 1);
  assert.equal(second[0].structuredContent.partido.golLocal, 3);
  assert.equal(second[1].structuredContent.estadisticas.total.gf, 3);
  assert.equal(second[1].structuredContent.plantilla[0].name, 'Jugador 3');
  assert.equal(second[2].structuredContent.partidos[0].golLocal, 3);
  assert.ok(second.every((result, index) => result.structuredContent.consultadoEn > first[index].structuredContent.consultadoEn));
  assert.equal(reads.length, 14); // Partido: 2; equipo: 3; calendario: 2, en cada ronda.
  fail = true;
  for (const result of await callAll()) {
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.equal(JSON.parse(result.content[0].text).error.code, 'data_unavailable');
    assert.doesNotMatch(result.content[0].text, /private|credentials/);
  }
});

test('jornada y tabla equivalen a la API y conservan estados, pendientes, penales y provisionalidad', async t => {
  const logs = [];
  const { client } = await fixture(t, { logInfo: (...args) => logs.push(args) });
  const jornada = await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 15 } });
  assert.deepEqual(jornada.structuredContent, await api('/api/jornadas/15.json'));
  assert.deepEqual(JSON.parse(jornada.content[0].text), jornada.structuredContent);
  const games = jornada.structuredContent.partidos;
  assert.deepEqual(games.map(game => game.estado), ['live', 'finished', 'scheduled']);
  assert.equal(games[0].golLocal, 0);
  assert.equal(games[1].penaltyLocal, 4);
  assert.equal(games[1].golLocal, 2);
  assert.equal(games[2].golLocal, null);
  assert.equal(games[2].fecha, null);
  const tabla = await client.callTool({ name: 'consultar_tabla', arguments: {} });
  assert.deepEqual(tabla.structuredContent, await api('/api/tabla.json'));
  assert.deepEqual(JSON.parse(tabla.content[0].text), tabla.structuredContent);
  assert.equal(tabla.structuredContent.provisional, true);
  assert.equal(tabla.structuredContent.consultadoEn, NOW.toISOString());
  const toolLogs = logs.filter(([label]) => label === 'Liga MCP tool');
  assert.deepEqual(toolLogs.map(([, entry]) => entry.tool), ['consultar_jornada', 'consultar_tabla']);
  assert.ok(toolLogs.every(([, entry]) => entry.status === 'ok' && entry.durationMs >= 0));
  assert.ok(logs.filter(([label]) => label === 'Liga MCP request').every(([, entry]) => entry.status < 400 && entry.durationMs >= 0));
  assert.doesNotMatch(JSON.stringify(logs), /partidos|posiciones|golLocal/);
});

test('rechaza argumentos inválidos y herramientas desconocidas antes de leer Firebase', async t => {
  let reads = 0;
  const { client } = await fixture(t, { read: async () => { reads++; return matches; } });
  for (const args of [{}, { jornada: 0 }, { jornada: -1 }, { jornada: 1.5 }, { jornada: '15' }, { jornada: Number.MAX_SAFE_INTEGER + 1 }, { jornada: 15, url: 'https://example.com' }]) {
    const result = await client.callTool({ name: 'consultar_jornada', arguments: args });
    assert.equal(result.isError, true, JSON.stringify(args));
  }
  assert.equal((await client.callTool({ name: 'consultar_tabla', arguments: { path: 'adminRevisions' } })).isError, true);
  assert.equal((await client.callTool({ name: 'liga_commit', arguments: {} })).isError, true);
  assert.equal(reads, 0);
});

test('jornada inexistente, datos ausentes y timeout devuelven errores sanitizados, nunca datos anteriores', async t => {
  let fail = false;
  const { client } = await fixture(t, { read: async path => {
    if (fail) throw new Error('private diagnostic with credential');
    return defaultRead(path);
  } });
  const absent = await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 999 } });
  assert.equal(absent.isError, true);
  assert.equal(JSON.parse(absent.content[0].text).error.code, 'jornada_not_found');
  assert.ok((await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 15 } })).structuredContent);
  fail = true;
  const failed = await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 15 } });
  assert.equal(failed.isError, true);
  assert.equal(failed.structuredContent, undefined);
  assert.doesNotMatch(failed.content[0].text, /private diagnostic|credential/);
  for (const read of [async () => null, async path => path === 'teams' ? [] : matches,
    createFirebaseReader('https://example.com', async () => { throw new DOMException('private timeout', 'TimeoutError'); })]) {
    const { client: other } = await fixture(t, { read });
    const result = await other.callTool({ name: 'consultar_tabla', arguments: {} });
    assert.equal(result.isError, true);
    assert.equal(JSON.parse(result.content[0].text).error.code, 'data_unavailable');
    assert.doesNotMatch(result.content[0].text, /private timeout/);
  }
});

test('cada consulta repetida o concurrente lee los datos y genera un nuevo momento de lectura', async t => {
  let calls = 0;
  let tick = 0;
  let goals = 0;
  const { client } = await fixture(t, {
    now: () => new Date(NOW.getTime() + ++tick * 1000),
    read: async path => {
      calls++;
      return path === 'teams' ? teams : { 7: match({ golLocal: goals, golVisitante: 0, events: [phase('fulltime')] }) };
    },
  });
  const first = (await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 15 } })).structuredContent;
  goals = 3;
  const second = (await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 15 } })).structuredContent;
  assert.equal(first.partidos[0].golLocal, 0);
  assert.equal(second.partidos[0].golLocal, 3);
  assert.ok(second.consultadoEn > first.consultadoEn);
  const results = await Promise.all(Array.from({ length: 6 }, (_, index) => client.callTool(index % 2
    ? { name: 'consultar_tabla', arguments: {} }
    : { name: 'consultar_jornada', arguments: { jornada: 15 } })));
  assert.equal(new Set(results.map(result => result.structuredContent.consultadoEn)).size, 6);
  assert.equal(calls, 11); // Dos jornadas iniciales + tres jornadas + tres tablas (dos lecturas cada una).
  assert.ok(results.every(result => !result.isError));
});

test('ruta, métodos y Origin se validan sin ejecutar herramientas ni leer Firebase', async t => {
  let reads = 0;
  const { url } = await fixture(t, { read: async () => { reads++; return matches; } });
  for (const method of ['GET', 'HEAD', 'PUT', 'DELETE']) {
    const response = await fetch(url, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
    assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
    await response.text();
  }
  const absent = await fetch(new URL('/other', url), { method: 'POST' });
  assert.equal(absent.status, 404);
  const origin = await fetch(url, { method: 'POST', headers: { Origin: 'https://example.com' } });
  assert.equal(origin.status, 403);
  const malformed = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }, body: '{}' });
  assert.equal(malformed.status, 400);
  assert.equal(reads, 0);
});

function statisticsData() {
  const event = overrides => ({ id: 'goal', type: 'goal', team: 'local', player: 9, assist: 10, minute: 10, period: '1T', sequence: 1, ...overrides });
  return { teams: ['América', 'Atlas', 'Toluca'], players: {
    'América': [{ number: 9, name: 'José Uno', fullName: 'José Uno Completo', id: 'stable-9', birthDate: 'privado', imgSrc: 'secreto' }, { number: 10, name: 'Asistente' }],
    Atlas: [{ number: 4, name: 'Defensa' }], Toluca: [],
  }, matches: {
    7: match({ golLocal: 2, golVisitante: 0,
      lineupLocal: [{ number: 9, titular: true, salioDeCambio: true }, { number: 10, entroDeCambio: true }],
      lineupVisitor: [{ number: 4, titular: true }], events: [event({}),
        event({ id: 'own', player: 4, ownGoal: true, assist: 10, minute: 20 }),
        event({ id: 'penalty', period: 'PEN', minute: 120 }),
        { id: 'yellow', type: 'card', team: 'local', player: 9, cardType: 'yellow', minute: 40, period: '1T', sequence: 1 },
        { id: 'red', type: 'card', team: 'visitor', player: 4, cardType: 'red', foulType: 'dobleAmarilla', minute: 70, period: '2T', sequence: 1 },
        { id: 'sub', type: 'substitution', team: 'local', playerIn: 10, playerOut: 9, minute: 60, period: '2T', sequence: 1 }, phase('fulltime')],
    }),
    8: match({ golLocal: 10, golVisitante: 0, events: [phase('start'), event({})] }),
    9: match({ events: [event({}), phase('fulltime')] }),
    10: match({ golLocal: 10, golVisitante: 0, status: 'cancelled', events: [event({}), phase('fulltime')] }),
    11: match({ jornada: 20, golLocal: 1, golVisitante: 0, events: [event({}), phase('fulltime')] }),
  } };
}

test('rankings y jugador validan selectores, métricas, límites y rutas antes de leer', async t => {
  let reads = 0;
  const { client } = await fixture(t, { read: async () => { reads++; return matches; } });
  for (const [name, cases] of [
    ['consultar_estadisticas', [{ metrica: 'x' }, { limite: 0 }, { limite: 51 }, { limite: 1.5 }, { fase: 'otra' }, { url: 'http://test' }]],
    ['consultar_jugador', [{}, { equipo: 'América' }, { equipo: 'América', dorsal: 9, jugador: 'José' },
      { equipo: 'América', dorsal: -1 }, { equipo: 'América', dorsal: 1000 }, { equipo: 'América', jugador: ' ' },
      { equipo: 'América', idJugador: '' }, { equipo: 'América', dorsal: 9, path: 'adminRevisions' }]],
    ['consultar_liguilla', [{ path: 'matches' }, { fase: 'final' }]],
    ['consultar_escenarios', [{ equipo: 'América' }, { path: 'matches' }]],
  ]) for (const args of cases) assert.equal((await client.callTool({ name, arguments: args })).isError, true, JSON.stringify(args));
  assert.equal(reads, 0);
});

test('rankings y jugador conservan créditos, tarjetas, minutos y filtros de fase sin contar autogoles ni tandas al goleador', async t => {
  const data = statisticsData();
  const { client } = await fixture(t, { read: async path => data[path] });
  const call = async (name, args) => {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError, JSON.stringify(result));
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
    return result.structuredContent;
  };
  const goals = await call('consultar_estadisticas', {});
  assert.equal(goals.fase, 'regular');
  assert.equal(goals.ranking.length, 1);
  assert.equal(goals.ranking[0].jugador.name, 'José Uno');
  assert.equal(goals.ranking[0].valor, 1);
  assert.deepEqual(goals.cobertura.excluidosSinMarcador, [9]);
  const assists = await call('consultar_estadisticas', { metrica: 'asistencias' });
  assert.equal(assists.ranking[0].jugador.number, 10);
  assert.equal(assists.ranking[0].valor, 1);
  const red = await call('consultar_estadisticas', { metrica: 'rojas' });
  assert.equal(red.ranking[0].jugador.equipo, 'Atlas');
  assert.equal(red.ranking[0].estadisticas.rojasDobleAmarilla, 1);
  const player = await call('consultar_jugador', { equipo: 'AMERICA', jugador: 'jose uno' });
  assert.equal(player.jugador.id, 'stable-9');
  assert.deepEqual(player.estadisticas, { goles: 1, autogoles: 0, asistencias: 0, amarillas: 1, rojas: 0,
    rojasDirectas: 0, rojasDobleAmarilla: 0, participaciones: 1, titularidades: 1, minutos: 60 });
  assert.equal(player.historial.length, 1);
  assert.equal(player.historial[0].idMatch, 7);
  const substitute = await call('consultar_jugador', { equipo: 'América', dorsal: 10 });
  assert.equal(substitute.estadisticas.minutos, 30);
  const defender = await call('consultar_jugador', { equipo: 'Atlas', dorsal: 4 });
  assert.equal(defender.estadisticas.autogoles, 1);
  assert.equal(defender.estadisticas.minutos, 70);
  const byId = await call('consultar_jugador', { equipo: 'América', idJugador: 'stable-9', fase: 'todas' });
  assert.equal(byId.estadisticas.goles, 2);
  const playoffs = await call('consultar_estadisticas', { metrica: 'goleadores', fase: 'liguilla', equipo: 'america' });
  assert.equal(playoffs.ranking[0].valor, 1);
  assert.doesNotMatch(JSON.stringify(player), /privado|secreto|birthDate|imgSrc/);
});

test('rankings de equipos usan marcadores finalizados, excluyen equipos sin juegos y conservan empates y límites', async t => {
  const data = statisticsData();
  data.matches[12] = match({ local: 'Atlas', visitante: 'América', golLocal: 1, golVisitante: 0, events: [phase('fulltime')] });
  const { client } = await fixture(t, { read: async path => data[path] });
  const rank = async metrica => (await client.callTool({ name: 'consultar_estadisticas', arguments: { metrica } })).structuredContent;
  const offense = await rank('ofensivas');
  assert.equal(offense.entidad, 'equipos');
  assert.deepEqual(offense.ranking.map(row => [row.equipo, row.valor]), [['América', 2], ['Atlas', 1]]);
  const defense = await rank('defensivas');
  assert.equal(defense.orden, 'menor_a_mayor');
  assert.equal(defense.ranking[0].equipo, 'América');
  assert.equal(defense.ranking[0].valor, 1);
  const clean = await rank('porterias_cero');
  assert.deepEqual(clean.ranking.map(row => row.posicion), [1, 1]);
  assert.deepEqual(clean.ranking.map(row => row.valor), [1, 1]);
  const home = await rank('puntos_local');
  assert.equal(home.ranking[0].valor, 3);
  const away = await rank('puntos_visitante');
  assert.ok(away.ranking.every(row => row.valor === 0));
  const limited = (await client.callTool({ name: 'consultar_estadisticas', arguments: { metrica: 'porterias_cero', limite: 1 } })).structuredContent;
  assert.equal(limited.totalRegistros, 2);
  assert.equal(limited.empateEnCorte, true);
  assert.equal(limited.ranking.length, 1);
});

test('jugadores ambiguos y dorsales reutilizados no mezclan identidades; ceros y registros ausentes se distinguen', async t => {
  const data = statisticsData();
  data.players['América'].push({ number: 9, name: 'Jugador Anterior', historical: true });
  data.players['América'].push({ number: 77, name: 'Sin Partidos', id: 'zero' });
  const { client } = await fixture(t, { read: async path => data[path] });
  const ambiguous = await client.callTool({ name: 'consultar_jugador', arguments: { equipo: 'América', dorsal: 9 } });
  assert.equal(JSON.parse(ambiguous.content[0].text).error.code, 'ambiguous_player');
  assert.equal(JSON.parse(ambiguous.content[0].text).error.candidatos.length, 2);
  const named = (await client.callTool({ name: 'consultar_jugador', arguments: { equipo: 'América', jugador: 'José Uno' } })).structuredContent;
  assert.equal(named.estadisticas, null);
  assert.deepEqual(named.historial, []);
  assert.ok(named.advertencias.some(message => message.includes('dorsal está compartido')));
  const ranking = (await client.callTool({ name: 'consultar_estadisticas', arguments: {} })).structuredContent;
  assert.equal(ranking.ranking[0].jugador.name, null);
  assert.equal(ranking.ranking[0].jugador.identidad, 'ambigua');
  const zero = (await client.callTool({ name: 'consultar_jugador', arguments: { equipo: 'América', idJugador: 'zero' } })).structuredContent;
  assert.equal(zero.estadisticas.goles, 0);
  assert.deepEqual(zero.historial, []);
  const missing = await client.callTool({ name: 'consultar_jugador', arguments: { equipo: 'América', dorsal: 200 } });
  assert.equal(JSON.parse(missing.content[0].text).error.code, 'player_not_found');
  const { client: absent } = await fixture(t, { read: async path => path === 'players' ? null : data[path] });
  assert.equal((await absent.callTool({ name: 'consultar_jugador', arguments: { equipo: 'América', dorsal: 9 } })).isError, true);
  const unresolved = (await absent.callTool({ name: 'consultar_estadisticas', arguments: {} })).structuredContent;
  assert.equal(unresolved.ranking[0].jugador.name, null);
  assert.ok(unresolved.advertencias.length > 0);
});

function liguillaData() {
  const final = overrides => match({ golLocal: 1, golVisitante: 0, events: [phase('fulltime')], ...overrides });
  return { teams: ['América', 'Atlas'], matches: {
    ...Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i, final({ jornada: i + 1 })])),
    156: final({ jornada: 20, local: 'Atlas', visitante: 'América', golLocal: 1, golVisitante: 1 }),
    160: final({ jornada: 20, golLocal: 1, golVisitante: 1 }),
    168: final({ jornada: 22, local: 'Atlas', visitante: 'América', golLocal: 1, golVisitante: 1 }),
    169: final({ jornada: 22, golLocal: 1, golVisitante: 1, penaltyLocal: 4, penaltyVisitante: 3 }),
  } };
}

test('liguilla reutiliza tabla y desempates de la app sin modificar clasificación ni leer jugadores', async t => {
  const data = liguillaData();
  const reads = [];
  const { client } = await fixture(t, { read: async path => { reads.push(path); return data[path]; } });
  const result = await client.callTool({ name: 'consultar_liguilla', arguments: {} });
  assert.ok(!result.isError);
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
  const league = result.structuredContent;
  assert.deepEqual(reads, ['matches', 'teams']);
  const { torneo, zonaHoraria, consultadoEn, aviso, ...table } = (await client.callTool({ name: 'consultar_tabla', arguments: {} })).structuredContent;
  assert.deepEqual(league.clasificacion, table);
  assert.equal(league.crucesProvisionales, false);
  assert.equal(league.formato.directQualificationSpots, 8);
  assert.equal(league.formato.playInSpots, 0);
  assert.deepEqual(league.rondas.map(round => round.llaves.length), [4, 2, 1]);
  const quarter = league.rondas[0].llaves[0];
  assert.deepEqual(quarter.global, { Atlas: 2, 'América': 2 });
  assert.equal(quarter.ganador, 'América');
  assert.equal(quarter.criterioGanador, 'posicion_tabla');
  const final = league.rondas[2].llaves[0];
  assert.equal(final.ganador, 'América');
  assert.equal(final.criterioGanador, 'penales');
  assert.deepEqual(final.penales, { local: 4, visitante: 3 });
  assert.deepEqual(final.global, { Atlas: 2, 'América': 2 });
  assert.equal(league.campeon, 'América');
});

test('liguilla no confirma ganadores en vivo, cruces inconsistentes ni empates pendientes de la final', async t => {
  const data = liguillaData();
  const { client } = await fixture(t, { read: async path => data[path] });
  const get = async () => (await client.callTool({ name: 'consultar_liguilla', arguments: {} })).structuredContent;
  data.matches[169].events = [phase('start')];
  let league = await get();
  assert.equal(league.campeon, null);
  assert.equal(league.rondas[2].llaves[0].globalProvisional, true);
  data.matches[169].events = [phase('fulltime')];
  delete data.matches[169].penaltyLocal;
  delete data.matches[169].penaltyVisitante;
  league = await get();
  assert.equal(league.campeon, null);
  assert.equal(league.rondas[2].llaves[0].requiereTiempoExtraOPenales, true);
  assert.equal(league.rondas[2].llaves[0].estado, 'pendiente_desempate');
  data.matches[160].visitante = 'Desconocido';
  league = await get();
  assert.equal(league.rondas[0].llaves[0].ganador, null);
  assert.ok(league.advertencias.some(message => message.includes('inconsistentes')));
});

test('liguilla conserva clasificación provisional y no convierte tabla cambiante en desempate definitivo', async t => {
  const data = liguillaData();
  data.matches[0].events = [phase('start')];
  const { client } = await fixture(t, { read: async path => data[path] });
  const league = (await client.callTool({ name: 'consultar_liguilla', arguments: {} })).structuredContent;
  assert.equal(league.clasificacion.provisional, true);
  assert.equal(league.crucesProvisionales, true);
  assert.equal(league.rondas[0].llaves[0].ganador, null);
  assert.ok(league.advertencias.some(message => message.includes('tabla todavía provisional')));
  const finishedButIncomplete = liguillaData();
  delete finishedButIncomplete.matches[0];
  const { client: incomplete } = await fixture(t, { read: async path => finishedButIncomplete[path] });
  const other = (await incomplete.callTool({ name: 'consultar_liguilla', arguments: {} })).structuredContent;
  assert.equal(other.crucesProvisionales, true);
  assert.equal(other.rondas[0].llaves[0].ganador, null);
});

test('nuevas consultas de torneo renuevan lecturas y fallan sin respuestas antiguas ni diagnósticos internos', async t => {
  const data = statisticsData();
  let failed = false;
  let tick = 0;
  const { client } = await fixture(t, { now: () => new Date(NOW.getTime() + ++tick * 1000), read: async path => {
    if (failed) throw new Error('private database credentials');
    return data[path];
  } });
  for (const [name, args] of [['consultar_estadisticas', {}], ['consultar_jugador', { equipo: 'América', dorsal: 9 }], ['consultar_liguilla', {}]]) {
    const first = await client.callTool({ name, arguments: args });
    const second = await client.callTool({ name, arguments: args });
    assert.ok(!first.isError && !second.isError);
    assert.ok(second.structuredContent.consultadoEn > first.structuredContent.consultadoEn);
  }
  failed = true;
  for (const [name, args] of [['consultar_estadisticas', {}], ['consultar_jugador', { equipo: 'América', dorsal: 9 }], ['consultar_liguilla', {}]]) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, true);
    assert.equal(result.structuredContent, undefined);
    assert.doesNotMatch(result.content[0].text, /private|credentials/);
  }
});

test('escenarios por MCP conserva structuredContent, hora de lectura y calendario no verificable sin consultar jugadores', async t => {
  const reads = [];
  const { client } = await fixture(t, { read: async path => { reads.push(path); return defaultRead(path); } });
  const response = await client.callTool({ name: 'consultar_escenarios', arguments: {} });
  assert.ok(!response.isError);
  assert.equal(response.structuredContent.estado, 'no_verificable');
  assert.equal(response.structuredContent.consultadoEn, NOW.toISOString());
  assert.deepEqual(JSON.parse(response.content[0].text), response.structuredContent);
  assert.deepEqual(reads, ['matches', 'teams']);
});

test('un análisis pendiente no bloquea las consultas anteriores del MCP', async t => {
  let release;
  let started;
  const began = new Promise(resolve => { started = resolve; });
  const block = new Promise(resolve => { release = resolve; });
  const { client } = await fixture(t, { scenarioRunner: async report => { started(); await block; return report; } });
  const analysis = client.callTool({ name: 'consultar_escenarios', arguments: {} });
  await began;
  try {
    const round = await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 15 } });
    assert.ok(!round.isError);
    assert.equal(round.structuredContent.partidos.length, 3);
  } finally { release(); }
  assert.ok(!(await analysis).isError);
});
