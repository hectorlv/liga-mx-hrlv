import { expect, test, type Page } from 'playwright/test';
import type { Match, MatchEvent, PhaseMatchEvent } from '../src/types/index.js';

const phase = (
  name: PhaseMatchEvent['phase'],
  minute: number,
  period: PhaseMatchEvent['period'],
): PhaseMatchEvent => ({
  id: name,
  type: 'phase',
  phase: name,
  minute,
  period,
  team: '',
  sequence: 1,
});
const start = phase('start', 0, '1T');
const halftime = phase('halftime', 45, '1T');
const secondHalf = phase('secondHalf', 46, '2T');
const goal: MatchEvent = {
  id: 'goal',
  type: 'goal',
  team: 'local',
  player: 9,
  minute: 45,
  addedTime: 8,
  period: '1T',
  sequence: 2,
};
const card: MatchEvent = {
  id: 'card',
  type: 'card',
  team: 'visitor',
  player: 4,
  cardType: 'yellow',
  minute: 46,
  period: '2T',
  sequence: 2,
};
const substitution: MatchEvent = {
  id: 'sub',
  type: 'substitution',
  team: 'local',
  playerIn: 10,
  playerOut: 9,
  minute: 90,
  addedTime: 5,
  period: '2T',
  sequence: 3,
};

function match(events: MatchEvent[], overrides: Partial<Match> = {}): Match {
  return {
    idMatch: 1,
    local: 'América',
    visitante: 'Atlas',
    estadio: 'Estadio HRLV',
    fecha: '2026-09-20T19:00:00-06:00',
    hora: '19:00',
    jornada: 1,
    golLocal: 1,
    golVisitante: 0,
    liveMinute: 77,
    lineupLocal: [],
    lineupVisitor: [],
    events,
    ...overrides,
  };
}

// Only localhost assets are allowed: fixture interactions cannot reach Firebase.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const hostname = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1'].includes(hostname)
      ? route.continue()
      : route.abort();
  });
});

async function mountDetail(page: Page, fixture: Match, isAdmin = false) {
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('match-detail-page'));
  await page.evaluate(
    async ({ fixture, isAdmin }) => {
      document.querySelector('liga-mx-hrlv')?.remove();
      const component = document.createElement(
        'match-detail-page',
      ) as HTMLElement & {
        match: Match;
        isAdmin: boolean;
        stadiums: string[];
        updateComplete: Promise<unknown>;
      };
      component.match = { ...fixture, fecha: new Date(fixture.fecha) };
      component.isAdmin = isAdmin;
      component.stadiums = [fixture.estadio];
      component.addEventListener('edit-match', async event => {
        const detail = (event as CustomEvent).detail;
        (
          window as typeof window & { fixtureUpdates: Record<string, unknown> }
        ).fixtureUpdates = detail.updates;
        const fields = Object.fromEntries(
          Object.entries(detail.updates).map(([path, value]) => [
            path.split('/').pop()!,
            value,
          ]),
        );
        // The app hydrates the saved date before passing the match back to the detail.
        if (typeof fields.fecha === 'string') {
          fields.fecha = new Date(
            `${fields.fecha.replaceAll('/', '-')}T${fields.hora}:00-06:00`,
          );
        }
        component.match = { ...component.match, ...fields };
        await component.updateComplete;
        detail.onResult?.({ ok: true, revisions: { '/matches/1': 1 } });
      });
      document.body.replaceChildren(component);
      await component.updateComplete;
    },
    { fixture, isAdmin },
  );
}

async function updateMatch(page: Page, patch: Partial<Match>) {
  await page.locator('match-detail-page').evaluate(async (element, patch) => {
    const component = element as HTMLElement & {
      match: Match;
      updateComplete: Promise<unknown>;
    };
    component.match = { ...component.match, ...patch };
    await component.updateComplete;
  }, patch);
}

