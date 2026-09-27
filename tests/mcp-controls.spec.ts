import { expect, test } from 'playwright/test';
import { LigaBrowserController } from '../tools/mcp/browser-controller.mjs';

test.use({ serviceWorkers: 'block' });

test('liga_edit valida los controles Material y bloquea el icono de guardar alineaciones', async ({
  page,
}) => {
  await page.routeWebSocket('**/*', socket => socket.close());
  await page.route('**/*', route => {
    const hostname = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(hostname)
      ? route.continue()
      : route.abort();
  });
  await page.goto('/');
  await page.waitForFunction(
    () => customElements.get('lineups-card') !== undefined,
  );
  await page.evaluate(() => {
    document.querySelector('liga-mx-hrlv')?.remove();
    const card = document.createElement('lineups-card') as HTMLElement &
      Record<string, unknown>;
    const players = Array.from({ length: 11 }, (_, index) => ({
      id: String(index + 1),
      number: index + 1,
      name: `Jugador ${index + 1}`,
      fullName: `Jugador ${index + 1}`,
      position: 'Defensa',
      imgSrc: '',
    }));
    const lineup = players.map(player => ({
      number: player.number,
      titular: true,
    }));
    card.match = {
      idMatch: 1,
      local: 'América',
      visitante: 'Atlas',
      lineupLocal: lineup,
      lineupVisitor: lineup,
    };
    card.localPlayers = players;
    card.visitorPlayers = players;
    card.isAdmin = true;
    const checkbox = document.createElement('md-checkbox');
    checkbox.setAttribute('aria-label', 'Casilla segura');
    // No application parent, remote services or production write handlers.
    document.body.replaceChildren(card, checkbox);
    document.body.dataset.writeEvents = '0';
    card.addEventListener('edit-match', () => {
      document.body.dataset.writeEvents = String(
        Number(document.body.dataset.writeEvents) + 1,
      );
    });
  });

  const controller = new LigaBrowserController();
  controller.page = page;
  controller.ensurePage = async () => page;
  await controller.edit({
    action: 'click',
    by: 'role',
    role: 'button',
    name: 'Ver alineaciones',
  });
  await expect(
    page.getByRole('button', { name: 'Guardar Alineaciones' }),
  ).toBeEnabled();
  await expect(async () => {
    await controller.edit({ action: 'click', by: 'text', name: 'save' });
  }).rejects.toThrow(/liga_commit/);
  await expect(page.locator('body')).toHaveAttribute('data-write-events', '0');
  await controller.edit({
    action: 'check',
    by: 'label',
    name: 'Casilla segura',
  });
  await expect(
    page.getByRole('checkbox', { name: 'Casilla segura' }),
  ).toBeChecked();
  await controller.edit({
    action: 'click',
    by: 'role',
    role: 'button',
    name: 'Ocultar alineaciones',
  });
  await expect(
    page.getByRole('button', { name: 'Ver alineaciones' }),
  ).toBeVisible();
});
