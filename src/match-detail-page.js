import { LitElement, html, css } from 'lit';
import { formatDateDDMMYYYY } from './dateUtils';
import { getTeamImage } from './imageUtils';

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
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }
        ul {
          padding-left: 20px;
        }
        li {
          margin-bottom: 4px;
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
    if (this.match || !this.teams.length) return;
    const localTeam = this.teams.find(t => t.name === this.match.local);
    const visitorTeam = this.teams.find(t => t.name === this.match.visitante);
    this.localPlayers = localTeam?.players || [];
    this.visitorPlayers = visitorTeam?.players || [];
  }

  render() {
    if (!this.match) {
      return html`<p>Cargando detalles del partido</p>`;
    }

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
                <label>
                  <input
                    type="checkbox"
                    .checked=${lineupLocal.includes(player.id)}
                    @change=${e => this._onLineupChange(e, 'local', player.id)}
                  />
                  ${player.name}
                </label>
              `,
            )}
          </div>
          <div>
            <h4>Visitante</h4>
            ${this.visitorPlayers.map(
              player => html`
                <label>
                  <input
                    type="checkbox"
                    .checked=${lineupVisitor.includes(player.id)}
                    @change=${e =>
                      this._onLineupChange(e, 'visitor', player.id)}
                  />
                  ${player.name}
                </label>
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
          <select id="goalTeam" @change=${() => this.requestUpdate()}>
            <option value="local">Local</option>
            <option value="visitor">Visitante</option>
          </select>
          <select id="newGoalPlayer">
            ${[...this.localPlayers, ...this.visitorPlayers].map(
              p => html`<option value=${p.id}>${p.name}</option>`,
            )}
          </select>
          <input type="number" id="newGoalMinute" placeholder="Minuto" />
          <label><input type="checkbox" id="newGoalOwn" /> Autogol </label>
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
          <select id="subTeam" @change=${() => this.requestUpdate()}>
            <option value="local">Local</option>
            <option value="visitor">Visitante</option>
          </select>
          <select id="subOut">
            ${(side === 'local' ? this.localPlayers : this.visitorPlayers).map(
              p => html`<option value=${p.id}>${p.name}</option>`,
            )}
          </select>
          <select id="subIn">
            ${(side === 'local' ? this.localPlayers : this.visitorPlayers).map(
              p => html`<option value=${p.id}>${p.name}</option>`,
            )}
          </select>
          <input type="number" id="subMinute" placeholder="Minuto" />
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
          <select id="cardTeam" @change=${() => this.requestUpdate()}>
            <option value="local">Local</option>
            <option value="visitor">Visitante</option>
          </select>
          <select id="cardPlayer">
            ${(cardSide === 'local' ? this.localPlayers : this.visitorPlayers).map(p => html`<option value=${p.id}>${p.name}</option>`)}
          </select>
          <input type="number" id="cardMinute" placeholder="Minuto" />
          <select id="cardType">
            <option value="yellow">Amarilla</option>
            <option value="red">Roja</option>
          </select>
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
    const minute = Number(this.shadowRoot.getElementById('newGoalMinute').value);
    const ownGoal = this.shadowRoot.getElementById('newGoalOwn').checked;
    const goals = [...(this.match.goals || []), { side, playerId, minute, ownGoal }];
    this._updateGoals(goals);
  }

  _addSub() {
    const side = this.shadowRoot.getElementById('subTeam').value;
    const teamKey = side === 'local' ? 'localTeamId' : 'visitorTeamId';
    const playerOutId = this.shadowRoot.getElementById('subOut').value;
    const playerInId = this.shadowRoot.getElementById('subIn').value;
    const minute = Number(this.shadowRoot.getElementById('subMinute').value);
    const substitutions = [...(this.match.substitutions || []), { teamId: this.match[teamKey], playerOutId, playerInId, minute }];
    this._updateSubstitutions(substitutions);
  }

  _addCard() {
    const side = this.shadowRoot.getElementById('cardTeam').value;
    const teamId = side === 'local' ? this.match.localTeamId : this.match.visitorTeamId;
    const playerId = this.shadowRoot.getElementById('cardPlayer').value;
    const minute = Number(this.shadowRoot.getElementById('cardMinute').value);
    const cardType = this.shadowRoot.getElementById('cardType').value;
    const cards = [...(this.match.cards || []), { teamId, playerId, minute, cardType }];
    this._updateCards(cards);
  }

  _updateGoals(goals) {
    
  }

}

customElements.define('match-detail-page', MatchDetailPage);
