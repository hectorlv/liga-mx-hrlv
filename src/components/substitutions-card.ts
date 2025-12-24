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
      .substitution-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      .substitution-details {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .substitution-actions {
        display: flex;
        gap: 4px;
      }
      .out {
        color: orange;
      }
      .in {
        color: green;
      }
      .delete-btn {
        color: var(--md-sys-color-error, #b00020);
      }
      .edit-btn {
        color: var(--md-sys-color-primary, #6200ee);
      }
      @media (max-width: 600px) {
        .lineup {
          grid-template-columns: 1fr;
        }
        .substitution-entry {
          flex-direction: column;
          align-items: flex-start;
        }

        .substitution-entry > *:nth-child(1),
        .substitution-entry > *:nth-child(2),
        .substitution-actions {
          display: inline-block;
        }

        .substitution-entry > *:nth-child(3),
        .substitution-entry > *:nth-child(4),
        .substitution-entry > *:nth-child(5) {
          display: inline-block;
        }
        .substitution-actions {
          margin-top: 4px;
        }
      }
      player-info {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
      }
      .add-substitution-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-top: 16px;
        justify-content: center;
      }
      .edit-substitution-form {
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

  @query('#subTeam') subTeamSelect!: MdOutlinedSelect;
  @query('#subOut') subOutSelect!: MdOutlinedSelect;
  @query('#subIn') subInSelect!: MdOutlinedSelect;
  @query('#subMinute') subMinuteInput!: MdFilledTextField;
  @query('#editSubDialog') editSubDialog!: MdDialog;
  @query('#editSubTeam') editSubTeamSelect!: MdOutlinedSelect;
  @query('#editSubOut') editSubOutSelect!: MdOutlinedSelect;
  @query('#editSubIn') editSubInSelect!: MdOutlinedSelect;
  @query('#editSubMinute') editSubMinuteInput!: MdFilledTextField;

  @state() editingSubIndex: number | null = null;
  @state() editOutPlayers: Player[] = [];
  @state() editInPlayers: Player[] = [];
  @state() disableSaveEditedSub = true;
  @state() disableAddSub = true;

  override render() {
    const substitutions = this.match?.substitutions || [];
    const side = this.subTeamSelect?.value || 'local';
    const substitutionsWithIndex = substitutions.map((sub, index) => ({
      sub,
      index,
    }));
    return html`
      <div class="section card">
        <h3>Cambios (${substitutions.length || 0})</h3>
        <div class="lineup">
          <div>
            <h4>Local</h4>
            ${substitutionsWithIndex
              .filter(({ sub }) => sub.team === 'local')
              .map(
                ({ sub, index }) => html`
                  <div class="substitution-entry">
                    <div class="substitution-details">
                      <player-info
                        .player=${this.localPlayers.find(
                          p => p.number === sub.playerOut,
                        )}
                      ></player-info>
                      <md-icon class="out">arrow_outward</md-icon>
                      <player-info
                        .player=${this.localPlayers.find(
                          p => p.number === sub.playerIn,
                        )}
                      ></player-info>
                      <md-icon class="in">arrow_insert</md-icon
                      ><span>Minuto ${sub.minute}</span>
                    </div>
                    <div class="substitution-actions">
                      <md-icon-button
                        aria-label="Editar cambio"
                        title="Editar cambio"
                        @click=${() => this._openEditSub(sub, index)}
                      >
                        <md-icon class="edit-btn">edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        aria-label="Eliminar cambio"
                        title="Eliminar cambio"
                        @click=${() => this._deleteSub(index)}
                      >
                        <md-icon class="delete-btn">delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>
                `,
              )}
          </div>
          <div>
            <h4>Visitante</h4>
            ${substitutionsWithIndex
              .filter(({ sub }) => sub.team === 'visitor')
              .map(
                ({ sub, index }) =>
                  html`<div class="substitution-entry">
                    <div class="substitution-details">
                      <player-info
                        .player=${this.visitorPlayers.find(
                          p => p.number === sub.playerOut,
                        )}
                      ></player-info>
                      <md-icon class="out">arrow_outward</md-icon>
                      <player-info
                        .player=${this.visitorPlayers.find(
                          p => p.number === sub.playerIn,
                        )}
                      ></player-info>
                      <md-icon class="in">arrow_insert</md-icon
                      ><span>Minuto ${sub.minute}</span>
                    </div>
                    <div class="substitution-actions">
                      <md-icon-button
                        aria-label="Editar cambio"
                        title="Editar cambio"
                        @click=${() => this._openEditSub(sub, index)}
                      >
                        <md-icon class="edit-btn">edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        aria-label="Eliminar cambio"
                        title="Eliminar cambio"
                        @click=${() => this._deleteSub(index)}
                      >
                        <md-icon class="delete-btn">delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>`,
              )}
          </div>
        </div>
        <div class="add-substitution-form">
          <md-filled-text-field
            aria-label="Minuto del cambio"
            label="Minuto"
            type="number"
            inputmode="numeric"
            id="subMinute"
            class="minute-input"
            min="0"
            max="90"
            @change=${this._validateAddSub}
          ></md-filled-text-field>
          <md-outlined-select
            @change=${this._onSubTeamChange}
            id="subTeam"
            aria-label="Equipo del cambio"
            title="Equipo del cambio"
          >
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-outlined-select>
          <md-outlined-select
            id="subOut"
            aria-label="Jugador que sale"
            title="Jugador que sale"
            @change=${this._validateAddSub}
          >
            <md-select-option value="" disabled selected
              >Selecciona jugador</md-select-option
            >
            ${this._getActivePlayers(side as 'local' | 'visitor').map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <md-outlined-select
            id="subIn"
            aria-label="Jugador que entra"
            title="Jugador que entra"
            @change=${this._validateAddSub}
          >
            <md-select-option value="" disabled selected
              >Selecciona jugador</md-select-option
            >
            ${this._getSubstitutePlayers(side as 'local' | 'visitor').map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <md-filled-button
            class="action-btn"
            aria-label="Agregar cambio"
            title="Agregar cambio"
            ?disabled=${this.disableAddSub}
            @click=${this._addSub}
            ><md-icon>swap_horiz</md-icon
            ><span class="btn-label">Agregar cambio</span></md-filled-button
          >
        </div>
      </div>
      <md-dialog id="editSubDialog" type="modal">
        <div slot="headline">Editar cambio</div>
        <div slot="content">
          <div class="edit-substitution-form">
            <md-outlined-select
              id="editSubTeam"
              aria-label="Equipo del cambio"
              title="Equipo del cambio"
              @change=${this._validateEditForm}
            >
              <md-select-option value="local">Local</md-select-option>
              <md-select-option value="visitor">Visitante</md-select-option>
            </md-outlined-select>
            <md-outlined-select
              id="editSubOut"
              aria-label="Jugador que sale"
              title="Jugador que sale"
              @change=${this._validateEditForm}
            >
              <md-select-option value="" disabled selected
                >Selecciona jugador</md-select-option
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
              aria-label="Jugador que entra"
              title="Jugador que entra"
              @change=${this._validateEditForm}
            >
              <md-select-option value="" disabled selected
                >Selecciona jugador</md-select-option
              >
              ${this.editInPlayers.map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>
            <md-filled-text-field
              aria-label="Minuto del cambio"
              label="Minuto"
              type="number"
              inputmode="numeric"
              id="editSubMinute"
              class="minute-input"
              min="0"
              max="90"
              @change=${this._validateEditForm}
            ></md-filled-text-field>
          </div>
        </div>
        <div slot="actions">
          <md-filled-button
            aria-label="Cancelar edición de cambio"
            title="Cancelar edición de cambio"
            @click=${this._closeEditDialog}
            >Cancelar</md-filled-button
          >
          <md-filled-button
            aria-label="Guardar cambio editado"
            title="Guardar cambio editado"
            ?disabled=${this.disableSaveEditedSub}
            @click=${this._saveEditedSub}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  private _addSub() {
    if (!this.match) return;
    const team = this.subTeamSelect.value as 'local' | 'visitor';
    const playerOut = Number(this.subOutSelect.value);
    const playerIn = Number(this.subInSelect.value);
    const minute = Number(this.subMinuteInput.value);
    const newSubstitution: Substitution = {
      team,
      playerOut,
      playerIn,
      minute,
    };
    const substitutions = [...(this.match.substitutions || []), newSubstitution];

    this._updateSubstitutions(substitutions);
    this.subTeamSelect.value = 'local';
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
  private _getActivePlayers(side: 'local' | 'visitor'): Player[] {
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
  private _getSubstitutePlayers(side: 'local' | 'visitor'): Player[] {
    const teamPlayers =
      side === 'local' ? this.localPlayers : this.visitorPlayers;
    const lineup =
      side === 'local'
        ? this.match?.lineupLocal || []
        : this.match?.lineupVisitor || [];
    return teamPlayers.filter(
      player =>
        !lineup.some(p => p.number === player.number && (p.titular || p.entroDeCambio))
    );
  }

  private _getInitialLineupForSide(side: 'local' | 'visitor'): PlayerGame[] {
    const lineup =
      side === 'local'
        ? this.match?.lineupLocal || []
        : this.match?.lineupVisitor || [];
    return lineup
      .filter(p => p.titular)
      .map(p => ({ ...p, salioDeCambio: false, entroDeCambio: false }));
  }

  private _computeLineupForSide(
    side: 'local' | 'visitor',
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
      if (this.editSubTeamSelect) this.editSubTeamSelect.value = sub.team;
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

  private _getPlayersForOut(
    side: 'local' | 'visitor',
    currentPlayer?: number,
  ): Player[] {
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

  private _getPlayersForIn(
    side: 'local' | 'visitor',
    currentPlayer?: number,
  ): Player[] {
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
    const selectedTeam = this.editSubTeamSelect?.value as
      | 'local'
      | 'visitor'
      | '';
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
    const team = this.editSubTeamSelect.value as 'local' | 'visitor';
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
    const team = this.subTeamSelect?.value as 'local' | 'visitor' | '';
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
