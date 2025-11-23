import { LitElement, html } from 'lit';
import styles from '../styles/liga-mx-hrlv-styles.js';
import * as images from '../images/index.js';
import { LOGOS } from '../utils/constants.js';
import { customElement, property } from 'lit/decorators.js';
import { Team } from '../app/types/index.js';

@customElement('team-page')
export class TeamPage extends LitElement {
  static styles = [styles];

  @property({ type: Object }) team: any = {};

  render() {
    return html`
      <main>
        <h1>${this.team.equipo}</h1>
      </main>
    `;
  }
}
