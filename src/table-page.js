/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import styles from './liga-mx-hrlv-styles.js';

class TablePage extends LitElement {
  static properties = {
    matches: { type: Array },
    teams: { type: Array },
    table: { type: Array },
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.matches = [];
    this.teams = [];
    this.table = [];
  }

  firstUpdated() {
    this.calculateTable();
  }

  updated(changed) {
    if (changed.has('matches')) {
      this.calculateTable();
    }
  }

  render() {
    return html`
      <main>
        <table class="greyGridTable">
          <head>
            <tr>
              <th>Pos</th>
              <th>Equipo</th>
              <th>JJ</th>
              <th>JG</th>
              <th>JE</th>
              <th>JP</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th>PTS</th>
            </tr>
          </head>
          <body>
            ${this.table.map(
              (team, i) => html`
                <tr>
                  <td>${i + 1}</td>
                  <td>${team.equipo}</td>
                  <td>${team.jj}</td>
                  <td>${team.jg}</td>
                  <td>${team.je}</td>
                  <td>${team.jp}</td>
                  <td>${team.gf}</td>
                  <td>${team.gc}</td>
                  <td>${team.dg}</td>
                  <td>${team.pts}</td>
                </tr>
              `
            )}
          </body>
        </table>
      </main>
    `;
  }

  calculateTable() {
    const table = this.teams.map(team => {
      let jg = 0;
      let je = 0;
      let jp = 0;
      let gf = 0;
      let gc = 0;
      const local = this.matches.filter(match => match.local === team);
      const visitante = this.matches.filter(match => match.visitante === team);
      local.forEach(match => {
        if (match.golLocal !== '' && match.golVisitante !== '') {
          if (match.golLocal > match.golVisitante) {
            jg += 1;
          } else if (match.golLocal < match.golVisitante) {
            jp += 1;
          } else {
            je += 1;
          }
          gf += Number(match.golLocal);
          gc += Number(match.golVisitante);
        }
      });
      visitante.forEach(match => {
        if (match.golLocal !== '' && match.golVisitante !== '') {
          if (match.golLocal < match.golVisitante) {
            jg += 1;
          } else if (match.golLocal > match.golVisitante) {
            jp += 1;
          } else {
            je += 1;
          }
          gf += Number(match.golVisitante);
          gc += Number(match.golLocal);
        }
      });
      return {
        equipo: team,
        jj: jg + je + jp,
        jg,
        je,
        jp,
        gf,
        gc,
        dg: gf - gc,
        pts: 3 * jg + je,
      };
    });
    table.sort((a, b) => {
      if (a.pts !== b.pts) {
        return b.pts - a.pts;
      }
      if (a.dg !== b.dg) {
        return b.dg - a.dg;
      }
      return b.gf - a.gf;
    });
    this.table = table;
  }
}

customElements.define('table-page', TablePage);
