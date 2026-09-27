import { expect, test, type Page } from 'playwright/test';
import type { Match } from '../src/types/index.js';

function createMatch(
  idMatch: number,
  local: string,
  visitante: string,
  startTime: string,
  events: Match['events'] = [],
): Match {
  return {
    idMatch,
    estadio: 'Estadio HRLV',
    fecha: new Date(`2026-08-09T${startTime}:00-06:00`),
    hora: startTime,
    jornada: 1,
    local,
    visitante,
    golLocal: 0,
    golVisitante: 0,
    lineupLocal: [],
    lineupVisitor: [],
    events,
  };
}

function phaseEvent(
  id: string,
  phase: 'start' | 'fulltime',
): Match['events'][number] {
  return {
    id,
    type: 'phase',
    team: '',
    minute: phase === 'start' ? 0 : 90,
    period: phase === 'start' ? '1T' : '2T',
    sequence: 1,
    phase,
  };
}

function withReadyLineups(match: Match): Match {
  const starters = Array.from({ length: 11 }, (_, index) => ({
    number: index + 1,
    titular: true,
  }));
  return { ...match, lineupLocal: [...starters], lineupVisitor: [...starters] };
}

async function mountHomeFixture(
  page: Page,
  matches: Match[],
  options: { favorite?: string; table?: unknown[]; teams?: string[] } = {},
) {
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
  await page.goto('/');
  await page.waitForFunction(
    () => customElements.get('home-page') !== undefined,
  );
  await page.evaluate(({ matchesList, favorite, table, teams }) => {
    if (favorite) localStorage.setItem('liga-mx-hrlv.favorite-team', favorite);
    else localStorage.removeItem('liga-mx-hrlv.favorite-team');
    document.querySelector('liga-mx-hrlv')?.remove();
    const fixture = document.createElement('home-page') as HTMLElement & {
      matchesList: unknown[];
      table: unknown[];
      teams: string[];
    };
    fixture.matchesList = matchesList;
    fixture.table = table;
    fixture.teams = teams;
    document.body.replaceChildren(fixture);
  }, {
    matchesList: matches,
    favorite: options.favorite,
    table: options.table || [],
    teams: options.teams || ['América', 'Atlas', 'Cruz Azul', 'Pachuca'],
  });
}

test('muestra todos los partidos en vivo aunque hayan comenzado a distinta hora', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-09T20:00:00-06:00') });
  await mountHomeFixture(page, [
    createMatch(3, 'Toluca', 'León', '19:00', [phaseEvent('start-3', 'start')]),
    createMatch(1, 'América', 'Atlas', '17:00', [phaseEvent('start-1', 'start')]),
    createMatch(2, 'Cruz Azul', 'Pachuca', '18:00', [
      phaseEvent('start-2', 'start'),
      phaseEvent('fulltime-2', 'fulltime'),
    ]),
  ]);

  const highlights = page.getByLabel('Partidos destacados');
  await expect(highlights.getByRole('link')).toHaveCount(2);
  await expect(highlights.getByRole('link')).toHaveText([
    /América[\s\S]*Atlas/,
    /Toluca[\s\S]*León/,
  ]);
  await expect(page.locator('.hero')).not.toHaveClass(/is-compact/);
});

test('compacta el hero cuando solo hay un destacado', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-09T15:00:00-06:00') });
  await mountHomeFixture(page, [createMatch(1, 'América', 'Atlas', '18:00')]);

  await expect(page.locator('.hero')).toHaveClass(/is-compact/);
  await expect(page.getByLabel('Accesos rápidos')).toBeVisible();
});

test('guarda Mi equipo localmente y prioriza su partido en vivo', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-09T20:00:00-06:00') });
  await mountHomeFixture(page, [
    createMatch(1, 'América', 'Atlas', '17:00', [phaseEvent('start-1', 'start')]),
    createMatch(2, 'América', 'Pachuca', '22:00'),
  ], {
    favorite: 'América',
    table: [{ equipo: 'América', pts: 14, dg: 6 }],
  });

  const myTeam = page.getByRole('region', { name: 'Mi equipo' });
  await expect(myTeam).toContainText('América');
  await expect(myTeam).toContainText('En vivo');
  await expect(myTeam).toContainText('América vs Atlas');
  await expect(myTeam).not.toContainText('América vs Pachuca');
  await expect(myTeam.getByRole('link', { name: /América vs Atlas/ })).toHaveAttribute(
    'href',
    '?tab=Inicio&match=1',
  );
});

