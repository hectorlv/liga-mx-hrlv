import { expect, test } from 'playwright/test';
import type { Match, Player } from '../src/types/index.js';

const teams = [
  'América',
  'Atlas',
  'Cruz Azul',
  'Toluca',
  'Guadalajara',
  'Pachuca',
  'Monterrey',
  'Tigres de la U.A.N.L.',
  'León',
  'Necaxa',
  'Puebla F.C.',
  'Santos Laguna',
  'Tijuana',
  'FC Juárez',
  'Universidad Nacional',
  'Club Atlético de San Luis',
  'Atlante',
  'Gallos Blancos de Querétaro',
];

function createFixtures() {
  const matches = teams.slice(0, 9).map<Match>((local, index) => ({
    idMatch: index,
    estadio: 'Estadio HRLV',
    fecha: `2026/08/${String(7 + Math.floor(index / 3)).padStart(2, '0')}`,
    hora: `${String(17 + (index % 3) * 2).padStart(2, '0')}:00`,
    jornada: 1,
    local,
    visitante: teams[(index + 1) % teams.length],
    golLocal: index % 4,
    golVisitante: (index + 1) % 4,
    penaltyLocal: index === 2 ? 5 : null,
    penaltyVisitante: index === 2 ? 4 : null,
    lineupLocal: [],
    lineupVisitor: [],
    events: [
      {
        id: `fulltime-${index}`,
        type: 'phase',
        team: '',
        minute: 90,
        period: '2T',
        sequence: 1,
        phase: 'fulltime',
      },
    ],
  }));
  const table = teams.map((equipo, index) => ({
    equipo,
    jj: 3,
    jg: Math.max(0, 3 - Math.floor(index / 3)),
    je: index % 3,
    jp: Math.min(3, Math.floor(index / 4)),
    gf: 18 - index,
    gc: index % 5,
    dg: 18 - index - (index % 5),
    pts: 20 - index,
    clasificado: index < 8,
    playin: index >= 8 && index < 10,
    eliminado: index >= 10,
  }));
  return { matches, table, players: [] as [string, Player[]][] };
}

async function mountSocialFixture(
  page: import('playwright/test').Page,
  fixtures: ReturnType<typeof createFixtures>,
  openBackup = true,
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
    () => customElements.get('social-page') !== undefined,
  );
  await page.evaluate(({ matches, table, players }) => {
    document.querySelector('liga-mx-hrlv')?.remove();
    const fixture = document.createElement('social-page') as HTMLElement & {
      matchesList: unknown[];
      table: unknown[];
      players: Map<string, Player[]>;
    };
    fixture.matchesList = matches;
    fixture.table = table;
    fixture.players = new Map(players);
    document.body.replaceChildren(fixture);
  }, fixtures);
  if (openBackup)
    await page.getByText('Copies de respaldo', { exact: true }).click();
}

