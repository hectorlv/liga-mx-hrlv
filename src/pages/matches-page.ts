import '@material/web/icon/icon.js';
import '@material/web/select/select-option.js';
import '@material/web/textfield/filled-text-field.js';
import '@material/web/chips/chip-set.js';
import '@material/web/chips/filter-chip.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';

import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
import { MdSwitch } from '@material/web/switch/switch.js';
import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { JORNADA_LIGUILLA, LIGUILLA } from '../utils/constants.js';
import { formatDateDDMMYYYY } from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import {
  getAggregateScoreForSecondLeg,
  getPlayoffSeriesResult,
} from '../utils/functionUtils.js';
import {
  getLiveMatchPeriodLabel,
  hasMatchStarted,
  isMatchLive,
  lineupsReadyBeforeKickoff,
} from '../utils/matchStatus.js';

export interface MatchFilters {
  team?: string;
  jornada?: string;
  playoff?: boolean;
  today?: boolean;
}

/**
 * Page for show the fixture
 */
@customElement('matches-page')
export class MatchesPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
        width: 100%;
        max-width: max-content;
        margin: 0 auto;
        box-sizing: border-box;
        /* Tus variables globales ya deberían estar aplicadas en el index.html o componente padre */
        --card-bg: var(--md-sys-color-surface, #fff);
        --header-bg: var(--md-sys-color-surface-variant, #f0f0f0);
      }

      .empty-state {
        display:flex;
        flex:direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        text-align: center
        color: var(--md-sys-color-surface-variant);
        gap: 12px;
      }

      .empy-state md-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: var(--md-sys-color-outline-variant);
      }

      .empty-state h3 {
        margin: 0;
        font-size: 1.2rem;
        color: var(--md-sys-color-on-surface);
      }

      /* --- SECCIÓN DE FILTROS --- */
      .filters-container {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
        flex-wrap: wrap;
        align-items: center;
        background: var(--md-sys-color-surface);
        padding: 16px;
        border-radius: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .filter-item {
        flex: 1;
        min-width: 200px;
      }

      /* --- CONTENEDOR PRINCIPAL (GRID HÍBRIDO) --- */
      .matches-grid {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      /* ESTILOS MÓVIL (TARJETAS) */
      .match-card {
        background: var(--card-bg);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        display: grid;
        grid-template-areas:
          'jornada header header'
          'local score visit'
          'actions actions actions';
        grid-template-columns: 1fr auto 1fr;
        gap: 12px;
        color: inherit;
        cursor: pointer;
        text-decoration: none;
        border: 1px solid transparent;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }

      .match-card:active {
        transform: scale(0.98);
      }

      /* Asignación de áreas en MÓVIL */
      .cell-jornada {
        grid-area: jornada;
      }
      .cell-jornada {
        grid-area: header;
      }
      .cell-local {
        grid-area: local;
      }
      .cell-score {
        grid-area: score;
      }
      .cell-visit {
        grid-area: visit;
      }
      .cell-stadium {
        display: none;
      } /* Ocultamos estadio detallado en móvil para limpiar */

      /* Estilos internos MÓVIL */

      .cell-date,
      .cell-jornada {
        background: var(--header-bg);
        padding: 8px 12px;
        font-size: 0.8rem;
        color: var(--md-sys-color-on-surface-variant);
        display: flex;
        justify-content: space-between;
      }

      .cell-jornada {
        position: relative;
      }

      .live-dot {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background-color: var(--app-color-danger, #f44336);
        box-shadow: 0 0 0 2px var(--card-bg);
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

      .team-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 8px;
      }
      .team-block img {
        width: 48px;
        height: 48px;
        margin-bottom: 4px;
      }
      .team-name {
        font-size: 0.85rem;
        font-weight: 600;
      }

      .cell-score {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        color: var(--md-sys-color-primary);
      }

      .match-score-primary {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1;
      }

      .aggregate-score {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
      }

      .status-chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 5px;
      }

      .status-chip {
        display: inline-flex;
        align-items: center;
        min-height: 20px;
        border-radius: 999px;
        padding: 2px 7px;
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        font-size: 0.65rem;
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

      /* Cabeceras de tabla (ocultas en móvil) */
      .table-headers {
        display: none;
      }

      /* --- ESTILOS ESCRITORIO (TABLA) --- */
      @media (min-width: 800px) {
        .matches-grid {
          display: grid;
          /* Columnas: Jornada | Fecha | Local | Score | Visitante | Estadio */
          grid-template-columns: 55px 170px minmax(0, 1fr) 96px minmax(
              0,
              1fr
            ) 185px;
          gap: 0;
          align-items: center;
          background: var(--card-bg);
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .table-headers {
          display: contents; /* Para que los headers sean hijos directos del grid */
        }

        .header-cell {
          background: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          padding: 16px;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 0.8rem;
        }

        .match-card {
          display: contents; /* ¡MAGIA! Desaparece el div contenedor */
        }

        /* Reasignación de celdas para TABLA */
        .cell-jornada,
        .cell-date,
        .cell-local,
        .cell-score,
        .cell-visit,
        .cell-stadium {
          grid-area: auto; /* Reseteamos áreas de móvil */
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          background: var(--card-bg);
          height: 64px; /* Altura fija para alineación perfecta */
        }

        /* Ubicación explícita en columnas (Col 1 a 6) */
        .cell-jornada {
          grid-column: 1;
          justify-content: center;
        }
        .cell-date {
          grid-column: 2;
          justify-content: flex-start;
          background: transparent;
        }
        .cell-local {
          grid-column: 3;
          flex-direction: row;
        }
        .cell-score {
          grid-column: 4;
          justify-content: center;
          background: var(--md-sys-color-surface-variant);
        }
        .cell-visit {
          grid-column: 5;
          flex-direction: row;
        }
        .cell-stadium {
          grid-column: 6;
          display: flex;
          color: var(--md-sys-color-on-surface-variant);
        }

        /* Ajustes visuales Desktop */
        .team-block img {
          width: 32px;
          height: 32px;
          margin: 0 12px;
        }
        .team-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        /* Hover en la fila "virtual" */
        .match-card:hover .cell-jornada,
        .match-card:hover .cell-date,
        .match-card:hover .cell-local,
        .match-card:hover .cell-score,
        .match-card:hover .cell-visit,
        .match-card:hover .cell-stadium {
          background-color: var(--row-hover);
          cursor: pointer;
        }
      }

      .champion-legend {
        max-width: 1100px;
        margin: var(--space-8) auto var(--space-16);
        padding: var(--space-12) var(--space-16);
        background: var(--md-sys-color-surface-container);
        border-radius: var(--radius-m);
        display: flex;
        align-items: center;
        gap: var(--space-8);
        font-weight: 600;
        justify-content: center;
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Array }) stadiums: string[] = [];
  @property({ type: Array }) players: PlayerTeam[] = [];
  @property({ type: Boolean }) isAdmin = false;
  @property({ attribute: false }) filters: MatchFilters = {};

  @state() matchesRender: Match[] = [];

  private readonly todayDate: Date = new Date();
  private todayDateSelected: boolean = false;
  private defaultTodayPending = false;

  private isMobile: boolean = window.innerWidth < 600;
  private openRowMenuId: number | null = null;

  private _boundOnResize: (() => void) | undefined;
  private _boundOnDocClick: (() => void) | undefined;

  private get championLegend(): string | null {
    const result = getPlayoffSeriesResult(
      LIGUILLA.final,
      this.matchesList,
      this.table,
    );

    if (!result?.winner) return null;

    const finalVuelta = this.matchesList.find(
      match => match.idMatch === LIGUILLA.final.vuelta.id,
    );
    if (!finalVuelta) return null;

    const aggregate = `${result.aggregate[finalVuelta.local]}-${result.aggregate[finalVuelta.visitante]}`;
    const penalties = result.penaltyScore
      ? `, penales ${result.penaltyScore.local}-${result.penaltyScore.visitante}`
      : '';
    return `🏆 Campeón: ${result.winner} (${aggregate} marcador global${penalties})`;
  }

  @query('.row-menu') rowMenu!: HTMLElement;
  @query('button, [role="menuitem"]') firstMenuItem!: HTMLElement;
  @query('#teamsSelect') teamsSelect!: MdFilledSelect;
  @query('#matchDaySelect') matchDaySelect!: MdFilledSelect;
  @query('#todayCheckbox') todayDateCheckbox!: MdSwitch;
  @queryAll('button, [role="menuitem"]')
  menuFocusableElements!: MdFilledButton[];
  @query('#onlyPlayOffSwitch') onlyPlayOffSwitch!: MdSwitch;

  override connectedCallback() {
    super.connectedCallback();
    this._boundOnResize = this._onResize.bind(this);
    window.addEventListener('resize', this._boundOnResize);
    this._boundOnDocClick = this._onDocumentClick.bind(this);
    globalThis.addEventListener('click', this._boundOnDocClick);
  }

  override disconnectedCallback() {
    if (this._boundOnResize) {
      window.removeEventListener('resize', this._boundOnResize);
    }
    if (this._boundOnDocClick) {
      globalThis.removeEventListener('click', this._boundOnDocClick);
    }
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this._onResize();
    this.defaultTodayPending =
      this.filters.today === undefined &&
      !this.filters.team &&
      !this.filters.jornada &&
      !this.filters.playoff;
    this._restoreFilters();
    this._applyDefaultTodayFilter();
  }

  /**
   *
   * @param changed
   */
  override updated(changed: PropertyValues) {
    if (
      changed.has('teams') &&
      this._hasRestoredFilters() &&
      this.teamsSelect
    ) {
      this._restoreFilters();
      return;
    }

    if (changed.has('matchesList')) {
      if (this.defaultTodayPending) {
        this._applyDefaultTodayFilter();
      } else {
        this._filtersChanged();
      }
    }
  }

  private _onDocumentClick() {
    if (this.openRowMenuId !== null) {
      this.openRowMenuId = null;
      this.requestUpdate();
    }
  }

  override render() {
    return html`
      <main>
        <div class="filters-container">
          <md-filled-select
            id="matchDaySelect"
            label="Jornada"
            aria-label="Seleccionar jornada"
            class="filter-item"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected>Todas</md-select-option>
            ${Array.from(
              { length: this.teams.length - 1 },
              (_, i) => i + 1,
            ).map(
              i => html`
                <md-select-option value="${i}"
                  ><div slot="headline">${i}</div></md-select-option
                >
              `,
            )}
            ${JORNADA_LIGUILLA.map(
              i => html`
                <md-select-option value="${i.id}"
                  ><div slot="headline">${i.descripcion}</div></md-select-option
                >
              `,
            )}
          </md-filled-select>
          <md-filled-select
            id="teamsSelect"
            label="Equipos"
            class="filter-item"
            aria-label="Seleccionar equipo"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${this.teams.map(
              (team, i) => html`
                <md-select-option value="${i}"
                  ><div slot="headline">${team}</div></md-select-option
                >
              `,
            )}
          </md-filled-select>
          <div class="today-row">
            <md-switch
              id="todayCheckbox"
              aria-label="Partidos de hoy"
              @change="${this.checkboxChanged}"
            ></md-switch>
            <span>Partidos de hoy</span>
          </div>
          <div class="today-row">
            <md-switch
              id="onlyPlayOffSwitch"
              aria-label="Solo partidos de Liguilla"
              @change="${this._filtersChanged}"
            ></md-switch>
            <span>Solo partidos de Liguilla</span>
          </div>
        </div>
        ${
          this.matchesRender.length === 0
            ? html`
                <div class="empty-state">
                  <md-icon>event_busy</md-icon>
                  <h3>No hay partidos hoy</h3>
                  <p>Intenta cambiar los filtros o selecciona otra jornada.</p>
                </div>
              `
            : html`
                <div class="matches-grid">
                  <div class="table-headers">
                    <div class="table-header">Jornada</div>
                    <div class="table-header">Fecha</div>
                    <div class="table-header" style="justify-content: flex-end">
                      Local
                    </div>
                    <div class="table-header" style="justify-content: center">
                      Marcador
                    </div>
                    <div class="table-header">Visitante</div>
                    <div class="table-header">Estadio</div>
                  </div>
                  ${this.matchesRender.map(match => this.renderMatchItem(match))}
                </div>
              `
        }
        ${
          this.championLegend
            ? html`<div class="champion-legend" role="note">
                ${this.championLegend}
              </div>`
            : ''
        }
      </main>
    `;
  }

  private renderMatchItem(match: Match) {
    const isLive = isMatchLive(match);
    const periodLabel = getLiveMatchPeriodLabel(match);
    const hasLineupsReady = lineupsReadyBeforeKickoff(match);
    const aggregateScore = getAggregateScoreForSecondLeg(
      match,
      this.matchesList,
    );

    return html`
      <a
        class="match-card"
        href=${this._matchHref(match)}
        aria-label="Abrir detalle de ${match.local} contra ${match.visitante}"
      >
        <div class="cell-jornada">
          <span>${match.jornada}</span>
          ${
            isLive
              ? html`<span class="live-dot" title="Partido en curso"></span>`
              : ''
          }
        </div>
        <div class="cell-date">
          <span
            >${formatDateDDMMYYYY(match.fecha as Date)} - ${match.hora}</span
          >
        </div>
        <div class="cell-local team-block">
          <span class="team-name">${match.local}</span>
          ${getTeamImage(match.local)}
        </div>
        <div class="cell-score">
          <div class="match-score-primary">
            ${
              hasMatchStarted(match)
                ? `${match.golLocal} - ${match.golVisitante}`
                : 'VS'
            }
          </div>
          ${
            isLive || periodLabel || hasLineupsReady
              ? html`
                  <div class="status-chips" aria-label="Estado del partido">
                    ${
                      isLive
                        ? html`<span class="status-chip live">En vivo</span>`
                        : ''
                    }
                    ${
                      periodLabel
                        ? html`<span class="status-chip live"
                            >${periodLabel}</span
                          >`
                        : ''
                    }
                    ${
                      hasLineupsReady
                        ? html`<span class="status-chip lineups"
                            >Alineaciones listas</span
                          >`
                        : ''
                    }
                  </div>
                `
              : ''
          }
          ${
            aggregateScore
              ? html`<div class="aggregate-score">
                  Global ${aggregateScore.local} - ${aggregateScore.visitante}
                </div>`
              : ''
          }
        </div>
        <div class="cell-visit team-block">
          ${getTeamImage(match.visitante)}
          <span class="team-name">${match.visitante}</span>
        </div>
        <div class="cell-stadium">${match.estadio}</div>
      </a>
    `;
  }
  /**
   * Filter the matches when selected options change
   */
  private _filtersChanged() {
    if (this.todayDateSelected || this.onlyPlayOffSwitch.selected) {
      this.teamsSelect.value = '';
      this.matchDaySelect.value = '';
    }
    this._filterMatches(
      this.teamsSelect.value,
      this.matchDaySelect.value,
      this.todayDateSelected,
      this.onlyPlayOffSwitch.selected,
    );
  }

  private _filterMatches(
    teamValue: string,
    matchDayValue: string,
    todaySelected: boolean,
    onlyPlayOffSelected: boolean,
  ) {
    const team =
      teamValue === '' ? '' : (this.teams[Number(teamValue)] ?? teamValue);
    const matchDay = matchDayValue === '' ? '' : Number(matchDayValue);
    this.matchesRender = this.matchesList.filter(match => {
      const findTeam =
        team === '' ? true : match.local === team || match.visitante === team;
      const findMatchDay = matchDay === '' ? true : match.jornada === matchDay;
      const onlyPlayOff =
        !onlyPlayOffSelected || match.jornada > this.teams.length - 1;
      const todayDate =
        !todaySelected ||
        (todaySelected &&
          match.fecha instanceof Date &&
          match.fecha.getFullYear() === this.todayDate.getFullYear() &&
          match.fecha.getMonth() === this.todayDate.getMonth() &&
          match.fecha.getDate() === this.todayDate.getDate());
      const noPlayIn = match.jornada !== 18 && match.jornada !== 19; // Solo torneo sin playin
      return findTeam && findMatchDay && todayDate && onlyPlayOff && noPlayIn;
    });
  }

  /**
   * Fired when the checkbox change
   * @param {Event} e
   */
  private checkboxChanged(e: Event) {
    this.todayDateSelected =
      ((e.target as MdSwitch).selected ??
        (e.target as HTMLInputElement).checked) ||
      false;
    this._filtersChanged();
  }

  private _onResize() {
    const isMobile = window.innerWidth < 600;
    if (this.isMobile !== isMobile) {
      this.isMobile = isMobile;
      this.requestUpdate();
    }
  }

  private _restoreFilters() {
    const teamIndex = this.teams.indexOf(this.filters.team ?? '');
    const teamValue =
      teamIndex >= 0 ? String(teamIndex) : (this.filters.team ?? '');
    const jornadaValue = this.filters.jornada ?? '';
    const todaySelected = this.filters.today ?? false;
    const onlyPlayOffSelected = this.filters.playoff ?? false;

    this.teamsSelect.value = teamValue;
    this.matchDaySelect.value = jornadaValue;
    this.todayDateSelected = todaySelected;
    this.todayDateCheckbox.selected = todaySelected;
    this.onlyPlayOffSwitch.selected = onlyPlayOffSelected;
    this._filterMatches(
      teamValue,
      jornadaValue,
      todaySelected,
      onlyPlayOffSelected,
    );
  }

  private _hasRestoredFilters(): boolean {
    return (
      this.filters.team !== undefined ||
      this.filters.jornada !== undefined ||
      this.filters.playoff !== undefined ||
      this.filters.today !== undefined
    );
  }

  private _applyDefaultTodayFilter() {
    if (!this.defaultTodayPending || this.matchesList.length === 0) return;

    this.defaultTodayPending = false;
    this.todayDateSelected = this.matchesList.some(
      match =>
        match.fecha instanceof Date &&
        match.fecha.getFullYear() === this.todayDate.getFullYear() &&
        match.fecha.getMonth() === this.todayDate.getMonth() &&
        match.fecha.getDate() === this.todayDate.getDate(),
    );
    this.todayDateCheckbox.selected = this.todayDateSelected;
    this._filtersChanged();
  }

  private _matchHref(match: Match): string {
    const params = new URLSearchParams({
      tab: 'Calendario',
      match: String(match.idMatch),
    });

    const teamValue = this.teamsSelect?.value ?? this.filters.team;
    const jornada = this.matchDaySelect?.value ?? this.filters.jornada;
    const playoff = this.onlyPlayOffSwitch?.selected ?? this.filters.playoff;
    const today = this.todayDateCheckbox?.selected ?? this.filters.today;
    const team =
      teamValue === undefined || teamValue === ''
        ? undefined
        : (this.teams[Number(teamValue)] ?? teamValue);

    if (team !== undefined) {
      params.set('filterTeam', team);
    }
    if (jornada !== undefined && jornada !== '') {
      params.set('filterJornada', jornada);
    }
    if (playoff) {
      params.set('filterPlayoff', '1');
    }
    if (today) {
      params.set('filterToday', '1');
    }

    return `?${params.toString()}`;
  }
}
