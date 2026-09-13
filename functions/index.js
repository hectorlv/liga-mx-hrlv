import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

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
    let conflict = null;
    const transaction = await getDatabase().ref().transaction(current => {
      const root = current && typeof current === 'object' ? structuredClone(current) : {};
      const revisions =
        root.adminRevisions && typeof root.adminRevisions === 'object'
          ? root.adminRevisions
          : {};
      const actual = Object.fromEntries(
        resources.map(resource => [
          resource,
          Number(getAtPath(revisions, `/${resource}`) || 0),
        ]),
      );
      const mismatched = resources.filter(
        resource => actual[resource] !== expectedRevisions[resource],
      );
      if (mismatched.length) {
        conflict = {
          resources: mismatched,
          revisions: Object.fromEntries(mismatched.map(key => [key, actual[key]])),
          current: Object.fromEntries(
            mismatched.map(key => [key, getAtPath(root, `/${key}`) ?? null]),
          ),
        };
        return;
      }
      Object.entries(updates).forEach(([path, value]) => setAtPath(root, path, value));
      root.adminRevisions = revisions;
      resources.forEach(resource => {
        setAtPath(root.adminRevisions, `/${resource}`, actual[resource] + 1);
      });
      return root;
    });

    if (!transaction.committed && conflict) {
      return { ok: false, code: 'conflict', ...conflict };
    }
    if (!transaction.committed)
      throw new HttpsError('aborted', 'No fue posible guardar los cambios.');
    const revisions = Object.fromEntries(
      resources.map(resource => [resource, expectedRevisions[resource] + 1]),
    );
    return { ok: true, revisions };
  },
);
