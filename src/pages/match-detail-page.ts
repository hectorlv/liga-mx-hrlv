import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
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
  Player,
  PlayerTeam,
  Stadium,
  Team,
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
  static override styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
        --md-icon-button-icon-color: #e0e0e0;
        --md-icon-button-hover-icon-color: #a5d6a7;
      }
    `,
  ];

  @property({ type: Object }) match: Match | null = null;
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ type: Array }) teams: Team[] = [];
  @property({ type: Array }) stadiums: Stadium[] = [];
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

   protected override firstUpdated(_changedProperties: PropertyValues): void {
    console.log({match: this.match});
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
          ${golLocal == null && golVisitante == null
            ? html`
                <md-icon-button
                  id="startMatchButton"
                  @click=${this.startMatch}
                  title="Iniciar partido en vivo"
                  aria-label="Iniciar partido en vivo"
                >
                  <md-icon>play_circle</md-icon>
                </md-icon-button>
              `
            : html``}
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

  private startMatch() {
    if (!this.match) return;
    const updates: FirebaseUpdates = {};
    updates[`/matches/${this.match.idMatch}/golLocal`] = 0;
    updates[`/matches/${this.match.idMatch}/golVisitante`] = 0;
    this.dispatchEvent(dispatchEventMatchUpdated(updates));
  }
}
