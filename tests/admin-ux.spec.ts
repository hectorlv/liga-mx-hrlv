import { expect, test, type Page } from 'playwright/test';

type FixtureEvent = Record<string, unknown>;

async function mountMatchDetail(
  page: Page,
  events: FixtureEvent[],
  isAdmin = true,
) {
  await page.goto('/');
  await page.waitForFunction(
    () => customElements.get('match-detail-page') !== undefined,
  );
  await page.evaluate(
    async ({ events: fixtureEvents, isAdmin: fixtureIsAdmin }) => {
      document.querySelector('liga-mx-hrlv')?.remove();
      const component = document.createElement(
        'match-detail-page',
      ) as HTMLElement & {
        match: Record<string, unknown>;
        isAdmin: boolean;
        updateComplete: Promise<void>;
      };
      component.match = {
        idMatch: 1,
        local: 'América',
        visitante: 'Atlas',
        estadio: 'Estadio HRLV',
        fecha: new Date('2026-09-20T19:00:00-06:00'),
        hora: '19:00',
        jornada: 1,
        golLocal: 1,
        golVisitante: 0,
        lineupLocal: [],
        lineupVisitor: [],
        events: fixtureEvents,
      };
      component.isAdmin = fixtureIsAdmin;
      component.addEventListener('edit-match', event => {
        const detail = (event as CustomEvent<{ updates: unknown }>).detail;
        (window as typeof window & { phaseUpdates?: unknown }).phaseUpdates =
          detail.updates;
      });
      document.body.replaceChildren(component);
      await component.updateComplete;
    },
    { events, isAdmin },
  );
}

async function applyPhaseUpdate(page: Page) {
  await page.evaluate(async () => {
    const component = document.querySelector(
      'match-detail-page',
    ) as HTMLElement & {
      match: Record<string, unknown>;
      updateComplete: Promise<void>;
    };
    const updates = (
      window as typeof window & {
        phaseUpdates: Record<string, FixtureEvent[]>;
      }
    ).phaseUpdates;
    component.match = {
      ...component.match,
      events: updates['/matches/1/events'],
    };
    await component.updateComplete;
  });
}

const nonPhaseEvent = {
  id: 'goal-local',
  type: 'goal',
  team: 'local',
  player: 9,
  minute: 12,
  period: '1T',
  sequence: 1,
};

const phaseEvents = [
  {
    id: 'start',
    type: 'phase',
    team: '',
    minute: 0,
    period: '1T',
    sequence: 2,
    phase: 'start',
  },
  {
    id: 'halftime',
    type: 'phase',
    team: '',
    minute: 45,
    period: '1T',
    sequence: 3,
    phase: 'halftime',
  },
  {
    id: 'second-half',
    type: 'phase',
    team: '',
    minute: 46,
    period: '2T',
    sequence: 4,
    phase: 'secondHalf',
  },
  {
    id: 'fulltime',
    type: 'phase',
    team: '',
    minute: 90,
    period: '2T',
    sequence: 5,
    phase: 'fulltime',
  },
] as const;

const undoScenarios = [
  {
    phaseCount: 1,
    undoLabel: 'Deshacer inicio del partido',
    previousControl: 'Iniciar partido',
  },
  {
    phaseCount: 2,
    undoLabel: 'Deshacer medio tiempo',
    previousControl: 'Guardar medio tiempo',
  },
  {
    phaseCount: 3,
    undoLabel: 'Deshacer inicio de la segunda mitad',
    previousControl: 'Iniciar segunda mitad',
  },
  {
    phaseCount: 4,
    undoLabel: 'Deshacer fin del partido',
    previousControl: 'Guardar tiempo completo',
  },
];

for (const scenario of undoScenarios) {
  test(`deshacer la última fase devuelve el partido al control anterior (${scenario.undoLabel})`, async ({
    page,
  }) => {
    const events =
      scenario.phaseCount === 1
        ? [...phaseEvents.slice(0, scenario.phaseCount)]
        : [nonPhaseEvent, ...phaseEvents.slice(0, scenario.phaseCount)];
    await mountMatchDetail(page, events);

    const undoButton = page.getByRole('button', { name: scenario.undoLabel });
    await expect(undoButton).toBeVisible();
    let confirmationMessage = '';
    page.once('dialog', dialog => {
      confirmationMessage = dialog.message();
      void dialog.accept();
    });
    await undoButton.click();

    expect(confirmationMessage).toBe(
      `¿Seguro que deseas deshacer ${scenario.undoLabel.replace('Deshacer ', '')}?`,
    );
    const updates = await page.evaluate(
      () =>
        (
          window as typeof window & {
            phaseUpdates?: Record<string, unknown>;
          }
        ).phaseUpdates,
    );
    const updatedEvents = updates?.['/matches/1/events'];
    expect(updatedEvents).toEqual(events.slice(0, -1));
    if (scenario.phaseCount > 1) {
      expect(updatedEvents).toContainEqual(nonPhaseEvent);
    } else {
      expect(updates).toMatchObject({
        '/matches/1/golLocal': null,
        '/matches/1/golVisitante': null,
      });
    }

    await applyPhaseUpdate(page);
    await expect(
      page.getByRole('button', { name: scenario.previousControl }),
    ).toBeVisible();
  });
}

