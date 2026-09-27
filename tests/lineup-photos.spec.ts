import { expect, test, type Locator, type Page } from 'playwright/test';

test.use({ serviceWorkers: 'block' });

async function mountMatch(page: Page, idMatch: number, delayed: boolean) {
  await page.evaluate(
    ({ idMatch, delayed }) => {
      history.replaceState(null, '', `?tab=Inicio&match=${idMatch}`);
      const app = document.querySelector('liga-mx-hrlv') as HTMLElement & {
        matchesList: unknown[];
        teams: string[];
        players: Map<string, unknown[]>;
        routedMatchId: string;
        isAdmin: boolean;
      };
      const teams = ['América', 'Atlas'];
      const players = teams.map(
        (team, side) =>
          [
            team,
            Array.from({ length: 11 }, (_, index) => ({
              id: `${side}-${index + 1}`,
              name: `Jugador ${side}-${index + 1}`,
              fullName: `Jugador ${side}-${index + 1}`,
              number: index + 1,
              position: index === 0 ? 'Portero' : 'Defensa',
              nationality: 'Mexicano',
              birthDate: '01/01/2000',
              imgSrc: delayed
                ? `/__test-player/${idMatch}/${side}/${index + 1}.svg`
                : 'data:image/svg+xml,' +
                  encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#007f98"/><circle cx="30" cy="20" r="10" fill="#ffb47b"/><path d="M10 60v-10a20 20 0 0 1 40 0v10" fill="#ffb47b"/></svg>',
                  ),
            })),
          ] as [string, unknown[]],
      );
      app.isAdmin = false;
      app.teams = teams;
      app.players = new Map(players);
      const lineup = Array.from({ length: 11 }, (_, index) => ({
        number: index + 1,
        titular: true,
      }));
      app.matchesList = [
        {
          idMatch,
          local: teams[0],
          visitante: teams[1],
          estadio: 'Estadio HRLV',
          fecha: new Date('2026-09-26T19:00:00-06:00'),
          hora: '19:00',
          jornada: 1,
          golLocal: null,
          golVisitante: null,
          lineupLocal: lineup,
          lineupVisitor: lineup,
          events: [],
        },
      ];
      app.routedMatchId = String(idMatch);
    },
    { idMatch, delayed },
  );
  await expect(
    page.locator('match-detail-page lineups-card img.player-photo'),
  ).toHaveCount(22);
}

async function expectLoaded(photos: Locator) {
  await expect
    .poll(() =>
      photos.evaluateAll(images =>
        images.every(image => {
          const img = image as HTMLImageElement;
          return (
            Boolean(img.currentSrc) &&
            img.complete &&
            img.naturalWidth > 0 &&
            img.naturalHeight > 0
          );
        }),
      ),
    )
    .toBe(true);
}

async function expectPainted(photo: Locator) {
  await expect(photo).toBeVisible();
  await expectLoaded(photo);
  // Compare the rendered photo to its empty slot, catching a blank painted image
  // even when its URL, complete flag and natural dimensions are all valid.
  const slot = photo.locator('..');
  const painted = await slot.screenshot({ animations: 'allow' });
  await photo.evaluate(image => {
    (image as HTMLElement).style.visibility = 'hidden';
  });
  const empty = await slot.screenshot({ animations: 'allow' });
  await photo.evaluate(image => {
    (image as HTMLElement).style.visibility = '';
  });
  expect(
    painted.equals(empty),
    'La foto debe pintar píxeles en su espacio de 60 × 60',
  ).toBe(false);
}

for (const viewport of [
  { width: 1240, height: 1500 },
  { width: 390, height: 844 },
]) {
  for (const delayed of [false, true]) {
    test(`fotos de alineaciones sin zoom: ${viewport.width}px, carga ${delayed ? 'posterior' : 'inmediata'} a la entrada`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      let releaseImages!: () => void;
      let imagesReady = new Promise<void>(resolve => {
        releaseImages = resolve;
      });
      await page.routeWebSocket('**/*', socket => socket.close());
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
          await route.abort();
        } else if (url.pathname.startsWith('/__test-player/')) {
          await imagesReady;
          await route.fulfill({
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#007f98"/><circle cx="30" cy="20" r="10" fill="#ffb47b"/><path d="M10 60v-10a20 20 0 0 1 40 0v10" fill="#ffb47b"/></svg>',
          });
        } else {
          await route.continue();
        }
      });
      await page.goto('/');
      await page.waitForFunction(
        () => customElements.get('match-detail-page') !== undefined,
      );

      for (const idMatch of [1, 2]) {
        await mountMatch(page, idMatch, delayed);
        const detail = page.locator('match-detail-page');
        const photos = detail.locator('lineups-card img.player-photo');
        if (delayed) {
          await expect
            .poll(() =>
              photos.evaluateAll(images =>
                images.every(image => !(image as HTMLImageElement).complete),
              ),
            )
            .toBe(true);
        } else {
          await expectLoaded(photos);
        }

        // The app's main > * entrance styles apply to the detail host too.
        // Wait for the real animation without cancelling it or changing zoom.
        await expect(detail).toHaveCSS('animation-name', 'tabFadeIn');
        await detail.evaluate(async element => {
          await Promise.all(
            element.getAnimations().map(animation => animation.finished),
          );
        });
        await expect(detail).toHaveCSS('transform', 'none');
        await expect(detail).toHaveCSS('opacity', '1');
        await expect(detail).toHaveCSS('animation-fill-mode', 'none');

        if (delayed) releaseImages();
        await expectLoaded(photos);
        const columns = detail.locator('lineups-card .team-column');
        for (let side = 0; side < 2; side += 1) {
          const column = columns.nth(side);
          await column.scrollIntoViewIfNeeded();
          await expectPainted(column.locator('img.player-photo').first());
          await column.evaluate(element => {
            element.scrollTop = element.scrollHeight;
          });
          await expectPainted(column.locator('img.player-photo').last());
          await testInfo.attach(`partido-${idMatch}-equipo-${side}`, {
            body: await column.screenshot({ animations: 'allow' }),
            contentType: 'image/png',
          });
        }

        await detail
          .getByRole('button', { name: 'Volver', exact: true })
          .click();
        await expect(detail).toHaveCount(0);
        imagesReady = new Promise<void>(resolve => {
          releaseImages = resolve;
        });
      }

      // Also exercise the detail's own entrance outside main > *, so removing
      // the persistent transform from only one stylesheet cannot pass the test.
      await mountMatch(page, 3, false);
      await page.locator('match-detail-page').evaluate(element => {
        document.body.replaceChildren(element);
      });
      const standalone = page.locator('match-detail-page');
      await expect(standalone).toHaveCSS('animation-name', 'slideIn');
      await standalone.evaluate(async element => {
        await Promise.all(
          element.getAnimations().map(animation => animation.finished),
        );
      });
      await expect(standalone).toHaveCSS('transform', 'none');
      await expect(standalone).toHaveCSS('opacity', '1');
      await expect(standalone).toHaveCSS('animation-fill-mode', 'none');
      await expectLoaded(standalone.locator('lineups-card img.player-photo'));
    });
  }
}
