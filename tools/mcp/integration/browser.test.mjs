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
    <goals-card>
      <label>Minuto <input aria-label="Minuto"></label>
      <md-outlined-select aria-label="Anotador" role="combobox">
        <md-select-option value="9">9- Delantero</md-select-option>
      </md-outlined-select>
      <button type="button">Agregar</button>
    </goals-card>
    <cards-card>
      <label>Minuto <input aria-label="Minuto"></label>
      <button type="button">Agregar Tarjeta</button>
    </cards-card>
    <button type="button" aria-label="Acción segura">Acción segura</button>
    <button type="button">Guardar</button>
    <a href="https://example.com">Sitio externo</a>
    <md-filled-button id="lineup-save"><md-icon slot="icon">save</md-icon>Guardar Alineaciones</md-filled-button>
    <span id="save-label" hidden>Guardar marcador</span>
    <button aria-labelledby="save-label"><span>etiqueta-hija</span></button>
    <div role="button" aria-labelledby="save-label"><button aria-label="Acción anidada"><span>boton-hijo-etiquetado</span></button></div>
    <a href="https://example.com"><span role="button" aria-label="Acción aparente">enlace-hijo</span></a>
    <a href="/?tab=Calendario"><span>enlace-local-hijo</span></a>
    <button aria-label="Acción segura con hijo"><span>hijo-seguro</span></button>
    <label><input type="checkbox" aria-label="Casilla segura">casilla-hija</label>
    <div id="auth-controls"></div>
    <div id="login-panel" hidden>
      <label>Correo electrónico <input type="email"></label>
      <label>Contraseña <input type="password"></label>
      <button id="login-submit">Ingresar</button>
    </div>
    <script>
      customElements.define('md-filled-button', class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML = '<button><slot name="icon"></slot><slot></slot></button>';
        }
      });
      customElements.define('md-icon', class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' }).innerHTML = '<slot></slot>';
        }
      });
      customElements.define('liga-mx-hrlv', class extends HTMLElement {
        constructor() {
          super();
          this.selectedTab = new URL(location.href).searchParams.get('tab') || 'Inicio';
          this.user = null;
          this.isAdmin = false;
        }
      });
      window.writeClicks = 0;
      window.safeClicks = 0;
      window.authEvents = [];
      document.querySelector('#lineup-save').addEventListener('click', () => { window.writeClicks += 1; });
      document.querySelector('[aria-labelledby="save-label"]').addEventListener('click', () => { window.writeClicks += 1; });
      document.querySelector('div[aria-labelledby="save-label"]').addEventListener('click', () => { window.writeClicks += 1; });
      document.querySelector('[aria-label="Acción segura con hijo"]').addEventListener('click', () => { window.safeClicks += 1; });
      window.renderAuth = () => {
        const app = document.querySelector('liga-mx-hrlv');
        const auth = document.querySelector('#auth-controls');
        auth.innerHTML = app.user
          ? '<span>' + (app.isAdmin ? 'Admin' : 'Sin permisos') + '</span><button>Cerrar sesión</button>'
          : '<button>Abrir acceso admin</button>';
        auth.querySelector('button').onclick = () => {
          if (app.user) {
            window.authEvents.push('logout');
            app.user = null;
            app.isAdmin = false;
            window.renderAuth();
          } else {
            window.authEvents.push('open-login');
            document.querySelector('#login-panel').hidden = false;
          }
        };
      };
      document.querySelector('#login-submit').onclick = () => {
        const app = document.querySelector('liga-mx-hrlv');
        app.user = { uid: 'fixture-admin' };
        app.isAdmin = true;
        window.authEvents.push('submit-login');
        document.querySelector('#login-panel').hidden = true;
        window.renderAuth();
      };
      window.renderAuth();
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
      scope: 'goals',
      value: '45',
    });
    assert.equal(
      await first.page.locator('goals-card').getByLabel('Minuto').inputValue(),
      '45',
    );
    assert.equal(
      await first.page.locator('cards-card').getByLabel('Minuto').inputValue(),
      '',
    );
    await first.edit({
      action: 'select',
      by: 'label',
      name: 'Anotador',
      scope: 'goals',
      value: '9- Delantero',
    });
    assert.equal(
      await first.page
        .locator('md-outlined-select')
        .evaluate(element => element.value),
      '9',
    );
    await assert.rejects(
      first.edit({
        action: 'click',
        by: 'role',
        role: 'button',
        name: 'Agregar',
        scope: 'goals',
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
    // No production services exist in this fixture. Simulate an admin profile
    // and prove child/slot targets cannot reach the write handlers or links.
    await first.page.evaluate(() => {
      const app = document.querySelector('liga-mx-hrlv');
      app.user = { uid: 'fixture-admin' };
      app.isAdmin = true;
      window.renderAuth();
    });
    for (const name of ['save', 'etiqueta-hija', 'boton-hijo-etiquetado']) {
      await assert.rejects(
        first.edit({ action: 'click', by: 'text', name }),
        /liga_commit/u,
      );
    }
    await assert.rejects(
      first.edit({ action: 'check', by: 'text', name: 'save' }),
      /liga_commit/u,
    );
    for (const name of ['enlace-hijo', 'enlace-local-hijo']) {
      await assert.rejects(
        first.edit({ action: 'click', by: 'text', name }),
        /no abre enlaces|fuera del origen local/u,
      );
    }
    assert.equal(await first.page.evaluate(() => window.writeClicks), 0);
    assert.equal(
      new URL(first.page.url()).origin,
      options.baseUrl.slice(0, -1),
    );
    await first.edit({ action: 'click', by: 'text', name: 'hijo-seguro' });
    assert.equal(await first.page.evaluate(() => window.safeClicks), 1);
    await first.edit({ action: 'check', by: 'label', name: 'Casilla segura' });
    assert.equal(
      await first.page.getByLabel('Casilla segura').isChecked(),
      true,
    );

    const previousEmail = process.env.LIGA_MX_ADMIN_EMAIL;
    const previousPassword = process.env.LIGA_MX_ADMIN_PASSWORD;
    process.env.LIGA_MX_ADMIN_EMAIL = 'fixture@example.com';
    process.env.LIGA_MX_ADMIN_PASSWORD = 'fixture-password';
    try {
      await first.page.evaluate(() => {
        const app = document.querySelector('liga-mx-hrlv');
        app.user = { uid: 'fixture-non-admin' };
        app.isAdmin = false;
        window.renderAuth();
      });
      const loggedIn = await first.loginAdmin();
      assert.equal(loggedIn.isAdmin, true);
      assert.deepEqual(await first.page.evaluate(() => window.authEvents), [
        'logout',
        'open-login',
        'submit-login',
      ]);
      // An existing admin is reused, without signing out or reopening login.
      await first.loginAdmin();
      assert.equal(
        await first.page.evaluate(() => window.authEvents.length),
        3,
      );
      await first.logout();
      assert.equal((await first.adminState()).authenticated, false);
      await first.loginAdmin();
      assert.deepEqual(await first.page.evaluate(() => window.authEvents), [
        'logout',
        'open-login',
        'submit-login',
        'logout',
        'open-login',
        'submit-login',
      ]);
    } finally {
      if (previousEmail === undefined) delete process.env.LIGA_MX_ADMIN_EMAIL;
      else process.env.LIGA_MX_ADMIN_EMAIL = previousEmail;
      if (previousPassword === undefined)
        delete process.env.LIGA_MX_ADMIN_PASSWORD;
      else process.env.LIGA_MX_ADMIN_PASSWORD = previousPassword;
    }
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
