import '@material/web/icon/icon.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import { css, html, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import '../components/player-info.js';
import { FirebaseUpdates, Match, Player, Substitution } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';

@customElement('substitutions-card')
export class SubstitutionsCard extends LitElement {
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
      .substitution-entry {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .out {
        color: orange;
      }
      .in {
        color: green;
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
        .substitution-entry > *:nth-child(2) {
          display: inline-block;
        }

        .substitution-entry > *:nth-child(3),
        .substitution-entry > *:nth-child(4),
        .substitution-entry > *:nth-child(5) {
          display: inline-block;
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

  @query('#subTeam') subTeamSelect!: MdOutlinedSelect;
  @query('#subOut') subOutSelect!: MdOutlinedSelect;
  @query('#subIn') subInSelect!: MdOutlinedSelect;
  @query('#subMinute') subMinuteInput!: HTMLInputElement;

  override render() {
    const substitutions = this.match?.substitutions || [];
    const side = this.subTeamSelect?.value || 'local';
    return html`
      <div class="section card">
        <h3>Cambios (${substitutions.length || 0})</h3>
        <div class="lineup">
          <div>
            <h4>Local</h4>
            ${substitutions
              .filter(sub => sub.team === 'local')
              .map(
                sub => html`
                  <div class="substitution-entry">
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
                    <md-icon class="in">arrow_insert</md-icon><span>Minuto ${sub.minute}</span>
                  </div>
                `,
              )}
          </div>
          <div>
            <h4>Visitante</h4>
            ${substitutions
              .filter(sub => sub.team === 'visitor')
              .map(
                sub =>
                  html`<div class="substitution-entry">
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
                    <md-icon class="in">arrow_insert</md-icon><span>Minuto ${sub.minute}</span>
                  </div>`
              )}
          </div>
        </div>
        <div>
          <md-outlined-select @change=${() => this.requestUpdate()} id="subTeam" aria-label="Equipo del cambio" title="Equipo del cambio">
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-outlined-select>
          <md-outlined-select
            id="subOut"
            aria-label="Jugador que sale"
            title="Jugador que sale"
          >
            ${(side === 'local' ? this.localPlayers : this.visitorPlayers).map(
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
          >
            ${(side === 'local' ? this.localPlayers : this.visitorPlayers).map(
              p =>
                html`<md-select-option value=${p.number}
                  >${p.name}</md-select-option
                >`,
            )}
          </md-outlined-select>
          <input
            aria-label="Minuto del cambio"
            type="number"
            inputmode="numeric"
            id="subMinute"
            class="minute-input"
            placeholder="Minuto"
            min="0"
            max="90"
          />
          <md-filled-button
            class="action-btn"
            aria-label="Agregar cambio"
            title="Agregar cambio"
            @click=${this._addSub}
            ><md-icon>swap_horiz</md-icon
            ><span class="btn-label">Agregar cambio</span></md-filled-button
          >
        </div>
      </div>
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
    const substitutions = [
      ...(this.match.substitutions || []),
      newSubstitution,
    ];
    this._updateSubstitutions(substitutions);
  }

  private _updateSubstitutions(substitutions: Substitution[]) {
    if (!this.match) return;
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch['/matches/' + this.match.idMatch + '/substitutions'] =
      substitutions;
    this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
    this.requestUpdate();
  }
}
