/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html, css } from 'lit';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';
import '@material/web/checkbox/checkbox.js';

import { JORNADA_LIGUILLA } from './constants.js';
import { formatDateddmmyyy, formatDateyyyymmdd, getMatchRowClass, replaceDateSeparator } from './dateUtils.js';
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
  };

  static get styles() {
    return [
      styles,
      css`
        @media (max-width: 600px) {
          .greyGridTable {
            width: 100%;
            font-size: 12px;
            display: block;
            overflow-x: auto;
            white-space: nowrap;
          }
          .greyGridTable thead, .greyGridTable tbody {
            display: block;
          }
          .greyGridTable th, .greyGridTable td {
            padding: 5px;
            box-sizing: border-box;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .greyGridTable tbody tr {
            display: table;
            width: 100%;
            table-layout: fixed;
          }
          .matches-filter {
            display: flex;
            flex-direction: column;
          }
          .matches-filter md-filled-select {
            width: 100%;
            margin-bottom: 10px;
          }
          .greyGridTable th:nth-child(5),
          .greyGridTable th:nth-child(6),
          .greyGridTable th:nth-child(7),
          .greyGridTable th:nth-child(8),
          .greyGridTable td:nth-child(2),
          .greyGridTable td:nth-child(5),
          .greyGridTable td:nth-child(7),
          .greyGridTable td:nth-child(8),
          .greyGridTable td:nth-child(9),
          .greyGridTable td:nth-child(10) {
            display: none;
          }
        }
      `
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
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('resize', this._adjustTable.bind(this));
  }
  
  firstUpdated() {
    this._adjustTable();
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
    return html`
      <main>
        <div class="matches-filter">
          <md-filled-select
            id="teamsSelect"
            label="Equipos"
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
          <label class="checkbox
          Today">
            <md-checkbox @change="${this.checkboxChanged}"></md-checkbox>
            Partidos de hoy
          </label>
        </div>
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
            </tr>
          </thead>
          <tbody>
            ${this.matchesRender.map(
              match => html`
                <tr
                  id="match${match.idMatch}"
                  class="${getMatchRowClass(match.fecha)}"
                >
                  <td>
                    ${match.local.trim() !== ''
                      ? html`${getTeamImage(match.local)}`
                      : html``}
                  </td>
                  <td>${match.local}</td>
                  ${match.editMatch
                    ? html`
                        <td>
                          <input
                            type="number"
                            min="0"
                            .value="${match.golLocal}"
                            id="golLocal${match.idMatch}"
                          />
                        </td>
                      `
                    : html` <td>${match.golLocal}</td> `}
                  <td>
                    ${match.visitante.trim() !== ''
                      ? html` ${getTeamImage(match.visitante)} `
                      : html``}
                  </td>
                  <td>${match.visitante}</td>
                  ${match.editMatch
                    ? html`
                        <td>
                          <input
                            type="number"
                            min="0"
                            .value="${match.golVisitante}"
                            id="golVisitante${match.idMatch}"
                          />
                        </td>
                      `
                    : html` <td>${match.golVisitante}</td> `}
                  <td>${match.jornada}</td>
                  ${match.editMatch
                    ? html`
                        <td>
                          <input
                            type="date"
                            .value="${formatDateyyyymmdd(match.fecha)}"
                            id="fecha${match.idMatch}"
                          />
                        </td>
                      `
                    : html`<td>${formatDateddmmyyy(match.fecha)}</td> `}
                  ${match.editMatch
                    ? html`
                        <td>
                          <input
                            type="time"
                            .value="${match.hora}"
                            id="hora${match.idMatch}"
                          />
                        </td>
                      `
                    : html` <td>${match.hora}</td> `}
                  ${match.editMatch ? html`
                  <td>
                    <md-filled-select id="estadio${match.idMatch}" @change="${this._stadiumChanged}">
                      ${this.stadiums.map(
                        stadium => html`
                          <md-select-option value="${stadium}" ?selected=${stadium === match.estadio}>
                            <div slot="headline">${stadium}</div></md-select-option>
                        `,
                      )}
                    </md-filled-select>
                  </td>
                  ` : html`<td>${match.estadio}</td>`}
                  <td>
                    <iron-icon
                      id="icon${match.idMatch}"
                      index="${match.idMatch}"
                      icon="${match.editMatch ? 'check' : 'create'}"
                      @click="${this._editMatch}"
                    ></iron-icon>
                  </td>
                </tr>
              `,
            )}
          </tbody>
        </table>
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
      const fecha = replaceDateSeparator(this.shadowRoot.querySelector(`#fecha${index}`).value);
      const hora = this.shadowRoot.querySelector(`#hora${index}`).value;
      const estadio = this.shadowRoot.querySelector(`#estadio${index}`).value;
      const updates = {};
      updates[`/matches/${match.idMatch}/golLocal`] =
        golLocal !== '' ? Number(golLocal) : '';
      updates[`/matches/${match.idMatch}/golVisitante`] =
        golVisitante !== '' ? Number(golVisitante) : '';
      updates[`/matches/${match.idMatch}/fecha`] = fecha;
      updates[`/matches/${match.idMatch}/hora`] = hora;
      updates[`/matches/${match.idMatch}/estadio`] = estadio
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
      const todayDate = !this.todayDateSelected || this.todayDateSelected  && match.fecha !== '' &&
        match.fecha.getFullYear() === this.todayDate.getFullYear() &&
        match.fecha.getMonth() === this.todayDate.getMonth() &&
        match.fecha.getDate() === this.todayDate.getDate();
      return findTeam && findMatchDay && todayDate;
    });
  }

  /**
   * Fired when the checkbox change
   * @param {Event} e
   */
  checkboxChanged(e) {
    this.todayDateSelected = e.target.checked;
    this._filtersChanged();
  }

  _adjustTable() {
    const dynamicColspan = this.shadowRoot.querySelectorAll('.dynamic-colspan');
    const isMobile = window.innerWidth < 600;
    dynamicColspan.forEach(col => {
      col.colSpan = isMobile ? 1 : 2;
    });
  }
}

customElements.define('matches-page', MatchesPage);
