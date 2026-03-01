import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { Match, PlayerTeam, TableEntry } from '../types/index.js';
import { isMatchLive } from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
import './team-page.js';

/**
 * Page for the table of positions
 */
@customElement('table-page')
export class TablePage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host {
        display: block;
        padding: var(--space-16);
      }

      /* Leyenda de clasificación */
      .legend {
        display: flex;
        gap: 16px;
        margin-bottom: 16px;
        font-size; 0.8rem;
        flex-wrap: wrap;
        justify-content: center;
        color: var(--md-sys-color-on-surface-variant);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .dot.qualified {
        background-color: var(--md-sys-color-primary);
      }
      .dot.playin {
        background-color: var(--app-color-warning, #FFC107);
      }
      .dot.eliminated {
        background-color: var(--app-color-danger);
      }

      /* Contenedor principal */
      .table-container {
        display: flex;
        flex-direction: column;
        background: var(--md-sys-color-surface);
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }

      /* Vista movil */
      .table-row {
        position: relative;
        display: grid;
        grid-template-areas:
        "pos logo team pts"
        "pos logo stats pts";
        grid-template-columns: 32px 48px 1fr 45px;
        padding: 12px 8px;
        border-bottom: 1px solid var(--md-sys-color-outline-variant);
        cursor: pointer;
        transition: background-color 0.2s;
        gap: 4px 8px;
        align-items: center;
      }

      .table-row:active {
        background-color: var(--row-hover);
      }

      /* Indicador lateral de clasifiación */
      .indicator-bar {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
      }
      .qualified .indicator-bar {
        background-color: var(--md-sys-color-primary);
      }
      .playin .indicator-bar {
        background-color: var(--app-color-warning, #FFC107);
      }
      .eliminated .indicator-bar {
        background-color: var(--app-color-danger, #F44336);
      }
      .cell {
        display: flex;
        align-items: center;
      }
      .cell-pos {
        grid-area: pos;
        justify-content: center;
        font-weight: bold;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.9rem;
        position: relative;
      }
      .live-dot {
        position: absolute;
        top: 6px;
        right: 6px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background-color: var(--app-color-danger, #f44336);
        box-shadow: 0 0 0 2px var(--md-sys-color-surface);
        animation: live-dot-blink 1.2s ease-in-out infinite;
      }

      @keyframes live-dot-blink {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.35;
        }
      }

      /* En móvil desplazamos el punto hacia la esquina de la fila
         para que no quede encima del número de posición. */
      .table-row .cell-pos .live-dot {
        top: -5px;
        right: -9px;
      }
      .cell-logo {
        grid-area: logo;
        justify-content: center;
      }
      .cell-logo img {
        width: 36px;
        height: 36px;
        object-fit: contain;
      }
      .cell-team {
        grid-area: team;
        font-weight: 800;
        font-size: 1.2rem;
        color: var(--md-sys-color-primary);
        justify-content: flex-end;
      }
      .cell-pts {
        grid-area: pts;
        font-weight: 800;
        font-size: 1.2rem;
        color: var(--md-sys-color-on-surface);
        background: var(--md-sys-color-surface-variant);
        justify-content: flex-end;
      }
      
      .mobile-stats {
        grid-area: stats;
        display: flex;
        gap: 12px;
        font-size: 0.75rem;
        color: var(--md-sys-color-on-surface-variant);
        align-self: flex-start;
      }
      .stat-pill {
        display: flex;
        gap: 4px;
      }
      .stat-label {
        opacity: 0.7;
      }
      .desktop-header, .desktop-stat {
        display: none;
      }

      /* Vista desktop */
      @media (min-width: 700px) {
        .table-container {
          display: grid;
          /*Definición de filas y columnas para desktop:
          Pos(50) Logo(60) Equipo(1fr) | JJ JG JE JP | GF GC DG | PTS(80)
          */
          grid-template-columns: 50px 70px 1fr 50px 50px 50px 50px 60px 60px 60px 80px;
          gap: 0;
        }

        .cell-pos { grid-column: 1; }
        .cell-logo { grid-column: 2; }
        .cell-team { grid-column: 3; }
        .stat-jj { grid-column: 4; }
        .stat-jg { grid-column: 5; }
        .stat-je { grid-column: 6; }
        .stat-jp { grid-column: 7; }
        .stat-gf { grid-column: 8; }
        .stat-gc { grid-column: 9; }
        .stat-dg { grid-column: 10; }
        .cell-pts { grid-column: 11;
          background: var(--md-sys-color-surface-variant);
          color: var(--md-sys-color-on-surface);
          font-weight:bold;
        }

        .desktop-header {
          display: contents;
        }
        .header-cell {
          background: var(--md-sys-color-primary-container);
          color: var(--md-sys-color-on-primary-container);
          font-weight: 700;
          font-size: 0.85rem;
          padding: 16px 8px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header-cell.align-left {
          justify-content: flex-start;
          padding-left: 16px;
        }
        .table-row {
          display: contents;
        }
        .indicator-bar {
          display: none;
        }
        .cell-pos, .cell-logo, .cell-team, .cell-pts {
          grid-area: auto;
        }
        .table-row .cell-pos .live-dot {
          top: 6px;
          right: 6px;
        }
        .cell {
          padding: 8px;
          border-bottom: 1px solid var(--md-sys-color-outline-variant);
          justify-content: center;
          height: 56px; /* Altura fija */
          font-size: 0.95rem;
          background: var(--md-sys-color-surface);
        }
        .cell-team {
          justify-content: flex-start;
          font-size: 1rem;
          align-self: center;
        }
        .cell-logo img {
          width: 32px;
          height: 32px;
        }
        .cell-pts {
          background: var(--md-sys-color-surface-variant);
        }
        .desktop-stat {
          display: flex;
        }
        .mobile-stats {
          display: none;
        }
        .table-row:hover .cell {
          background-color: var(--row-hover);
          cursor: pointer;
        }
        .qualified .cell-pos::before {
          content: "";
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 4px;
          background-color: var(--md-sys-color-primary);
          border-radius: 0 4px 4px 0;
        }
        .playin .cell-pos::before {
          content: "";
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 4px;
          background-color: var(--app-color-warning, #FFC107);
          border-radius: 0 4px 4px 0;
        }
        .eliminated .cell-pos::before {
          content: "";
          position: absolute;
          left: 0;
          top: 4px;
          bottom: 4px;
          width: 4px;
          background-color: var(--app-color-danger, #F44336);
          border-radius: 0 4px 4px 0;
        }

      }
      .champion-legend {
        max-width: 1100px;
        margin: var(--space-8) auto var(--space-16);
        padding: var(--space-12) var(--space-16);
        background: var(--md-sys-color-surface-container);
        border-radius: var(--radius-m);
        display: flex;
        align-items: center;
        gap: var(--space-8);
        font-weight: 600;
        justify-content: center;
      }
    `,
  ];
  @property({ type: Array }) table!: TableEntry[];
  @property({ type: Array }) teams!: string[];
  @property({ type: Object }) players!: PlayerTeam;
  @property({ type: Array }) matchesList!: Match[];

  @state() private selectedTeam: string | null = null;

  override render() {
    if (this.selectedTeam) {
      return html`
        <team-page
          .team=${this.table.find(t => t.equipo === this.selectedTeam)!}
          .players=${this.players.get(this.selectedTeam.replaceAll('.', ''))!}
          .matchesList=${this.matchesList.filter(
            m =>
              m.local === this.selectedTeam ||
              m.visitante === this.selectedTeam,
          )}
          @back=${() => (this.selectedTeam = null)}
        ></team-page>
      `;
    }
    return html`
      <main>
        <div class="legend">
          <div class="legend-item">
            <div class="dot qualified"></div>
            Clasificado
          </div>
          <div class="legend-item">
            <div class="dot playin"></div>
            Play-in
          </div>
          <div class="legend-item">
            <div class="dot eliminated"></div>
            Eliminado
          </div>
        </div>

        <div class="table-container">
          <div class="desktop-header">
            <div class="header-cell">Pos</div>
            <div class="header-cell"></div>
            <div class="header-cell align-left">Equipo</div>
            <div class="header-cell">JJ</div>
            <div class="header-cell">JG</div>
            <div class="header-cell">JE</div>
            <div class="header-cell">JP</div>
            <div class="header-cell">GF</div>
            <div class="header-cell">GC</div>
            <div class="header-cell">DG</div>
            <div class="header-cell">PTS</div>
          </div>

          ${this.table.map((team, index) => {
            const statusClass = this.getClass(index);
            const hasLiveMatch = this.teamHasLiveMatch(team.equipo);
            return html`
              <div
                class="table-row ${statusClass}"
                @click=${() => this.selectTeam(team.equipo)}
              >
                <div class="indicator-bar"></div>
                <div class="cell cell-pos">
                  ${index + 1}
                  ${hasLiveMatch
                    ? html`<span class="live-dot" title="Partido en curso"></span>`
                    : ''}
                </div>
                <div class="cell cell-logo">${getTeamImage(team.equipo)}</div>
                <div class="cell cell-team">${team.equipo}</div>

                <div class="mobile-stats">
                  <div class="stat-pill">
                    <span class="stat-label">JJ:</span>
                    <span>${team.jj}</span>
                  </div>
                  <div class="stat-pill">
                    <span class="stat-label">DG:</span>
                    <span>${team.dg}</span>
                  </div>
                  <div class="stat-pill">
                    ${team.jg} - ${team.je} - ${team.jp}
                  </div>
                </div>

                <div class="cell desktop-stat stat-jj">${team.jj}</div>
                <div class="cell desktop-stat stat-jg">${team.jg}</div>
                <div class="cell desktop-stat stat-je">${team.je}</div>
                <div class="cell desktop-stat stat-jp">${team.jp}</div>
                <div class="cell desktop-stat stat-gf">${team.gf}</div>
                <div class="cell desktop-stat stat-gc">${team.gc}</div>
                <div class="cell desktop-stat stat-dg">${team.dg}</div>
                <div class="cell cell-pts">${team.pts}</div>
              </div>
            `;
          })}
        </div>
      </main>
    `;
  }

  private getClass(i: number) {
    const team = this.table[i];
    const team7 = this.table[6];
    const team10 = this.table[9];
    const team11 = this.table[10];
    const TOTAL_MATCHES = 17;
    if (
      (team7.jj < TOTAL_MATCHES &&
        team7.pts + 3 * (TOTAL_MATCHES - team7.jj) < team.pts) ||
      (team.equipo != team7.equipo &&
        team7.jj === TOTAL_MATCHES &&
        i < 6 &&
        team7.pts <= team.pts)
    ) {
      return 'qualified';
    } else if (
      (team11.jj < TOTAL_MATCHES &&
        team11.pts + 3 * (TOTAL_MATCHES - team11.jj) < team.pts) ||
      (i < 10 && team11.jj === TOTAL_MATCHES && team11.pts <= team.pts)
    ) {
      return 'playin';
    } else if (
      (team.jj < TOTAL_MATCHES &&
        team.pts + 3 * (TOTAL_MATCHES - team.jj) < team10.pts) ||
      (team.equipo != team10.equipo &&
        team.jj === TOTAL_MATCHES &&
        team.pts <= team10.pts)
    ) {
      return 'eliminated';
    }
    return '';
  }

  private teamHasLiveMatch(teamName: string): boolean {
    return this.matchesList.some(
      match =>
        (match.local === teamName || match.visitante === teamName) &&
        isMatchLive(match.phaseEvents),
    );
  }

  private selectTeam(teamName: string) {
    console.log(`Selected team: ${teamName}`);
    this.selectedTeam = teamName;
  }
}
