import { MdCheckbox } from '@material/web/checkbox/checkbox';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import { FirebaseUpdates, Match, Player, TeamSide } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';
import { MdDialog } from '@material/web/dialog/dialog.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
@customElement('lineups-card')
export class LineupsCard extends LitElement {
  static override readonly styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
        contain: content;
        --color-primary-rgb: 76, 175, 80;
        --md-icon-button-icon-color: #e0e0e0;
        --md-icon-button-hover-icon-color: #a5d6a7;
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
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .lineup-collapsed-hint {
        margin: 0;
        color: #757575;
      }
      .lineup > div {
        width: 100%;
      }
      .lineup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
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

  @query('#dialogLineups') dialogLineups!: MdDialog;
  @query('#dialogAddPlayer') dialogAddPlayer!: MdDialog;
  @query('#newPlayerName') newPlayerNameField!: MdFilledTextField;
  @query('#newPlayerPosition') newPlayerPositionField!: MdFilledSelect;
  @query('#newPlayerNumber') newPlayerNumberField!: MdFilledTextField;
  @query('#newPlayerImage') newPlayerImageField!: MdFilledTextField;

  @state() private addPlayerSide: TeamSide | null = null;
  @state() private lineupsCollapsed = false;
  @state() private lastMatchId: number | null = null;

