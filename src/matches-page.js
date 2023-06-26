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
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.matches = [];
    this.teams = [];
    this.teamsRes = [];
  }

  render() {
    return html`
      <main>
        <div style="max-height:350px">
        <md-filled-select label="Equipos" @change="${this._teamsChanged}">
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
      updates[`/matches/${this.matches[index].idMatch}/golLocal`] = golLocal;
      updates[`/matches/${this.matches[index].idMatch}/golVisitante`] =
        golVisitante;
      this.dispatchEvent(
        new CustomEvent('edit-match', {
          bubbles: true,
          composed: true,
          detail: updates,
        })
      );
    }
  }

  _teamsChanged(e) {
    console.log("teamsChanged", this.teams[e.target.value]);
    this.teamsRes = [...this.teams];
    let tempTeams = this.team.filter()

  }
}

customElements.define('matches-page', MatchesPage);
