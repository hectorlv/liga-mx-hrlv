import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

// Firebase imports
import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getDatabase, onValue, ref, Unsubscribe } from 'firebase/database';

// Material Web imports
import '@material/web/icon/icon.js';
import '@material/web/tabs/primary-tab.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import { MdTabs } from '@material/web/tabs/tabs.js';
import { MdDialog } from '@material/web/dialog/dialog.js';

// Styles and components
import '../pages/login-page.js';
import '../pages/home-page.js';
import '../pages/matches-page.js';
import '../pages/bracket-page.js';
import '../pages/table-page.js';
import '../pages/stats-page.js';
import '../pages/match-detail-page.js';
import '../pages/team-page.js';
import styles from '../styles/liga-mx-hrlv-styles.js';

// Utility imports
import {
  fetchMatches,
  fetchPlayers,
  fetchStadiums,
  fetchTeams,
  saveUpdates,
} from '../services/firebaseService.js';
import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { FIREBASE_CONFIG, POSTSEASON_FORMAT } from '../utils/constants.js';
import {
  calculatePlayIn,
  calculateQuarterFinal,
} from '../utils/playoffCalculator.js';
import { calculateTable } from '../utils/tableCalculator.js';
import { APP_VERSION } from '../utils/version.js';
import '../utils/material.js';

/**
 * Main class for LigaMX
 */
@customElement('liga-mx-hrlv')
export class LigaMxHrlv extends LitElement {
  static override readonly styles = [
    styles,
    css`
      /* EL CASCARÓN DE LA APP */
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        /* Fondo gris súper claro para que resalten las tarjetas blancas */
        background-color: var(--md-sys-color-surface-container-lowest, #f4f6f8);
      }

      /* HEADER PEGAJOSO (STICKY) */
      header {
        position: sticky;
        top: 0;
        z-index: 100;
        background: var(--md-sys-color-surface, #ffffff);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); /* Sombra elegante */
      }

      .header-content {
        display: grid;
        grid-template-columns: 1fr auto;
        align-items: center;
        gap: 12px;
        max-width: 1100px;
        margin: 0 auto;
        padding: 0 12px;
      }

      /* TABS CENTRADOS EN PC */
      md-tabs {
        max-width: 800px;
        margin: 0;
        --md-primary-tab-container-color: transparent;
      }

      .admin-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
      }

      .admin-status {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.8rem;
        font-weight: 700;
      }

      @media (max-width: 760px) {
        .header-content {
          grid-template-columns: 1fr;
          justify-items: stretch;
          padding: 8px 52px 10px 8px;
        }

        md-tabs {
          width: 100%;
        }

        .admin-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 2;
          gap: 0;
        }

        .admin-status,
        .admin-action-label {
          display: none;
        }

        .admin-actions md-text-button,
        .admin-actions md-outlined-button {
          width: 40px;
          min-width: 40px;
          height: 40px;
          --md-text-button-container-height: 40px;
          --md-text-button-leading-space: 8px;
          --md-text-button-trailing-space: 8px;
          --md-outlined-button-container-height: 40px;
          --md-outlined-button-leading-space: 8px;
          --md-outlined-button-trailing-space: 8px;
        }
      }


      /* ÁREA DE CONTENIDO */
      main {
        flex: 1;
        width: 100%;
        max-width: max-content;
        margin: 0 auto;
        padding: 16px 0; /* Padding superior para separar del header */
        box-sizing: border-box;
      }

      /* ANIMACIÓN SUAVE PARA EL CAMBIO DE TABS */
      main > * {
        animation: tabFadeIn 0.35s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        display: block;
      }

      @keyframes tabFadeIn {
        from {
          opacity: 0;
          transform: translateY(15px); /* Empieza un poquito abajo */
        }
        to {
          opacity: 1;
          transform: translateY(0); /* Sube a su lugar original */
        }
      }

      /* BOTÓN SUBIR */
      .scrollTopButton {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 99;
        background: var(--md-sys-color-primary-container, #eaddff);
        color: var(--md-sys-color-on-primary-container, #21005d);
        border-radius: 50%;
        padding: 12px;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition:
          transform 0.2s,
          box-shadow 0.2s;
      }
      .scrollTopButton:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      }

      /* FOOTER */
      .app-footer {
        text-align: center;
        padding: 24px 16px;
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant, #757575);
        margin: 0;
      }
      .app-footer span {
        font-weight: bold;
        color: var(--md-sys-color-primary);
      }
    `,
  ];

