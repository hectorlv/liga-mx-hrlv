import { html, LitElement, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

// Firebase imports
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, User } from 'firebase/auth';
import { Unsubscribe } from 'firebase/database';

//Material Web imports
import '@material/web/icon/icon.js';
import '@material/web/tabs/primary-tab.js';

// Styles and components
import '../pages/login-page.js';
import '../pages/matches-page.js';
import '../pages/table-page.js';
import '../pages/stats-page.js';
import styles from '../styles/liga-mx-hrlv-styles.js';

// Utility imports
import { MdDialog } from '@material/web/dialog/dialog.js';
import { MdTabs } from '@material/web/tabs/tabs.js';
import {
  fetchMatches,
  fetchPlayers,
  fetchStadiums,
  fetchTeams,
  saveUpdates,
} from '../services/firebaseService.js';
import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { FIREBASE_CONFIG } from '../utils/constants.js';
import { calculatePlayIn } from '../utils/playoffCalculator.js';
import { calculateTable } from '../utils/tableCalculator.js';
import { APP_VERSION } from '../utils/version.js';
import '../utils/material.js';

/**
 * Main class for LigaMX
 */
@customElement('liga-mx-hrlv')
export class LigaMxHrlv extends LitElement {
  static override readonly styles = [styles];

  private readonly app: FirebaseApp;

  @property({ attribute: false }) auth: Auth;

  @state() matchesList: Match[] = [];
  @state() teams: string[] = [];
  @state() stadiums: string[] = [];
  @state() players: PlayerTeam = new Map();
  @state() table: TableEntry[] = [];
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
    this.auth = getAuth(this.app);
  }

  override render() {
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
              <md-primary-tab aria-label="Estadísticas"
                >Estadísticas</md-primary-tab
              >
            </md-tabs>
          `}
      <main>${this._getTab()}</main>
      <md-icon
        id="scrollTopButton"
        class="scrollTopButton material-icons-outlined"
        title="Scroll to top"
        @click=${() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >keyboard_control_key</md-icon
      >
      <p class="app-footer">
        Made with love by HRLV - <span>v${APP_VERSION}</span>
      </p>
      <md-dialog id="dialogLiga" type="alert">
        <div slot="headline">${this.titleError}</div>
        <div slot="content">${this.contentError}</div>
      </md-dialog>
    `;
  }

  override updated(changedProperties: PropertyValues) {
    if (
      changedProperties.has('matchesList') ||
      changedProperties.has('teams')
    ) {
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
      case 'Estadísticas':
        return html`
          <stats-page
            .matchesList=${this.matchesList}
            .teams=${this.teams}
            .players=${this.players}
          ></stats-page>
        `;
      default:
        return html``;
    }
  }

  private loginSuccess(e: CustomEvent<{ user: User }>) {
    this.selectedTab = 'Calendario';
    this.user = e.detail.user;
    this._unsubscribeMatches = fetchMatches((matches: Match[]) => {
      this.matchesList = matches;
    });
    this._unsubscribeTeams = fetchTeams((teams: string[]) => {
      this.teams = teams;
    });
    this._unsubscribeStadiums = fetchStadiums((stadiums: string[]) => {
      this.stadiums = stadiums;
    });
    this._unsubscribePlayers = fetchPlayers((players: PlayerTeam) => {
      this.players = players;
    });
  }

  override disconnectedCallback() {
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
  private _editMatch(e: CustomEvent<Record<string, unknown>>) {
    saveUpdates(e.detail);
  }

  private _getTabIndex(tab: string): number {
    switch (tab) {
      case 'Calendario':
        return 0;
      case 'Tabla General':
        return 1;
      case 'Estadísticas':
        return 2;
      default:
        return 0;
    }
  }

  private _onTabsChange(e: Event) {
    const tabs = e.target as MdTabs;
    const index = tabs.activeTabIndex ?? 0;
    const tabNames = ['Calendario', 'Tabla General', 'Estadísticas'];
    const next = tabNames[index] || 'Calendario';
    if (this.selectedTab !== next) {
      // Scroll al inicio para mantener UX consistente
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.selectedTab = next;
    }
  }
}
