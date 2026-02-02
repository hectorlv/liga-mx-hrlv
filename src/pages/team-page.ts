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
}

@customElement('team-page')
export class TeamPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      @media (max-width: 600px) {
        .players-table {
          display: block;
          width: 100vw;
          max-width: 100vw;
          margin-left: calc(-50vw + 50%);
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          box-sizing: border-box;
          padding: 0 8px;
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
        ${getTeamImage(this.team.equipo)}
        <h1>${this.team.equipo}</h1>
        <md-icon-button
          id="backButton"
          @click=${() => this.dispatchEvent(new CustomEvent('back'))}
          title="Volver"
          aria-label="Volver"
        >
          <md-icon>arrow_back</md-icon>
        </md-icon-button>
        <h2>Jugadores</h2>
        <div class="players-table">
          <table class="greyGridTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Posición</th>
                <th>Nacionalidad</th>
                <th>Edad</th>
                <th>Partidos Jugados</th>
                <th>Minutos Jugados</th>
                <th>Goles</th>
                <th>Asistencias</th>
                <th>Autogoles</th>
                <th>Tarjetas Amarillas</th>
                <th>Tarjetas Rojas</th>
              </tr>
            </thead>
            <tbody>
              ${this.playersList.map(
                player => html`
                  <tr>
                    <td>${player.number}</td>
                    <td>${player.fullName}</td>
                    <td>${player.position}</td>
                    <td>${player.nationality}</td>
                    <td>${player.age}</td>
                    <td>${player.gamesPlayed}</td>
                    <td>${player.minutesPlayed}</td>
                    <td>${player.goals}</td>
                    <td>${player.assists}</td>
                    <td>${player.ownGoals}</td>
                    <td>${player.yellowCards}</td>
                    <td>${player.redCards}</td>
                  </tr>
                `,
              )}
            </tbody>
          </table>
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
      const month = Number.parseInt(birthParts[1], 10) - 1; // Months are zero-based
      const year = Number.parseInt(birthParts[2], 10);
      birth = new Date(year, month, day);
    } else if (birthDate instanceof Date) {
      birth = birthDate;
    } else {
      return 'Desconocida';
    }
    const today = new Date();
    const years = today.getFullYear() - birth.getFullYear();
    const months = today.getMonth() - birth.getMonth();
    const days = today.getDate() - birth.getDate();

    let ageString = `${years} años`;
    if (months < 0 || (months === 0 && days < 0)) {
      ageString = `${years - 1} años`;
    }
    ageString += ` ${(months + 12) % 12} meses ${days < 0 ? days + 30 : days} días`;
    return ageString;
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
