import '@material/web/button/filled-button.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/select/outlined-select.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { FirebaseUpdates, Goal, Match, Player } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';

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
      }
    `,
  ];

  @property({ type: Array }) localPlayers: Player[] = [];
  @property({ type: Array }) visitorPlayers: Player[] = [];
  @property({ type: Object }) match: Match | null = null;

  @query('#goalTeam') goalTeamSelect!: MdOutlinedSelect;
  @query('#newGoalPlayer') newGoalPlayerSelect!: MdOutlinedSelect;
  @query('#newGoalMinute') newGoalMinuteInput!: HTMLInputElement;
  @query('#newGoalOwn') newGoalOwnCheckbox!: HTMLInputElement;

  override render() {
    const goals = this.match?.goals || [];
    return html`
      <div class="section card">
        <h3>Goles</h3>
        <div class="lineup">
          <div id="goalsCountLocal">
            <h4>
              Local: ${goals.filter(g => g.team === 'local').length || 0}
            </h4>
            ${goals
              .filter(g => g.team === 'local')
              .map(
                g => html`
                  <div class="goal-entry">
                    <player-info
                      .player=${this.localPlayers.find(
                        p => p.number === g.player,
                      )}
                    ></player-info>
                    <span>${g.ownGoal ? html`<em>(Gol en propia)</em>` : ''}</span>
                    <span>Minuto ${g.minute}</span>
                  </div>
                `,
              )}
          </div>
          <div id="goalsCountVisitor">
            <h4>
              Visitante:
              ${goals.filter(g => g.team === 'visitor').length || 0}
            </h4>
            ${goals
              .filter(g => g.team === 'visitor')
              .map(
                g => html`
                  <div class="goal-entry">
                    <player-info
                      .player=${this.visitorPlayers.find(
                        p => p.number === g.player,
                      )}
                    ></player-info>
                    <span>${g.ownGoal ? html`<em>(Gol en propia)</em>` : ''}</span>
                    <span>Minuto ${g.minute}</span>
                  </div>
                `,
              )}
          </div>
        </div>
        <div>
          <md-outlined-select
            id="goalTeam"
            aria-label="Equipo del gol"
            title="Equipo del gol"
            @change=${() => this.requestUpdate()}
          >
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-outlined-select>
          <md-outlined-select
            id="newGoalPlayer"
            aria-label="Jugador que anotó"
            title="Jugador que anotó"
          >
            ${[...this.localPlayers, ...this.visitorPlayers].map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <input
            aria-label="Minuto del gol"
            type="number"
            inputmode="numeric"
            id="newGoalMinute"
            class="minute-input"
            placeholder="Minuto"
            min="0"
            max="90"
          />
          <label
            ><md-checkbox
              id="newGoalOwn"
              aria-label="Gol en propia puerta"
            ></md-checkbox>
            Autogol
          </label>
          <md-filled-button
            class="action-btn"
            aria-label="Agregar gol"
            title="Agregar gol"
            @click=${this._addGoal}
            ><md-icon>add</md-icon
            ><span class="btn-label">Agregar Gol</span></md-filled-button
          >
        </div>
      </div>
    `;
  }

  private _addGoal() {
    if (!this.match) return;
    const team = this.goalTeamSelect.value as 'local' | 'visitor';
    const player = Number(this.newGoalPlayerSelect.value);
    const minute = Number(this.newGoalMinuteInput.value);
    const ownGoal = this.newGoalOwnCheckbox.checked;
    const newGoal: Goal = { team, player, minute, ownGoal };
    const goals = [...(this.match.goals || []), newGoal];
    this._updateGoals(goals);
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
}
