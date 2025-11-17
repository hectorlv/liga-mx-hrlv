/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html, css } from 'lit';
import styles from './liga-mx-hrlv-styles.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';
import '@material/web/switch/switch.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/filled-button.js';
import './match-detail-page.js';

import { JORNADA_LIGUILLA } from './constants.js';
import {
  formatDateDDMMYYYY,
  formatDateYYYYMMDD,
  getMatchRowClass,
  replaceDateSeparator,
} from './dateUtils.js';
import { getTeamImage } from './imageUtils.js';
/**
 * Page for show the fixture
 */
class MatchesPage extends LitElement {
  static properties = {
    matches: { type: Array },
    teams: { type: Array },
    matchesRender: { type: Array },
    todayDate: { type: Object },
    todayDateSelected: { type: Boolean },
    stadiums: { type: Array },
    showDetails: { type: Boolean },
    selectedMatch: { type: Object },
    savedFilters: { type: Object },
    players: { type: Array },
    isMobile: { type: Boolean },
  };

  static get styles() {
    return [
      styles,
      css`
        .action-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .action-btn md-icon {
          font-size: 18px;
        }
        @media (max-width: 600px) {
          .action-btn .btn-label {
            display: none;
          }
          .action-btn {
            padding: 6px 8px;
            min-width: 40px;
            justify-content: center;
          }
        }

        .filters-card {
          width: 100%;
          max-width: 1100px;
          margin: var(--space-8) auto var(--space-16);
          padding: var(--space-12) var(--space-16);
          background: var(--md-sys-color-surface-container-highest);
          border-radius: var(--radius-m);
          display: flex;
          gap: var(--space-12);
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }

        .filters-card md-filled-select {
          min-width: 220px;
        }

        .today-row {
          display: inline-flex;
          align-items: center;
          gap: var(--space-8);
        }

        @media (max-width: 600px) {
          .filters-card {
            flex-direction: column;
            align-items: stretch;
          }
          .greyGridTable {
            display: none;
          }
          .match-cards {
            display: block;
            padding: 0 var(--space-8);
          }
          .match-card {
            background: var(--md-sys-color-surface-container-highest);
            border-radius: var(--radius-s);
            padding: var(--space-8);
            margin-bottom: var(--space-8);
            box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          }
          .match-card .teams {
            display: flex;
            align-items: center;
            gap: var(--space-8);
            justify-content: space-between;
          }
          .match-card .meta {
            margin-top: var(--space-6);
            font-size: 13px;
            color: var(--md-sys-color-on-surface);
          }
          .matches-filter {
            display: flex;
            flex-direction: column;
          }
          .matches-filter md-filled-select {
            width: 100%;
            margin-bottom: 10px;
          }
        }
      `,
    ];
  }

  constructor() {
    super();
    this.matches = [];
    this.teams = [];
    this.stadiums = [];
    this.matchesRender = [];
    this.todayDate = new Date();
    this.todayDateSelected = false;
    this.showDetails = false;
    this.selectedMatch = null;
    this.savedFilters = null;
    this.players = [];
    this.isMobile = window.innerWidth < 600;
  }

  connectedCallback() {
    super.connectedCallback();
    this._boundOnResize = this._onResize.bind(this);
    window.addEventListener('resize', this._boundOnResize);
  }

  firstUpdated() {
    this._onResize();
  }

  /**
   *
   * @param {Map} changed
   */
  updated(changed) {
    if (changed.has('matches')) {
      this._filtersChanged();
    }
  }

