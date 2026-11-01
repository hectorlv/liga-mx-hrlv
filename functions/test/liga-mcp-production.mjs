import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = new URL(process.argv[2]);
assert.equal(endpoint.protocol, 'https:');
assert.ok(endpoint.pathname.endsWith('/mcp'));
const client = new Client({ name: 'liga-mcp-production-check', version: '1.0.0' });
const evidence = { endpoint: endpoint.href, checkedAt: new Date().toISOString(), requests: [], tools: [], calls: [] };
const observedFetch = async (input, init) => {
  const response = await fetch(input, init);
  evidence.requests.push({ status: response.status, cacheControl: response.headers.get('cache-control'), sessionId: response.headers.get('mcp-session-id') });
  assert.equal(response.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal(response.headers.get('mcp-session-id'), null);
  return response;
};
const age = stamp => {
  const seconds = (Date.now() - Date.parse(stamp)) / 1000;
  assert.ok(seconds >= -5 && seconds <= 120, `Antigüedad inválida: ${stamp}`);
  return Number(seconds.toFixed(2));
};
const withoutStamp = ({ consultadoEn, ...data }) => data;
try {
  await client.connect(new StreamableHTTPClientTransport(endpoint, { fetch: observedFetch }));
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name), ['consultar_jornada', 'consultar_tabla']);
  assert.ok(tools.every(tool => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
  evidence.tools = tools.map(({ name, annotations }) => ({ name, annotations }));
  for (const [name, args, path, collection, count] of [
    ['consultar_jornada', { jornada: 15 }, '/api/jornadas/15.json', 'partidos', 9],
    ['consultar_tabla', {}, '/api/tabla.json', 'posiciones', 18],
  ]) {
    const first = await client.callTool({ name, arguments: args });
    assert.ok(!first.isError);
    const data = first.structuredContent;
    assert.equal(data[collection].length, count);
    assert.deepEqual(JSON.parse(first.content[0].text), data);
    const firstAge = age(data.consultadoEn);
    const response = await fetch(`https://ligamx-b16f7.firebaseapp.com${path}`, { cache: 'no-store' });
    assert.equal(response.status, 200);
    const direct = await response.json();
    age(direct.consultadoEn);
    // Si hay una edición deportiva durante esta comparación, volver a ejecutar la comprobación.
    assert.deepEqual(withoutStamp(data), withoutStamp(direct));
    const repeated = await client.callTool({ name, arguments: args });
    assert.ok(!repeated.isError);
    assert.ok(repeated.structuredContent.consultadoEn > data.consultadoEn);
    evidence.calls.push({ name, count, consultadoEn: data.consultadoEn, ageSeconds: firstAge, repeatedAt: repeated.structuredContent.consultadoEn, repeatAgeSeconds: age(repeated.structuredContent.consultadoEn), matchesHttpApi: true });
  }
  const absent = await client.callTool({ name: 'consultar_jornada', arguments: { jornada: 999 } });
  assert.equal(absent.isError, true);
  assert.equal(JSON.parse(absent.content[0].text).error.code, 'jornada_not_found');
  evidence.absentJornadaErrorVerified = true;
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await client.close();
}
