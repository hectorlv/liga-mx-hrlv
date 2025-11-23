import { LitElement, PropertyValues, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

// Firebase imports
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Analytics, getAnalytics } from 'firebase/analytics';
import { Database, getDatabase, Unsubscribe } from 'firebase/database';
import { Auth, getAuth, User } from 'firebase/auth';

//Material Web imports
import '@material/web/icon/icon.js';
import '@material/web/tabs/tabs.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/dialog/dialog.js';

// Styles and components
import styles from '../styles/liga-mx-hrlv-styles.js';
import '../components/matches-page.js';
import '../components/table-page.js';
import '../components/login-page.js';

// Utility imports
import { FIREBASE_CONFIG } from '../utils/constants.js';
import {
  fetchMatches,
  fetchStadiums,
  fetchTeams,
  saveUpdates,
  fetchPlayers,
} from '../utils/firebaseService.js';
import { calculateTable } from '../utils/tableCalculator.js';
import { calculatePlayIn } from '../utils/playoffCalculator.js';
import { APP_VERSION } from '../utils/version.js';
import { Match, Player, PlayerTeam, Stadium, TableEntry, Team } from './types/index.js';
import { MdDialog } from '@material/web/dialog/dialog.js';
import { MdTabs } from '@material/web/tabs/tabs.js';

/**
 * Main class for LigaMX
 */
@customElement('liga-mx-hrlv')
export class LigaMxHrlv extends LitElement {
  static styles = [styles];

  private app: FirebaseApp;
  private analytics: Analytics;
  private database: Database;

  @property({ attribute: false }) auth: Auth;

  @property({ type: Array, attribute: false }) matchesList: Match[] = [];
  @property({ type: Array, attribute: false }) teams: Team[] = [];
  @property({ type: Array, attribute: false }) stadiums: Stadium[] = [];
  @property({ type: Object, attribute: false }) players: PlayerTeam = new Map();
  @property({ type: Array, attribute: false }) table: TableEntry[] = [];
  @state() selectedTab: string = 'Login';
  @state() titleError: string = '';
  @state() contentError: string = '';
  @state() user: User | null = null;

  @query('#dialogLiga') dialog!: MdDialog;

  private _unsubscribeMatches?: Unsubscribe;
  private _unsubscribeTeams?: Unsubscribe;
  private _unsubscribeStadiums?: Unsubscribe;
  private _unsubscribePlayers?: Unsubscribe;

  constructor() {
    super();
    this.app = initializeApp(FIREBASE_CONFIG);
    this.analytics = getAnalytics(this.app);
    this.database = getDatabase(this.app);
    this.auth = getAuth(this.app);
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
              <md-primary-tab aria-label="Calendario"
                >Calendario</md-primary-tab
              >
              <md-primary-tab aria-label="Tabla General"
                >Tabla General</md-primary-tab
              >
              <md-primary-tab aria-label="Liguilla">Liguilla</md-primary-tab>
            </md-tabs>
          `}
      <main>${this._getTab()}</main>
      <p class="app-footer">
        Made with love by HRLV - <span>v${APP_VERSION}</span>
      </p>
      <md-dialog id="dialogLiga" type="alert">
        <div slot="headline">${this.titleError}</div>
        <div slot="content">${this.contentError}</div>
      </md-dialog>
    `;
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('matchesList') || changedProperties.has('teams')) {
      if (this.matchesList.length > 0 && this.teams.length > 0) {
        this.table = calculateTable(this.teams, this.matchesList);
        calculatePlayIn(this.table, this.matchesList);
      }
    }
  }

  private _getTab() {
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
            .matchesList="${this.matchesList}"
            .teams="${this.teams}"
            .stadiums="${this.stadiums}"
            .players="${this.players}"
            @edit-match="${this._editMatch}"
          ></matches-page>
        `;
      case 'Tabla General':
        return html`
          <table-page
            .matchesList="${this.matchesList}"
            .table="${this.table}"
          ></table-page>
        `;
      case 'Liguilla':
        return html` <playoff-page .table="${this.table}"></playoff-page> `;
      default:
        return html``;
    }
  }

  private loginSuccess(e : CustomEvent<{ user: User }>) {
    this.selectedTab = 'Calendario';
    this.user = e.detail.user;
    this._unsubscribeMatches = fetchMatches(matches => {
      this.matchesList = matches;
    });
    this._unsubscribeTeams = fetchTeams(teams => {
      this.teams = teams;
    });
    this._unsubscribeStadiums = fetchStadiums(stadiums => {
      this.stadiums = stadiums;
    });
    this._unsubscribePlayers = fetchPlayers(players => {
      this.players = players;
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._unsubscribeMatches?.();
    this._unsubscribeTeams?.();
    this._unsubscribeStadiums?.();
    this._unsubscribePlayers?.();
  }

  /**
   * Updates the selected match
   * @param {Event} e
   */
  private _editMatch(e : CustomEvent<Record<string, unknown>>) {
    saveUpdates(e.detail);
  }

  private _getTabIndex(tab : string): number {
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

  private _onTabsChange(e: Event) {
    const tabs = e.target as MdTabs;
    const index = tabs.activeTabIndex ?? 0;
    const tabNames = ['Calendario', 'Tabla General', 'Liguilla'];
    const next = tabNames[index] || 'Calendario';
    if (this.selectedTab !== next) {
      // Scroll al inicio para mantener UX consistente
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.selectedTab = next;
    }
  }
}
