import { expect, test } from 'playwright/test';

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
