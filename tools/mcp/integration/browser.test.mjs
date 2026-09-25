import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LigaBrowserController } from '../browser-controller.mjs';

const FIXTURE = `<!doctype html>
<html lang="es">
  <head><meta charset="utf-8"><title>Fixture Liga MX</title></head>
  <body>
    <liga-mx-hrlv></liga-mx-hrlv>
    <label>Minuto <input aria-label="Minuto"></label>
    <button type="button" aria-label="Acción segura">Acción segura</button>
    <button type="button">Guardar</button>
    <a href="https://example.com">Sitio externo</a>
    <script>
      customElements.define('liga-mx-hrlv', class extends HTMLElement {
        constructor() {
          super();
          this.selectedTab = new URL(location.href).searchParams.get('tab') || 'Inicio';
          this.user = null;
          this.isAdmin = false;
        }
      });
    </script>
  </body>
</html>`;

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

test('controla una página local, conserva perfil y aplica barreras', async () => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(FIXTURE);
  });
  const port = await listen(server);
  const profileDir = await mkdtemp(path.join(tmpdir(), 'liga-mcp-profile-'));
  const artifactDir = await mkdtemp(path.join(tmpdir(), 'liga-mcp-artifacts-'));
  const options = {
    baseUrl: `http://127.0.0.1:${port}/`,
    profileDir,
    artifactDir,
  };
  const first = new LigaBrowserController(options);
  first.ensureAppServer = async () => ({ reused: true });

  try {
    const opened = await first.open({ tab: 'Inicio', viewport: 'mobile' });
    assert.equal(opened.selectedTab, 'Inicio');
    assert.deepEqual(first.page.viewportSize(), { width: 390, height: 844 });

    await first.edit({
      action: 'fill',
      by: 'label',
      name: 'Minuto',
      value: '45',
    });
    assert.equal(await first.page.getByLabel('Minuto').inputValue(), '45');
    await assert.rejects(
      first.edit({
        action: 'click',
        by: 'role',
        role: 'button',
        name: 'Guardar',
      }),
      /liga_commit/u,
    );
    await assert.rejects(
      first.edit({
        action: 'click',
        by: 'role',
        role: 'link',
        name: 'Sitio externo',
      }),
      /no abre enlaces/u,
    );
    const screenshot = await first.screenshot({ fullPage: false });
    assert.ok(Buffer.from(screenshot, 'base64').length > 100);
    await first.page.evaluate(() =>
      localStorage.setItem('mcp-session-test', 'persisted'),
    );
    await first.close();

    const second = new LigaBrowserController(options);
    second.ensureAppServer = async () => ({ reused: true });
    try {
      await second.open({ tab: 'Tabla General' });
      assert.equal(
        await second.page.evaluate(() =>
          localStorage.getItem('mcp-session-test'),
        ),
        'persisted',
      );
    } finally {
      await second.close();
    }
  } finally {
    await first.close();
    await new Promise(resolve => server.close(resolve));
    await rm(profileDir, { recursive: true, force: true });
    await rm(artifactDir, { recursive: true, force: true });
  }
});
