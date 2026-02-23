import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/textfield/filled-text-field.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import {
  FirebaseUpdates,
  Match,
  Player,
  PlayerGame,
  Substitution,
  TeamSide,
} from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import { MdDialog } from '@material/web/dialog/dialog.js';

@customElement('substitutions-card')
export class SubstitutionsCard extends LitElement {
  static override readonly styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        --card-bg: var(--md-sys-color-surface);
        --header-bg: var(--md-sys-color-surface-container);
        --event-bg: var(--md-sys-color-surface-variant);
        --color-in: #2e7d32; /* Verde fuerte */
        --color-out: #c62828; /* Rojo fuerte */
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

      /* EVENTO CAMBIO */
      .sub-entry {
        display: flex;
        align-items: stretch; /* Para que la burbuja y la info compartan altura */
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        transition: background 0.2s;
        gap: 16px;
      }

      .sub-entry:hover {
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

      .sub-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
      }

      .player-row {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        max-width: 100%;
      }

      .player-row md-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .player-row.in md-icon {
        color: var(--color-in);
      }
      .player-row.out md-icon {
        color: var(--color-out);
      }

      .player-wrapper {
        flex: 1;
        min-width: 0;
      }

      .sub-actions {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .sub-actions md-icon-button {
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

      /* FORMULARIO AGREGAR (FOOTER) */
      .add-sub-section {
        padding: 20px;
        background: var(--card-bg);
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      .add-sub-header {
        font-size: 1rem;
        font-weight: bold;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-primary);
      }

      /* Flexbox para formularios que no se enciman */
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

  @query('#subOut') subOutSelect!: MdOutlinedSelect;
  @query('#subIn') subInSelect!: MdOutlinedSelect;
  @query('#subMinute') subMinuteInput!: MdFilledTextField;

  @query('#editSubDialog') editSubDialog!: MdDialog;
  @query('#editSubOut') editSubOutSelect!: MdOutlinedSelect;
  @query('#editSubIn') editSubInSelect!: MdOutlinedSelect;
  @query('#editSubMinute') editSubMinuteInput!: MdFilledTextField;

  @state() editingSubIndex: number | null = null;
  @state() editOutPlayers: Player[] = [];
  @state() editInPlayers: Player[] = [];
  @state() disableSaveEditedSub = true;
  @state() disableAddSub = true;
  @state() subTeam: TeamSide = 'local';
  @state() editSubTeam: TeamSide = 'local';

  override render() {
    const substitutions = this.match?.substitutions || [];
    const side = this.subTeam || 'local';
    const substitutionsWithIndex = substitutions.map((sub, index) => ({
      sub,
      index,
    }));
    const localSubs = substitutionsWithIndex.filter(
      ({ sub }) => sub.team === 'local',
    );
    const visitorSubs = substitutionsWithIndex.filter(
      ({ sub }) => sub.team === 'visitor',
    );

    return html`
      <div class="card">
        <div class="section-header">
          <h3><md-icon>swap_horiz</md-icon> Cambios</h3>
        </div>

        <div class="teams-grid">
          <div class="team-column">
            <div class="team-header">
              <span>Local</span>
              <span class="score-pill">${localSubs.length}</span>
            </div>
            ${localSubs.length === 0
              ? html`<div
                  style="padding: 16px; color: gray; text-align: center; font-size: 0.9rem;"
                >
                  Sin cambios
                </div>`
              : ''}
            ${localSubs.map(({ sub, index }) =>
              this.renderSubEntry(sub, index, 'local'),
            )}
          </div>

          <div class="team-column">
            <div class="team-header">
              <span>Visitante</span>
              <span class="score-pill">${visitorSubs.length}</span>
            </div>
            ${visitorSubs.length === 0
              ? html`<div
                  style="padding: 16px; color: gray; text-align: center; font-size: 0.9rem;"
                >
                  Sin cambios
                </div>`
              : ''}
            ${visitorSubs.map(({ sub, index }) =>
              this.renderSubEntry(sub, index, 'visitor'),
            )}
          </div>
        </div>

        <div class="add-sub-section">
          <div class="add-sub-header">
            <md-icon>add_circle</md-icon> Registrar Cambio
          </div>

          <div class="form-grid">
            <div class="radio-group full-width">
              <label
                ><md-radio
                  name="subTeam"
                  value="local"
                  ?checked=${side === 'local'}
                  @change=${() => {
                    this.subTeam = 'local';
                    this._onSubTeamChange();
                  }}
                ></md-radio>
                Local</label
              >
              <label
                ><md-radio
                  name="subTeam"
                  value="visitor"
                  ?checked=${side === 'visitor'}
                  @change=${() => {
                    this.subTeam = 'visitor';
                    this._onSubTeamChange();
                  }}
                ></md-radio>
                Visitante</label
              >
            </div>

            <md-filled-text-field
              label="Minuto"
              type="number"
              id="subMinute"
              min="0"
              max="90"
              @change=${this._validateAddSub}
            ></md-filled-text-field>

            <md-outlined-select
              id="subOut"
              label="Sale (-)"
              @change=${this._validateAddSub}
            >
              <md-select-option value="" disabled selected></md-select-option>
              ${this._getActivePlayers(side).map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>

            <md-outlined-select
              id="subIn"
              label="Entra (+)"
              @change=${this._validateAddSub}
            >
              <md-select-option value="" disabled selected></md-select-option>
              ${this._getSubstitutePlayers(side).map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>

            <md-filled-button
              id="addSubButton"
              class="action-btn"
              ?disabled=${this.disableAddSub}
              @click=${this._addSub}
            >
              <md-icon slot="icon">swap_horiz</md-icon> Agregar
            </md-filled-button>
          </div>
        </div>
      </div>

      <md-dialog id="editSubDialog" type="modal">
        <div slot="headline">Editar cambio</div>
        <div slot="content" class="form-grid" style="margin-top: 8px;">
          <div class="radio-group full-width">
            <label
              ><md-radio
                name="editSubTeam"
                value="local"
                ?checked=${this.editSubTeam === 'local'}
                @change=${() => {
                  this.editSubTeam = 'local';
                  this._validateEditForm();
                }}
              ></md-radio>
              Local</label
            >
            <label
              ><md-radio
                name="editSubTeam"
                value="visitor"
                ?checked=${this.editSubTeam === 'visitor'}
                @change=${() => {
                  this.editSubTeam = 'visitor';
                  this._validateEditForm();
                }}
              ></md-radio>
              Visitante</label
            >
          </div>

          <md-filled-text-field
            label="Minuto"
            type="number"
            id="editSubMinute"
            min="0"
            max="90"
            @change=${this._validateEditForm}
          ></md-filled-text-field>

          <md-outlined-select
            id="editSubOut"
            label="Sale (-)"
            @change=${this._validateEditForm}
          >
            ${this.editOutPlayers.map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>

          <md-outlined-select
            id="editSubIn"
            label="Entra (+)"
            @change=${this._validateEditForm}
          >
            ${this.editInPlayers.map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
        </div>
        <div slot="actions">
          <md-filled-button class="action-btn" @click=${this._closeEditDialog}
            >Cancelar</md-filled-button
          >
          <md-filled-button
            @click=${this._saveEditedSub}
            ?disabled=${this.disableSaveEditedSub}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  // Helper para renderizar cada fila de cambio
  private renderSubEntry(sub: Substitution, index: number, teamSide: TeamSide) {
    const playersPool =
      teamSide === 'local' ? this.localPlayers : this.visitorPlayers;
    const playerOut = playersPool.find(p => p.number === sub.playerOut);
    const playerIn = playersPool.find(p => p.number === sub.playerIn);

    return html`
      <div class="sub-entry">
        <div class="minute-bubble">${sub.minute}'</div>

        <div class="sub-info">
          <div class="player-row in">
            <md-icon title="Entra">arrow_upward</md-icon>
            <div class="player-wrapper">
              ${playerIn
                ? html`<player-info .player=${playerIn}></player-info>`
                : html`<span style="font-weight: 500;"
                    >Jugador #${sub.playerIn}</span
                  >`}
            </div>
          </div>

          <div class="player-row out">
            <md-icon title="Sale">arrow_downward</md-icon>
            <div class="player-wrapper">
              ${playerOut
                ? html`<player-info .player=${playerOut}></player-info>`
                : html`<span style="font-weight: 500;"
                    >Jugador #${sub.playerOut}</span
                  >`}
            </div>
          </div>
        </div>

        <div class="sub-actions">
          <md-icon-button
            @click=${() => this._openEditSub(sub, index)}
            title="Editar"
            ><md-icon class="edit-btn">edit</md-icon></md-icon-button
          >
          <md-icon-button
            @click=${() => this._deleteSub(index)}
            title="Eliminar"
            ><md-icon class="delete-btn">delete</md-icon></md-icon-button
          >
        </div>
      </div>
    `;
  }

  private _addSub() {
    if (!this.match) return;
    const team = this.subTeam;
    const playerOut = Number(this.subOutSelect.value);
    const playerIn = Number(this.subInSelect.value);
    const minute = Number(this.subMinuteInput.value);
    const newSubstitution: Substitution = {
      team,
      playerOut,
      playerIn,
      minute,
    };
    const substitutions = [
      ...(this.match.substitutions || []),
      newSubstitution,
    ];

    this._updateSubstitutions(substitutions);
    this.subTeam = 'local';
    this.subOutSelect.value = '';
    this.subInSelect.value = '';
    this.subMinuteInput.value = '';
    this._validateAddSub();
  }

  private _updateSubstitutions(substitutions: Substitution[]) {
    if (!this.match) return;
    const lineupLocal = this._computeLineupForSide('local', substitutions);
    const lineupVisitor = this._computeLineupForSide('visitor', substitutions);
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch['/matches/' + this.match.idMatch + '/substitutions'] =
      substitutions;
    updatedMatch['/matches/' + this.match.idMatch + '/lineupLocal'] =
      lineupLocal;
    updatedMatch['/matches/' + this.match.idMatch + '/lineupVisitor'] =
      lineupVisitor;
    this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
    this.requestUpdate();
  }

  // Obtener los jugadores activos considerando los cambios realizados
  private _getActivePlayers(side: TeamSide): Player[] {
    const teamPlayers =
      side === 'local' ? this.localPlayers : this.visitorPlayers;
    const lineup =
      side === 'local'
        ? this.match?.lineupLocal || []
        : this.match?.lineupVisitor || [];

    return teamPlayers.filter(player =>
      lineup.some(
        p =>
          p.number === player.number &&
          ((p.titular && !p.salioDeCambio) || p.entroDeCambio),
      ),
    );
  }

  // Obtener los jugadores que pueden entrar como sustitutos
  private _getSubstitutePlayers(side: TeamSide): Player[] {
    const teamPlayers =
      side === 'local' ? this.localPlayers : this.visitorPlayers;
    const lineup =
      side === 'local'
        ? this.match?.lineupLocal || []
        : this.match?.lineupVisitor || [];
    return teamPlayers.filter(
      player =>
        !lineup.some(
          p => p.number === player.number && (p.titular || p.entroDeCambio),
        ),
    );
  }

  private _getInitialLineupForSide(side: TeamSide): PlayerGame[] {
    const lineup =
      side === 'local'
        ? this.match?.lineupLocal || []
        : this.match?.lineupVisitor || [];
    return lineup
      .filter(p => p.titular)
      .map(p => ({ ...p, salioDeCambio: false, entroDeCambio: false }));
  }

  private _computeLineupForSide(
    side: TeamSide,
    substitutions: Substitution[],
  ): PlayerGame[] {
    const base = this._getInitialLineupForSide(side);
    const lineup = base.map(p => ({ ...p }));
    const subsForSide = substitutions.filter(sub => sub.team === side);
    subsForSide.forEach(sub => {
      const outIdx = lineup.findIndex(p => p.number === sub.playerOut);
      if (outIdx !== -1) {
        lineup[outIdx] = { ...lineup[outIdx], salioDeCambio: true };
      }
      const inIdx = lineup.findIndex(p => p.number === sub.playerIn);
      if (inIdx === -1) {
        lineup.push({ number: sub.playerIn, entroDeCambio: true });
      } else {
        lineup[inIdx] = {
          ...lineup[inIdx],
          entroDeCambio: true,
          salioDeCambio: false,
        };
      }
    });
    return lineup;
  }

  private _openEditSub(sub: Substitution, index: number) {
    this.editingSubIndex = index;
    this.editOutPlayers = this._getPlayersForOut(sub.team, sub.playerOut);
    this.editInPlayers = this._getPlayersForIn(sub.team, sub.playerIn);
    this.updateComplete.then(() => {
      this.editSubTeam = sub.team;
      if (this.editSubOutSelect)
        this.editSubOutSelect.value = String(sub.playerOut);
      if (this.editSubInSelect)
        this.editSubInSelect.value = String(sub.playerIn);
      if (this.editSubMinuteInput)
        this.editSubMinuteInput.value = String(sub.minute);
      this._validateEditForm();
      this.editSubDialog?.show();
    });
  }

  private _closeEditDialog() {
    this.editSubDialog?.close();
    this.editingSubIndex = null;
    this.disableSaveEditedSub = true;
    this.editOutPlayers = [];
    this.editInPlayers = [];
  }

  private _getPlayersForOut(side: TeamSide, currentPlayer?: number): Player[] {
    const players = [...this._getActivePlayers(side)];
    if (currentPlayer) {
      const list = side === 'local' ? this.localPlayers : this.visitorPlayers;
      const existing = list.find(p => p.number === currentPlayer);
      if (existing && !players.some(p => p.number === existing.number)) {
        players.push(existing);
      }
    }
    return players;
  }

  private _getPlayersForIn(side: TeamSide, currentPlayer?: number): Player[] {
    const players = [...this._getSubstitutePlayers(side)];
    if (currentPlayer) {
      const list = side === 'local' ? this.localPlayers : this.visitorPlayers;
      const existing = list.find(p => p.number === currentPlayer);
      if (existing && !players.some(p => p.number === existing.number)) {
        players.push(existing);
      }
    }
    return players;
  }

  private _validateEditForm() {
    const selectedTeam = this.editSubTeam;
    if (selectedTeam === 'local' || selectedTeam === 'visitor') {
      this.editOutPlayers = this._getPlayersForOut(
        selectedTeam,
        Number(this.editSubOutSelect?.value),
      );
      this.editInPlayers = this._getPlayersForIn(
        selectedTeam,
        Number(this.editSubInSelect?.value),
      );
      const outExists = this.editOutPlayers.some(
        p => String(p.number) === this.editSubOutSelect?.value,
      );
      const inExists = this.editInPlayers.some(
        p => String(p.number) === this.editSubInSelect?.value,
      );
      if (!outExists && this.editSubOutSelect) this.editSubOutSelect.value = '';
      if (!inExists && this.editSubInSelect) this.editSubInSelect.value = '';
    }
    const minuteValue = this.editSubMinuteInput?.value;
    const playerOut = this.editSubOutSelect?.value;
    const playerIn = this.editSubInSelect?.value;
    this.disableSaveEditedSub =
      !selectedTeam ||
      !playerOut ||
      !playerIn ||
      !minuteValue ||
      Number.isNaN(Number(minuteValue)) ||
      Number(minuteValue) < 0 ||
      Number(minuteValue) > 90 ||
      playerOut === playerIn;
  }

  private _saveEditedSub() {
    if (
      this.match === null ||
      this.editingSubIndex === null ||
      this.editingSubIndex < 0
    )
      return;
    const team = this.editSubTeam;
    const playerOut = Number(this.editSubOutSelect.value);
    const playerIn = Number(this.editSubInSelect.value);
    const minute = Number(this.editSubMinuteInput.value);
    const updatedSub: Substitution = { team, playerOut, playerIn, minute };

    const substitutions = [...(this.match.substitutions || [])];
    substitutions[this.editingSubIndex] = updatedSub;
    this._updateSubstitutions(substitutions);
    this._closeEditDialog();
  }

  private _deleteSub(index: number) {
    if (!this.match) return;
    const confirmed = globalThis.confirm(
      '¿Seguro que deseas eliminar este cambio?',
    );
    if (!confirmed) return;
    const substitutions = [...(this.match.substitutions || [])];
    substitutions.splice(index, 1);
    this._updateSubstitutions(substitutions);
  }

  private _validateAddSub() {
    const team = this.subTeam;
    const playerOut = this.subOutSelect?.value;
    const playerIn = this.subInSelect?.value;
    const minute = this.subMinuteInput?.value;
    this.disableAddSub =
      !team ||
      !playerOut ||
      !playerIn ||
      playerOut === playerIn ||
      !minute ||
      Number.isNaN(Number(minute)) ||
      Number(minute) < 0 ||
      Number(minute) > 90;
  }

  private _onSubTeamChange() {
    this.requestUpdate();
    this._validateAddSub();
  }
}
