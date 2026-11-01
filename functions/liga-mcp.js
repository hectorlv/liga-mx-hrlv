import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as z from 'zod/v4';
import { PublicDataError } from './generated/public-data.js';
import { createPublicDataLoader } from './public-data-service.js';

const INSTRUCTIONS = 'Consulta los datos públicos actuales de Liga MX HRLV. Cada llamada lee Firebase de nuevo. Usa consultar_jornada con la jornada solicitada y consultar_tabla para la tabla general. consultadoEn es el momento de lectura, no de edición. Conserva estados, marcadores pendientes, penales y provisionalidad. Solo finished significa finalizado. Este servidor solo ofrece lectura y no controla la administración local.';
const ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

export function createLigaMcpServer(readPath, {
  now = () => new Date(), logError = console.error, logInfo = console.info,
} = {}) {
  const server = new McpServer({ name: 'liga-mx-public-data', version: '1.0.0' }, { instructions: INSTRUCTIONS });
  const loadData = createPublicDataLoader(readPath, { now });
  const register = (name, title, description, inputSchema, route) => {
    server.registerTool(name, {
      title, description, inputSchema,
      annotations: ANNOTATIONS,
      _meta: { securitySchemes: [{ type: 'noauth' }] },
    }, async args => {
      const started = performance.now();
      try {
        const data = await loadData(route(args));
        logInfo('Liga MCP tool', { tool: name, status: 'ok', durationMs: Math.round(performance.now() - started) });
        return { structuredContent: data, content: [{ type: 'text', text: JSON.stringify(data) }] };
      } catch (error) {
        const known = error instanceof PublicDataError;
        if (!known) logError('Liga MCP data read failed', error);
        const code = known ? error.code : 'data_unavailable';
        const message = known ? error.message : 'No se pudieron consultar los datos. Inténtalo de nuevo.';
        logInfo('Liga MCP tool', { tool: name, status: 'error', code, durationMs: Math.round(performance.now() - started) });
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }] };
      }
    });
  };
  register('consultar_jornada', 'Consultar jornada de Liga MX',
    'Usa esta herramienta para obtener el calendario, estados y resultados actuales de una jornada de Liga MX HRLV antes de redactar una previa, resumen diario o cierre. Indica la jornada solicitada por el usuario.',
    z.object({ jornada: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).describe('Número de jornada indicado por el usuario; también admite jornadas de liguilla.') }).strict(),
    ({ jornada }) => ({ format: 'json', jornada }));
  register('consultar_tabla', 'Consultar tabla general de Liga MX',
    'Usa esta herramienta para obtener las posiciones, puntos, estadísticas y provisionalidad actuales de la tabla general de Liga MX HRLV antes de redactar su copy. No recalcules la clasificación.',
    z.object({}).strict(), () => ({ format: 'json' }));
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
