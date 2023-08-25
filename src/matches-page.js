/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';

class MatchesPage extends LitElement {
  static properties = {
    matches: { type: Array },
    teams: { type: Array },
    matchesRender: { type: Array },
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.matches = [];
    this.teams = [];
    this.matchesRender = [];
  }

  updated(changed) {
    if (changed.has('matches')) {
      this.matchesRender = [...this.matches];
    }
  }

  render() {
    return html`
      <main>
        <div style="max-height:350px">
          <md-filled-select
            id="teamsSelect"
            label="Equipos"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${this.teams.map(
              (team, i) => html`
                <md-select-option
                  value="${i}"
                  headline="${team}"
                ></md-select-option>
              `
            )}
          </md-filled-select>
          <md-filled-select
            id="matchdaySelect"
            label="Jornada"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${Array.from(
              { length: this.teams.length - 1 },
              (_, i) => i + 1
            ).map(
              i => html`
                <md-select-option
                  value="${i}"
                  headline="${i}"
                ></md-select-option>
              `
            )}
          </md-filled-select>
        </div>
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
            ${this.matchesRender.map(
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
                  <td>${this._formatDateddmmyyy(match.fecha)}</td>
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
    `;
  }

  _editMatch(e) {
    const index = e.target.getAttribute('index');
    if (!this.matches[index].editMatch) {
      // Edit
      this.matches[index].editMatch = true;
      this.requestUpdate();
    } else {
      // Update
      const golLocal = this.shadowRoot.querySelector(`#golLocal${index}`).value;
      const golVisitante = this.shadowRoot.querySelector(
        `#golVisitante${index}`
      ).value;
      const updates = {};
      updates[`/matches/${this.matches[index].idMatch}/golLocal`] = Number(golLocal);
      updates[`/matches/${this.matches[index].idMatch}/golVisitante`] =
        Number(golVisitante);
      this.dispatchEvent(
        new CustomEvent('edit-match', {
          bubbles: true,
          composed: true,
          detail: updates,
        })
      );
    }
  }

  _filtersChanged() {
    const team =
      this.shadowRoot.querySelector('#teamsSelect').value === ''
        ? ''
        : this.teams[this.shadowRoot.querySelector('#teamsSelect').value];
    const matchday = this.shadowRoot.querySelector('#matchdaySelect').value;
    this.matchesRender = this.matches.filter(match => {
      const findTeam =
        team === '' ? true : match.local === team || match.visitante === team;
      const findMatchDay = matchday === '' ? true : match.jornada === matchday;
      return findTeam && findMatchDay;
    });
  }

  _formatDateddmmyyy(fecha) {
    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();
    const fechaFormateada = `${(dia < 10 ? '0' : '') + dia  }/${  mes < 10 ? '0' : ''  }${mes  }/${  anio}`;
    return fechaFormateada;
  }
}

customElements.define('matches-page', MatchesPage);
