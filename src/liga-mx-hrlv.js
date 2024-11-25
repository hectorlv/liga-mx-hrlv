/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { LitElement, html } from 'lit';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase, onValue, ref, update } from 'firebase/database';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import './matches-page.js';
import './table-page.js';
import './playoff-page.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import './my-navbar.js';
import { FIREBASE_CONFIG, LIGUILLA } from './constants.js';
import './login-page.js';
import { getAuth } from 'firebase/auth';
import '@material/web/dialog/dialog.js';

/**
 * Main class for LigaMX
 */
class LigaMxHrlv extends LitElement {
  static properties = {
    app: { type: Object },
    analytics: { type: Object },
    database: { type: Object },
    matches: { type: Array, attribute: false },
    teams: { type: Array },
    selectedTab: { type: String },
    table: { type: Array, attribute: false },
    evento: { type: String },
    auth: { type: Object },
    titleError: { type: String },
    contentError: { type: String },
    user: { type: Object },
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
    this.selectedTab = 'Login';
    this.table = [];
    this.evento = '';
    this.auth = getAuth(this.app);
    this.titleError = '';
    this.contentError = '';
    this.user = {};
  }

  render() {
    return html`
      ${this.selectedTab === 'Login'
        ? html``
        : html`
            <my-navbar
              .user=${this.user}
              @nav-clicked="${this._tabChanged}"
            ></my-navbar>
          `}
      <main>${this._getTab()}</main>
      <p class="app-footer">Made with love by HRLV.</p>
      <md-dialog id="dialogLiga" type="alert">
        <div slot="headline">${this.titleError}</div>
        <div slot="content">${this.contentError}</div>
      </md-dialog>
    `;
  }

  updated(properties) {
    if (properties.has('matches') || properties.has('teams')) {
      if (this.matches.length > 0 && this.teams.length > 0) {
        this._calculateTable();
      }
    }
  }

  _getTab() {
    switch (this.selectedTab) {
      case 'Login':
        return html`
          <login-page
            .auth="${this.auth}"
            @login-success="${this.loginSuccess}"
          ></login-page>
        `;
      case 'Calendario':
        return html`
          <matches-page
            .matches="${this.matches}"
            .teams="${this.teams}"
            @edit-match="${this._editMatch}"
          ></matches-page>
        `;
      case 'Tabla General':
        return html`
          <table-page
            .matches="${this.matches}"
            .table="${this.table}"
          ></table-page>
        `;
      case 'Liguilla':
        return html` <playoff-page .table="${this.table}"></playoff-page> `;
      default:
        return html``;
    }
  }

  loginSuccess(e) {
    this.selectedTab = 'Calendario';
    this.user = e.detail.user;
    this._getMatches();
    this._getTeams();
  }

  /**
   * Get matches list
   */
  _getMatches() {
    const dbRef = ref(getDatabase(), '/matches');
    onValue(dbRef, snapshot => {
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
    });
  }

