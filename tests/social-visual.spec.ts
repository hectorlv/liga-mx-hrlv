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
    await page.waitForTimeout(350);
    await canvas.evaluate(element =>
      element.setAttribute('style', 'width: 1080px; height: 1350px;'),
    );
    await expect(canvas).toHaveScreenshot(`${template}.png`);
  });
}
