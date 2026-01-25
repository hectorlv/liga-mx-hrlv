import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Match, Player, PlayerGame, PlayerTeam, TeamSide } from '../types';
import styles from '../styles/liga-mx-hrlv-styles.js';

interface PlayerStats {
  key: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
  minutes: number;
}

interface TeamStats {
  team: string;
  goalsFor: number;
  goalsAgainst: number;
  yellows: number;
  reds: number;
  u23PlayersCount: number;
  u23totalMinutes: number;
  u23countedMinutes: number;
  u23minutesToFulfill: number;
}

@customElement('stats-page')
export class StatsPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        box-sizing: border-box;
        padding: 16px;
        text-align: center;
      }
      .card {
        background: var(--md-sys-color-surface, #fff);
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: var(--md-sys-elevation-1, 0 1px 3px rgba(0, 0, 0, 0.15));
      }
      .table-wrapper {
        width: 100%;
        overflow-x: auto;
      }
      h3 {
        margin: 0 0 8px 0;
      }

      .meta {
        font-size: 0.9em;
        color: var(--md-sys-color-on-surface-variant, #555);
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();

  override render() {
    const { playerStats, teamStats, topScorers, topAssists, fairPlay } =
      this._buildStats();
    const teamStatsByU23 = [...teamStats].sort((a, b) => b.u23countedMinutes - a.u23countedMinutes);
    return html`
      <div class="card">
        <h3>Estadísticas por jugador</h3>
        <div class="meta">Ordenado por goles</div>
        ${playerStats.length === 0
          ? html`<p>No hay datos de jugadores.</p>`
          : html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Jugador</th>
                    <th>Equipo</th>
                    <th>G</th>
                    <th>Asist</th>
                    <th>A</th>
                    <th>R</th>
                    <th>Minutos jugados</th>
                  </tr>
                </thead>
                <tbody>
                  ${playerStats.slice(0, 50).map(
                    (p, i) =>
                      html`<tr>
                        <td>${i + 1}</td>
                        <td>${p.name}</td>
                        <td>${p.team}</td>
                        <td>${p.goals}</td>
                        <td>${p.assists}</td>
                        <td>${p.yellows}</td>
                        <td>${p.reds}</td>
                        <td>${p.minutes}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            `}
      </div>

      <div class="card">
        <h3>Estadísticas por equipo</h3>
        <div class="meta">Goles a favor/en contra y disciplina</div>
        ${teamStats.length === 0
          ? html`<p>No hay datos de equipos.</p>`
          : html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Equipo</th>
                    <th>GF</th>
                    <th>GC</th>
                    <th>Dif</th>
                    <th>A</th>
                    <th>R</th>
                  </tr>
                </thead>
                <tbody>
                  ${teamStats.map(
                    (t, i) =>
                      html`<tr>
                        <td>${i + 1}</td>
                        <td>${t.team}</td>
                        <td>${t.goalsFor}</td>
                        <td>${t.goalsAgainst}</td>
                        <td>${t.goalsFor - t.goalsAgainst}</td>
                        <td>${t.yellows}</td>
                        <td>${t.reds}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            `}
      </div>

      <div class="card">
        <h3>Ranking goleadores</h3>
        ${topScorers.length === 0
          ? html`<p>Sin goles registrados.</p>`
          : html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Jugador</th>
                    <th>Equipo</th>
                    <th>G</th>
                    <th>Asist</th>
                  </tr>
                </thead>
                <tbody>
                  ${topScorers.map(
                    (p, i) =>
                      html`<tr>
                        <td>${i + 1}</td>
                        <td>${p.name}</td>
                        <td>${p.team}</td>
                        <td>${p.goals}</td>
                        <td>${p.assists}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            `}
      </div>
      <div class="card">
        <h3>Ranking asistencias</h3>
        ${topAssists.length === 0
          ? html`<p>Sin asistencias registradas.</p>`
          : html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Jugador</th>
                    <th>Equipo</th>
                    <th>Asist</th>
                    <th>G</th>
                  </tr>
                </thead>
                <tbody>
                  ${topAssists.map(
                    (p, i) =>
                      html`<tr>
                        <td>${i + 1}</td>
                        <td>${p.name}</td>
                        <td>${p.team}</td>
                        <td>${p.assists}</td>
                        <td>${p.goals}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            `}
      </div>
      <div class="card">
        <h3>Ranking fair play (menos puntos)</h3>
        <div class="meta">Puntaje: Amarilla=1, Roja=2</div>
        ${fairPlay.length === 0
          ? html`<p>Sin tarjetas registradas.</p>`
          : html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Equipo</th>
                    <th>Puntos</th>
                    <th>A</th>
                    <th>R</th>
                  </tr>
                </thead>
                <tbody>
                  ${fairPlay.map(
                    (t, i) =>
                      html`<tr>
                        <td>${i + 1}</td>
                        <td>${t.team}</td>
                        <td>${t.yellows + t.reds * 2}</td>
                        <td>${t.yellows}</td>
                        <td>${t.reds}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            `}
      </div>
      <div class="card">
        <h3>Minutos de menores</h3>
        ${teamStats && teamStats.length > 0
          ? html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th>Pos</th>
                    <th>Equipo</th>
                    <th>Menores alineados</th>
                    <th>Minutos acumulados</th>
                    <th>Minutos al reglamento</th>
                    <th>Minutos por cumplir</th>
                  </tr>
                </thead>
                <tbody>
                  ${teamStatsByU23.map(
                    (t, i) =>
                      html`<tr>
                        <td>${i + 1}</td>
                        <td>${t.team}</td>
                        <td>${t.u23PlayersCount}</td>
                        <td>${t.u23totalMinutes}</td>
                        <td>${t.u23countedMinutes}</td>
                        <td>${t.u23minutesToFulfill}</td>
                      </tr>`,
                  )}
                </tbody>
              </table>
            `
          : html`<p>No hay datos de minutos de menores.</p>`}
      </div>
    `;
  }

  private _buildStats() {
    const playerStats = new Map<string, PlayerStats>();
    const teamStats = new Map<string, TeamStats>();
    const u23PlayersTeam = new Map<string, Set<number>>();

    const ensureTeam = (teamName: string) => {
      if (!teamStats.has(teamName)) {
        teamStats.set(teamName, {
          team: teamName,
          goalsFor: 0,
          goalsAgainst: 0,
          yellows: 0,
          reds: 0,
          u23PlayersCount: 0,
          u23totalMinutes: 0,
          u23countedMinutes: 0,
          u23minutesToFulfill: 0,
        });
      }
      return teamStats.get(teamName)!;
    };

    const u23PlayersSet = (teamName: string) => {
      if (!u23PlayersTeam.has(teamName)) {
        u23PlayersTeam.set(teamName, new Set<number>());
      }
      return u23PlayersTeam.get(teamName)!;
    }

    const ensurePlayer = (
      teamName: string,
      number: number,
      playerList: Player[],
    ) => {
      const key = `${teamName}-${number}`;
      if (!playerStats.has(key)) {
        const name =
          playerList.find(p => p.number === number)?.name || `#${number}`;
        playerStats.set(key, {
          key,
          name,
          team: teamName,
          goals: 0,
          assists: 0,
          yellows: 0,
          reds: 0,
          minutes: 0,
        });
      }
      return playerStats.get(key)!;
    };

    const addLineupMinutes = (
      match: Match,
      lineup: PlayerGame[],
      teamName: string,
      teamTag: TeamSide,
      playerList: Player[],
    ) => {
      lineup.forEach(player => {
        const stat = ensurePlayer(teamName, player.number, playerList);
        const inMinute = player.entroDeCambio
          ? (match.substitutions?.find(
              s => s.playerIn === player.number && s.team === teamTag,
            )?.minute ?? 0)
          : 0;
        let outMinute = 90;
        if (player.salioDeCambio) {
          outMinute =
            match.substitutions?.find(
              s => s.playerOut === player.number && s.team === teamTag,
            )?.minute ?? 90;
        } else if (
          match.cards?.some(
            c =>
              c.player === player.number &&
              c.team === teamTag &&
              c.cardType === 'red',
          )
        ) {
          outMinute =
            match.cards?.find(
              c =>
                c.player === player.number &&
                c.team === teamTag &&
                c.cardType === 'red',
            )?.minute ?? 90;
        }
        stat.minutes += outMinute - inMinute;
      });
    };

    const calculateU23Minutes = (match: Match,
      lineup: PlayerGame[],
      teamName: string,
      teamTag: TeamSide,
      playerList: Player[]) => {
      const u23Players = Array.from(playerList.values()).filter(player => {
        const birthYear = Number(typeof player.birthDate === 'string' ? player.birthDate.split("/")[2] : player.birthDate.getFullYear());
        const minYear = 2003; // Año límite para ser considerado U23 en 2026
        // Solo considerar jugadores con nacionalidad mexicana
        if (player.nationality !== 'Mexicano') return false;
        return birthYear >= minYear;
      });
      const teamStat = ensureTeam(teamName);
      let minutesByU23 = 0;
      lineup.forEach(playerGame => {
        if (u23Players.some(p => p.number === playerGame.number)) {
          u23PlayersSet(teamName).add(playerGame.number);
          const inMinute = playerGame.entroDeCambio
            ? (match.substitutions?.find(
                s => s.playerIn === playerGame.number && s.team === teamTag,
              )?.minute ?? 0)
            : 0;
          let outMinute = 90;
          if (playerGame.salioDeCambio) {
            outMinute =
              match.substitutions?.find(
                s => s.playerOut === playerGame.number && s.team === teamTag,
              )?.minute ?? 90;
          } else if (
            match.cards?.some(
              c =>
                c.player === playerGame.number &&
                c.team === teamTag &&
                c.cardType === 'red',
            )
          ) {
            outMinute =
              match.cards?.find(
                c =>
                  c.player === playerGame.number &&
                  c.team === teamTag &&
                  c.cardType === 'red',
              )?.minute ?? 90;
          }
          const minutesPlayed = outMinute - inMinute;
          teamStat.u23totalMinutes += minutesPlayed;
          minutesByU23 += minutesPlayed;
        }
      });
      // Máximo 225 minutos contables por partido
      teamStat.u23countedMinutes += Math.min(minutesByU23, 225);
      teamStat.u23PlayersCount = u23PlayersSet(teamName).size;
      const requiredMinutes = 1170;
      teamStat.u23minutesToFulfill = Math.max(0, requiredMinutes - teamStat.u23countedMinutes);
    };

    this.matchesList.forEach(match => {
      const localKey = this._teamKey(match.local);
      const visitorKey = this._teamKey(match.visitante);
      const localPlayers = this.players.get(localKey) || [];
      const visitorPlayers = this.players.get(visitorKey) || [];

      // Goals and assists
      (match.goals || []).forEach(goal => {
        const creditedTeam =
          goal.team === 'local' ? match.local : match.visitante;
        const opponent = goal.team === 'local' ? match.visitante : match.local;
        const scoringPlayers =
          goal.team === 'local' ? localPlayers : visitorPlayers;
        // Solo contar al jugador si no es autogol
        if (!goal.ownGoal) {
          const stat = ensurePlayer(creditedTeam, goal.player, scoringPlayers);
          stat.goals += 1;
          if (goal.assist) {
            const assistStat = ensurePlayer(
              creditedTeam,
              goal.assist,
              scoringPlayers,
            );
            assistStat.assists += 1;
          }
        }
        ensureTeam(creditedTeam).goalsFor += 1;
        ensureTeam(opponent).goalsAgainst += 1;
      });

      // Cards
      (match.cards || []).forEach(card => {
        const teamName = card.team === 'local' ? match.local : match.visitante;
        const teamPlayers =
          card.team === 'local' ? localPlayers : visitorPlayers;
        const stat = ensurePlayer(teamName, card.player, teamPlayers);
        if (card.cardType === 'yellow') {
          stat.yellows += 1;
          ensureTeam(teamName).yellows += 1;
        } else {
          stat.reds += 1;
          ensureTeam(teamName).reds += 1;
        }
      });

      // Minutes played
      if (match.phaseEvents?.some(e => e.phase === 'fulltime')) {
        addLineupMinutes(
          match,
          match.lineupLocal || [],
          match.local,
          'local',
          localPlayers,
        );
        addLineupMinutes(
          match,
          match.lineupVisitor || [],
          match.visitante,
          'visitor',
          visitorPlayers,
        );
      }
      // U23 Minutes
      if (match.phaseEvents?.some(e => e.phase === 'fulltime')) {
        calculateU23Minutes(
          match,
          match.lineupLocal || [],
          match.local,
          'local',
          localPlayers,
        );
        calculateU23Minutes(
          match,
          match.lineupVisitor || [],
          match.visitante,
          'visitor',
          visitorPlayers,
        );
      }
    });

    const playerArray = Array.from(playerStats.values()).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.minutes !== b.minutes) return a.minutes - b.minutes;
      return a.name.localeCompare(b.name);
    });
    const teamArray = Array.from(teamStats.values()).sort((a, b) => {
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      if (b.goalsAgainst !== a.goalsAgainst)
        return a.goalsAgainst - b.goalsAgainst;
      return a.team.localeCompare(b.team);
    });
    const topScorers = playerArray.filter(p => p.goals > 0).slice(0, 10);
    const topAssists = playerArray
      .filter(p => p.assists > 0)
      .sort((a, b) => {
        if (b.assists !== a.assists) return b.assists - a.assists;
        return b.goals - a.goals;
      })
      .slice(0, 10);
    const fairPlay = [...teamArray]
      .sort((a, b) => {
        const ptsA = a.yellows + a.reds * 2;
        const ptsB = b.yellows + b.reds * 2;
        if (ptsA !== ptsB) return ptsA - ptsB;
        return a.team.localeCompare(b.team);
      })
      .slice(0, 10);

    return {
      playerStats: playerArray,
      teamStats: teamArray,
      topScorers,
      topAssists,
      fairPlay,
    };
  }

  private _teamKey(name: string) {
    return name.replaceAll('.', '');
  }
}
