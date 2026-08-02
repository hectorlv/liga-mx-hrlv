import { expect, test } from 'playwright/test';

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
  const matches = teams.slice(0, 9).map((local, index) => ({
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
  return { matches, table };
}

async function mountSocialFixture(
  page: import('playwright/test').Page,
  fixtures: ReturnType<typeof createFixtures>,
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
  await page.evaluate(({ matches, table }) => {
    document.querySelector('liga-mx-hrlv')?.remove();
    const fixture = document.createElement('social-page') as HTMLElement & {
      matchesList: unknown[];
      table: unknown[];
    };
    fixture.matchesList = matches;
    fixture.table = table;
    document.body.replaceChildren(fixture);
  }, fixtures);
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
      await expect(generator.locator('textarea').first()).toHaveValue(
        /Jornada 1/,
      );
      await expect(generator.locator('#tracking-link')).toHaveValue(
        /utm_campaign=jornada_1/,
      );
    }
    if (template === 'day-results' || template === 'round-results') {
      await expect(generator.locator('textarea').first()).toHaveValue(
        /América 0–1 Atlas/,
      );
    }
    await canvas.evaluate(element =>
      element.setAttribute('style', 'width: 1080px; height: 1350px;'),
    );
    await page.waitForFunction(() => {
      const generator = document.querySelector('social-post-generator');
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
  const download = generator.locator('md-filled-button');
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
  expect(post).not.toContain('León 0–1 Necaxa');
  await expect(generator.locator('#x-reply')).toHaveValue(/utm_source=x/);
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
    /América 0–1 Guadalajara/,
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
  await expect(generator.locator('md-filled-button')).not.toHaveAttribute(
    'disabled',
    '',
  );
  const firstPreview = await generator
    .locator('canvas')
    .evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  await generator.locator('#match').selectOption({ index: 1 });
  await expect
    .poll(() =>
      generator.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL()),
    )
    .not.toBe(firstPreview);
});
