import '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/filled-text-field.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import { Card, FirebaseUpdates, Match, Player } from '../types';
import { FOUL_TYPE_LABELS, FOUL_TYPES } from '../constants';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import { MdDialog } from '@material/web/dialog/dialog.js';

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
        width: 100%;
      }
      .card-details {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .card-actions {
        display: flex;
        gap: 4px;
      }
      .yellow-card {
        color: yellow;
        font-variation-settings: 'FILL' 1;
      }
      .red-card {
        color: red;
        font-variation-settings: 'FILL' 1;
      }
      .delete-btn {
        color: var(--md-sys-color-error, #b00020);
      }
      .badge {
        background: var(--md-sys-color-secondary-container, #e8def8);
        color: var(--md-sys-color-on-secondary-container, #1d192b);
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 0.8em;
      }
      @media (max-width: 600px) {
        .lineup {
          grid-template-columns: 1fr;
        }
        .card-actions {
          margin-top: 4px;
        }
      }
      player-info {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
      }
      .add-card-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-top: 16px;
        justify-content: center;
      }
      .edit-card-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-top: 8px;
      }
    `,
  ];
  @property({ type: Array }) localPlayers: Player[] = [];
  @property({ type: Array }) visitorPlayers: Player[] = [];
  @property({ type: Object }) match: Match | null = null;

  @query('#cardTeam') cardTeamSelect!: MdOutlinedSelect;
  @query('#cardPlayer') cardPlayerSelect!: MdOutlinedSelect;
  @query('#cardMinute') cardMinuteInput!: MdFilledTextField;
  @query('#cardType') cardTypeSelect!: MdOutlinedSelect;
  @query('#cardFoulType') cardFoulTypeSelect!: MdOutlinedSelect;
  @query('#editCardDialog') editCardDialog!: MdDialog;
  @query('#editCardTeam') editCardTeamSelect!: MdOutlinedSelect;
  @query('#editCardPlayer') editCardPlayerSelect!: MdOutlinedSelect;
  @query('#editCardMinute') editCardMinuteInput!: MdFilledTextField;
  @query('#editCardType') editCardTypeSelect!: MdOutlinedSelect;
  @query('#editCardFoulType') editCardFoulTypeSelect!: MdOutlinedSelect;

  @state() editingCardIndex: number | null = null;
  @state() editPlayers: Player[] = [];
  @state() disableSaveEditedCard = true;
  @state() disableAddCard = true;

  override render() {
    const cards = this.match?.cards || [];
    const cardSide = this.cardTeamSelect?.value || 'local';
    const cardsWithIndex = cards.map((card, index) => ({ card, index }));
    return html`
      <div class="section card">
        <h3>Tarjetas (${cards.length || 0})</h3>
        <div class="lineup">
          <div id="cardsCountLocal">
            <h4>Local: ${cards.filter(c => c.team === 'local').length || 0}</h4>
            ${cardsWithIndex
              .filter(({ card }) => card.team === 'local')
              .map(
                ({ card, index }) => html`
                  <div class="card-entry">
                    <div class="card-details">
                      <player-info
                        .player=${this.localPlayers.find(
                          p => p.number === card.player,
                        )}
                      ></player-info>
                      <md-icon
                        class="${card.cardType === 'yellow'
                          ? 'yellow-card'
                          : 'red-card'}"
                        >crop_portrait</md-icon
                      ><span>Minuto: ${card.minute}</span>
                      ${card.foulType
                        ? html`<span class="badge">${FOUL_TYPE_LABELS[card.foulType]}</span>`
                        : null}
                    </div>
                    <div class="card-actions">
                      <md-icon-button
                        aria-label="Editar tarjeta"
                        title="Editar tarjeta"
                        @click=${() => this._openEditCard(card, index)}
                      >
                        <md-icon>edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        class="delete-btn"
                        aria-label="Eliminar tarjeta"
                        title="Eliminar tarjeta"
                        @click=${() => this._deleteCard(index)}
                      >
                        <md-icon>delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>
                `,
              )}
          </div>
          <div id="cardsCountVisitor">
            <h4>
              Visitante: ${cards.filter(c => c.team === 'visitor').length || 0}
            </h4>
            ${cardsWithIndex
              .filter(({ card }) => card.team === 'visitor')
              .map(
                ({ card, index }) => html`
                  <div class="card-entry">
                    <div class="card-details">
                      <player-info
                        .player=${this.visitorPlayers.find(
                          p => p.number === card.player,
                        )}
                      ></player-info>
                      <md-icon
                        class="${card.cardType === 'yellow'
                          ? 'yellow-card'
                          : 'red-card'}"
                        >crop_portrait</md-icon
                      ><span>Minuto: ${card.minute}</span>
                      ${card.foulType
                        ? html`<span class="badge">${FOUL_TYPE_LABELS[card.foulType]}</span>`
                        : null}
                    </div>
                    <div class="card-actions">
                      <md-icon-button
                        aria-label="Editar tarjeta"
                        title="Editar tarjeta"
                        @click=${() => this._openEditCard(card, index)}
                      >
                        <md-icon>edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        class="delete-btn"
                        aria-label="Eliminar tarjeta"
                        title="Eliminar tarjeta"
                        @click=${() => this._deleteCard(index)}
                      >
                        <md-icon>delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>
                `,
              )}
          </div>
        </div>

        <div class="add-card-form">
          <md-outlined-select
            id="cardTeam"
            aria-label="Equipo tarjeta"
            title="Equipo tarjeta"
            @change=${this._onCardTeamChange}
          >
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-outlined-select>
          <md-outlined-select
            id="cardPlayer"
            aria-label="Jugador tarjeta"
            title="Jugador tarjeta"
            @change=${this._validateAddCard}
          >
            <md-select-option value="" disabled selected>Selecciona jugador</md-select-option>
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
          <md-filled-text-field
            aria-label="Minuto de la tarjeta"
            label="Minuto"
            type="number"
            inputmode="numeric"
            id="cardMinute"
            class="minute-input"
            min="0"
            max="90"
            @change=${this._validateAddCard}
          ></md-filled-text-field>
          <md-filled-select
            id="cardType"
            aria-label="Tipo de tarjeta"
            title="Tipo de tarjeta"
            @change=${this._validateAddCard}
          >
            <md-select-option value="" disabled selected>Selecciona tipo de tarjeta</md-select-option>
            <md-select-option value="yellow">Amarilla</md-select-option>
            <md-select-option value="red">Roja</md-select-option>
          </md-filled-select>
          <md-outlined-select
            id="cardFoulType"
            aria-label="Tipo de falta"
            title="Tipo de falta"
          >
            <md-select-option value="" selected>Sin tipo de falta</md-select-option>
            ${FOUL_TYPES.map(
              option =>
                html`<md-select-option value=${option.value}
                  >${option.label}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <md-filled-button
            class="action-btn"
            aria-label="Agregar tarjeta"
            title="Agregar tarjeta"
            ?disabled=${this.disableAddCard}
            @click=${this._addCard}
            ><md-icon>warning</md-icon
            ><span class="btn-label">Agregar Tarjeta</span></md-filled-button
          >
        </div>
      </div>
      <md-dialog id="editCardDialog" type="modal">
        <div slot="headline">Editar tarjeta</div>
        <div slot="content">
          <div class="edit-card-form">
            <md-outlined-select
              id="editCardTeam"
              aria-label="Equipo tarjeta"
              title="Equipo tarjeta"
              @change=${this._validateEditForm}
            >
              <md-select-option value="local">Local</md-select-option>
              <md-select-option value="visitor">Visitante</md-select-option>
            </md-outlined-select>
            <md-outlined-select
              id="editCardPlayer"
              aria-label="Jugador tarjeta"
              title="Jugador tarjeta"
              @change=${this._validateEditForm}
            >
              <md-select-option value="" disabled selected
                >Selecciona jugador</md-select-option
              >
              ${this.editPlayers.map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>
            <md-filled-text-field
              aria-label="Minuto de la tarjeta"
              label="Minuto"
              type="number"
              inputmode="numeric"
              id="editCardMinute"
              class="minute-input"
              min="0"
              max="90"
              @change=${this._validateEditForm}
            ></md-filled-text-field>
            <md-filled-select
              id="editCardType"
              aria-label="Tipo de tarjeta"
              title="Tipo de tarjeta"
              @change=${this._validateEditForm}
            >
              <md-select-option value="yellow">Amarilla</md-select-option>
              <md-select-option value="red">Roja</md-select-option>
            </md-filled-select>
            <md-outlined-select
              id="editCardFoulType"
              aria-label="Tipo de falta"
              title="Tipo de falta"
              @change=${this._validateEditForm}
            >
              <md-select-option value="">Sin tipo de falta</md-select-option>
              ${FOUL_TYPES.map(
                option =>
                  html`<md-select-option value=${option.value}
                    >${option.label}</md-select-option
                  >`,
              )}
            </md-outlined-select>
          </div>
        </div>
        <div slot="actions">
          <md-filled-button
            aria-label="Cancelar edición"
            title="Cancelar edición"
            @click=${this._closeEditDialog}
            >Cancelar</md-filled-button
          >
          <md-filled-button
            aria-label="Guardar tarjeta editada"
            title="Guardar tarjeta editada"
            ?disabled=${this.disableSaveEditedCard}
            @click=${this._saveEditedCard}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }
  private _addCard() {
    if (!this.match) return;
    const team = this.cardTeamSelect.value as 'local' | 'visitor';
    const player = Number(this.cardPlayerSelect.value);
    const minute = Number(this.cardMinuteInput.value);
    const cardType = this.cardTypeSelect.value as 'yellow' | 'red';
    const foulType = this.cardFoulTypeSelect?.value as '' | typeof FOUL_TYPES[number]['value'];
    const newCard: Card = {
      team,
      player,
      minute,
      cardType,
      foulType,
    };
    const cards = [...(this.match.cards || []), newCard];
    this._updateCards(cards);
    this.cardTeamSelect.value = 'local';
    this.cardPlayerSelect.value = '';
    this.cardMinuteInput.value = '';
    this.cardTypeSelect.value = '';
    if (this.cardFoulTypeSelect) this.cardFoulTypeSelect.value = '';
    this._validateAddCard();
  }

  private _updateCards(cards: Card[]) {
    if (!this.match) return;
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch[`/matches/${this.match.idMatch}/cards`] = cards;
    this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
    this.requestUpdate();
  }

  private _openEditCard(card: Card, index: number) {
    this.editingCardIndex = index;
    this.editPlayers = this._getPlayersForTeam(card.team, card.player);
    this.updateComplete.then(() => {
      if (this.editCardTeamSelect) this.editCardTeamSelect.value = card.team;
      if (this.editCardPlayerSelect)
        this.editCardPlayerSelect.value = String(card.player);
      if (this.editCardMinuteInput)
        this.editCardMinuteInput.value = String(card.minute);
      if (this.editCardTypeSelect) this.editCardTypeSelect.value = card.cardType;
      if (this.editCardFoulTypeSelect)
        this.editCardFoulTypeSelect.value = card.foulType || '';
      this._validateEditForm();
      this.editCardDialog?.show();
    });
  }

  private _closeEditDialog() {
    this.editCardDialog?.close();
    this.editingCardIndex = null;
    this.disableSaveEditedCard = true;
    this.editPlayers = [];
  }

  private _validateEditForm() {
    const team = this.editCardTeamSelect?.value as 'local' | 'visitor' | '';
    if (team) {
      this.editPlayers = this._getPlayersForTeam(
        team,
        Number(this.editCardPlayerSelect?.value),
      );
      const playerExists = this.editPlayers.some(
        p => String(p.number) === this.editCardPlayerSelect?.value,
      );
      if (!playerExists && this.editCardPlayerSelect) {
        this.editCardPlayerSelect.value = '';
      }
    }
    const player = this.editCardPlayerSelect?.value;
    const minute = this.editCardMinuteInput?.value;
    const type = this.editCardTypeSelect?.value as 'yellow' | 'red' | '';
    this.disableSaveEditedCard =
      !team ||
      !player ||
      !minute ||
      !type ||
      isNaN(Number(minute)) ||
      Number(minute) < 0 ||
      Number(minute) > 90;
  }

  private _saveEditedCard() {
    if (
      this.match === null ||
      this.editingCardIndex === null ||
      this.editingCardIndex < 0
    )
      return;
    const team = this.editCardTeamSelect.value as 'local' | 'visitor';
    const player = Number(this.editCardPlayerSelect.value);
    const minute = Number(this.editCardMinuteInput.value);
    const cardType = this.editCardTypeSelect.value as 'yellow' | 'red';
    const foulType = this.editCardFoulTypeSelect?.value as
      | ''
      | typeof FOUL_TYPES[number]['value'];
    const updatedCard: Card = {
      team,
      player,
      minute,
      cardType,
      foulType: foulType || undefined,
    };
    const cards = [...(this.match.cards || [])];
    cards[this.editingCardIndex] = updatedCard;
    this._updateCards(cards);
    this._closeEditDialog();
  }

  private _deleteCard(index: number) {
    if (!this.match) return;
    const confirmed = window.confirm(
      '¿Seguro que deseas eliminar esta tarjeta?',
    );
    if (!confirmed) return;
    const cards = [...(this.match.cards || [])];
    cards.splice(index, 1);
    this._updateCards(cards);
  }

  private _getPlayersForTeam(
    side: 'local' | 'visitor',
    currentPlayer?: number,
  ): Player[] {
    const list = side === 'local' ? this.localPlayers : this.visitorPlayers;
    const players = [...list];
    if (currentPlayer) {
      const existing = list.find(p => p.number === currentPlayer);
      if (existing && !players.some(p => p.number === existing.number)) {
        players.push(existing);
      }
    }
    return players;
  }

  private _validateAddCard() {
    const team = this.cardTeamSelect?.value as 'local' | 'visitor' | '';
    const player = this.cardPlayerSelect?.value;
    const minute = this.cardMinuteInput?.value;
    const type = this.cardTypeSelect?.value as 'yellow' | 'red' | '';
    this.disableAddCard =
      !team ||
      !player ||
      !minute ||
      !type ||
      isNaN(Number(minute)) ||
      Number(minute) < 0 ||
      Number(minute) > 90;
  }

  private _onCardTeamChange() {
    this.requestUpdate();
    this._validateAddCard();
  }
}