for (const template of [
  'round-preview',
  'day-preview',
  'day-results',
  'standings',
  'round-results',
]) {
  test(`${template} conserva la composición aprobada`, async ({ page }) => {
    await page.clock.install({ time: new Date('2026-08-09T18:00:00-06:00') });
    const fixtures = createFixtures();
    await mountSocialFixture(page, fixtures);
    const generator = page.locator('social-post-generator');
    await expect(generator).toBeVisible();
    await generator.evaluate((element, value) => {
      const select = element.shadowRoot?.querySelector(
        '#template',
      ) as HTMLSelectElement;
      select.value = value;
      select.dispatchEvent(
        new Event('change', { bubbles: true, composed: true }),
      );
    }, template);
    const canvas = generator.locator('canvas');
    await expect(canvas).toHaveJSProperty('width', 1080);
    await expect(canvas).toHaveJSProperty('height', 1350);
    if (template === 'standings') {
      await expect(
        generator.getByLabel('Texto listo para publicar'),
      ).toHaveValue(/Jornada 1/);
      await expect(generator.locator('#tracking-link')).toHaveValue(
        /utm_campaign=jornada_1/,
      );
    }
    if (template === 'day-results' || template === 'round-results') {
      await expect(
        generator.getByLabel('Texto listo para publicar'),
      ).toHaveValue(/@clubamerica 0–1 @atlasfc/);
    }
    await canvas.evaluate(element => {
      element.setAttribute('style', 'width: 1080px; height: 1350px;');
      const top = element.getBoundingClientRect().top;
      // Alinear el origen evita diferencias por el scroll al crecer los controles.
      element.style.position = 'relative';
      element.style.top = `${Math.floor(top) + 0.25 - top}px`;
    });
    await page.waitForFunction(() => {
      const generator = document
        .querySelector('social-page')
        ?.shadowRoot?.querySelector('social-post-generator');
      const canvas = generator?.shadowRoot?.querySelector('canvas');
      if (!canvas) {
        return false;
      }
      const styles = window.getComputedStyle(canvas);
      return styles.width === '1080px' && styles.height === '1350px';
    });
    await expect(canvas).toHaveScreenshot(`${template}.png`);
  });
}

test('divide la tabla entre zona de liguilla y fuera de liguilla', async ({
  page,
}) => {
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('standings');

  await expect(generator.getByText('Hora de corte')).toHaveCount(0);
  await expect(generator.locator('#standings-range option')).toHaveText([
    'Completa · 1–18',
    'Parte alta · 1–8 (zona de liguilla)',
    'Parte baja · 9–18 (fuera de liguilla)',
  ]);

  const altText = generator.locator('#alt-text');
  await expect(altText).toHaveValue(
    /1\. América.*18\. Gallos Blancos de Querétaro/,
  );

  await generator.locator('#standings-range').selectOption('top');
  await expect(altText).toHaveValue(
    /1\. América.*8\. Tigres de la U\.A\.N\.L\./,
  );
  await expect(altText).not.toHaveValue(/9\. León/);

  await generator.locator('#standings-range').selectOption('bottom');
  await expect(altText).toHaveValue(
    /9\. León.*18\. Gallos Blancos de Querétaro/,
  );
  await expect(altText).not.toHaveValue(/8\. Tigres de la U\.A\.N\.L\./);
});

