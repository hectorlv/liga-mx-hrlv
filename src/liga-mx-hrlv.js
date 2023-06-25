/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { child, get, getDatabase, ref, update } from 'firebase/database';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';

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
    header: { type: String },
    app: { type: Object },
    analytics: { type: Object },
    database: { type: Object },
    matches: { type: Array },
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.header = 'My app';
    this.app = initializeApp(firebaseConfig);
    this.analytics = getAnalytics(this.app);
    this.database = getDatabase();
    this.matches = [];
  }

  render() {
    return html`
      <main>
        <table class="greyGridTable">
          <head>
            <tr>
              <th>Local</th>
              <th>Gol Local</th>
              <th>Visitante</th>
              <th>Gol Visitante</th>
              <th>Jornada</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estadio</th>
              <th></th>
            </tr>
          </head>
          <body>
            ${this.matches.map(
              (match, index) => html`
                <tr id="match${index}">
                  <td>${match.local}</td>
                  ${match.editMatch
                    ? html`
                        <td>
                          <input
                            type="number"
                            min="0"
                            .value="${match.golLocal}"
                            id="golLocal${index}"
                          />
                        </td>
                      `
                    : html` <td>${match.golLocal}</td> `}
                  <td>${match.visitante}</td>
                  ${match.editMatch
                    ? html`
                        <td>
                          <input
                            type="number"
                            min="0"
                            .value="${match.golVisitante}"
                            id="golVisitante${index}" 
                          />
                        </td>
                      `
                    : html` <td>${match.golVisitante}</td> `}
                  <td>${match.jornada}</td>
                  <td>${match.fecha}</td>
                  <td>${match.hora}</td>
                  <td>${match.estadio}</td>
                  <td>
                    <iron-icon
                      id="icon${index}"
                      index="${index}"
                      icon="${match.editMatch ? 'check' : 'create'}"
                      @click="${this._editMatch}"
                    ></iron-icon>
                  </td>
                </tr>
              `
            )}
          </body>
        </table>
      </main>

      <p class="app-footer">Made with love by HRLV.</p>
    `;
  }

  firstUpdated() {
    this._getDatabase();
  }

  _getDatabase() {
    const dbRef = ref(getDatabase());
    get(child(dbRef, '/matches'))
      .then(snapshot => {
        if (snapshot.exists()) {
          const response = snapshot.val();
          response.forEach((match, i) => {
            match.editMatch = false;
            match.idMatch = i
          }
            );
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

  _editMatch(e) {
    const index = e.target.getAttribute('index');
    if (!this.matches[index].editMatch){
      // Edit
      this.matches[index].editMatch = true;
      this.requestUpdate();
    } else {
      // Update
      const golLocal = this.shadowRoot.querySelector(`#golLocal${index}`).value;
      const golVisitante = this.shadowRoot.querySelector(`#golVisitante${index}`).value;
      const db = getDatabase();
      const updates = {};
      updates[`/matches/${  this.matches[index].idMatch  }/golLocal`] = golLocal;
      updates[`/matches/${  this.matches[index].idMatch  }/golVisitante`] =
        golVisitante;
        update(ref(db), updates).then(response => {
          this._getDatabase();
        }).catch(error => {
          console.error(error)
        });
    }
  }
}

customElements.define('liga-mx-hrlv', LigaMxHrlv);
