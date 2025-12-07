import {
  getDatabase,
  ref,
  onValue,
  update,
  type Unsubscribe,
} from 'firebase/database';
import { formatDate } from '../utils/dateUtils';
import { FirebaseUpdates, Match, Player, PlayerTeam, Stadium, Team } from '../types';

export type MatchesCallBack = (matches: Match[]) => void;
export type SimpleCallBack<T> = (data: T[]) => void;
export type PlayersCallBack = (players: PlayerTeam) => void;

function snapshotToArray<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return Object.values(val) as T[];
  return [];
}

function snapshotToMap<K extends string, V>(val: unknown): Map<K, V> {
  const map = new Map<K, V>();
  if (!val || typeof val !== 'object') return map;

  for (const [key, value] of Object.entries(val as Record<string, unknown>)) {
    map.set(key as K, value as V);
  }
  
  return map;
}

export function fetchMatches(callback: MatchesCallBack): Unsubscribe {
  const dbRef = ref(getDatabase(), '/matches');
  return onValue(
    dbRef,
    snapshot => {
      if (!snapshot.exists()) {
        callback([]);
        return;
      }

      const raw = snapshot.val();
      const rawArray = snapshotToArray<any>(raw);
      const matches = rawArray.map((match, index) => ({
        ...match,
        golLocal: match.golLocal === '' ? null : match.golLocal,
        golVisitante: match.golVisitante === '' ? null : match.golVisitante,
        idMatch: index,
        fecha: formatDate(match.fecha, match.hora),
      }));
      matches.sort((a, b) => {
        if (a.jornada === b.jornada) {
          return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0;
        }
        return a.jornada - b.jornada;
      });
      callback(matches);
    },
    error => {
      console.error('Error fetching matches:', error);
      callback([]);
    },
  );
}

export function fetchTeams(callback: SimpleCallBack<Team>): Unsubscribe {
  const dbRef = ref(getDatabase(), '/teams');
  return onValue(
    dbRef,
    snapshot => {
      const data = snapshot.exists()
        ? snapshotToArray<Team>(snapshot.val())
        : [];
      callback(data);
    },
    error => {
      console.error('Error fetching teams:', error);
      callback([]);
    },
  );
}

export function fetchStadiums(callback: SimpleCallBack<Stadium>): Unsubscribe {
  const dbRef = ref(getDatabase(), '/stadiums');
  return onValue(
    dbRef,
    snapshot => {
      const data = snapshot.exists()
        ? snapshotToArray<Stadium>(snapshot.val())
        : [];
      callback(data);
    },
    error => {
      console.error('Error fetching stadiums:', error);
      callback([]);
    },
  );
}

export function fetchPlayers(callback: PlayersCallBack): Unsubscribe {
  const dbRef = ref(getDatabase(), '/players');
  return onValue(
    dbRef,
    snapshot => {
      const data = snapshot.exists()
        ? snapshotToMap<string, Player[]>(snapshot.val())
        : new Map<string, Player[]>();
      callback(data);
    },
    error => {
      console.error('Error fetching players:', error);
      callback(new Map<string, Player[]>());
    },
  );
}

export async function saveUpdates(
  updates: FirebaseUpdates,
): Promise<void> {
  const db = getDatabase();
  return update(ref(db), updates)
    .then(() => {})
    .catch(error => {
      console.error('Error saving updates:', error);
      throw error;
    });
}