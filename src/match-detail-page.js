import { LitElement, html, css } from 'lit';
import { formatDateDDMMYYYY } from './dateUtils';
import { getTeamImage } from './imageUtils';
import styles from './liga-mx-hrlv-styles.js';
import '@material/web/checkbox/checkbox.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';

class MatchDetailPage extends LitElement {
  static properties = {
    match: { type: Object },
    players: { type: Array },
    teams: { type: Array },
    localPlayers: { type: Array },
    visitorPlayers: { type: Array },
  };
  static get styles() {
    return [
      styles,
      css`
        :host {
          display: block;
          padding: 16px;
        }
        h2,
        h3,
        h4 {
          margin: 0;
        }
        .section {
          margin-top: 16px;
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
          flex: 0 0 auto;
          margin: auto 0;
        }
        @media (max-width: 600px) {
          .lineup {
            grid-template-columns: 1fr;
          }
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 4px;
        }
        .minute-input {
          width: 5ch;
          min-width: 5ch;
          max-width: 5ch;
          text-align: center;
        }
      `,
    ];
  }
  constructor() {
    super();
    this.match = {};
    this.players = [];
    this.teams = [];
    this.localPlayers = [];
    this.visitorPlayers = [];
  }

  _updatePlayerLists() {
    if (!this.match || !this.teams.length) return;
    this.localPlayers =
      this.players[this.match.local.replaceAll('.', '')] || [];
    this.visitorPlayers =
      this.players[this.match.visitante.replaceAll('.', '')] || [];
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
      lineupLocal = [],
      lineupVisitor = [],
      goals = [],
      substitutions = [],
      cards = [],
    } = this.match;

    const side = this.shadowRoot?.getElementById('subTeam')?.value || 'local';
    const cardSide =
      this.shadowRoot?.getElementById('cardTeam')?.value || 'local';
    const goalSide =
      this.shadowRoot?.getElementById('goalTeam')?.value || 'local';

