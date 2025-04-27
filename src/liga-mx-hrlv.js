/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
import { LitElement, html } from 'lit';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getDatabase } from 'firebase/database';
import styles from './liga-mx-hrlv-styles.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/iron-icons/iron-icons.js';
import './matches-page.js';
import './table-page.js';
import './playoff-page.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import './my-navbar.js';
import { FIREBASE_CONFIG } from './constants.js';
import './login-page.js';
import { getAuth } from 'firebase/auth';
import '@material/web/dialog/dialog.js';
import { fetchMatches, fetchStadiums, fetchTeams, saveUpdates } from './firebaseService.js';
import { calculateTable } from './tableCalculator.js';
import { calculatePlayIn } from './playoffCalculator.js';

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

}

customElements.define('liga-mx-hrlv', LigaMxHrlv);
