import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const firebaseApp = initializeApp({
  databaseURL: 'https://ligamx-b16f7-default-rtdb.firebaseio.com',
});
const database = getDatabase(firebaseApp);

const ALLOWED_ROOTS = new Set([
  'matches',
  'players',
  'teams',
  'stadiums',
  'u23NationalTeamCallups',
]);

function segments(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new HttpsError('invalid-argument', 'Cada ruta debe comenzar con /.');
  }
  const values = path.split('/').filter(Boolean);
  if (!values.length || values.some(value => value === '.' || value === '..')) {
    throw new HttpsError('invalid-argument', 'La ruta no es válida.');
  }
  return values;
}

function resourceForPath(path) {
  const values = segments(path);
  const [root, key] = values;
  if (!ALLOWED_ROOTS.has(root)) {
    throw new HttpsError('invalid-argument', 'La ruta no puede editarse.');
  }
  if ((root === 'matches' || root === 'players') && !key) {
    throw new HttpsError('invalid-argument', 'Falta la identidad del recurso.');
  }
  return key ? `${root}/${key}` : root;
}

function getAtPath(source, path) {
  return segments(path).reduce(
    (current, segment) =>
      current && typeof current === 'object' ? current[segment] : undefined,
    source,
  );
}

function getRevision(revisions, resource) {
  const directValue = revisions?.[resource];
  if (directValue !== undefined) return Number(directValue) || 0;
  return Number(getAtPath(revisions, `/${resource}`) || 0);
}

function setAtPath(target, path, value) {
  const values = segments(path);
  let cursor = target;
  values.slice(0, -1).forEach(segment => {
    if (!cursor[segment] || typeof cursor[segment] !== 'object')
      cursor[segment] = {};
    cursor = cursor[segment];
  });
  const last = values.at(-1);
  if (value === null) delete cursor[last];
  else cursor[last] = value;
}

function validateRequest(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new HttpsError('invalid-argument', 'Solicitud inválida.');
  const { updates, expectedRevisions } = data;
  if (!updates || typeof updates !== 'object' || Array.isArray(updates))
    throw new HttpsError('invalid-argument', 'Faltan actualizaciones válidas.');
  if (
    !expectedRevisions ||
    typeof expectedRevisions !== 'object' ||
    Array.isArray(expectedRevisions)
  ) {
    throw new HttpsError('invalid-argument', 'Faltan revisiones esperadas.');
  }
  const resources = [...new Set(Object.keys(updates).map(resourceForPath))];
  if (!resources.length)
    throw new HttpsError('invalid-argument', 'No hay cambios para guardar.');
  resources.forEach(resource => {
    if (!Number.isInteger(expectedRevisions[resource]) || expectedRevisions[resource] < 0) {
      throw new HttpsError('invalid-argument', 'La revisión esperada no es válida.');
    }
  });
  return { updates, expectedRevisions, resources };
}

export const applyAdminUpdates = onCall(
  { region: 'us-central1' },
  async request => {
    if (request.auth?.token.admin !== true)
      throw new HttpsError('permission-denied', 'Se requiere permiso administrativo.');

    const { updates, expectedRevisions, resources } = validateRequest(request.data);
    const snapshot = await database.ref('/adminRevisions').once('value');
    const revisions =
      snapshot.val() && typeof snapshot.val() === 'object'
        ? structuredClone(snapshot.val())
        : {};
    const actual = Object.fromEntries(
      resources.map(resource => [resource, getRevision(revisions, resource)]),
    );
    const mismatched = resources.filter(
      resource => actual[resource] !== expectedRevisions[resource],
    );
    if (mismatched.length) {
      return {
        ok: false,
        code: 'conflict',
        resources: mismatched,
        revisions: Object.fromEntries(mismatched.map(key => [key, actual[key]])),
        current: Object.fromEntries(mismatched.map(key => [key, null])),
      };
    }
    const writeUpdates = { ...updates };
    resources.forEach(resource => {
      writeUpdates[`/adminRevisions/${resource}`] = actual[resource] + 1;
    });
    await database.ref().update(writeUpdates);
    const nextRevisions = Object.fromEntries(
      resources.map(resource => [resource, expectedRevisions[resource] + 1]),
    );
    return { ok: true, revisions: nextRevisions };
  },
);
