import assert from 'node:assert/strict';
import test from 'node:test';
import { LigaBrowserController } from '../browser-controller.mjs';

function fakePage(url = 'http://127.0.0.1:8011/') {
  return { url: () => url };
}

test('liga_commit falla antes de localizar controles sin sesión admin', async () => {
  const controller = new LigaBrowserController();
  controller.ensurePage = async () => fakePage();
  controller.adminState = async () => ({ authenticated: true, isAdmin: false });
  await assert.rejects(
    controller.commit({ name: 'Guardar', summary: 'Guardar marcador final' }),
    /claim admin/u,
  );
});

test('las operaciones rechazan una página que salió del origen local', async () => {
  const controller = new LigaBrowserController();
  controller.ensurePage = async () => fakePage('https://example.com/');
  await assert.rejects(controller.logout(), /fuera del origen local/u);
});

test('el login sin variables no solicita ni filtra credenciales', async () => {
  const previousEmail = process.env.LIGA_MX_ADMIN_EMAIL;
  const previousPassword = process.env.LIGA_MX_ADMIN_PASSWORD;
  delete process.env.LIGA_MX_ADMIN_EMAIL;
  delete process.env.LIGA_MX_ADMIN_PASSWORD;
  try {
    const controller = new LigaBrowserController();
    await assert.rejects(
      controller.loginAdmin(),
      /Configura LIGA_MX_ADMIN_EMAIL y LIGA_MX_ADMIN_PASSWORD/u,
    );
  } finally {
    if (previousEmail === undefined) delete process.env.LIGA_MX_ADMIN_EMAIL;
    else process.env.LIGA_MX_ADMIN_EMAIL = previousEmail;
    if (previousPassword === undefined)
      delete process.env.LIGA_MX_ADMIN_PASSWORD;
    else process.env.LIGA_MX_ADMIN_PASSWORD = previousPassword;
  }
});
