import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as z from 'zod/v4';
import { PublicDataError } from './generated/public-data.js';
import { createPublicDataLoader } from './public-data-service.js';

const INSTRUCTIONS = 'Consulta los datos públicos actuales de Liga MX HRLV. Cada llamada lee Firebase de nuevo. Usa consultar_jornada y consultar_tabla para jornadas, posiciones y las banderas existentes de clasificado/eliminado/playin; consultar_partido para eventos y alineaciones; consultar_equipo para plantilla, estadísticas finalizadas, racha y pendientes; consultar_calendario para buscar encuentros e IDs; consultar_estadisticas para rankings; consultar_jugador para datos y estadísticas por equipo y dorsal; consultar_liguilla para llaves registradas, globales y ganadores confirmados. Usa consultar_escenarios para el informe conjunto de candidatos y condiciones de clasificación; conserva sus supuestos, cobertura y estado completo/parcial/no_verificable. No rehagas los cálculos del servidor ni inventes combinaciones. consultadoEn es el momento de lectura, no de edición. Conserva estados, marcadores pendientes, penales, advertencias, cobertura y provisionalidad. Solo finished significa finalizado. La fase estadística por defecto es regular. Este servidor solo ofrece lectura y no controla la administración local.';
const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function createLigaMcpServer(readPath, {
  now = () => new Date(), logError = console.error, logInfo = console.info, scenarioRunner,
} = {}) {
  const server = new McpServer({ name: 'liga-mx-public-data', version: '1.3.0' }, { instructions: INSTRUCTIONS });
  const loadData = createPublicDataLoader(readPath, { now, scenarioRunner });
  const register = (name, title, description, inputSchema, route) => {
    server.registerTool(name, {
      title, description, inputSchema,
      annotations: ANNOTATIONS,
      _meta: { securitySchemes: [{ type: 'noauth' }] },
    }, async args => {
      const started = performance.now();
      try {
        const data = await loadData(route(args));
        const analysis = name === 'consultar_escenarios' ? { analysisStatus: data.estado,
          candidates: data.candidatos.length, pendingCases: data.casosPendientes?.length ?? null } : {};
        logInfo('Liga MCP tool', { tool: name, status: 'ok', durationMs: Math.round(performance.now() - started), ...analysis });
        return { structuredContent: data, content: [{ type: 'text', text: JSON.stringify(data) }] };
      } catch (error) {
        const known = error instanceof PublicDataError;
        if (!known) logError('Liga MCP data read failed', error);
        const code = known ? error.code : 'data_unavailable';
        const message = known ? error.message : 'No se pudieron consultar los datos. Inténtalo de nuevo.';
        logInfo('Liga MCP tool', { tool: name, status: 'error', code, durationMs: Math.round(performance.now() - started) });
        const candidates = known && error.candidates ? { candidatos: error.candidates } : {};
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: { code, message, ...candidates } }) }] };
      }
    });
  };
  register('consultar_jornada', 'Consultar jornada de Liga MX',
    'Usa esta herramienta para obtener el calendario, estados y resultados actuales de una jornada de Liga MX HRLV antes de redactar una previa, resumen diario o cierre. Indica la jornada solicitada por el usuario.',
    z.object({ jornada: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).describe('Número de jornada indicado por el usuario; también admite jornadas de liguilla.') }).strict(),
    ({ jornada }) => ({ format: 'json', jornada }));
  register('consultar_tabla', 'Consultar tabla general de Liga MX',
    'Obtiene posiciones, puntos, estadísticas, provisionalidad y banderas clasificado/eliminado/playin calculadas por la app. Úsala para tabla o publicaciones de clasificados y eliminados. Conserva las banderas; si provisional es true no anuncies confirmaciones. Una bandera false no demuestra el estado opuesto. No recalcules clasificación ni combinaciones.',
    z.object({}).strict(), () => ({ format: 'json' }));
  const positive = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
  const team = z.string().trim().min(1).max(120).describe('Nombre canónico del equipo; admite diferencias de mayúsculas y acentos si la coincidencia es única.');
  register('consultar_partido', 'Consultar detalle de un partido',
    'Obtiene marcador, estado, penales, alineaciones y eventos registrados para una crónica. Conserva advertencias e identidades no resueltas. Obtén idMatch mediante consultar_jornada o consultar_calendario; nunca inventes un ID.',
    z.object({ idMatch: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).describe('Clave persistente del partido devuelta por jornada o calendario; puede ser cero.') }).strict(),
    args => ({ tipo: 'partido', ...args }));
  register('consultar_equipo', 'Consultar equipo, estadísticas y racha',
    'Obtiene plantilla vigente, estadísticas totales y local/visitante, últimos cinco resultados y próximos cinco pendientes de un equipo. Solo cuentan finalizados con marcador completo. Fase regular por defecto; admite liguilla o todas. No confirma clasificación. Para comparar equipos consulta cada uno con la misma fase.',
    z.object({ equipo: team, fase: z.enum(['regular', 'liguilla', 'todas']).optional().describe('Alcance de estadísticas, racha y pendientes. Por defecto: regular. La plantilla siempre es vigente.') }).strict(),
    args => ({ tipo: 'equipo', ...args }));
  register('consultar_calendario', 'Consultar calendario y buscar partidos',
    'Busca partidos e IDs del torneo vigente, de varias jornadas o un equipo. Filtros combinados e inclusivos; fechas CDMX. Sin filtros devuelve todo el calendario registrado. Los pendientes pueden estar programados o aplazados, incluso con fecha pasada: consulta ambos estados o filtra el calendario completo. No contiene eventos ni alineaciones.',
    z.object({
      equipo: team.optional(), jornadaDesde: positive.optional(), jornadaHasta: positive.optional(),
      fechaDesde: z.iso.date().optional().describe('Fecha inclusiva YYYY-MM-DD en America/Mexico_City.'),
      fechaHasta: z.iso.date().optional().describe('Fecha inclusiva YYYY-MM-DD en America/Mexico_City.'),
      estado: z.enum(['scheduled', 'live', 'finished', 'postponed', 'cancelled']).optional(),
    }).strict().refine(args => args.jornadaDesde === undefined || args.jornadaHasta === undefined || args.jornadaDesde <= args.jornadaHasta,
      'jornadaDesde no puede superar jornadaHasta.').refine(args => !args.fechaDesde || !args.fechaHasta || args.fechaDesde <= args.fechaHasta,
      'fechaDesde no puede superar fechaHasta.'),
    args => ({ tipo: 'calendario', ...args }));
  const phase = z.enum(['regular', 'liguilla', 'todas']).optional().describe('Fase regular por defecto; elige liguilla o todas solo si se solicita ese alcance.');
  register('consultar_estadisticas', 'Consultar rankings de equipos y jugadores',
    'Obtiene rankings por una métrica, solo con partidos finalizados y marcador completo. Goleadores/asistencias/amarillas/rojas/participaciones/minutos son por equipo y dorsal; las identidades ambiguas quedan sin nombre. Ofensivas/defensivas/porterías cero/puntos local o visitante son por equipo. Conserva cobertura, empates en posiciones y advertencias. No confundir ausencia de registros con cero real.',
    z.object({
      metrica: z.enum(['goleadores', 'asistencias', 'amarillas', 'rojas', 'participaciones', 'minutos', 'ofensivas', 'defensivas', 'porterias_cero', 'puntos_local', 'puntos_visitante']).optional().describe('Por defecto goleadores; defensivas ordena menor GC primero; las demás, mayor valor primero.'),
      fase: phase, equipo: team.optional(), limite: positive.max(50).optional().describe('Máximo de filas, de 1 a 50; por defecto 10. El límite puede recortar un empate.'),
    }).strict(), args => ({ tipo: 'estadisticas', ...args }));
  register('consultar_jugador', 'Consultar jugador y estadísticas individuales',
    'Obtiene datos deportivos, goles, asistencias, autogoles, tarjetas, participaciones, minutos e historial por equipo y dorsal. Indica equipo y exactamente uno: jugador (nombre corto o completo exacto), dorsal o idJugador recibido de otra consulta. No inventes IDs. No se combinan traslados; si el dorsal es compartido no se atribuyen estadísticas al nombre. Fase regular por defecto.',
    z.object({ equipo: team, jugador: z.string().trim().min(1).max(200).optional(),
      dorsal: z.number().int().nonnegative().max(999).optional(),
      idJugador: z.string().trim().min(1).max(120).optional(), fase: phase,
    }).strict().refine(args => [args.jugador, args.dorsal, args.idJugador].filter(value => value !== undefined).length === 1,
      'Indica exactamente uno de jugador, dorsal o idJugador.'), args => ({ tipo: 'jugador', ...args }));
  register('consultar_liguilla', 'Consultar llaves, globales y clasificación existente',
    'Obtiene llaves registradas de cuartos, semifinales y final, ida/vuelta, globales, penales separados y ganador confirmado solo tras ambos partidos finalizados. Conserva crucesProvisionales, globalProvisional y advertencias; no presentes cruces registrados provisionales como clasificados. Incluye clasificacion con las mismas posiciones, banderas y provisionalidad que consultar_tabla. No calcula combinaciones ni proyecta cruces nuevos.',
    z.object({}).strict(), () => ({ tipo: 'liguilla' }));
  register('consultar_escenarios', 'Consultar condiciones de clasificación de todos los candidatos',
    'Informe conjunto de los equipos que siguen peleando plazas de liguilla. Parte solo de finalizados, conserva partidos pendientes contra clasificados/eliminados y verifica los enfrentamientos directos. Agrupa por puntos sumados y balances posibles. estado completo/parcial/no_verificable y cada caso distingue asegura_su_lugar, depende_de_otros_resultados, sin_opcion_bajo_este_caso o no_verificado. Conserva los supuestos de los márgenes acumulados de goles: una condición para superar a un rival no asegura por sí sola la clasificación. No conviertas informes parciales, unknown o empates totales en conclusiones definitivas. Los ejemplos son hipotéticos, no resultados reales ni predicciones. Puede tardar hasta 20 segundos.',
    z.object({}).strict(), () => ({ tipo: 'escenarios' }));
  return server;
}

