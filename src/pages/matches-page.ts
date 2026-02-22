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
import './match-detail-page.js';

import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
import { MdSwitch } from '@material/web/switch/switch.js';
import { Match, PlayerTeam } from '../types/index.js';
import { JORNADA_LIGUILLA, LIGUILLA } from '../utils/constants.js';
import { formatDateDDMMYYYY } from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
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
        /* Tus variables globales ya deberían estar aplicadas en el index.html o componente padre */
        --card-bg: var(--md-sys-color-surface, #fff);
        --header-bg: var(--md-sys-color-surface-variant, #f0f0f0);
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
        cursor: pointer;
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
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 800;
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
          /* Columnas: Fecha | Local | Score | Visitante | Estadio */
          grid-template-columns: 180px 1fr 100px 1fr 200px;
          gap: 0;
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
          flex-direction: row-reverse;
          text-align: right;
        }
        .cell-score {
          grid-column: 4;
          justify-content: center;
          background: var(--md-sys-color-surface-variant);
        }
        .cell-visit {
          grid-column: 5;
          flex-direction: row;
          text-align: left;
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
          font-size: 1rem;
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
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Array }) stadiums: string[] = [];
  @property({ type: Array }) players: PlayerTeam[] = [];

  @state() matchesRender: Match[] = [];
  @state() showDetails: boolean = false;
  @state() selectedMatch: Match | null = null;

  private readonly todayDate: Date = new Date();
  private todayDateSelected: boolean = false;

  private savedFilters: {
    teamIndex: string;
    matchDayValue: string;
    todayDateSelected: boolean;
    onlyPlayOffSelected: boolean;
  } | null = null;
  private isMobile: boolean = window.innerWidth < 600;
  private openRowMenuId: number | null = null;

  private _boundOnResize: (() => void) | undefined;
  private _boundOnDocClick: (() => void) | undefined;

  private get championLegend(): string | null {
    const finalIda = this.matchesList.find(
      match => match.idMatch === LIGUILLA.final.ida.id,
    );
    const finalVuelta = this.matchesList.find(
      match => match.idMatch === LIGUILLA.final.vuelta.id,
    );

    if (!finalIda || !finalVuelta) return null;

    const hasTeams =
      finalIda.local.trim() !== '' &&
      finalIda.visitante.trim() !== '' &&
      finalVuelta.local.trim() !== '' &&
      finalVuelta.visitante.trim() !== '';
    const hasScores =
      finalIda.golLocal >= 0 &&
      finalIda.golVisitante >= 0 &&
      finalVuelta.golLocal >= 0 &&
      finalVuelta.golVisitante >= 0;

    if (!hasTeams || !hasScores) return null;

    const teamA = finalIda.local;
    const teamB = finalIda.visitante;
    const aggregate: Record<string, number> = {
      [teamA]: finalIda.golLocal,
      [teamB]: finalIda.golVisitante,
    };

    if (finalVuelta.local === teamA) aggregate[teamA] += finalVuelta.golLocal;
    else if (finalVuelta.visitante === teamA)
      aggregate[teamA] += finalVuelta.golVisitante;
    else return null;

    if (finalVuelta.local === teamB) aggregate[teamB] += finalVuelta.golLocal;
    else if (finalVuelta.visitante === teamB)
      aggregate[teamB] += finalVuelta.golVisitante;
    else return null;

    if (aggregate[teamA] === aggregate[teamB]) return null;

    const champion = aggregate[teamA] > aggregate[teamB] ? teamA : teamB;
    return `🏆 Campeón: ${champion} (${aggregate[teamA]}-${aggregate[teamB]} marcador global)`;
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
  }

  /**
   *
   * @param changed
   */
  override updated(changed: PropertyValues) {
    if (changed.has('matchesList')) {
      if (this.showDetails) {
        // in details view, just update the selected match reference
        if (this.selectedMatch) {
          const updatedMatch = this.matchesList.find(
            m => m.idMatch === this.selectedMatch?.idMatch,
          );
          if (updatedMatch) {
            this.selectedMatch = updatedMatch;
          }
        }
      } else {
        const today = new Date();
        this.matchesList.some(match => {
          if (
            match.fecha instanceof Date &&
            match.fecha.getFullYear() === today.getFullYear() &&
            match.fecha.getMonth() === today.getMonth() &&
            match.fecha.getDate() === today.getDate()
          ) {
            this.todayDateSelected = true;
            if (this.todayDateCheckbox) this.todayDateCheckbox.selected = true;
            return true;
          }
          return false;
        });
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
    if (this.showDetails && this.selectedMatch) {
      return html` <main>
        <match-detail-page
          .match="${this.selectedMatch}"
          .teams="${this.teams}"
          .players="${this.players}"
          .stadiums="${this.stadiums}"
          @back-to-calendar="${this._backToCalendar}"
        ></match-detail-page>
      </main>`;
    }
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

        ${this.championLegend
          ? html`<div class="champion-legend" role="note">
              ${this.championLegend}
            </div>`
          : ''}
      </main>
    `;
  }

  private renderMatchItem(match: Match) {
    return html`
      <div
        class="match-card"
        @click=${() =>
          this._showMatchDetails({
            target: { getAttribute: () => match.idMatch },
          } as unknown as Event)}
      >
        <div class="cell-jornada">
          <span>${match.jornada}</span>
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
        <div class="cell-score">${match.golLocal} - ${match.golVisitante}</div>
        <div class="cell-visit team-block">
          ${getTeamImage(match.visitante)}
          <span class="team-name">${match.visitante}</span>
        </div>
        <div class="cell-stadium">${match.estadio}</div>
      </div>
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
    const team =
      this.teamsSelect.value === ''
        ? ''
        : this.teams[Number(this.teamsSelect.value)];
    const matchDay =
      this.matchDaySelect.value === '' ? '' : Number(this.matchDaySelect.value);
    this.matchesRender = this.matchesList.filter(match => {
      const findTeam =
        team === '' ? true : match.local === team || match.visitante === team;
      const findMatchDay = matchDay === '' ? true : match.jornada === matchDay;
      const onlyPlayOff =
        !this.onlyPlayOffSwitch.selected ||
        match.jornada > this.teams.length - 1;
      const todayDate =
        !this.todayDateSelected ||
        (this.todayDateSelected &&
          match.fecha instanceof Date &&
          match.fecha.getFullYear() === this.todayDate.getFullYear() &&
          match.fecha.getMonth() === this.todayDate.getMonth() &&
          match.fecha.getDate() === this.todayDate.getDate());
      return findTeam && findMatchDay && todayDate && onlyPlayOff;
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

  private _showMatchDetails(e: Event) {
    const index = (e.target as HTMLElement).getAttribute('index');
    const match = this.matchesList.find(m => m.idMatch === Number(index));
    if (!match) return;

    //Guardar filtros actuales
    const teamIndex = this.teamsSelect.value || '';
    const matchDayValue = this.matchDaySelect.value || '';
    this.savedFilters = {
      teamIndex,
      matchDayValue,
      todayDateSelected: this.todayDateSelected,
      onlyPlayOffSelected: this.onlyPlayOffSwitch.selected,
    };
    this.selectedMatch = match;
    this.showDetails = true;
    // Reset scroll to top
    window.scrollTo(0, 0);
    this.requestUpdate();
  }

  private async _backToCalendar() {
    this.showDetails = false;
    //Restaurar filtros
    await this.updateComplete;
    if (this.savedFilters) {
      this.teamsSelect.value = this.savedFilters.teamIndex;
      this.matchDaySelect.value = this.savedFilters.matchDayValue;
      this.todayDateSelected = this.savedFilters.todayDateSelected;
      if (this.todayDateCheckbox)
        this.todayDateCheckbox.selected = this.todayDateSelected;
      this.onlyPlayOffSwitch.selected = this.savedFilters.onlyPlayOffSelected;
      this.savedFilters = null;
      this.requestUpdate();
      await this.updateComplete;
      this._filtersChanged();
    }
  }
}
