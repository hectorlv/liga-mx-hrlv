import '@material/web/icon/icon.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { Match, Player, PlayerTeam, TableEntry } from '../types/index.js';
import { formatDateDDMMYYYY } from '../utils/dateUtils.js';
import { getGoalEvents } from '../utils/functionUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import {
  getLiveMatchPeriodLabel,
  hasMatchStarted,
  isMatchLive,
  lineupsReadyBeforeKickoff,
} from '../utils/matchStatus.js';
import './match-detail-page.js';

type NavigationTab =
  | 'Calendario'
  | 'Tabla General'
  | 'Liguilla'
  | 'Estadísticas';

interface PlayerLeader {
  name: string;
  team: string;
  value: number;
}

@customElement('home-page')
export class HomePage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        width: min(1180px, calc(100vw - 32px));
        padding: 8px 0 24px;
        box-sizing: border-box;
        text-align: left;
      }

      .home-shell {
        display: grid;
        gap: 16px;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 16px;
        padding: 20px;
        background:
          linear-gradient(
            135deg,
            color-mix(in srgb, var(--md-sys-color-primary) 15%, transparent),
            transparent 52%
          ),
          var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: var(--radius-m);
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
      }

      .hero-copy {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        width: fit-content;
        gap: 6px;
        color: var(--md-sys-color-primary);
        font-size: 0.78rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        color: var(--md-sys-color-on-surface);
        font-size: clamp(1.85rem, 4vw, 3rem);
        line-height: 1.05;
      }

      .hero-copy p {
        max-width: 720px;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 1rem;
        line-height: 1.5;
      }

      .match-focus {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        gap: 10px;
        align-items: center;
        padding: 16px;
        background: var(--md-sys-color-surface-container);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: var(--radius-m);
        color: inherit;
        cursor: pointer;
        text-decoration: none;
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          background-color 0.2s ease;
      }

      .match-focus:hover,
      .match-focus:focus-visible {
        border-color: var(--md-sys-color-primary);
        background: color-mix(
          in srgb,
          var(--md-sys-color-primary-container) 36%,
          var(--md-sys-color-surface-container)
        );
        outline: none;
        transform: translateY(-1px);
      }

      .team {
        display: grid;
        gap: 8px;
        justify-items: center;
        min-width: 0;
        text-align: center;
      }

      .team .logo {
        width: 54px;
        height: 54px;
        object-fit: contain;
      }

      .team-name {
        max-width: 100%;
        color: var(--md-sys-color-on-surface);
        font-weight: 800;
        overflow-wrap: anywhere;
      }

      .score {
        display: grid;
        gap: 6px;
        justify-items: center;
        min-width: 82px;
      }

      .score-value {
        color: var(--md-sys-color-primary);
        font-size: 1.75rem;
        font-weight: 900;
        line-height: 1;
      }

      .match-meta {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.78rem;
        font-weight: 700;
        text-align: center;
      }

      .live-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--app-color-danger);
      }

      .live-badge::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: currentColor;
        animation: pulse 1.2s ease-in-out infinite;
      }

      @keyframes pulse {
        50% {
          opacity: 0.35;
        }
      }

      .status-chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 6px;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        border-radius: 999px;
        padding: 2px 8px;
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        font-size: 0.68rem;
        font-weight: 900;
        letter-spacing: 0.03em;
        line-height: 1;
        text-transform: uppercase;
      }

      .status-chip.live {
        background: color-mix(in srgb, var(--app-color-danger) 14%, white);
        color: var(--app-color-danger);
      }

      .status-chip.lineups {
        background: color-mix(in srgb, var(--md-sys-color-primary) 12%, white);
        color: var(--md-sys-color-primary);
      }

      .quick-grid,
      .content-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .quick-card,
      .panel {
        background: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: var(--radius-m);
        box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06);
      }

      .quick-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        padding: 16px;
        color: inherit;
        cursor: pointer;
        text-align: left;
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          background-color 0.2s ease;
      }

      .quick-card:hover {
        border-color: var(--md-sys-color-primary);
        background: var(--md-sys-color-surface-container);
        transform: translateY(-1px);
      }

      .quick-icon {
        display: grid;
        place-items: center;
        width: 42px;
        height: 42px;
        border-radius: var(--radius-s);
        color: var(--md-sys-color-on-primary-container);
        background: var(--md-sys-color-primary-container);
      }

      .quick-card h2,
      .panel h2 {
        color: var(--md-sys-color-on-surface);
        font-size: 1.05rem;
        line-height: 1.2;
      }

      .quick-card p,
      .panel-subtitle,
      .empty {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.86rem;
        line-height: 1.4;
      }

      .panel {
        padding: 18px;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .table-list,
      .leader-list {
        display: grid;
        gap: 10px;
      }

      .team-row,
      .leader-row {
        display: grid;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 10px 0;
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      .team-row {
        grid-template-columns: 28px 34px minmax(0, 1fr) auto;
      }

      .leader-row {
        grid-template-columns: 34px minmax(0, 1fr) auto;
      }

      .team-row:first-child,
      .leader-row:first-child {
        border-top: 0;
      }

      .position {
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 800;
        text-align: center;
      }

      .team-row .logo,
      .leader-row .logo {
        width: 30px;
        height: 30px;
        object-fit: contain;
      }

      .row-name {
        min-width: 0;
        color: var(--md-sys-color-on-surface);
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .row-meta {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.78rem;
      }

      .points,
      .leader-value {
        color: var(--md-sys-color-primary);
        font-weight: 900;
        white-space: nowrap;
      }

      .liguilla-panel {
        display: grid;
        gap: 12px;
        align-content: start;
      }

      .qualified-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 2px;
      }

      .qualified-team {
        display: grid;
        gap: 6px;
        justify-items: center;
        min-width: 72px;
        padding: 8px;
        border-radius: var(--radius-s);
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface);
        font-size: 0.72rem;
        font-weight: 800;
        text-align: center;
      }

      .qualified-team .logo {
        width: 32px;
        height: 32px;
        object-fit: contain;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      @media (min-width: 760px) {
        .hero {
          grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
          align-items: center;
          padding: 28px;
        }

        .quick-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .quick-card {
          grid-template-columns: 1fr auto;
          align-content: space-between;
          min-height: 130px;
        }

        .quick-icon {
          grid-row: 1;
        }

        .quick-copy {
          grid-column: 1 / -1;
        }

        .content-grid {
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
        }
      }

      @media (max-width: 520px) {
        :host {
          width: min(100vw, calc(100vw - 24px));
        }

        .hero,
        .panel,
        .quick-card {
          border-radius: var(--radius-s);
        }

        .match-focus {
          grid-template-columns: 1fr;
        }

        .score {
          min-width: 0;
        }

        .quick-card {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .quick-card > md-icon:last-child {
          display: none;
        }
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Array }) stadiums: string[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ type: Boolean }) isAdmin = false;
  @property({ attribute: false }) navigateToTab?: (tab: NavigationTab) => void;

  @state() private showDetails = false;
  @state() private selectedMatch: Match | null = null;

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('matchesList') && this.selectedMatch) {
      const updatedMatch = this.matchesList.find(
        match => match.idMatch === this.selectedMatch?.idMatch,
      );
      if (updatedMatch) this.selectedMatch = updatedMatch;
    }
  }

  override render() {
    if (this.showDetails && this.selectedMatch) {
      return html`
        <match-detail-page
          .match=${this.selectedMatch}
          .matchesList=${this.matchesList}
          .table=${this.table}
          .teams=${this.teams}
          .players=${this.players}
          .stadiums=${this.stadiums}
          .isAdmin=${this.isAdmin}
          @back-to-calendar=${this._backToHome}
        ></match-detail-page>
      `;
    }

    const focusMatch = this._getFocusMatch();
    const focusLabel = focusMatch ? this._getFocusLabel(focusMatch) : '';
    const topScorer = this._getLeader('goals');
    const topAssist = this._getLeader('assists');
    const qualifiedTeams = this.table.slice(0, 8);

    return html`
      <section class="home-shell" aria-label="Inicio Liga MX HRLV">
        <div class="hero">
          <div class="hero-copy">
            <div class="eyebrow">
              <md-icon>sports_soccer</md-icon>
              Liga MX HRLV
            </div>
            <h1>Lo más relevante del torneo</h1>
            <p>
              Consulta el partido clave, la zona alta de la tabla, líderes de
              actividad y accesos directos a las vistas completas.
            </p>
            <div class="actions">
              <md-filled-button
                @click=${() => this._navigate('Calendario')}
                aria-label="Ir al calendario"
              >
                <md-icon slot="icon">calendar_month</md-icon>
                Calendario
              </md-filled-button>
              <md-outlined-button
                @click=${() => this._navigate('Tabla General')}
                aria-label="Ir a la tabla general"
              >
                <md-icon slot="icon">format_list_numbered</md-icon>
                Tabla
              </md-outlined-button>
            </div>
          </div>

          ${focusMatch
            ? html`
                <a
                  class="match-focus"
                  href=${this._matchHref(focusMatch)}
                  aria-label="Abrir detalle del partido destacado"
                  @click=${(event: MouseEvent) =>
                    this._onMatchLinkClick(event, focusMatch)}
                >
                  <div class="team">
                    ${getTeamImage(focusMatch.local)}
                    <span class="team-name">${focusMatch.local}</span>
                  </div>
                  <div class="score">
                    <div
                      class=${isMatchLive(focusMatch)
                        ? 'match-meta live-badge'
                        : 'match-meta'}
                    >
                      ${focusLabel}
                    </div>
                    ${this._renderStatusChips(focusMatch)}
                    <div class="score-value">
                      ${this._formatScore(focusMatch)}
                    </div>
                    <div class="match-meta">
                      ${this._formatMatchDate(focusMatch)}
                    </div>
                  </div>
                  <div class="team">
                    ${getTeamImage(focusMatch.visitante)}
                    <span class="team-name">${focusMatch.visitante}</span>
                  </div>
                </a>
              `
            : html`
                <article class="match-focus" aria-label="Sin partidos">
                  <div class="score">
                    <div class="match-meta">Calendario</div>
                    <div class="score-value">-</div>
                    <div class="match-meta">Sin partidos cargados</div>
                  </div>
                </article>
              `}
        </div>

        <div class="quick-grid" aria-label="Accesos rápidos">
          ${this._renderQuickCard(
            'Calendario',
            'calendar_month',
            'Partidos, filtros y detalle',
          )}
          ${this._renderQuickCard(
            'Tabla General',
            'format_list_numbered',
            'Posiciones y equipos',
          )}
          ${this._renderQuickCard(
            'Liguilla',
            'account_tree',
            'Bracket interactivo',
          )}
          ${this._renderQuickCard(
            'Estadísticas',
            'bar_chart',
            'Goles, asistencias y fair play',
          )}
        </div>

        <div class="content-grid">
          <section class="panel" aria-label="Top tabla general">
            <div class="panel-header">
              <div>
                <h2>Top de la tabla</h2>
                <p class="panel-subtitle">Primeros cuatro lugares</p>
              </div>
              <md-outlined-button
                @click=${() => this._navigate('Tabla General')}
                aria-label="Ver tabla completa"
              >
                Ver tabla
              </md-outlined-button>
            </div>
            <div class="table-list">
              ${this.table.length === 0
                ? html`<p class="empty">
                    La tabla se mostrará al cargar datos.
                  </p>`
                : this.table
                    .slice(0, 4)
                    .map((team, index) => this._renderTableRow(team, index))}
            </div>
          </section>

          <section class="panel" aria-label="Actividad del torneo">
            <div class="panel-header">
              <div>
                <h2>Actividad</h2>
                <p class="panel-subtitle">Líderes disponibles por eventos</p>
              </div>
              <md-outlined-button
                @click=${() => this._navigate('Estadísticas')}
                aria-label="Ver estadísticas completas"
              >
                Ver stats
              </md-outlined-button>
            </div>
            <div class="leader-list">
              ${topScorer
                ? this._renderLeader('Goleador', topScorer, 'G')
                : html`<p class="empty">Sin goles registrados.</p>`}
              ${topAssist
                ? this._renderLeader('Asistidor', topAssist, 'Ast')
                : html`<p class="empty">Sin asistencias registradas.</p>`}
            </div>
          </section>

          <section class="panel liguilla-panel" aria-label="Zona de liguilla">
            <div class="panel-header">
              <div>
                <h2>Zona de Liguilla</h2>
                <p class="panel-subtitle">Equipos mejor sembrados</p>
              </div>
              <md-outlined-button
                @click=${() => this._navigate('Liguilla')}
                aria-label="Ver liguilla"
              >
                Ver bracket
              </md-outlined-button>
            </div>
            ${qualifiedTeams.length === 0
              ? html`<p class="empty">
                  La zona se mostrará al cargar la tabla.
                </p>`
              : html`
                  <div class="qualified-strip">
                    ${qualifiedTeams.map(
                      team => html`
                        <div class="qualified-team">
                          ${getTeamImage(team.equipo)}
                          <span>${team.equipo}</span>
                        </div>
                      `,
                    )}
                  </div>
                `}
          </section>
        </div>
      </section>
    `;
  }

  private _renderQuickCard(
    tab: NavigationTab,
    icon: string,
    description: string,
  ) {
    const title = tab === 'Tabla General' ? 'Tabla' : tab;
    return html`
      <button
        class="quick-card"
        type="button"
        @click=${() => this._navigate(tab)}
      >
        <span class="quick-icon"><md-icon>${icon}</md-icon></span>
        <span class="quick-copy">
          <h2>${title}</h2>
          <p>${description}</p>
        </span>
        <md-icon>chevron_right</md-icon>
      </button>
    `;
  }

  private _renderTableRow(team: TableEntry, index: number) {
    return html`
      <div class="team-row">
        <div class="position">${index + 1}</div>
        ${getTeamImage(team.equipo)}
        <div>
          <div class="row-name">${team.equipo}</div>
          <div class="row-meta">DG ${team.dg} · JJ ${team.jj}</div>
        </div>
        <div class="points">${team.pts} pts</div>
      </div>
    `;
  }

  private _renderLeader(label: string, leader: PlayerLeader, suffix: string) {
    return html`
      <div class="leader-row">
        ${getTeamImage(leader.team)}
        <div>
          <div class="row-name">${leader.name}</div>
          <div class="row-meta">${label} · ${leader.team}</div>
        </div>
        <div class="leader-value">${leader.value} ${suffix}</div>
      </div>
    `;
  }

  private _getFocusMatch(): Match | null {
    if (this.matchesList.length === 0) return null;

    const sortedMatches = [...this.matchesList].sort(
      (a, b) => this._matchTime(a) - this._matchTime(b),
    );
    const liveMatch = sortedMatches.find(match => isMatchLive(match));
    if (liveMatch) return liveMatch;

    const today = new Date();
    const todayMatch = sortedMatches.find(match =>
      this._isSameDay(match.fecha, today),
    );
    if (todayMatch) return todayMatch;

    const now = Date.now();
    const nextMatch = sortedMatches.find(
      match => this._matchTime(match) >= now,
    );
    if (nextMatch) return nextMatch;

    return sortedMatches[sortedMatches.length - 1];
  }

  private _getFocusLabel(match: Match): string {
    if (isMatchLive(match)) return 'En vivo';
    if (this._isSameDay(match.fecha, new Date())) return 'Hoy';
    if (this._matchTime(match) >= Date.now()) return 'Próximo partido';
    return 'Último resultado';
  }

  private _getLeader(kind: 'goals' | 'assists'): PlayerLeader | null {
    const leaders = new Map<string, PlayerLeader>();

    this.matchesList.forEach(match => {
      const localPlayers =
        this.players.get(match.local.replaceAll('.', '')) || [];
      const visitorPlayers =
        this.players.get(match.visitante.replaceAll('.', '')) || [];

      getGoalEvents(match.events).forEach(goal => {
        const team = goal.team === 'local' ? match.local : match.visitante;
        const players = goal.team === 'local' ? localPlayers : visitorPlayers;
        if (kind === 'goals' && !goal.ownGoal) {
          this._addLeaderValue(leaders, team, goal.player, players, 1);
        }
        if (kind === 'assists' && goal.assist) {
          this._addLeaderValue(leaders, team, goal.assist, players, 1);
        }
      });
    });

    return [...leaders.values()].sort((a, b) => b.value - a.value)[0] || null;
  }

  private _addLeaderValue(
    leaders: Map<string, PlayerLeader>,
    team: string,
    number: number,
    players: Player[],
    value: number,
  ) {
    const player = players.find(candidate => candidate.number === number);
    const key = `${team}-${number}`;
    const current = leaders.get(key) || {
      name: player?.name || `Jugador ${number}`,
      team,
      value: 0,
    };
    current.value += value;
    leaders.set(key, current);
  }

  private _formatScore(match: Match): string {
    const hasScore =
      Number.isFinite(match.golLocal) && Number.isFinite(match.golVisitante);
    return hasMatchStarted(match) && hasScore
      ? `${match.golLocal} - ${match.golVisitante}`
      : 'VS';
  }

  private _formatMatchDate(match: Match): string {
    if (!(match.fecha instanceof Date)) return match.hora;
    return `${formatDateDDMMYYYY(match.fecha)} · ${match.hora}`;
  }

  private _matchTime(match: Match): number {
    return match.fecha instanceof Date ? match.fecha.getTime() : 0;
  }

  private _isSameDay(date: string | Date, target: Date): boolean {
    return (
      date instanceof Date &&
      date.getFullYear() === target.getFullYear() &&
      date.getMonth() === target.getMonth() &&
      date.getDate() === target.getDate()
    );
  }

  private _navigate(tab: NavigationTab) {
    this.navigateToTab?.(tab);
    this.dispatchEvent(
      new CustomEvent('navigate-tab', {
        detail: { tab },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _openMatchDetails(match: Match) {
    this.selectedMatch = match;
    this.showDetails = true;
    window.scrollTo(0, 0);
  }

  private _onMatchLinkClick(event: MouseEvent, match: Match) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this._openMatchDetails(match);
  }

  private _matchHref(match: Match): string {
    return `?tab=Inicio&match=${match.idMatch}`;
  }

  private _renderStatusChips(match: Match) {
    const periodLabel = getLiveMatchPeriodLabel(match);
    const hasLineupsReady = lineupsReadyBeforeKickoff(match);

    if (!periodLabel && !hasLineupsReady) return '';

    return html`
      <div class="status-chips" aria-label="Estado del partido">
        ${periodLabel
          ? html`<span class="status-chip live">${periodLabel}</span>`
          : ''}
        ${hasLineupsReady
          ? html`<span class="status-chip lineups">Alineaciones listas</span>`
          : ''}
      </div>
    `;
  }

  private _backToHome() {
    this.showDetails = false;
    this.selectedMatch = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
