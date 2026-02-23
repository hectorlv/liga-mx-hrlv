import { MdDialog } from '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import '@material/web/textfield/filled-text-field.js';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import { FOUL_TYPE_LABELS, FOUL_TYPES_BY_CARD } from '../constants';
import {
  Card,
  CardType,
  FirebaseUpdates,
  FoulType,
  Match,
  Player,
  TeamSide,
  TeamSideOptional,
} from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import { MdRadio } from '@material/web/radio/radio.js';

@customElement('cards-card')
export class CardsCard extends LitElement {
  static override readonly styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        --card-bg: var(--md-sys-color-surface);
        --header-bg: var(--md-sys-color-surface-container);
        --event-bg: var(--md-sys-color-surface-variant);
      }

      /* LA TARJETA */
      .card {
        background: var(--card-bg);
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--md-sys-color-outline-variant);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* CABECERA GENERAL */
      .section-header {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        background: var(--header-bg);
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-on-surface);
      }

      /* GRID DE DOS COLUMNAS (LOCAL VS VISITANTE) */
      .teams-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0;
      }

      @media (min-width: 600px) {
        .teams-grid {
          grid-template-columns: 1fr 1fr;
        }
        .team-column:first-child {
          border-right: 1px solid var(--md-sys-color-outline-variant);
        }
      }

      .team-column {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .team-header {
        background: var(--header-bg);
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: bold;
      }

      .team-header span.score-pill {
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 0.9rem;
      }

      /* EVENTO TARJETA */
      .card-entry {
        display: flex;
        align-items: stretch;
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        transition: background 0.2s;
        gap: 16px;
      }

      .card-entry:hover {
        background: rgba(0, 0, 0, 0.02);
      }

      .minute-bubble {
        background: var(--event-bg);
        color: var(--md-sys-color-on-surface);
        font-weight: bold;
        padding: 6px;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        flex-shrink: 0;
        align-self: center;
      }

      .card-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
        justify-content: center;
      }

      .player-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        max-width: 100%;
      }

      .player-wrapper {
        flex: 1;
        min-width: 0;
      }

      .card-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        margin-top: 4px;
        /* Alineamos con la foto del player-info saltando el ícono de 18px + 8px de gap */
        padding-left: 26px;
      }

      @media (max-width: 600px) {
        .card-meta {
          padding-left: 0;
        }
      }

      .badge {
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.8rem;
        font-weight: 500;
      }

      .card-actions {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .card-actions md-icon-button {
        --md-icon-button-icon-size: 20px;
        width: 32px;
        height: 32px;
      }

      .delete-btn {
        color: var(--app-color-danger, #d32f2f);
      }
      .edit-btn {
        color: var(--md-sys-color-primary);
      }

      /* FORMULARIOS (FLEXBOX FLUIDO) */
      .add-card-section {
        padding: 20px;
        background: var(--card-bg);
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      .add-card-header {
        font-size: 1rem;
        font-weight: bold;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-primary);
      }

      .form-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
      }

      .form-grid > * {
        flex: 1 1 180px;
        max-width: 100%;
      }

      md-filled-text-field,
      md-outlined-select {
        width: 100%;
      }

      .full-width {
        flex: 1 1 100% !important;
      }

      .radio-group {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
        background: var(--header-bg);
        padding: 8px 12px;
        border-radius: 8px;
        box-sizing: border-box;
      }
    `,
  ];
  @property({ type: Array }) localPlayers: Player[] = [];
  @property({ type: Array }) visitorPlayers: Player[] = [];
  @property({ type: Object }) match: Match | null = null;

  @query('#cardPlayer') cardPlayerSelect!: MdOutlinedSelect;
  @query('#cardMinute') cardMinuteInput!: MdFilledTextField;
  @query('#cardFoulType') cardFoulTypeSelect!: MdOutlinedSelect;
  @query('#editCardDialog') editCardDialog!: MdDialog;
  @query('#editCardPlayer') editCardPlayerSelect!: MdOutlinedSelect;
  @query('#editCardMinute') editCardMinuteInput!: MdFilledTextField;
  @query('#editCardType') editCardTypeSelect!: MdOutlinedSelect;
  @query('#editCardFoulType') editCardFoulTypeSelect!: MdOutlinedSelect;
  @query('#editCardTeam') editCardTeamRadio!: MdRadio;

  @state() editingCardIndex: number | null = null;
  @state() editPlayers: Player[] = [];
  @state() disableSaveEditedCard = true;
  @state() disableAddCard = true;
  @state() cardTeam: TeamSide = 'local';
  @state() cardTypeState: CardType = 'yellow';
  @state() editCardTeamState: TeamSideOptional = '';
  @state() editCardTypeState: CardType = 'yellow';

  override render() {
    const cards = this.match?.cards || [];
    const cardSide = this.cardTeam || 'local';
    const cardTypeSelected = this.cardTypeState;
    const addFoulOptions = this._getFoulOptions(
      cardTypeSelected,
      this.cardFoulTypeSelect?.value as FoulType,
    );
    const editCardTypeSelected = this.editCardTypeState;
    const editFoulOptions = this._getFoulOptions(
      editCardTypeSelected,
      this.editCardFoulTypeSelect?.value as FoulType,
    );

    const cardsWithIndex = cards.map((card, index) => ({ card, index }));
    const localCards = cardsWithIndex.filter(
      ({ card }) => card.team === 'local',
    );
    const visitorCards = cardsWithIndex.filter(
      ({ card }) => card.team === 'visitor',
    );

    return html`
      <div class="card">
        <div class="section-header">
          <h3><md-icon>style</md-icon> Tarjetas</h3>
        </div>

        <div class="teams-grid">
          <div class="team-column">
            <div class="team-header">
              <span>Local</span>
              <span class="score-pill">${localCards.length}</span>
            </div>
            ${localCards.length === 0
              ? html`<div
                  style="padding: 16px; color: gray; text-align: center; font-size: 0.9rem;"
                >
                  Sin tarjetas
                </div>`
              : ''}
            ${localCards.map(({ card, index }) =>
              this.renderCardEntry(card, index, 'local'),
            )}
          </div>

          <div class="team-column">
            <div class="team-header">
              <span>Visitante</span>
              <span class="score-pill">${visitorCards.length}</span>
            </div>
            ${visitorCards.length === 0
              ? html`<div
                  style="padding: 16px; color: gray; text-align: center; font-size: 0.9rem;"
                >
                  Sin tarjetas
                </div>`
              : ''}
            ${visitorCards.map(({ card, index }) =>
              this.renderCardEntry(card, index, 'visitor'),
            )}
          </div>
        </div>

        <div class="add-card-section">
          <div class="add-card-header">
            <md-icon>add_circle</md-icon> Registrar Tarjeta
          </div>

          <div class="form-grid">
            <div class="radio-group full-width">
              <span
                style="font-weight: 500; font-size: 0.9rem; margin-right: 8px;"
                >Equipo:</span
              >
              <label
                ><md-radio
                  name="cardTeam"
                  value="local"
                  .checked=${this.cardTeam === 'local'}
                  @change=${(e: Event) => {
                    this.cardTeam = (e.target as MdRadio).value as TeamSide;
                    this._onCardTeamChange();
                  }}
                ></md-radio>
                Local</label
              >
              <label
                ><md-radio
                  name="cardTeam"
                  value="visitor"
                  .checked=${this.cardTeam === 'visitor'}
                  @change=${(e: Event) => {
                    this.cardTeam = (e.target as MdRadio).value as TeamSide;
                    this._onCardTeamChange();
                  }}
                ></md-radio>
                Visitante</label
              >
            </div>

            <md-filled-text-field
              label="Minuto"
              type="number"
              id="cardMinute"
              min="0"
              max="90"
              @change=${this._validateAddCard}
              required
            ></md-filled-text-field>

            <md-outlined-select
              id="cardPlayer"
              label="Jugador"
              @change=${this._validateAddCard}
              required
            >
              <md-select-option value="" disabled selected></md-select-option>
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

            <div class="radio-group">
              <span
                style="font-weight: 500; font-size: 0.9rem; margin-right: 8px;"
                >Tipo:</span
              >
              <label
                ><md-radio
                  name="cardType"
                  value="yellow"
                  .checked=${this.cardTypeState === 'yellow'}
                  @change=${(e: Event) => {
                    this.cardTypeState = (e.target as MdRadio)
                      .value as CardType;
                    this._onCardTypeChange();
                  }}
                ></md-radio>
                Amarilla</label
              >
              <label
                ><md-radio
                  name="cardType"
                  value="red"
                  .checked=${this.cardTypeState === 'red'}
                  @change=${(e: Event) => {
                    this.cardTypeState = (e.target as MdRadio)
                      .value as CardType;
                    this._onCardTypeChange();
                  }}
                ></md-radio>
                Roja</label
              >
            </div>

            <md-outlined-select
              id="cardFoulType"
              label="Motivo (Opcional)"
              @change=${this._validateAddCard}
              ?disabled=${!cardTypeSelected}
            >
              <md-select-option value="" disabled selected></md-select-option>
              ${addFoulOptions.map(
                option =>
                  html`<md-select-option value=${option.value}
                    >${option.label}</md-select-option
                  >`,
              )}
            </md-outlined-select>

            <md-filled-button
              class="action-btn full-width"
              ?disabled=${this.disableAddCard}
              @click=${this._addCard}
            >
              <md-icon slot="icon">warning</md-icon> Agregar Tarjeta
            </md-filled-button>
          </div>
        </div>
      </div>

      <md-dialog id="editCardDialog" type="modal">
        <div slot="headline">Editar tarjeta</div>
        <div slot="content" class="form-grid" style="margin-top: 8px;">
          <div class="radio-group full-width">
            <span
              style="font-weight: 500; font-size: 0.9rem; margin-right: 8px;"
              >Equipo:</span
            >
            <label
              ><md-radio
                name="editCardTeam"
                value="local"
                .checked=${this.editCardTeamState === 'local'}
                @change=${(e: Event) => {
                  this.editCardTeamState = (e.target as MdRadio)
                    .value as TeamSide;
                  this._onCardTeamChange();
                }}
              ></md-radio>
              Local</label
            >
            <label
              ><md-radio
                name="editCardTeam"
                value="visitor"
                .checked=${this.editCardTeamState === 'visitor'}
                @change=${(e: Event) => {
                  this.editCardTeamState = (e.target as MdRadio)
                    .value as TeamSide;
                  this._onCardTeamChange();
                }}
              ></md-radio>
              Visitante</label
            >
          </div>

          <md-filled-text-field
            label="Minuto"
            type="number"
            id="editCardMinute"
            min="0"
            max="90"
            @change=${this._validateEditForm}
            required
          ></md-filled-text-field>

          <md-outlined-select
            id="editCardPlayer"
            label="Jugador"
            @change=${this._validateEditForm}
            required
          >
            ${this.editPlayers.map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>

          <div class="radio-group full-width">
            <span
              style="font-weight: 500; font-size: 0.9rem; margin-right: 8px;"
              >Tipo:</span
            >
            <label
              ><md-radio
                name="editCardType"
                value="yellow"
                .checked=${this.editCardTypeState === 'yellow'}
                @change=${(e: Event) => {
                  this.editCardTypeState = (e.target as MdRadio)
                    .value as CardType;
                  this._onEditCardTypeChange();
                }}
              ></md-radio>
              Amarilla</label
            >
            <label
              ><md-radio
                name="editCardType"
                value="red"
                .checked=${this.editCardTypeState === 'red'}
                @change=${(e: Event) => {
                  this.editCardTypeState = (e.target as MdRadio)
                    .value as CardType;
                  this._onEditCardTypeChange();
                }}
              ></md-radio>
              Roja</label
            >
          </div>

          <md-outlined-select
            id="editCardFoulType"
            label="Motivo (Opcional)"
            @change=${this._validateEditForm}
            ?disabled=${!editCardTypeSelected}
            class="full-width"
          >
            <md-select-option value="" disabled selected></md-select-option>
            ${editFoulOptions.map(
              option =>
                html`<md-select-option value=${option.value}
                  >${option.label}</md-select-option
                >`,
            )}
          </md-outlined-select>
        </div>
        <div slot="actions">
          <md-filled-button class="action-btn" @click=${this._closeEditDialog}
            >Cancelar</md-filled-button
          >
          <md-filled-button
            @click=${this._saveEditedCard}
            ?disabled=${this.disableSaveEditedCard}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  // Helper para renderizar cada fila de tarjeta limpiamente
  private renderCardEntry(card: Card, index: number, teamSide: TeamSide) {
    const playersPool =
      teamSide === 'local' ? this.localPlayers : this.visitorPlayers;
    const playerInfo = playersPool.find(p => p.number === card.player);
    const isYellow = card.cardType === 'yellow';

    return html`
      <div class="card-entry">
        <div class="minute-bubble">${card.minute}'</div>

        <div class="card-info">
          <div class="player-row">
            <md-icon
              style="font-size: 20px; color: ${isYellow
                ? '#FBC02D'
                : '#D32F2F'}; font-variation-settings: 'FILL' 1;"
            >
              style
            </md-icon>
            <div class="player-wrapper">
              ${playerInfo
                ? html`<player-info .player=${playerInfo}></player-info>`
                : html`<span style="font-weight: 500;"
                    >Jugador #${card.player}</span
                  >`}
            </div>
          </div>

          <div class="card-meta">
            ${card.foulType
              ? html`<span class="badge"
                  >${FOUL_TYPE_LABELS[card.foulType] || card.foulType}</span
                >`
              : ''}
          </div>
        </div>

        <div class="card-actions">
          <md-icon-button
            @click=${() => this._openEditCard(card, index)}
            title="Editar"
            ><md-icon class="edit-btn">edit</md-icon></md-icon-button
          >
          <md-icon-button
            @click=${() => this._deleteCard(index)}
            title="Eliminar"
            ><md-icon class="delete-btn">delete</md-icon></md-icon-button
          >
        </div>
      </div>
    `;
  }

  // --- Toda la lógica original sigue exactamente igual abajo de esto ---

  private _addCard() {
    if (!this.match) return;
    const team = this.cardTeam;
    const player = Number(this.cardPlayerSelect.value);
    const minute = Number(this.cardMinuteInput.value);
    let cardType = this.cardTypeState;
    let foulType = this.cardFoulTypeSelect?.value as '' | FoulType;
    if (cardType === 'yellow' && this._hasPreviousYellow(team, player)) {
      cardType = 'red';
      globalThis.alert('Doble amarilla: se registra como tarjeta roja.');
      foulType = 'dobleAmarilla';
    }
    const newCard: Card = {
      team,
      player,
      minute,
      cardType,
      foulType: foulType || undefined,
    };
    const cards = [...(this.match.cards || []), newCard];
    this._updateCards(cards);
    this.cardTeam = 'local';
    this.cardPlayerSelect.value = '';
    this.cardMinuteInput.value = '';
    this.cardTypeState = 'yellow';
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
      if (this.editCardTeamRadio) this.editCardTeamState = card.team;
      if (this.editCardPlayerSelect)
        this.editCardPlayerSelect.value = String(card.player);
      if (this.editCardMinuteInput)
        this.editCardMinuteInput.value = String(card.minute);
      if (this.editCardTypeSelect) this.editCardTypeState = card.cardType;
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
    const team = this.editCardTeamState;
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
    const type = this.editCardTypeState;
    const foulType = this.editCardFoulTypeSelect?.value;
    this.disableSaveEditedCard =
      !team ||
      !player ||
      !minute ||
      !type ||
      !foulType ||
      Number.isNaN(Number(minute)) ||
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
    const team = this.editCardTeamState as TeamSide;
    const player = Number(this.editCardPlayerSelect.value);
    const minute = Number(this.editCardMinuteInput.value);
    let cardType = this.editCardTypeState;
    let foulType = this.editCardFoulTypeSelect?.value as '' | FoulType;
    if (
      cardType === 'yellow' &&
      this._hasPreviousYellow(team, player, this.editingCardIndex ?? undefined)
    ) {
      cardType = 'red';
      globalThis.alert('Doble amarilla: se registra como tarjeta roja.');
      foulType = 'dobleAmarilla';
    }
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
    const confirmed = globalThis.confirm(
      '¿Seguro que deseas eliminar esta tarjeta?',
    );
    if (!confirmed) return;
    const cards = [...(this.match.cards || [])];
    cards.splice(index, 1);
    this._updateCards(cards);
  }

  private _getPlayersForTeam(side: TeamSide, currentPlayer?: number): Player[] {
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
    const team = this.cardTeam;
    const player = this.cardPlayerSelect?.value;
    const minute = this.cardMinuteInput?.value;
    const type = this.cardTypeState;
    const foulType = this.cardFoulTypeSelect?.value;
    this.disableAddCard =
      !team ||
      !player ||
      !minute ||
      !type ||
      !foulType ||
      Number.isNaN(Number(minute)) ||
      Number(minute) < 0 ||
      Number(minute) > 90;
  }

  private _onCardTeamChange() {
    this.requestUpdate();
    this._validateAddCard();
  }

  private _onCardTypeChange() {
    if (this.cardFoulTypeSelect) {
      this.cardFoulTypeSelect.value = '';
    }
    this.requestUpdate();
    this._validateAddCard();
  }

  private _onEditCardTypeChange() {
    if (this.editCardFoulTypeSelect) {
      this.editCardFoulTypeSelect.value = '';
    }
    this.requestUpdate();
    this._validateEditForm();
  }

  private _getFoulOptions(
    cardType: 'yellow' | 'red' | '',
    current?: string,
  ): { value: FoulType; label: string }[] {
    if (!cardType) return [];
    const options = [...(FOUL_TYPES_BY_CARD[cardType] || [])];
    if (
      current &&
      !options.some(o => o.value === current) &&
      FOUL_TYPE_LABELS[current as FoulType]
    ) {
      options.push({
        value: current as FoulType,
        label: FOUL_TYPE_LABELS[current as FoulType],
      });
    }
    return options;
  }

  private _hasPreviousYellow(
    team: TeamSide,
    player: number,
    ignoreIndex?: number,
  ): boolean {
    const cards = this.match?.cards || [];
    return cards.some((c, idx) => {
      if (ignoreIndex !== undefined && idx === ignoreIndex) return false;
      return c.team === team && c.player === player && c.cardType === 'yellow';
    });
  }
}