test('cancelar deshacer una fase no emite una escritura', async ({ page }) => {
  await mountMatchDetail(page, [nonPhaseEvent, ...phaseEvents.slice(0, 2)]);
  page.once('dialog', dialog => {
    void dialog.dismiss();
  });

  await page.getByRole('button', { name: 'Deshacer medio tiempo' }).click();

  const updates = await page.evaluate(
    () => (window as typeof window & { phaseUpdates?: unknown }).phaseUpdates,
  );
  expect(updates).toBeUndefined();
});

test('no permite deshacer el inicio cuando ya hay eventos deportivos', async ({
  page,
}) => {
  await mountMatchDetail(page, [nonPhaseEvent, phaseEvents[0]]);

  await expect(page.getByRole('button', { name: /Deshacer/ })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Guardar medio tiempo' }),
  ).toBeVisible();
});

test('la acción de deshacer no aparece para el público ni sin fases', async ({
  page,
}) => {
  await mountMatchDetail(page, [], true);
  await expect(page.getByRole('button', { name: /Deshacer/ })).toHaveCount(0);

  await mountMatchDetail(page, [nonPhaseEvent, phaseEvents[0]], false);
  await expect(page.getByRole('button', { name: /Deshacer/ })).toHaveCount(0);
});

test('alineaciones muestra el contador y bloquea al doceavo titular', async ({
  page,
}) => {
  await page.goto('/');
  await page.waitForFunction(
    () => customElements.get('lineups-card') !== undefined,
  );
  await page.evaluate(async () => {
    document.querySelector('liga-mx-hrlv')?.remove();
    const card = document.createElement('lineups-card') as HTMLElement & {
      match: unknown;
      localPlayers: unknown[];
      visitorPlayers: unknown[];
      isAdmin: boolean;
      lineupsCollapsed: boolean;
      updateComplete: Promise<void>;
    };
    const players = Array.from({ length: 12 }, (_, index) => ({
      id: `player-${index + 1}`,
      number: index + 1,
      name: `Jugador ${index + 1}`,
      fullName: `Jugador ${index + 1}`,
      position: 'Medio',
      nationality: 'MX',
      birthDate: '2000/01/01',
      imgSrc: '',
    }));
    card.match = {
      idMatch: 1,
      local: 'América',
      visitante: 'Atlas',
      estadio: 'Estadio HRLV',
      fecha: new Date('2026-08-09T18:00:00-06:00'),
      hora: '18:00',
      jornada: 1,
      golLocal: 0,
      golVisitante: 0,
      lineupLocal: players.slice(0, 11).map(player => ({
        number: player.number,
        titular: true,
      })),
      lineupVisitor: players.slice(0, 11).map(player => ({
        number: player.number,
        titular: true,
      })),
      events: [],
    };
    card.localPlayers = players;
    card.visitorPlayers = players;
    card.isAdmin = true;
    document.body.replaceChildren(card);
    await card.updateComplete;
    card.lineupsCollapsed = false;
    await card.updateComplete;
  });

  const card = page.locator('lineups-card');
  await expect(card.getByText('Titulares: 11/11').first()).toBeVisible();
  await card.getByRole('button').filter({ hasText: 'Jugador 12' }).first().click();
  await expect(card).toContainText('Cada equipo puede registrar un máximo de 11 titulares.');
  await expect(card.getByText('Titulares: 11/11').first()).toBeVisible();
});

test('alineaciones ordena por posición y dorsal', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(
    () => customElements.get('lineups-card') !== undefined,
  );
  const playerNames = await page.evaluate(async () => {
    const card = document.createElement('lineups-card') as any;
    const players = [
      { name: 'Delantero 9', number: 9, position: 'Delantero' },
      { name: 'Defensa 7', number: 7, position: 'Defensa' },
      { name: 'Portero 13', number: 13, position: 'Portero' },
      { name: 'Medio 5', number: 5, position: 'Medio' },
      { name: 'Defensa 2', number: 2, position: 'Defensa' },
    ].map(player => ({
      ...player,
      id: player.name,
      fullName: player.name,
      nationality: 'MX',
      birthDate: '2000/01/01',
      imgSrc: '',
    }));
    card.match = {
      idMatch: 1,
      local: 'América',
      visitante: 'Atlas',
      estadio: 'Estadio HRLV',
      fecha: new Date('2026-08-09T18:00:00-06:00'),
      hora: '18:00',
      jornada: 1,
      golLocal: 0,
      golVisitante: 0,
      lineupLocal: [...players]
        .reverse()
        .map(player => ({ number: player.number, titular: true })),
      lineupVisitor: [...players]
        .reverse()
        .map(player => ({ number: player.number, titular: true })),
      events: [],
    };
    card.localPlayers = players;
    card.visitorPlayers = players;
    card.isAdmin = false;
    document.body.replaceChildren(card);
    await card.updateComplete;
    return Array.from(card.shadowRoot.querySelectorAll('player-info')).map(
      (info: any) => info.player.name,
    );
  });
  expect(playerNames).toEqual([
    'Portero 13',
    'Defensa 2',
    'Defensa 7',
    'Medio 5',
    'Delantero 9',
    'Portero 13',
    'Defensa 2',
    'Defensa 7',
    'Medio 5',
    'Delantero 9',
  ]);
});
