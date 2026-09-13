import { expect, test, type Page } from 'playwright/test';

async function blockRemoteServices(page: Page) {
  await page.route('**/*', route => {
    const hostname = new URL(route.request().url()).hostname;
    if (
      hostname.endsWith('.firebaseio.com') ||
      hostname.endsWith('.googleapis.com') ||
      hostname.endsWith('.google-analytics.com')
    ) {
      return route.abort();
    }
    return route.continue();
  });
}

async function mountPage(page: Page, tagName: string, setup: string) {
  await blockRemoteServices(page);
  await page.goto('/');
  await page.waitForFunction(tag => customElements.get(tag) !== undefined, tagName);
  await page.evaluate(
    ({ tag, script }) => {
      document.querySelector('liga-mx-hrlv')?.remove();
      const component = document.createElement(tag) as HTMLElement & Record<string, unknown>;
      // eslint-disable-next-line no-new-func
      new Function('component', script)(component);
      document.body.replaceChildren(component);
    },
    { tag: tagName, script: setup },
  );
}

test('en móvil Más revela las secciones ocultas y cierra con Escape', async ({ page }) => {
  await blockRemoteServices(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
  const more = navigation.getByRole('button', { name: 'Más secciones' });
  await expect(navigation.getByRole('link', { name: 'Inicio' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Calendario' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Tabla' })).toBeVisible();
  await expect(navigation.locator('.nav-overflow-link').first()).toBeHidden();
  await expect(more).toBeVisible();
  await expect(more).toHaveAttribute('aria-expanded', 'false');

  await more.click();
  const menu = navigation.getByRole('menu', { name: 'Más secciones' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Liguilla' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Estadísticas' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await expect(more).toBeFocused();
});

test('en tablet se conservan los enlaces principales visibles', async ({ page }) => {
  await blockRemoteServices(page);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(navigation.getByRole('link', { name: 'Liguilla' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Estadísticas' })).toBeVisible();
  await expect(navigation.getByRole('button', { name: 'Más secciones' })).toBeHidden();
});

test('Más conserva la ruta elegida y agrupa accesos administrativos', async ({ page }) => {
  await blockRemoteServices(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.evaluate(async () => {
    const app = document.querySelector('liga-mx-hrlv') as HTMLElement & Record<string, unknown> & { updateComplete: Promise<void>; _unsubscribeAuth?: () => void };
    app._unsubscribeAuth?.();
    app.isAdmin = true;
    await app.updateComplete;
  });

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
  await navigation.getByRole('button', { name: 'Más secciones' }).click();
  const menu = navigation.getByRole('menu', { name: 'Más secciones' });
  await expect(menu.getByText('Administración')).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Consistencia' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Redes' })).toBeVisible();

  await Promise.all([
    page.waitForURL(/tab=Liguilla/),
    menu.getByRole('menuitem', { name: 'Liguilla' }).click(),
  ]);
  await expect(page).toHaveURL(/tab=Liguilla/);
});

test('a 320 px la barra móvil no desborda y Volver arriba no tapa la tabla', async ({ page }) => {
  await blockRemoteServices(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('liga-mx-hrlv') !== undefined);
  await page.evaluate(async () => {
    const app = document.querySelector('liga-mx-hrlv') as HTMLElement & Record<string, unknown> & { updateComplete: Promise<void> };
    app.table = Array.from({ length: 18 }, (_, index) => ({
      equipo: `Equipo ${index + 1}`, jj: 5, jg: 3, je: 1, jp: 1,
      gf: 8, gc: 4, dg: 4, pts: 10, clasificado: index < 8,
    }));
    app.selectedTab = 'Tabla General';
    await app.updateComplete;
  });

  await page.evaluate(() => window.scrollTo(0, 420));
  await expect(page.locator('liga-mx-hrlv').locator('#scrollTopButton')).toBeVisible();
  const viewport = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    scrollButton: (() => {
      const button = document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('#scrollTopButton');
      const rect = button?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom } : null;
    })(),
    headerBottom: document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('header')?.getBoundingClientRect().bottom || 0,
    pointRows: Array.from(document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('table-page')?.shadowRoot?.querySelectorAll('.cell-pts') || [])
      .map(cell => cell.getBoundingClientRect())
      .filter(rect => rect.top >= 0 && rect.bottom <= window.innerHeight)
      .map(rect => ({ top: rect.top, bottom: rect.bottom })),
  }));

  expect(viewport.documentWidth).toBeLessThanOrEqual(viewport.viewportWidth);
  expect(viewport.scrollButton).not.toBeNull();
  const exposedRows = viewport.pointRows.filter(row => row.top >= viewport.headerBottom);
  expect(exposedRows.length).toBeGreaterThan(0);
  expect(exposedRows.every(row => row.bottom <= viewport.scrollButton!.top || row.top >= viewport.scrollButton!.bottom)).toBe(true);
});

test('Tabla explica abreviaturas y conserva el aviso provisional', async ({ page }) => {
  await mountPage(
    page,
    'table-page',
    `component.table = [{ equipo: 'Atlas', jj: 1, jg: 1, je: 0, jp: 0, gf: 2, gc: 0, dg: 2, pts: 3, clasificado: true }]; component.teams = ['Atlas']; component.players = new Map(); component.matchesList = [];`,
  );

  await expect(page.getByText('Tabla en vivo y provisional')).toBeVisible();
  const guide = page.getByText('Cómo leer la tabla');
  await guide.click();
  await expect(page.getByText('Partidos jugados')).toBeVisible();
  await expect(page.getByText('Diferencia de goles')).toBeVisible();
  await expect(page.getByText('Puntos', { exact: true })).toBeVisible();
});

test('Estadísticas describe datos faltantes y enlaza al calendario', async ({ page }) => {
  await mountPage(
    page,
    'stats-page',
    'component.matchesList = []; component.teams = []; component.players = new Map(); component.u23NationalTeamCallups = new Map();',
  );

  await expect(page.getByText('Aún no hay goles registrados. El ranking aparecerá al cerrar partidos.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver calendario' }).first()).toHaveAttribute('href', '?tab=Calendario');
});

test('Liguilla comunica Por definir sin cruces y campeón con final resuelta', async ({ page }) => {
  await mountPage(
    page,
    'bracket-page',
    'component.matchesList = []; component.table = []; component.teams = []; component.players = new Map(); component.stadiums = [];',
  );

  await expect(page.getByText('Por definir', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Los cruces aparecerán al cerrar la fase regular.')).toBeVisible();

  await page.evaluate(() => {
    const component = document.querySelector('bracket-page') as HTMLElement & Record<string, unknown>;
    const base = {
      estadio: 'Estadio HRLV', fecha: new Date('2026-10-01T20:00:00-06:00'), hora: '20:00', jornada: 22,
      lineupLocal: [], lineupVisitor: [], events: [],
    };
    component.matchesList = [
      { ...base, idMatch: 168, local: 'Atlas', visitante: 'América', golLocal: 1, golVisitante: 0 },
      { ...base, idMatch: 169, local: 'América', visitante: 'Atlas', golLocal: 0, golVisitante: 2 },
    ];
  });

  await expect(page.getByText('Campeón: Atlas', { exact: true }).first()).toBeVisible();
});
