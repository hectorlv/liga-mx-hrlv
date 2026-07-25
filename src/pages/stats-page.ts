import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  Match,
  Player,
  PlayerGame,
  PlayerTeam,
  TeamSide,
  U23NationalTeamCallups,
} from '../types';
import { GOAL_TYPE_LABELS } from '../constants';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { getTeamImage } from '../utils/imageUtils.js';
import {
  dispatchEventMatchUpdated,
  getCardEvents,
  getGoalEvents,
  getSubstitutionEvents,
} from '../utils/functionUtils';
import { hasMatchEnded } from '../utils/matchStatus.js';
import {
  readImageFromClipboard,
  uploadPlayerImage,
} from '../utils/playerImageUpload.js';
import {
  REGULAR_SEASON_LAST_JORNADA,
  U23_MIN_BIRTH_YEAR,
} from '../utils/constants.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import { MdDialog } from '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';

const REQUIRED_U23_MINUTES = 1170;

interface PlayerStats {
  key: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  minutes: number;
}

interface TeamStats {
  team: string;
  goalsFor: number;
  goalsAgainst: number;
  yellows: number;
  indirectReds: number;
  directReds: number;
  fairPlayPoints: number;
  u23PlayersCount: number;
  u23totalMinutes: number;
  u23CallupMinutes: number;
  u23countedMinutes: number;
}

interface U23CallupPreview {
  team: string;
  teamKey: string;
  player: Player;
  actualMinutes: number;
  completedRegularMatches: number;
  missedMatches: number;
}

interface GoalDistributionStat {
  label: string;
  count: number;
}

interface NationalityStat {
  label: string;
  count: number;
}

const MINUTES_REQUIRED_FOR_CALLUP_CREDIT = 180;

function isU23MexicanPlayer(player: Player): boolean {
  const birthYear = Number(
    typeof player.birthDate === 'string'
      ? player.birthDate.split('/')[2]
      : player.birthDate.getFullYear(),
  );

  return player.nationality === 'Mexicano' && birthYear >= U23_MIN_BIRTH_YEAR;
}

