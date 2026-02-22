import { MdCheckbox } from '@material/web/checkbox/checkbox';
import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../components/player-info.js';
import { FirebaseUpdates, Match, Player, TeamSide } from '../types';
import { dispatchEventMatchUpdated } from '../utils/functionUtils';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
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
        --card-bg: var(--md-sys-color-surface);
        --header-bg: var(--md-sys-color-surface-container);
        --selected-bg: var(--md-sys-color-primary-container);
        --selected-text: var(--md-sys-color-on-primary-container);
      }

      /* LA TARJETA PRINCIPAL */
      .card {
        background: var(--card-bg);
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--md-sys-color-outline-variant);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* HEADER DE LA TARJETA */
      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
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

      .lineup-collapsed-hint {
        padding: 24px;
        margin: 0;
        text-align: center;
        color: var(--md-sys-color-on-surface-variant);
        font-style: italic;
      }

      /* CONTENEDOR DE EQUIPOS (Grid de 2 columnas) */
      .lineup {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0;
      }

      @media (min-width: 600px) {
        .lineup {
          grid-template-columns: 1fr 1fr;
        }
        /* Línea divisoria entre los dos equipos */
        .team-column:first-child {
          border-right: 1px solid var(--md-sys-color-outline-variant);
        }
      }

      .team-column {
        display: flex;
        flex-direction: column;
        max-height: 500px; /* Limita la altura y agrega scroll interno */
        overflow-y: auto;
      }

      /* HEADER DE CADA EQUIPO (Pegajoso al hacer scroll) */
      .lineup-header {
        position: sticky;
        top: 0;
        background: var(--header-bg);
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
      }

      .lineup-header h4 {
        margin: 0;
        font-size: 1rem;
        color: var(--md-sys-color-on-surface);
      }

      /* FILA DE JUGADOR */
      .player-row {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        gap: 12px;
        cursor: pointer;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        transition: background 0.2s;
      }

      .player-row:hover {
        background: rgba(0, 0, 0, 0.02);
      }

      /* Estado Seleccionado (Titular) */
      .player-row.selected {
        background: var(--selected-bg);
        border-left: 4px solid var(--md-sys-color-primary);
        padding-left: 12px; /* Compensamos el borde */
      }

      .player-row md-checkbox {
        flex-shrink: 0;
      }

      /* Envolvemos el player-info para que no se rompa */
      .player-info-wrapper {
        flex: 1;
        min-width: 0;
        pointer-events: none; /* Para que el click pase al div padre */
      }

      /* BOTÓN DE GUARDAR FLOTANTE / FOOTER */
      .card-footer {
        padding: 16px 20px;
        background: var(--card-bg);
        border-top: 1px solid var(--md-sys-color-outline-variant);
        display: flex;
        justify-content: flex-end;
      }

      /* Formularios dentro del Dialog */
      .dialog-form {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
        margin-top: 8px;
      }
      @media (min-width: 600px) {
        .dialog-form {
          grid-template-columns: 1fr 1fr;
        }
        .full-width {
          grid-column: 1 / -1;
        }
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
  @query('#newPlayerBirthDate') newPlayerBirthDateField!: MdFilledTextField;
  @query('#newPlayerFullName') newPlayerFullNameField!: MdFilledTextField;
  @query('#newPlayerNationality') newPlayerNationalityField!: MdFilledTextField;

  @state() private addPlayerSide: TeamSide | null = null;
  @state() private lineupsCollapsed = false;
  @state() private lastMatchId: number | null = null;

  override render() {
    if (!this.match) return html``;

    const { lineupLocal, lineupVisitor, local, visitante } = this.match;
    const lineupsLabel = this.lineupsCollapsed
      ? 'Ver alineaciones'
      : 'Ocultar alineaciones';
    const lineupsIcon = this.lineupsCollapsed ? 'visibility' : 'visibility_off';

    return html`
      <div class="card">
        <div class="section-header">
          <h3><md-icon>group</md-icon> Alineaciones</h3>
          ${this._lineupsReady()
            ? html`
                <md-outlined-button
                  @click=${this._toggleLineups}
                  title="${lineupsLabel}"
                >
                  <md-icon slot="icon">${lineupsIcon}</md-icon>
                  ${lineupsLabel}
                </md-outlined-button>
              `
            : null}
        </div>

        ${this.lineupsCollapsed
          ? html`
              <p class="lineup-collapsed-hint">
                Las alineaciones iniciales están guardadas y listas.<br />
                Usa el botón de arriba si necesitas hacer cambios.
              </p>
            `
          : html`
              <div class="lineup">
                <div class="team-column">
                  <div class="lineup-header">
                    <h4>${local} (Local)</h4>
                    <md-icon-button
                      @click=${() => this._openAddPlayerDialog('local')}
                      title="Agregar jugador"
                    >
                      <md-icon>person_add</md-icon>
                    </md-icon-button>
                  </div>

                  ${this.localPlayers.map(player => {
                    const isTitular = lineupLocal?.some(
                      p => p.number === player.number && p.titular,
                    );
                    return html`
                      <div
                        class="player-row ${isTitular ? 'selected' : ''}"
                        role="button"
                        tabindex="0"
                        @click=${(e: Event) =>
                          this._toggleRow(e, 'local', player.number)}
                      >
                        <md-checkbox
                          id="lineupLocal-${player.number}"
                          .checked=${isTitular}
                          @change=${(e: Event) =>
                            this._onLineupChange(e, 'local', player.number)}
                          @click=${(e: Event) => e.stopPropagation()}
                        ></md-checkbox>
                        <div class="player-info-wrapper">
                          <player-info .player=${player}></player-info>
                        </div>
                      </div>
                    `;
                  })}
                </div>

                <div class="team-column">
                  <div class="lineup-header">
                    <h4>${visitante} (Visitante)</h4>
                    <md-icon-button
                      @click=${() => this._openAddPlayerDialog('visitor')}
                      title="Agregar jugador"
                    >
                      <md-icon>person_add</md-icon>
                    </md-icon-button>
                  </div>

                  ${this.visitorPlayers.map(player => {
                    const isTitular = lineupVisitor?.some(
                      p => p.number === player.number && p.titular,
                    );
                    return html`
                      <div
                        class="player-row ${isTitular ? 'selected' : ''}"
                        role="button"
                        tabindex="0"
                        @click=${(e: Event) =>
                          this._toggleRow(e, 'visitor', player.number)}
                      >
                        <md-checkbox
                          id="lineupVisitor-${player.number}"
                          .checked=${isTitular}
                          @change=${(e: Event) =>
                            this._onLineupChange(e, 'visitor', player.number)}
                          @click=${(e: Event) => e.stopPropagation()}
                        ></md-checkbox>
                        <div class="player-info-wrapper">
                          <player-info .player=${player}></player-info>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              </div>

              <div class="card-footer">
                <md-filled-button
                  ?disabled=${!this._lineupsReady()}
                  @click=${this.updateLineups}
                >
                  <md-icon slot="icon">save</md-icon>
                  Guardar Alineaciones
                </md-filled-button>
              </div>
            `}
      </div>

      <md-dialog id="dialogLineups" type="alert">
        <div slot="headline">Alineaciones Guardadas</div>
        <div slot="content">
          Las alineaciones han sido actualizadas correctamente.
        </div>
        <div slot="actions">
          <md-filled-button @click=${() => this.dialogLineups.close()}
            >OK</md-filled-button
          >
        </div>
      </md-dialog>

      <md-dialog id="dialogAddPlayer" type="modal">
        <div slot="headline">
          ${this.addPlayerSide === 'local'
            ? 'Agregar jugador local'
            : 'Agregar jugador visitante'}
        </div>
        <div slot="content" class="dialog-form">
          <md-filled-text-field
            id="newPlayerName"
            label="Nombre corto"
            required
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerNumber"
            label="Número de jersey"
            type="number"
            required
          ></md-filled-text-field>
          <md-filled-select
            id="newPlayerPosition"
            label="Posición"
            class="full-width"
          >
            <md-select-option value="Portero"
              ><div slot="headline">Portero</div></md-select-option
            >
            <md-select-option value="Defensa"
              ><div slot="headline">Defensa</div></md-select-option
            >
            <md-select-option value="Medio"
              ><div slot="headline">Medio</div></md-select-option
            >
            <md-select-option value="Delantero"
              ><div slot="headline">Delantero</div></md-select-option
            >
          </md-filled-select>
          <md-filled-text-field
            id="newPlayerFullName"
            label="Nombre Completo"
            class="full-width"
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerNationality"
            label="Nacionalidad"
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerBirthDate"
            label="Nacimiento"
            type="date"
          ></md-filled-text-field>
          <md-filled-text-field
            id="newPlayerImage"
            label="URL de foto"
            class="full-width"
          ></md-filled-text-field>
        </div>
        <div slot="actions">
          <md-outlined-button @click=${this._cancelAddPlayer}
            >Cancelar</md-outlined-button
          >
          <md-filled-button @click=${this._saveNewPlayer}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  // --- LÓGICA DE COMPONENTE ---

  override updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);
    if (!changedProps.has('match') || !this.match) return;
    const currentId = this.match.idMatch ?? null;
    if (currentId !== this.lastMatchId) {
      this.lastMatchId = currentId;
      this.lineupsCollapsed = this._lineupsReady();
    }
  }

  private _onLineupChange(e: Event, side: TeamSide, playerId: number) {
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
  }

  private _toggleRow(e: Event, side: TeamSide, playerNumber: number) {
    const checkboxId =
      side === 'local'
        ? `lineupLocal-${playerNumber}`
        : `lineupVisitor-${playerNumber}`;
    const cb = this.shadowRoot?.getElementById(checkboxId) as MdCheckbox;
    if (!cb) return;

    cb.checked = !cb.checked;
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
    if (this.newPlayerFullNameField) this.newPlayerFullNameField.value = '';
    if (this.newPlayerNationalityField)
      this.newPlayerNationalityField.value = '';
    if (this.newPlayerBirthDateField) this.newPlayerBirthDateField.value = '';
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
    const birthDate = this.newPlayerBirthDateField?.value || '';
    const fullName = this.newPlayerFullNameField?.value?.trim() || '';
    const nationality = this.newPlayerNationalityField?.value?.trim() || '';

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

    const newPlayer: Player = {
      name,
      position,
      number,
      imgSrc,
      birthDate,
      fullName,
      nationality,
    };
    const updatedList = [...currentPlayers, newPlayer].sort(
      (a, b) => a.number - b.number,
    );

    if (this.addPlayerSide === 'local') this.localPlayers = updatedList;
    else this.visitorPlayers = updatedList;

    const updates: FirebaseUpdates = {};
    updates[`/players/${this._getTeamKey(this.addPlayerSide)}`] = updatedList;

    // Guardamos el estado actual de los checkboxes para no perder el progreso
    updates[`/matches/${this.match.idMatch}/lineupLocal`] =
      this.match.lineupLocal || [];
    updates[`/matches/${this.match.idMatch}/lineupVisitor`] =
      this.match.lineupVisitor || [];

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