  private readonly app: FirebaseApp;

  @property({ attribute: false }) auth: Auth;

  @state() matchesList: Match[] = [];
  @state() teams: string[] = [];
  @state() stadiums: string[] = [];
  @state() players: PlayerTeam = new Map();
  @state() table: TableEntry[] = [];
  @state() selectedTab: string = 'Inicio';
  @state() titleError: string = '';
  @state() contentError: string = '';
  @state() user: User | null = null;
  @state() isAdmin: boolean = false;
  @state() routedMatchId: number | null = null;
  @state() routedTeamName: string | null = null;

  @query('#dialogLiga') dialog!: MdDialog;
  @query('#adminLoginDialog') adminLoginDialog!: MdDialog;

  private _unsubscribeMatches?: Unsubscribe;
  private _unsubscribeTeams?: Unsubscribe;
  private _unsubscribeStadiums?: Unsubscribe;
  private _unsubscribePlayers?: Unsubscribe;
  private _unsubscribeAuth?: Unsubscribe;
  private _unsubscribeAllowedWriter?: Unsubscribe;
  private readonly _boundRouteChange = () => this._syncRouteFromUrl();

  constructor() {
    super();
    this.app = initializeApp(FIREBASE_CONFIG);
    this.auth = getAuth(this.app);
  }

  override render() {
    return html`
      <header>
        <div class="header-content">
              <md-tabs
                .activeTabIndex=${this._getTabIndex(this.selectedTab)}
                @change=${this._onTabsChange}
              >
                <md-primary-tab aria-label="Inicio">
                  <md-icon slot="icon">home</md-icon>
                  Inicio
                </md-primary-tab>
                <md-primary-tab aria-label="Calendario">
                  <md-icon slot="icon">calendar_month</md-icon>
                  Calendario
                </md-primary-tab>
                <md-primary-tab aria-label="Tabla General">
                  <md-icon slot="icon">format_list_numbered</md-icon>
                  Tabla
                </md-primary-tab>
                <md-primary-tab aria-label="Liguilla">
                  <md-icon slot="icon">account_tree</md-icon>
                  Liguilla
                </md-primary-tab>
                <md-primary-tab aria-label="Estadísticas">
                  <md-icon slot="icon">bar_chart</md-icon>
                  Estadísticas
                </md-primary-tab>
              </md-tabs>
          <div class="admin-actions">
            ${this.user
              ? html`
                  <span class="admin-status">
                    ${this.isAdmin ? 'Admin' : 'Sin permisos'}
                  </span>
                  <md-text-button
                    aria-label="Cerrar sesión"
                    title="Cerrar sesión"
                    @click=${this._logout}
                  >
                    <md-icon slot="icon">logout</md-icon>
                    <span class="admin-action-label">Salir</span>
                  </md-text-button>
                `
              : html`
                  <md-outlined-button
                    aria-label="Abrir acceso admin"
                    title="Abrir acceso admin"
                    @click=${this._openAdminLogin}
                  >
                    <md-icon slot="icon">admin_panel_settings</md-icon>
                    <span class="admin-action-label">Admin</span>
                  </md-outlined-button>
                `}
          </div>
        </div>
      </header>

      <main>${this._getTab()}</main>

      <md-icon
        id="scrollTopButton"
        class="scrollTopButton material-icons-outlined"
        title="Volver arriba"
        @click=${() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        arrow_upward
      </md-icon>

      <p class="app-footer">
        Made with love by HRLV - <span>v${APP_VERSION}</span>
      </p>

      <md-dialog id="dialogLiga" type="alert">
        <div slot="headline">${this.titleError}</div>
        <div slot="content">${this.contentError}</div>
        <div slot="actions">
          <md-text-button @click=${() => this.dialog.close()}
            >Cerrar</md-text-button
          >
        </div>
      </md-dialog>

      <md-dialog id="adminLoginDialog" type="modal">
        <div slot="headline">Acceso admin</div>
        <div slot="content">
          <login-page
            .auth="${this.auth}"
            @login-success="${this.loginSuccess}"
          ></login-page>
        </div>
        <div slot="actions">
          <md-text-button @click=${() => this.adminLoginDialog.close()}
            >Cerrar</md-text-button
          >
        </div>
      </md-dialog>
    `;
  }

