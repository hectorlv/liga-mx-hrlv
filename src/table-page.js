/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import styles from './liga-mx-hrlv-styles.js';
import * as images from './images/index.js';
import { LOGOS } from './constants.js';

/**
 * Page for the table of positions
 */
class TablePage extends LitElement {
  static properties = {
    table: { type: Array },
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.table = [];
  }

  render() {
    return html`
      <main>
        <table class="greyGridTable">
          <head>
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
          </head>
          <body>
            ${this.table.map(
              (team, i) => html`
                <tr class="${this.getClass(i)}">
                  <td>${i + 1}</td>
                  <td>
                    ${images[LOGOS.find(t => t.equipo === team.equipo).img]}
                  </td>
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
              `,
            )}
          </body>
        </table>
      </main>
    `;
  }

  getClass(i) {
    const team = this.table[i];
    const team7 = this.table[6];
    const team10 = this.table[9];
    const team11 = this.table[10];
    const TOTAL_MATCHES = 17;
    if (
      (team7.jj < TOTAL_MATCHES &&
        team7.pts + 3 * (TOTAL_MATCHES - team7.jj) < team.pts) ||
      (team7.jj === TOTAL_MATCHES && team7.pts <= team.pts)
    ) {
      return 'calified';
    } else if (
      (team11.jj < TOTAL_MATCHES &&
        team11.pts + 3 * (TOTAL_MATCHES - team11.jj) < team.pts) ||
      (team11.jj === TOTAL_MATCHES && team11.pts <= team.pts)
    ) {
      return 'playin';
    } else if (
      (team.jj < TOTAL_MATCHES &&
        team.pts + 3 * (TOTAL_MATCHES - team.jj) < team10.pts) ||
      (team.jj === TOTAL_MATCHES && team.pts <= team10.pts)
    ) {
      return 'eliminated';
    }
    return '';
  }
}

customElements.define('table-page', TablePage);