test('permite elegir y quitar Mi equipo sin cuenta', async ({ page }) => {
  await mountHomeFixture(page, []);
  const myTeam = page.getByRole('region', { name: 'Mi equipo' });
  await myTeam.locator('#favorite-team').selectOption('Atlas');
  await expect(myTeam).toContainText('Atlas');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liga-mx-hrlv.favorite-team'))).toBe('Atlas');
  await myTeam.getByRole('button', { name: 'Quitar Mi equipo' }).click();
  await expect(myTeam.locator('#favorite-team')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liga-mx-hrlv.favorite-team'))).toBeNull();
});

test('mantiene las acciones de Mi equipo compactas y accesibles en móvil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await mountHomeFixture(page, [], { favorite: 'Atlas' });

  const myTeam = page.getByRole('region', { name: 'Mi equipo' });
  const change = myTeam.getByRole('button', { name: 'Cambiar' });
  const remove = myTeam.getByRole('button', { name: 'Quitar Mi equipo' });

  await expect(change).toBeVisible();
  await expect(remove).toHaveAttribute('title', 'Quitar Mi equipo');
  await expect(remove).toHaveCSS('width', '40px');
  await expect(remove).toHaveCSS('height', '40px');
  await change.focus();
  await expect(change).toBeFocused();

  const headingFits = await myTeam.locator('.my-team-heading').evaluate(
    element => element.scrollWidth <= element.clientWidth,
  );
  expect(headingFits).toBe(true);
});

test('explica cuando Mi equipo no tiene próximo partido ni resultados', async ({
  page,
}) => {
  await mountHomeFixture(page, [], { favorite: 'Atlas' });
  const myTeam = page.getByRole('region', { name: 'Mi equipo' });
  await expect(myTeam).toContainText('No hay un próximo partido disponible.');
  await expect(myTeam).toContainText('Aún no hay resultados finalizados.');
});

test('identifica si Mi equipo fue local o visitante en sus resultados', async ({
  page,
}) => {
  const homeResult = createMatch(6, 'Atlas', 'América', '18:00', [
    phaseEvent('fulltime-home', 'fulltime'),
  ]);
  homeResult.golLocal = 2;
  homeResult.golVisitante = 1;
  const awayResult = createMatch(7, 'Pachuca', 'Atlas', '18:00', [
    phaseEvent('fulltime-away', 'fulltime'),
  ]);
  awayResult.golLocal = 0;
  awayResult.golVisitante = 3;
  await mountHomeFixture(page, [homeResult, awayResult], { favorite: 'Atlas' });
  const results = page.getByLabel('Últimos resultados');
  await expect(results).toContainText('Local · vs. América');
  await expect(results).toContainText('Visitante · vs. Pachuca');
});

test('muestra un pospuesto como próximo encuentro sin marcarlo en vivo', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-09T12:00:00-06:00') });
  const postponed = createMatch(5, 'Atlas', 'Pachuca', '20:00');
  postponed.fecha = new Date('2026-08-10T20:00:00-06:00');
  postponed.status = 'postponed';
  await mountHomeFixture(page, [postponed], { favorite: 'Atlas' });
  const myTeam = page.getByRole('region', { name: 'Mi equipo' });
  await expect(myTeam).toContainText('Pospuesto');
  await expect(myTeam).not.toContainText('En vivo');
});

test('elimina una preferencia cuyo equipo ya no existe', async ({ page }) => {
  await mountHomeFixture(page, [], {
    favorite: 'Atlas',
    teams: ['América'],
  });
  await expect(page.getByRole('region', { name: 'Mi equipo' }).locator('#favorite-team')).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('liga-mx-hrlv.favorite-team'))).toBeNull();
});

test('mantiene juntos los partidos simultáneos cuando no hay encuentros en vivo', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-09T15:00:00-06:00') });
  await mountHomeFixture(page, [
    createMatch(4, 'Tigres', 'Monterrey', '20:00'),
    createMatch(2, 'Cruz Azul', 'Pachuca', '18:00'),
    createMatch(1, 'América', 'Atlas', '18:00'),
  ]);

  const highlights = page.getByLabel('Partidos destacados');
  await expect(highlights.getByRole('link')).toHaveCount(2);
  await expect(highlights.getByRole('link')).toHaveText([
    /América[\s\S]*Atlas/,
    /Cruz Azul[\s\S]*Pachuca/,
  ]);
});

