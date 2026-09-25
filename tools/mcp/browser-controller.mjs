import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  assertAllowedUrl,
  assertCommitTarget,
  assertSafeEditTarget,
  normalizeBaseUrl,
} from './security.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const PROFILE_DIR = path.join(REPO_ROOT, '.tmp/mcp-liga-profile');
const ARTIFACT_DIR = path.join(REPO_ROOT, '.tmp/mcp-liga-artifacts');
const PUBLIC_TABS = [
  'Inicio',
  'Calendario',
  'Tabla General',
  'Liguilla',
  'Estadísticas',
];
const ADMIN_TABS = ['Consistencia', 'Redes'];
export const TABS = [...PUBLIC_TABS, ...ADMIN_TABS];

const VIEWPORTS = {
  desktop: { width: 1240, height: 900 },
  mobile: { width: 390, height: 844 },
};

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function cleanText(value) {
  return value.replace(/\s+/gu, ' ').trim().slice(0, 800);
}

export class LigaBrowserController {
  constructor({
    baseUrl,
    profileDir = PROFILE_DIR,
    artifactDir = ARTIFACT_DIR,
    launchPersistentContext = (profileDir, options) =>
      chromium.launchPersistentContext(profileDir, options),
  } = {}) {
    this.baseUrl = normalizeBaseUrl(baseUrl || process.env.LIGA_MX_URL);
    this.launchPersistentContext = launchPersistentContext;
    this.profileDir = profileDir;
    this.artifactDir = artifactDir;
    this.context = undefined;
    this.page = undefined;
    this.appProcess = undefined;
    this.consoleErrors = [];
    this.networkErrors = [];
  }

