import { formatDate } from '../src/utils/dateUtils.js';
import { expect, test, type Page } from 'playwright/test';
import type {
  Match,
  MatchEvent,
  Player,
  TableEntry,
} from '../src/types/index.js';
import {
  appearanceDateLabel,
  appearancePhase,
  getTeamPlayerAppearances,
} from '../src/utils/playerAppearances.js';

const fulltime: MatchEvent = {
  id: 'end',
  type: 'phase',
  team: '',
  minute: 90,
  period: '2T',
  sequence: 3,
  phase: 'fulltime',
};
const substitution: MatchEvent = {
  id: 'sub',
  type: 'substitution',
  team: 'local',
  minute: 60,
  period: '2T',
  sequence: 1,
  playerIn: 10,
  playerOut: 9,
};
const red: MatchEvent = {
  id: 'red',
  type: 'card',
  team: 'local',
  minute: 75,
  period: '2T',
  sequence: 2,
  player: 11,
  cardType: 'red',
};
const match = (overrides: Partial<Match> = {}): Match => ({
  idMatch: 1,
  local: 'América',
  visitante: 'Atlas',
  golLocal: 2,
  golVisitante: 1,
  fecha: '2026/10/01',
  hora: '23:00',
  estadio: 'Estadio de prueba',
  jornada: 1,
  lineupLocal: [{ number: 9, titular: true }],
  lineupVisitor: [],
  events: [fulltime],
  ...overrides,
});
const team: TableEntry = {
  equipo: 'América',
  jj: 2,
  jg: 2,
  je: 0,
  jp: 0,
  gf: 4,
  gc: 2,
  dg: 2,
  pts: 6,
};
const players: Player[] = [
  {
    id: 'nine',
    number: 9,
    name: 'Titular',
    fullName: 'Jugador Titular',
    historical: true,
  },
  { id: 'ten', number: 10, name: 'Suplente', fullName: 'Jugador Suplente' },
  {
    id: 'twelve',
    number: 12,
    name: 'Sin partidos',
    fullName: 'Jugador Sin Partidos',
  },
].map(player => ({
  ...player,
  birthDate: '01/01/2000',
  position: 'Delantero',
  nationality: 'Mexicano',
  imgSrc: '',
}));
const matches = [
  match(),
  match({
    idMatch: 2,
    fecha: '2026/10/10',
    jornada: 20,
    lineupLocal: [
      { number: 9, titular: true, salioDeCambio: true },
      { number: 10, entroDeCambio: true },
    ],
    events: [substitution, fulltime],
  }),
  match({ idMatch: 3, fecha: '2026/10/31', events: [] }),
  match({
    idMatch: 4,
    events: [{ ...fulltime, id: 'start', phase: 'start', minute: 0 }],
  }),
];
const headers = [
  'FASE',
  'LOCAL',
  'GL',
  'GV',
  'VISITA',
  'JORNADA',
  'FECHA',
  'HORA',
  'SEDE',
  'ESTATUS',
  'MJ',
  'TITULAR',
];

for (const side of ['local', 'visitor'] as const) {
  test(`minutos de titulares, cambios y expulsiones como ${side}`, () => {
    const lineup = [
      { number: 8, titular: true },
      { number: 9, titular: true, salioDeCambio: true },
      { number: 10, entroDeCambio: true },
      { number: 11, titular: true },
    ];
    const fixture = match({
      local: side === 'local' ? 'América' : 'Atlas',
      visitante: side === 'visitor' ? 'América' : 'Atlas',
      lineupLocal: side === 'local' ? lineup : [],
      lineupVisitor: side === 'visitor' ? lineup : [],
      events: [
        { ...substitution, team: side },
        { ...red, team: side },
        fulltime,
      ],
    });
    const result = getTeamPlayerAppearances([fixture], 'América');
    expect(
      [8, 9, 10, 11].map(number => result.get(number)?.[0].minutes),
    ).toEqual([90, 60, 30, 75]);
    expect(result.get(10)?.[0].starter).toBe(false);
    expect(result.get(9)?.[0].starter).toBe(true);
  });
}

test('solo partidos finalizados del equipo y orden de fecha ascendente', () => {
  const rows = getTeamPlayerAppearances(
    [
      ...matches,
      match({ idMatch: 5, status: 'cancelled' }),
      match({ idMatch: 6, status: 'postponed' }),
      match({ idMatch: 7, local: 'Toluca', visitante: 'Atlas' }),
    ],
    'América',
  ).get(9)!;
  expect(rows.map(row => row.match.idMatch)).toEqual([1, 2]);
  expect(rows.reduce((sum, row) => sum + row.minutes, 0)).toBe(150);
});

