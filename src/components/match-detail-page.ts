import { LitElement, html, css } from 'lit';
import { formatDateDDMMYYYY } from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  Card,
  Goal,
  Match,
  Player,
  PlayerTeam,
  Substitution,
  Team,
} from '../app/types/index.js';
import { MdOutlinedSelect } from '@material/web/select/outlined-select.js';
import { MdCheckbox } from '@material/web/checkbox/checkbox.js';

@customElement('match-detail-page')
export class MatchDetailPage extends LitElement {
  static styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
      }

      /* Player rows and lineup layout are specific to this component */
      .player-row:hover,
      .player-row:focus-within {
        background: rgba(0, 0, 0, 0.03);
        outline: none;
      }
      .player-row.selected {
        background: rgba(var(--color-primary-rgb), 0.08);
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
      .player-row {
        display: flex;
        align-items: center;
        width: 100%;
        padding: 6px 8px;
        box-sizing: border-box;
        justify-content: start;
        gap: 10px;
        cursor: pointer;
      }
      .player-row md-checkbox {
        flex: 0 0 auto;
        width: 16px;
        height: 16px;
        margin: auto 0;
      }
      .player-row img {
        flex: 0 0 auto;
        width: 60px;
        height: auto;
        object-fit: contain;
      }
      .player-row span {
        flex: 1 1 auto;
        min-width: 0;
        margin: auto 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @media (max-width: 600px) {
        .lineup {
          grid-template-columns: 1fr;
        }
      }

      .minute-input {
        width: 5ch;
        min-width: 5ch;
        max-width: 5ch;
        text-align: center;
      }
    `,
  ];

  @property({ type: Object }) match: Match = null;
  @property({ type: Object }) players: PlayerTeam = new Map();
  @property({ type: Array }) teams: Team[] = [];
  @state() localPlayers: Player[] = [];
  @state() visitorPlayers: Player[] = [];

  @query('subTeam') subTeamSelect: MdOutlinedSelect;
  @query('cardTeam') cardTeamSelect: MdOutlinedSelect;
  @query('goalTeam') goalTeamSelect: MdOutlinedSelect;
  @query('newGoalPlayer') newGoalPlayerSelect: MdOutlinedSelect;
  @query('newGoalMinute') newGoalMinuteInput: HTMLInputElement;
  @query('newGoalOwn') newGoalOwnCheckbox: HTMLInputElement;
  @query('subOut') subOutSelect: MdOutlinedSelect;
  @query('subIn') subInSelect: MdOutlinedSelect;
  @query('subMinute') subMinuteInput: HTMLInputElement;
  @query('cardplayer') cardPlayerSelect: MdOutlinedSelect;
  @query('cardminute') cardMinuteInput: HTMLInputElement;
  @query('cardtype') cardTypeSelect: MdOutlinedSelect;

  private _updatePlayerLists() {
    if (!this.match || !this.teams.length) return;
    this.localPlayers =
      this.players.get(this.match.local.replaceAll('.', '')) || [];
    this.visitorPlayers = 
      this.players.get(this.match.visitante.replaceAll('.', '')) || [];
    // Cambiar el dominio de las imágenes por https://cldrsrcs.apilmx.com/v1/media/wpagephotos/76/1/
    this.localPlayers = this.localPlayers.map(player => {
      return {
        ...player,
        imgSrc: player.imgSrc.replace(
          'https://s3.amazonaws.com/lmxwebsite/media/wpagephotos/75/2/',
          'https://cldrsrcs.apilmx.com/v1/media/wpagephotos/76/1/',
        ),
      };
    });
    this.visitorPlayers = this.visitorPlayers.map(player => {
      return {
        ...player,
        imgSrc: player.imgSrc.replace(
          'https://s3.amazonaws.com/lmxwebsite/media/wpagephotos/75/2/',
          'https://cldrsrcs.apilmx.com/v1/media/wpagephotos/76/1/',
        ),
      };
    });
  }

  render() {
    if (!this.match) {
      return html`<p>Cargando detalles del partido</p>`;
    }
    this._updatePlayerLists();

    const {
      local,
      visitante,
      fecha,
      hora,
      estadio,
      lineupLocal,
      lineupVisitor,
      goals,
      substitutions,
      cards,
    } = this.match;

    const side = this.subTeamSelect?.value || 'local';
    const cardSide = this.cardTeamSelect?.value || 'local';
    const goalSide = this.goalTeamSelect?.value || 'local';

    return html`
      <h2>
        ${getTeamImage(local)} ${local} vs ${visitante}
        ${getTeamImage(visitante)}
      </h2>
      <md-icon-button @click=${this._goBack} title="Volver" aria-label="Volver">
        <md-icon>arrow_back</md-icon>
      </md-icon-button>
      <p>
        <strong>Fecha:</strong> ${formatDateDDMMYYYY(fecha as Date)}
        &nbsp;|&nbsp; <strong>Hora:</strong> ${hora} &nbsp;|&nbsp;
        <strong>Estadio:</strong> ${estadio}
      </p>

      <div class="section card">
        <h3>Alineación Inicial</h3>
        <div class="lineup">
          <div>
            <h4>Local</h4>
            ${this.localPlayers.map(
              player => html`
                <div
                  class="${`player-row ${lineupLocal?.includes(player.number) ? 'selected' : ''}`}"
                  role="button"
                  tabindex="0"
                  aria-label="Jugador ${player.number} ${player.name} — alternar alineación local"
                  aria-pressed="${lineupLocal?.includes(player.number)
                    ? 'true'
                    : 'false'}"
                  @click=${() => this._toggleRow('local', player.number)}
                  @keydown=${(e: KeyboardEvent) =>
                    this._onRowKeydown(e, 'local', player.number)}
                >
                  <md-checkbox
                    id="lineupLocal-${player.number}"
                    aria-label="Incluir ${player.name} en alineación local"
                    .checked=${lineupLocal?.includes(player.number)}
                    @change=${(e: Event) =>
                      this._onLineupChange(e, 'local', player.number)}
                  ></md-checkbox>
                  <img src=${player.imgSrc} alt=${player.name} width="60" />
                  <span>${player.number} ${player.name}</span>
                </div>
              `,
            )}
          </div>
          <div>
            <h4>Visitante</h4>
            ${this.visitorPlayers.map(
              player => html`
                <div
                  class="${`player-row ${lineupVisitor?.includes(player.number) ? 'selected' : ''}`}"
                  role="button"
                  tabindex="0"
                  aria-label="Jugador ${player.number} ${player.name} — alternar alineación visitante"
                  aria-pressed="${lineupVisitor?.includes(player.number)
                    ? 'true'
                    : 'false'}"
                  @click=${() => this._toggleRow('visitor', player.number)}
                  @keydown=${(e: KeyboardEvent) =>
                    this._onRowKeydown(e, 'visitor', player.number)}
                >
                  <md-checkbox
                    id="lineupVisitor-${player.number}"
                    aria-label="Incluir ${player.name} en alineación visitante"
                    .checked=${lineupVisitor?.includes(player.number)}
                    @change=${(e: Event) =>
                      this._onLineupChange(e, 'visitor', player.number)}
                  ></md-checkbox>
                  <img src=${player.imgSrc} alt=${player.name} width="60" />
                  <span>${player.number} ${player.name}</span>
                </div>
              `,
            )}
          </div>
        </div>
        <md-filled-button
          class="action-btn"
          aria-label="Guardar alineación local"
          title="Guardar alineación local"
          @click=${() => this.updateLineupLocal(lineupLocal)}
        >
          <md-icon>save</md-icon>
          <span class="btn-label">Guardar Local</span>
        </md-filled-button>
        <md-filled-button
          class="action-btn"
          aria-label="Guardar alineación visitante"
          title="Guardar alineación visitante"
          @click=${() => this.updateLineupVisitor(lineupVisitor)}
        >
          <md-icon>save</md-icon>
          <span class="btn-label">Guardar Visitante</span>
        </md-filled-button>
      </div>

      <div class="section card">
        <h3>Goles (${goals?.length})</h3>
        <ul>
          ${goals?.map(
            g => html`
              <li>
                ${this._getPlayerName(g.player)}
                ${g.ownGoal ? html`<em>(Gol en propia)</em>` : ''} &mdash;
                Minuto ${g.minute}
              </li>
            `,
          )}
        </ul>
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

      <div class="section card">
        <h3>Cambios (${substitutions?.length || 0})</h3>
        <ul>
          ${substitutions?.map(
            s => html`
              <li>
                <strong>${s.team}</strong>: ${this._getPlayerName(s.playerOut)}
                &rarr; ${this._getPlayerName(s.playerIn)} &mdash; Minuto
                ${s.minute}
              </li>
            `,
          )}
        </ul>
        <div>
          <md-outlined-select
            id="subTeam"
            aria-label="Equipo del cambio"
            title="Equipo del cambio"
            @change=${() => this.requestUpdate()}
          >
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

      <div class="section card">
        <h3>Tarjetas (${cards?.length || 0})</h3>
        <ul>
          ${cards?.map(
            c => html`
              <li>
                <strong>${c.team}</strong>: ${this._getPlayerName(c.player)}
                &mdash; Minuto ${c.minute} —
                <em>${c.cardType.toUpperCase()}</em>
              </li>
            `,
          )}
        </ul>
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
  private _getPlayerName(playerId: string): unknown {
    throw new Error('Method not implemented.');
  }

  private updateLineupVisitor(lineupVisitor: string[]) {
    throw new Error('Method not implemented.');
  }
  private updateLineupLocal(lineupLocal: string[]) {
    throw new Error('Method not implemented.');
  }

  private _onLineupChange(e, side, playerId) {
    const key = side === 'local' ? 'lineupLocal' : 'lineupVisitor';
    const lineup = [...(this.match[key] || [])];
    if (e.target.checked) {
      if (!lineup.includes(playerId)) lineup.push(playerId);
    } else {
      const idx = lineup.indexOf(playerId);
      if (idx !== -1) lineup.splice(idx, 1);
    }
    this.match = { ...this.match, [key]: lineup };
    // Visual feedback: toggle selected class on the row containing the checkbox
    try {
      const cb = e.target;
      const row = cb && cb.closest ? cb.closest('.player-row') : null;
      if (row) {
        if (cb.checked) {
          row.classList.add('selected');
          row.setAttribute('aria-pressed', 'true');
        } else {
          row.classList.remove('selected');
          row.setAttribute('aria-pressed', 'false');
        }
      }
    } catch (err) {
      // ignore if DOM operations fail
    }
  }

  private _addGoal() {
    const team = this.goalTeamSelect.value as 'local' | 'visitor';
    const player = this.newGoalPlayerSelect.value;
    const minute = Number(this.newGoalMinuteInput.value);
    const ownGoal = this.newGoalOwnCheckbox.checked;
    const newGoal: Goal = { team, player, minute, ownGoal };
    const goals = [...(this.match.goals || []), newGoal];
    this._updateGoals(goals);
  }

  private _addSub() {
    const team = this.subTeamSelect.value as 'local' | 'visitor';
    const playerOut = this.subOutSelect.value;
    const playerIn = this.subInSelect.value;
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

  private _addCard() {
    const team = this.cardTeamSelect.value as 'local' | 'visitor';
    const player = this.cardPlayerSelect.value;
    const minute = Number(this.cardMinuteInput.value);
    const cardType = this.cardTypeSelect.value as 'yellow' | 'red';
    const newCard: Card = { team, player, minute, cardType };
    const cards = [...(this.match.cards || []), newCard];
    this._updateCards(cards);
  }

  private _updateGoals(goals: Goal[]) {
    throw new Error('Method not implemented.');
  }

  private _updateSubstitutions(substitutions: Substitution[]) {
    throw new Error('Method not implemented.');
  }

  private _updateCards(cards: Card[]) {
    throw new Error('Method not implemented.');
  }

  private _toggleRow(side: 'local' | 'visitor', playerNumber: string) {
    // Evita interferir si el click fue directamente en el checkbox
    const checkboxId =
      side === 'local'
        ? `lineupLocal-${playerNumber}`
        : `lineupVisitor-${playerNumber}`;
    const cb = this.shadowRoot?.getElementById(checkboxId) as MdCheckbox;
    if (!cb) return;
    cb.checked = !cb.checked;
    // Generar un objeto de evento mínimo para reutilizar la lógica existente
    this._onLineupChange({ target: cb }, side, playerNumber);
  }

  private _onRowKeydown(e : KeyboardEvent, side: 'local' | 'visitor', playerNumber: string) {
    const key = e.key;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      this._toggleRow(side, playerNumber);
    }
  }

  private _goBack() {
    this.dispatchEvent(
      new CustomEvent('back-to-calendar', { bubbles: true, composed: true }),
    );
  }
}
