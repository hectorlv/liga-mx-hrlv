#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { pathToFileURL } from 'node:url';
import * as z from 'zod/v4';
import { LigaBrowserController, TABS } from './browser-controller.mjs';

const INSTRUCTIONS = `Este servidor controla solamente la UI local de Liga MX HRLV, pero esa UI usa el backend Firebase de producción. Nunca intentes persistir cambios con liga_edit: usa liga_commit y solicita aprobación justo antes. Confirma el partido, equipo y valores visibles antes de guardar. No navegues a dominios externos ni solicites credenciales en argumentos; liga_login_admin las obtiene del entorno. Después de una acción, inspecciona mensajes y errores.`;

const textResult = value => ({
  content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});

const toolError = error => ({
  isError: true,
  content: [
    {
      type: 'text',
      text: error instanceof Error ? error.message : String(error),
    },
  ],
});

export function createLigaMcpServer({
  controller = new LigaBrowserController(),
} = {}) {
  const server = new McpServer(
    { name: 'liga-mx-hrlv-local', version: '1.0.0' },
    { instructions: INSTRUCTIONS },
  );

  const register = (name, config, handler) => {
    server.registerTool(name, config, async args => {
      try {
        return await handler(args);
      } catch (error) {
        return toolError(error);
      }
    });
  };

  register(
    'liga_open',
    {
      description: 'Abre o restaura la UI local y devuelve su estado visible.',
      inputSchema: {
        tab: z.enum(TABS).optional().default('Inicio'),
        viewport: z.enum(['desktop', 'mobile']).optional().default('desktop'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    args => controller.open(args).then(textResult),
  );

  register(
    'liga_inspect',
    {
      description: 'Lee la pestaña, autenticación, avisos y errores de la UI.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    () => controller.inspect().then(textResult),
  );

  register(
    'liga_screenshot',
    {
      description:
        'Captura la página completa o un elemento por nombre accesible.',
      inputSchema: {
        fullPage: z.boolean().optional().default(true),
        by: z.enum(['role', 'label', 'text']).optional(),
        name: z.string().min(1).optional(),
        role: z.string().optional(),
        scope: z.enum(['page', 'goals', 'cards']).optional().default('page'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async args => ({
      content: [
        {
          type: 'image',
          mimeType: 'image/png',
          data: await controller.screenshot(args),
        },
      ],
    }),
  );

  register(
    'liga_navigate',
    {
      description: 'Navega solo entre pestañas y detalles internos permitidos.',
      inputSchema: {
        tab: z.enum(TABS).optional(),
        matchId: z.string().regex(/^\d+$/u).optional(),
        team: z.string().min(1).max(80).optional(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    args => controller.navigate(args).then(textResult),
  );

  register(
    'liga_edit',
    {
      description:
        'Prepara controles no persistentes; nunca guarda ni abre enlaces.',
      inputSchema: {
        action: z.enum(['click', 'fill', 'select', 'check']),
        by: z.enum(['role', 'label', 'text']),
        name: z.string().min(1).max(160),
        role: z.string().optional(),
        scope: z.enum(['page', 'goals', 'cards']).optional().default('page'),
        value: z.string().max(2_000).optional(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    args => controller.edit(args).then(textResult),
  );

  register(
    'liga_login_admin',
    {
      description:
        'Inicia sesión desde variables de entorno, sin revelar secretos.',
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    () => controller.loginAdmin().then(textResult),
  );

  register(
    'liga_logout',
    {
      description: 'Cierra la sesión Firebase conservada por el navegador MCP.',
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    () => controller.logout().then(textResult),
  );

  register(
    'liga_commit',
    {
      description:
        'Activa un control persistente después de aprobación explícita.',
      inputSchema: {
        name: z.string().min(1).max(160),
        summary: z.string().min(8).max(500),
        scope: z.enum(['page', 'goals', 'cards']).optional().default('page'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    args => controller.commit(args).then(textResult),
  );

  return { server, controller };
}

export async function run() {
  const { server, controller } = createLigaMcpServer();
  const transport = new StdioServerTransport();
  const shutdown = async () => {
    await controller.close();
    await server.close();
  };
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  await server.connect(transport);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch(error => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