test('fases configuradas, fechas en CDMX y titularidad desconocida', () => {
  expect(
    [1, 20, 21, 22, 99].map(jornada => appearancePhase(match({ jornada }))),
  ).toEqual(['Fase regular', 'Cuartos de final', 'Semifinal', 'Final', '—']);
  expect(
    appearanceDateLabel(match({ fecha: new Date('2026-10-02T05:00:00Z') })),
  ).toBe('01/10/2026');
  expect(appearanceDateLabel(match({ fecha: '' }))).toBe('—');
  expect(appearanceDateLabel(match({ hora: '' }))).toBe('01/10/2026');
  expect(
    getTeamPlayerAppearances(
      [match({ lineupLocal: [{ number: 9 }] })],
      'América',
    ).get(9)?.[0].starter,
  ).toBeUndefined();
});

async function openFixture(
  page: Page,
  entry: 'team' | 'match' | 'table' = 'team',
  admin = false,
) {
  // Block all external services, including Firebase WebSockets, before mounting fixtures.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname)
      ? route.continue()
      : route.abort();
  });
  await page.routeWebSocket(/firebaseio\.com|firebasedatabase\.app/, socket =>
    socket.close(),
  );
  await page.goto(entry === 'table' ? '/?tab=Tabla%20General' : '/');
  await page.waitForFunction(() => customElements.get('team-page'));
  await page.evaluate(
    async ({ entry, admin, team, players, matches }) => {
      const app = document.querySelector('liga-mx-hrlv') as HTMLElement &
        Record<string, unknown> & { updateComplete: Promise<boolean> };
      if (entry === 'table') {
        Object.assign(app, {
          table: [team],
          teams: ['América'],
          players: new Map([['América', players]]),
          matchesList: matches,
          publicDataLoaded: true,
        });
        await app.updateComplete;
        return;
      }
      app.remove();
      const component = document.createElement(
        entry === 'match' ? 'match-detail-page' : 'team-page',
      );
      Object.assign(
        component,
        entry === 'match'
          ? {
              match: matches[0],
              table: [team],
              teams: ['América', 'Atlas'],
              players: new Map([['América', players]]),
              matchesList: matches,
              isAdmin: admin,
            }
          : { team, players, matchesList: matches, isAdmin: admin },
      );
      document.body.replaceChildren(component);
      (window as typeof window & { historyWrites: number }).historyWrites = 0;
      component.addEventListener('edit-match', () => {
        (window as typeof window & { historyWrites: number }).historyWrites++;
      });
    },
    {
      entry,
      admin,
      team,
      players,
      matches: matches.map(fixture => ({
        ...fixture,
        fecha: formatDate(fixture.fecha, fixture.hora) as Date,
      })),
    },
  );
  if (entry !== 'team')
    await page
      .getByRole('link', { name: 'Abrir detalle de América', exact: true })
      .click();
  if (entry === 'table') {
    await page.waitForFunction(() => customElements.get('team-page'));
    await page.evaluate(
      ({ team, players, matches }) => {
        Object.assign(document.querySelector('liga-mx-hrlv')!, {
          table: [team],
          teams: ['América'],
          players: new Map([['América', players]]),
          matchesList: matches,
          publicDataLoaded: true,
        });
      },
      { team, players, matches },
    );
  }
  await expect(
    page
      .locator('team-page')
      .getByRole('heading', { name: 'América', exact: true }),
  ).toBeVisible();
}

test('tabla accesible, totales, historial histórico y un solo desplegable', async ({
  page,
}, testInfo) => {
  await openFixture(page);
  const card = page
    .locator('team-page .player-card')
    .filter({ hasText: 'Jugador Titular' });
  await expect(card.locator('.stat-pj .stat-value')).toHaveText('2');
  await expect(card.locator('.stat-min .stat-value')).toHaveText("150'");
  const toggle = card.getByRole('button', {
    name: /partidos de Jugador Titular$/,
  });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  const target = await toggle.getAttribute('aria-controls');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`team-page #${target}`)).toBeVisible();
  const table = page.getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText(headers);
  await expect(table.locator('tbody tr')).toHaveCount(2);
  await expect(table.locator('tbody tr').first().getByRole('cell')).toHaveText([
    'Fase regular',
    'América',
    '2',
    '1',
    'Atlas',
    '1',
    '01/10/2026',
    '23:00',
    'Estadio de prueba',
    'Finalizado',
    '90',
    'Sí',
  ]);
  await page.screenshot({
    path: testInfo.outputPath('desktop.png'),
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await toggle.click();
  await page
    .getByRole('button', { name: 'Ver partidos de Jugador Suplente' })
    .click();
  await expect(page.locator('player-match-history')).toHaveCount(1);
  await expect(
    page.getByRole('table').locator('tbody tr').getByRole('cell').last(),
  ).toHaveText('No');
  await page
    .getByRole('button', { name: 'Ver partidos de Jugador Sin Partidos' })
    .click();
  await expect(
    page.getByText('Sin partidos jugados registrados', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as typeof window & { historyWrites: number }).historyWrites,
    ),
  ).toBe(0);
});