  override updated(changedProperties: PropertyValues) {
    if (
      changedProperties.has('matchesList') ||
      changedProperties.has('teams') ||
      changedProperties.has('isAdmin')
    ) {
      if (this.matchesList.length > 0 && this.teams.length > 0) {
        this.table = calculateTable(this.teams, this.matchesList);
        if (!this.isAdmin) return;
        if (POSTSEASON_FORMAT.playInSpots > 0) {
          calculatePlayIn(this.table, this.matchesList);
        } else {
          calculateQuarterFinal(this.table, this.matchesList);
        }
      }
    }
  }

  private _getTab() {
    if (this.routedMatchId !== null) {
      const routedMatch = this.matchesList.find(
        match => match.idMatch === this.routedMatchId,
      );

      if (!routedMatch) {
        return html`<p style="padding: 40px; text-align: center;">
          Cargando detalles del partido...
        </p>`;
      }

      return html`
        <match-detail-page
          .match=${routedMatch}
          .matchesList=${this.matchesList}
          .table=${this.table}
          .teams=${this.teams}
          .players=${this.players}
          .stadiums=${this.stadiums}
          .isAdmin=${this.isAdmin}
          @back-to-calendar=${this._closeRoutedMatch}
          @edit-match=${this._editMatch}
        ></match-detail-page>
      `;
    }

    const routedTeamName = this.routedTeamName;
    if (routedTeamName) {
      const team = this.table.find(entry => entry.equipo === routedTeamName);
      const teamPosition =
        this.table.findIndex(entry => entry.equipo === routedTeamName) + 1;

      if (!team) {
        return html`<p style="padding: 40px; text-align: center;">
          Cargando detalles del equipo...
        </p>`;
      }

      return html`
        <team-page
          .team=${team}
          .teamPosition=${teamPosition}
          .players=${this.players.get(routedTeamName.replaceAll('.', '')) || []}
          .matchesList=${this.matchesList.filter(
            match =>
              match.local === routedTeamName ||
              match.visitante === routedTeamName,
          )}
          .isAdmin=${this.isAdmin}
          @back=${this._closeRoutedTeam}
          @edit-match=${this._editMatch}
        ></team-page>
      `;
    }

    switch (this.selectedTab) {
      case 'Inicio':
        return html`
          <home-page
            .matchesList=${this.matchesList}
            .table=${this.table}
            .teams=${this.teams}
            .stadiums=${this.stadiums}
            .players=${this.players}
            .isAdmin=${this.isAdmin}
            .navigateToTab=${(tab: string) => this._selectTab(tab)}
            @edit-match="${this._editMatch}"
            @navigate-tab=${(event: CustomEvent<{ tab: string }>) =>
              this._navigateToTab(event)}
          ></home-page>
        `;
      case 'Calendario':
        return html`
          <matches-page
            .matchesList="${this.matchesList}"
            .table="${this.table}"
            .teams="${this.teams}"
            .stadiums="${this.stadiums}"
            .players="${this.players}"
            .isAdmin=${this.isAdmin}
            @edit-match="${this._editMatch}"
          ></matches-page>
        `;
      case 'Tabla General':
        return html`
          <table-page
            .matchesList="${this.matchesList}"
            .table="${this.table}"
            .teams="${this.teams}"
            .players="${this.players}"
            .isAdmin=${this.isAdmin}
            @edit-match="${this._editMatch}"
          ></table-page>
        `;
      case 'Liguilla':
        return html`
          <bracket-page
            .matchesList=${this.matchesList}
            .table=${this.table}
            .teams=${this.teams}
            .stadiums=${this.stadiums}
            .players=${this.players}
            .isAdmin=${this.isAdmin}
            @edit-match=${this._editMatch}
          ></bracket-page>
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

  override connectedCallback() {
    super.connectedCallback();
    this._syncRouteFromUrl();
    window.addEventListener('popstate', this._boundRouteChange);
    this._subscribePublicData();
    this._unsubscribeAuth = onAuthStateChanged(this.auth, user => {
      this.user = user;
      this._unsubscribeAllowedWriter?.();
      this._unsubscribeAllowedWriter = undefined;
      this.isAdmin = false;

      if (!user) return;

      const allowedWriterRef = ref(
        getDatabase(this.app),
        `/allowedWriters/${user.uid}`,
      );
      this._unsubscribeAllowedWriter = onValue(allowedWriterRef, snapshot => {
        this.isAdmin = snapshot.exists();
      });
    });
  }

  private loginSuccess(e: CustomEvent<{ user: User }>) {
    this.user = e.detail.user;
    this.adminLoginDialog?.close();
  }

  private _subscribePublicData() {
    if (this._unsubscribeMatches) return;
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
    window.removeEventListener('popstate', this._boundRouteChange);
    this._unsubscribeAuth?.();
    this._unsubscribeAllowedWriter?.();
    this._unsubscribeMatches?.();
    this._unsubscribeTeams?.();
    this._unsubscribeStadiums?.();
    this._unsubscribePlayers?.();
  }

  private async _editMatch(e: CustomEvent<Record<string, unknown>>) {
    if (!this.isAdmin) {
      this.titleError = 'Permiso requerido';
      this.contentError =
        'Debes iniciar sesión con un usuario admin para guardar cambios.';
      this.dialog?.show();
      return;
    }
    try {
      await saveUpdates(e.detail);
    } catch (error) {
      this.titleError = 'No se guardaron los cambios';
      this.contentError =
        error instanceof Error
          ? error.message
          : 'Firebase rechazó la actualización del partido.';
      this.dialog?.show();
    }
  }

  private _openAdminLogin() {
    this.adminLoginDialog?.show();
  }

  private async _logout() {
    await signOut(this.auth);
    this.isAdmin = false;
    this.user = null;
  }

  private _getTabIndex(tab: string): number {
    switch (tab) {
      case 'Inicio':
        return 0;
      case 'Calendario':
        return 1;
      case 'Tabla General':
        return 2;
      case 'Liguilla':
        return 3;
      case 'Estadísticas':
        return 4;
      default:
        return 0;
    }
  }

  private _navigateToTab(e: CustomEvent<{ tab: string }>) {
    this._selectTab(e.detail.tab);
  }

  private _selectTab(tab: string) {
    if (this.selectedTab !== tab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.selectedTab = tab;
    }
    this._clearMatchRoute();
  }

  private _onTabsChange(e: Event) {
    const tabs = e.target as MdTabs;
    const index = tabs.activeTabIndex ?? 0;
    const tabNames = [
      'Inicio',
      'Calendario',
      'Tabla General',
      'Liguilla',
      'Estadísticas',
    ];
    const next = tabNames[index] || 'Calendario';
    if (this.selectedTab !== next) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.selectedTab = next;
    }
    this._clearMatchRoute();
  }

  private _syncRouteFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const matchParam = params.get('match');
    const matchId = matchParam === null ? Number.NaN : Number(matchParam);
    this.routedMatchId = Number.isFinite(matchId) ? matchId : null;
    this.routedTeamName = params.get('team');

    const tab = params.get('tab');
    if (tab) {
      this.selectedTab = tab;
    }
  }

  private _closeRoutedMatch() {
    this.routedMatchId = null;
    this._clearMatchRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private _closeRoutedTeam() {
    this.routedTeamName = null;
    this._clearMatchRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private _clearMatchRoute() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('match') && !url.searchParams.has('team')) return;

    url.searchParams.delete('match');
    url.searchParams.delete('team');
    if (!url.searchParams.has('tab')) {
      url.searchParams.set('tab', this.selectedTab);
    }
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
}
