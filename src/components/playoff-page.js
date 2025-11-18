/* eslint-disable class-methods-use-this */
/* eslint-disable no-console */
import { LitElement, html } from 'lit';
import styles from '../styles/liga-mx-hrlv-styles.js';

class PlayoffPage extends LitElement {
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
    return html` <main>${this.getPlayIn()}</main> `;
  }

  getPlayIn() {
    return html` <h2>Play in</h2>
      <table class="greyGridTable">
        <head>
            <tr>
              <th>Local</th>
              <th>Gol Local</th>
              <th>Visitante</th>
              <th>Gol Visitante</th>
              <th>Jornada</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Estadio</th>
              <th></th>
            </tr>
          </head>
          <body></body></table>
      </table>`;
  }
}

customElements.define('playoff-page', PlayoffPage);