test('bloquea la descarga hasta confirmar el render actual', async ({
  page,
}) => {
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  await expect(generator).toBeVisible();
  await generator.evaluate(element => {
    const socialGenerator = element as unknown as {
      _drawTeamBadge: (...args: unknown[]) => Promise<void>;
    };
    const drawTeamBadge = socialGenerator._drawTeamBadge;
    let shouldDelay = true;
    socialGenerator._drawTeamBadge = async (...args) => {
      if (shouldDelay) {
        shouldDelay = false;
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      await drawTeamBadge.apply(socialGenerator, args);
    };
    const select = element.shadowRoot?.querySelector(
      '#template',
    ) as HTMLSelectElement;
    select.value = 'round-results';
    select.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  const download = generator.getByRole('button', {
    name: 'Descargar PNG',
    exact: true,
  });
  await expect(download).toHaveAttribute('disabled', '');
  await expect(download).not.toHaveAttribute('disabled', '');
});

test('selecciona la próxima jornada en vez de la numéricamente mayor', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-06T18:00:00-06:00') });
  const fixtures = createFixtures();
  fixtures.matches.push({
    ...fixtures.matches[0],
    idMatch: 22,
    jornada: 22,
    fecha: '2026/12/01',
    hora: '19:00',
  });
  await mountSocialFixture(page, fixtures);
  const generator = page.locator('social-post-generator');
  await expect(generator.locator('#jornada')).toHaveValue('1');
});

test('separa el estado pospuesto del horario y pluraliza por día', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-06T18:00:00-06:00') });
  const fixtures = createFixtures();
  fixtures.matches = fixtures.matches.slice(0, 3);
  fixtures.matches[0].status = 'postponed';
  fixtures.matches[1].fecha = '2026/08/08';
  fixtures.matches[2].fecha = '2026/08/08';
  await mountSocialFixture(page, fixtures);
  const generator = page.locator('social-post-generator');
  const canvas = generator.locator('canvas');
  await expect(generator).toBeVisible();
  await canvas.evaluate(element => {
    element.setAttribute('style', 'width: 1080px; height: 1350px;');
    const top = element.getBoundingClientRect().top;
    // Alinear el origen evita diferencias por el scroll al crecer los controles.
    element.style.position = 'relative';
    element.style.top = `${Math.floor(top) + 0.25 - top}px`;
  });
  await expect(canvas).toHaveScreenshot('round-preview-postponed.png');
});

test('prepara resultados de jornada como hilo de X sin rebasar 280 caracteres', async ({
  page,
}) => {
  const fixtures = createFixtures();
  fixtures.matches[8].golLocal = null as unknown as number;
  fixtures.matches[8].golVisitante = null as unknown as number;
  await mountSocialFixture(page, fixtures);
  const generator = page.locator('social-post-generator');
  await generator.evaluate(element => {
    const root = element.shadowRoot!;
    const platform = root.querySelector('#platform') as HTMLSelectElement;
    platform.value = 'x';
    platform.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
    const template = root.querySelector('#template') as HTMLSelectElement;
    template.value = 'round-results';
    template.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  const post = await generator.locator('#x-post').inputValue();
  await expect(generator.locator('#x-post')).toBeVisible();
  expect(post.length).toBeLessThanOrEqual(280);
  expect(post).not.toContain('null');
  expect(post).not.toMatch(/^@clubleonfc .* @ClubNecaxa$/m);
  await expect(generator.locator('#x-reply')).toHaveValue(/utm_source=x/);
});

test('reserva el enlace para la respuesta en cualquier hilo de X', async ({
  page,
}) => {
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  await generator.evaluate(element => {
    const platform = element.shadowRoot?.querySelector(
      '#platform',
    ) as HTMLSelectElement;
    platform.value = 'x';
    platform.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  await expect(generator.locator('#x-post')).not.toHaveValue(/https?:\/\//);
  await expect(generator.locator('#x-reply')).toHaveValue(/utm_source=x/);
  await expect(
    generator.getByRole('button', { name: 'Preparar publicación en X' }),
  ).toBeVisible();
});

test('ofrece cuatro enfoques editoriales y restablece el borrador al cambiarlo', async ({
  page,
}) => {
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  const copy = generator.getByLabel('Texto listo para publicar');
  const tone = generator.locator('#copy-tone');
  const template = generator.locator('#template');
  for (const templateValue of [
    'round-preview',
    'day-preview',
    'day-results',
    'standings',
    'round-results',
    'match-summary',
  ]) {
    await template.selectOption(templateValue);
    const copies: string[] = [];
    for (const value of ['informative', 'rhythm', 'data', 'conversation']) {
      await tone.selectOption(value);
      copies.push(await copy.inputValue());
    }
    expect(new Set(copies).size).toBe(4);
  }

  await template.selectOption('round-preview');
  await tone.selectOption('data');
  await expect(copy).toHaveValue(/Jornada 1 en números/);
  await tone.selectOption('conversation');
  await expect(copy).toHaveValue(/¿Qué partido/);

  await copy.fill('Borrador editorial manual');
  await tone.selectOption('informative');
  await expect(copy).not.toHaveValue('Borrador editorial manual');

  await copy.fill('');
  await expect(copy).toHaveValue('');
});

test('comparte el PNG y el copy de Instagram cuando el dispositivo lo admite', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: (data: ShareData) => Boolean(data.files?.length),
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        (
          window as typeof window & { sharedInstagramData?: ShareData }
        ).sharedInstagramData = data;
      },
    });
  });
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  const share = generator.getByRole('button', {
    name: 'Compartir para Instagram',
  });
  await expect(share).toBeEnabled();
  await share.click();
  await expect(
    generator.getByText('Se abrió el menú para compartir.'),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = (
          window as typeof window & { sharedInstagramData?: ShareData }
        ).sharedInstagramData;
        return {
          hasCopy: Boolean(data?.text),
          fileType: data?.files?.[0]?.type,
        };
      }),
    )
    .toEqual({ hasCopy: true, fileType: 'image/png' });
});

