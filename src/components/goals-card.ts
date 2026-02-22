import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdCheckbox } from '@material/web/checkbox/checkbox.js';
import { MdDialog } from '@material/web/dialog/dialog.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/textfield/filled-text-field.js';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import { GOAL_TYPE_LABELS, GOAL_TYPES } from '../constants';
import {
  FirebaseUpdates,
  Goal,
  GoalType,
  Match,
  Player,
  TeamSide,
  TeamSideOptional,
} from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import { MdRadio } from '@material/web/radio/radio.js';

@customElement('goals-card')
export class GoalsCard extends LitElement {
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

      /* EVENTO GOL */
      .goal-entry {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        transition: background 0.2s;
        gap: 12px;
      }

      .goal-entry:hover {
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
      }

      .goal-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .goal-player {
        display: flex;
        align-items: center;
        width: 100%;
      }

      .goal-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
        margin-top: 4px;
        padding-left: 72px;
      }

      @media (max-width: 600px) {
        .goal-meta {
          padding-left: 0;
        }
      }

      .badge {
        background: var(--md-sys-color-secondary-container);
        color: var(--md-sys-color-on-secondary-container);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
      }

      .own-goal-text {
        color: var(--app-color-danger, #d32f2f);
        font-style: italic;
      }

      .goal-actions {
        display: flex;
        flex-direction: column;
      }

      .goal-actions md-icon-button {
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

      /* FORMULARIO AGREGAR GOL (FOOTER) */
      .add-goal-section {
        padding: 20px;
        background: var(--card-bg);
        border-top: 1px solid var(--md-sys-color-outline-variant);
      }

      .add-goal-header {
        font-size: 1rem;
        font-weight: bold;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-primary);
      }

      .add-goal-form,
      .dialog-form {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: center;
      }

      .add-goal-form > *,
      .dialog-form > * {
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

  @state() goalTeam: TeamSideOptional = '';
  @state() disableAddGoalButton = true;
  @state() activePlayers: Player[] = [];
  @state() assistPlayers: Player[] = [];
  @state() editActivePlayers: Player[] = [];
  @state() editAssistPlayers: Player[] = [];
  @state() disableSaveEditedGoal = true;
  @state() editingGoalIndex: number | null = null;
  @state() goalTeamState: TeamSideOptional = '';
  @state() editGoalTeamState: TeamSideOptional = '';

  @query('#goalTeam') goalTeamSelect!: MdOutlinedSelect;
  @query('#newGoalPlayer') newGoalPlayerSelect!: MdOutlinedSelect;
  @query('#newGoalMinute') newGoalMinuteInput!: MdFilledTextField;
  @query('#newGoalOwn') newGoalOwnCheckbox!: MdCheckbox;
  @query('#newGoalType') newGoalTypeSelect!: MdOutlinedSelect;
  @query('#newGoalAssist') newGoalAssistSelect!: MdOutlinedSelect;
  @query('#addGoalButton') addGoalButton!: MdFilledButton;

  @query('#editGoalDialog') editGoalDialog!: MdDialog;
  @query('#editGoalTeam') editGoalTeamRadios!: NodeListOf<MdRadio>;
  @query('#editGoalPlayer') editGoalPlayerSelect!: MdOutlinedSelect;
  @query('#editGoalMinute') editGoalMinuteInput!: MdFilledTextField;
  @query('#editGoalOwn') editGoalOwnCheckbox!: MdCheckbox;
  @query('#editGoalType') editGoalTypeSelect!: MdOutlinedSelect;
  @query('#editGoalAssist') editGoalAssistSelect!: MdOutlinedSelect;

  override render() {
    const goals = this.match?.goals || [];
    const goalsWithIndex = goals.map((goal, index) => ({ goal, index }));
    const localGoals = goalsWithIndex.filter(
      ({ goal }) => goal.team === 'local',
    );
    const visitorGoals = goalsWithIndex.filter(
      ({ goal }) => goal.team === 'visitor',
    );

    return html`
      <div class="card">
        <div class="section-header">
          <h3><md-icon>sports_score</md-icon> Goles</h3>
        </div>

        <div class="teams-grid">
          <div class="team-column">
            <div class="team-header">
              <span>Local</span>
              <span class="score-pill">${localGoals.length}</span>
            </div>
            ${localGoals.length === 0
              ? html`<div
                  style="padding: 16px; color: gray; text-align: center; font-size: 0.9rem;"
                >
                  Sin goles
                </div>`
              : ''}
            ${localGoals.map(({ goal, index }) =>
              this.renderGoalEntry(goal, index, 'local'),
            )}
          </div>

          <div class="team-column">
            <div class="team-header">
              <span>Visitante</span>
              <span class="score-pill">${visitorGoals.length}</span>
            </div>
            ${visitorGoals.length === 0
              ? html`<div
                  style="padding: 16px; color: gray; text-align: center; font-size: 0.9rem;"
                >
                  Sin goles
                </div>`
              : ''}
            ${visitorGoals.map(({ goal, index }) =>
              this.renderGoalEntry(goal, index, 'visitor'),
            )}
          </div>
        </div>

        <div class="add-goal-section">
          <div class="add-goal-header">
            <md-icon>add_circle</md-icon> Registrar Nuevo Gol
          </div>

          <div class="add-goal-form">
            <div class="radio-group full-width">
              <label
                ><md-radio
                  name="goalTeam"
                  value="local"
                  ?checked=${this.goalTeamState === 'local'}
                  @change=${() => {
                    this.goalTeamState = 'local';
                    this._validateForm();
                  }}
                ></md-radio>
                Local</label
              >
              <label
                ><md-radio
                  name="goalTeam"
                  value="visitor"
                  ?checked=${this.goalTeamState === 'visitor'}
                  @change=${() => {
                    this.goalTeamState = 'visitor';
                    this._validateForm();
                  }}
                ></md-radio>
                Visitante</label
              >
              <label
                style="margin-left: auto; display:flex; align-items:center; gap:4px;"
              >
                <md-checkbox
                  id="newGoalOwn"
                  @change=${this._validateForm}
                ></md-checkbox>
                Autogol
              </label>
            </div>

            <md-filled-text-field
              label="Minuto"
              type="number"
              id="newGoalMinute"
              min="0"
              max="90"
              @change=${this._validateForm}
              required
            ></md-filled-text-field>

            <md-outlined-select
              id="newGoalPlayer"
              label="Anotador"
              @change=${this._validateForm}
              required
            >
              <md-select-option value="" disabled selected></md-select-option>
              ${this.activePlayers.map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>

            <md-outlined-select
              id="newGoalType"
              label="Tipo"
              @change=${this._validateForm}
              required
            >
              <md-select-option value="" disabled selected></md-select-option>
              ${GOAL_TYPES.map(
                o =>
                  html`<md-select-option value=${o.value}
                    >${o.label}</md-select-option
                  >`,
              )}
            </md-outlined-select>

            <md-outlined-select
              id="newGoalAssist"
              label="Asistencia"
              ?disabled=${this.newGoalOwnCheckbox?.checked}
              @change=${this._validateForm}
            >
              <md-select-option value="" selected
                >Sin asistencia</md-select-option
              >
              ${this.assistPlayers.map(
                p =>
                  html`<md-select-option value=${p.number}
                    >${p.name}</md-select-option
                  >`,
              )}
            </md-outlined-select>

            <md-filled-button
              id="addGoalButton"
              ?disabled=${this.disableAddGoalButton}
              @click=${this._addGoal}
            >
              <md-icon slot="icon">add</md-icon> Agregar
            </md-filled-button>
          </div>
        </div>
      </div>

      <md-dialog id="editGoalDialog" type="modal">
        <div slot="headline">Editar gol</div>
        <div slot="content" class="dialog-form">
          <div class="radio-group full-width" style="margin-bottom: 8px;">
            <label
              ><md-radio
                name="editGoalTeam"
                value="local"
                .checked=${this.editGoalTeamState === 'local'}
                @change=${() => {
                  this.editGoalTeamState = 'local';
                  this._validateEditForm();
                }}
              ></md-radio>
              Local</label
            >
            <label
              ><md-radio
                name="editGoalTeam"
                value="visitor"
                .checked=${this.editGoalTeamState === 'visitor'}
                @change=${() => {
                  this.editGoalTeamState = 'visitor';
                  this._validateEditForm();
                }}
              ></md-radio>
              Visitante</label
            >
            <label
              style="margin-left: auto; display:flex; align-items:center; gap:4px;"
            >
              <md-checkbox
                id="editGoalOwn"
                @change=${this._validateEditForm}
              ></md-checkbox>
              Autogol
            </label>
          </div>

          <md-filled-text-field
            label="Minuto"
            type="number"
            id="editGoalMinute"
            min="0"
            max="90"
            @change=${this._validateEditForm}
            required
          ></md-filled-text-field>

          <md-outlined-select
            id="editGoalPlayer"
            label="Anotador"
            @change=${this._validateEditForm}
            required
          >
            ${this.editActivePlayers.map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>

          <md-outlined-select
            id="editGoalType"
            label="Tipo"
            @change=${this._validateEditForm}
          >
            ${GOAL_TYPES.map(
              o =>
                html`<md-select-option value=${o.value}
                  >${o.label}</md-select-option
                >`,
            )}
          </md-outlined-select>

          <md-outlined-select
            id="editGoalAssist"
            label="Asistencia"
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
        </div>
        <div slot="actions">
          <md-filled-button class="action-btn" @click=${this._closeEditDialog}
            >Cancelar</md-filled-button
          >
          <md-filled-button
            @click=${this._saveEditedGoal}
            ?disabled=${this.disableSaveEditedGoal}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  // Método auxiliar para limpiar el render principal
  private renderGoalEntry(goal: Goal, index: number, cardSide: TeamSide) {
    // Si es autogol, el jugador pertenece al equipo contrario
    const ownGoalPlayerPool =
      cardSide === 'local' ? this.visitorPlayers : this.localPlayers;
    const regularPlayerPool =
      cardSide === 'local' ? this.localPlayers : this.visitorPlayers;
    const playerPool = goal.ownGoal ? ownGoalPlayerPool : regularPlayerPool;

    // El asistente siempre es del mismo equipo que recibe el gol a favor (si no es autogol)
    const assistPool =
      cardSide === 'local' ? this.localPlayers : this.visitorPlayers;

    const playerInfo = playerPool.find(p => p.number === goal.player);
    const assistInfo = assistPool.find(p => p.number === goal.assist);

    return html`
      <div class="goal-entry">
        <div class="minute-bubble">${goal.minute}'</div>

        <div class="goal-info">
          <div class="goal-player">
            <player-info
              .player=${playerInfo || { name: `#${goal.player}` }}
            ></player-info>
          </div>

          <div class="goal-meta">
            <md-icon style="font-size: 18px; color: var(--md-sys-color-primary)"
              >sports_soccer</md-icon
            >
            ${goal.ownGoal
              ? html`<span class="own-goal-text">(Autogol)</span>`
              : ''}
            ${goal.goalType
              ? html`<span class="badge"
                  >${GOAL_TYPE_LABELS[goal.goalType]}</span
                >`
              : ''}
            ${goal.assist
              ? html`<span>A: ${assistInfo?.name || goal.assist}</span>`
              : ''}
          </div>
        </div>

        <div class="goal-actions">
          <md-icon-button
            @click=${() => this._openEditGoal(goal, index)}
            title="Editar"
            ><md-icon class="edit-btn">edit</md-icon></md-icon-button
          >
          <md-icon-button
            @click=${() => this._deleteGoal(index)}
            title="Eliminar"
            ><md-icon class="delete-btn">delete</md-icon></md-icon-button
          >
        </div>
      </div>
    `;
  }

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

  private _addGoal() {
    if (!this.match) return;
    const team = this.goalTeamState as TeamSide;
    const player = Number(this.newGoalPlayerSelect.value);
    const minute = Number(this.newGoalMinuteInput.value);
    const ownGoal = this.newGoalOwnCheckbox.checked;
    const goalType = this.newGoalTypeSelect.value as GoalType;
    const assistValue = this.newGoalAssistSelect.value;
    const assist =
      ownGoal || !assistValue ? null : Number(this.newGoalAssistSelect.value);
    const newGoal: Goal = { team, player, minute, ownGoal, goalType, assist };
    const goals = [...(this.match.goals || []), newGoal];
    this._updateGoals(goals);

    // Reset form
    this.goalTeamState = '';
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
    const selectedTeam = this.goalTeamState as TeamSide;
    const ownGoal = this.newGoalOwnCheckbox?.checked ?? false;
    const teamForPlayers =
      selectedTeam && ownGoal
        ? this._resolvePlayerTeam(selectedTeam, ownGoal)
        : selectedTeam;
    const playerNumber = Number(this.newGoalPlayerSelect?.value);

    const players = teamForPlayers
      ? this._getPlayersForTeam(teamForPlayers, playerNumber)
      : [];
    const playerExists = players.some(
      p => String(p.number) === this.newGoalPlayerSelect?.value,
    );

    if (!playerExists && this.newGoalPlayerSelect)
      this.newGoalPlayerSelect.value = '';
    if (ownGoal && this.newGoalAssistSelect)
      this.newGoalAssistSelect.value = '';

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
    if (!assistExists && this.newGoalAssistSelect)
      this.newGoalAssistSelect.value = '';

    const playerSelected = this.newGoalPlayerSelect?.value;
    const minuteValue = this.newGoalMinuteInput?.value;
    const goalType = this.newGoalTypeSelect?.value;

    this.disableAddGoalButton =
      !selectedTeam ||
      !playerSelected ||
      !goalType ||
      !minuteValue ||
      Number.isNaN(Number(minuteValue)) ||
      Number(minuteValue) < 0 ||
      Number(minuteValue) > 120;
  }

  private _resolvePlayerTeam(
    selectedTeam: TeamSide,
    ownGoal: boolean,
  ): TeamSide {
    if (!ownGoal) return selectedTeam;
    return selectedTeam === 'local' ? 'visitor' : 'local';
  }

  private _getPlayersForTeam(
    side: TeamSide,
    currentPlayerNumber?: number | null,
  ): Player[] {
    const players = [...this._getActivePlayers(side)];
    if (currentPlayerNumber) {
      const list = side === 'local' ? this.localPlayers : this.visitorPlayers;
      const existing = list.find(p => p.number === currentPlayerNumber);
      if (existing && !players.some(p => p.number === existing.number)) {
        players.push(existing);
      }
    }
    return players;
  }

  private async _openEditGoal(goal: Goal, index: number) {
    this.editingGoalIndex = index;
    const teamForPlayers = this._resolvePlayerTeam(goal.team, !!goal.ownGoal);
    this.editActivePlayers = this._getPlayersForTeam(
      teamForPlayers,
      goal.player,
    );
    this.editAssistPlayers = goal.ownGoal
      ? []
      : this._getPlayersForTeam(goal.team, goal.assist);

    await this.updateComplete;
    if (this.editGoalTeamRadios) {
      this.editGoalTeamRadios.forEach(radio => {
        if (radio.value === goal.team) {
          radio.checked = true;
        }
      });
    }
    this.editGoalTeamState = goal.team;
    if (this.editGoalPlayerSelect)
      this.editGoalPlayerSelect.value = String(goal.player);
    if (this.editGoalMinuteInput)
      this.editGoalMinuteInput.value = String(goal.minute);
    if (this.editGoalOwnCheckbox)
      this.editGoalOwnCheckbox.checked = !!goal.ownGoal;
    if (this.editGoalTypeSelect && goal.goalType)
      this.editGoalTypeSelect.value = goal.goalType;
    if (this.editGoalAssistSelect)
      this.editGoalAssistSelect.value = goal.assist ? String(goal.assist) : '';

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
    const selectedTeam = this.editGoalTeamState as TeamSide;
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
    if (!playerExists && this.editGoalPlayerSelect)
      this.editGoalPlayerSelect.value = '';
    if (ownGoal && this.editGoalAssistSelect)
      this.editGoalAssistSelect.value = '';

    const minuteValue = this.editGoalMinuteInput?.value;
    const goalType = this.editGoalTypeSelect?.value;

    this.disableSaveEditedGoal =
      !selectedTeam ||
      !playerSelected ||
      !goalType ||
      !minuteValue ||
      Number.isNaN(Number(minuteValue)) ||
      Number(minuteValue) < 0 ||
      Number(minuteValue) > 120;
  }

  private _saveEditedGoal() {
    if (this.editingGoalIndex === null || !this.match) return;
    const team = this.editGoalTeamState as TeamSide;
    const player = Number(this.editGoalPlayerSelect.value);
    const minute = Number(this.editGoalMinuteInput.value);
    const ownGoal = this.editGoalOwnCheckbox.checked;
    const goalType = this.editGoalTypeSelect.value as GoalType;
    const assistValue = this.editGoalAssistSelect.value;
    const assist =
      ownGoal || !assistValue ? null : Number(this.editGoalAssistSelect.value);

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
    const confirmed = globalThis.confirm(
      '¿Seguro que deseas eliminar este gol?',
    );
    if (!confirmed) return;
    const goals = [...(this.match.goals || [])];
    goals.splice(index, 1);
    this._updateGoals(goals);
  }
}