  render() {
    if (this.showDetails && this.selectedMatch) {
      return html` <main>
        <match-detail-page
          .match="${this.selectedMatch}"
          .teams="${this.teams}"
          .players="${this.players}"
          @back-to-calendar="${this._backToCalendar}"
        ></match-detail-page>
      </main>`;
    }
    return html`
      <main>
        <div class="filters-card">
          <md-filled-select
            id="teamsSelect"
            label="Equipos"
            aria-label="Seleccionar equipo"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${this.teams.map(
              (team, i) => html`
                <md-select-option value="${i}"
                  ><div slot="headline">${team}</div></md-select-option
                >
              `,
            )}
          </md-filled-select>
          <md-filled-select
            id="matchDaySelect"
            label="Jornada"
            aria-label="Seleccionar jornada"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${Array.from(
              { length: this.teams.length - 1 },
              (_, i) => i + 1,
            ).map(
              i => html`
                <md-select-option value="${i}"
                  ><div slot="headline">${i}</div></md-select-option
                >
              `,
            )}
            ${JORNADA_LIGUILLA.map(
              i => html`
                <md-select-option value="${i.id}"
                  ><div slot="headline">${i.descripcion}</div></md-select-option
                >
              `,
            )}
          </md-filled-select>
          <div class="today-row">
            <md-switch id="todayCheckbox" aria-label="Partidos de hoy" @change="${this.checkboxChanged}"></md-switch>
            <span>Partidos de hoy</span>
          </div>
        </div>
        ${!this.isMobile
          ? html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th class="dynamic-colspan">Local</th>
                    <th>Gol Local</th>
                    <th class="dynamic-colspan">Visitante</th>
                    <th>Gol Visitante</th>
                    <th>Jornada</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Estadio</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${this.matchesRender.map(
                    match => html`
                      <tr id="match${match.idMatch}" class="${getMatchRowClass(match.fecha)}">
                        <td>
                          ${match.local.trim() !== '' ? html`${getTeamImage(match.local)}` : html``}
                        </td>
                        <td>${match.local}</td>
                        ${match.editMatch
                          ? html` <td>
                              <input aria-label="Goles local" type="number" inputmode="numeric" min="0" .value="${match.golLocal}" id="golLocal${match.idMatch}" />
                            </td>`
                          : html` <td>${match.golLocal}</td> `}
                        <td>
                          ${match.visitante.trim() !== '' ? html` ${getTeamImage(match.visitante)} ` : html``}
                        </td>
                        <td>${match.visitante}</td>
                        ${match.editMatch
                          ? html` <td>
                              <input aria-label="Goles visitante" type="number" inputmode="numeric" min="0" .value="${match.golVisitante}" id="golVisitante${match.idMatch}" />
                            </td>`
                          : html` <td>${match.golVisitante}</td> `}
                        <td>${match.jornada}</td>
                        ${match.editMatch
                          ? html` <td>
                              <input aria-label="Fecha del partido" type="date" .value="${formatDateYYYYMMDD(match.fecha)}" id="fecha${match.idMatch}" />
                            </td>`
                          : html`<td>${formatDateDDMMYYYY(match.fecha)}</td> `}
                        ${match.editMatch
                          ? html` <td>
                              <input aria-label="Hora del partido" type="time" .value="${match.hora}" id="hora${match.idMatch}" />
                            </td>`
                          : html` <td>${match.hora}</td> `}
                        ${match.editMatch
                          ? html` <td>
                              <md-filled-select aria-label="Estadio" id="estadio${match.idMatch}" @change="${this._stadiumChanged}">
                                ${this.stadiums.map(stadium => html`<md-select-option value="${stadium}" ?selected=${stadium === match.estadio}><div slot="headline">${stadium}</div></md-select-option>`) }
                              </md-filled-select>
                            </td>`
                          : html`<td>${match.estadio}</td>`}
                        <td>
                          <md-filled-button class="action-btn" id="icon${match.idMatch}" index="${match.idMatch}" aria-label="${match.editMatch ? 'Guardar' : 'Editar'}" title="${match.editMatch ? 'Guardar' : 'Editar'}" @click="${this._editMatch}">
                            <md-icon>${match.editMatch ? 'check' : 'edit'}</md-icon>
                            <span class="btn-label">${match.editMatch ? 'Guardar' : 'Editar'}</span>
                          </md-filled-button>
                        </td>
                        <td>
                          <md-filled-button class="action-btn" id="iconDetails${match.idMatch}" index="${match.idMatch}" aria-label="Detalles" title="Detalles" @click="${this._showMatchDetails}">
                            <md-icon>info</md-icon>
                            <span class="btn-label">Detalles</span>
                          </md-filled-button>
                        </td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            `
          : html`
              <div class="match-cards">
                ${this.matchesRender.map(
                  match => html`
                    <div class="match-card">
                      <div class="teams">
                        <div class="team-left">
                          ${match.local.trim() !== '' ? getTeamImage(match.local) : ''}
                          <div>${match.local}</div>
                        </div>
                        <div class="score">
                          <strong>${match.golLocal}</strong>
                          <span> - </span>
                          <strong>${match.golVisitante}</strong>
                        </div>
                        <div class="team-right">
                          ${match.visitante.trim() !== '' ? getTeamImage(match.visitante) : ''}
                          <div>${match.visitante}</div>
                        </div>
                      </div>
                      <div class="meta">
                        <div>Jornada: ${match.jornada}</div>
                        <div>${formatDateDDMMYYYY(match.fecha)} ${match.hora}</div>
                        <div>${match.estadio}</div>
                      </div>
                      <div class="actions" style="margin-top:8px; display:flex; gap:8px;">
                        <md-filled-button class="action-btn" index="${match.idMatch}" aria-label="${match.editMatch ? 'Guardar' : 'Editar'}" @click="${this._editMatch}">
                          <md-icon>${match.editMatch ? 'check' : 'edit'}</md-icon>
                          <span class="btn-label">${match.editMatch ? 'Guardar' : 'Editar'}</span>
                        </md-filled-button>
                        <md-filled-button class="action-btn" index="${match.idMatch}" aria-label="Detalles" @click="${this._showMatchDetails}">
                          <md-icon>info</md-icon>
                          <span class="btn-label">Detalles</span>
                        </md-filled-button>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `}
      </main>
    `;
  }

  /**
   * Fires event edit-match when a match is changed
   * @param {Event} e
   */
  _editMatch(e) {
    const index = e.target.getAttribute('index');
    const match = this.matches.find(m => m.idMatch === Number(index));
    if (!match.editMatch) {
      // Edit
      match.editMatch = true;
      this.requestUpdate();
    } else {
      // Update
      const golLocal = this.shadowRoot.querySelector(`#golLocal${index}`).value;
      const golVisitante = this.shadowRoot.querySelector(
        `#golVisitante${index}`,
      ).value;
      const fecha = replaceDateSeparator(
        this.shadowRoot.querySelector(`#fecha${index}`).value,
      );
      const hora = this.shadowRoot.querySelector(`#hora${index}`).value;
      const estadio = this.shadowRoot.querySelector(`#estadio${index}`).value;
      const updates = {};
      updates[`/matches/${match.idMatch}/golLocal`] =
        golLocal !== '' ? Number(golLocal) : '';
      updates[`/matches/${match.idMatch}/golVisitante`] =
        golVisitante !== '' ? Number(golVisitante) : '';
      updates[`/matches/${match.idMatch}/fecha`] = fecha;
      updates[`/matches/${match.idMatch}/hora`] = hora;
      updates[`/matches/${match.idMatch}/estadio`] = estadio;
      /**
       * Fired when a match is edited
       * @event edit-match
       * @type: {Object}
       * @property: {Object} detail Contains the new values
       */
      this.dispatchEvent(
        new CustomEvent('edit-match', {
          bubbles: true,
          composed: true,
          detail: updates,
        }),
      );
      match.editMatch = true;
      this.requestUpdate();
    }
  }