test.describe('destacados con alineaciones listas', () => {
  test.use({ timezoneId: 'America/Mexico_City' });

  test('mantiene juntos los partidos de 21:05 y 21:10 al iniciar el primero', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-09T21:00:00-06:00') });
    const first = withReadyLineups(createMatch(1, 'América', 'Atlas', '21:05'));
    const second = withReadyLineups(createMatch(2, 'Cruz Azul', 'Pachuca', '21:10'));
    await mountHomeFixture(page, [second, first]);

    const highlights = page.getByLabel('Partidos destacados');
    const links = highlights.getByRole('link');
    await expect(links).toHaveCount(2);
    await expect(links).toHaveText([
      /América[\s\S]*21:05[\s\S]*Atlas/,
      /Cruz Azul[\s\S]*21:10[\s\S]*Pachuca/,
    ]);
    await expect(highlights.getByText('Alineaciones listas', { exact: true })).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute('href', '?tab=Inicio&match=1');
    await expect(links.nth(1)).toHaveAttribute('href', '?tab=Inicio&match=2');
    await expect(page.locator('.hero')).not.toHaveClass(/is-compact/);

    await page.clock.setSystemTime(new Date('2026-08-09T21:05:00-06:00'));
    await page.evaluate(events => {
      const home = document.querySelector('home-page') as HTMLElement & { matchesList: Match[] };
      home.matchesList = home.matchesList.map(match =>
        match.idMatch === 1 ? { ...match, events } : match,
      );
    }, [phaseEvent('start-1', 'start')]);

    await expect(links).toHaveCount(2);
    await expect(links.nth(0).getByText('En vivo', { exact: true })).toBeVisible();
    await expect(links.nth(0).getByText('1T', { exact: true })).toBeVisible();
    await expect(links.nth(0).getByText('Alineaciones listas', { exact: true })).toHaveCount(0);
    await expect(links.nth(1).getByText('Alineaciones listas', { exact: true })).toBeVisible();
    await expect(page.locator('.hero')).not.toHaveClass(/is-compact/);
  });

  test('incluye horarios separados y desempata por id del partido', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-09T15:00:00-06:00') });
    await mountHomeFixture(page, [
      withReadyLineups(createMatch(4, 'Tigres', 'Monterrey', '22:00')),
      withReadyLineups(createMatch(2, 'Cruz Azul', 'Pachuca', '18:00')),
      withReadyLineups(createMatch(1, 'América', 'Atlas', '18:00')),
    ]);

    const highlights = page.getByLabel('Partidos destacados');
    await expect(highlights.getByRole('link')).toHaveText([
      /América[\s\S]*Atlas/,
      /Cruz Azul[\s\S]*Pachuca/,
      /Tigres[\s\S]*Monterrey/,
    ]);
    await expect(highlights.getByText('Alineaciones listas', { exact: true })).toHaveCount(3);
  });

  test('excluye otros días, alineaciones incompletas y estados no programados', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-09T15:00:00-06:00') });
    const ready = withReadyLineups(createMatch(1, 'América', 'Atlas', '21:05'));
    const tomorrow = withReadyLineups(createMatch(2, 'Cruz Azul', 'Pachuca', '21:10'));
    tomorrow.fecha = new Date('2026-08-10T21:10:00-06:00');
    const yesterday = withReadyLineups(createMatch(3, 'Toluca', 'León', '21:10'));
    yesterday.fecha = new Date('2026-08-08T21:10:00-06:00');
    const missingLocal = withReadyLineups(createMatch(4, 'Tigres', 'Monterrey', '21:05'));
    missingLocal.lineupLocal.pop();
    const missingVisitor = withReadyLineups(createMatch(5, 'Pumas', 'Necaxa', '21:05'));
    missingVisitor.lineupVisitor.pop();
    const finished = withReadyLineups(createMatch(6, 'Santos Laguna', 'Puebla', '18:00', [
      phaseEvent('start-6', 'start'),
      phaseEvent('end-6', 'fulltime'),
    ]));
    const postponed = withReadyLineups(createMatch(7, 'Juárez', 'Mazatlán', '21:05'));
    postponed.status = 'postponed';
    const cancelled = withReadyLineups(createMatch(8, 'Querétaro', 'Tijuana', '21:05'));
    cancelled.status = 'cancelled';
    await mountHomeFixture(page, [
      tomorrow, yesterday, missingLocal, missingVisitor, finished, postponed, cancelled, ready,
    ]);

    const highlights = page.getByLabel('Partidos destacados');
    await expect(highlights.getByRole('link')).toHaveCount(1);
    await expect(highlights.getByRole('link')).toHaveAttribute('href', '?tab=Inicio&match=1');
    await expect(highlights.getByText('Alineaciones listas', { exact: true })).toBeVisible();
    await expect(page.locator('.hero')).toHaveClass(/is-compact/);
  });
});
