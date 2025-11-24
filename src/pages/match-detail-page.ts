import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../components/cards-card.js';
import '../components/goals-card.js';
import '../components/lineups-card.js';
import '../components/substitutions-card.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { Match, Player, PlayerTeam, Team } from '../types/index.js';
import { formatDateDDMMYYYY } from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';

@customElement('match-detail-page')
export class MatchDetailPage extends LitElement {
  static override styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
      }

      .minute-input {
        width: 5ch;
        min-width: 5ch;
        max-width: 5ch;
        text-align: center;
      }
    `,
  ];

  @property({ type: Object }) match: Match | null = null;
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ type: Array }) teams: Team[] = [];
  @state() localPlayers: Player[] = [];
  @state() visitorPlayers: Player[] = [];

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

    const { local, visitante, fecha, hora, estadio } = this.match;

    return html`
      <h2>
        ${getTeamImage(local)} ${local} vs ${visitante}
        ${getTeamImage(visitante)}
      </h2>
      <h2>${this.match.golLocal} - ${this.match.golVisitante}</h2>
      <md-icon-button @click=${this._goBack} title="Volver" aria-label="Volver">
        <md-icon>arrow_back</md-icon>
      </md-icon-button>
      <p>
        <strong>Fecha:</strong> ${formatDateDDMMYYYY(fecha as Date)}
        &nbsp;|&nbsp; <strong>Hora:</strong> ${hora} &nbsp;|&nbsp;
        <strong>Estadio:</strong> ${estadio}
      </p>
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
}
