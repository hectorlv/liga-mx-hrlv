import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/filled-button.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/cards-card.js';
import '../components/events-timeline.js';
import '../components/goals-card.js';
import '../components/lineups-card.js';
import '../components/substitutions-card.js';
import './team-page.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import {
  FirebaseUpdates,
  Match,
  MatchEvent,
  PhaseMatchEvent,
  Player,
  PlayerTeam,
  TableEntry,
} from '../types/index.js';
import {
  formatDateDDMMYYYY,
  formatDateYYYYMMDD,
  replaceDateSeparator,
} from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import {
  buildPhaseEvent,
  calculateSequenceForEditedEvent,
  calculateSequenceForNewEvent,
  dispatchEventMatchUpdated,
  getAggregateScoreForSecondLeg,
  getPhaseEvents,
} from '../utils/functionUtils.js';
import { REGULAR_SEASON_LAST_JORNADA } from '../utils/constants.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';

type TeamTableComparison = {
  team: TableEntry;
  position: number;
};

@customElement('match-detail-page')
export class MatchDetailPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
        /* Colores base para la página */
        --card-bg: var(--md-sys-color-surface, #ffffff);
        --header-bg: var(--md-sys-color-surface-container, #f8fafc);
        animation: slideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      }

      :host(.closing) {
        animation: slideOut 0.25s ease-in forwards;
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0.5;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      /* --- HEADER DEL PARTIDO (MARCADOR) --- */
      .match-header-card {
        background: var(--card-bg);
        border-radius: 20px;
        padding: 24px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        margin-bottom: 24px;
        position: relative;
        overflow: hidden;
        border: 1px solid var(--md-sys-color-outline-variant);
      }

      /* Efecto de fondo sutil para el header */
      .match-header-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 6px;
        background: var(--md-sys-color-primary);
      }

      /* Barra de navegación superior (Back & Edit) */
      .top-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
        background: var(--header-bg);
        border-radius: 24px;
        padding: 4px;
      }

      .desktop-back-button {
        display: none;
        position: sticky;
        top: 24px;
        left: 24px;
        z-index: 10;
        width: fit-content;
        margin-bottom: 12px;
        border-radius: 999px;
        background: color-mix(
          in srgb,
          var(--md-sys-color-surface, #ffffff) 92%,
          transparent
        );
        border: 1px solid var(--md-sys-color-outline-variant);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
        backdrop-filter: blur(10px);
      }

      .desktop-back-button md-icon-button {
        --md-icon-button-icon-color: var(--md-sys-color-on-surface);
        --md-icon-button-state-layer-size: 48px;
      }

      /* Duelo Principal */
      .duel-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
      }

      .team-side {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        flex: 1;
        border-radius: 12px;
        cursor: pointer;
        padding: 8px;
        transition:
          background-color 0.2s,
          transform 0.2s;
      }

      .team-side:hover,
      .team-side:focus-visible {
        background-color: var(--row-hover);
        outline: none;
      }

      .team-side:active {
        transform: scale(0.98);
      }

      .team-side img {
        width: 80px;
        height: 80px;
        object-fit: contain;
      }

      .team-name {
        font-size: 1.2rem;
        font-weight: bold;
        color: var(--md-sys-color-on-surface);
        text-align: center;
        line-height: 1.2;
      }

      /* El Marcador */
      .score-center {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .score-numbers {
        font-size: 3.5rem;
        font-weight: 900;
        color: var(--md-sys-color-primary);
        letter-spacing: -2px;
        line-height: 1;
        background: var(--header-bg);
        padding: 8px 16px;
        border-radius: 16px;
      }

      .aggregate-score {
        margin-top: 8px;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.9rem;
        font-weight: 800;
        line-height: 1;
        white-space: nowrap;
      }

      /* Información de Tiempo y Lugar */
      .match-meta {
        display: flex;
        justify-content: center;
        gap: 24px;
        margin-top: 24px;
        font-size: 0.9rem;
        color: var(--md-sys-color-on-surface-variant);
        flex-wrap: wrap;
      }

      .meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--header-bg);
        padding: 6px 12px;
        border-radius: 8px;
      }

      .table-comparison {
        max-width: 720px;
        margin: 16px auto 0;
        padding: 12px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
        align-items: stretch;
        gap: 12px;
        background: var(--header-bg);
        border-radius: 12px;
      }

      .table-comparison-team {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .table-comparison-team.local {
        align-items: flex-end;
        text-align: right;
      }

      .table-comparison-team.visitor {
        align-items: flex-start;
      }

      .table-team-name {
        max-width: 100%;
        color: var(--md-sys-color-on-surface);
        font-size: 0.95rem;
        font-weight: 800;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .table-team-record {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .table-comparison-team.local .table-team-record {
        justify-content: flex-end;
      }

      .table-stat {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.78rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .table-stat.strong {
        color: var(--md-sys-color-primary);
        font-size: 0.86rem;
        font-weight: 900;
      }

      .table-comparison-label {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
      }

      /* Modo Edición */
      .edit-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        justify-content: center;
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px dashed var(--md-sys-color-outline-variant);
      }
      .edit-form > * {
        flex: 1;
        min-width: 200px;
      }

      /* --- GRID DE COMPONENTES HIJOS --- */
      .match-components-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
      }

      @media (min-width: 1300px) {
        .match-components-grid {
          /* En escritorio: 2 columnas */
          grid-template-columns: 1fr 1fr;
          align-items: start;
        }

        /* La línea de tiempo siempre ocupa todo el ancho arriba */
        events-timeline {
          grid-column: 1 / -1;
        }

        /* Las alineaciones (que suelen ser largas) a la izquierda */
        lineups-card {
          grid-column: 1;
          grid-row: 2 / span 3; /* Ocupa varias filas hacia abajo */
          position: sticky;
          top: 80px;
          z-index: 1;
        }

        /* Los demás a la derecha apilados */
        goals-card {
          grid-column: 2;
          grid-row: 2;
        }
        cards-card {
          grid-column: 2;
          grid-row: 3;
        }
        substitutions-card {
          grid-column: 2;
          grid-row: 4;
        }
      }

      @media (min-width: 900px) {
        .desktop-back-button {
          display: block;
          margin-left: 8px;
        }
      }

      /* Ajustes móviles para escudos */
      @media (max-width: 600px) {
        .team-side img {
          width: 60px;
          height: 60px;
        }
        .score-numbers {
          font-size: 2.5rem;
        }
        .team-name {
          font-size: 1rem;
        }
        .match-meta {
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .table-comparison {
          grid-template-columns: 1fr;
          gap: 10px;
        }
        .table-comparison-label {
          order: -1;
        }
        .table-comparison-team,
        .table-comparison-team.local,
        .table-comparison-team.visitor {
          align-items: center;
          text-align: center;
        }
        .table-team-record,
        .table-comparison-team.local .table-team-record {
          justify-content: center;
        }
      }
    `,
  ];

  @property({ type: Object }) match: Match | null = null;
  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Array }) stadiums: string[] = [];
  @state() localPlayers: Player[] = [];
  @state() visitorPlayers: Player[] = [];
  @state() isEditing: boolean = false;
  @state() selectedTeam: string | null = null;
  @query('#halftimeMinuteInput') halftimeMinuteInput!: MdFilledTextField;

  // --- VARIABLES PARA EL GESTO DE DESLIZAR ---
  private touchStartX = 0;
  private touchStartY = 0;

  override connectedCallback() {
    super.connectedCallback();
    /* ¡OJO! Si ya tenías un connectedCallback (como en team-page), 
       solo agrégale estas dos líneas al que ya tienes: */
    this.addEventListener('touchstart', this._handleTouchStart, {
      passive: true,
    });
    this.addEventListener('touchend', this._handleTouchEnd, { passive: true });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    /* Igual aquí, si ya tenías disconnectedCallback, solo agrega estas dos líneas: */
    this.removeEventListener('touchstart', this._handleTouchStart);
    this.removeEventListener('touchend', this._handleTouchEnd);
  }

  // Usamos "arrow functions" (=>) para no perder la referencia a 'this'
  private readonly _handleTouchStart = (e: TouchEvent) => {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  };

  private readonly _handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;

    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    // LÓGICA DEL GESTO "BACK" TIPO IOS/ANDROID:
    // 1. El toque inicial debe ser en el borde izquierdo (los primeros 50px de la pantalla)
    // 2. El deslizamiento hacia la derecha debe ser de al menos 60px
    // 3. El movimiento debe ser más horizontal que vertical (para no confundirlo con el scroll de leer la página)
    if (
      this.touchStartX < 50 &&
      deltaX > 60 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      this._goBack();
    }
  };

  private _updatePlayerLists() {
    if (!this.match || !this.teams.length) return;
    this.localPlayers =
      this.players.get(this.match.local.replaceAll('.', '')) || [];
    this.visitorPlayers =
      this.players.get(this.match.visitante.replaceAll('.', '')) || [];
  }

  protected override updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has('match')) {
      this.requestUpdate();
    }
  }

  override render() {
    if (!this.match) {
      return html`<p style="text-align:center; padding: 40px;">
        Cargando detalles del partido...
      </p>`;
    }

    if (this.selectedTeam) {
      const selectedTeamData = this._getTeamData(this.selectedTeam);
      if (selectedTeamData) {
        return html`
          <team-page
            .team=${selectedTeamData.team}
            .teamPosition=${selectedTeamData.position}
            .players=${this.players.get(
              this.selectedTeam.replaceAll('.', ''),
            ) || []}
            .matchesList=${this._getTeamMatches(this.selectedTeam)}
            @back=${this._backToMatchDetail}
          ></team-page>
        `;
      }
      this.selectedTeam = null;
    }

    this._updatePlayerLists();

    const { local, visitante, fecha, hora, estadio, golLocal, golVisitante } =
      this.match;
    const aggregateScore = getAggregateScoreForSecondLeg(
      this.match,
      this.matchesList,
    );
    const tableComparison = this._getRegularSeasonTableComparison();
    const isPlayed = getPhaseEvents(this.match.events).some(
      e => e.phase === 'start',
    );

    const tableComparisonTemplate = tableComparison
      ? this._renderTableComparison(
          tableComparison.local,
          tableComparison.visitor,
        )
      : '';

    return html`
      <div class="desktop-back-button">
        <md-icon-button
          @click=${this._goBack}
          aria-label="Volver al calendario"
          title="Volver al calendario"
        >
          <md-icon>arrow_back</md-icon>
        </md-icon-button>
      </div>

      <section class="match-header-card">
        <div class="top-nav">
          <md-icon-button @click=${this._goBack} aria-label="Volver">
            <md-icon>arrow_back</md-icon>
          </md-icon-button>

          <div class="action-buttons">
            ${this.renderPhaseButton()}
            ${this.isEditing
              ? html`
                  <md-icon-button @click=${this.editMatchInfo} title="Guardar"
                    ><md-icon>save</md-icon></md-icon-button
                  >
                  <md-icon-button
                    @click=${() => (this.isEditing = false)}
                    title="Cancelar"
                    ><md-icon>cancel</md-icon></md-icon-button
                  >
                `
              : html`
                  <md-icon-button
                    @click=${() => (this.isEditing = true)}
                    title="Editar información"
                    ><md-icon>edit</md-icon></md-icon-button
                  >
                `}
          </div>
        </div>

        <div class="duel-container">
          <div
            class="team-side"
            role="button"
            tabindex="0"
            @click=${() => this._showTeamPage(local)}
            @keydown=${(event: KeyboardEvent) =>
              this._handleTeamSideKeydown(event, local)}
          >
            ${getTeamImage(local)}
            <span class="team-name">${local}</span>
          </div>

          <div class="score-center">
            ${isPlayed
              ? html`<div class="score-numbers">
                  ${golLocal} - ${golVisitante}
                </div>`
              : html`<div
                  class="score-numbers"
                  style="font-size: 2rem; color: var(--md-sys-color-on-surface-variant)"
                >
                  VS
                </div>`}
            ${aggregateScore
              ? html`<div class="aggregate-score">
                  Global ${aggregateScore.local} - ${aggregateScore.visitante}
                </div>`
              : ''}
          </div>

          <div
            class="team-side"
            role="button"
            tabindex="0"
            @click=${() => this._showTeamPage(visitante)}
            @keydown=${(event: KeyboardEvent) =>
              this._handleTeamSideKeydown(event, visitante)}
          >
            ${getTeamImage(visitante)}
            <span class="team-name">${visitante}</span>
          </div>
        </div>

        ${this.isEditing
          ? html`
              <div class="edit-form">
                <md-filled-text-field
                  label="Fecha"
                  id="fechaInput"
                  type="date"
                  .value=${formatDateYYYYMMDD(fecha as Date)}
                ></md-filled-text-field>
                <md-filled-text-field
                  label="Hora"
                  id="horaInput"
                  type="time"
                  .value=${hora}
                ></md-filled-text-field>
                <md-filled-select
                  label="Estadio"
                  id="estadioSelect"
                  .value=${estadio}
                >
                  ${this.stadiums.map(
                    stadium =>
                      html`<md-select-option
                        value="${stadium}"
                        ?selected=${stadium === estadio}
                      >
                        <div slot="headline">${stadium}</div>
                      </md-select-option
                      >`,
                  )}
                </md-filled-select>
              </div>
            `
          : html`
              <div class="match-meta">
                <div class="meta-item">
                  <md-icon style="font-size: 18px">calendar_today</md-icon>
                  ${formatDateDDMMYYYY(fecha as Date)}
                </div>
                <div class="meta-item">
                  <md-icon style="font-size: 18px">schedule</md-icon> ${hora}
                </div>
                <div class="meta-item">
                  <md-icon style="font-size: 18px">stadium</md-icon> ${estadio}
                </div>
              </div>
              ${tableComparisonTemplate}
            `}
      </section>

      <div class="match-components-grid">
        <events-timeline
          .match=${this.match}
          .localPlayers=${this.localPlayers}
          .visitorPlayers=${this.visitorPlayers}
        ></events-timeline>

        <lineups-card
          .match=${this.match}
          .localPlayers=${this.localPlayers}
          .visitorPlayers=${this.visitorPlayers}
        ></lineups-card>

        <goals-card
          .match=${this.match}
          .localPlayers=${this.localPlayers}
          .visitorPlayers=${this.visitorPlayers}
        ></goals-card>

        <cards-card
          .match=${this.match}
          .localPlayers=${this.localPlayers}
          .visitorPlayers=${this.visitorPlayers}
        ></cards-card>

        <substitutions-card
          .match=${this.match}
          .localPlayers=${this.localPlayers}
          .visitorPlayers=${this.visitorPlayers}
        ></substitutions-card>
      </div>
    `;
  }

  private _getRegularSeasonTableComparison(): {
    local: TeamTableComparison;
    visitor: TeamTableComparison;
  } | null {
    if (!this.match || this.match.jornada > REGULAR_SEASON_LAST_JORNADA) {
      return null;
    }

    const localIndex = this.table.findIndex(
      team => team.equipo === this.match?.local,
    );
    const visitorIndex = this.table.findIndex(
      team => team.equipo === this.match?.visitante,
    );

    if (localIndex < 0 || visitorIndex < 0) {
      return null;
    }

    return {
      local: {
        team: this.table[localIndex],
        position: localIndex + 1,
      },
      visitor: {
        team: this.table[visitorIndex],
        position: visitorIndex + 1,
      },
    };
  }

  private _renderTableComparison(
    local: TeamTableComparison,
    visitor: TeamTableComparison,
  ) {
    return html`
      <div class="table-comparison" aria-label="Comparación en tabla general">
        ${this._renderTableComparisonTeam(local, 'local')}
        <div class="table-comparison-label">Tabla</div>
        ${this._renderTableComparisonTeam(visitor, 'visitor')}
      </div>
    `;
  }

  private _renderTableComparisonTeam(
    comparison: TeamTableComparison,
    side: 'local' | 'visitor',
  ) {
    const { team, position } = comparison;
    return html`
      <div class="table-comparison-team ${side}">
        <div class="table-team-name">${team.equipo}</div>
        <div class="table-team-record">
          <span class="table-stat strong">#${position}</span>
          <span class="table-stat strong">${team.pts} PTS</span>
          <span class="table-stat">JJ ${team.jj}</span>
          <span class="table-stat">DG ${team.dg}</span>
          <span class="table-stat">${team.jg}-${team.je}-${team.jp}</span>
        </div>
      </div>
    `;
  }

  private _getTeamData(teamName: string): TeamTableComparison | null {
    const teamIndex = this.table.findIndex(team => team.equipo === teamName);
    if (teamIndex < 0) return null;

    return {
      team: this.table[teamIndex],
      position: teamIndex + 1,
    };
  }

  private _getTeamMatches(teamName: string): Match[] {
    return this.matchesList.filter(
      match => match.local === teamName || match.visitante === teamName,
    );
  }

  private _showTeamPage(teamName: string) {
    if (!this._getTeamData(teamName)) return;
    this.selectedTeam = teamName;
    window.scrollTo(0, 0);
  }

  private readonly _backToMatchDetail = () => {
    this.selectedTeam = null;
  };

  private _handleTeamSideKeydown(event: KeyboardEvent, teamName: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this._showTeamPage(teamName);
  }

  private _goBack() {
    if (this.selectedTeam) {
      this._backToMatchDetail();
      return;
    }

    this.classList.add('closing');
    setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent('back-to-calendar', { bubbles: true, composed: true }),
      );
    }, 250);
  }

  private editMatchInfo() {
    if (!this.match) return;

    const fechaInput = this.renderRoot.querySelector(
      '#fechaInput',
    ) as MdFilledTextField;
    const horaInput = this.renderRoot.querySelector(
      '#horaInput',
    ) as MdFilledTextField;
    const estadioSelect = this.renderRoot.querySelector(
      '#estadioSelect',
    ) as MdFilledSelect;
    const updates: FirebaseUpdates = {};
    updates[`/matches/${this.match.idMatch}/fecha`] = replaceDateSeparator(
      fechaInput.value,
    );
    updates[`/matches/${this.match.idMatch}/hora`] = horaInput.value;
    updates[`/matches/${this.match.idMatch}/estadio`] =
      this._getStadiumSelectValue(estadioSelect);
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
    this.isEditing = false;
  }

  private _getStadiumSelectValue(estadioSelect: MdFilledSelect): string {
    if (estadioSelect.value) return estadioSelect.value;
    const selectedOption = estadioSelect.selectedOptions?.[0];
    if (!selectedOption) return this.match?.estadio || '';
    return selectedOption.value || selectedOption.textContent?.trim() || '';
  }

  private renderPhaseButton() {
    if (!this.match) return null;
    const halftimeEvent = this._getExistingPhaseEvent('halftime');
    const secondHalfEvent = this._getExistingPhaseEvent('secondHalf');
    const fulltimeEvent = this._getExistingPhaseEvent('fulltime');
    const halftimeAddedTimeValue = String(halftimeEvent?.addedTime || '');
    const fulltimeAddedTimeValue = String(fulltimeEvent?.addedTime || '');

    if (
      getPhaseEvents(this.match.events).length === 0 ||
      !getPhaseEvents(this.match.events)
    ) {
      return html`
        <md-icon-button
          id="startMatchButton"
          @click=${this.startMatch}
          title="Iniciar partido"
          aria-label="Iniciar partido"
        >
          <md-icon>play_circle</md-icon>
        </md-icon-button>
      `;
    } else if (
      getPhaseEvents(this.match.events).some(
        event => event.phase === 'start',
      ) &&
      !halftimeEvent
    ) {
      return html`
        <md-filled-text-field
          id="halftimeMinuteInput"
          label="Minutos agregados"
          type="number"
          min="0"
          max="30"
          .value=${halftimeAddedTimeValue}
        ></md-filled-text-field>
        <md-icon-button
          id="halftimeButton"
          @click=${() => this._savePhaseEvent('halftime')}
          title=${halftimeEvent
            ? 'Actualizar medio tiempo'
            : 'Guardar medio tiempo'}
          aria-label=${halftimeEvent
            ? 'Actualizar medio tiempo'
            : 'Guardar medio tiempo'}
        >
          <md-icon>pause_circle</md-icon>
        </md-icon-button>
      `;
    } else if (halftimeEvent && !secondHalfEvent) {
      return html`
        <md-filled-text-field
          id="halftimeMinuteInput"
          label="Minutos agregados"
          type="number"
          min="0"
          max="30"
          .value=${halftimeAddedTimeValue}
        ></md-filled-text-field>
        <md-icon-button
          id="halftimeButton"
          @click=${() => this._savePhaseEvent('halftime')}
          title="Actualizar medio tiempo"
          aria-label="Actualizar medio tiempo"
        >
          <md-icon>pause_circle</md-icon>
        </md-icon-button>
        <md-icon-button
          id="secondHalfButton"
          @click=${() => this._savePhaseEvent('secondHalf')}
          title="Iniciar segunda mitad"
          aria-label="Iniciar segunda mitad"
        >
          <md-icon>resume</md-icon>
        </md-icon-button>
      `;
    } else if (
      getPhaseEvents(this.match.events).some(
        event => event.phase === 'secondHalf',
      )
    ) {
      return html`
        <md-filled-text-field
          id="fulltimeMinuteInput"
          label="Minutos agregados"
          type="number"
          min="0"
          max="30"
          .value=${fulltimeAddedTimeValue}
        ></md-filled-text-field>
        <md-icon-button
          id="fulltimeButton"
          @click=${() => this._savePhaseEvent('fulltime')}
          title=${fulltimeEvent
            ? 'Actualizar tiempo completo'
            : 'Guardar tiempo completo'}
          aria-label=${fulltimeEvent
            ? 'Actualizar tiempo completo'
            : 'Guardar tiempo completo'}
        >
          <md-icon>stop_circle</md-icon>
        </md-icon-button>
      `;
    }
    return null;
  }

  private startMatch() {
    if (!this.match) return;
    const updates: FirebaseUpdates = {};
    updates[`/matches/${this.match.idMatch}/golLocal`] = 0;
    updates[`/matches/${this.match.idMatch}/golVisitante`] = 0;
    const startMinute = this._phaseMinuteValue('start');
    if (startMinute !== null) {
      updates[`/matches/${this.match.idMatch}/events`] =
        this._phaseEventsWithUpdate('start', startMinute, 0);
    }
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
  }

  private _savePhaseEvent(phase: PhaseMatchEvent['phase']) {
    if (!this.match) return;
    const minute = this._phaseMinuteValue(phase);
    if (minute === null) return;
    let addedTime = 0;
    if (phase === 'halftime') {
      const addedTimeInput = this.renderRoot.querySelector(
        '#halftimeMinuteInput',
      ) as MdFilledTextField;
      addedTime = Number(addedTimeInput.value) || 0;
    } else if (phase === 'fulltime') {
      const addedTimeInput = this.renderRoot.querySelector(
        '#fulltimeMinuteInput',
      ) as MdFilledTextField;
      addedTime = Number(addedTimeInput.value) || 0;
    }
    const updates: FirebaseUpdates = {};
    updates[`/matches/${this.match.idMatch}/events`] =
      this._phaseEventsWithUpdate(phase, minute, addedTime);
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
  }

  private _phaseEventsWithUpdate(
    phase: PhaseMatchEvent['phase'],
    minute: number,
    addedTime: number,
  ): MatchEvent[] {
    const existing = this._getExistingPhaseEvent(phase);
    const nextPhaseEvent: PhaseMatchEvent = buildPhaseEvent({
      id: existing?.id || crypto.randomUUID(),
      phase,
      minute,
      addedTime,
      sequence: existing
        ? calculateSequenceForEditedEvent(
            this.match?.events || [],
            existing.id,
            minute,
            addedTime,
          )
        : calculateSequenceForNewEvent(
            this.match?.events || [],
            minute,
            addedTime,
          ),
    });

    if (!existing) {
      return [...(this.match?.events || []), nextPhaseEvent];
    }

    return (this.match?.events || []).map(event =>
      event.id === existing.id ? nextPhaseEvent : event,
    );
  }

  private _getExistingPhaseEvent(
    phase: PhaseMatchEvent['phase'],
  ): PhaseMatchEvent | undefined {
    return getPhaseEvents(this.match?.events || []).find(
      event => event.phase === phase,
    );
  }

  private _phaseMinuteValue(phase: PhaseMatchEvent['phase']): number {
    const existing = getPhaseEvents(this.match?.events || []).find(
      event => event.phase === phase,
    );
    if (existing) return existing.minute;
    switch (phase) {
      case 'start':
        return 0;
      case 'halftime':
        return 45;
      case 'secondHalf':
        return 46;
      case 'fulltime':
        return 90;
      default:
        return 0;
    }
  }
}
