import '@material/web/icon/icon.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import './match-detail-page.js';

import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { LIGUILLA } from '../utils/constants.js';
import { formatDateDDMMYYYY, isMatchLive } from '../utils/dateUtils.js';
import {
  getPhaseEvents,
  getPlayoffSeriesMatches,
  getPlayoffSeriesResult,
  PlayoffSeriesConfig,
} from '../utils/functionUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';

interface BracketSeries {
  key: string;
  name: string;
  config: PlayoffSeriesConfig;
}

interface BracketRound {
  title: string;
  className: string;
  series: BracketSeries[];
}

const BRACKET_ROUNDS: BracketRound[] = [
  {
    title: 'Cuartos',
    className: 'quarters',
    series: [
      { key: 'quarter1', name: 'Cuartos 1', config: LIGUILLA.quarter1 },
      { key: 'quarter2', name: 'Cuartos 2', config: LIGUILLA.quarter2 },
      { key: 'quarter3', name: 'Cuartos 3', config: LIGUILLA.quarter3 },
      { key: 'quarter4', name: 'Cuartos 4', config: LIGUILLA.quarter4 },
    ],
  },
  {
    title: 'Semifinal',
    className: 'semis',
    series: [
      { key: 'semi1', name: 'Semifinal 1', config: LIGUILLA.semi1 },
      { key: 'semi2', name: 'Semifinal 2', config: LIGUILLA.semi2 },
    ],
  },
  {
    title: 'Final',
    className: 'final',
    series: [{ key: 'final', name: 'Final', config: LIGUILLA.final }],
  },
];

