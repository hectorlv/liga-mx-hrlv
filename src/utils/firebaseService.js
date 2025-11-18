import { getDatabase, ref, onValue, update } from "firebase/database";
import { formatDate } from "./dateUtils";

export function fetchMatches(callback) {
  const dbRef = ref(getDatabase(), '/matches');
  onValue(dbRef, snapshot => {
    if (snapshot.exists()) {
      const matches = snapshot.val();
      matches.forEach((match, i) => {
        match.editMatch = false;
        match.idMatch = i;
        match.fecha = formatDate(match.fecha, match.hora);
      });
      matches.sort((a, b) => {
        if (a.jornada === b.jornada) {
          return a.fecha - b.fecha;
        }
        return a.jornada - b.jornada;
      });
      callback(matches);
    } else {
      callback([]);
    }
  },
  error => {
    console.error('Error fetching matches:', error);
    callback([]);
  });
}

export function fetchTeams(callback) {
  const dbRef = ref(getDatabase(), '/teams');
  onValue(dbRef, snapshot => {
    callback(snapshot.exists() ? snapshot.val() : []);
  },
  error => {
    console.error('Error fetching teams:', error);
    callback([]);
  });
} 

export function fetchStadiums(callback) {
  const dbRef = ref(getDatabase(), '/stadiums');
  onValue(dbRef, snapshot => {
    callback(snapshot.exists() ? snapshot.val() : []);
  },
  error => {
    console.error('Error fetching stadiums:', error);
    callback([]);
  });
}

export function fetchPlayers(callback) {
  const dbRef = ref(getDatabase(), '/players');
  onValue(dbRef, snapshot => {
    callback(snapshot.exists() ? snapshot.val() : []);
  },
  error => {
    console.error('Error fetching players:', error);
    callback([]);
  });
}

export function saveUpdates(updates) {
  const db = getDatabase();
  update(ref(db), updates);
}