  async ensureAppServer() {
    try {
      const response = await fetch(this.baseUrl, {
        signal: AbortSignal.timeout(800),
      });
      if (response.ok) return { reused: true };
    } catch {
      // Start the dedicated build server below.
    }

    if (!this.appProcess) {
      this.appProcess = spawn('corepack', ['pnpm', 'run', 'mcp:app'], {
        cwd: REPO_ROOT,
        env: process.env,
        detached: process.platform !== 'win32',
        stdio: ['ignore', 'ignore', 'pipe'],
      });
      this.appProcess.stderr?.on('data', chunk => {
        process.stderr.write(`[liga-mx-app] ${chunk}`);
      });
    }

    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (this.appProcess.exitCode !== null) {
        throw new Error(
          `El servidor local terminó con código ${this.appProcess.exitCode}.`,
        );
      }
      try {
        const response = await fetch(this.baseUrl, {
          signal: AbortSignal.timeout(800),
        });
        if (response.ok) return { reused: false };
      } catch {
        await delay(500);
      }
    }
    throw new Error('El servidor local no respondió en el puerto 8011.');
  }

  async ensurePage(viewport) {
    await this.ensureAppServer();
    if (!this.context) {
      await mkdir(this.profileDir, { recursive: true });
      this.context = await this.launchPersistentContext(this.profileDir, {
        headless: process.env.LIGA_MX_HEADLESS !== '0',
        viewport: VIEWPORTS[viewport || 'desktop'],
      });
      this.page = this.context.pages()[0] || (await this.context.newPage());
      this.captureDiagnostics(this.page);
    } else if (viewport) {
      await this.page.setViewportSize(VIEWPORTS[viewport]);
    }
    return this.page;
  }

  captureDiagnostics(page) {
    page.on('console', message => {
      if (message.type() === 'error') {
        this.consoleErrors.push(cleanText(message.text()));
        this.consoleErrors = this.consoleErrors.slice(-20);
      }
    });
    page.on('requestfailed', request => {
      const failure = request.failure()?.errorText || 'Error de red';
      this.networkErrors.push(
        `${request.method()} ${request.url()}: ${failure}`,
      );
      this.networkErrors = this.networkErrors.slice(-20);
    });
  }

  async open({ tab = 'Inicio', viewport = 'desktop' } = {}) {
    await this.ensurePage(viewport);
    await this.navigate({ tab });
    return this.inspect();
  }

  async navigate({ tab, matchId, team } = {}) {
    if (tab && !TABS.includes(tab)) {
      throw new Error(`Pestaña no permitida: ${tab}`);
    }
    if (matchId && team) {
      throw new Error('Elige solo matchId o team.');
    }
    const page = await this.ensurePage();
    const target = new URL(this.baseUrl);
    if (tab) target.searchParams.set('tab', tab);
    if (matchId) target.searchParams.set('match', matchId);
    if (team) target.searchParams.set('team', team);
    assertAllowedUrl(target, this.baseUrl);
    await page.goto(target.href, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => customElements.get('liga-mx-hrlv') !== undefined,
      undefined,
      { timeout: 15_000 },
    );
    await assertPageOrigin(page, this.baseUrl);
    return this.inspect();
  }

  locatorFor({ by, name, role = 'button', scope = 'page' }) {
    if (!this.page) throw new Error('Abre la aplicación primero.');
    const root =
      scope === 'goals'
        ? this.page.locator('goals-card')
        : scope === 'cards'
          ? this.page.locator('cards-card')
          : this.page;
    if (by === 'label') return root.getByLabel(name, { exact: true });
    if (by === 'text') return root.getByText(name, { exact: true });
    return root.getByRole(role, { name, exact: true });
  }

  async edit({ action, by, name, role, scope, value }) {
    const page = await this.ensurePage();
    assertSafeEditTarget({ action, name, role });
    const locator = this.locatorFor({ by, name, role, scope }).first();
    await locator.waitFor({ state: 'visible' });

    if (action === 'fill') {
      if (typeof value !== 'string') throw new Error('fill requiere value.');
      await setControlValue(locator, value, 'fill');
    } else if (action === 'select') {
      if (typeof value !== 'string') throw new Error('select requiere value.');
      await setControlValue(locator, value, 'select');
    } else if (action === 'check') {
      await checkControl(locator);
    } else {
      const href = await locator.getAttribute('href');
      if (href) assertAllowedUrl(href, this.baseUrl);
      await locator.click();
      await assertPageOrigin(page, this.baseUrl);
    }
    return this.inspect();
  }

  async loginAdmin() {
    const email = process.env.LIGA_MX_ADMIN_EMAIL;
    const password = process.env.LIGA_MX_ADMIN_PASSWORD;
    if (!email || !password) {
      throw new Error(
        'Configura LIGA_MX_ADMIN_EMAIL y LIGA_MX_ADMIN_PASSWORD fuera del repositorio.',
      );
    }
    const page = await this.ensurePage();
    await assertPageOrigin(page, this.baseUrl);
    const alreadyAdmin = await this.adminState();
    if (alreadyAdmin.isAdmin) return this.inspect();

    await page.getByRole('button', { name: 'Abrir acceso admin' }).click();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await page.getByText('Admin', { exact: true }).waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    return this.inspect();
  }

  async logout() {
    const page = await this.ensurePage();
    await assertPageOrigin(page, this.baseUrl);
    const state = await this.adminState();
    if (!state.authenticated) return this.inspect();
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await page.getByRole('button', { name: 'Abrir acceso admin' }).waitFor();
    return this.inspect();
  }

  async commit({ name, summary, scope = 'page' }) {
    assertCommitTarget(name);
    if (!summary.trim())
      throw new Error('Describe el cambio esperado en summary.');
    const page = await this.ensurePage();
    await assertPageOrigin(page, this.baseUrl);
    const state = await this.adminState();
    if (!state.isAdmin) {
      throw new Error('liga_commit requiere una sesión con claim admin.');
    }

    const button = this.locatorFor({
      by: 'role',
      role: 'button',
      name,
      scope,
    }).first();
    await button.waitFor({ state: 'visible' });
    await mkdir(this.artifactDir, { recursive: true });
    const artifactPath = path.join(
      this.artifactDir,
      `before-${new Date().toISOString().replaceAll(':', '-')}.png`,
    );
    await page.screenshot({ path: artifactPath, fullPage: true });
    await button.click();
    await delay(800);
    await assertPageOrigin(page, this.baseUrl);
    const inspection = await this.inspect();
    return { summary, artifactPath, inspection };
  }

  async adminState() {
    if (!this.page) return { authenticated: false, isAdmin: false };
    return this.page.evaluate(() => {
      const app = document.querySelector('liga-mx-hrlv');
      return {
        authenticated: Boolean(app?.user),
        isAdmin: app?.isAdmin === true,
      };
    });
  }

  async inspect() {
    if (!this.page) throw new Error('Abre la aplicación primero.');
    await assertPageOrigin(this.page, this.baseUrl);
    const pageState = await this.page.evaluate(() => {
      const app = document.querySelector('liga-mx-hrlv');
      const visible = element => {
        const style = window.getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none';
      };
      const messages = [
        ...document.querySelectorAll('[role="alert"], [role="status"]'),
      ]
        .filter(visible)
        .map(element => element.textContent?.replace(/\s+/gu, ' ').trim())
        .filter(Boolean)
        .slice(0, 10);
      return {
        title: document.title,
        selectedTab: app?.selectedTab || null,
        authenticated: Boolean(app?.user),
        isAdmin: app?.isAdmin === true,
        messages,
      };
    });
    return {
      url: this.page.url(),
      ...pageState,
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
    };
  }

  async screenshot({ fullPage = true, by, name, role, scope } = {}) {
    const page = await this.ensurePage();
    await assertPageOrigin(page, this.baseUrl);
    const buffer =
      by && name
        ? await this.locatorFor({ by, name, role, scope }).first().screenshot()
        : await page.screenshot({ fullPage });
    return buffer.toString('base64');
  }

  async close() {
    await this.context?.close();
    this.context = undefined;
    this.page = undefined;
    if (this.appProcess && this.appProcess.exitCode === null) {
      if (process.platform === 'win32') {
        this.appProcess.kill('SIGTERM');
      } else if (this.appProcess.pid) {
        try {
          process.kill(-this.appProcess.pid, 'SIGTERM');
        } catch (error) {
          if (error?.code !== 'ESRCH') throw error;
        }
      }
    }
    this.appProcess = undefined;
  }
}

