import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/button/filled-button.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/cards-card.js';
import '../components/events-timeline.js';
import '../components/goals-card.js';
import '../components/lineups-card.js';
import '../components/substitutions-card.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import {
  FirebaseUpdates,
  Match,
  PhaseEvent,
  Player,
  PlayerTeam,
} from '../types/index.js';
import {
  formatDateDDMMYYYY,
  formatDateYYYYMMDD,
  replaceDateSeparator,
} from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import { dispatchEventMatchUpdated } from '../utils/functionUtils.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';

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
      }
    `,
  ];

  @property({ type: Object }) match: Match | null = null;
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Array }) stadiums: string[] = [];
  @state() localPlayers: Player[] = [];
  @state() visitorPlayers: Player[] = [];
  @state() isEditing: boolean = false;

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
    this._updatePlayerLists();

    const { local, visitante, fecha, hora, estadio, golLocal, golVisitante } =
      this.match;
    const isPlayed = this.match.phaseEvents?.some(e => e.phase === 'start');

    return html`
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
          <div class="team-side">
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
          </div>

          <div class="team-side">
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
                      html`<md-select-option value=${stadium}
                        >${stadium}</md-select-option
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

  private _goBack() {
    this.dispatchEvent(
      new CustomEvent('back-to-calendar', { bubbles: true, composed: true }),
    );
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
    updates[`/matches/${this.match.idMatch}/estadio`] = estadioSelect.value;
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
    this.isEditing = false;
  }

  private renderPhaseButton() {
    if (!this.match) return null;
    if (this.match.phaseEvents?.length === 0 || !this.match.phaseEvents) {
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
      this.match.phaseEvents?.some(event => event.phase === 'start') &&
      !this.match.phaseEvents?.some(event => event.phase === 'halftime')
    ) {
      return html`
        <md-icon-button
          id="halftimeButton"
          @click=${() => this._savePhaseEvent('halftime')}
          title="Guardar medio tiempo"
          aria-label="Guardar medio tiempo"
        >
          <md-icon>pause_circle</md-icon>
        </md-icon-button>
      `;
    } else if (
      this.match.phaseEvents?.some(event => event.phase === 'halftime') &&
      !this.match.phaseEvents?.some(event => event.phase === 'secondHalf')
    ) {
      return html`
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
      this.match.phaseEvents?.some(event => event.phase === 'secondHalf') &&
      !this.match.phaseEvents?.some(event => event.phase === 'fulltime')
    ) {
      return html`
        <md-icon-button
          id="fulltimeButton"
          @click=${() => this._savePhaseEvent('fulltime')}
          title="Guardar tiempo completo"
          aria-label="Guardar tiempo completo"
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
      updates[`/matches/${this.match.idMatch}/phaseEvents`] =
        this._phaseEventsWithUpdate('start', startMinute);
    }
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
  }

  private _savePhaseEvent(phase: PhaseEvent['phase']) {
    if (!this.match) return;
    const minute = this._phaseMinuteValue(phase);
    if (minute === null) return;
    const updates: FirebaseUpdates = {};
    updates[`/matches/${this.match.idMatch}/phaseEvents`] =
      this._phaseEventsWithUpdate(phase, minute);
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
  }

  private _phaseEventsWithUpdate(phase: PhaseEvent['phase'], minute: number) {
    const order: PhaseEvent['phase'][] = [
      'start',
      'halftime',
      'secondHalf',
      'fulltime',
    ];
    const events = this.match?.phaseEvents || [];
    const filtered = events.filter(event => event.phase !== phase);
    const next = [...filtered, { phase, minute }];
    return next.sort((a, b) => order.indexOf(a.phase) - order.indexOf(b.phase));
  }

  private _phaseMinuteValue(phase: PhaseEvent['phase']): number {
    const existing = this.match?.phaseEvents?.find(
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