  override render() {
    if (!this.match) {
      return html``;
    }
    const { lineupLocal, lineupVisitor } = this.match;
    const lineupsLabel = this.lineupsCollapsed
      ? 'Ver alineaciones'
      : 'Ocultar alineaciones';
    const lineupsIcon = this.lineupsCollapsed ? 'visibility' : 'visibility_off';
    return html`
      <div class="section card">
        <div class="section-header">
          <h3>Alineación Inicial</h3>
          ${this._lineupsReady()
            ? html`
                <md-filled-button
                  class="toggle-lineups"
                  aria-label="${lineupsLabel}"
                  title="${lineupsLabel}"
                  @click=${this._toggleLineups}
                >
                  <md-icon>${lineupsIcon}</md-icon>
                  <span class="btn-label">${lineupsLabel}</span>
                </md-filled-button>
              `
            : null}
        </div>
        ${this.lineupsCollapsed
          ? html`
              <p class="lineup-collapsed-hint">
                Las alineaciones iniciales están guardadas. Usa "Ver
                alineaciones" para revisarlas.
              </p>
            `
          : html`
              <div class="lineup">
                <div>
                  <div class="lineup-header">
                    <h4>Local</h4>
                    <md-icon-button
                      @click=${() => this._openAddPlayerDialog('local')}
                    >
                      <md-icon
                        role="button"
                        aria-label="Agregar jugador local"
                        title="Agregar jugador local"
                        >add</md-icon
                      >
                    </md-icon-button>
                  </div>
                  ${this.localPlayers.map(player => {
                    const isTitular = lineupLocal?.some(
                      p => p.number === player.number && p.titular,
                    );
                    return html`
                      <div
                        class="${`player-row ${isTitular ? 'selected' : ''}`}"
                        role="button"
                        tabindex="0"
                        aria-label="Jugador ${player.number} ${player.name} — alternar alineación local"
                        aria-pressed="${isTitular ? 'true' : 'false'}"
                        @click=${() => this._toggleRow('local', player.number)}
                        @keydown=${(e: KeyboardEvent) =>
                          this._onRowKeydown(e, 'local', player.number)}
                      >
                        <md-checkbox
                          id="lineupLocal-${player.number}"
                          aria-label="Incluir ${player.name} en alineación local"
                          .checked=${isTitular}
                          @change=${(e: Event) =>
                            this._onLineupChange(e, 'local', player.number)}
                        ></md-checkbox>
                        <player-info .player=${player}></player-info>
                      </div>
                    `;
                  })}
                </div>
                <div>
                  <div class="lineup-header">
                    <h4>Visitante</h4>
                    <md-icon-button
                      @click=${() => this._openAddPlayerDialog('visitor')}
                    >
                      <md-icon
                        role="button"
                        aria-label="Agregar jugador visitante"
                        title="Agregar jugador visitante"
                        >add</md-icon
                      >
                    </md-icon-button>
                  </div>
                  ${this.visitorPlayers.map(player => {
                    const isTitular = lineupVisitor?.some(
                      p => p.number === player.number && p.titular,
                    );
                    return html`
                      <div
                        class="${`player-row ${isTitular ? 'selected' : ''}`}"
                        role="button"
                        tabindex="0"
                        aria-label="Jugador ${player.number} ${player.name} — alternar alineación visitante"
                        aria-pressed="${isTitular ? 'true' : 'false'}"
                        @click=${() =>
                          this._toggleRow('visitor', player.number)}
                        @keydown=${(e: KeyboardEvent) =>
                          this._onRowKeydown(e, 'visitor', player.number)}
                      >
                        <md-checkbox
                          id="lineupVisitor-${player.number}"
                          aria-label="Incluir ${player.name} en alineación visitante"
                          .checked=${isTitular}
                          @change=${(e: Event) =>
                            this._onLineupChange(e, 'visitor', player.number)}
                        ></md-checkbox>
                        <player-info .player=${player}></player-info>
                      </div>
                    `;
                  })}
                </div>
              </div>
            `}
      </div>
      <md-filled-button
        class="action-btn"
        aria-label="Guardar alineaciones"
        title="Guardar alineaciones"
        ?disabled=${!this._lineupsReady()}
        @click=${this.updateLineups}
      >
        <md-icon>save</md-icon>
        <span class="btn-label">Guardar Alineaciones</span>
      </md-filled-button>
      <md-dialog id="dialogLineups" type="alert">
        <div slot="headline">Alineaciones Actualizadas</div>
        <div slot="content">
          Las alineaciones han sido actualizadas correctamente.
        </div>
      </md-dialog>
      <md-dialog id="dialogAddPlayer" type="modal">
        <div slot="headline">
          ${this.addPlayerSide === 'local'
            ? 'Agregar jugador local'
            : 'Agregar jugador visitante'}
        </div>
        <div
          slot="content"
          style="display:flex;flex-direction:column;gap:12px;"
        >
          <md-filled-text-field
            id="newPlayerName"
            label="Nombre"
            aria-label="Nombre del jugador"
            required
          ></md-filled-text-field>
          <md-filled-select
            id="newPlayerPosition"
            label="Posición"
            aria-label="Posición del jugador"
          >
            <md-select-option value="Portero">Portero</md-select-option>
            <md-select-option value="Defensa">Defensa</md-select-option>
            <md-select-option value="Medio">Medio</md-select-option>
            <md-select-option value="Delantero">Delantero</md-select-option>
          </md-filled-select>
          <md-filled-text-field
            id="newPlayerNumber"
            label="Número de jersey"
            aria-label="Número de jersey"
            type="number"
            inputmode="numeric"
            required
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerImage"
            label="URL de foto"
            aria-label="URL de foto"
          ></md-filled-text-field>
        </div>
        <div slot="actions">
          <md-filled-button
            aria-label="Cancelar"
            title="Cancelar"
            @click=${this._cancelAddPlayer}
            >Cancelar</md-filled-button
          >
          <md-filled-button
            aria-label="Guardar jugador"
            title="Guardar jugador"
            @click=${this._saveNewPlayer}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  override updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);
    if (!changedProps.has('match') || !this.match) return;
    const currentId = this.match.idMatch ?? null;
    if (currentId !== this.lastMatchId) {
      this.lastMatchId = currentId;
      this.lineupsCollapsed = this._lineupsReady();
    }
  }
  private _onLineupChange(
    e: Event,
    side: TeamSide,
    playerId: number,
  ) {
    if (!this.match) return;
    const key = side === 'local' ? 'lineupLocal' : 'lineupVisitor';
    const lineup = [...(this.match[key] || [])];
    if ((e.target as MdCheckbox).checked) {
      if (!lineup.some(p => p.number === playerId))
        lineup.push({ number: playerId, titular: true });
    } else {
      const idx = lineup.findIndex(p => p.number === playerId);
      if (idx !== -1) lineup.splice(idx, 1);
    }
    this.match = { ...this.match, [key]: lineup };
    // Visual feedback: toggle selected class on the row containing the checkbox
    try {
      const cb = e.target as MdCheckbox;
      const row = cb?.closest('.player-row') ?? null;
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
      console.error('Error updating lineup row selection state', err);
    }
  }
  private _onRowKeydown(
    e: KeyboardEvent,
    side: TeamSide,
    playerNumber: number,
  ) {
    const key = e.key;
    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      e.preventDefault();
      this._toggleRow(side, playerNumber);
    }
  }
  private _toggleRow(side: TeamSide, playerNumber: number) {
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

  private _toggleLineups() {
    this.lineupsCollapsed = !this.lineupsCollapsed;
  }

  private _openAddPlayerDialog(side: TeamSide) {
    this.addPlayerSide = side;
    this._resetAddPlayerForm();
    this.dialogAddPlayer?.show();
  }

  private _resetAddPlayerForm() {
    if (this.newPlayerNameField) this.newPlayerNameField.value = '';
    if (this.newPlayerPositionField) this.newPlayerPositionField.value = '';
    if (this.newPlayerNumberField) {
      this.newPlayerNumberField.value = '';
      this.newPlayerNumberField.setCustomValidity('');
    }
    if (this.newPlayerImageField) this.newPlayerImageField.value = '';
  }

  private _cancelAddPlayer() {
    this.dialogAddPlayer?.close();
    this.addPlayerSide = null;
  }

  private _getTeamKey(side: TeamSide): string {
    const teamName =
      side === 'local' ? this.match?.local || '' : this.match?.visitante || '';
    return teamName.replaceAll('.', '');
  }

  private _saveNewPlayer() {
    if (!this.match || !this.addPlayerSide) return;
    const name = this.newPlayerNameField?.value?.trim();
    const position = this.newPlayerPositionField?.value?.trim();
    const number = Number(this.newPlayerNumberField?.value);
    const imgSrc = this.newPlayerImageField?.value?.trim() || '';

    if (!name || !position || Number.isNaN(number)) {
      this.newPlayerNumberField?.setCustomValidity(
        Number.isNaN(number) ? 'Número inválido' : '',
      );
      this.newPlayerNumberField?.reportValidity();
      return;
    }
    const currentPlayers =
      this.addPlayerSide === 'local' ? this.localPlayers : this.visitorPlayers;
    if (currentPlayers.some(p => p.number === number)) {
      this.newPlayerNumberField?.setCustomValidity(
        'Ese número ya está registrado en este equipo',
      );
      this.newPlayerNumberField?.reportValidity();
      return;
    }
    this.newPlayerNumberField?.setCustomValidity('');
    const newPlayer: Player = { name, position, number, imgSrc };
    const updatedList = [...currentPlayers, newPlayer];
    if (this.addPlayerSide === 'local') {
      this.localPlayers = updatedList;
    } else {
      this.visitorPlayers = updatedList;
    }

    const updates: FirebaseUpdates = {};
    updates[`/players/${this._getTeamKey(this.addPlayerSide)}`] = updatedList;
    this.dispatchEvent(dispatchEventMatchUpdated(updates));

    this.dialogAddPlayer?.close();
    this.addPlayerSide = null;
  }

  private updateLineups() {
    if (!this.match) return;
    const lineupLocal = this.match.lineupLocal || [];
    const lineupVisitor = this.match.lineupVisitor || [];
    const updatedMatch: FirebaseUpdates = {};
    updatedMatch[`/matches/${this.match.idMatch}/lineupLocal`] = lineupLocal;
    updatedMatch[`/matches/${this.match.idMatch}/lineupVisitor`] =
      lineupVisitor;
    this.dispatchEvent(dispatchEventMatchUpdated(updatedMatch));
    this.requestUpdate();
    this.dialogLineups.show();
    this.lineupsCollapsed = true;
  }

  private _lineupsReady(): boolean {
    if (!this.match) return false;
    const localCount = (this.match.lineupLocal || []).filter(
      p => p.titular,
    ).length;
    const visitorCount = (this.match.lineupVisitor || []).filter(
      p => p.titular,
    ).length;
    return localCount >= 11 && visitorCount >= 11;
  }
}
