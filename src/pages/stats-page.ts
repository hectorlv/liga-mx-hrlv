import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Match, Player, PlayerTeam } from '../types';

interface PlayerStats {
  key: string;
  name: string;
  team: string;
  goals: number;
  assists: number;
  yellows: number;
  reds: number;
}

interface TeamStats {
  team: string;
  goalsFor: number;
  goalsAgainst: number;
  yellows: number;
  reds: number;
}

@customElement('stats-page')
export class StatsPage extends LitElement {
  static override readonly styles = [
    css`
      :host {
        display: block;
        box-sizing: border-box;
        padding: 16px;
        text-align: center;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      .card {
        background: var(--md-sys-color-surface, #fff);
        border-radius: 12px;
        padding: 12px 14px;
        box-shadow: var(--md-sys-elevation-1, 0 1px 3px rgba(0, 0, 0, 0.15));
      }
      h3 {
        margin: 0 0 8px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        border-spacing: 0;
      }
      th,
      td {
        padding: 6px 8px;
        text-align: center;
        border: 1px solid #ffffff;
      }
      th {
        font-weight: 600;
        background: #ffffff;
        position: sticky;
        top: 0;
        z-index: 1;
      }
      tr:nth-child(even) {
        background: var(--table-row-alt, #d0e4f5);
      }
      .meta {
        font-size: 0.9em;
        color: var(--md-sys-color-on-surface-variant, #555);
      }
      .subgrid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();

  override render() {
    const { playerStats, teamStats, topScorers, topAssists, fairPlay } =
      this._buildStats();
    return html`
      <div class="grid">
        <div class="card">
          <h3>Estadísticas por jugador</h3>
          <div class="meta">Ordenado por goles</div>
          ${playerStats.length === 0
            ? html`<p>No hay datos de jugadores.</p>`
            : html`
                <table>
                  <thead>
                    <tr>
                      <th>Jugador</th>
                      <th>Equipo</th>
                      <th>G</th>
                      <th>Asist</th>
                      <th>A</th>
                      <th>R</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${playerStats.slice(0, 50).map(
                      p => html`<tr>
                        <td>${p.name}</td>
                        <td>${p.team}</td>
                        <td>${p.goals}</td>
                        <td>${p.assists}</td>
                        <td>${p.yellows}</td>
                        <td>${p.reds}</td>
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
                <table>
                  <thead>
                    <tr>
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
                      t => html`<tr>
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
      </div>

      <div class="grid" style="margin-top:12px;">
        <div class="card">
          <h3>Ranking goleadores</h3>
          ${topScorers.length === 0
            ? html`<p>Sin goles registrados.</p>`
            : html`
                <table>
                  <thead>
                    <tr>
                      <th>Jugador</th>
                      <th>Equipo</th>
                      <th>G</th>
                      <th>Asist</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topScorers.map(
                      p => html`<tr>
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
                <table>
                  <thead>
                    <tr>
                      <th>Jugador</th>
                      <th>Equipo</th>
                      <th>Asist</th>
                      <th>G</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topAssists.map(
                      p => html`<tr>
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
                <table>
                  <thead>
                    <tr>
                      <th>Equipo</th>
                      <th>Puntos</th>
                      <th>A</th>
                      <th>R</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${fairPlay.map(
                      t => html`<tr>
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
      </div>
    `;
  }

  private _buildStats() {
    const playerStats = new Map<string, PlayerStats>();
    const teamStats = new Map<string, TeamStats>();

    this.matchesList.forEach(match => {
      const localKey = this._teamKey(match.local);
      const visitorKey = this._teamKey(match.visitante);
      const localPlayers = this.players.get(localKey) || [];
      const visitorPlayers = this.players.get(visitorKey) || [];

      const ensureTeam = (teamName: string) => {
        if (!teamStats.has(teamName)) {
          teamStats.set(teamName, {
            team: teamName,
            goalsFor: 0,
            goalsAgainst: 0,
            yellows: 0,
            reds: 0,
          });
        }
        return teamStats.get(teamName)!;
      };

      const ensurePlayer = (
        teamName: string,
        number: number,
        playerList: Player[],
      ) => {
        const key = `${teamName}-${number}`;
        if (!playerStats.has(key)) {
          const name =
            playerList.find(p => p.number === number)?.name ||
            `#${number}`;
          playerStats.set(key, {
            key,
            name,
            team: teamName,
            goals: 0,
            assists: 0,
            yellows: 0,
            reds: 0,
          });
        }
        return playerStats.get(key)!;
      };

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
    });

    const playerArray = Array.from(playerStats.values()).sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.assists !== a.assists) return b.assists - a.assists;
      return a.name.localeCompare(b.name);
    });
    const teamArray = Array.from(teamStats.values()).sort(
      (a, b) => {
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        if (b.goalsAgainst !== a.goalsAgainst)
          return a.goalsAgainst - b.goalsAgainst;
        return a.team.localeCompare(b.team);
      });
    const topScorers = playerArray.filter(p => p.goals > 0).slice(0, 10);
    const topAssists = playerArray.filter(p => p.assists > 0).sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      return b.goals - a.goals;
    }).slice(0, 10);
    const fairPlay = [...teamArray].sort((a, b) => {
      const ptsA = a.yellows + a.reds * 2;
      const ptsB = b.yellows + b.reds * 2;
      if (ptsA !== ptsB) return ptsA - ptsB;
      return a.team.localeCompare(b.team);
    }).slice(0, 10);

    return { playerStats: playerArray, teamStats: teamArray, topScorers, topAssists, fairPlay };
  }

  private _teamKey(name: string) {
    return name.replaceAll('.', '');
  }
}