for (const width of [1240, 390]) {
  test(`el marcador muestra la última acción y el añadido a ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const events = [
      substitution,
      card,
      start,
      goal,
      secondHalf,
      halftime,
      { ...substitution, id: 'earlier-sub', addedTime: 2, sequence: 4 },
    ];
    await mountDetail(page, match(events));
    const progress = page.locator('.score-center').getByRole('status');
    await expect(progress).toHaveText('Último evento: 90+5′');
    await expect(progress).toBeVisible();
    await expect(page.locator('match-detail-page')).toHaveCSS('transform', 'none');
    await expect
      .poll(async () => {
        const bounds = await progress.boundingBox();
        return !!bounds && bounds.x >= 0 && bounds.x + bounds.width <= width;
      })
      .toBe(true);
    await expect(page.locator('match-detail-page')).not.toContainText('77′');
    await page.screenshot({
      path: `/tmp/match-progress-${width}.png`,
      animations: 'disabled',
    });
  });
}

test('recalcula la referencia al añadir, editar y borrar acciones entre periodos', async ({
  page,
}) => {
  await mountDetail(page, match([goal, card, start, halftime, secondHalf]));
  const progress = page.locator('.score-center').getByRole('status');
  await expect(progress).toHaveText('Último evento: 46′');
  await updateMatch(page, {
    events: [substitution, goal, card, start, halftime, secondHalf],
  });
  await expect(progress).toHaveText('Último evento: 90+5′');
  await updateMatch(page, {
    events: [
      { ...substitution, minute: 30, addedTime: 0, period: '1T' },
      goal,
      card,
      start,
      halftime,
      secondHalf,
    ],
  });
  await expect(progress).toHaveText('Último evento: 46′');
  await updateMatch(page, { events: [goal, start, halftime, secondHalf] });
  await expect(progress).toHaveText('Último evento: 45+8′');
  await updateMatch(page, { events: [start, halftime, secondHalf] });
  await expect(progress).toHaveText('En juego');
});

test('finalizar oculta el minuto y deshacer recupera la última acción', async ({
  page,
}) => {
  await mountDetail(page, match([start, halftime, secondHalf, card]), true);
  const progress = page.locator('.score-center').getByRole('status');
  await expect(progress).toHaveText('Último evento: 46′');
  await page
    .getByRole('button', { name: 'Guardar tiempo completo', exact: true })
    .click();
  await expect(progress).toHaveText('Finalizado');
  await expect(page.locator('.score-center')).not.toContainText(
    'Último evento',
  );
  page.once('dialog', dialog => dialog.accept());
  await page
    .getByRole('button', { name: 'Deshacer fin del partido', exact: true })
    .click();
  await expect(progress).toHaveText('Último evento: 46′');
});

test('muestra En juego o Descanso sin acciones y respeta los estados editoriales', async ({
  page,
}) => {
  await mountDetail(page, match([start]));
  const progress = page.locator('.score-center').getByRole('status');
  await expect(progress).toHaveText('En juego');
  await updateMatch(page, { events: [halftime, start] });
  await expect(progress).toHaveText('Descanso');
  await updateMatch(page, { events: [] });
  await expect(progress).toHaveCount(0);
  for (const status of ['postponed', 'cancelled'] as const) {
    await updateMatch(page, { status, events: [start, card] });
    await expect(progress).toHaveCount(0);
    await expect(
      page.getByText(
        status === 'postponed' ? 'Partido pospuesto' : 'Partido cancelado',
        { exact: true },
      ),
    ).toBeVisible();
  }
});

test('guardar información no escribe el minuto heredado ni la referencia derivada', async ({
  page,
}) => {
  await mountDetail(page, match([start, card]), true);
  await page.getByTitle('Editar información', { exact: true }).click();
  await expect(page.locator('#liveMinuteInput')).toHaveCount(0);
  await expect(
    page.locator('md-filled-text-field[label="Minuto en vivo"]'),
  ).toHaveCount(0);
  await page.getByTitle('Guardar', { exact: true }).click();
  await expect(
    page.getByTitle('Editar información', { exact: true }),
  ).toBeVisible();
  const updates = await page.evaluate(
    () =>
      (window as typeof window & { fixtureUpdates: Record<string, unknown> })
        .fixtureUpdates,
  );
  expect(Object.keys(updates).sort()).toEqual([
    '/matches/1/estadio',
    '/matches/1/fecha',
    '/matches/1/hora',
    '/matches/1/status',
  ]);
  const legacyMinute = await page
    .locator('match-detail-page')
    .evaluate(
      element => (element as HTMLElement & { match: Match }).match.liveMinute,
    );
  expect(legacyMinute).toBe(77);
});

test('las imágenes de Redes usan EN VIVO y MARCADOR FINAL sin minuto manual', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as typeof window & { drawnTexts: string[] }).drawnTexts = [];
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      (window as typeof window & { drawnTexts: string[] }).drawnTexts.push(
        args[0],
      );
      original.apply(this, args);
    };
  });
  await page.goto('/');
  await page.waitForFunction(() => customElements.get('social-post-generator'));
  await page.evaluate(
    fixture => {
      document.querySelector('liga-mx-hrlv')?.remove();
      const generator = document.createElement(
        'social-post-generator',
      ) as HTMLElement & {
        matchesList: Match[];
      };
      generator.matchesList = [fixture];
      document.body.replaceChildren(generator);
    },
    match([start, card]),
  );
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('round-results');
  const drawnTexts = () =>
    page.evaluate(
      () => (window as typeof window & { drawnTexts: string[] }).drawnTexts,
    );
  await expect.poll(drawnTexts).toContain('EN VIVO');
  expect(
    (await drawnTexts()).some(text => /77|Último evento|EN VIVO ·/.test(text)),
  ).toBe(false);
  await generator.evaluate(
    (element, fixture) => {
      (window as typeof window & { drawnTexts: string[] }).drawnTexts = [];
      (element as HTMLElement & { matchesList: Match[] }).matchesList = [
        fixture,
      ];
    },
    match([start, card, phase('fulltime', 90, '2T')]),
  );
  await expect.poll(drawnTexts).toContain('MARCADOR FINAL');
  expect((await drawnTexts()).some(text => /77|Último evento/.test(text))).toBe(
    false,
  );
});
