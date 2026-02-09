import {
  getDatabase,
  ref,
  onValue,
  update,
  type Unsubscribe,
} from 'firebase/database';
import { formatDate } from '../utils/dateUtils';
import { FirebaseUpdates, Match, PlayerTeam } from '../types';

type SimpleCallback<T> = (data: T) => void;

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
      callback([] as unknown as T);
    },
  );
  return unsubscribe;
}

export function fetchMatches(callback: SimpleCallback<Match[]>): Unsubscribe {
  const callbackWrapper = (matches: Match[]) => {
    const formattedMatches = matches.map((match, index) => ({
      ...match,
      golLocal: typeof match.golLocal === 'number' ? match.golLocal : null,
      golVisitante:
        typeof match.golVisitante === 'number' ? match.golVisitante : null,
      idMatch: index,
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
  };
  return subscribeToFirebasePath<Match[]>('/matches', callbackWrapper);
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

export async function saveUpdates(updates: FirebaseUpdates): Promise<void> {
  const db = getDatabase();
  return update(ref(db), updates)
    .then(() => {})
    .catch(error => {
      console.error('Error saving updates:', error);
      throw error;
    });
}
