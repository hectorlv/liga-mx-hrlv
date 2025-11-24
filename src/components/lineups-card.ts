import { MdCheckbox } from '@material/web/checkbox/checkbox';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/player-info.js';
import { FirebaseUpdates, Match, Player } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';

@customElement('lineups-card')
export class LineupsCard extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        contain: content;
        --color-primary-rgb: 76, 175, 80;
      }
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
      player-info {
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
      }
    `,
  ];

  @property({ type: Object }) match!: Match;
  @property({ type: Array }) localPlayers: Player[] = [];
  @property({ type: Array }) visitorPlayers: Player[] = [];

  override render() {
    if (!this.match) {
      return html``;
    }
    const { lineupLocal, lineupVisitor } = this.match;
    return html`
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
                  <player-info .player=${player}></player-info>
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
                  <player-info .player=${player}></player-info>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
      <md-filled-button
        class="action-btn"
        aria-label="Guardar alineaciones"
          title="Guardar alineaciones"
          @click=${this.updateLineups}
        >
          <md-icon>save</md-icon>
          <span class="btn-label">Guardar Alineaciones</span>
        </md-filled-button>
    `;
  }
  private _onLineupChange(
    e: Event,
    side: 'local' | 'visitor',
    playerId: number,
  ) {
    if (!this.match) return;
    const key = side === 'local' ? 'lineupLocal' : 'lineupVisitor';
    const lineup = [...(this.match[key] || [])];
    if ((e.target as MdCheckbox).checked) {
      if (!lineup.includes(playerId)) lineup.push(playerId);
    } else {
      const idx = lineup.indexOf(playerId);
      if (idx !== -1) lineup.splice(idx, 1);
    }
    this.match = { ...this.match, [key]: lineup };
    // Visual feedback: toggle selected class on the row containing the checkbox
    try {
      const cb = e.target as MdCheckbox;
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
  private _onRowKeydown(
    e: KeyboardEvent,
    side: 'local' | 'visitor',
    playerNumber: number,
  ) {
    const key = e.key;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      this._toggleRow(side, playerNumber);
    }
  }
  private _toggleRow(side: 'local' | 'visitor', playerNumber: number) {
    // Evita interferir si el click fue directamente en el checkbox
    const checkboxId =
      side === 'local'
        ? `lineupLocal-${playerNumber}`
        : `lineupVisitor-${playerNumber}`;
    const cb = this.shadowRoot?.getElementById(checkboxId) as MdCheckbox;
    if (!cb) return;
    cb.checked = !cb.checked;
    // Generar un objeto de evento mínimo para reutilizar la lógica existente
    this._onLineupChange(
      { target: cb } as unknown as Event,
      side,
      playerNumber,
    );
  }

    private updateLineups() {
      if (!this.match) return;
      const lineupLocal = this.match.lineupLocal || [];
      const lineupVisitor = this.match.lineupVisitor || [];
  
      // Aquí puedes implementar la lógica para guardar ambas alineaciones
      console.log('Guardando alineaciones:');
      console.log('Local:', lineupLocal);
      console.log('Visitante:', lineupVisitor);
  
      const updatedMatch: FirebaseUpdates = {};
      updatedMatch[`/matches/${this.match.idMatch}/lineupLocal`] = lineupLocal;
      updatedMatch[`/matches/${this.match.idMatch}/lineupVisitor`] =
        lineupVisitor;
      this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
      this.requestUpdate();
    }
}
