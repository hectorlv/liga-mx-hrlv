import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Match, Player, PlayerGame, PlayerTeam, TeamSide } from '../types';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { getTeamImage } from '../utils/imageUtils.js';

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
        padding: 16px;
        --card-bg: var(--md-sys-color-surface);
      }

      /* LAYOUT TIPO DASHBOARD */
      .dashboard-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 24px;
        align-items: start;
      }

      @media (min-width: 900px) {
        .dashboard-grid {
          /* En pantallas grandes, acomoda 2 tablas por fila */
          grid-template-columns: repeat(2, 1fr);
        }

        /* Hacemos que la tabla principal de jugadores ocupe todo el ancho */
        .card.full-width {
          grid-column: 1 / -1;
        }
      }

      /* ESTILO DE LAS TARJETAS */
      .card {
        background: var(--card-bg);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--md-sys-color-outline-variant);
        overflow: hidden;
      }

      .card-header {
        margin-bottom: 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        padding-bottom: 12px;
      }

      h3 {
        margin: 0 0 4px 0;
        color: var(--md-sys-color-on-surface);
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .meta {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant);
      }

      /* ESTILO LIMPIO PARA TODAS LAS TABLAS */
      .table-wrapper {
        width: 100%;
        overflow-x: auto;
        /* Scroll suave en móvil */
        -webkit-overflow-scrolling: touch;
      }

      .modern-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.9rem;
        white-space: nowrap;
      }

      .modern-table th {
        background: var(--md-sys-color-surface-container);
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 600;
        padding: 12px 16px;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.5px;
        border-bottom: 2px solid var(--md-sys-color-outline-variant);
      }

      .modern-table td {
        padding: 12px 16px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        color: var(--md-sys-color-on-surface);
        vertical-align: middle;
      }

      /* Hover sutil en las filas */
      .modern-table tbody tr:hover {
        background-color: var(--row-hover, rgba(0, 0, 0, 0.02));
      }

      /* Destacar la columna de "Posición" */
      .modern-table td:first-child {
        font-weight: bold;
        color: var(--md-sys-color-on-surface-variant);
        text-align: center;
      }
      .modern-table th:first-child {
        text-align: center;
      }

      /* El #1 de los rankings resalta en dorado/primario */
      .rank-1 td:first-child {
        color: var(--app-color-warning, #ffb300);
        font-size: 1.1rem;
      }
      .rank-1 {
        background-color: rgba(255, 179, 0, 0.05);
      }

      /* Alineación de números a la derecha para legibilidad */
      .modern-table th.num-col,
      .modern-table td.num-col {
        text-align: center;
      }

      /* Imagen del equipo chiquita en la tabla */
      .team-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
      }
      .team-cell img {
        width: 24px;
        height: 24px;
        object-fit: contain;
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) teams: string[] = [];
  @property({ type: Object }) players: PlayerTeam = new Map();

  override render() {
    const { teamStats, topScorers, topAssists, fairPlay } = this._buildStats();
    const teamStatsByU23 = [...teamStats].sort(
      (a, b) => b.u23countedMinutes - a.u23countedMinutes,
    );

    return html`
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h3><md-icon>sports_soccer</md-icon> Top Goleadores</h3>
            <div class="meta">Los 10 mejores romperedes</div>
          </div>
          <div class="table-wrapper">
            ${topScorers.length === 0
              ? html`<p class="meta">Sin goles registrados.</p>`
              : html`
                  <table class="modern-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Jugador</th>
                        <th>Equipo</th>
                        <th class="num-col">G</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${topScorers.map(
                        (p, i) => html`
                          <tr class="${i === 0 ? 'rank-1' : ''}">
                            <td>${i + 1}</td>
                            <td style="font-weight: bold;">${p.name}</td>
                            <td>
                              <div class="team-cell">
                                ${getTeamImage(p.team)} ${p.team}
                              </div>
                            </td>
                            <td
                              class="num-col"
                              style="font-weight:bold; color: var(--md-sys-color-primary)"
                            >
                              ${p.goals}
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                `}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>assist_walker</md-icon> Top Asistencias</h3>
            <div class="meta">Los 10 mejores pasadores</div>
          </div>
          <div class="table-wrapper">
            ${topAssists.length === 0
              ? html`<p class="meta">Sin asistencias registradas.</p>`
              : html`
                  <table class="modern-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Jugador</th>
                        <th>Equipo</th>
                        <th class="num-col">Ast</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${topAssists.map(
                        (p, i) => html`
                          <tr class="${i === 0 ? 'rank-1' : ''}">
                            <td>${i + 1}</td>
                            <td style="font-weight: bold;">${p.name}</td>
                            <td>
                              <div class="team-cell">
                                ${getTeamImage(p.team)} ${p.team}
                              </div>
                            </td>
                            <td
                              class="num-col"
                              style="font-weight:bold; color: var(--md-sys-color-primary)"
                            >
                              ${p.assists}
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                `}
          </div>
        </div>

        <div class="card full-width">
          <div class="card-header">
            <h3><md-icon>boy</md-icon> Regla de Menores (Sub-23)</h3>
            <div class="meta">Minutos acumulados para cumplir la norma</div>
          </div>
          <div class="table-wrapper">
            ${teamStats.length === 0
              ? html`<p class="meta">No hay datos.</p>`
              : html`
                  <table class="modern-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th class="num-col">Menores Alineados</th>
                        <th class="num-col">Minutos Acumulados</th>
                        <th class="num-col">Min. Acreditados</th>
                        <th class="num-col">Faltan</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${teamStatsByU23.map(
                        (t, i) => html`
                          <tr>
                            <td>${i + 1}</td>
                            <td>
                              <div class="team-cell">
                                ${getTeamImage(t.team)} ${t.team}
                              </div>
                            </td>
                            <td class="num-col">${t.u23PlayersCount}</td>
                            <td class="num-col">${t.u23totalMinutes}'</td>
                            <td
                              class="num-col"
                              style="font-weight:bold; color:var(--md-sys-color-primary)"
                            >
                              ${t.u23countedMinutes}'
                            </td>
                            <td
                              class="num-col"
                              style="color: ${t.u23minutesToFulfill === 0
                                ? 'var(--md-sys-color-primary)'
                                : 'var(--app-color-danger, #D32F2F)'}; font-weight:bold;"
                            >
                              ${t.u23minutesToFulfill === 0
                                ? '✓ Cumplido'
                                : t.u23minutesToFulfill + "'"}
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                `}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>style</md-icon> Ranking Fair Play</h3>
            <div class="meta">Menos puntos es mejor (A=1, R=2)</div>
          </div>
          <div class="table-wrapper">
            ${fairPlay.length === 0
              ? html`<p class="meta">Sin tarjetas.</p>`
              : html`
                  <table class="modern-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th class="num-col">Pts</th>
                        <th class="num-col" style="color:#B8860B">A</th>
                        <th class="num-col" style="color:#D32F2F">R</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${fairPlay.map(
                        (t, i) => html`
                          <tr class="${i === 0 ? 'rank-1' : ''}">
                            <td>${i + 1}</td>
                            <td>
                              <div class="team-cell">
                                ${getTeamImage(t.team)} ${t.team}
                              </div>
                            </td>
                            <td class="num-col" style="font-weight:bold;">
                              ${t.yellows + t.reds * 2}
                            </td>
                            <td class="num-col">${t.yellows}</td>
                            <td class="num-col">${t.reds}</td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                `}
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3><md-icon>bar_chart</md-icon> Ofensiva y Defensiva</h3>
            <div class="meta">Goles a favor y en contra</div>
          </div>
          <div class="table-wrapper">
            ${teamStats.length === 0
              ? html`<p class="meta">No hay datos.</p>`
              : html`
                  <table class="modern-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Equipo</th>
                        <th class="num-col">GF</th>
                        <th class="num-col">GC</th>
                        <th class="num-col">Dif</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${teamStats.slice(0, 10).map(
                        (t, i) => html`
                          <tr>
                            <td>${i + 1}</td>
                            <td>
                              <div class="team-cell">
                                ${getTeamImage(t.team)} ${t.team}
                              </div>
                            </td>
                            <td class="num-col">${t.goalsFor}</td>
                            <td class="num-col">${t.goalsAgainst}</td>
                            <td
                              class="num-col"
                              style="font-weight:bold; color:${t.goalsFor -
                                t.goalsAgainst >
                              0
                                ? 'var(--md-sys-color-primary)'
                                : 'inherit'}"
                            >
                              ${t.goalsFor - t.goalsAgainst > 0
                                ? '+'
                                : ''}${t.goalsFor - t.goalsAgainst}
                            </td>
                          </tr>
                        `,
                      )}
                    </tbody>
                  </table>
                `}
          </div>
        </div>
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
    };

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

    const calculateU23Minutes = (
      match: Match,
      lineup: PlayerGame[],
      teamName: string,
      teamTag: TeamSide,
      playerList: Player[],
    ) => {
      const u23Players = Array.from(playerList.values()).filter(player => {
        const birthYear = Number(
          typeof player.birthDate === 'string'
            ? player.birthDate.split('/')[2]
            : player.birthDate.getFullYear(),
        );
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
      teamStat.u23minutesToFulfill = Math.max(
        0,
        requiredMinutes - teamStat.u23countedMinutes,
      );
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
