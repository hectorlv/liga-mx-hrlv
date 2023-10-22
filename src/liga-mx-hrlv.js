/* eslint-disable no-param-reassign */
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
import './table-page.js';
import './playoff-page.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import { FIREBASE_CONFIG, LIGUILLA } from './constants.js';

/**
 * Main class for LigaMX
 */
class LigaMxHrlv extends LitElement {
  static properties = {
    app: { type: Object },
    analytics: { type: Object },
    database: { type: Object },
    matches: { type: Array },
    teams: { type: Array },
    selectedTab: { type: Number },
    table: { type: Array },
    evento: { type: String}
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.app = initializeApp(FIREBASE_CONFIG);
    this.analytics = getAnalytics(this.app);
    this.database = getDatabase();
    this.matches = [];
    this.teams = [];
    this.selectedTab = 0;
    this.table = [];
    this.evento = "";
    
  }

  render() {
    return html`
      <main>
        <md-tabs @change="${this._tabChanged}">
          <md-primary-tab>Calendario</md-primary-tab>
          <md-primary-tab>Tabla General</md-primary-tab>
          <md-primary-tab>Liguilla</md-primary-tab>
        </md-tabs>
        ${this._getTab()}
      </main>
      <p> this.selectedTab: ${this.selectedTab} </p>
      <p> this.evento: ${this.evento} </p>
      <p class="app-footer">Made with love by HRLV.</p>
    `;
  }

  async firstUpdated() {
    await this._getMatches();
    await this._getTeams();
    this._calculateTable();
  }

  _getTab() {
    switch (this.selectedTab) {
      case 0:
        return html`
          <matches-page
            .matches="${this.matches}"
            .teams="${this.teams}"
            @edit-match="${this._editMatch}"
          ></matches-page>
        `;
      case 1:
        return html`
          <table-page
            .matches="${this.matches}"
            .table="${this.table}"
          ></table-page>
        `;
      case 2:
        return html` <playoff-page .table="${this.table}"></playoff-page> `;
      default:
        return html``;
    }
  }

  /**
   * Get matches list
   */
  async _getMatches() {
    const dbRef = ref(getDatabase());
    await get(child(dbRef, '/matches'))
      .then(snapshot => {
        if (snapshot.exists()) {
          const response = snapshot.val();
          response.forEach((match, i) => {
            match.editMatch = false;
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

  /**
   * Get teams list
   */
  async _getTeams() {
    const dbRef = ref(getDatabase());
    await get(child(dbRef, '/teams'))
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

  /**
   * Updates the selected match
   * @param {Event} e
   */
  _editMatch(e) {
    const db = getDatabase();
    const updates = e.detail;
    update(ref(db), updates)
      .then(() => {
        this._getMatches().then(() => this._calculateTable());
      })
      .catch(error => {
        console.error(error);
      });
  }

  /**
   * Changes the content when a tab is selected
   * @param {Event} e
   */
  _tabChanged(e) {
    this.evento = "entro," + JSON.stringify(e);
    this.selectedTab = e.target.activeTabIndex;
  }

  /**
   * Formats the date from a String
   * @param {String} fechaString
   * @param {String} hora
   * @returns
   */
  _formatDate(fechaString, hora) {
    if (fechaString === '') {
      return '';
    }
    // Dividir la cadena en día, mes y año
    const partesFecha = fechaString.split('/');
    const day = parseInt(partesFecha[0], 10);
    const month = parseInt(partesFecha[1], 10);
    const year = parseInt(partesFecha[2], 10);
    const fecha = new Date(year, month - 1, day);
    return new Date(fecha.toISOString().substring(0, 11) + hora);
  }

  /**
   * Calculate the positions
   */
  _calculateTable() {
    const table = this.teams.map(team => {
      const teamMatches = this.matches.filter(
        match =>
          (match.local === team || match.visitante === team) &&
          match.golLocal !== '' &&
          match.golVisitante !== '' &&
          match.jornada <= 17,
      );
      const teamStats = this.calculateTeamStats(team, teamMatches);
      return teamStats;
    });
    table.sort((a, b) => {
      if (a.pts !== b.pts) {
        return b.pts - a.pts;
      }
      if (a.dg !== b.dg) {
        return b.dg - a.dg;
      }
      return b.gf - a.gf;
    });
    this.table = table;
    this._calculatePlayOff();
  }

  calculateTeamStats(team, matches) {
    let jg = 0;
    let je = 0;
    let jp = 0;
    let gf = 0;
    let gc = 0;
    for (const match of matches) {
      const { golLocal, golVisitante, local, visitante } = match;
      if (local === team) {
        if (golLocal > golVisitante) {
          jg += 1;
        } else if (golLocal < golVisitante) {
          jp += 1;
        } else {
          je += 1;
        }
        gf += Number(golLocal);
        gc += Number(golVisitante);
      } else if (visitante === team) {
        if (golLocal < golVisitante) {
          jg += 1;
        } else if (golLocal > golVisitante) {
          jp += 1;
        } else {
          je += 1;
        }
        gf += Number(match.golVisitante);
        gc += Number(match.golLocal);
      }
    }
    return {
      equipo: team,
      jj: jg + je + jp,
      jg,
      je,
      jp,
      gf,
      gc,
      dg: gf - gc,
      pts: 3 * jg + je,
    };
  }

  _calculatePlayOff() {
    this._calculatePlayIn();
  }

  _calculatePlayIn() {
    const playIn1 = {};
    playIn1[`/matches/${LIGUILLA.playIn1.id}/local`] =
      this.table[LIGUILLA.playIn1.local].equipo;
    playIn1[`/matches/${LIGUILLA.playIn1.id}/visitante`] =
      this.table[LIGUILLA.playIn1.visitante].equipo;
    const playIn2 = {};
    playIn2[`/matches/${LIGUILLA.playIn2.id}/local`] =
      this.table[LIGUILLA.playIn2.local].equipo;
    playIn2[`/matches/${LIGUILLA.playIn2.id}/visitante`] =
      this.table[LIGUILLA.playIn2.visitante].equipo;
    const db = getDatabase();
    const updates = {...playIn1, ...playIn2};
    console.log("updates", updates);
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
