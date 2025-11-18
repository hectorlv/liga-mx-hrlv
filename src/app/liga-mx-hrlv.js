/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { LitElement, html } from 'lit';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';
import styles from '../styles/liga-mx-hrlv-styles.js';
import '@material/web/icon/icon.js';
import '../components/matches-page.js';
import '../components/table-page.js';
import '../components/playoff-page.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '../components/my-navbar.js';
import { FIREBASE_CONFIG } from '../utils/constants.js';
import '../components/login-page.js';
import { getAuth } from 'firebase/auth';
import '@material/web/dialog/dialog.js';
import { fetchMatches, fetchStadiums, fetchTeams, saveUpdates, fetchPlayers } from '../utils/firebaseService.js';
import { calculateTable } from '../utils/tableCalculator.js';
import { calculatePlayIn } from '../utils/playoffCalculator.js';
import { APP_VERSION } from '../utils/version.js';

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
    stadiums: { type: Array },
    players: { type: Array },
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
    this.stadiums = [];
    this.players = [];
  }

  render() {
    return html`
      ${this.selectedTab === 'Login'
        ? html``
        : html`
            <md-tabs
              .activeTabIndex=${this._getTabIndex(this.selectedTab)}
              @change=${this._onTabsChange}
            >
              <md-primary-tab aria-label="Calendario">Calendario</md-primary-tab>
              <md-primary-tab aria-label="Tabla General">Tabla General</md-primary-tab>
              <md-primary-tab aria-label="Liguilla">Liguilla</md-primary-tab>
            </md-tabs>
          `}
      <main>${this._getTab()}</main>
      <p class="app-footer">Made with love by HRLV - <span>v${APP_VERSION}</span></p>
      <md-dialog id="dialogLiga" type="alert">
        <div slot="headline">${this.titleError}</div>
        <div slot="content">${this.contentError}</div>
      </md-dialog>
    `;
  }

  updated(properties) {
    if (properties.has('matches') || properties.has('teams')) {
      if (this.matches.length > 0 && this.teams.length > 0) {
        this.table = calculateTable(this.teams, this.matches);
        calculatePlayIn(this.table, this.matches);
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
            .stadiums="${this.stadiums}"
            .players="${this.players}"
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
    this._unsubscribeMatches = fetchMatches((matches) => {
      this.matches = matches;
    });
    this._unsubscribeTeams = fetchTeams((teams) => {
      this.teams = teams;
    });
    this._unsubscribeStadiums = fetchStadiums((stadiums) => {
      this.stadiums = stadiums;
    });
    this._unsubscribePlayers = fetchPlayers((players) => {
      this.players = players;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribeMatches) {
      this._unsubscribeMatches();
    }
    if (this._unsubscribeTeams) {
      this._unsubscribeTeams();
    }
    if (this._unsubscribeStadiums) {
      this._unsubscribeStadiums();
    }
    if (this._unsubscribePlayers) {
      this._unsubscribePlayers();
    }
  }

  /**
   * Updates the selected match
   * @param {Event} e
   */
  _editMatch(e) {
    const updates = e.detail;
    saveUpdates(updates);
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

  _getTabIndex(tab) {
    switch (tab) {
      case 'Calendario':
        return 0;
      case 'Tabla General':
        return 1;
      case 'Liguilla':
        return 2;
      default:
        return 0;
    }
  }

  _onTabsChange(e) {
    const index = e.target.activeTabIndex ?? 0;
    const tabs = ['Calendario', 'Tabla General', 'Liguilla'];
    const next = tabs[index] || 'Calendario';
    if (this.selectedTab !== next) {
      // Scroll al inicio para mantener UX consistente
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.selectedTab = next;
    }
  }

}

customElements.define('liga-mx-hrlv', LigaMxHrlv);
