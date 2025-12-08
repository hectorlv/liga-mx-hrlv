import '@material/web/button/filled-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/select/outlined-select.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import { FirebaseUpdates, Goal, GoalType, Match, Player } from '../types';
import { GOAL_TYPE_LABELS, GOAL_TYPES } from '../constants';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { MdCheckbox } from '@material/web/checkbox/checkbox.js';
import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdDialog } from '@material/web/dialog/dialog.js';


@customElement('goals-card')
export class GoalsCard extends LitElement {
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
      .goal-entry {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
      }
      .goal-details {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1 1 auto;
        min-width: 0;
      }
      .goal-actions {
        display: flex;
        gap: 4px;
      }
      .delete-btn {
        color: var(--md-sys-color-error, #b00020);
      }
      .edit-btn {
        color: var(--md-sys-color-primary, #6200ee);
      }
      .badge {
        background: var(--md-sys-color-secondary-container, #e8def8);
        color: var(--md-sys-color-on-secondary-container, #1d192b);
        padding: 2px 6px;
        border-radius: 6px;
        font-size: 0.8em;
      }
      .assist {
        font-size: 0.9em;
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
      .add-goal-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-top: 16px;
        justify-content: center;
      }
      .edit-goal-form {
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

  @state() goalTeam: '' | 'local' | 'visitor' = '';
  @state() disableAddGoalButton = true;
  @state() activePlayers: Player[] = [];
  @state() assistPlayers: Player[] = [];
  @state() editActivePlayers: Player[] = [];
  @state() editAssistPlayers: Player[] = [];
  @state() disableSaveEditedGoal = true;
  @state() editingGoalIndex: number | null = null;

  @query('#goalTeam') goalTeamSelect!: MdOutlinedSelect;
  @query('#newGoalPlayer') newGoalPlayerSelect!: MdOutlinedSelect;
  @query('#newGoalMinute') newGoalMinuteInput!: MdFilledTextField;
  @query('#newGoalOwn') newGoalOwnCheckbox!: MdCheckbox;
  @query('#newGoalType') newGoalTypeSelect!: MdOutlinedSelect;
  @query('#newGoalAssist') newGoalAssistSelect!: MdOutlinedSelect;
  @query('#newGoalNote') newGoalNoteInput!: MdFilledTextField;
  @query('#addGoalButton') addGoalButton!: MdFilledButton;
  @query('#editGoalDialog') editGoalDialog!: MdDialog;
  @query('#editGoalTeam') editGoalTeamSelect!: MdOutlinedSelect;
  @query('#editGoalPlayer') editGoalPlayerSelect!: MdOutlinedSelect;
  @query('#editGoalMinute') editGoalMinuteInput!: MdFilledTextField;
  @query('#editGoalOwn') editGoalOwnCheckbox!: MdCheckbox;
  @query('#editGoalType') editGoalTypeSelect!: MdOutlinedSelect;
  @query('#editGoalAssist') editGoalAssistSelect!: MdOutlinedSelect;
  @query('#editGoalNote') editGoalNoteInput!: MdFilledTextField;

  override render() {
    const goals = this.match?.goals || [];
    const goalsWithIndex = goals.map((goal, index) => ({ goal, index }));
    return html`
      <div class="section card">
        <h3>Goles</h3>
        <div class="lineup">
          <div id="goalsCountLocal">
            <h4>Local: ${goals.filter(g => g.team === 'local').length || 0}</h4>
            ${goalsWithIndex
              .filter(({ goal }) => goal.team === 'local')
              .map(
                ({ goal, index }) => html`
                  <div class="goal-entry">
                    <div class="goal-details">
                      <player-info
                        .player=${goal.ownGoal
                          ? this.visitorPlayers.find(p => p.number === goal.player)
                          : this.localPlayers.find(p => p.number === goal.player)}
                      ></player-info>
                      <span
                        >${goal.ownGoal
                          ? html`<em>(Gol en propia)</em>`
                          : ''}</span
                      >
                      <md-icon>sports_soccer</md-icon
                      ><span>Minuto ${goal.minute}</span>
                      ${goal.goalType
                        ? html`<span class="badge"
                            >${GOAL_TYPE_LABELS[goal.goalType]}</span
                          >`
                        : null}
                      ${goal.assist
                        ? html`<span class="assist"
                            >Asistencia:
                            ${this.localPlayers.find(p => p.number === goal.assist)?.name ||
                            this.visitorPlayers.find(p => p.number === goal.assist)?.name ||
                            goal.assist}</span
                          >`
                        : null}
                    </div>
                    <div class="goal-actions">
                      <md-icon-button
                        aria-label="Editar gol"
                        title="Editar gol"
                        @click=${() => this._openEditGoal(goal, index)}
                      >
                        <md-icon class="edit-btn">edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        aria-label="Eliminar gol"
                        title="Eliminar gol"
                        @click=${() => this._deleteGoal(index)}
                      >
                        <md-icon class="delete-btn">delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>
                `,
              )}
          </div>
          <div id="goalsCountVisitor">
            <h4>
              Visitante: ${goals.filter(g => g.team === 'visitor').length || 0}
            </h4>
            ${goalsWithIndex
              .filter(({ goal }) => goal.team === 'visitor')
              .map(
                ({ goal, index }) => html`
                  <div class="goal-entry">
                    <div class="goal-details">
                      <player-info
                        .player=${goal.ownGoal
                          ? this.localPlayers.find(p => p.number === goal.player)
                          : this.visitorPlayers.find(p => p.number === goal.player)}
                      ></player-info>
                      <span
                        >${goal.ownGoal
                          ? html`<em>(Gol en propia)</em>`
                          : ''}</span
                      >
                      <md-icon>sports_soccer</md-icon
                      ><span>Minuto ${goal.minute}</span>
                      ${goal.goalType
                        ? html`<span class="badge"
                            >${GOAL_TYPE_LABELS[goal.goalType]}</span
                          >`
                        : null}
                      ${goal.assist
                        ? html`<span class="assist"
                            >Asistencia:
                            ${this.localPlayers.find(p => p.number === goal.assist)?.name ||
                            this.visitorPlayers.find(p => p.number === goal.assist)?.name ||
                            goal.assist}</span
                          >`
                        : null}
                    </div>
                    <div class="goal-actions">
                      <md-icon-button
                        aria-label="Editar gol"
                        title="Editar gol"
                        @click=${() => this._openEditGoal(goal, index)}
                      >
                        <md-icon class="edit-btn">edit</md-icon>
                      </md-icon-button>
                      <md-icon-button
                        aria-label="Eliminar gol"
                        title="Eliminar gol"
                        @click=${() => this._deleteGoal(index)}
                      >
                        <md-icon class="delete-btn">delete</md-icon>
                      </md-icon-button>
                    </div>
                  </div>
                `,
              )}
          </div>
        </div>
        <div class="add-goal-form">
          <md-outlined-select
            id="goalTeam"
            aria-label="Equipo del gol"
            title="Equipo del gol"
            @change=${this._validateForm}
            required
          >
            <md-select-option value="" disabled selected
              >Selecciona equipo</md-select-option
            >
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-outlined-select>
          <md-outlined-select
            id="newGoalPlayer"
            aria-label="Jugador que anotó"
            title="Jugador que anotó"
            @change=${this._validateForm}
            required
          >
            <md-select-option value="" disabled selected
              >Selecciona jugador</md-select-option
            >
            ${this.activePlayers.map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <md-filled-text-field
            aria-label="Minuto del gol"
            label="Minuto"
            type="number"
            inputmode="numeric"
            id="newGoalMinute"
            class="minute-input"
            min="0"
            max="90"
            @change=${this._validateForm}
            required
          ></md-filled-text-field>
          <md-outlined-select
            id="newGoalType"
            aria-label="Tipo de gol"
            title="Tipo de gol"
            @change=${this._validateForm}
            required
          >
            <md-select-option value="" disabled selected
              >Tipo de gol</md-select-option
            >
            ${GOAL_TYPES.map(
              option =>
                html`<md-select-option value=${option.value}
                  >${option.label}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <md-outlined-select
            id="newGoalAssist"
            aria-label="Asistencia"
            title="Asistencia"
            ?disabled=${this.newGoalOwnCheckbox?.checked}
            @change=${this._validateForm}
          >
            <md-select-option value="" selected>Sin asistencia</md-select-option>
            ${this.assistPlayers.map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <label
            ><md-checkbox
              id="newGoalOwn"
              aria-label="Gol en propia puerta"
              title="Gol en propia puerta"
              @change=${this._validateForm}
            ></md-checkbox>
            Autogol
          </label>
          <md-filled-button
            id="addGoalButton"
            class="action-btn"
            aria-label="Agregar gol"
            title="Agregar gol"
            ?disabled=${this.disableAddGoalButton}
            @click=${this._addGoal}
            ><md-icon>add</md-icon
            ><span class="btn-label">Agregar Gol</span></md-filled-button
          >
        </div>
      </div>
      <md-dialog id="editGoalDialog" type="modal">
        <div slot="headline">Editar gol</div>
        <div slot="content">
          <div class="edit-goal-form">
            <md-outlined-select
              id="editGoalTeam"
              aria-label="Equipo del gol"
              title="Equipo del gol"
              @change=${this._validateEditForm}
              required
            >
              <md-select-option value="local">Local</md-select-option>
              <md-select-option value="visitor">Visitante</md-select-option>
            </md-outlined-select>
            <md-outlined-select
              id="editGoalPlayer"
              aria-label="Jugador que anotó"
              title="Jugador que anotó"
              @change=${this._validateEditForm}
              required
            >
              <md-select-option value="" disabled selected
                >Selecciona jugador</md-select-option
              >
              ${this.editActivePlayers.map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>
            <md-filled-text-field
              aria-label="Minuto del gol"
              label="Minuto"
              type="number"
              inputmode="numeric"
              id="editGoalMinute"
              class="minute-input"
              min="0"
              max="90"
              @change=${this._validateEditForm}
              required
            ></md-filled-text-field>
            <md-outlined-select
              id="editGoalType"
              aria-label="Tipo de gol"
              title="Tipo de gol"
              @change=${this._validateEditForm}
            >
              ${GOAL_TYPES.map(
                option =>
                  html`<md-select-option value=${option.value}
                    >${option.label}</md-select-option
                  >`,
              )}
            </md-outlined-select>
            <md-outlined-select
              id="editGoalAssist"
              aria-label="Asistencia"
              title="Asistencia"
              ?disabled=${this.editGoalOwnCheckbox?.checked}
              @change=${this._validateEditForm}
            >
              <md-select-option value="">Sin asistencia</md-select-option>
              ${this.editAssistPlayers.map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>
            <label
              ><md-checkbox
                id="editGoalOwn"
                aria-label="Gol en propia puerta"
                title="Gol en propia puerta"
                @change=${this._validateEditForm}
              ></md-checkbox>
              Autogol
            </label>
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
            aria-label="Guardar cambios"
            title="Guardar cambios"
            ?disabled=${this.disableSaveEditedGoal}
            @click=${this._saveEditedGoal}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  private _getActivePlayers(side: '' | 'local' | 'visitor'): Player[] {
    if (side === '') return [];
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

  private _addGoal() {
    if (!this.match) return;
    const team = this.goalTeamSelect.value as 'local' | 'visitor';
    const player = Number(this.newGoalPlayerSelect.value);
    const minute = Number(this.newGoalMinuteInput.value);
    const ownGoal = this.newGoalOwnCheckbox.checked;
    const goalType = this.newGoalTypeSelect.value as GoalType;
    const assistValue = this.newGoalAssistSelect.value;
    const assist =
      ownGoal || !assistValue ? undefined : Number(this.newGoalAssistSelect.value);
    const newGoal: Goal = { team, player, minute, ownGoal, goalType, assist };
    const goals = [...(this.match.goals || []), newGoal];
    this._updateGoals(goals);
    this.goalTeamSelect.value = '';
    this.newGoalPlayerSelect.value = '';
    this.newGoalMinuteInput.value = '';
    this.newGoalOwnCheckbox.checked = false;
    this.newGoalTypeSelect.value = '';
    this.newGoalAssistSelect.value = '';
    this._validateForm();
  }

  private _updateGoals(goals: Goal[]) {
    if (!this.match) return;
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch[`/matches/${this.match.idMatch}/goals`] = goals;
    updatedMatch[`/matches/${this.match.idMatch}/golLocal`] = goals.filter(
      g => g.team === 'local',
    ).length;
    updatedMatch[`/matches/${this.match.idMatch}/golVisitante`] = goals.filter(
      g => g.team === 'visitor',
    ).length;
    this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
    this.requestUpdate();
  }

  private _validateForm() {
    const selectedTeam = this.goalTeamSelect.value as '' | 'local' | 'visitor';
    const ownGoal = this.newGoalOwnCheckbox.checked;
    const teamForPlayers = this._resolvePlayerTeam(selectedTeam, ownGoal);
    const playerNumber = Number(this.newGoalPlayerSelect.value);
    const players = this._getPlayersForTeam(teamForPlayers, playerNumber);
    const playerExists = players.some(
      p => String(p.number) === this.newGoalPlayerSelect.value,
    );
    if (!playerExists && this.newGoalPlayerSelect) {
      this.newGoalPlayerSelect.value = '';
    }
    if (ownGoal && this.newGoalAssistSelect) {
      this.newGoalAssistSelect.value = '';
    }
    this.goalTeam = teamForPlayers;
    this.activePlayers = players;
    this.assistPlayers =
      selectedTeam && !ownGoal
        ? this._getPlayersForTeam(
            selectedTeam,
            Number(this.newGoalAssistSelect?.value),
          )
        : [];
    const assistExists = this.assistPlayers.some(
      p => String(p.number) === this.newGoalAssistSelect?.value,
    );
    if (!assistExists && this.newGoalAssistSelect) {
      this.newGoalAssistSelect.value = '';
    }
    const playerSelected = this.newGoalPlayerSelect.value;
    const minuteValue = this.newGoalMinuteInput.value;
    const goalType = this.newGoalTypeSelect.value;
    this.disableAddGoalButton =
      !selectedTeam ||
      !playerSelected ||
      !goalType ||
      !minuteValue ||
      isNaN(Number(minuteValue)) ||
      Number(minuteValue) < 0 ||
      Number(minuteValue) > 90;
  }

  private _resolvePlayerTeam(
    selectedTeam: '' | 'local' | 'visitor',
    ownGoal: boolean,
  ): '' | 'local' | 'visitor' {
    if (!selectedTeam) return '';
    if (!ownGoal) return selectedTeam;
    return selectedTeam === 'local' ? 'visitor' : 'local';
  }

  private _getPlayersForTeam(
    side: '' | 'local' | 'visitor',
    currentPlayerNumber?: number,
  ): Player[] {
    const players = [...this._getActivePlayers(side)];
    if (currentPlayerNumber) {
      const list =
        side === 'local' ? this.localPlayers : this.visitorPlayers;
      const existing = list.find(p => p.number === currentPlayerNumber);
      if (existing && !players.some(p => p.number === existing.number)) {
        players.push(existing);
      }
    }
    return players;
  }

  private async _openEditGoal(goal: Goal, index: number) {
    this.editingGoalIndex = index;
    const teamForPlayers = this._resolvePlayerTeam(
      goal.team,
      !!goal.ownGoal,
    );
    this.editActivePlayers = this._getPlayersForTeam(
      teamForPlayers,
      goal.player,
    );
    this.editAssistPlayers = goal.ownGoal
      ? []
      : this._getPlayersForTeam(goal.team, goal.assist);
    await this.updateComplete;
    if (this.editGoalTeamSelect) this.editGoalTeamSelect.value = goal.team;
    if (this.editGoalPlayerSelect)
      this.editGoalPlayerSelect.value = String(goal.player);
    if (this.editGoalMinuteInput)
      this.editGoalMinuteInput.value = String(goal.minute);
    if (this.editGoalOwnCheckbox)
      this.editGoalOwnCheckbox.checked = !!goal.ownGoal;
    if (this.editGoalTypeSelect && goal.goalType)
      this.editGoalTypeSelect.value = goal.goalType;
    if (this.editGoalAssistSelect)
      this.editGoalAssistSelect.value = goal.assist
        ? String(goal.assist)
        : '';
    this._validateEditForm();
    this.editGoalDialog?.show();
  }

  private _closeEditDialog() {
    this.editGoalDialog?.close();
    this.editingGoalIndex = null;
    this.editActivePlayers = [];
    this.editAssistPlayers = [];
    this.disableSaveEditedGoal = true;
  }

  private _validateEditForm() {
    const selectedTeam = this.editGoalTeamSelect?.value as
      | ''
      | 'local'
      | 'visitor';
    const ownGoal = this.editGoalOwnCheckbox?.checked ?? false;
    const teamForPlayers = this._resolvePlayerTeam(selectedTeam, ownGoal);
    this.editActivePlayers = this._getPlayersForTeam(
      teamForPlayers,
      Number(this.editGoalPlayerSelect?.value),
    );
    this.editAssistPlayers =
      selectedTeam && !ownGoal
        ? this._getPlayersForTeam(
            selectedTeam,
            Number(this.editGoalAssistSelect?.value),
          )
        : [];
    const playerSelected = this.editGoalPlayerSelect?.value;
    const playerExists = this.editActivePlayers.some(
      p => String(p.number) === playerSelected,
    );
    if (!playerExists && this.editGoalPlayerSelect) {
      this.editGoalPlayerSelect.value = '';
    }
    if (ownGoal && this.editGoalAssistSelect) {
      this.editGoalAssistSelect.value = '';
    }
    const assistExists = this.editAssistPlayers.some(
      p => String(p.number) === this.editGoalAssistSelect?.value,
    );
    if (!assistExists && this.editGoalAssistSelect) {
      this.editGoalAssistSelect.value = '';
    }
    const goalType = this.editGoalTypeSelect?.value;
    const minuteValue = this.editGoalMinuteInput?.value;
    this.disableSaveEditedGoal =
      !selectedTeam ||
      !playerSelected ||
      !goalType ||
      !minuteValue ||
      isNaN(Number(minuteValue)) ||
      Number(minuteValue) < 0 ||
      Number(minuteValue) > 90;
  }

  private _saveEditedGoal() {
    if (
      this.match === null ||
      this.editingGoalIndex === null ||
      this.editingGoalIndex < 0
    )
      return;
    const team = this.editGoalTeamSelect.value as 'local' | 'visitor';
    const player = Number(this.editGoalPlayerSelect.value);
    const minute = Number(this.editGoalMinuteInput.value);
    const ownGoal = this.editGoalOwnCheckbox.checked;
    const goalType = this.editGoalTypeSelect.value as GoalType;
    const assistValue = this.editGoalAssistSelect.value;
    const assist =
      ownGoal || !assistValue ? undefined : Number(this.editGoalAssistSelect.value);
    const updatedGoal: Goal = {
      team,
      player,
      minute,
      ownGoal,
      goalType,
      assist,
    };
    const goals = [...(this.match.goals || [])];
    goals[this.editingGoalIndex] = updatedGoal;
    this._updateGoals(goals);
    this._closeEditDialog();
  }

  private _deleteGoal(index: number) {
    if (!this.match) return;
    const confirmed = window.confirm(
      '¿Seguro que deseas eliminar este gol?',
    );
    if (!confirmed) return;
    const goals = [...(this.match.goals || [])];
    goals.splice(index, 1);
    this._updateGoals(goals);
  }
}
