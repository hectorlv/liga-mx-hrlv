import { expect, test } from 'playwright/test';

async function mountConsistency(
  page: import('playwright/test').Page,
  withIssues: boolean,
) {
  await page.goto('/');
  await page.waitForFunction(
    () => customElements.get('consistency-page') !== undefined,
  );
  await page.evaluate(hasIssues => {
    document.querySelector('liga-mx-hrlv')?.remove();
    const page = document.createElement('consistency-page') as HTMLElement & {
      matchesList: unknown[];
      players: Map<string, unknown[]>;
    };
    const base = {
      estadio: 'Estadio HRLV', fecha: '2026/08/07', hora: '19:00', jornada: 1,
      local: 'América', visitante: 'Atlas', golLocal: 1, golVisitante: 0,
      lineupLocal: [], lineupVisitor: [], events: [],
    };
    page.matchesList = hasIssues ? [
      { ...base, idMatch: 1, fecha: 'invalida', hora: '25:00', lineupLocal: Array.from({ length: 12 }, (_, number) => ({ number, titular: true })), events: [{ id: 'goal', type: 'goal', team: 'visitor', player: 1, minute: 1, period: '1T', sequence: 1 }] },
      { ...base, idMatch: 156, local: 'Atlas', visitante: 'América' },
      { ...base, idMatch: 160, local: 'Toluca', visitante: 'Cruz Azul' },
    ] : [{ ...base, idMatch: 1 }];
    page.players = new Map([['América', hasIssues ? [
      { id: 'one', name: 'Uno', fullName: 'Uno', birthDate: '2005/01/01', imgSrc: '', nationality: 'MX', number: 9, position: 'Delantero' },
      { id: 'two', name: 'Dos', fullName: 'Dos', birthDate: '2005/01/01', imgSrc: '', nationality: 'MX', number: 9, position: 'Defensa' },
    ] : [
      { id: 'one', name: 'Uno', fullName: 'Uno', birthDate: '2005/01/01', imgSrc: '', nationality: 'MX', number: 9, position: 'Delantero' },
    ]]]);
    document.body.replaceChildren(page);
  }, withIssues);
}

test('muestra los cinco diagnósticos sin escribir datos', async ({ page }) => {
  await mountConsistency(page, true);
  const center = page.locator('consistency-page');
  await expect(center.locator('.issue')).toHaveCount(5);
  await expect(center).toContainText('Fecha u horario inválido');
  await expect(center).toContainText('Más de once titulares');
  await expect(center).toContainText('Dorsal duplicado');
  await expect(center).toContainText('Marcador y eventos no coinciden');
  await expect(center).toContainText('Serie de liguilla incompleta');
  await expect(center.locator('button')).toHaveCount(0);
});

test('informa cuando no hay inconsistencias', async ({ page }) => {
  await mountConsistency(page, false);
  await expect(page.locator('consistency-page')).toContainText(
    'Sin inconsistencias detectadas',
  );
});
