import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import assert from 'node:assert/strict';

const projectId = process.env.GCLOUD_PROJECT || 'ligamx-b16f7';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099';
const functionsHost = process.env.FUNCTIONS_EMULATOR_HOST || '127.0.0.1:5001';

initializeApp({
  projectId,
  databaseURL: `https://${projectId}-default-rtdb.firebaseio.com`,
});

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
  const body = await response.json();
  return { status: response.status, body, data: body.data ?? body.result };
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
assert.ok(
  [401, 403].includes(anonymous.status),
  'La llamada anónima debe rechazarse.',
);

const first = await call(request, idToken);
assert.equal(first.status, 200, JSON.stringify(first.body));
assert.ok(first.data, JSON.stringify(first.body));
assert.deepEqual(first.data, {
  ok: true,
  revisions: { 'matches/900': 1 },
});
assert.equal(
  (await getDatabase().ref('/adminRevisions/matches/900').once('value')).val(),
  1,
  'La revisión inicial debe persistir antes de simular la carrera.',
);

const conflict = await call(request, idToken);
assert.equal(conflict.status, 200);
assert.equal(conflict.data.ok, false);
assert.equal(conflict.data.code, 'conflict');
assert.deepEqual(conflict.data.revisions, { 'matches/900': 1 });

const concurrent = await Promise.all([
  call(
    {
      updates: { '/matches/900/local': 'Atlas' },
      expectedRevisions: { 'matches/900': 1 },
    },
    idToken,
  ),
  call(
    {
      updates: { '/matches/900/local': 'Toluca' },
      expectedRevisions: { 'matches/900': 1 },
    },
    idToken,
  ),
]);
const successes = concurrent.filter(response => response.data.ok);
const concurrentConflicts = concurrent.filter(
  response => response.data.code === 'conflict',
);
assert.equal(
  successes.length,
  1,
  `Solo una escritura concurrente debe guardar. ${JSON.stringify(concurrent)}`,
);
assert.equal(
  concurrentConflicts.length,
  1,
  'La segunda escritura concurrente debe recibir conflicto.',
);
assert.deepEqual(concurrentConflicts[0].data.revisions, {
  'matches/900': 2,
});
assert.ok(
  ['Atlas', 'Toluca'].includes(
    concurrentConflicts[0].data.current['matches/900'].local,
  ),
  'El conflicto debe incluir el recurso remoto ganador.',
);

console.log('Callable admin: autorización, éxito, conflicto y carrera verificados.');
