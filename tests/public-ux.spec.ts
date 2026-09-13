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

test('en móvil la cronología identifica el equipo y el marcador tras cada gol', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountPage(
    page,
    'events-timeline',
    `component.match = {
      idMatch: 1, estadio: 'Estadio HRLV', fecha: '2026/09/13', hora: '19:00', jornada: 1,
      local: 'América', visitante: 'Atlas', golLocal: 2, golVisitante: 1,
      lineupLocal: [], lineupVisitor: [],
      events: [
        { id: 'goal-local', type: 'goal', team: 'local', player: 9, minute: 10, period: '1T', sequence: 1 },
        { id: 'card-visitor', type: 'card', team: 'visitor', player: 4, cardType: 'yellow', minute: 20, period: '1T', sequence: 2 },
        { id: 'own-goal', type: 'goal', team: 'local', player: 3, ownGoal: true, minute: 30, period: '1T', sequence: 3 },
        { id: 'goal-visitor', type: 'goal', team: 'visitor', player: 11, minute: 30, period: '1T', sequence: 4 },
      ],
    }; component.localPlayers = [{ name: 'Local', number: 9 }]; component.visitorPlayers = [{ name: 'Visitante', number: 11 }, { name: 'Defensa', number: 3 }, { name: 'Defensa', number: 4 }];`,
  );

  const timeline = page.locator('events-timeline');
  await expect(timeline.getByText('América · Local').first()).toBeVisible();
  await expect(timeline.getByText('Atlas · Visitante').first()).toBeVisible();
  await expect(
    timeline.getByLabel('Marcador tras el gol: 1 a 0'),
  ).toBeVisible();
  await expect(
    timeline.getByLabel('Marcador tras el gol: 2 a 0'),
  ).toBeVisible();
  await expect(
    timeline.getByLabel('Marcador tras el gol: 2 a 1'),
  ).toBeVisible();
});

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

test('a 320 px Más se alinea y Volver arriba vive en la cabecera', async ({ page }) => {
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

  const initialHeader = await page.evaluate(() => {
    const root = document.querySelector('liga-mx-hrlv')?.shadowRoot;
    const navigation = root?.querySelector('.main-navigation');
    const access = root?.querySelector('.admin-actions > *:last-child');
    const navigationRect = navigation?.getBoundingClientRect();
    const accessRect = access?.getBoundingClientRect();
    return navigationRect && accessRect
      ? { gap: accessRect.left - navigationRect.right }
      : null;
  });
  expect(initialHeader).not.toBeNull();
  expect(initialHeader!.gap).toBeLessThanOrEqual(8);
  await expect(page.locator('liga-mx-hrlv').locator('#headerScrollTopButton')).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, 420));
  const headerScrollTop = page.locator('liga-mx-hrlv').locator('#headerScrollTopButton');
  await expect(headerScrollTop).toBeVisible();
  await expect(page.locator('liga-mx-hrlv').locator('#scrollTopButton')).toBeHidden();
  const viewport = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    navigation: (() => {
      const navigation = document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('.main-navigation');
      const more = navigation?.querySelector('.mobile-menu-trigger');
      const firstLink = navigation?.querySelector('a');
      const navigationRect = navigation?.getBoundingClientRect();
      const moreRect = more?.getBoundingClientRect();
      const firstLinkRect = firstLink?.getBoundingClientRect();
      return navigationRect && moreRect && firstLinkRect
        ? {
            right: navigationRect.right,
            moreCenterY: moreRect.top + moreRect.height / 2,
            firstLinkCenterY: firstLinkRect.top + firstLinkRect.height / 2,
          }
        : null;
    })(),
    scrollButton: (() => {
      const button = document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('#headerScrollTopButton');
      const rect = button?.getBoundingClientRect();
      return rect ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } : null;
    })(),
    access: (() => {
      const access = document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('.admin-actions > *:last-child');
      const rect = access?.getBoundingClientRect();
      return rect ? { left: rect.left } : null;
    })(),
    headerBottom: document.querySelector('liga-mx-hrlv')?.shadowRoot?.querySelector('header')?.getBoundingClientRect().bottom || 0,
  }));

  expect(viewport.documentWidth).toBeLessThanOrEqual(viewport.viewportWidth);
  expect(viewport.scrollButton).not.toBeNull();
  expect(viewport.navigation).not.toBeNull();
  expect(viewport.access).not.toBeNull();
  expect(viewport.scrollButton!.left).toBeGreaterThanOrEqual(viewport.navigation!.right);
  expect(viewport.scrollButton!.right).toBeLessThanOrEqual(viewport.access!.left);
  expect(viewport.scrollButton!.bottom).toBeLessThanOrEqual(viewport.headerBottom);
  expect(Math.abs(viewport.navigation!.moreCenterY - viewport.navigation!.firstLinkCenterY)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 393, height: 852 });
  await expect(headerScrollTop).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(393);
  await headerScrollTop.click();
  await page.waitForFunction(() => window.scrollY === 0);
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

test('Liguilla comunica cruces provisionales, confirmados y campeón', async ({ page }) => {
  await mountPage(
    page,
    'bracket-page',
    'component.matchesList = []; component.table = []; component.teams = []; component.players = new Map(); component.stadiums = [];',
  );

  await expect(page.getByText('Por definir', { exact: true }).first()).toBeVisible();

  await page.evaluate(() => {
    const component = document.querySelector('bracket-page') as HTMLElement & Record<string, unknown>;
    component.matchesList = [{
      idMatch: 1, estadio: 'Estadio HRLV', fecha: new Date('2026-09-13T19:00:00-06:00'), hora: '19:00', jornada: 17,
      local: 'América', visitante: 'Atlas', golLocal: 0, golVisitante: 0,
      lineupLocal: [], lineupVisitor: [], events: [],
    }];
  });

  await expect(page.getByText('CRUCES PROVISIONALES · Se actualizan en vivo')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('CRUCES PROVISIONALES · Se actualizan en vivo')).toBeVisible();

  await page.evaluate(() => {
    const component = document.querySelector('bracket-page') as HTMLElement & Record<string, unknown>;
    component.matchesList = [{
      idMatch: 1, estadio: 'Estadio HRLV', fecha: new Date('2026-09-13T19:00:00-06:00'), hora: '19:00', jornada: 17,
      local: 'América', visitante: 'Atlas', golLocal: 1, golVisitante: 0,
      lineupLocal: [], lineupVisitor: [], events: [{ id: 'fulltime', type: 'phase', team: '', minute: 90, period: '2T', sequence: 1, phase: 'fulltime' }],
    }, {
      idMatch: 2, estadio: 'Estadio HRLV', fecha: new Date('2026-09-13T19:00:00-06:00'), hora: '19:00', jornada: 17,
      local: 'Pachuca', visitante: 'Toluca', golLocal: 0, golVisitante: 0,
      status: 'postponed', lineupLocal: [], lineupVisitor: [], events: [],
    }, {
      idMatch: 3, estadio: 'Estadio HRLV', fecha: new Date('2026-09-13T19:00:00-06:00'), hora: '19:00', jornada: 17,
      local: 'León', visitante: 'Tigres', golLocal: 0, golVisitante: 0,
      status: 'cancelled', lineupLocal: [], lineupVisitor: [], events: [],
    }];
  });

  await expect(page.getByText('CRUCES CONFIRMADOS')).toBeVisible();

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
