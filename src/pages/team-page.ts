import { LitElement, css, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import {
  FirebaseUpdates,
  Goal,
  Match,
  Player,
  PlayerGame,
  TableEntry,
  TeamSide,
} from '../types/index.js';
import { getTeamImage } from '../utils/imageUtils.js';
import { dispatchEventMatchUpdated } from '../utils/functionUtils.js';

// Imports de Material para el formulario de edición
import { MdDialog } from '@material/web/dialog/dialog.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/icon/icon.js';

interface PlayerStats {
  number: number;
  name: string;
  position: string;
  gamesPlayed: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  fullName: string;
  nationality: string;
  age: string;
  ownGoals: number;
  image?: string;
  rawBirthDate?: string | Date; // Guardamos el dato crudo para el formulario
}

@customElement('team-page')
export class TeamPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        padding: 16px;
        --card-bg: var(--md-sys-color-surface);
        animation: slideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
      }
      
      :host(.closing) {
        animation: slideOut 0.25s ease-in forwards;
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0.5; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }

      .header-container {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
        background: var(--md-sys-color-surface-container);
        padding: 16px;
        border-radius: 16px;
      }
      .header-container img {
        width: 64px;
        height: 64px;
        object-fit: contain;
      }
      .header-container h1 {
        margin: 0;
        font-size: 1.8rem;
        color: var(--md-sys-color-on-surface);
      }

      .players-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .player-card {
        background: var(--card-bg);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--md-sys-color-outline-variant);
        position: relative; /* Para el botón de editar en móvil */
      }

      .player-header {
        display: flex;
        align-items: center;
        gap: 12px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        padding-bottom: 8px;
      }

      .cell-num {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--md-sys-color-primary);
        min-width: 32px;
        text-align: center;
      }
      .cell-name {
        font-size: 1.1rem;
        font-weight: bold;
        flex: 1;
        color: var(--md-sys-color-on-surface);
      }
      .cell-pos {
        font-size: 0.8rem;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface);
        padding: 4px 8px;
        border-radius: 8px;
        font-weight: 600;
        text-align: center;
      }

      /* Botón editar en móvil */
      .mobile-edit-btn {
        margin-left: auto;
        --md-icon-button-icon-color: var(--md-sys-color-primary);
      }

      .player-meta {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
        display: flex;
        gap: 16px;
      }

      .player-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        font-size: 0.85rem;
      }
      .stat-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: var(--md-sys-color-surface-container);
        padding: 6px;
        border-radius: 8px;
      }
      .stat-label {
        font-size: 0.7rem;
        color: var(--md-sys-color-on-surface-variant);
        text-transform: uppercase;
      }
      .stat-value {
        font-weight: bold;
        color: var(--md-sys-color-on-surface);
      }

      .player-photo {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
        background: var(--md-sys-color-surface-variant);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--md-sys-color-on-surface-variant);
        overflow: hidden;
        border: 2px solid var(--md-sys-color-outline-variant);
      }

      .desktop-headers {
        display: none;
      }

      /* --- VISTA ESCRITORIO --- */
      @media (min-width: 800px) {
        .players-grid {
          display: grid;
          /* Agregamos una columna extra de 50px al final para el botón de editar */
          grid-template-columns: 60px 50px 2fr 100px 100px 80px repeat(
              7,
              1fr
            ) 50px;
          gap: 0;
          background: var(--card-bg);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .desktop-headers {
          display: contents;
        }

        .header-cell {
          background: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          padding: 16px 8px;
          font-weight: bold;
          font-size: 0.75rem;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .player-card {
          display: contents;
        }
        .player-header,
        .player-meta,
        .player-stats,
        .stat-item {
          display: contents;
        }
        .mobile-edit-btn {
          display: none;
        } /* Ocultamos el botón móvil */

        .cell {
          padding: 12px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          background: var(--card-bg);
        }

        .cell-photo {
          grid-column: 1;
        }
        .cell-num {
          grid-column: 2;
        }
        .cell-name {
          grid-column: 3;
          justify-content: flex-start;
        }
        .cell-pos {
          grid-column: 4;
          background: transparent;
          padding: 0;
        }
        .cell-nat {
          grid-column: 5;
        }
        .cell-age {
          grid-column: 6;
        }

        .stat-pj {
          grid-column: 7;
        }
        .stat-min {
          grid-column: 8;
        }
        .stat-g {
          grid-column: 9;
          background: var(--md-sys-color-surface-variant);
          font-weight: bold;
        }
        .stat-a {
          grid-column: 10;
        }
        .stat-ag {
          grid-column: 11;
        }
        .stat-ta {
          grid-column: 12;
          color: #b8860b;
          font-weight: bold;
        }
        .stat-tr {
          grid-column: 13;
          color: #d32f2f;
          font-weight: bold;
        }
        .cell-action {
          display: flex !important;
          grid-column: 14;
        }

        .stat-label {
          display: none;
        }
        .stat-value {
          font-weight: normal;
          color: inherit;
        }

        .player-card:hover .cell {
          background-color: var(--row-hover, rgba(0, 0, 0, 0.02));
        }
      }

      /* FORMULARIO DIALOG */
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

  @property({ type: Object }) team!: TableEntry;
  @property({ type: Array }) players!: Player[];
  @property({ type: Array }) matchesList!: Match[];

  @state() private playersList: PlayerStats[] = [];
  @state() private editingPlayer: PlayerStats | null = null;

  @query('#dialogEditPlayer') dialogEditPlayer!: MdDialog;
  @query('#editName') editNameField!: MdFilledTextField;
  @query('#editFullName') editFullNameField!: MdFilledTextField;
  @query('#editPosition') editPositionField!: MdFilledSelect;
  @query('#editNationality') editNationalityField!: MdFilledTextField;
  @query('#editBirthDate') editBirthDateField!: MdFilledTextField;
  @query('#editImage') editImageField!: MdFilledTextField;

  override render() {
    return html`
      <main>
        <div class="header-container">
          <md-icon-button
            @click=${this._goBack}
            title="Volver"
          >
            <md-icon>arrow_back</md-icon>
          </md-icon-button>
          ${getTeamImage(this.team.equipo)}
          <h1>${this.team.equipo}</h1>
        </div>

        <div class="players-grid">
          <div class="desktop-headers">
            <div class="header-cell">Foto</div>
            <div class="header-cell">#</div>
            <div class="header-cell" style="justify-content: flex-start">
              Nombre
            </div>
            <div class="header-cell">Pos</div>
            <div class="header-cell">Nac</div>
            <div class="header-cell">Edad</div>
            <div class="header-cell" title="Partidos Jugados">PJ</div>
            <div class="header-cell" title="Minutos Jugados">MIN</div>
            <div class="header-cell" title="Goles">G</div>
            <div class="header-cell" title="Asistencias">A</div>
            <div class="header-cell" title="Autogoles">AG</div>
            <div class="header-cell" title="Tarjetas Amarillas">TA</div>
            <div class="header-cell" title="Tarjetas Rojas">TR</div>
            <div class="header-cell">
              <md-icon style="font-size: 18px">settings</md-icon>
            </div>
          </div>

          ${this.playersList.map(
            player => html`
              <div class="player-card">
                <div class="player-header">
                  <div class="cell cell-photo">
                    ${player.image
                      ? html`<img
                          src="${player.image}"
                          class="player-photo"
                          alt="${player.fullName}"
                          loading="lazy"
                        />`
                      : html`<div class="player-photo">
                          <md-icon>person</md-icon>
                        </div>`}
                  </div>

                  <div class="cell cell-num">${player.number}</div>
                  <div class="cell cell-name">${player.fullName}</div>
                  <div class="cell cell-pos">${player.position}</div>

                  <md-icon-button
                    class="mobile-edit-btn"
                    @click=${() => this._openEditPlayer(player)}
                    title="Editar jugador"
                  >
                    <md-icon>edit</md-icon>
                  </md-icon-button>
                </div>

                <div class="player-meta">
                  <div class="cell cell-nat">
                    <span
                      class="stat-label mobile-only"
                      style="margin-right:4px;"
                      >Nac:</span
                    >${player.nationality}
                  </div>
                  <div class="cell cell-age">${player.age}</div>
                </div>

                <div class="player-stats">
                  <div class="cell stat-item stat-pj">
                    <span class="stat-label">PJ</span>
                    <span class="stat-value">${player.gamesPlayed}</span>
                  </div>
                  <div class="cell stat-item stat-min">
                    <span class="stat-label">Min</span>
                    <span class="stat-value">${player.minutesPlayed}'</span>
                  </div>
                  <div class="cell stat-item stat-g">
                    <span class="stat-label">Goles</span>
                    <span class="stat-value">${player.goals}</span>
                  </div>
                  <div class="cell stat-item stat-a">
                    <span class="stat-label">Asist</span>
                    <span class="stat-value">${player.assists}</span>
                  </div>
                  <div class="cell stat-item stat-ag">
                    <span class="stat-label">AG</span>
                    <span class="stat-value">${player.ownGoals}</span>
                  </div>
                  <div class="cell stat-item stat-ta">
                    <span class="stat-label">Amarillas</span>
                    <span class="stat-value">${player.yellowCards}</span>
                  </div>
                  <div class="cell stat-item stat-tr">
                    <span class="stat-label">Rojas</span>
                    <span class="stat-value">${player.redCards}</span>
                    </div>

                  <div class="cell cell-action" style="display: none;">
                    <md-icon-button
                      @click=${() => this._openEditPlayer(player)}
                      title="Editar"
                      ><md-icon>edit</md-icon></md-icon-button
                    >
                  </div>
                </div>
              </div>
            `,
          )}
        </div>
      </main>

      <md-dialog id="dialogEditPlayer" type="modal">
        <div slot="headline">Editar Jugador</div>
        <div slot="content" class="dialog-form">
          <md-filled-text-field
            label="Número de jersey"
            type="number"
            value="${this.editingPlayer?.number || ''}"
            disabled
            title="El número no se puede cambiar para no romper las estadísticas"
          ></md-filled-text-field>
          <md-filled-text-field
            id="editName"
            label="Nombre corto"
            required
            value="${this.editingPlayer?.name || ''}"
          ></md-filled-text-field>
          <md-filled-select
            id="editPosition"
            label="Posición"
            class="full-width"
          >
            <md-select-option
              value="Portero"
              ?selected=${this.editingPlayer?.position === 'Portero'}
              ><div slot="headline">Portero</div></md-select-option
            >
            <md-select-option
              value="Defensa"
              ?selected=${this.editingPlayer?.position === 'Defensa'}
              ><div slot="headline">Defensa</div></md-select-option
            >
            <md-select-option
              value="Medio"
              ?selected=${this.editingPlayer?.position === 'Medio'}
              ><div slot="headline">Medio</div></md-select-option
            >
            <md-select-option
              value="Delantero"
              ?selected=${this.editingPlayer?.position === 'Delantero'}
              ><div slot="headline">Delantero</div></md-select-option
            >
          </md-filled-select>
          <md-filled-text-field
            id="editFullName"
            label="Nombre Completo"
            class="full-width"
            value="${this.editingPlayer?.fullName || ''}"
          ></md-filled-text-field>
          <md-filled-text-field
            id="editNationality"
            label="Nacionalidad"
            value="${this.editingPlayer?.nationality || ''}"
          ></md-filled-text-field>
          <md-filled-text-field
            id="editBirthDate"
            label="Nacimiento"
            type="date"
            value="${this._formatDateForInput(
              this.editingPlayer?.rawBirthDate,
            )}"
          ></md-filled-text-field>
          <md-filled-text-field
            id="editImage"
            label="URL de foto"
            class="full-width"
            value="${this.editingPlayer?.image || ''}"
          ></md-filled-text-field>
        </div>
        <div slot="actions">
          <md-outlined-button @click=${this._closeEditPlayer}
            >Cancelar</md-outlined-button
          >
          <md-filled-button @click=${this._saveEditedPlayer}
            >Guardar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  // Aseguramos que la lista se recalcule si Firebase manda nuevos datos de jugadores
  override willUpdate(changedProps: Map<string, unknown>) {
    if (changedProps.has('players') || changedProps.has('matchesList')) {
      this.getPlayerStats();
    }
  }

  // --- VARIABLES PARA EL GESTO DE DESLIZAR ---
  private touchStartX = 0;
  private touchStartY = 0;

  override connectedCallback() {
    super.connectedCallback();
    this.getPlayerStats();
    this.addEventListener('touchstart', this._handleTouchStart, { passive: true });
    this.addEventListener('touchend', this._handleTouchEnd, { passive: true });
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    /* Igual aquí, si ya tenías disconnectedCallback, solo agrega estas dos líneas: */
    this.removeEventListener('touchstart', this._handleTouchStart);
    this.removeEventListener('touchend', this._handleTouchEnd);
  }

  // Usamos "arrow functions" (=>) para no perder la referencia a 'this'
  private _handleTouchStart = (e: TouchEvent) => {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  };

  private _handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    // LÓGICA DEL GESTO "BACK" TIPO IOS/ANDROID:
    // 1. El toque inicial debe ser en el borde izquierdo (los primeros 50px de la pantalla)
    // 2. El deslizamiento hacia la derecha debe ser de al menos 60px
    // 3. El movimiento debe ser más horizontal que vertical (para no confundirlo con el scroll de leer la página)
    if (this.touchStartX < 50 && deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      this._goBack();
    }
  };

  private _goBack() {
    // Le ponemos la clase que activa la animación de salida
    this.classList.add('closing');
    
    // Esperamos 250 milisegundos a que la animación casi termine y avisamos al padre
    setTimeout(() => {
      this.dispatchEvent(new CustomEvent('back'));
    }, 250);
  }

  // Usamos "arrow functions" (=>) para no perder la referencia a 'this'
  private _handleTouchStart = (e: TouchEvent) => {
    this.touchStartX = e.changedTouches[0].screenX;
    this.touchStartY = e.changedTouches[0].screenY;
  };

  private _handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const deltaX = touchEndX - this.touchStartX;
    const deltaY = touchEndY - this.touchStartY;

    // LÓGICA DEL GESTO "BACK" TIPO IOS/ANDROID:
    // 1. El toque inicial debe ser en el borde izquierdo (los primeros 50px de la pantalla)
    // 2. El deslizamiento hacia la derecha debe ser de al menos 60px
    // 3. El movimiento debe ser más horizontal que vertical (para no confundirlo con el scroll de leer la página)
    if (this.touchStartX < 50 && deltaX > 60 && Math.abs(deltaX) > Math.abs(deltaY)) {
      this.dispatchEvent(new CustomEvent('back'));
    }
  };

  // --- LÓGICA DE EDICIÓN ---

  private _openEditPlayer(player: PlayerStats) {
    this.editingPlayer = player;
    this.dialogEditPlayer.show();
  }

  private _closeEditPlayer() {
    this.dialogEditPlayer.close();
    this.editingPlayer = null;
  }

  private _formatDateForInput(date: string | Date | undefined): string {
    if (!date) return '';
    if (typeof date === 'string') {
      const parts = date.split('/');
      if (parts.length === 3)
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      return date;
    }
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private _saveEditedPlayer() {
    if (!this.editingPlayer) return;

    const name = this.editNameField.value.trim();
    const position = this.editPositionField.value.trim();
    const fullName = this.editFullNameField.value.trim();
    const nationality = this.editNationalityField.value.trim();
    const imgSrc = this.editImageField.value.trim();
    const birthDateInput = this.editBirthDateField.value;

    // Formateamos la fecha de YYYY-MM-DD a DD/MM/YYYY para mantener tu estándar
    let formattedBirthDate = birthDateInput;
    if (birthDateInput?.includes('-')) {
      const [year, month, day] = birthDateInput.split('-');
      formattedBirthDate = `${day}/${month}/${year}`;
    }

    if (!name || !position) {
      alert('El nombre corto y la posición son obligatorios.');
      return;
    }

    // Buscamos al jugador original en el array global
    const updatedPlayers = this.players.map(p => {
      if (p.number === this.editingPlayer!.number) {
        return {
          ...p,
          name,
          position,
          fullName,
          nationality,
          imgSrc,
          birthDate: formattedBirthDate,
        };
      }
      return p;
    });

    // Disparamos el evento de actualización a Firebase
    const updates: FirebaseUpdates = {};
    const teamKey = this.team.equipo.replaceAll('.', '');
    updates[`/players/${teamKey}`] = updatedPlayers;

    this.dispatchEvent(dispatchEventMatchUpdated(updates));
    this._closeEditPlayer();
  }

  // --- LÓGICA DE ESTADÍSTICAS (SE QUEDA IGUAL) ---

  private getPlayerStats() {
    if (!this.players) return;
    const statsMap = this.buildStatsMap(this.players);
    for (const match of this.matchesList) {
      const isLocal = match.local === this.team.equipo;
      this.processLineup(statsMap, match, isLocal);
      this.processGoals(statsMap, match, isLocal);
      this.processCards(statsMap, match, isLocal);
    }
    this.playersList = Array.from(statsMap.values());
  }

  private buildStatsMap(players: Player[]): Map<number, PlayerStats> {
    const statsMap: Map<number, PlayerStats> = new Map();
    for (const player of players) {
      statsMap.set(player.number, {
        number: player.number,
        name: player.name,
        position: player.position,
        gamesPlayed: 0,
        minutesPlayed: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        fullName: player.fullName,
        nationality: player.nationality,
        age: this.getAgeFromBirthDate(player.birthDate),
        ownGoals: 0,
        image: player.imgSrc || '',
        rawBirthDate: player.birthDate,
      });
    }
    return statsMap;
  }

  private getAgeFromBirthDate(birthDate: string | Date): string {
    const birthParts =
      typeof birthDate === 'string' ? birthDate.split('/') : [];
    let birth: Date;
    if (birthParts.length === 3) {
      const day = Number.parseInt(birthParts[0], 10);
      const month = Number.parseInt(birthParts[1], 10) - 1;
      const year = Number.parseInt(birthParts[2], 10);
      birth = new Date(year, month, day);
    } else if (birthDate instanceof Date) {
      birth = birthDate;
    } else {
      return 'N/A';
    }
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} años`;
  }

  private processLineup(
    statsMap: Map<number, PlayerStats>,
    match: Match,
    isLocal: boolean,
  ) {
    const lineup = isLocal ? match.lineupLocal : match.lineupVisitor;
    const teamTag = isLocal ? 'local' : 'visitor';
    if (!lineup) return;
    for (const playerGame of lineup) {
      const playerStats = statsMap.get(playerGame.number);
      if (!playerStats) continue;
      playerStats.gamesPlayed += 1;
      const inMinute = this.computeInMinute(playerGame, match, teamTag);
      const outMinute = this.computeOutMinute(playerGame, match, teamTag);
      playerStats.minutesPlayed += outMinute - inMinute;
    }
  }

  private computeInMinute(
    playerGame: PlayerGame,
    match: Match,
    teamTag: TeamSide,
  ): number {
    if (!playerGame.entroDeCambio) return 0;
    return (
      match.substitutions?.find(
        s => s.playerIn === playerGame.number && s.team === teamTag,
      )?.minute ?? 0
    );
  }

  private computeOutMinute(
    playerGame: PlayerGame,
    match: Match,
    teamTag: TeamSide,
  ): number {
    if (playerGame.salioDeCambio) {
      return (
        match.substitutions?.find(
          s => s.playerOut === playerGame.number && s.team === teamTag,
        )?.minute ?? 90
      );
    }
    const redCard = match.cards?.find(
      c =>
        c.player === playerGame.number &&
        c.team === teamTag &&
        c.cardType === 'red',
    );
    return redCard?.minute ?? 90;
  }

  private processGoals(
    statsMap: Map<number, PlayerStats>,
    match: Match,
    isLocal: boolean,
  ) {
    const teamTag = isLocal ? 'local' : 'visitor';
    for (const goal of match.goals || []) {
      const playerTeam = this.getGoalPlayerTeam(goal);
      if (playerTeam !== teamTag) continue;
      this.applyGoalToPlayer(statsMap, goal);
      this.applyAssistToPlayer(statsMap, goal);
    }
  }

  private getGoalPlayerTeam(goal: Goal): TeamSide {
    if (goal.ownGoal) return goal.team === 'local' ? 'visitor' : 'local';
    return goal.team;
  }

  private applyGoalToPlayer(statsMap: Map<number, PlayerStats>, goal: Goal) {
    const playerStats = statsMap.get(goal.player);
    if (!playerStats) return;
    if (goal.ownGoal) {
      playerStats.ownGoals += 1;
    } else {
      playerStats.goals += 1;
    }
  }

  private applyAssistToPlayer(statsMap: Map<number, PlayerStats>, goal: Goal) {
    if (!goal.assist) return;
    const assistStats = statsMap.get(goal.assist);
    if (assistStats) assistStats.assists += 1;
  }

  private processCards(
    statsMap: Map<number, PlayerStats>,
    match: Match,
    isLocal: boolean,
  ) {
    const teamTag = isLocal ? 'local' : 'visitor';
    for (const card of match.cards || []) {
      if (card.team !== teamTag) continue;
      const playerStats = statsMap.get(card.player);
      if (!playerStats) continue;
      if (card.cardType === 'yellow') {
        playerStats.yellowCards += 1;
      } else if (card.cardType === 'red') {
        playerStats.redCards += 1;
      }
    }
  }
}
