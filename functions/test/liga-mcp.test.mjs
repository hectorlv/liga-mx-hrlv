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

async function fixture(t, { read = defaultRead, now = () => NOW, logInfo = () => {}, logError = () => {} } = {}) {
  const handler = createLigaMcpHandler(read, { now, logInfo, logError });
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

test('cliente HTTP real descubre solo las dos herramientas públicas de lectura y no mantiene sesiones', async t => {
  let reads = 0;
  const { client, receipts } = await fixture(t, { read: async () => { reads++; return matches; } });
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['consultar_jornada', 'consultar_tabla']);
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