export function createLigaMcpHandler(readPath, options = {}) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'private, no-store, max-age=0');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const path = request.path ?? new URL(request.url, 'https://localhost').pathname;
    if (path !== '/mcp') {
      response.statusCode = 404;
      response.end();
      return;
    }
    // Solo POST: no mantenemos streams SSE ni sesiones entre instancias.
    if (request.method !== 'POST') {
      response.statusCode = 405;
      response.setHeader('Allow', 'POST');
      response.end();
      return;
    }
    // Los clientes servidor-a-servidor no envían Origin. Si está presente,
    // solo aceptamos el cliente ChatGPT; no habilitamos llamadas desde otras webs.
    if (request.headers.origin && request.headers.origin !== 'https://chatgpt.com') {
      response.statusCode = 403;
      response.end();
      return;
    }
    const server = createLigaMcpServer(readPath, options);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    const started = performance.now();
    try {
      await server.connect(transport);
      // Firebase ya interpretó el cuerpo JSON: no volver a consumir el stream.
      await transport.handleRequest(request, response, request.body);
    } catch (error) {
      (options.logError ?? console.error)('Liga MCP request failed', error);
      if (!response.headersSent) {
        response.statusCode = 500;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'No se pudo procesar la solicitud MCP.' } }));
      } else if (!response.writableEnded) response.end();
    } finally {
      await server.close();
      const method = ['initialize', 'tools/list', 'tools/call', 'notifications/initialized'].includes(request.body?.method)
        ? request.body.method : 'other';
      (options.logInfo ?? console.info)('Liga MCP request', { method, status: response.statusCode, durationMs: Math.round(performance.now() - started) });
    }
  };
}