  /**
   * Get teams list
   */
  _getTeams() {
    const dbRef = ref(getDatabase(), '/teams');
    onValue(dbRef, snapshot => {
      if (snapshot.exists()) {
        this.teams = snapshot.val();
      } else {
        this.teams = [];
      }
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
      .then(() => {})
      .catch(error => {
        console.error('Error updating match', error);
        this.titleError = 'Error updating match';
        this.contentError = error;
        const dialog = this.shadowRoot.querySelector('#dialogLiga');
        dialog.open = true;
      });
  }

  /**
   * Changes the content when a tab is selected
   * @param {Event} e
   */
  _tabChanged(e) {
    // Hacer scroll hacia el inicio de la página
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });

    this.selectedTab = e.detail;
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
    table.forEach((team, index) => {
      team.eliminado = index >= 10;
    });
    this.table = table;
    this._calculatePlayIn();
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

  _calculatePlayIn() {
    const playIn1 = {};
    playIn1[`/matches/${LIGUILLA.playIn1.id}/local`] =
      this.table[LIGUILLA.playIn1.local].equipo;
    playIn1[`/matches/${LIGUILLA.playIn1.id}/visitante`] =
      this.table[LIGUILLA.playIn1.visitante].equipo;
    playIn1[`/matches/${LIGUILLA.playIn1.id}/estadio`] = this.getEstadio(
      this.table[LIGUILLA.playIn1.local].equipo,
    );
    const playIn2 = {};
    playIn2[`/matches/${LIGUILLA.playIn2.id}/local`] =
      this.table[LIGUILLA.playIn2.local].equipo;
    playIn2[`/matches/${LIGUILLA.playIn2.id}/visitante`] =
      this.table[LIGUILLA.playIn2.visitante].equipo;
    playIn2[`/matches/${LIGUILLA.playIn2.id}/estadio`] = this.getEstadio(
      this.table[LIGUILLA.playIn2.local].equipo,
    );
    const playIn3 = {};
    const playIn1Match = this.matches.find(
      x => x.idMatch === LIGUILLA.playIn1.id,
    );
    const playIn2Match = this.matches.find(
      x => x.idMatch === LIGUILLA.playIn2.id,
    );
    if (!playIn1Match.golLocal >= 0 && !playIn1Match.golVisitante >= 0) {
      if (playIn1Match.golLocal > playIn1Match.golVisitante) {
        playIn3[`/matches/${LIGUILLA.playOff3.id}/local`] =
          playIn1Match.visitante;
        playIn3[`/matches/${LIGUILLA.playOff3.id}/estadio`] = this.getEstadio(
          playIn1Match.visitante,
        );
      } else if (playIn1Match.golLocal < playIn1Match.golVisitante) {
        playIn3[`/matches/${LIGUILLA.playOff3.id}/local`] = playIn1Match.local;
        playIn3[`/matches/${LIGUILLA.playOff3.id}/estadio`] = this.getEstadio(
          playIn1Match.local,
        );
        [
          this.table[LIGUILLA.playIn1.local],
          this.table[LIGUILLA.playIn1.visitante],
        ] = [
          this.table[LIGUILLA.playIn1.visitante],
          this.table[LIGUILLA.playIn1.local],
        ];
      }
    }
    if (!playIn2Match.golLocal >= 0 && !playIn2Match.golVisitante >= 0) {
      if (playIn2Match.golLocal > playIn2Match.golVisitante) {
        playIn3[`/matches/${LIGUILLA.playOff3.id}/visitante`] =
          playIn2Match.local;
        this.table[LIGUILLA.playIn2.visitante].eliminado = true;
      } else if (playIn2Match.golLocal < playIn2Match.golVisitante) {
        playIn3[`/matches/${LIGUILLA.playOff3.id}/visitante`] =
          playIn2Match.visitante;
        this.table[LIGUILLA.playIn2.local].eliminado = true;
      }
    }

    if (
      !this.matches[LIGUILLA.playOff3.id].golLocal >= 0 &&
      !this.matches[LIGUILLA.playOff3.id].golVisitante >= 0
    ) {
      if (
        this.matches[LIGUILLA.playOff3.id].golLocal >
        this.matches[LIGUILLA.playOff3.id].golVisitante
      ) {
        this.table.find(
          team => team.equipo === this.matches[LIGUILLA.playOff3.id].visitante,
        ).eliminado = true;
      } else if (
        this.matches[LIGUILLA.playOff3.id].golLocal <
        this.matches[LIGUILLA.playOff3.id].golVisitante
      ) {
        this.table.find(
          team => team.equipo === this.matches[LIGUILLA.playOff3.id].local,
        ).eliminado = true;
      }
    }

    const db = getDatabase();
    const updates = { ...playIn1, ...playIn2, ...playIn3 };
    update(ref(db), updates);
    this.calculateQuarterFinal();
  }

  calculateQuarterFinal() {
    const quarters = this.table.filter(team => !team.eliminado);
    const quarter1 = {};
    quarter1[`/matches/${LIGUILLA.quarter1.ida.id}/local`] =
      quarters[LIGUILLA.quarter1.visitante].equipo;
    quarter1[`/matches/${LIGUILLA.quarter1.ida.id}/visitante`] =
      quarters[LIGUILLA.quarter1.local].equipo;
    quarter1[`/matches/${LIGUILLA.quarter1.vuelta.id}/local`] =
      quarters[LIGUILLA.quarter1.local].equipo;
    quarter1[`/matches/${LIGUILLA.quarter1.vuelta.id}/visitante`] =
      quarters[LIGUILLA.quarter1.visitante].equipo;
    quarter1[`/matches/${LIGUILLA.quarter1.ida.id}/estadio`] = this.getEstadio(
      quarters[LIGUILLA.quarter1.visitante].equipo,
    );
    quarter1[`/matches/${LIGUILLA.quarter1.vuelta.id}/estadio`] =
      this.getEstadio(quarters[LIGUILLA.quarter1.local].equipo);
    const quarter2 = {};
    quarter2[`/matches/${LIGUILLA.quarter2.ida.id}/local`] =
      quarters[LIGUILLA.quarter2.visitante].equipo;
    quarter2[`/matches/${LIGUILLA.quarter2.ida.id}/visitante`] =
      quarters[LIGUILLA.quarter2.local].equipo;
    quarter2[`/matches/${LIGUILLA.quarter2.vuelta.id}/local`] =
      quarters[LIGUILLA.quarter2.local].equipo;
    quarter2[`/matches/${LIGUILLA.quarter2.vuelta.id}/visitante`] =
      quarters[LIGUILLA.quarter2.visitante].equipo;
    quarter2[`/matches/${LIGUILLA.quarter2.ida.id}/estadio`] = this.getEstadio(
      quarters[LIGUILLA.quarter2.visitante].equipo,
    );
    quarter2[`/matches/${LIGUILLA.quarter2.vuelta.id}/estadio`] =
      this.getEstadio(quarters[LIGUILLA.quarter2.local].equipo);
    const quarter3 = {};
    quarter3[`/matches/${LIGUILLA.quarter3.ida.id}/local`] =
      quarters[LIGUILLA.quarter3.visitante].equipo;
    quarter3[`/matches/${LIGUILLA.quarter3.ida.id}/visitante`] =
      quarters[LIGUILLA.quarter3.local].equipo;
    quarter3[`/matches/${LIGUILLA.quarter3.vuelta.id}/local`] =
      quarters[LIGUILLA.quarter3.local].equipo;
    quarter3[`/matches/${LIGUILLA.quarter3.vuelta.id}/visitante`] =
      quarters[LIGUILLA.quarter3.visitante].equipo;
    quarter3[`/matches/${LIGUILLA.quarter3.ida.id}/estadio`] = this.getEstadio(
      quarters[LIGUILLA.quarter3.visitante].equipo,
    );
    quarter3[`/matches/${LIGUILLA.quarter3.vuelta.id}/estadio`] =
      this.getEstadio(quarters[LIGUILLA.quarter3.local].equipo);
    const quarter4 = {};
    quarter4[`/matches/${LIGUILLA.quarter4.ida.id}/local`] =
      quarters[LIGUILLA.quarter4.visitante].equipo;
    quarter4[`/matches/${LIGUILLA.quarter4.ida.id}/visitante`] =
      quarters[LIGUILLA.quarter4.local].equipo;
    quarter4[`/matches/${LIGUILLA.quarter4.vuelta.id}/local`] =
      quarters[LIGUILLA.quarter4.local].equipo;
    quarter4[`/matches/${LIGUILLA.quarter4.vuelta.id}/visitante`] =
      quarters[LIGUILLA.quarter4.visitante].equipo;
    quarter4[`/matches/${LIGUILLA.quarter4.ida.id}/estadio`] = this.getEstadio(
      quarters[LIGUILLA.quarter4.visitante].equipo,
    );
    quarter4[`/matches/${LIGUILLA.quarter4.vuelta.id}/estadio`] =
      this.getEstadio(quarters[LIGUILLA.quarter4.local].equipo);
    const db = getDatabase();
    const updates = { ...quarter1, ...quarter2, ...quarter3, ...quarter4 };
    update(ref(db), updates);
    this.calculateSemiFinal();
  }

  calculateSemiFinal() {
    const quarter1 = {
      local: this.matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)
        .visitante,
      visitante: this.matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)
        .local,
      golLocal:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)
          .golVisitante +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter1.vuelta.id)
          .golLocal,
      golVisitante:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter1.ida.id)
          .golLocal +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter1.vuelta.id)
          .golVisitante,
    };
    const quarter2 = {
      local: this.matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)
        .visitante,
      visitante: this.matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)
        .local,
      golLocal:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)
          .golVisitante +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter2.vuelta.id)
          .golLocal,
      golVisitante:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter2.ida.id)
          .golLocal +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter2.vuelta.id)
          .golVisitante,
    };
    const quarter3 = {
      local: this.matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)
        .visitante,
      visitante: this.matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)
        .local,
      golLocal:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)
          .golVisitante +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter3.vuelta.id)
          .golLocal,
      golVisitante:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter3.ida.id)
          .golLocal +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter3.vuelta.id)
          .golVisitante,
    };
    const quarter4 = {
      local: this.matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)
        .visitante,
      visitante: this.matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)
        .local,
      golLocal:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)
          .golVisitante +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter4.vuelta.id)
          .golLocal,
      golVisitante:
        this.matches.find(x => x.idMatch === LIGUILLA.quarter4.ida.id)
          .golLocal +
        this.matches.find(x => x.idMatch === LIGUILLA.quarter4.vuelta.id)
          .golVisitante,
    };
    if (quarter1.golLocal >= quarter1.golVisitante) {
      this.table.find(team => team.equipo === quarter1.visitante).eliminado =
        true;
    } else {
      this.table.find(team => team.equipo === quarter1.local).eliminado = true;
    }
    if (quarter2.golLocal >= quarter2.golVisitante) {
      this.table.find(team => team.equipo === quarter2.visitante).eliminado =
        true;
    } else {
      this.table.find(team => team.equipo === quarter2.local).eliminado = true;
    }
    if (quarter3.golLocal >= quarter3.golVisitante) {
      this.table.find(team => team.equipo === quarter3.visitante).eliminado =
        true;
    } else {
      this.table.find(team => team.equipo === quarter3.local).eliminado = true;
    }
    if (quarter4.golLocal >= quarter4.golVisitante) {
      this.table.find(team => team.equipo === quarter4.visitante).eliminado =
        true;
    } else {
      this.table.find(team => team.equipo === quarter4.local).eliminado = true;
    }
    const semis = this.table.filter(team => !team.eliminado);
    const semis1 = {};
    semis1[`/matches/${LIGUILLA.semi1.ida.id}/local`] =
      semis[LIGUILLA.semi1.visitante].equipo;
    semis1[`/matches/${LIGUILLA.semi1.ida.id}/visitante`] =
      semis[LIGUILLA.semi1.local].equipo;
    semis1[`/matches/${LIGUILLA.semi1.vuelta.id}/local`] =
      semis[LIGUILLA.semi1.local].equipo;
    semis1[`/matches/${LIGUILLA.semi1.vuelta.id}/visitante`] =
      semis[LIGUILLA.semi1.visitante].equipo;
    semis1[`/matches/${LIGUILLA.semi1.ida.id}/estadio`] = this.getEstadio(
      semis[LIGUILLA.semi1.visitante].equipo,
    );
    semis1[`/matches/${LIGUILLA.semi1.vuelta.id}/estadio`] = this.getEstadio(
      semis[LIGUILLA.semi1.local].equipo,
    );
    const semis2 = {};
    semis2[`/matches/${LIGUILLA.semi2.ida.id}/local`] =
      semis[LIGUILLA.semi2.visitante].equipo;
    semis2[`/matches/${LIGUILLA.semi2.ida.id}/visitante`] =
      semis[LIGUILLA.semi2.local].equipo;
    semis2[`/matches/${LIGUILLA.semi2.vuelta.id}/local`] =
      semis[LIGUILLA.semi2.local].equipo;
    semis2[`/matches/${LIGUILLA.semi2.vuelta.id}/visitante`] =
      semis[LIGUILLA.semi2.visitante].equipo;
    semis2[`/matches/${LIGUILLA.semi2.ida.id}/estadio`] = this.getEstadio(
      semis[LIGUILLA.semi2.visitante].equipo,
    );
    semis2[`/matches/${LIGUILLA.semi2.vuelta.id}/estadio`] = this.getEstadio(
      semis[LIGUILLA.semi2.local].equipo,
    );
    const db = getDatabase();
    const updates = { ...semis1, ...semis2 };
    update(ref(db), updates);
    this.calculateFinal();
  }

  calculateFinal() {
    const semis1 = {
      local: this.matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)
        .visitante,
      visitante: this.matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)
        .local,
      golLocal:
        this.matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id)
          .golVisitante +
        this.matches.find(x => x.idMatch === LIGUILLA.semi1.vuelta.id).golLocal,
      golVisitante:
        this.matches.find(x => x.idMatch === LIGUILLA.semi1.ida.id).golLocal +
        this.matches.find(x => x.idMatch === LIGUILLA.semi1.vuelta.id)
          .golVisitante,
    };
    const semis2 = {
      local: this.matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)
        .visitante,
      visitante: this.matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)
        .local,
      golLocal:
        this.matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id)
          .golVisitante +
        this.matches.find(x => x.idMatch === LIGUILLA.semi2.vuelta.id).golLocal,
      golVisitante:
        this.matches.find(x => x.idMatch === LIGUILLA.semi2.ida.id).golLocal +
        this.matches.find(x => x.idMatch === LIGUILLA.semi2.vuelta.id)
          .golVisitante,
    };

    if (semis1.golLocal >= semis1.golVisitante) {
      this.table.find(team => team.equipo === semis1.visitante).eliminado =
        true;
    } else {
      this.table.find(team => team.equipo === semis1.local).eliminado = true;
    }
    if (semis2.golLocal >= semis2.golVisitante) {
      this.table.find(team => team.equipo === semis2.visitante).eliminado =
        true;
    } else {
      this.table.find(team => team.equipo === semis2.local).eliminado = true;
    }

    const teams = this.table.filter(team => !team.eliminado);
    const final = {};
    final[`/matches/${LIGUILLA.final.ida.id}/local`] =
      teams[LIGUILLA.final.visitante].equipo;
    final[`/matches/${LIGUILLA.final.ida.id}/visitante`] =
      teams[LIGUILLA.final.local].equipo;
    final[`/matches/${LIGUILLA.final.vuelta.id}/local`] =
      teams[LIGUILLA.final.local].equipo;
    final[`/matches/${LIGUILLA.final.vuelta.id}/visitante`] =
      teams[LIGUILLA.final.visitante].equipo;
    final[`/matches/${LIGUILLA.final.ida.id}/estadio`] = this.getEstadio(
      teams[LIGUILLA.final.visitante].equipo,
    );
    final[`/matches/${LIGUILLA.final.vuelta.id}/estadio`] = this.getEstadio(
      teams[LIGUILLA.final.local].equipo,
    );

    const db = getDatabase();
    const updates = { ...final };
    update(ref(db), updates);
  }

  getEstadio(team) {
    return this.matches.find(x => x.local === team).estadio;
  }
}

customElements.define('liga-mx-hrlv', LigaMxHrlv);
