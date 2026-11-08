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
  assert.deepEqual(tools.map(tool => tool.name), ['consultar_jornada', 'consultar_tabla', 'consultar_partido', 'consultar_equipo', 'consultar_calendario', 'consultar_estadisticas', 'consultar_jugador', 'consultar_liguilla', 'consultar_escenarios']);
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
  const call = async (name, args) => {
    const response = await client.callTool({ name, arguments: args });
    assert.ok(!response.isError, JSON.stringify(response));
    assert.deepEqual(JSON.parse(response.content[0].text), response.structuredContent);
    const data = response.structuredContent;
    const firstAge = age(data.consultadoEn);
    const repeated = await client.callTool({ name, arguments: args });
    assert.ok(!repeated.isError);
    assert.ok(repeated.structuredContent.consultadoEn > data.consultadoEn);
    age(repeated.structuredContent.consultadoEn);
    if (name === 'consultar_escenarios') {
      assert.equal(repeated.structuredContent.estado, 'completo');
      assert.ok(repeated.structuredContent.duracionAnalisisMs <= 20_000);
    }
    evidence.calls.push({ name, args, consultadoEn: data.consultadoEn, ageSeconds: firstAge, repeatedAt: repeated.structuredContent.consultadoEn });
    return data;
  };
  const calendar = await call('consultar_calendario', {});
  assert.ok(calendar.partidos.length > 0);
  assert.ok(calendar.partidos.every(item => !('events' in item) && !('lineupLocal' in item)));
  const selected = calendar.partidos.find(item => item.estado === 'finished' && item.jornada <= 17 && item.golLocal != null && item.golVisitante != null);
  assert.ok(selected);
  const detail = await call('consultar_partido', { idMatch: selected.idMatch });
  for (const [key, value] of Object.entries(selected)) assert.equal(detail.partido[key], value);
  assert.ok(Array.isArray(detail.eventos) && Array.isArray(detail.alineaciones.local));
  const team = await call('consultar_equipo', { equipo: selected.local });
  const eligible = calendar.partidos.filter(item => item.jornada >= 1 && item.jornada <= 17 && item.estado === 'finished' &&
    item.golLocal != null && item.golVisitante != null && (item.local === selected.local || item.visitante === selected.local));
  assert.equal(team.fase, 'regular');
  assert.equal(team.estadisticas.total.jj, eligible.length);
  assert.equal(team.estadisticas.total.jj, team.estadisticas.local.jj + team.estadisticas.visitante.jj);
  assert.equal(team.estadisticas.total.pts, team.estadisticas.total.jg * 3 + team.estadisticas.total.je);
  assert.equal(team.ultimosCinco.length, Math.min(5, eligible.length));
  assert.ok(team.proximosCinco.every(item => ['scheduled', 'postponed'].includes(item.estado)));
  assert.ok(team.plantilla?.every(item => !('birthDate' in item) && !('imgSrc' in item) && !item.historical));
  const filtered = await call('consultar_calendario', { equipo: selected.local, jornadaDesde: selected.jornada, jornadaHasta: selected.jornada });
  assert.ok(filtered.partidos.some(item => item.idMatch === selected.idMatch));
  const other = await call('consultar_equipo', { equipo: selected.visitante });
  evidence.extended = { calendario: calendar.partidos.length, partido: detail, equipo: team, comparativa: other, filtrados: filtered.partidos.length };
  const ranking = await call('consultar_estadisticas', { metrica: 'goleadores', limite: 3 });
  assert.equal(ranking.entidad, 'jugadores');
  assert.ok(ranking.ranking.length > 0);
  assert.ok(ranking.ranking.every((row, index, rows) => row.valor > 0 && (!index || row.valor <= rows[index - 1].valor)));
  const resolved = ranking.ranking.find(row => row.jugador.identidad === 'resuelta');
  assert.ok(resolved);
  const player = await call('consultar_jugador', { equipo: resolved.jugador.equipo, dorsal: resolved.jugador.number });
  assert.equal(player.estadisticas.goles, resolved.valor);
  assert.equal(player.historial.reduce((sum, row) => sum + row.estadisticas.goles, 0), player.estadisticas.goles);
  assert.equal(player.historial.reduce((sum, row) => sum + row.estadisticas.minutos, 0), player.estadisticas.minutos);
  assert.doesNotMatch(JSON.stringify(player.jugador), /birthDate|profileUrl|imgSrc/);
  const defense = await call('consultar_estadisticas', { metrica: 'defensivas', limite: 3 });
  assert.equal(defense.entidad, 'equipos');
  assert.ok(defense.ranking.every((row, index, rows) => row.estadisticas.total.jj > 0 && (!index || row.valor >= rows[index - 1].valor)));
  const league = await call('consultar_liguilla', {});
  const { torneo, zonaHoraria, consultadoEn, aviso, ...classification } = await call('consultar_tabla', {});
  assert.deepEqual(league.clasificacion, classification);
  assert.deepEqual(league.rondas.map(round => round.llaves.length), [4, 2, 1]);
  for (const round of league.rondas) for (const series of round.llaves) {
    if (series.ganador) assert.ok(series.ida.estado === 'finished' && series.vuelta.estado === 'finished' && !series.globalProvisional);
  }
  evidence.tournament = { goleadores: ranking, jugador: player, defensivas: defense, liguilla: league, clasificacionIgualATabla: true };
  const scenarios = await call('consultar_escenarios', {});
  assert.equal(scenarios.estado, 'completo');
  assert.equal(scenarios.exclusionesVerificadas, true);
  assert.ok(scenarios.duracionAnalisisMs <= 20_000);
  assert.equal(scenarios.casosPendientes.length, 0);
  assert.equal(scenarios.plazasDisponibles, scenarios.plazasTotales - scenarios.clasificadosAsegurados.length);
  assert.ok(scenarios.candidatos.every(team => !scenarios.clasificadosAsegurados.includes(team) && !scenarios.eliminadosAsegurados.includes(team)));
  assert.deepEqual(scenarios.equipos.map(team => team.equipo), scenarios.candidatos);
  assert.ok(scenarios.equipos.every(team => team.casos.every(row => row.estado !== 'no_verificado')));
  assert.ok(scenarios.equipos.every(team => team.casos.every(row => !('testigos' in row))));
  evidence.scenarios = scenarios;
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await client.close();
}
