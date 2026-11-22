import '@material/web/icon/icon.js';
import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import './match-detail-page.js';

import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { LIGUILLA, REGULAR_SEASON_LAST_JORNADA } from '../utils/constants.js';
import { formatDateDDMMYYYY } from '../utils/dateUtils.js';
import {
  getPlayoffSeriesMatches,
  getPlayoffSeriesResult,
  PlayoffSeriesConfig,
} from '../utils/functionUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import { hasMatchEnded, isMatchLive } from '../utils/matchStatus.js';
import {
  calculatePlayoffAssignments,
  hasFinishedPlayoffLeg,
  hasPlayoffParticipants,
  type PlayoffParticipants,
} from '../utils/playoffCalculator.js';

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

type BracketStatusTone =
  | 'pending'
  | 'provisional'
  | 'confirmed'
  | 'champion';

interface BracketStatus {
  label: string;
  tone: BracketStatusTone;
  isLive?: boolean;
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

const DERIVED_MATCH_IDS = new Set(
  BRACKET_ROUNDS.slice(1).flatMap(round =>
    round.series.flatMap(({ config }) => [config.ida.id, config.vuelta.id]),
  ),
);

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
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 6px 10px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 999px;
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        line-height: 1.2;
      }

      .bracket-status.provisional {
        border-color: color-mix(
          in srgb,
          var(--md-sys-color-tertiary) 45%,
          var(--md-sys-color-outline-variant)
        );
        background: var(--md-sys-color-tertiary-container);
        color: var(--md-sys-color-on-tertiary-container);
      }

      .bracket-status.confirmed,
      .bracket-status.champion {
        border-color: color-mix(
          in srgb,
          var(--md-sys-color-primary) 45%,
          var(--md-sys-color-outline-variant)
        );
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
      }

      .bracket-status .live-dot {
        width: 7px;
        height: 7px;
        margin: 0;
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
        border-color: color-mix(
          in srgb,
          var(--md-sys-color-primary) 45%,
          var(--md-sys-color-outline-variant)
        );
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

      .winner.pending {
        color: var(--md-sys-color-on-surface-variant);
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

        .bracket-status {
          max-width: 100%;
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
  @property({ type: Boolean }) isAdmin = false;

  @state() private selectedMatchId: number | null = null;

  private assignments = new Map<number, PlayoffParticipants>();
  private availableMatches: Match[] = [];

  override willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has('matchesList') || changedProperties.has('table')) {
      const previousSelection = this.availableMatches.find(
        match => match.idMatch === this.selectedMatchId,
      );
      this.assignments = calculatePlayoffAssignments(
        this.table,
        this.matchesList,
      );
      this.availableMatches = this.matchesList.filter(
        match =>
          !DERIVED_MATCH_IDS.has(match.idMatch) ||
          hasPlayoffParticipants(match, this.assignments.get(match.idMatch)),
      );
      const selected = this.availableMatches.find(
        match => match.idMatch === this.selectedMatchId,
      );
      if (
        !selected ||
        (DERIVED_MATCH_IDS.has(selected.idMatch) &&
          !hasPlayoffParticipants(selected, previousSelection))
      ) {
        this.selectedMatchId = null;
      }
    }
  }

  override render() {
    const selectedMatch = this.availableMatches.find(
      match => match.idMatch === this.selectedMatchId,
    );
    if (selectedMatch) {
      return html`
        <main>
          <match-detail-page
            .match=${selectedMatch}
            .matchesList=${this.availableMatches}
            .table=${this.table}
            .teams=${this.teams}
            .players=${this.players}
            .stadiums=${this.stadiums}
            .isAdmin=${this.isAdmin}
            @back-to-calendar=${this._backToBracket}
          ></match-detail-page>
        </main>
      `;
    }

    const champion = this._getSeriesResult(LIGUILLA.final)?.winner ?? null;
    return html`
      <main class="bracket-shell">
        <div class="bracket-header">
          <div class="bracket-title">
            <md-icon>account_tree</md-icon>
            <h2>Llaves de Liguilla</h2>
          </div>
          ${this._renderBracketStatus(champion)}
        </div>

        <section class="bracket-grid" aria-label="Llaves de liguilla">
          ${BRACKET_ROUNDS.map(round => this._renderRound(round))}
        </section>

        ${this._renderChampionLegend(champion)}
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

  private _getSeriesResult(series: PlayoffSeriesConfig) {
    const result = getPlayoffSeriesResult(
      series,
      this.availableMatches,
      this.table,
    );
    if (!result || !DERIVED_MATCH_IDS.has(series.vuelta.id)) return result;

    const { ida, vuelta } = getPlayoffSeriesMatches(
      series,
      this.availableMatches,
    );
    if (
      ida && vuelta && hasFinishedPlayoffLeg(ida) && hasFinishedPlayoffLeg(vuelta)
    ) {
      return result;
    }
    return {
      ...result,
      winner: null,
      penaltyScore: null,
      requiresExtraTimeOrPenalties: false,
    };
  }

  private _renderSeries(series: BracketSeries) {
    const result = this._getSeriesResult(series.config);
    const { ida, vuelta } = getPlayoffSeriesMatches(
      series.config,
      this.availableMatches,
    );
    const pendingSeriesStatus = result?.requiresExtraTimeOrPenalties
      ? 'TE / Penales'
      : 'Pendiente';
    const seriesStatus = result?.winner ? 'Definida' : pendingSeriesStatus;

    return html`
      <article class="series-card ${result?.winner ? 'winner-known' : ''}">
        <div class="series-heading">
          <span class="series-name">${series.name}</span>
          <span class="series-pill ${result?.winner ? 'done' : ''}">
            ${seriesStatus}
          </span>
        </div>
        <div class="legs">
          ${this._renderLeg('Ida', series.config.ida.id, ida)}
          ${this._renderLeg('Vuelta', series.config.vuelta.id, vuelta)}
        </div>
        ${this._renderAggregate(vuelta, result)}
      </article>
    `;
  }

  private _renderLeg(label: string, id: number, match: Match | null) {
    const participants =
      match ?? (DERIVED_MATCH_IDS.has(id) ? this.assignments.get(id) : undefined);
    const local = participants?.local || '';
    const visitor = participants?.visitante || '';
    const isLive = match ? isMatchLive(match) : false;

    return html`
      <button
        class="leg-button"
        ?disabled=${!match}
        @click=${() => match && this._showMatchDetails(match.idMatch)}
        aria-label=${
          participants
            ? `${label}: ${local || 'Por definir'} contra ${visitor || 'Por definir'}`
            : `${label}: Por definir`
        }
      >
        <div class="leg-content">
          <div class="leg-label">
            ${label}${isLive ? html`<span class="live-dot"></span>` : ''}
          </div>
          ${this._renderTeam(local, false)}
          <div class="score-block">
            <div class="score">${this._formatScore(match)}</div>
          </div>
          ${this._renderTeam(visitor, true)}
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
    vuelta: Match | null,
    result: ReturnType<typeof getPlayoffSeriesResult>,
  ) {
    if (!result || !vuelta) {
      return html`
        <div class="aggregate">
          <span>Global</span>
          <span>Por definir</span>
        </div>
      `;
    }

    const localScore = result.aggregate[vuelta.local];
    const visitorScore = result.aggregate[vuelta.visitante];

    const penaltyText = result.penaltyScore
      ? html`<span
          >Penales ${result.penaltyScore.local} -
          ${result.penaltyScore.visitante}</span
        >`
      : '';
    const winnerText = result.winner
      ? html`<span class="winner">
          <md-icon>emoji_events</md-icon>
          ${result.winner}
        </span>`
      : '';
    const pendingExtraTimeText =
      result.requiresExtraTimeOrPenalties && !result.winner
        ? html`<span class="winner pending">Pendiente por TE / penales</span>`
        : '';

    return html`
      <div class="aggregate">
        <span>Global ${localScore} - ${visitorScore}</span>
        ${penaltyText} ${winnerText} ${pendingExtraTimeText}
      </div>
    `;
  }

  private _renderChampionLegend(champion: string | null) {
    if (!champion) return '';

    return html`
      <div class="champion-legend" role="note">
        <md-icon>emoji_events</md-icon>
        Campeón: ${champion}
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

  private _renderBracketStatus(champion: string | null) {
    const status = this._getBracketStatus(champion);
    return html`<div
      class="bracket-status ${status.tone}"
      role="status"
      aria-live="polite"
    >
      ${status.isLive ? html`<span class="live-dot" aria-hidden="true"></span>` : ''}
      <span>${status.label}</span>
    </div>`;
  }

  private _getBracketStatus(champion: string | null): BracketStatus {
    if (champion) {
      return { label: `Campeón: ${champion}`, tone: 'champion' };
    }
    if (!this._hasRegularSeasonMatches()) {
      return { label: 'Por definir', tone: 'pending' };
    }
    if (this._isRegularSeasonComplete()) {
      return { label: 'CRUCES CONFIRMADOS', tone: 'confirmed' };
    }
    return {
      label: 'CRUCES PROVISIONALES · Se actualizan en vivo',
      tone: 'provisional',
      isLive: true,
    };
  }

  private _regularSeasonMatches(): Match[] {
    return this.matchesList.filter(
      match =>
        match.jornada <= REGULAR_SEASON_LAST_JORNADA &&
        match.status !== 'cancelled' &&
        match.status !== 'postponed',
    );
  }

  private _hasRegularSeasonMatches(): boolean {
    return this._regularSeasonMatches().length > 0;
  }

  private _isRegularSeasonComplete(): boolean {
    const matches = this._regularSeasonMatches();
    return matches.length > 0 && matches.every(hasMatchEnded);
  }

  private _showMatchDetails(id: number) {
    this.selectedMatchId = id;
    window.scrollTo(0, 0);
  }

  private _backToBracket() {
    this.selectedMatchId = null;
    window.scrollTo(0, 0);
  }
}