test('actualiza el historial abierto y lo cierra si desaparece el jugador', async ({
  page,
}) => {
  await openFixture(page);
  await page
    .getByRole('button', { name: 'Ver partidos de Jugador Titular' })
    .click();
  await page.evaluate(
    fixture => {
      Object.assign(document.querySelector('team-page')!, {
        matchesList: [fixture],
      });
    },
    match({ golLocal: 3 }),
  );
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('player-match-history .summary')).toContainText(
    '1 PJ · 90 minutos',
  );
  await expect(
    page.locator('.player-card').first().locator('.stat-min .stat-value'),
  ).toHaveText("90'");
  await page.evaluate(() => {
    const component = document.querySelector('team-page') as HTMLElement & {
      players: Player[];
    };
    component.players = component.players.map(player =>
      player.number === 9
        ? { ...player, fullName: 'Jugador Renombrado' }
        : player,
    );
  });
  await expect(
    page.getByRole('heading', { name: 'Partidos de Jugador Renombrado' }),
  ).toBeVisible();
  await page.evaluate(() => {
    const component = document.querySelector('team-page') as HTMLElement & {
      players: Player[];
    };
    component.players = component.players.filter(player => player.number !== 9);
  });
  await expect(page.locator('player-match-history')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Ver partidos de Jugador Suplente' }),
  ).toHaveAttribute('aria-expanded', 'false');
});

test('datos ausentes se muestran sin inventar marcador, fecha, sede ni titularidad', async ({
  page,
}) => {
  await openFixture(page);
  const incomplete = Object.assign(
    match({
      fecha: '',
      hora: '',
      estadio: '',
      jornada: 99,
      lineupLocal: [{ number: 9 }],
    }),
    { golLocal: null, golVisitante: null },
  );
  await page.evaluate(fixture => {
    Object.assign(document.querySelector('team-page')!, {
      matchesList: [fixture],
    });
  }, incomplete);
  await page
    .getByRole('button', { name: 'Ver partidos de Jugador Titular' })
    .click();
  await expect(
    page.getByRole('table').locator('tbody tr').getByRole('cell'),
  ).toHaveText([
    '—',
    'América',
    '—',
    '—',
    'Atlas',
    '99',
    '—',
    '—',
    '—',
    'Finalizado',
    '90',
    '—',
  ]);
});

test('móvil muestra los doce campos en tarjetas sin desbordamiento y conserva editar', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFixture(page, 'team', true);
  await page
    .getByRole('button', { name: 'Ver partidos de Jugador Suplente' })
    .click();
  await expect(page.getByRole('table')).toBeHidden();
  const article = page.getByRole('article');
  await expect(article).toHaveCount(1);
  await expect(article.locator('dt')).toHaveText(headers);
  await expect(article.locator('dd')).toHaveText([
    'Cuartos de final',
    'América',
    '2',
    '1',
    'Atlas',
    '20',
    '10/10/2026',
    '23:00',
    'Estadio de prueba',
    'Finalizado',
    '30',
    'No',
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('mobile.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .locator('.player-card')
    .filter({ hasText: 'Jugador Suplente' })
    .locator('.mobile-edit-btn')
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Editar Jugador', exact: true }),
  ).toBeVisible();
});

for (const entry of ['match', 'table'] as const) {
  test(`historial accesible al entrar desde ${entry}`, async ({ page }) => {
    await openFixture(page, entry);
    await page
      .getByRole('button', { name: 'Ver partidos de Jugador Titular' })
      .click();
    await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
  });
}

for (const width of [1240, 390]) {
  test(`enlace al detalle del partido por teclado a ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await openFixture(page);
    await page
      .getByRole('button', { name: 'Ver partidos de Jugador Titular' })
      .click();
    const link = page.getByRole('link', {
      name: 'Abrir detalle de América contra Atlas, 10/10/2026',
      exact: true,
    });
    await expect(link).toHaveAttribute('href', '?tab=Calendario&match=2');
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\?tab=Calendario&match=2$/);
    await page.waitForFunction(() => customElements.get('match-detail-page'));
    await page.evaluate(
      ({ team, players, matches }) => {
        Object.assign(document.querySelector('liga-mx-hrlv')!, {
          table: [team],
          teams: ['América', 'Atlas'],
          players: new Map([['América', players]]),
          matchesList: matches,
          publicDataLoaded: true,
        });
      },
      {
        team,
        players,
        matches: matches.map(fixture => ({
          ...fixture,
          fecha: formatDate(fixture.fecha, fixture.hora) as Date,
          events: [
            { ...fulltime, id: 'start', phase: 'start', minute: 0 },
            ...fixture.events,
          ],
        })),
      },
    );
    const detail = page.locator('match-detail-page');
    await expect(detail).toBeVisible();
    await expect(detail.locator('.score-numbers')).toHaveText('2 - 1');
    await expect(detail.locator('.match-meta')).toContainText('10/10/2026');
  });
}