test('conserva el fallback manual cuando el navegador no puede compartir archivos', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
  });
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  await expect(
    generator.getByText('Para compartir la imagen desde Instagram'),
  ).toBeVisible();
  await expect(
    generator.getByRole('button', { name: 'Descargar PNG' }),
  ).toBeVisible();
  await expect(
    generator.getByRole('button', { name: 'Copiar texto' }),
  ).toBeVisible();
});

test('prioriza un clásico cuando los resultados no caben en el post de X', async ({
  page,
}) => {
  const fixtures = createFixtures();
  fixtures.matches.forEach((match, index) => {
    match.local =
      index === 0
        ? 'América'
        : `Equipo local extraordinariamente largo ${index}`;
    match.visitante =
      index === 0
        ? 'Guadalajara'
        : `Equipo visitante extraordinariamente largo ${index}`;
  });
  await mountSocialFixture(page, fixtures);
  const generator = page.locator('social-post-generator');
  await generator.evaluate(element => {
    const root = element.shadowRoot!;
    const platform = root.querySelector('#platform') as HTMLSelectElement;
    platform.value = 'x';
    platform.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
    const template = root.querySelector('#template') as HTMLSelectElement;
    template.value = 'round-results';
    template.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  await expect(generator.locator('#x-post')).toHaveValue(
    /@ClubAmerica 0–1 @Chivas/,
  );
});

test('permite descargar el resumen final de un partido', async ({ page }) => {
  await mountSocialFixture(page, createFixtures());
  const generator = page.locator('social-post-generator');
  await generator.evaluate(element => {
    const select = element.shadowRoot?.querySelector(
      '#template',
    ) as HTMLSelectElement;
    select.value = 'match-summary';
    select.dispatchEvent(
      new Event('change', { bubbles: true, composed: true }),
    );
  });
  await expect(generator.locator('#match')).toBeVisible();
  await expect(
    generator.getByRole('button', { name: 'Descargar PNG', exact: true }),
  ).not.toHaveAttribute('disabled', '');
  const firstPreview = await generator
    .locator('canvas')
    .evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  await generator.locator('#match').selectOption({ index: 1 });
  await expect
    .poll(() =>
      generator
        .locator('canvas')
        .evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(firstPreview);
});

const sessionKey = 'liga-mx-hrlv:social:v1';

function createLineupFixtures() {
  const fixtures = createFixtures();
  const positions = [
    'Defensa',
    'Defensa',
    'Portero',
    'Medio',
    'Medio',
    'Medio',
    'Delantero',
    'Delantero',
    'Delantero',
    'Otra',
  ];
  const numbers = [10, 2, 1, 4, 5, 6, 7, 8, 9, 11, 12];
  const names = [
    'Defensa Diez',
    'Defensa Dos',
    'Guardameta',
    'Medio Cuatro',
    'Medio Cinco',
    'Medio Seis',
    'Delantero Siete',
    'Delantero Ocho',
    'Delantero Con Apellidos Extraordinariamente Largos Para La Imagen',
    'Sin Posición',
  ];
  const match = fixtures.matches[0];
  match.lineupLocal = numbers.map(number => ({ number, titular: true }));
  match.lineupVisitor = numbers.map(number => ({ number, titular: true }));
  fixtures.players = [match.local, match.visitante].map(team => [
    team,
    positions.map((position, index) => ({
      number: numbers[index],
      name: names[index],
      fullName: names[index],
      position,
      birthDate: '',
      nationality: '',
      imgSrc: '',
    })),
  ]);
  return fixtures;
}

test('Redes prioriza imágenes y deja los copies cerrados como respaldo', async ({
  page,
}) => {
  await mountSocialFixture(page, createFixtures(), false);
  const generator = page.locator('social-post-generator');
  await expect(
    generator.getByRole('button', { name: 'Descargar PNG', exact: true }),
  ).toBeVisible();
  await expect(
    generator.getByLabel('Descripción alternativa', { exact: true }),
  ).toBeVisible();
  await expect(generator.getByLabel('Texto listo para publicar')).toBeHidden();
  await generator.getByText('Copies de respaldo', { exact: true }).click();
  await expect(generator.getByLabel('Texto listo para publicar')).toBeVisible();
});

test('Redes recupera selección y borrador vacío tras descargar, recargar y cargar datos tarde', async ({
  page,
}) => {
  const fixtures = createFixtures();
  await mountSocialFixture(page, fixtures);
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('day-results');
  await generator.locator('#date').selectOption({ index: 1 });
  const selectedDate = await generator.locator('#date').inputValue();
  await generator.locator('#platform').selectOption('x');
  await generator.locator('#copy-tone').selectOption('data');
  await generator.getByLabel('Dominio', { exact: true }).uncheck();
  await generator.getByLabel('Cuadrícula', { exact: true }).uncheck();
  await generator.getByLabel('Primer post para X').fill('');
  const downloadEvent = page.waitForEvent('download');
  await generator
    .getByRole('button', { name: 'Descargar PNG', exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toContain('day-results');
  const saved = await page.evaluate(
    key => sessionStorage.getItem(key),
    sessionKey,
  );

  // El siguiente montaje recarga la página, pero los partidos llegan después.
  await mountSocialFixture(
    page,
    { ...fixtures, matches: [], table: [] },
    false,
  );
  await expect(generator.locator('#template')).toHaveValue('day-results');
  expect(
    await page.evaluate(key => sessionStorage.getItem(key), sessionKey),
  ).toBe(saved);
  await page.locator('social-page').evaluate((element, fixtures) => {
    Object.assign(element, {
      matchesList: fixtures.matches,
      table: fixtures.table,
    });
  }, fixtures);
  await expect(generator.locator('#date')).toHaveValue(selectedDate);
  await generator.getByText('Copies de respaldo', { exact: true }).click();
  await expect(generator.locator('#platform')).toHaveValue('x');
  await expect(generator.locator('#copy-tone')).toHaveValue('data');
  await expect(
    generator.getByLabel('Dominio', { exact: true }),
  ).not.toBeChecked();
  await expect(
    generator.getByLabel('Cuadrícula', { exact: true }),
  ).not.toBeChecked();
  await expect(generator.getByLabel('Primer post para X')).toHaveValue('');

  // Salir y regresar crea otro componente dentro de la misma pestaña.
  await page.locator('social-page').evaluate((element, fixtures) => {
    element.remove();
    const replacement = document.createElement('social-page');
    Object.assign(replacement, {
      matchesList: fixtures.matches,
      table: fixtures.table,
    });
    document.body.replaceChildren(replacement);
  }, fixtures);
  await expect(generator.locator('#date')).toHaveValue(selectedDate);
  await generator.getByText('Copies de respaldo', { exact: true }).click();
  await expect(generator.getByLabel('Primer post para X')).toHaveValue('');
});

test('Redes ajusta selecciones caducadas y conserva presentación y tono', async ({
  page,
}) => {
  await page.addInitScript(
    key =>
      sessionStorage.setItem(
        key,
        JSON.stringify({
          template: 'match-preview',
          platform: 'x',
          jornada: 999,
          matchId: 999,
          dateSelection: '2020-01-01',
          copyTone: 'conversation',
          copyDraft: 'Borrador de otro partido',
          presentation: {
            showDomain: false,
            showHandle: true,
            showGrid: false,
            standingsRange: 'bottom',
          },
        }),
      ),
    sessionKey,
  );
  await mountSocialFixture(page, createLineupFixtures());
  const generator = page.locator('social-post-generator');
  await expect(generator.locator('#jornada')).toHaveValue('1');
  await expect(generator.locator('#match')).toHaveValue('0');
  await expect(generator.locator('#copy-tone')).toHaveValue('conversation');
  await expect(
    generator.getByLabel('Dominio', { exact: true }),
  ).not.toBeChecked();
  await expect(generator.getByLabel('Primer post para X')).not.toHaveValue(
    'Borrador de otro partido',
  );
});

for (const storage of ['invalid-json', 'invalid-fields', 'unavailable']) {
  test(`Redes tolera almacenamiento ${storage}`, async ({ page }) => {
    await page.addInitScript(
      ({ key, storage }) => {
        if (storage === 'unavailable') {
          Object.defineProperty(Storage.prototype, 'getItem', {
            value: () => {
              throw new Error('Storage blocked');
            },
          });
          Object.defineProperty(Storage.prototype, 'setItem', {
            value: () => {
              throw new Error('Storage blocked');
            },
          });
        } else
          sessionStorage.setItem(
            key,
            storage === 'invalid-json'
              ? '{'
              : JSON.stringify({
                  template: 'unknown',
                  platform: 5,
                  jornada: -1,
                  presentation: {},
                  copyTone: 'unknown',
                }),
          );
      },
      { key: sessionKey, storage },
    );
    await mountSocialFixture(page, createFixtures(), false);
    const generator = page.locator('social-post-generator');
    await expect(generator.locator('#template')).toHaveValue('round-preview');
    await expect(
      generator.getByRole('button', { name: 'Descargar PNG', exact: true }),
    ).toBeEnabled();
  });
}

test('Redes no traslada selecciones a una pestaña nueva independiente', async ({
  page,
  context,
}) => {
  await mountSocialFixture(page, createFixtures(), false);
  await page
    .locator('social-post-generator #template')
    .selectOption('standings');
  const otherPage = await context.newPage();
  await mountSocialFixture(otherPage, createFixtures(), false);
  await expect(
    otherPage.locator('social-post-generator #template'),
  ).toHaveValue('round-preview');
  await otherPage.close();
});

test('previa con alineaciones ordena por posición y dorsal, exporta PNG y conserva selección', async ({
  page,
  browserName,
}, testInfo) => {
  const fixtures = createLineupFixtures();
  await mountSocialFixture(page, fixtures, false);
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('match-preview');
  const alt = generator.getByLabel('Descripción alternativa', { exact: true });
  await expect(alt).toHaveValue(
    /Alineaciones confirmadas.*1\. Guardameta; 2\. Defensa Dos; 10\. Defensa Diez; 4\. Medio Cuatro.*11\. Sin Posición; 12\. Jugador #12/,
  );
  await expect(alt).not.toHaveValue(/0 a 1|0–1/);
  await generator.getByText('Copies de respaldo', { exact: true }).click();
  await expect(generator.locator('#platform')).toHaveValue('x');
  await expect(generator.locator('#platform')).toBeDisabled();
  const copies: string[] = [];
  for (const tone of ['informative', 'rhythm', 'data', 'conversation']) {
    await generator.locator('#copy-tone').selectOption(tone);
    copies.push(await generator.getByLabel('Primer post para X').inputValue());
  }
  expect(new Set(copies).size).toBe(4);
  for (const copy of copies) {
    expect(copy.length).toBeLessThanOrEqual(280);
    expect(copy).not.toMatch(/0–1|https?:/);
  }
  const downloadButton = generator.getByRole('button', {
    name: 'Descargar PNG',
    exact: true,
  });
  await expect(downloadButton).toBeEnabled();
  const canvas = generator.locator('canvas');
  await expect(canvas).toHaveJSProperty('width', 1080);
  await expect(canvas).toHaveJSProperty('height', 1350);
  if (browserName === 'chromium') {
    await generator.getByText('Copies de respaldo', { exact: true }).click();
    await page.screenshot({
      path: testInfo.outputPath('preview-ui.png'),
      fullPage: true,
    });
    const png = await canvas.evaluate(
      element =>
        (element as HTMLCanvasElement).toDataURL('image/png').split(',')[1],
    );
    expect(Buffer.from(png, 'base64')).toMatchSnapshot('match-preview.png');
  }
  const downloadEvent = page.waitForEvent('download');
  await downloadButton.click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/match-preview-j1-p0-.*\.png$/);
  if (browserName === 'chromium')
    await download.saveAs(testInfo.outputPath('match-preview.png'));
  await mountSocialFixture(page, fixtures, false);
  await expect(generator.locator('#template')).toHaveValue('match-preview');
  await expect(generator.locator('#match')).toHaveValue('0');
});

test('previa con alineaciones bloquea titulares incompletos, duplicados y exportaciones desactualizadas', async ({
  page,
}) => {
  const fixtures = createLineupFixtures();
  await mountSocialFixture(page, fixtures, false);
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('match-preview');
  const download = generator.getByRole('button', {
    name: 'Descargar PNG',
    exact: true,
  });
  await expect(download).toBeEnabled();
  await generator.locator('#match').selectOption('1');
  await expect(download).toBeDisabled();
  await expect(generator.locator('.validation')).toHaveText([
    'Atlas: 0/11 titulares con dorsal distinto.',
    'Cruz Azul: 0/11 titulares con dorsal distinto.',
  ]);
  await expect(
    generator.getByLabel('Descripción alternativa', { exact: true }),
  ).toHaveValue(/^Alineaciones pendientes/);
  await generator.locator('#match').selectOption('0');
  await expect(download).toBeEnabled();
  fixtures.matches[0].lineupLocal[0].number = 2;
  fixtures.matches[0].lineupVisitor.pop();
  await page.locator('social-page').evaluate((element, fixtures) => {
    Object.assign(element, { matchesList: fixtures.matches });
  }, fixtures);
  await expect(download).toBeDisabled();
  await expect(generator.locator('.validation')).toHaveText([
    'América: 10/11 titulares con dorsal distinto (hay dorsales duplicados).',
    'Atlas: 10/11 titulares con dorsal distinto.',
  ]);
});

test('Redes conserva el rango de tabla y un borrador manual tras recargar', async ({
  page,
}) => {
  const fixtures = createFixtures();
  await mountSocialFixture(page, fixtures);
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('standings');
  await generator.locator('#standings-range').selectOption('bottom');
  await generator.locator('#copy-tone').selectOption('rhythm');
  await generator
    .getByLabel('Texto listo para publicar')
    .fill('Mi borrador editorial');
  await generator.getByLabel('Usuario', { exact: true }).uncheck();
  await mountSocialFixture(page, fixtures);
  await expect(generator.locator('#standings-range')).toHaveValue('bottom');
  await expect(generator.locator('#copy-tone')).toHaveValue('rhythm');
  await expect(generator.getByLabel('Texto listo para publicar')).toHaveValue(
    'Mi borrador editorial',
  );
  await expect(
    generator.getByLabel('Usuario', { exact: true }),
  ).not.toBeChecked();
});

test('previa con alineaciones mantiene controles y vista previa dentro del ancho móvil', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountSocialFixture(page, createLineupFixtures(), false);
  const generator = page.locator('social-post-generator');
  await generator.locator('#template').selectOption('match-preview');
  await expect(
    generator.getByRole('button', { name: 'Descargar PNG', exact: true }),
  ).toBeEnabled();
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 1024 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    const canvas = await generator.locator('canvas').boundingBox();
    expect(canvas?.width).toBeLessThanOrEqual(width);
  }
});
