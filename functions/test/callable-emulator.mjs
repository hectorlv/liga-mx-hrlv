import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import assert from 'node:assert/strict';

const projectId = process.env.GCLOUD_PROJECT || 'ligamx-b16f7';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';

initializeApp({ projectId });

async function call(data, token) {
  const response = await fetch(
    `http://${functionsHost}/${projectId}/us-central1/applyAdminUpdates`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ data }),
    },
  );
  return { status: response.status, body: await response.json() };
}

const customToken = await getAuth().createCustomToken('admin-test', {
  admin: true,
});
const tokenResponse = await fetch(
  `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
);
const { idToken } = await tokenResponse.json();
assert.ok(idToken, 'El emulador de Auth debe emitir un token admin.');

const request = {
  updates: { '/matches/900/local': 'América' },
  expectedRevisions: { 'matches/900': 0 },
};
const anonymous = await call(request);
assert.equal(anonymous.status, 401, 'La llamada anónima debe rechazarse.');

const first = await call(request, idToken);
assert.equal(first.status, 200);
assert.deepEqual(first.body.data, {
  ok: true,
  revisions: { 'matches/900': 1 },
});

const conflict = await call(request, idToken);
assert.equal(conflict.status, 200);
assert.equal(conflict.body.data.ok, false);
assert.equal(conflict.body.data.code, 'conflict');
assert.deepEqual(conflict.body.data.revisions, { 'matches/900': 1 });

console.log('Callable admin: autorización, éxito y conflicto verificados.');