export async function assertPageOrigin(page, baseUrl) {
  return assertAllowedUrl(page.url(), baseUrl);
}

async function setControlValue(locator, requestedValue, action) {
  const tagName = await locator.evaluate(element => element.tagName);
  if (!tagName.startsWith('MD-')) {
    if (action === 'select') {
      await locator.selectOption({ label: requestedValue });
    } else {
      await locator.fill(requestedValue);
    }
    return;
  }

  await locator.evaluate(
    (element, { value, chooseOption }) => {
      let resolvedValue = value;
      if (chooseOption) {
        const options = [...element.querySelectorAll('md-select-option')];
        const option = options.find(
          candidate =>
            candidate.getAttribute('value') === value ||
            candidate.textContent?.replace(/\s+/gu, ' ').trim() === value,
        );
        if (!option) throw new Error(`No existe la opción "${value}".`);
        resolvedValue = option.getAttribute('value') || '';
      }
      element.value = resolvedValue;
      element.dispatchEvent(
        new globalThis.Event('input', { bubbles: true, composed: true }),
      );
      element.dispatchEvent(
        new globalThis.Event('change', { bubbles: true, composed: true }),
      );
    },
    { value: requestedValue, chooseOption: action === 'select' },
  );
}

async function checkControl(locator) {
  const tagName = await locator.evaluate(element => element.tagName);
  if (!tagName.startsWith('MD-')) {
    await locator.check();
    return;
  }
  await locator.click();
}

export { REPO_ROOT };
