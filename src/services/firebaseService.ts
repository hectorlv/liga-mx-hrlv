import {
  getDatabase,
  ref,
  onValue,
  type Unsubscribe,
} from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { formatDate } from '../utils/dateUtils';
import {
  FirebaseUpdates,
  AdminWriteRequest,
  AdminWriteResult,
  Match,
  PlayerTeam,
  U23NationalTeamCallups,
} from '../types';

type SimpleCallback<T> = (data: T) => void;

export type AdminRevisions = Record<string, number>;

function resourceForPath(path: string): string {
  const [root, key] = path.split('/').filter(Boolean);
  if (!root) throw new Error('La actualización no tiene una ruta válida.');
  return key && (root === 'matches' || root === 'players')
    ? `${root}/${key}`
    : root;
}

function buildAdminWriteRequest(
  updates: FirebaseUpdates,
  revisions: AdminRevisions,
): AdminWriteRequest {
  const resources = [...new Set(Object.keys(updates).map(resourceForPath))];
  return {
    updates,
    expectedRevisions: Object.fromEntries(
      resources.map(resource => [resource, revisions[resource] ?? 0]),
    ),
  };
}

function snapshotToArray<T>(snapshotData: Record<string, unknown>): T {
  if (!snapshotData) return [] as T;
  if (Array.isArray(snapshotData)) return snapshotData as T;
  if (typeof snapshotData === 'object') return Object.values(snapshotData) as T;
  return [] as T;
}

function snapshotToMap<K extends string, V>(val: unknown): Map<K, V> {
  const map = new Map<K, V>();
  if (!val || typeof val !== 'object') return map;

  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    map.set(key as K, value as V);
  }

  return map;
}

function subscribeToFirebasePath<T>(
  path: string,
  callback: SimpleCallback<T>,
  isArray: boolean = true,
): Unsubscribe {
  const db = getDatabase();
  const dbRef = ref(db, path);
  const unsubscribe = onValue(
    dbRef,
    snapshot => {
      let data: T;
      if (snapshot.exists()) {
        if (isArray) {
          data = snapshotToArray<T>(snapshot.val());
        } else {
          data = snapshotToMap<string, unknown>(snapshot.val()) as unknown as T;
        }
      } else {
        data = isArray ? ([] as unknown as T) : (new Map() as unknown as T);
      }
      callback(data);
    },
    error => {
      console.error('Firebase subscription error at path:', path, error);
      callback(isArray ? ([] as unknown as T) : (new Map() as unknown as T));
    },
  );
  return unsubscribe;
}

export function fetchMatches(callback: SimpleCallback<Match[]>): Unsubscribe {
  const db = getDatabase();
  return onValue(ref(db, '/matches'), snapshot => {
    const raw = snapshot.val() as Record<string, Match> | Match[] | null;
    const entries = Array.isArray(raw)
      ? raw.map((match, index) => [String(index), match] as const)
      : Object.entries(raw || {});
    const formattedMatches = entries.map(([key, match]) => ({
      ...match,
      golLocal: typeof match.golLocal === 'number' ? match.golLocal : null,
      golVisitante:
        typeof match.golVisitante === 'number' ? match.golVisitante : null,
      // Firebase keys are the canonical identity; sparse keys must not be
      // replaced by their position after sorting.
      idMatch: Number.isFinite(Number(key)) ? Number(key) : Number(match.idMatch),
      fecha: formatDate(match.fecha, match.hora),
      jornada: Number(match.jornada),
    }));
    formattedMatches.sort((a, b) => {
      if (a.jornada === b.jornada) {
        let fechaCompare = 0;
        if (a.fecha < b.fecha) fechaCompare = -1;
        else if (a.fecha > b.fecha) fechaCompare = 1;
        return fechaCompare;
      }
      return a.jornada - b.jornada;
    });
    callback(formattedMatches as Match[]);
  }, error => {
    console.error('Firebase subscription error at path: /matches', error);
    callback([]);
  });
}

export function fetchTeams(callback: SimpleCallback<string[]>): Unsubscribe {
  return subscribeToFirebasePath<string[]>('/teams', callback);
}

export function fetchStadiums(callback: SimpleCallback<string[]>): Unsubscribe {
  return subscribeToFirebasePath<string[]>('/stadiums', callback);
}

export function fetchPlayers(
  callback: SimpleCallback<PlayerTeam>,
): Unsubscribe {
  const callbackWrapper = (teamsMap: PlayerTeam) => {
    const orderPosition = ['Portero', 'Defensa', 'Medio', 'Delantero'];
    teamsMap.forEach(players => {
      players.sort((a, b) => {
        const posA = orderPosition.indexOf(a.position);
        const posB = orderPosition.indexOf(b.position);
        if (posA === posB) {
          return a.number - b.number;
        }
        return posA - posB;
      });
    });
    callback(teamsMap);
  };
  return subscribeToFirebasePath<PlayerTeam>(
    '/players',
    callbackWrapper,
    false,
  );
}

export function fetchU23NationalTeamCallups(
  callback: SimpleCallback<U23NationalTeamCallups>,
): Unsubscribe {
  return subscribeToFirebasePath<U23NationalTeamCallups>(
    '/u23NationalTeamCallups',
    callback,
    false,
  );
}

export function fetchAdminRevisions(
  callback: SimpleCallback<AdminRevisions>,
): Unsubscribe {
  return onValue(
    ref(getDatabase(), '/adminRevisions'),
    snapshot => callback((snapshot.val() || {}) as AdminRevisions),
    error => {
      console.error('Firebase subscription error at path: /adminRevisions', error);
      callback({});
    },
  );
}

export async function saveUpdates(
  updates: FirebaseUpdates,
  revisions: AdminRevisions,
): Promise<AdminWriteResult> {
  const write = httpsCallable<AdminWriteRequest, AdminWriteResult>(
    getFunctions(undefined, 'us-central1'),
    'applyAdminUpdates',
  );
  return (await write(buildAdminWriteRequest(updates, revisions))).data;
}
