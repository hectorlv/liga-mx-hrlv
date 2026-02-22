import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import {
  Goal,
  Match,
  Player,
  PlayerGame,
  TableEntry,
  TeamSide,
} from '../types/index.js';
import { getTeamImage } from '../utils/imageUtils.js';

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
  imageUrl: string;
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
      }

      /* HEADER DEL EQUIPO */
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

      /* CONTENEDOR GRID */
      .players-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* --- VISTA MÓVIL (Tarjetas de Jugador) --- */
      .player-card {
        background: var(--card-bg);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
        gap: 12px;
        border: 1px solid var(--md-sys-color-outline-variant);
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

      .player-meta {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
        display: flex;
        gap: 16px;
      }

      /* Bloquecitos de Stats para el cel */
      .player-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr); /* 3 columnas en móvil */
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

      .desktop-headers {
        display: none;
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

      /* --- VISTA ESCRITORIO (Tabla) --- */
      @media (min-width: 800px) {
        .players-grid {
          display: grid;
          /* 13 columnas: Foto| Num | Nombre | Pos | Nac | Edad | PJ | MIN | G | A | AG | TA | TR */
          grid-template-columns: 60px 50px 2fr 100px 100px 80px repeat(7, 1fr);
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

        /* "Desarmamos" los divs de móvil para que los hijos fluyan en el grid */
        .player-header,
        .player-meta,
        .player-stats,
        .stat-item {
          display: contents;
        }

        /* Estilo general de celda */
        .cell {
          padding: 12px 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          background: var(--card-bg);
        }

        /* Asignación estricta a columnas */
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
          color: var(--app-color-warning, #b8860b);
          font-weight: bold;
        }
        .stat-tr {
          grid-column: 13;
          color: var(--app-color-danger, #d32f2f);
          font-weight: bold;
        }

        .stat-label {
          display: none;
        } /* Ocultamos etiquetas en desktop */
        .stat-value {
          font-weight: normal;
          color: inherit;
        } /* Reseteamos peso */

        .player-card:hover .cell {
          background-color: var(--row-hover);
        }
      }
    `,
  ];

  @property({ type: Object }) team!: TableEntry;
  @property({ type: Array }) players!: Player[];
  @property({ type: Array }) matchesList!: Match[];

  @state() private playersList: PlayerStats[] = [];

  override render() {
    return html`
      <main>
        <div class="header-container">
          <md-icon-button
            id="backButton"
            @click=${() => this.dispatchEvent(new CustomEvent('back'))}
            title="Volver"
            aria-label="Volver"
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
          </div>

          ${this.playersList.map(
            player => html`
              <div class="player-card">
                <div class="player-header">
                  <div class="cell cell-photo">
                    ${player.imageUrl
                      ? html`
                          <img
                            class="player-photo"
                            src="${player.imageUrl}"
                            alt="${player.fullName}"
                            loading="lazy"
                          />
                        `
                      : html`<div class="player-photo">
                          <md-icon>person</md-icon>
                        </div>`}
                  </div>
                  <div class="cell cell-num">${player.number}</div>
                  <div class="cell cell-name">${player.fullName}</div>
                  <div class="cell cell-pos">${player.position}</div>
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
                </div>
              </div>
            `,
          )}
        </div>
      </main>
    `;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.getPlayerStats();
  }

  private getPlayerStats() {
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
        imageUrl: player.imgSrc || '',
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
    if (goal.ownGoal) {
      return goal.team === 'local' ? 'visitor' : 'local';
    }
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