  /**
   * Filter the matches when selected options change
   */
  _filtersChanged() {
    if (this.todayDateSelected) {
      this.shadowRoot.querySelector('#teamsSelect').value = '';
      this.shadowRoot.querySelector('#matchDaySelect').value = '';
    }
    const team =
      this.shadowRoot.querySelector('#teamsSelect').value === ''
        ? ''
        : this.teams[this.shadowRoot.querySelector('#teamsSelect').value];

    const matchDay = this.shadowRoot.querySelector('#matchDaySelect').value;

    this.matchesRender = this.matches.filter(match => {
      const findTeam =
        team === '' ? true : match.local === team || match.visitante === team;
      const findMatchDay = matchDay === '' ? true : match.jornada === matchDay;
      const todayDate =
        !this.todayDateSelected ||
        (this.todayDateSelected &&
          match.fecha !== '' &&
          match.fecha.getFullYear() === this.todayDate.getFullYear() &&
          match.fecha.getMonth() === this.todayDate.getMonth() &&
          match.fecha.getDate() === this.todayDate.getDate());
      return findTeam && findMatchDay && todayDate;
    });
  }

  /**
   * Fired when the checkbox change
   * @param {Event} e
   */
  checkboxChanged(e) {
    this.todayDateSelected = (e.target.selected ?? e.target.checked) || false;
    this._filtersChanged();
  }

  _onResize() {
    const isMobile = window.innerWidth < 600;
    if (this.isMobile !== isMobile) {
      this.isMobile = isMobile;
      this.requestUpdate();
    }
  }

  _showMatchDetails(e) {
    const index = e.target.getAttribute('index');
    const match = this.matches.find(m => m.idMatch === Number(index));
    if (!match) return;

    //Guardar filtros actuales
    const teamIndex =
      this.shadowRoot.querySelector('#teamsSelect')?.value || '';
    const matchDayValue =
      this.shadowRoot.querySelector('#matchDaySelect')?.value || '';
    this.savedFilters = {
      teamIndex,
      matchDayValue,
      todayDateSelected: this.todayDateSelected,
    };
    this.selectedMatch = match;
    this.showDetails = true;
    this.requestUpdate();
  }

  _backToCalendar() {
    this.showDetails = false;
    //Restaurar filtros
    this.updateComplete.then(() => {
      if (this.savedFilters) {
        this.shadowRoot.querySelector('#teamsSelect').value =
          this.savedFilters.teamIndex;
        this.shadowRoot.querySelector('#matchDaySelect').value =
          this.savedFilters.matchDayValue;
        this.todayDateSelected = this.savedFilters.todayDateSelected;
        const todaySwitch = this.shadowRoot.querySelector('#todayCheckbox');
        if (todaySwitch) todaySwitch.selected = this.todayDateSelected;
        this.savedFilters = null;
        this._filtersChanged();
      }
    });
  }
}
customElements.define('matches-page', MatchesPage);
