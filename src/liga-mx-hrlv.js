/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { child, get, getDatabase, ref, update } from 'firebase/database';
import {
  GoogleAuthProvider,
  getAuth,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import './matches-page.js';
import './table-page.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/tab.js';

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
    teams: { type: Array },
    selectedTab: { type: Number },
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
    this.selectedTab = 0;
    this.provider = new GoogleAuthProvider();
    this.auth = getAuth();
    signInWithRedirect(this.auth, this.provider);
  }

  render() {
    return html`
      <main>
        <md-tabs @change="${this._tabChanged}">
          <md-tab>Calendario</md-tab>
          <md-tab>Tabla General</md-tab>
        </md-tabs>
        ${this.selectedTab === 0
          ? html`
              <matches-page
                .matches="${this.matches}"
                .teams="${this.teams}"
                @edit-match="${this._editMatch}"
              ></matches-page>
            `
          : html`
              <table-page
                .matches="${this.matches}"
                .teams="${this.teams}"
              ></table-page>
            `}
      </main>
      <p class="app-footer">Made with love by HRLV.</p>
    `;
  }

  firstUpdated() {
    console.log("auth", this.auth);
    getRedirectResult(this.auth)
      .then(result => {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential.accessToken;
        const { user } = result;
        console.log('token', token, 'user', user);
        this._getMatches();
        this._getTeams();
      })
      .catch(error => {
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.error(error, credential);
      });
    /* signInWithPopup(this.auth, this.provider).then(result => {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;
      const {user} = result;
      console.log("token", token, "user", user);
      this._getMatches();
      this._getTeams();
    }).catch(error => {
      const credential = GoogleAuthProvider.credentialFromError(error);
      console.error(error, credential)
    }) */
  }

  _getMatches() {
    const dbRef = ref(getDatabase());
    get(child(dbRef, '/matches'))
      .then(snapshot => {
        if (snapshot.exists()) {
          const response = snapshot.val();
          response.forEach((match, i) => {
            // eslint-disable-next-line no-param-reassign
            match.editMatch = false;
            // eslint-disable-next-line no-param-reassign
            match.idMatch = i;
            match.fecha = this._formatDate(match.fecha, match.hora);
          });
          response.sort((a, b) => {
            if (a.jornada === b.jornada) {
              return a.fecha - b.fecha;
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

  _tabChanged(e) {
    this.selectedTab = e.target.selected;
  }

  _formatDate(fechaString, hora) {
    // Dividir la cadena en día, mes y año
    const partesFecha = fechaString.split('/');
    const day = parseInt(partesFecha[0], 10);
    const month = parseInt(partesFecha[1], 10);
    const year = parseInt(partesFecha[2], 10);
    const fecha = new Date(year, month - 1, day);
    return new Date(fecha.toISOString().substring(0, 11) + hora);
  }
}

customElements.define('liga-mx-hrlv', LigaMxHrlv);
