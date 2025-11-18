import { LitElement, html } from 'lit';
import styles from '../styles/liga-mx-hrlv-styles.js';
import * as images from '../images/index.js';
import { LOGOS } from '../utils/constants.js';

class TeamPage extends LitElement {
  static properties = {
    team: { type: Object },
  };

  static get styles() {
    return [styles];
  }

  constructor() {
    super();
    this.team = {};
  }

  render() {
    return html`
      <main>
        <h1>${this.team.equipo}</h1>
      </main>
    `;
  }
}
