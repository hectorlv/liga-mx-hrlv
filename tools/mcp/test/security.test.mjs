import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertAllowedUrl,
  assertCommitTarget,
  assertSafeEditTarget,
  normalizeBaseUrl,
} from '../security.mjs';

test('solo permite orígenes HTTP locales', () => {
  const baseUrl = normalizeBaseUrl('http://127.0.0.1:8011/');
  assert.equal(
    assertAllowedUrl('/?tab=Inicio', baseUrl).origin,
    baseUrl.origin,
  );
  assert.throws(() => normalizeBaseUrl('https://liga.example.com'));
  assert.throws(() => assertAllowedUrl('https://example.com', baseUrl));
  assert.throws(() => assertAllowedUrl('http://localhost:8011', baseUrl));
});

test('liga_edit bloquea secretos, enlaces y controles persistentes', () => {
  assert.throws(() =>
    assertSafeEditTarget({ action: 'fill', name: 'Contraseña' }),
  );
  assert.throws(() =>
    assertSafeEditTarget({ action: 'click', name: 'Guardar' }),
  );
  assert.throws(() =>
    assertSafeEditTarget({ action: 'click', name: 'Agregar Tarjeta' }),
  );
  assert.throws(() =>
    assertSafeEditTarget({ action: 'click', name: 'Calendario', role: 'link' }),
  );
  assert.throws(() =>
    assertSafeEditTarget({ action: 'click', name: 'Cerrar sesión' }),
  );
  assert.doesNotThrow(() =>
    assertSafeEditTarget({ action: 'fill', name: 'Minuto' }),
  );
});

test('liga_commit solo admite controles persistentes', () => {
  assert.doesNotThrow(() => assertCommitTarget('Guardar'));
  assert.doesNotThrow(() => assertCommitTarget('Eliminar jugador'));
  assert.doesNotThrow(() => assertCommitTarget('Agregar'));
  assert.doesNotThrow(() => assertCommitTarget('Agregar Tarjeta'));
  assert.throws(() => assertCommitTarget('Abrir detalle'));
  assert.throws(() => assertCommitTarget('Ingresar'));
});
