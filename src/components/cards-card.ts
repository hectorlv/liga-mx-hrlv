import '@material/web/icon/icon.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import '../components/player-info.js';
import { Card, FirebaseUpdates, Match, Player } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';

@customElement('cards-card')
export class CardsCard extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        contain: content;
      }
      .lineup {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 24px;
        align-items: start;
      }
      .lineup > div {
        width: 100%;
      }
      .card-entry {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .yellow-card {
        color: yellow;
        font-variation-settings: 'FILL' 1;
      }
      .red-card {
        color: red;
        font-variation-settings: 'FILL' 1;
      }
      @media (max-width: 600px) {
        .lineup {
          grid-template-columns: 1fr;
        }
      }
      player-info {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
      }
    `,
  ];
  @property({ type: Array }) localPlayers: Player[] = [];
  @property({ type: Array }) visitorPlayers: Player[] = [];
  @property({ type: Object }) match: Match | null = null;

  @query('#cardTeam') cardTeamSelect!: MdOutlinedSelect;
  @query('#cardPlayer') cardPlayerSelect!: MdOutlinedSelect;
  @query('#cardMinute') cardMinuteInput!: HTMLInputElement;
  @query('#cardType') cardTypeSelect!: MdOutlinedSelect;

  override render() {
    const cards = this.match?.cards || [];
    const cardSide = this.cardTeamSelect?.value || 'local';
    return html`
      <div class="section card">
        <h3>Tarjetas (${cards.length || 0})</h3>
        <div class="lineup">
          <div id="cardsCountLocal">
            <h4>Local: ${cards.filter(c => c.team === 'local').length || 0}</h4>
            ${cards
              .filter(c => c.team === 'local')
              .map(
                c => html`
                  <div class="card-entry">
                    <player-info
                      .player=${this.localPlayers.find(
                        p => p.number === c.player,
                      )}
                    ></player-info>
                    <md-icon
                      class="${c.cardType === 'yellow'
                        ? 'yellow-card'
                        : 'red-card'}"
                      >crop_portrait</md-icon
                    ><span>Minuto: ${c.minute}</span>
                  </div>
                `,
              )}
          </div>
          <div id="cardsCountVisitor">
            <h4>
              Visitante: ${cards.filter(c => c.team === 'visitor').length || 0}
            </h4>
            ${cards
              .filter(c => c.team === 'visitor')
              .map(
                c => html`
                  <div class="card-entry">
                    <player-info
                      .player=${this.visitorPlayers.find(
                        p => p.number === c.player,
                      )}
                    ></player-info>
                    <md-icon
                      class="${c.cardType === 'yellow'
                        ? 'yellow-card'
                        : 'red-card'}"
                      >crop_portrait</md-icon
                    ><span>Minuto: ${c.minute}</span>
                  </div>
                `,
              )}
          </div>
        </div>

        <div>
          <md-outlined-select
            id="cardTeam"
            aria-label="Equipo tarjeta"
            title="Equipo tarjeta"
            @change=${() => this.requestUpdate()}
          >
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-outlined-select>
          <md-outlined-select
            id="cardPlayer"
            aria-label="Jugador tarjeta"
            title="Jugador tarjeta"
          >
            ${(cardSide === 'local'
              ? this.localPlayers
              : this.visitorPlayers
            ).map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <input
            aria-label="Minuto de la tarjeta"
            type="number"
            inputmode="numeric"
            id="cardMinute"
            class="minute-input"
            placeholder="Minuto"
            min="0"
            max="90"
          />
          <md-filled-select
            id="cardType"
            aria-label="Tipo de tarjeta"
            title="Tipo de tarjeta"
          >
            <md-select-option value="yellow">Amarilla</md-select-option>
            <md-select-option value="red">Roja</md-select-option>
          </md-filled-select>
          <md-filled-button
            class="action-btn"
            aria-label="Agregar tarjeta"
            title="Agregar tarjeta"
            @click=${this._addCard}
            ><md-icon>warning</md-icon
            ><span class="btn-label">Agregar Tarjeta</span></md-filled-button
          >
        </div>
      </div>
    `;
  }
  private _addCard() {
    if (!this.match) return;
    const team = this.cardTeamSelect.value as 'local' | 'visitor';
    const player = Number(this.cardPlayerSelect.value);
    const minute = Number(this.cardMinuteInput.value);
    const cardType = this.cardTypeSelect.value as 'yellow' | 'red';
    const newCard: Card = { team, player, minute, cardType };
    const cards = [...(this.match.cards || []), newCard];
    this._updateCards(cards);
  }

  private _updateCards(cards: Card[]) {
    if (!this.match) return;
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch[`matches/${this.match.idMatch}/cards`] = cards;
    this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
    this.requestUpdate();
  }
}
