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
        --md-icon-button-icon-color: #e0e0e0;
        --md-icon-button-hover-icon-color: #a5d6a7;
      }
      .phase-events {
        margin: 16px 0 24px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 12px;
        align-items: end;
      }
      .phase-actions h3 {
        margin: 0 0 8px;
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
      return html`<p>Cargando detalles del partido</p>`;
    }
    this._updatePlayerLists();

    const { local, visitante, fecha, hora, estadio, golLocal, golVisitante } =
      this.match;

    return html`
      <section class="match-detail-header">
        <h2>
          ${getTeamImage(local)} ${local} vs ${visitante}
          ${getTeamImage(visitante)}
        </h2>
        <h2>${golLocal} - ${golVisitante}</h2>
        <div id="matchTitleActions">
          <md-icon-button
            id="backButton"
            @click=${this._goBack}
            title="Volver"
            aria-label="Volver"
          >
            <md-icon>arrow_back</md-icon>
          </md-icon-button>
          ${this.isEditing
            ? html`
                <md-icon-button
                  id="saveMatchInfoButton"
                  @click=${this.editMatchInfo}
                  title="Guardar información del partido"
                  aria-label="Guardar información del partido"
                >
                  <md-icon>save</md-icon>
                </md-icon-button>
                <md-icon-button
                  id="cancelEditMatchInfoButton"
                  @click=${() => (this.isEditing = false)}
                  title="Cancelar edición"
                  aria-label="Cancelar edición"
                >
                  <md-icon>cancel</md-icon>
                </md-icon-button>
              `
            : html`
                <md-icon-button
                  id="editMatchInfoButton"
                  @click=${() => (this.isEditing = true)}
                  title="Editar información del partido"
                  aria-label="Editar información del partido"
                >
                  <md-icon>edit</md-icon>
                </md-icon-button>
              `}
          ${this.renderPhaseButton()}
        </div>
        ${this.isEditing
          ? html`
              <md-filled-text-field
                label="Fecha"
                aria-label="Fecha"
                id="fechaInput"
                type="date"
                .value=${formatDateYYYYMMDD(fecha as Date)}
              ></md-filled-text-field>
              <md-filled-text-field
                label="Hora"
                aria-label="Hora"
                id="horaInput"
                type="time"
                .value=${hora}
              ></md-filled-text-field>
              <md-filled-select
                label="Estadio"
                aria-label="Estadio"
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
            `
          : html`
              <p>
                <strong>Fecha:</strong> ${formatDateDDMMYYYY(fecha as Date)}
                &nbsp;|&nbsp; <strong>Hora:</strong> ${hora} &nbsp;|&nbsp;
                <strong>Estadio:</strong> ${estadio}
              </p>
            `}
      </section>

      <events-timeline
        .match=${this.match}
        .localPlayers=${this.localPlayers}
        .visitorPlayers=${this.visitorPlayers}
      ></events-timeline>
      <goals-card
        .match=${this.match}
        .localPlayers=${this.localPlayers}
        .visitorPlayers=${this.visitorPlayers}
      ></goals-card>
      <lineups-card
        .match=${this.match}
        .localPlayers=${this.localPlayers}
        .visitorPlayers=${this.visitorPlayers}
      ></lineups-card>
      <substitutions-card
        .match=${this.match}
        .localPlayers=${this.localPlayers}
        .visitorPlayers=${this.visitorPlayers}
      ></substitutions-card>
      <cards-card
        .match=${this.match}
        .localPlayers=${this.localPlayers}
        .visitorPlayers=${this.visitorPlayers}
      ></cards-card>
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
