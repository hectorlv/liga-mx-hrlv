import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { Match, PlayerTeam, TableEntry } from '../types/index.js';
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
      .team-name-cell {
        cursor: pointer;
        text-decoration: underline;
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
        <table class="greyGridTable">
          <thead>
            <tr>
              <th>Pos</th>
              <th colspan="2">Equipo</th>
              <th>JJ</th>
              <th>JG</th>
              <th>JE</th>
              <th>JP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </thead>
          <tbody>
            ${this.table.map(
              (team, i) => html`
                <tr class="${this.getClass(i)}">
                  <td>${i + 1}</td>
                  <td>${getTeamImage(team.equipo)}</td>
                  <td
                    class="team-name-cell"
                    @click=${() => this.selectTeam(team.equipo)}
                  >
                    ${team.equipo}
                  </td>
                  <td>${team.jj}</td>
                  <td>${team.jg}</td>
                  <td>${team.je}</td>
                  <td>${team.jp}</td>
                  <td>${team.gf}</td>
                  <td>${team.gc}</td>
                  <td>${team.dg}</td>
                  <td>${team.pts}</td>
                </tr>
              `,
            )}
          </tbody>
        </table>
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

  private selectTeam(teamName: string) {
    console.log(`Selected team: ${teamName}`);
    this.selectedTeam = teamName;
  }
}
