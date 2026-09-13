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
