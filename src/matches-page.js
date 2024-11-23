/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';
import '@material/web/checkbox/checkbox.js';
import * as images from './images/index.js';
import { LOGOS, JORNADA_LIGUILLA } from './constants.js';
/**
 * Page for show the fixture
 */
class MatchesPage extends LitElement {
  static properties = {
    matches: { type: Array },
    teams: { type: Array },
    matchesRender: { type: Array },
    todayDate: { type: Object },
    images: { type: Object },
    todayDateSelected: { type: Boolean },
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.matches = [];
    this.teams = [];
    this.matchesRender = [];
    this.todayDate = new Date();
    const keys = Object.keys(images);
    keys.forEach(key => {
      // eslint-disable-next-line no-param-reassign
      images[key].className = 'logo';
    });
    this.images = { ...images };
    this.todayDateSelected = false;
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
          <label class="checkboxToday">
            <md-checkbox @change="${this.checkboxChanged}"></md-checkbox>
            Partidos de hoy
          </label>
        </div>
        <table class="greyGridTable">
          <head>
            <tr>
              <th colspan="2">Local</th>
              <th>Gol Local</th>
              <th colspan="2">Visitante</th>
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
              match => html`
                <tr
                  id="match${match.idMatch}"
                  class="${this._getClass(match.fecha)}"
                >
                  <td>
                    ${match.local.trim() !== ''
                      ? html`${this._getImage(match.local)}`
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
                      ? html` ${this._getImage(match.visitante)} `
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
                            type="text"
                            .value="${this._formatDateddmmyyy(match.fecha)}"
                            id="fecha${match.idMatch}"
                          />
                        </td>
                      `
                    : html`<td>${this._formatDateddmmyyy(match.fecha)}</td> `}
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
                  <td>${match.estadio}</td>
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
          </body>
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
      const fecha = this.shadowRoot.querySelector(`#fecha${index}`).value;
      const hora = this.shadowRoot.querySelector(`#hora${index}`).value;
      const updates = {};
      updates[`/matches/${match.idMatch}/golLocal`] =
        golLocal !== '' ? Number(golLocal) : '';
      updates[`/matches/${match.idMatch}/golVisitante`] =
        golVisitante !== '' ? Number(golVisitante) : '';
      updates[`/matches/${match.idMatch}/fecha`] = fecha;
      updates[`/matches/${match.idMatch}/hora`] = hora;
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
   * Format a date to dd/MM/yyyy
   * @param {Date} fecha
   * @returns String
   */
  _formatDateddmmyyy(fecha) {
    if (fecha === '') {
      return '';
    }
    const day = fecha.getDate();
    const month = fecha.getMonth() + 1;
    const year = fecha.getFullYear();
    const fechaFormateada = `${(day < 10 ? '0' : '') + day}/${
      month < 10 ? '0' : ''
    }${month}/${year}`;
    return fechaFormateada;
  }

  /**
   * Method to style matches for today
   * @param {Date} fecha
   * @returns String
   */
  _getClass(fecha) {
    return fecha !== '' &&
      fecha.getFullYear() === this.todayDate.getFullYear() &&
      fecha.getMonth() === this.todayDate.getMonth() &&
      fecha.getDate() === this.todayDate.getDate()
      ? 'todayMatch'
      : '';
  }

  _getImage(equipo) {
    const img = this.images[LOGOS.find(t => t.equipo === equipo).img];
    return html`<img src="${img.src}" class="${img.className}" alt="equipo" />`;
  }

  /**
   * Fired when the checkbox change
   * @param {Event} e
   */
  checkboxChanged(e) {
    this.todayDateSelected = e.target.checked;
    this._filtersChanged();
  }
}

customElements.define('matches-page', MatchesPage);
