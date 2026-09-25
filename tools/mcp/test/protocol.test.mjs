import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLigaMcpServer } from '../server.mjs';

const expectedTools = [
  'liga_commit',
  'liga_edit',
  'liga_inspect',
  'liga_login_admin',
  'liga_logout',
  'liga_navigate',
  'liga_open',
  'liga_screenshot',
];
const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

function fakeController() {
  const state = {
    url: 'http://127.0.0.1:8011/',
    selectedTab: 'Inicio',
    authenticated: false,
    isAdmin: false,
    messages: [],
    consoleErrors: [],
    networkErrors: [],
  };
  return {
    open: async () => state,
    inspect: async () => state,
    screenshot: async () => Buffer.from('png').toString('base64'),
    navigate: async () => state,
    edit: async () => state,
    loginAdmin: async () => ({ ...state, authenticated: true, isAdmin: true }),
    logout: async () => state,
    commit: async args => ({ summary: args.summary, inspection: state }),
    close: async () => {},
  };
}

test('inicializa por MCP, lista esquemas y responde sin secretos', async () => {
  const controller = fakeController();
  const { server } = createLigaMcpServer({ controller });
  const client = new Client({ name: 'liga-mx-test', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), expectedTools);
  const commit = tools.find(tool => tool.name === 'liga_commit');
  assert.equal(commit.annotations?.destructiveHint, true);
  assert.equal(commit.annotations?.readOnlyHint, false);

  const result = await client.callTool({ name: 'liga_inspect', arguments: {} });
  const serialized = JSON.stringify(result);
  assert.match(serialized, /127\.0\.0\.1:8011/u);
  assert.doesNotMatch(serialized, /LIGA_MX_ADMIN_PASSWORD/u);

  await client.close();
  await server.close();
});

test('valida argumentos antes de invocar el controlador', async () => {
  const { server } = createLigaMcpServer({ controller: fakeController() });
  const client = new Client({ name: 'liga-mx-test', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  const result = await client.callTool({
    name: 'liga_navigate',
    arguments: { tab: 'Sitio externo' },
  });
  assert.equal(result.isError, true);

  await client.close();
  await server.close();
});

test('inicializa el servidor real mediante STDIO', async () => {
  const client = new Client({ name: 'liga-mx-stdio-test', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['tools/mcp/server.mjs'],
    cwd: REPO_ROOT,
    stderr: 'pipe',
  });
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), expectedTools);
  await client.close();
});
