/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { child, get, getDatabase, ref, update } from 'firebase/database';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import './matches-page.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC5d4WwcPNe8kHoYurl5qBm9HBF3hRTPMU',
  authDomain: 'ligamx-b16f7.firebaseapp.com',
  databaseURL: 'https://ligamx-b16f7-default-rtdb.firebaseio.com',
  projectId: 'ligamx-b16f7',
  storageBucket: 'ligamx-b16f7.appspot.com',
  messagingSenderId: '363875455177',
  appId: '1:363875455177:web:f96a1cd9f9863cac967d18',
  measurementId: 'G-VKRRB5SGHD',
};

class LigaMxHrlv extends LitElement {
  static properties = {
    app: { type: Object },
    analytics: { type: Object },
    database: { type: Object },
    matches: { type: Array },
    teams: { type: Array }
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.app = initializeApp(firebaseConfig);
    this.analytics = getAnalytics(this.app);
    this.database = getDatabase();
    this.matches = [];
    this.teams = [];
  }

  render() {
    return html`
      <main>
        <matches-page
          .matches="${this.matches}"
          .teams="${this.teams}"
          @edit-match="${this._editMatch}"
        ></matches-page>
      </main>
      <p class="app-footer">Made with love by HRLV.</p>
    `;
  }

  firstUpdated() {
    this._getMatches();
    this._getTeams();
  }

  _getMatches() {
    const dbRef = ref(getDatabase());
    get(child(dbRef, '/matches'))
      .then(snapshot => {
        if (snapshot.exists()) {
          const response = snapshot.val();
          response.forEach((match, i) => {
            match.editMatch = false;
            match.idMatch = i;
          });
          response.sort((a, b) => {
            if (a.jornada === b.jornada) {
              const date1 = new Date(a.fecha);
              const date2 = new Date(b.fecha);
              if (date1 === date2) {
                return a.hora - b.hora;
              }
              return date1 - date2;
            }
            return a.jornada - b.jornada;
          });
          this.matches = response;
        } else {
          this.matches = [];
        }
      })
      .catch(error => {
        console.error(error);
      });
  }

  _getTeams() {
    const dbRef = ref(getDatabase());
    get(child(dbRef, '/teams'))
      .then(snapshot => {
        if (snapshot.exists()) {
          this.teams = snapshot.val();
          console.log("teams", this.teams);
        } else {
          this.teams = [];
        }
      })
      .catch(error => {
        console.error(error);
      });
  }

  _editMatch(e) {
    const db = getDatabase();
    const updates = e.detail;
    update(ref(db), updates)
      .then(() => {
        this._getMatches();
      })
      .catch(error => {
        console.error(error);
      });
  }
}

customElements.define('liga-mx-hrlv', LigaMxHrlv);
