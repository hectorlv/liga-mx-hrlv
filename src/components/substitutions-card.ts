import '@material/web/icon/icon.js';
import '@material/web/textfield/filled-text-field.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
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
        --md-icon-button-icon-color: var;
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
      .add-substitution-form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        margin-top: 16px;
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
                    <md-icon class="in">arrow_insert</md-icon
                    ><span>Minuto ${sub.minute}</span>
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
                    <md-icon class="in">arrow_insert</md-icon
                    ><span>Minuto ${sub.minute}</span>
                  </div>`,
              )}
          </div>
        </div>
        <div class="add-substitution-form">
          <md-outlined-select
            @change=${() => this.requestUpdate()}
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
          <md-filled-text-field
            aria-label="Minuto del cambio"
            label="Minuto"
            type="number"
            inputmode="numeric"
            id="subMinute"
            class="minute-input"
            min="0"
            max="90"
          ></md-filled-text-field>
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
    const lineupKey = team === 'local' ? 'lineupLocal' : 'lineupVisitor';
    const lineup = [...(this.match[lineupKey] || [])];
    // Actualizar el lineup: marcar el jugador que sale y el que entra
    const outIdx = lineup.findIndex(p => p.number === playerOut);
    if (outIdx !== -1) {
      lineup[outIdx] = {
        ...lineup[outIdx],
        salioDeCambio: true,
      };
    }

    lineup.push({ number: playerIn, entroDeCambio: true });


    this._updateSubstitutions(substitutions, lineupKey, lineup);
    this.subTeamSelect.value = 'local';
    this.subOutSelect.value = '';
    this.subInSelect.value = '';
    this.subMinuteInput.value = '';
  }

  private _updateSubstitutions(substitutions: Substitution[], lineupKey: 'lineupLocal' | 'lineupVisitor', lineup: any[]) {
    if (!this.match) return;
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch['/matches/' + this.match.idMatch + '/substitutions'] =
      substitutions;
    updatedMatch['/matches/' + this.match.idMatch + '/' + lineupKey] = lineup;
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
}