@customElement('bracket-page')
export class BracketPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 16px;
      }

      .bracket-shell {
        width: min(1220px, calc(100vw - 32px));
        margin: 0 auto;
      }

      .bracket-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
        text-align: left;
      }

      .bracket-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .bracket-title md-icon {
        color: var(--md-sys-color-primary);
      }

      .bracket-title h2 {
        font-size: 1.4rem;
      }

      .bracket-status {
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 700;
      }

      .bracket-grid {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(280px, 1fr) minmax(
            280px,
            1fr
          );
        gap: 28px;
        align-items: stretch;
      }

      .round {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .round-title {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
        margin: 0 0 12px;
        text-align: left;
      }

      .round-series {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        gap: 18px;
        height: 100%;
      }

      .series-card {
        position: relative;
        background: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        padding: 12px;
        text-align: left;
      }

      .series-card::after {
        content: '';
        position: absolute;
        top: 50%;
        right: -29px;
        width: 28px;
        border-top: 2px solid var(--md-sys-color-outline-variant);
      }

      .round.final .series-card::after {
        display: none;
      }

      .series-card.winner-known {
        border-color: color-mix(in srgb, var(--md-sys-color-primary) 45%, var(--md-sys-color-outline-variant));
      }

      .series-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
      }

      .series-name {
        font-weight: 800;
        color: var(--md-sys-color-on-surface);
      }

      .series-pill {
        border-radius: 999px;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        font-weight: 800;
        padding: 4px 8px;
        white-space: nowrap;
      }

      .series-pill.done {
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
      }

      .legs {
        display: grid;
        gap: 8px;
      }

      .leg-button {
        width: 100%;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 8px;
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface);
        padding: 0;
        cursor: pointer;
        text-align: left;
        max-width: none;
        margin: 0;
      }

      .leg-button:disabled {
        cursor: default;
        opacity: 0.72;
      }

      .leg-button:not(:disabled):hover {
        border-color: var(--md-sys-color-primary);
        background: var(--row-hover);
      }

      .leg-content {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        padding: 9px;
      }

      .leg-label {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      .team-line {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }

      .team-line.visitor {
        justify-content: flex-end;
        text-align: right;
      }

      .team-line .logo {
        width: 28px;
        height: 28px;
        object-fit: contain;
        flex: 0 0 auto;
      }

      .team-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.82rem;
        font-weight: 700;
      }

      .team-name.placeholder {
        color: var(--md-sys-color-on-surface-variant);
        font-style: italic;
      }

      .score-block {
        min-width: 48px;
        text-align: center;
      }

      .score {
        color: var(--md-sys-color-primary);
        font-size: 1rem;
        font-weight: 900;
        line-height: 1;
      }

      .live-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        margin-left: 4px;
        border-radius: 50%;
        background: var(--app-color-danger);
        animation: live-dot-blink 1.2s ease-in-out infinite;
      }

      @keyframes live-dot-blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }

      .leg-meta {
        grid-column: 2 / 5;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        padding-top: 2px;
      }

      .aggregate {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--md-sys-color-outline-variant);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.8rem;
        font-weight: 800;
      }

      .winner {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--md-sys-color-primary);
      }

      .champion-legend {
        margin: 20px auto 0;
        padding: 14px 16px;
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-weight: 900;
      }

      @media (max-width: 960px) {
        .bracket-grid {
          grid-template-columns: 1fr;
          gap: 22px;
        }

        .round-series {
          justify-content: flex-start;
        }

        .series-card::after {
          display: none;
        }
      }

      @media (max-width: 600px) {
        :host {
          padding: 12px;
        }

        .bracket-shell {
          width: 100%;
        }

        .bracket-header {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
        }

        .leg-content {
          grid-template-columns: 38px minmax(0, 1fr) 44px minmax(0, 1fr);
          gap: 6px;
          padding: 8px;
        }

        .team-line {
          flex-direction: column;
          align-items: flex-start;
        }

        .team-line.visitor {
          align-items: flex-end;
        }

        .team-line .logo {
          width: 24px;
          height: 24px;
        }

        .team-name {
          max-width: 100%;
          font-size: 0.76rem;
        }
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Array }) stadiums: string[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();

  @state() showDetails = false;
  @state() selectedMatch: Match | null = null;

  override updated(changedProperties: Map<string, unknown>) {
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
        <main>
          <match-detail-page
            .match=${this.selectedMatch}
            .matchesList=${this.matchesList}
            .table=${this.table}
            .teams=${this.teams}
            .players=${this.players}
            .stadiums=${this.stadiums}
            @back-to-calendar=${this._backToBracket}
          ></match-detail-page>
        </main>
      `;
    }

    return html`
      <main class="bracket-shell">
        <div class="bracket-header">
          <div class="bracket-title">
            <md-icon>account_tree</md-icon>
            <h2>Llaves de Liguilla</h2>
          </div>
          <div class="bracket-status">${this._getBracketStatus()}</div>
        </div>

        <section class="bracket-grid" aria-label="Llaves de liguilla">
          ${BRACKET_ROUNDS.map(round => this._renderRound(round))}
        </section>

        ${this._renderChampionLegend()}
      </main>
    `;
  }

  private _renderRound(round: BracketRound) {
    return html`
      <section class="round ${round.className}">
        <h3 class="round-title">${round.title}</h3>
        <div class="round-series">
          ${round.series.map(series => this._renderSeries(series))}
        </div>
      </section>
    `;
  }

  private _renderSeries(series: BracketSeries) {
    const result = getPlayoffSeriesResult(
      series.config,
      this.matchesList,
      this.table,
    );
    const { ida, vuelta } = getPlayoffSeriesMatches(
      series.config,
      this.matchesList,
    );

    return html`
      <article class="series-card ${result?.winner ? 'winner-known' : ''}">
        <div class="series-heading">
          <span class="series-name">${series.name}</span>
          <span class="series-pill ${result?.winner ? 'done' : ''}">
            ${result?.winner ? 'Definida' : 'Pendiente'}
          </span>
        </div>
        <div class="legs">
          ${this._renderLeg('Ida', ida)} ${this._renderLeg('Vuelta', vuelta)}
        </div>
        ${this._renderAggregate(series.config, result)}
      </article>
    `;
  }

  private _renderLeg(label: string, match: Match | null) {
    const hasMatch = Boolean(match);
    const isLive = match ? isMatchLive(getPhaseEvents(match.events)) : false;

    return html`
      <button
        class="leg-button"
        ?disabled=${!hasMatch}
        @click=${() => match && this._showMatchDetails(match)}
        aria-label=${hasMatch
          ? `${label}: ${match?.local || 'Por definir'} contra ${match
              ?.visitante || 'Por definir'}`
          : `${label}: Por definir`}
      >
        <div class="leg-content">
          <div class="leg-label">
            ${label}${isLive ? html`<span class="live-dot"></span>` : ''}
          </div>
          ${this._renderTeam(match?.local || '', false)}
          <div class="score-block">
            <div class="score">${this._formatScore(match)}</div>
          </div>
          ${this._renderTeam(match?.visitante || '', true)}
          <div class="leg-meta">${this._formatMeta(match)}</div>
        </div>
      </button>
    `;
  }

  private _renderTeam(teamName: string, isVisitor: boolean) {
    if (!teamName.trim()) {
      return html`
        <div class="team-line ${isVisitor ? 'visitor' : ''}">
          <span class="team-name placeholder">Por definir</span>
        </div>
      `;
    }

    return html`
      <div class="team-line ${isVisitor ? 'visitor' : ''}">
        ${isVisitor ? '' : getTeamImage(teamName)}
        <span class="team-name">${teamName}</span>
        ${isVisitor ? getTeamImage(teamName) : ''}
      </div>
    `;
  }

  private _renderAggregate(
    series: PlayoffSeriesConfig,
    result: ReturnType<typeof getPlayoffSeriesResult>,
  ) {
    if (!result) {
      return html`
        <div class="aggregate">
          <span>Global</span>
          <span>Por definir</span>
        </div>
      `;
    }

    const { vuelta } = getPlayoffSeriesMatches(series, this.matchesList);
    const local = vuelta?.local || '';
    const visitor = vuelta?.visitante || '';
    const localScore = result.aggregate[local];
    const visitorScore = result.aggregate[visitor];

    return html`
      <div class="aggregate">
        <span>Global ${localScore} - ${visitorScore}</span>
        <span class="winner">
          <md-icon>emoji_events</md-icon>
          ${result.winner}
        </span>
      </div>
    `;
  }

  private _renderChampionLegend() {
    const result = getPlayoffSeriesResult(
      LIGUILLA.final,
      this.matchesList,
      this.table,
    );

    if (!result?.winner) return '';

    return html`
      <div class="champion-legend" role="note">
        <md-icon>emoji_events</md-icon>
        Campeón: ${result.winner}
      </div>
    `;
  }

  private _formatScore(match: Match | null): string {
    if (!match) return '-';
    if (
      typeof match.golLocal !== 'number' ||
      typeof match.golVisitante !== 'number'
    ) {
      return '-';
    }
    return `${match.golLocal} - ${match.golVisitante}`;
  }

  private _formatMeta(match: Match | null): string {
    if (!match) return 'Partido pendiente de asignar';
    const date =
      match.fecha instanceof Date ? formatDateDDMMYYYY(match.fecha) : '';
    const time = match.hora || '';
    const stadium = match.estadio || '';
    return [date, time, stadium].filter(Boolean).join(' - ') || 'Por definir';
  }

  private _getBracketStatus(): string {
    const result = getPlayoffSeriesResult(
      LIGUILLA.final,
      this.matchesList,
      this.table,
    );
    return result?.winner ? `Campeón: ${result.winner}` : 'En curso';
  }

  private _showMatchDetails(match: Match) {
    this.selectedMatch = match;
    this.showDetails = true;
    window.scrollTo(0, 0);
  }

  private _backToBracket() {
    this.showDetails = false;
    window.scrollTo(0, 0);
  }
}