@customElement('stats-page')
export class StatsPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
        --card-bg: var(--md-sys-color-surface);
      }

      /* LAYOUT TIPO DASHBOARD */
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
        align-items: start;
      }

      @media (min-width: 900px) {
        .dashboard-grid {
          /* En pantallas grandes, acomoda 2 tablas por fila */
          grid-template-columns: repeat(2, 1fr);
        }

        /* Hacemos que la tabla principal de jugadores ocupe todo el ancho */
        .card.full-width {
          grid-column: 1 / -1;
        }
      }

      /* ESTILO DE LAS TARJETAS */
      .card {
        background: var(--card-bg);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--md-sys-color-outline-variant);
        overflow: hidden;
      }

      .card-header {
        margin-bottom: 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        padding-bottom: 12px;
      }

      h3 {
        margin: 0 0 4px 0;
        color: var(--md-sys-color-on-surface);
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .meta {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
      }

      /* ESTILO LIMPIO PARA TODAS LAS TABLAS */
      .table-wrapper {
        width: 100%;
        overflow-x: auto;
        /* Scroll suave en móvil */
        -webkit-overflow-scrolling: touch;
      }

      .modern-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.9rem;
        white-space: nowrap;
      }

      .modern-table th {
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 600;
        padding: 12px 16px;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.5px;
        border-bottom: 2px solid var(--md-sys-color-outline-variant);
      }

      .modern-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        color: var(--md-sys-color-on-surface);
        vertical-align: middle;
      }

      /* Hover sutil en las filas */
      .modern-table tbody tr:hover {
        background-color: var(--row-hover, rgba(0, 0, 0, 0.02));
      }

      /* Destacar la columna de "Posición" */
      .modern-table td:first-child {
        font-weight: bold;
        color: var(--md-sys-color-on-surface-variant);
        text-align: center;
      }
      .modern-table th:first-child {
        text-align: center;
      }

      /* El #1 de los rankings resalta en dorado/primario */
      .rank-1 td:first-child {
        color: var(--app-color-warning, #ffb300);
        font-size: 1.1rem;
      }
      .rank-1 {
        background-color: rgba(255, 179, 0, 0.05);
      }

      /* Alineación de números a la derecha para legibilidad */
      .modern-table th.num-col,
      .modern-table td.num-col {
        text-align: center;
      }

      /* Imagen del equipo chiquita en la tabla */
      .team-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      .team-cell img {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }

      .progress-cell {
        padding-top: 4px;
        padding-bottom: 16px;
      }

      .team-summary-row td {
        border-bottom: 0;
      }

      .team-rank-cell {
        vertical-align: middle;
      }

      .progress-row td {
        padding-top: 0;
      }

      .progress-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 8px;
        font-size: 0.8rem;
      }

      .progress-value {
        font-weight: 700;
        color: var(--md-sys-color-on-surface);
      }

      .progress-status {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }

      .progress-status.fulfilled {
        color: var(--md-sys-color-primary);
      }

      .progress-status.pending {
        color: var(--app-color-danger, #d32f2f);
      }

      .progress-track {
        width: 100%;
        height: 10px;
        overflow: hidden;
        background: var(--md-sys-color-surface-container-high);
        border-radius: 999px;
      }

      .progress-fill {
        height: 100%;
        border-radius: inherit;
        transition: width 0.5s ease;
      }

      .progress-fill.fulfilled {
        background: linear-gradient(
          90deg,
          var(--md-sys-color-primary),
          color-mix(in srgb, var(--md-sys-color-primary) 72%, white)
        );
      }

      .progress-fill.pending {
        background: linear-gradient(
          90deg,
          var(--app-color-danger, #d32f2f),
          color-mix(in srgb, var(--app-color-danger, #d32f2f) 72%, white)
        );
      }

      .progress-meta {
        margin-top: 6px;
        font-size: 0.75rem;
        color: var(--md-sys-color-on-surface-variant);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .u23-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .u23-header .card-header {
        flex: 1;
      }

      .u23-mobile-list {
        display: none;
      }

      .u23-mobile-card {
        padding: 14px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        background: var(--md-sys-color-surface-container-low);
      }

      .u23-mobile-card + .u23-mobile-card {
        margin-top: 12px;
      }

      .u23-mobile-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
      }

      .u23-mobile-team {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 10px;
        font-weight: 700;
      }

      .u23-mobile-team img {
        width: 28px;
        height: 28px;
        flex: 0 0 auto;
        object-fit: contain;
      }

      .u23-mobile-rank {
        display: inline-grid;
        width: 24px;
        height: 24px;
        flex: 0 0 auto;
        place-items: center;
        border-radius: 50%;
        background: var(--md-sys-color-surface-container-high);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.78rem;
        font-weight: 800;
      }

      .u23-mobile-metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 14px;
      }

      .u23-mobile-metric {
        padding: 9px 10px;
        border-radius: 8px;
        background: var(--md-sys-color-surface);
      }

      .u23-mobile-metric-label {
        display: block;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.68rem;
        font-weight: 700;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }

      .u23-mobile-metric-value {
        display: block;
        margin-top: 2px;
        color: var(--md-sys-color-on-surface);
        font-size: 1.05rem;
        font-weight: 800;
        font-variant-numeric: tabular-nums;
      }

      .callup-form {
        display: grid;
        gap: 16px;
        min-width: min(100%, 440px);
      }

      .mfm-player-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
        min-width: min(100%, 440px);
      }

      .mfm-player-form .full-width {
        grid-column: 1 / -1;
      }

      .form-error {
        margin: 0;
        color: var(--app-color-danger, #d32f2f);
        font-size: 0.85rem;
        font-weight: 600;
      }

      .image-input-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .image-paste-zone {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 152px;
        padding: 20px;
        border: 2px dashed var(--md-sys-color-outline-variant);
        border-radius: 12px;
        color: var(--md-sys-color-on-surface-variant);
        cursor: pointer;
        text-align: center;
      }

      .image-paste-zone:focus {
        border-color: var(--md-sys-color-primary);
        box-shadow: 0 0 0 3px rgba(0, 103, 192, 0.12);
        outline: none;
      }

      .image-paste-zone.has-image {
        padding: 8px;
        border-style: solid;
      }

      .image-preview {
        max-width: 100%;
        max-height: 220px;
        border-radius: 8px;
        object-fit: contain;
      }

      .image-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .image-help,
      .image-error {
        margin: 0;
        font-size: 0.85rem;
      }

      .image-help {
        color: var(--md-sys-color-on-surface-variant);
      }

      .image-error {
        color: var(--md-sys-color-error);
      }

      .callup-note {
        margin: 0;
        padding: 12px;
        border-left: 3px solid var(--md-sys-color-primary);
        border-radius: 0 10px 10px 0;
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.9rem;
        line-height: 1.45;
      }

      .callup-preview {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
      }

      .callup-preview-item {
        padding: 10px;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 10px;
        background: var(--md-sys-color-surface-container-low);
      }

      .callup-preview-label {
        display: block;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.35px;
      }

      .callup-preview-value {
        display: block;
        margin-top: 3px;
        color: var(--md-sys-color-on-surface);
        font-size: 1.05rem;
        font-weight: 750;
      }

      .goal-analysis-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .goal-analysis-section + .goal-analysis-section {
        border-top: 1px solid var(--md-sys-color-outline-variant);
        padding-top: 20px;
      }

      .goal-analysis-title {
        margin: 0 0 14px;
        color: var(--md-sys-color-on-surface);
        font-size: 1rem;
      }

      .distribution-list {
        display: grid;
        gap: 10px;
      }

      .distribution-row {
        display: grid;
        grid-template-columns: minmax(96px, 132px) minmax(100px, 1fr) auto;
        gap: 12px;
        align-items: center;
      }

      .distribution-label {
        color: var(--md-sys-color-on-surface);
        font-size: 0.87rem;
        font-weight: 650;
      }

      .distribution-track {
        height: 20px;
        overflow: hidden;
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 6px;
        box-sizing: border-box;
        background: var(--md-sys-color-surface-container-high);
        background-image: repeating-linear-gradient(
          90deg,
          transparent 0,
          transparent calc(25% - 1px),
          rgba(0, 0, 0, 0.12) calc(25% - 1px),
          rgba(0, 0, 0, 0.12) 25%
        );
      }

      .distribution-fill {
        height: 100%;
        min-width: 0;
        border-radius: 4px;
        background: var(--md-sys-color-primary);
        background: linear-gradient(
          90deg,
          var(--md-sys-color-primary) 0%,
          #32b9ad 100%
        );
        box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.45);
        transition: width 0.4s ease;
      }

      .goal-analysis-section:nth-child(2) .distribution-fill {
        background: #c2410c;
        background: linear-gradient(
          90deg,
          #c2410c 0%,
          #f59e0b 100%
        );
      }

      .distribution-value {
        min-width: 58px;
        color: var(--md-sys-color-on-surface);
        font-size: 0.83rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }

      .extra-time-note {
        margin: 14px 0 0;
        padding: 10px 12px;
        border-left: 3px solid var(--md-sys-color-tertiary);
        border-radius: 0 8px 8px 0;
        background: var(--md-sys-color-surface-container-low);
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.84rem;
      }

      @media (min-width: 900px) {
        .goal-analysis-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .goal-analysis-section + .goal-analysis-section {
          border-top: 0;
          border-left: 1px solid var(--md-sys-color-outline-variant);
          padding-top: 0;
          padding-left: 24px;
        }
      }

      @media (max-width: 520px) {
        .distribution-row {
          grid-template-columns: minmax(82px, 1fr) auto;
          gap: 8px 10px;
        }

        .distribution-track {
          grid-column: 1 / -1;
          grid-row: 2;
        }

        .u23-header {
          display: block;
        }

        .u23-header md-outlined-button {
          width: 100%;
          margin-bottom: 16px;
        }

        .u23-desktop-table {
          display: none;
        }

        .u23-mobile-list {
          display: block;
        }

        .mfm-player-form {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ attribute: false })
  u23NationalTeamCallups: U23NationalTeamCallups = new Map();
  @property({ type: Boolean }) isAdmin = false;

  @state() private callupTeam = '';
  @state() private callupPlayerNumber = '';
  @state() private callupMissedMatches = 0;
  @state() private newMfmTeam = '';
  @state() private newMfmError = '';
  @state() private newMfmPastedImageBlob: Blob | null = null;
  @state() private newMfmPastedImagePreviewUrl = '';
  @state() private newMfmIsReadingClipboardImage = false;
  @state() private newMfmIsUploadingImage = false;
  @state() private newMfmImageError = '';

  @query('#dialogU23Callup') private dialogU23Callup!: MdDialog;
  @query('#dialogNewMfmPlayer') private dialogNewMfmPlayer!: MdDialog;
  @query('#callupMissedMatches')
  private callupMissedMatchesField!: MdFilledTextField;
  @query('#newMfmName') private newMfmNameField!: MdFilledTextField;
  @query('#newMfmFullName') private newMfmFullNameField!: MdFilledTextField;
  @query('#newMfmNumber') private newMfmNumberField!: MdFilledTextField;
  @query('#newMfmPosition') private newMfmPositionField!: MdFilledSelect;
  @query('#newMfmNationality')
  private newMfmNationalityField!: MdFilledTextField;
  @query('#newMfmBirthDate')
  private newMfmBirthDateField!: MdFilledTextField;

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._revokeNewMfmPreviewUrl();
  }

  private _renderDistributionRows(
    items: GoalDistributionStat[],
    total: number,
  ) {
    return items.map(item => {
      const percentage = total > 0 ? (item.count / total) * 100 : 0;
      return html`
        <div class="distribution-row">
          <span class="distribution-label">${item.label}</span>
          <div class="distribution-track" aria-hidden="true">
            <div class="distribution-fill" style="width: ${percentage}%;"></div>
          </div>
          <span class="distribution-value"
            >${item.count} · ${percentage.toFixed(0)}%</span
          >
        </div>
      `;
    });
  }

  override render() {
    const {
      teamStats,
      topScorers,
      topAssists,
      fairPlay,
      u23CallupPreviews,
      goalsByTimeRange,
      goalsByType,
      regularTimeGoals,
      extraTimeGoals,
      nationalities,
    } = this._buildStats();
    const teamStatsByU23 = [...teamStats].sort(
      (a, b) => b.u23countedMinutes - a.u23countedMinutes,
    );
    const maxU23CountedMinutes = Math.max(
      ...teamStatsByU23.map(t => t.u23countedMinutes),
      1,
    );
    const u23Rows = teamStatsByU23.map((team, index) => {
      const isFulfilled = team.u23countedMinutes >= REQUIRED_U23_MINUTES;
      const minutesToFulfill = Math.max(
        0,
        REQUIRED_U23_MINUTES - team.u23countedMinutes,
      );

      return {
        team,
        rank: index + 1,
        isFulfilled,
        minutesToFulfill,
        relativeProgress:
          (team.u23countedMinutes / maxU23CountedMinutes) * 100,
      };
    });

    return html`
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3><md-icon>sports_soccer</md-icon> Top Goleadores</h3>
            <div class="meta">Los 10 mejores romperedes</div>
          </div>
          <div class="table-wrapper">
            ${
              topScorers.length === 0
                ? html`<p class="meta">Sin goles registrados.</p>`
                : html`
                    <table class="modern-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Jugador</th>
                          <th>Equipo</th>
                          <th class="num-col">G</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${topScorers.map(
                          (p, i) => html`
                            <tr class="${i === 0 ? 'rank-1' : ''}">
                              <td>${i + 1}</td>
                              <td style="font-weight: bold;">${p.name}</td>
                              <td>
                                <div class="team-cell">
                                  ${getTeamImage(p.team)} ${p.team}
                                </div>
                              </td>
                              <td
                                class="num-col"
                                style="font-weight:bold; color: var(--md-sys-color-primary)"
                              >
                                ${p.goals}
                              </td>
                            </tr>
                          `,
                        )}
                      </tbody>
                    </table>
                  `
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>assist_walker</md-icon> Top Asistencias</h3>
            <div class="meta">Los 10 mejores pasadores</div>
          </div>
          <div class="table-wrapper">
            ${
              topAssists.length === 0
                ? html`<p class="meta">Sin asistencias registradas.</p>`
                : html`
                    <table class="modern-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Jugador</th>
                          <th>Equipo</th>
                          <th class="num-col">Ast</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${topAssists.map(
                          (p, i) => html`
                            <tr class="${i === 0 ? 'rank-1' : ''}">
                              <td>${i + 1}</td>
                              <td style="font-weight: bold;">${p.name}</td>
                              <td>
                                <div class="team-cell">
                                  ${getTeamImage(p.team)} ${p.team}
                                </div>
                              </td>
                              <td
                                class="num-col"
                                style="font-weight:bold; color: var(--md-sys-color-primary)"
                              >
                                ${p.assists}
                              </td>
                            </tr>
                          `,
                        )}
                      </tbody>
                    </table>
                  `
            }
          </div>
        </div>

        <div class="card full-width">
          <div class="card-header">
            <h3><md-icon>query_stats</md-icon> Análisis de Goles</h3>
            <div class="meta">
              Solo goles de partido; las tandas de penales no se incluyen.
            </div>
          </div>
          <div class="goal-analysis-grid">
            <section class="goal-analysis-section">
              <h4 class="goal-analysis-title">¿En qué minutos se anota?</h4>
              <div class="distribution-list">
                ${this._renderDistributionRows(
                  goalsByTimeRange,
                  regularTimeGoals,
                )}
              </div>
              ${
                regularTimeGoals === 0
                  ? html`<p class="meta">Sin goles de tiempo regular.</p>`
                  : null
              }
              ${
                extraTimeGoals > 0
                  ? html`
                      <p class="extra-time-note">
                        Tiempo extra: ${extraTimeGoals}
                        gol${extraTimeGoals === 1 ? '' : 'es'}. No se integra a
                        los rangos regulares.
                      </p>
                    `
                  : null
              }
            </section>
            <section class="goal-analysis-section">
              <h4 class="goal-analysis-title">¿Cómo se anotan?</h4>
              <div class="distribution-list">
                ${this._renderDistributionRows(
                  goalsByType,
                  goalsByType.reduce((total, item) => total + item.count, 0),
                )}
              </div>
              ${
                goalsByType.every(item => item.count === 0)
                  ? html`<p class="meta">Sin goles registrados.</p>`
                  : null
              }
            </section>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>public</md-icon> Nacionalidades</h3>
            <div class="meta">Jugadores registrados en los planteles</div>
          </div>
          <div class="table-wrapper">
            ${
              nationalities.length === 0
                ? html`<p class="meta">Sin jugadores registrados.</p>`
                : html`
                    <table class="modern-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Nacionalidad</th>
                          <th class="num-col">Jugadores</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${nationalities.map(
                          (nationality, index) => html`
                            <tr class=${index === 0 ? 'rank-1' : ''}>
                              <td>${index + 1}</td>
                              <td>${nationality.label}</td>
                              <td class="num-col">${nationality.count}</td>
                            </tr>
                          `,
                        )}
                      </tbody>
                    </table>
                  `
            }
          </div>
        </div>

        <div class="card full-width">
          <div class="u23-header">
            <div class="card-header">
              <h3><md-icon>boy</md-icon> Regla de Menores (Sub-23)</h3>
              <div class="meta">
                Minutos reales y acreditados para cumplir la norma
              </div>
            </div>
            ${
              this.isAdmin
                ? html`
                    <md-outlined-button @click=${this._openCallupDialog}>
                      <md-icon slot="icon">groups</md-icon>
                      Convocatorias
                    </md-outlined-button>
                  `
                : null
            }
          </div>
          <div class="table-wrapper">
            ${
              teamStats.length === 0
                ? html`<p class="meta">No hay datos.</p>`
                : html`
                    <div class="u23-desktop-table">
                      <table class="modern-table">
                        <thead>
                          <tr>
                            <th>Pos</th>
                            <th>Equipo</th>
                            <th class="num-col">Menores Alineados</th>
                            <th class="num-col">Reales</th>
                            <th class="num-col">Selección</th>
                            <th class="num-col">Acreditados</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${u23Rows.map(
                            ({
                              team,
                              rank,
                              isFulfilled,
                              minutesToFulfill,
                              relativeProgress,
                            }) => html`
                            <tr class="team-summary-row">
                              <td class="team-rank-cell" rowspan="2">
                                ${rank}
                              </td>
                              <td>
                                <div class="team-cell">
                                  ${getTeamImage(team.team)} ${team.team}
                                </div>
                              </td>
                              <td class="num-col">${team.u23PlayersCount}</td>
                              <td class="num-col">${team.u23totalMinutes}'</td>
                              <td class="num-col">${team.u23CallupMinutes}'</td>
                              <td class="num-col">${team.u23countedMinutes}'</td>
                            </tr>
                            <tr class="progress-row">
                              <td class="progress-cell" colspan="5">
                                <div class="progress-head">
                                  <span
                                    class="progress-status ${
                                      isFulfilled ? 'fulfilled' : 'pending'
                                    }"
                                  >
                                    ${isFulfilled ? 'Cumplido' : 'Pendiente'}
                                  </span>
                                </div>
                                <div class="progress-track">
                                  <div
                                    class="progress-fill ${
                                      isFulfilled ? 'fulfilled' : 'pending'
                                    }"
                                    style="width: ${relativeProgress}%;"
                                  ></div>
                                </div>
                                <div class="progress-meta">
                                  <span
                                    >${team.u23countedMinutes}' acreditados</span
                                  >
                                  <span
                                    style="color: ${
                                      isFulfilled
                                        ? 'var(--md-sys-color-primary)'
                                        : 'var(--app-color-danger, #D32F2F)'
                                    }; font-weight: 700;"
                                  >
                                    ${
                                      isFulfilled
                                        ? '✓ Meta cubierta'
                                        : `Faltan ${minutesToFulfill}'`
                                    }
                                  </span>
                                </div>
                              </td>
                            </tr>
                          `,
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div class="u23-mobile-list">
                      ${u23Rows.map(
                        ({
                          team,
                          rank,
                          isFulfilled,
                          minutesToFulfill,
                          relativeProgress,
                        }) => html`
                          <article class="u23-mobile-card">
                            <div class="u23-mobile-card-header">
                              <div class="u23-mobile-team">
                                <span class="u23-mobile-rank">${rank}</span>
                                ${getTeamImage(team.team)}
                                <span>${team.team}</span>
                              </div>
                              <span
                                class="progress-status ${
                                  isFulfilled ? 'fulfilled' : 'pending'
                                }"
                              >
                                ${isFulfilled ? 'Cumplido' : 'Pendiente'}
                              </span>
                            </div>
                            <div class="u23-mobile-metrics">
                              <div class="u23-mobile-metric">
                                <span class="u23-mobile-metric-label"
                                  >Menores</span
                                >
                                <span class="u23-mobile-metric-value"
                                  >${team.u23PlayersCount}</span
                                >
                              </div>
                              <div class="u23-mobile-metric">
                                <span class="u23-mobile-metric-label"
                                  >Reales</span
                                >
                                <span class="u23-mobile-metric-value"
                                  >${team.u23totalMinutes}'</span
                                >
                              </div>
                              <div class="u23-mobile-metric">
                                <span class="u23-mobile-metric-label"
                                  >Selección</span
                                >
                                <span class="u23-mobile-metric-value"
                                  >${team.u23CallupMinutes}'</span
                                >
                              </div>
                              <div class="u23-mobile-metric">
                                <span class="u23-mobile-metric-label"
                                  >Acreditados</span
                                >
                                <span class="u23-mobile-metric-value"
                                  >${team.u23countedMinutes}'</span
                                >
                              </div>
                            </div>
                            <div class="progress-track">
                              <div
                                class="progress-fill ${
                                  isFulfilled ? 'fulfilled' : 'pending'
                                }"
                                style="width: ${relativeProgress}%;"
                              ></div>
                            </div>
                            <div class="progress-meta">
                              <span>${team.u23countedMinutes}' acreditados</span>
                              <span
                                style="color: ${
                                  isFulfilled
                                    ? 'var(--md-sys-color-primary)'
                                    : 'var(--app-color-danger, #D32F2F)'
                                }; font-weight: 700;"
                              >
                                ${
                                  isFulfilled
                                    ? '✓ Meta cubierta'
                                    : `Faltan ${minutesToFulfill}'`
                                }
                              </span>
                            </div>
                          </article>
                        `,
                      )}
                    </div>
                  `
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>style</md-icon> Ranking Fair Play</h3>
            <div class="meta">Menos puntos es mejor (A=1, RI=3, RD=4)</div>
          </div>
          <div class="table-wrapper">
            ${
              fairPlay.length === 0
                ? html`<p class="meta">Sin tarjetas.</p>`
                : html`
                    <table class="modern-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Equipo</th>
                          <th class="num-col">Pts</th>
                          <th class="num-col" style="color:#B8860B">A</th>
                          <th class="num-col" style="color:#D32F2F">RI</th>
                          <th class="num-col" style="color:#D32F2F">RD</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${fairPlay.map(
                          (t, i) => html`
                            <tr class="${i === 0 ? 'rank-1' : ''}">
                              <td>${i + 1}</td>
                              <td>
                                <div class="team-cell">
                                  ${getTeamImage(t.team)} ${t.team}
                                </div>
                              </td>
                              <td class="num-col" style="font-weight:bold;">
                                ${t.fairPlayPoints}
                              </td>
                              <td class="num-col">${t.yellows}</td>
                              <td class="num-col">${t.indirectReds}</td>
                              <td class="num-col">${t.directReds}</td>
                            </tr>
                          `,
                        )}
                      </tbody>
                    </table>
                  `
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>bar_chart</md-icon> Ofensiva y Defensiva</h3>
            <div class="meta">Goles a favor y en contra</div>
          </div>
          <div class="table-wrapper">
            ${
              teamStats.length === 0
                ? html`<p class="meta">No hay datos.</p>`
                : html`
                    <table class="modern-table">
                      <thead>
                        <tr>
                          <th>Pos</th>
                          <th>Equipo</th>
                          <th class="num-col">GF</th>
                          <th class="num-col">GC</th>
                          <th class="num-col">Dif</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${teamStats.slice(0, 10).map(
                          (t, i) => html`
                            <tr>
                              <td>${i + 1}</td>
                              <td>
                                <div class="team-cell">
                                  ${getTeamImage(t.team)} ${t.team}
                                </div>
                              </td>
                              <td class="num-col">${t.goalsFor}</td>
                              <td class="num-col">${t.goalsAgainst}</td>
                              <td
                                class="num-col"
                                style="font-weight:bold; color:${
                                  t.goalsFor - t.goalsAgainst > 0
                                    ? 'var(--md-sys-color-primary)'
                                    : 'inherit'
                                }"
                              >
                                ${
                                  t.goalsFor - t.goalsAgainst > 0 ? '+' : ''
                                }${t.goalsFor - t.goalsAgainst}
                              </td>
                            </tr>
                          `,
                        )}
                      </tbody>
                    </table>
                  `
            }
          </div>
        </div>
      </div>
      ${this._renderCallupDialog(u23CallupPreviews)}
      ${this._renderNewMfmPlayerDialog()}
    `;
  }

  private _renderCallupDialog(previews: Map<string, U23CallupPreview>) {
    if (!this.isAdmin) return null;

    const teamPlayers = this._getCallupPlayersForTeam(previews);
    const selectedPreview = this._getSelectedCallupPreview(previews);
    const credit = selectedPreview
      ? this._calculateCallupCredit(
          selectedPreview.actualMinutes,
          selectedPreview.completedRegularMatches,
          this.callupMissedMatches,
        )
      : null;
    const baseMatches = selectedPreview
      ? selectedPreview.completedRegularMatches - this.callupMissedMatches
      : 0;

    return html`
      <md-dialog id="dialogU23Callup" type="modal">
        <div slot="headline">Convocatoria a selección</div>
        <div slot="content" class="callup-form">
          <p class="callup-note">
            Registra solo los partidos de fase regular no jugados por
            convocatoria. El crédito se activa cuando el jugador acumula al
            menos ${MINUTES_REQUIRED_FOR_CALLUP_CREDIT}' reales.
          </p>
          <md-outlined-button @click=${this._openNewMfmPlayerDialog}>
            <md-icon slot="icon">person_add</md-icon>
            Registrar jugador MFM
          </md-outlined-button>
          <md-filled-select label="Equipo" @change=${this._onCallupTeamChange}>
            ${this.teams.map(
              team => html`
                <md-select-option
                  value=${this._teamKey(team)}
                  ?selected=${this.callupTeam === this._teamKey(team)}
                >
                  <div slot="headline">${team}</div>
                </md-select-option>
              `,
            )}
          </md-filled-select>
          <md-filled-select
            label="Jugador MFM"
            ?disabled=${teamPlayers.length === 0}
            @change=${this._onCallupPlayerChange}
          >
            ${teamPlayers.map(
              preview => html`
                <md-select-option
                  value=${preview.player.number}
                  ?selected=${
                    this.callupPlayerNumber === String(preview.player.number)
                  }
                >
                  <div slot="headline">
                    ${preview.player.number} - ${preview.player.name}
                  </div>
                </md-select-option>
              `,
            )}
          </md-filled-select>
          <md-filled-text-field
            id="callupMissedMatches"
            label="Partidos no jugados por convocatoria"
            type="number"
            min="0"
            max="16"
            step="1"
            ?disabled=${!selectedPreview}
            value=${String(this.callupMissedMatches)}
            @input=${this._onCallupMissedMatchesInput}
          ></md-filled-text-field>
          ${
            selectedPreview
              ? html`
                  <div class="callup-preview">
                    <div class="callup-preview-item">
                      <span class="callup-preview-label">Reales</span>
                      <span class="callup-preview-value"
                        >${selectedPreview.actualMinutes}'</span
                      >
                    </div>
                    <div class="callup-preview-item">
                      <span class="callup-preview-label">Base</span>
                      <span class="callup-preview-value"
                        >${baseMatches} PJ</span
                      >
                    </div>
                    <div class="callup-preview-item">
                      <span class="callup-preview-label">Crédito</span>
                      <span class="callup-preview-value"
                        >${credit === null ? 'Pendiente' : `${credit}'`}</span
                      >
                    </div>
                  </div>
                  <p class="meta">
                    ${
                      selectedPreview.actualMinutes <
                      MINUTES_REQUIRED_FOR_CALLUP_CREDIT
                        ? `Aún requiere ${MINUTES_REQUIRED_FOR_CALLUP_CREDIT - selectedPreview.actualMinutes}' reales para activar el crédito.`
                        : baseMatches <= 0
                          ? 'Debe existir al menos un partido regular base para calcular el promedio.'
                          : `Promedio: ${Math.round(selectedPreview.actualMinutes / baseMatches)}' × ${this.callupMissedMatches} partidos.`
                    }
                  </p>
                `
              : html`<p class="meta">
                  Este equipo no tiene jugadores MFM registrados.
                </p>`
          }
        </div>
        <div slot="actions">
          <md-outlined-button @click=${this._closeCallupDialog}
            >Cancelar</md-outlined-button
          >
          <md-filled-button
            ?disabled=${!selectedPreview}
            @click=${this._saveCallup}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  private _renderNewMfmPlayerDialog() {
    if (!this.isAdmin) return null;

    return html`
      <md-dialog id="dialogNewMfmPlayer" type="modal">
        <div slot="headline">Registrar jugador MFM</div>
        <div slot="content" class="mfm-player-form">
          <p class="callup-note full-width">
            El jugador queda disponible en la plantilla del primer equipo, pero
            no se agrega a ninguna alineación ni suma minutos hasta que
            participe en un partido.
          </p>
          <md-filled-select
            label="Equipo"
            class="full-width"
            @change=${this._onNewMfmTeamChange}
          >
            ${this.teams.map(
              team => html`
                <md-select-option
                  value=${this._teamKey(team)}
                  ?selected=${this.newMfmTeam === this._teamKey(team)}
                >
                  <div slot="headline">${team}</div>
                </md-select-option>
              `,
            )}
          </md-filled-select>
          <md-filled-text-field
            id="newMfmName"
            label="Nombre corto"
            required
          ></md-filled-text-field>
          <md-filled-text-field
            id="newMfmFullName"
            class="full-width"
            label="Nombre completo (opcional)"
          ></md-filled-text-field>
          <md-filled-text-field
            id="newMfmNumber"
            label="Número de jersey"
            type="number"
            min="0"
            step="1"
            required
          ></md-filled-text-field>
          <md-filled-select id="newMfmPosition" label="Posición" required>
            <md-select-option value="Portero"
              ><div slot="headline">Portero</div></md-select-option
            >
            <md-select-option value="Defensa"
              ><div slot="headline">Defensa</div></md-select-option
            >
            <md-select-option value="Medio"
              ><div slot="headline">Medio</div></md-select-option
            >
            <md-select-option value="Delantero"
              ><div slot="headline">Delantero</div></md-select-option
            >
          </md-filled-select>
          <md-filled-text-field
            id="newMfmNationality"
            label="Nacionalidad"
            value="Mexicano"
            required
          ></md-filled-text-field>
          <md-filled-text-field
            id="newMfmBirthDate"
            label="Nacimiento"
            type="date"
            required
          ></md-filled-text-field>
          <div class="image-input-section full-width">
            <div
              class="image-paste-zone ${
                this.newMfmPastedImagePreviewUrl ? 'has-image' : ''
              }"
              tabindex="0"
              role="button"
              @paste=${this._handleNewMfmImagePaste}
              title="Haz click aquí y pega una imagen con Ctrl+V o Cmd+V"
            >
              ${
                this.newMfmPastedImagePreviewUrl
                  ? html`<img
                      class="image-preview"
                      src="${this.newMfmPastedImagePreviewUrl}"
                      alt="Vista previa de la foto del jugador"
                    />`
                  : html`<div>
                      <md-icon>content_paste</md-icon>
                      <p>Pega aquí la foto del jugador (opcional)</p>
                      <p class="image-help">
                        En escritorio usa Ctrl+V o Cmd+V. En móvil usa el botón
                        Leer portapapeles.
                      </p>
                    </div>`
              }
            </div>
            <div class="image-actions">
              <p
                class="${this.newMfmImageError ? 'image-error' : 'image-help'}"
              >
                ${
                  this.newMfmImageError ||
                  'La imagen se convertirá a JPEG y se subirá al registrar.'
                }
              </p>
              ${
                this.newMfmPastedImagePreviewUrl
                  ? html`
                      <md-outlined-button
                        @click=${this._clearNewMfmPastedImage}
                        ?disabled=${this.newMfmIsUploadingImage}
                      >
                        Quitar imagen
                      </md-outlined-button>
                    `
                  : null
              }
              <md-outlined-button
                @click=${this._readNewMfmImageFromClipboard}
                ?disabled=${
                  this.newMfmIsReadingClipboardImage ||
                  this.newMfmIsUploadingImage
                }
              >
                <md-icon slot="icon">content_paste_go</md-icon>
                ${
                  this.newMfmIsReadingClipboardImage
                    ? 'Leyendo...'
                    : 'Leer portapapeles'
                }
              </md-outlined-button>
            </div>
          </div>
          ${
            this.newMfmError
              ? html`<p class="form-error full-width" role="alert">
                  ${this.newMfmError}
                </p>`
              : null
          }
        </div>
        <div slot="actions">
          <md-outlined-button
            @click=${this._closeNewMfmPlayerDialog}
            ?disabled=${this.newMfmIsUploadingImage}
            >Cancelar</md-outlined-button
          >
          <md-filled-button
            @click=${this._saveNewMfmPlayer}
            ?disabled=${this.newMfmIsUploadingImage}
            >Registrar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  private _openNewMfmPlayerDialog() {
    this.newMfmTeam = this.callupTeam || this._teamKey(this.teams[0] || '');
    this.newMfmError = '';
    this.newMfmImageError = '';
    this.newMfmIsReadingClipboardImage = false;
    this.newMfmIsUploadingImage = false;
    this._resetNewMfmPlayerForm();
    this.dialogU23Callup?.close();
    void this.updateComplete.then(() => this.dialogNewMfmPlayer?.show());
  }

  private _closeNewMfmPlayerDialog() {
    if (this.newMfmIsUploadingImage) return;
    this.dialogNewMfmPlayer?.close();
    this._clearNewMfmPastedImage();
    void this.updateComplete.then(() => this.dialogU23Callup?.show());
  }

  private _resetNewMfmPlayerForm() {
    if (this.newMfmNameField) this.newMfmNameField.value = '';
    if (this.newMfmFullNameField) this.newMfmFullNameField.value = '';
    if (this.newMfmNumberField) this.newMfmNumberField.value = '';
    if (this.newMfmPositionField) this.newMfmPositionField.value = '';
    if (this.newMfmNationalityField) {
      this.newMfmNationalityField.value = 'Mexicano';
    }
    if (this.newMfmBirthDateField) this.newMfmBirthDateField.value = '';
    this._clearNewMfmPastedImage();
  }

  private _onNewMfmTeamChange(event: Event) {
    this.newMfmTeam = (event.target as MdFilledSelect).value;
  }

  private async _saveNewMfmPlayer() {
    if (!this.isAdmin) return;

    const name = this.newMfmNameField?.value.trim();
    const fullName = this.newMfmFullNameField?.value.trim() || '';
    const numberInput = this.newMfmNumberField?.value.trim() || '';
    const number = Number(numberInput);
    const position = this.newMfmPositionField?.value.trim();
    const nationality = this.newMfmNationalityField?.value.trim();
    const birthDateInput = this.newMfmBirthDateField?.value || '';
    const birthYear = Number(birthDateInput.split('-')[0]);

    if (
      !this.newMfmTeam ||
      !this.teams.some(team => this._teamKey(team) === this.newMfmTeam)
    ) {
      this.newMfmError = 'Selecciona un equipo válido.';
      return;
    }
    if (!name || !position) {
      this.newMfmError = 'Nombre corto y posición son obligatorios.';
      return;
    }
    if (!numberInput || !Number.isInteger(number) || number < 0) {
      this.newMfmError = 'Captura un número de jersey válido.';
      return;
    }
    if (nationality.toLowerCase() !== 'mexicano') {
      this.newMfmError =
        'Solo se pueden registrar jugadores de nacionalidad mexicana.';
      return;
    }
    if (!birthDateInput || birthYear < U23_MIN_BIRTH_YEAR) {
      this.newMfmError = `El jugador debe haber nacido en ${U23_MIN_BIRTH_YEAR} o después.`;
      return;
    }

    const currentPlayers = this.players.get(this.newMfmTeam) || [];
    if (currentPlayers.some(player => player.number === number)) {
      this.newMfmError = 'Ese número ya está registrado en este equipo.';
      return;
    }

    let imgSrc = '';
    if (this.newMfmPastedImageBlob) {
      this.newMfmIsUploadingImage = true;
      this.newMfmImageError = '';

      try {
        imgSrc = await uploadPlayerImage(
          this.newMfmPastedImageBlob,
          this.newMfmTeam,
          number,
        );
      } catch (error) {
        console.error('Error uploading MFM player image:', error);
        this.newMfmImageError =
          'No fue posible subir la imagen. Revisa las reglas de Storage e inténtalo de nuevo.';
        this.newMfmIsUploadingImage = false;
        return;
      }
    }

    const [year, month, day] = birthDateInput.split('-');
    const newPlayer: Player = {
      name,
      number,
      position,
      nationality: 'Mexicano',
      birthDate: `${day}/${month}/${year}`,
      fullName,
      imgSrc,
    };
    const updatedPlayers = [...currentPlayers, newPlayer].sort(
      (a, b) => a.number - b.number,
    );
    const updatedPlayersByTeam = new Map(this.players);
    updatedPlayersByTeam.set(this.newMfmTeam, updatedPlayers);
    this.players = updatedPlayersByTeam;
    this.dispatchEvent(
      dispatchEventMatchUpdated({
        [`/players/${this.newMfmTeam}`]: updatedPlayers,
      }),
    );

    this.callupTeam = this.newMfmTeam;
    this.callupPlayerNumber = String(number);
    this.callupMissedMatches = 0;
    this.newMfmError = '';
    this.newMfmIsUploadingImage = false;
    this.dialogNewMfmPlayer?.close();
    this._clearNewMfmPastedImage();
    void this.updateComplete.then(() => this.dialogU23Callup?.show());
  }

  private _handleNewMfmImagePaste(event: ClipboardEvent) {
    const imageFile = event.clipboardData?.items
      ? Array.from(event.clipboardData.items).find(item =>
          item.type.startsWith('image/'),
        )
      : null;

    if (!imageFile) {
      this.newMfmImageError = 'El portapapeles no contiene una imagen.';
      return;
    }

    const blob = imageFile.getAsFile();
    if (!blob) {
      this.newMfmImageError = 'No fue posible leer la imagen pegada.';
      return;
    }

    event.preventDefault();
    this.newMfmImageError = '';
    this._setNewMfmPastedImage(blob);
  }

  private async _readNewMfmImageFromClipboard() {
    this.newMfmIsReadingClipboardImage = true;
    this.newMfmImageError = '';

    try {
      const blob = await readImageFromClipboard();
      this._setNewMfmPastedImage(blob);
    } catch (error) {
      this.newMfmImageError =
        error instanceof Error
          ? error.message
          : 'No fue posible leer la imagen del portapapeles.';
    } finally {
      this.newMfmIsReadingClipboardImage = false;
    }
  }

  private _setNewMfmPastedImage(blob: Blob) {
    this._revokeNewMfmPreviewUrl();
    this.newMfmPastedImageBlob = blob;
    this.newMfmPastedImagePreviewUrl = URL.createObjectURL(blob);
  }

  private _clearNewMfmPastedImage = () => {
    this._revokeNewMfmPreviewUrl();
    this.newMfmPastedImageBlob = null;
  };

  private _revokeNewMfmPreviewUrl() {
    if (!this.newMfmPastedImagePreviewUrl) return;

    URL.revokeObjectURL(this.newMfmPastedImagePreviewUrl);
    this.newMfmPastedImagePreviewUrl = '';
  }

  private _openCallupDialog() {
    const previews = this._buildStats().u23CallupPreviews;
    const firstPreview = Array.from(previews.values())[0];

    if (firstPreview) {
      this.callupTeam = firstPreview.teamKey;
      this.callupPlayerNumber = String(firstPreview.player.number);
      this.callupMissedMatches = firstPreview.missedMatches;
    } else {
      this.callupTeam = '';
      this.callupPlayerNumber = '';
      this.callupMissedMatches = 0;
    }

    this.updateComplete.then(() => this.dialogU23Callup?.show());
  }

  private _closeCallupDialog() {
    this.dialogU23Callup?.close();
  }

  private _onCallupTeamChange(event: Event) {
    this.callupTeam = (event.target as MdFilledSelect).value;
    const previews = this._buildStats().u23CallupPreviews;
    const firstPlayer = this._getCallupPlayersForTeam(previews)[0];
    this.callupPlayerNumber = firstPlayer
      ? String(firstPlayer.player.number)
      : '';
    this.callupMissedMatches = firstPlayer?.missedMatches ?? 0;
  }

  private _onCallupPlayerChange(event: Event) {
    this.callupPlayerNumber = (event.target as MdFilledSelect).value;
    const selectedPreview = this._getSelectedCallupPreview(
      this._buildStats().u23CallupPreviews,
    );
    this.callupMissedMatches = selectedPreview?.missedMatches ?? 0;
  }

  private _onCallupMissedMatchesInput(event: Event) {
    const value = Number((event.target as MdFilledTextField).value);
    this.callupMissedMatches = Number.isFinite(value) ? value : 0;
  }

  private _saveCallup() {
    if (!this.isAdmin || !this.callupTeam || !this.callupPlayerNumber) return;

    const missedMatches = this.callupMissedMatches;
    if (
      !Number.isInteger(missedMatches) ||
      missedMatches < 0 ||
      missedMatches > 16
    ) {
      this.callupMissedMatchesField.setCustomValidity(
        'Captura un número entero entre 0 y 16.',
      );
      this.callupMissedMatchesField.reportValidity();
      return;
    }

    this.callupMissedMatchesField.setCustomValidity('');
    this.dispatchEvent(
      dispatchEventMatchUpdated({
        [`/u23NationalTeamCallups/${this.callupTeam}/${this.callupPlayerNumber}`]:
          missedMatches === 0 ? null : missedMatches,
      }),
    );
    this._closeCallupDialog();
  }

  private _getCallupPlayersForTeam(
    previews: Map<string, U23CallupPreview>,
  ): U23CallupPreview[] {
    return Array.from(previews.values())
      .filter(preview => preview.teamKey === this.callupTeam)
      .sort((a, b) => a.player.number - b.player.number);
  }

  private _getSelectedCallupPreview(
    previews: Map<string, U23CallupPreview>,
  ): U23CallupPreview | undefined {
    if (!this.callupTeam || !this.callupPlayerNumber) return undefined;
    return previews.get(
      this._callupPreviewKey(this.callupTeam, Number(this.callupPlayerNumber)),
    );
  }

  private _calculateCallupCredit(
    actualMinutes: number,
    completedRegularMatches: number,
    missedMatches: number,
  ): number | null {
    const baseMatches = completedRegularMatches - missedMatches;
    if (
      actualMinutes < MINUTES_REQUIRED_FOR_CALLUP_CREDIT ||
      baseMatches <= 0 ||
      !Number.isInteger(missedMatches) ||
      missedMatches < 0 ||
      missedMatches > 16
    ) {
      return null;
    }

    return Math.round(actualMinutes / baseMatches) * missedMatches;
  }

  private _callupPreviewKey(teamKey: string, playerNumber: number): string {
    return `${teamKey}-${playerNumber}`;
  }

  private _buildStats() {
    const playerStats = new Map<string, PlayerStats>();
    const teamStats = new Map<string, TeamStats>();
    const u23PlayersTeam = new Map<string, Set<number>>();
    const u23PlayerMinutes = new Map<string, number>();
    const goalsByTimeRange: GoalDistributionStat[] = [
      { label: '0–15', count: 0 },
      { label: '16–30', count: 0 },
      { label: '31–45+', count: 0 },
      { label: '46–60', count: 0 },
      { label: '61–75', count: 0 },
      { label: '76–90+', count: 0 },
    ];
    const goalsByType: GoalDistributionStat[] = [
      { label: GOAL_TYPE_LABELS.penal, count: 0 },
      { label: GOAL_TYPE_LABELS.area, count: 0 },
      { label: GOAL_TYPE_LABELS.fueraArea, count: 0 },
      { label: GOAL_TYPE_LABELS.tiroLibre, count: 0 },
      { label: GOAL_TYPE_LABELS.cabeza, count: 0 },
      { label: GOAL_TYPE_LABELS.otro, count: 0 },
      { label: 'Autogol', count: 0 },
      { label: 'Sin tipo registrado', count: 0 },
    ];
    const nationalityStats = new Map<string, NationalityStat>();
    let regularTimeGoals = 0;
    let extraTimeGoals = 0;

    const addGoalAnalysis = (
      goal: ReturnType<typeof getGoalEvents>[number],
    ) => {
      if (goal.period === 'PEN') return;

      const typeLabel = goal.ownGoal
        ? 'Autogol'
        : goal.goalType
          ? GOAL_TYPE_LABELS[goal.goalType]
          : 'Sin tipo registrado';
      const typeEntry = goalsByType.find(item => item.label === typeLabel);
      if (typeEntry) typeEntry.count += 1;

      if (goal.period === '1TE' || goal.period === '2TE' || goal.minute > 90) {
        extraTimeGoals += 1;
        return;
      }

      regularTimeGoals += 1;
      const timeRangeIndex =
        goal.minute <= 15
          ? 0
          : goal.minute <= 30
            ? 1
            : goal.minute <= 45
              ? 2
              : goal.minute <= 60
                ? 3
                : goal.minute <= 75
                  ? 4
                  : 5;
      goalsByTimeRange[timeRangeIndex].count += 1;
    };

    this.players.forEach(playerList => {
      playerList.forEach(player => {
        const normalized = (player.nationality || '')
          .trim()
          .replace(/\s+/g, ' ');
        const label = normalized || 'Sin nacionalidad capturada';
        const key = label.toLocaleLowerCase();
        const stat = nationalityStats.get(key);
        if (stat) stat.count += 1;
        else nationalityStats.set(key, { label, count: 1 });
      });
    });

    const ensureTeam = (teamName: string) => {
      if (!teamStats.has(teamName)) {
        teamStats.set(teamName, {
          team: teamName,
          goalsFor: 0,
          goalsAgainst: 0,
          yellows: 0,
          indirectReds: 0,
          directReds: 0,
          fairPlayPoints: 0,
          u23PlayersCount: 0,
          u23totalMinutes: 0,
          u23CallupMinutes: 0,
          u23countedMinutes: 0,
        });
      }
      return teamStats.get(teamName)!;
    };

    const u23PlayersSet = (teamName: string) => {
      if (!u23PlayersTeam.has(teamName)) {
        u23PlayersTeam.set(teamName, new Set<number>());
      }
      return u23PlayersTeam.get(teamName)!;
    };

    this.teams.forEach(ensureTeam);

    const ensurePlayer = (
      teamName: string,
      number: number,
      playerList: Player[],
    ) => {
      const key = `${teamName}-${number}`;
      if (!playerStats.has(key)) {
        const name =
          playerList.find(p => p.number === number)?.name || `#${number}`;
        playerStats.set(key, {
          key,
          name,
          team: teamName,
          goals: 0,
          assists: 0,
          yellows: 0,
          reds: 0,
          minutes: 0,
        });
      }
      return playerStats.get(key)!;
    };

    const addLineupMinutes = (
      match: Match,
      lineup: PlayerGame[],
      teamName: string,
      teamTag: TeamSide,
      playerList: Player[],
    ) => {
      lineup.forEach(player => {
        const stat = ensurePlayer(teamName, player.number, playerList);
        const inMinute = player.entroDeCambio
          ? (getSubstitutionEvents(match.events)?.find(
              s => s.playerIn === player.number && s.team === teamTag,
            )?.minute ?? 0)
          : 0;
        let outMinute = 90;
        if (player.salioDeCambio) {
          outMinute =
            getSubstitutionEvents(match.events)?.find(
              s => s.playerOut === player.number && s.team === teamTag,
            )?.minute ?? 90;
        } else if (
          getCardEvents(match.events)?.some(
            c =>
              c.player === player.number &&
              c.team === teamTag &&
              c.cardType === 'red',
          )
        ) {
          outMinute =
            getCardEvents(match.events)?.find(
              c =>
                c.player === player.number &&
                c.team === teamTag &&
                c.cardType === 'red',
            )?.minute ?? 90;
        }
        stat.minutes += outMinute - inMinute;
      });
    };

    const calculateU23Minutes = (
      match: Match,
      lineup: PlayerGame[],
      teamName: string,
      teamTag: TeamSide,
      playerList: Player[],
    ) => {
      const u23Players = playerList.filter(isU23MexicanPlayer);
      const teamStat = ensureTeam(teamName);
      let minutesByU23 = 0;
      lineup.forEach(playerGame => {
        if (u23Players.some(p => p.number === playerGame.number)) {
          u23PlayersSet(teamName).add(playerGame.number);
          const inMinute = playerGame.entroDeCambio
            ? (getSubstitutionEvents(match.events)?.find(
                s => s.playerIn === playerGame.number && s.team === teamTag,
              )?.minute ?? 0)
            : 0;
          let outMinute = 90;
          if (playerGame.salioDeCambio) {
            outMinute =
              getSubstitutionEvents(match.events)?.find(
                s => s.playerOut === playerGame.number && s.team === teamTag,
              )?.minute ?? 90;
          } else if (
            getCardEvents(match.events)?.some(
              c =>
                c.player === playerGame.number &&
                c.team === teamTag &&
                c.cardType === 'red',
            )
          ) {
            outMinute =
              getCardEvents(match.events)?.find(
                c =>
                  c.player === playerGame.number &&
                  c.team === teamTag &&
                  c.cardType === 'red',
              )?.minute ?? 90;
          }
          const minutesPlayed = outMinute - inMinute;
          teamStat.u23totalMinutes += minutesPlayed;
          minutesByU23 += minutesPlayed;
          const playerKey = this._callupPreviewKey(
            this._teamKey(teamName),
            playerGame.number,
          );
          u23PlayerMinutes.set(
            playerKey,
            (u23PlayerMinutes.get(playerKey) ?? 0) + minutesPlayed,
          );
        }
      });
      // Máximo 225 minutos contables por partido
      teamStat.u23countedMinutes += Math.min(minutesByU23, 225);
      teamStat.u23PlayersCount = u23PlayersSet(teamName).size;
    };

    this.matchesList.forEach(match => {
      const localKey = this._teamKey(match.local);
      const visitorKey = this._teamKey(match.visitante);
      const localPlayers = this.players.get(localKey) || [];
      const visitorPlayers = this.players.get(visitorKey) || [];

      getGoalEvents(match.events).forEach(addGoalAnalysis);

      // Goals and assists
      getGoalEvents(match.events)?.forEach(goal => {
        const creditedTeam =
          goal.team === 'local' ? match.local : match.visitante;
        const opponent = goal.team === 'local' ? match.visitante : match.local;
        const scoringPlayers =
          goal.team === 'local' ? localPlayers : visitorPlayers;
        // Solo contar al jugador si no es autogol
        if (!goal.ownGoal) {
          const stat = ensurePlayer(creditedTeam, goal.player, scoringPlayers);
          stat.goals += 1;
          if (goal.assist) {
            const assistStat = ensurePlayer(
              creditedTeam,
              goal.assist,
              scoringPlayers,
            );
            assistStat.assists += 1;
          }
        }
        ensureTeam(creditedTeam).goalsFor += 1;
        ensureTeam(opponent).goalsAgainst += 1;
      });

      // Cards
      getCardEvents(match.events)?.forEach(card => {
        const teamName = card.team === 'local' ? match.local : match.visitante;
        const teamPlayers =
          card.team === 'local' ? localPlayers : visitorPlayers;
        const stat = ensurePlayer(teamName, card.player, teamPlayers);
        if (card.cardType === 'yellow') {
          stat.yellows += 1;
          const teamStat = ensureTeam(teamName);
          teamStat.yellows += 1;
          teamStat.fairPlayPoints += 1;
        } else if (card.foulType === 'dobleAmarilla') {
          stat.reds += 1;
          const teamStat = ensureTeam(teamName);
          teamStat.indirectReds += 1;
          teamStat.fairPlayPoints += 3;
        } else {
          stat.reds += 1;
          const teamStat = ensureTeam(teamName);
          teamStat.directReds += 1;
          teamStat.fairPlayPoints += 4;
        }
      });

      // Minutes played
      if (hasMatchEnded(match)) {
        addLineupMinutes(
          match,
          match.lineupLocal || [],
          match.local,
          'local',
          localPlayers,
        );
        addLineupMinutes(
          match,
          match.lineupVisitor || [],
          match.visitante,
          'visitor',
          visitorPlayers,
        );
      }
      // Los minutos para la Regla de Menores se cuentan solo en fase regular.
      if (
        hasMatchEnded(match) &&
        match.jornada <= REGULAR_SEASON_LAST_JORNADA
      ) {
        calculateU23Minutes(
          match,
          match.lineupLocal || [],
          match.local,
          'local',
          localPlayers,
        );
        calculateU23Minutes(
          match,
          match.lineupVisitor || [],
          match.visitante,
          'visitor',
          visitorPlayers,
        );
      }
    });

    const u23CallupPreviews = new Map<string, U23CallupPreview>();
    this.teams.forEach(team => {
      const teamKey = this._teamKey(team);
      const completedRegularMatches = this.matchesList.filter(
        match =>
          match.jornada <= REGULAR_SEASON_LAST_JORNADA &&
          hasMatchEnded(match) &&
          (match.local === team || match.visitante === team),
      ).length;
      const teamCallups = this.u23NationalTeamCallups.get(teamKey) ?? {};

      (this.players.get(teamKey) ?? [])
        .filter(isU23MexicanPlayer)
        .forEach(player => {
          const previewKey = this._callupPreviewKey(teamKey, player.number);
          const configuredMissedMatches = Number(
            teamCallups[String(player.number)] ?? 0,
          );
          const missedMatches = Number.isInteger(configuredMissedMatches)
            ? Math.max(0, configuredMissedMatches)
            : 0;
          const preview: U23CallupPreview = {
            team,
            teamKey,
            player,
            actualMinutes: u23PlayerMinutes.get(previewKey) ?? 0,
            completedRegularMatches,
            missedMatches,
          };
          u23CallupPreviews.set(previewKey, preview);

          const credit = this._calculateCallupCredit(
            preview.actualMinutes,
            preview.completedRegularMatches,
            preview.missedMatches,
          );
          if (credit !== null) {
            const teamStat = ensureTeam(team);
            teamStat.u23CallupMinutes += credit;
            // Los créditos de convocatoria no están sujetos al tope de 225'.
            teamStat.u23countedMinutes += credit;
          }
        });
    });

    const playerArray = Array.from(playerStats.values()).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.minutes !== b.minutes) return a.minutes - b.minutes;
      return a.name.localeCompare(b.name);
    });
    const teamArray = Array.from(teamStats.values()).sort((a, b) => {
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.goalsAgainst !== a.goalsAgainst)
        return a.goalsAgainst - b.goalsAgainst;
      return a.team.localeCompare(b.team);
    });
    const topScorers = playerArray.filter(p => p.goals > 0).slice(0, 10);
    const topAssists = playerArray
      .filter(p => p.assists > 0)
      .sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.goals - a.goals;
      })
      .slice(0, 10);
    const fairPlay = [...teamArray]
      .sort((a, b) => {
        if (a.fairPlayPoints !== b.fairPlayPoints) {
          return a.fairPlayPoints - b.fairPlayPoints;
        }
        return a.team.localeCompare(b.team);
      })
      .slice(0, 10);
    const nationalities = Array.from(nationalityStats.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label);
    });

    return {
      playerStats: playerArray,
      teamStats: teamArray,
      topScorers,
      topAssists,
      fairPlay,
      u23CallupPreviews,
      goalsByTimeRange,
      goalsByType,
      regularTimeGoals,
      extraTimeGoals,
      nationalities,
    };
  }

  private _teamKey(name: string) {
    return name.replaceAll('.', '');
  }
}