    return html`
      <h2>
        ${getTeamImage(local)} ${local} vs ${visitante}
        ${getTeamImage(visitante)}
      </h2>
      <button @click=${this._goBack}>Volver</button>
      <p>
        <strong>Fecha:</strong> ${formatDateDDMMYYYY(fecha)} &nbsp;|&nbsp;
        <strong>Hora:</strong> ${hora} &nbsp;|&nbsp;
        <strong>Estadio:</strong> ${estadio}
      </p>

      <div class="section">
        <h3>Alineación Inicial</h3>
        <div class="lineup">
          <div>
            <h4>Local</h4>
            ${this.localPlayers.map(
              player => html`
                <div class="player-row">
                  <md-checkbox
                    id="lineupLocal-${player.number}"
                    .checked=${lineupLocal.includes(player.number)}
                    @change=${e =>
                      this._onLineupChange(e, 'local', player.number)}
                  ></md-checkbox>
                  <img src=${player.imgSrc} alt=${player.name} width="30" />
                  <span>${player.number} ${player.name}</span>
                </div>
              `,
            )}
          </div>
          <div>
            <h4>Visitante</h4>
            ${this.visitorPlayers.map(
              player => html`
                <div class="player-row">
                  <md-checkbox
                    id="lineupVisitor-${player.number}"
                    .checked=${lineupVisitor.includes(player.number)}
                    @change=${e =>
                      this._onLineupChange(e, 'visitor', player.number)}
                  ></md-checkbox>
                  <img src=${player.imgSrc} alt=${player.name} width="30" />
                  <span>${player.number} ${player.name}</span>
                </div>
              `,
            )}
          </div>
        </div>
        <button @click=${() => this.updateLineupLocal(lineupLocal)}>
          Guardar Local
        </button>
        <button @click=${() => this.updateLineupVisitor(lineupVisitor)}>
          Guardar Visitor
        </button>
      </div>

      <div class="section">
        <h3>Goles (${goals.length})</h3>
        <ul>
          ${goals.map(
            g => html`
              <li>
                ${this._getPlayerName(g.playerId)}
                ${g.ownGoal ? html`<em>(Gol en propia)</em>` : ''} &mdash;
                Minuto ${g.minute}
              </li>
            `,
          )}
        </ul>
        <div>
          <md-filled-select id="goalTeam" @change=${() => this.requestUpdate()}>
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-filled-select>
          <md-filled-select id="newGoalPlayer">
            ${[...this.localPlayers, ...this.visitorPlayers].map(
              p => html`<md-select-option value=${p.id}>${p.name}</md-select-option>`,
            )}
          </md-filled-select>
          <input
            type="number"
            inputmode="numeric"
            id="newGoalMinute"
            class="minute-input"
            placeholder="Minuto"
            min="0"
            max="90"
          />
          <label><md-checkbox id="newGoalOwn"></md-checkbox> Autogol </label>
          <button @click=${this._addGoal}>Agregar Gol</button>
        </div>
      </div>

      <div class="section">
        <h3>Cambios (${substitutions.length})</h3>
        <ul>
          ${substitutions.map(
            s => html`
              <li>
                <strong>${s.teamId}</strong>:
                ${this._getPlayerName(s.playerOutId)} &rarr;
                ${this._getPlayerName(s.playerInId)} &mdash; Minuto ${s.minute}
              </li>
            `,
          )}
        </ul>
        <div>
          <md-filled-select id="subTeam" @change=${() => this.requestUpdate()}>
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-filled-select>
          <md-filled-select id="subOut">
            ${(side === 'local' ? this.localPlayers : this.visitorPlayers).map(
              p => html`<md-select-option value=${p.id}>${p.name}</md-select-option>`,
            )}
          </md-filled-select>
          <md-filled-select id="subIn">
            ${(side === 'local' ? this.localPlayers : this.visitorPlayers).map(
              p => html`<md-select-option value=${p.id}>${p.name}</md-select-option>`,
            )}
          </md-filled-select>
          <input
            type="number"
            inputmode="numeric"
            id="subMinute"
            class="minute-input"
            placeholder="Minuto"
            min="0"
            max="90"
          />
          <button @click=${this._addSub}>Agregar cambio</button>
        </div>
      </div>

      <div class="section">
        <h3>Tarjetas (${cards.length})</h3>
        <ul>
          ${cards.map(
            c => html`
              <li>
                <strong>${c.teamId}</strong>: ${this._getPlayerName(c.playerId)}
                &mdash; Minuto ${c.minute} —
                <em>${c.cardType.toUpperCase()}</em>
              </li>
            `,
          )}
        </ul>
        <div>
          <md-filled-select id="cardTeam" @change=${() => this.requestUpdate()}>
            <md-select-option value="local">Local</md-select-option>
            <md-select-option value="visitor">Visitante</md-select-option>
          </md-filled-select>
          <md-filled-select id="cardPlayer">
            ${(cardSide === 'local'
              ? this.localPlayers
              : this.visitorPlayers
            ).map(p => html`<md-select-option value=${p.id}>${p.name}</md-select-option>`)}
          </md-filled-select>
          <input
            type="number"
            inputmode="numeric"
            id="cardMinute"
            class="minute-input"
            placeholder="Minuto"
            min="0"
            max="90"
          />
          <md-filled-select id="cardType">
            <md-select-option value="yellow">Amarilla</md-select-option>
            <md-select-option value="red">Roja</md-select-option>
          </md-filled-select>
          <button @click=${this._addCard}>Agregar Tarjeta</button>
        </div>
      </div>
    `;
  }

  _onLineupChange(e, side, playerId) {
    const key = side === 'local' ? 'lineupLocal' : 'lineupVisitor';
    const lineup = [...(this.match[key] || [])];
    if (e.target.checked) {
      if (!lineup.includes(playerId)) lineup.push(playerId);
    } else {
      const idx = lineup.indexOf(playerId);
      if (idx !== -1) lineup.splice(idx, 1);
    }
    this.match = { ...this.match, [key]: lineup };
  }

  _addGoal() {
    const side = this.shadowRoot.getElementById('goalTeam').value;
    const playerId = this.shadowRoot.getElementById('newGoalPlayer').value;
    const minute = Number(
      this.shadowRoot.getElementById('newGoalMinute').value,
    );
    const ownGoal = this.shadowRoot.getElementById('newGoalOwn').checked;
    const goals = [
      ...(this.match.goals || []),
      { side, playerId, minute, ownGoal },
    ];
    this._updateGoals(goals);
  }

  _addSub() {
    const side = this.shadowRoot.getElementById('subTeam').value;
    const teamKey = side === 'local' ? 'localTeamId' : 'visitorTeamId';
    const playerOutId = this.shadowRoot.getElementById('subOut').value;
    const playerInId = this.shadowRoot.getElementById('subIn').value;
    const minute = Number(this.shadowRoot.getElementById('subMinute').value);
    const substitutions = [
      ...(this.match.substitutions || []),
      { teamId: this.match[teamKey], playerOutId, playerInId, minute },
    ];
    this._updateSubstitutions(substitutions);
  }

  _addCard() {
    const side = this.shadowRoot.getElementById('cardTeam').value;
    const teamId =
      side === 'local' ? this.match.localTeamId : this.match.visitorTeamId;
    const playerId = this.shadowRoot.getElementById('cardPlayer').value;
    const minute = Number(this.shadowRoot.getElementById('cardMinute').value);
    const cardType = this.shadowRoot.getElementById('cardType').value;
    const cards = [
      ...(this.match.cards || []),
      { teamId, playerId, minute, cardType },
    ];
    this._updateCards(cards);
  }

  _updateGoals(goals) {}

  _goBack() {
    this.dispatchEvent(
      new CustomEvent('back-to-calendar', { bubbles: true, composed: true }),
    );
  }
}

customElements.define('match-detail-page', MatchDetailPage);
