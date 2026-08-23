import { expect, test, type Page } from 'playwright/test';
import type { Match } from '../src/types/index.js';

function createMatch(
  idMatch: number,
  local: string,
  visitante: string,
  startTime: string,
  events: Match['events'] = [],
): Match {
  return {
    idMatch,
    estadio: 'Estadio HRLV',
    fecha: new Date(`2026-08-09T${startTime}:00-06:00`),
    hora: startTime,
    jornada: 1,
    local,
    visitante,
    golLocal: 0,
    golVisitante: 0,
    lineupLocal: [],
    lineupVisitor: [],
    events,
  };
}

function phaseEvent(
  id: string,
  phase: 'start' | 'fulltime',
): Match['events'][number] {
  return {
    id,
    type: 'phase',
    team: '',
    minute: phase === 'start' ? 0 : 90,
    period: phase === 'start' ? '1T' : '2T',
    sequence: 1,
    phase,
  };
}

async function mountHomeFixture(page: Page, matches: Match[]) {
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
    () => customElements.get('home-page') !== undefined,
  );
  await page.evaluate(matchesList => {
    document.querySelector('liga-mx-hrlv')?.remove();
    const fixture = document.createElement('home-page') as HTMLElement & {
      matchesList: unknown[];
    };
    fixture.matchesList = matchesList;
    document.body.replaceChildren(fixture);
  }, matches);
}

test('muestra todos los partidos en vivo aunque hayan comenzado a distinta hora', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-09T20:00:00-06:00') });
  await mountHomeFixture(page, [
    createMatch(3, 'Toluca', 'León', '19:00', [phaseEvent('start-3', 'start')]),
    createMatch(1, 'América', 'Atlas', '17:00', [phaseEvent('start-1', 'start')]),
    createMatch(2, 'Cruz Azul', 'Pachuca', '18:00', [
      phaseEvent('start-2', 'start'),
      phaseEvent('fulltime-2', 'fulltime'),
    ]),
  ]);

  const highlights = page.getByLabel('Partidos destacados');
  await expect(highlights.getByRole('link')).toHaveCount(2);
  await expect(highlights.getByRole('link')).toHaveText([
    /América[\s\S]*Atlas/,
    /Toluca[\s\S]*León/,
  ]);
});

test('mantiene juntos los partidos simultáneos cuando no hay encuentros en vivo', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-08-09T15:00:00-06:00') });
  await mountHomeFixture(page, [
    createMatch(4, 'Tigres', 'Monterrey', '20:00'),
    createMatch(2, 'Cruz Azul', 'Pachuca', '18:00'),
    createMatch(1, 'América', 'Atlas', '18:00'),
  ]);

  const highlights = page.getByLabel('Partidos destacados');
  await expect(highlights.getByRole('link')).toHaveCount(2);
  await expect(highlights.getByRole('link')).toHaveText([
    /América[\s\S]*Atlas/,
    /Cruz Azul[\s\S]*Pachuca/,
  ]);
});
