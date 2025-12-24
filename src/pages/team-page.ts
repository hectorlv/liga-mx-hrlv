import { LitElement, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';

@customElement('team-page')
export class TeamPage extends LitElement {
  static override readonly styles = [styles];

  @property({ type: Object }) team: any = {};

  override render() {
    return html`
      <main>
        <h1>${this.team.equipo}</h1>
      </main>
    `;
  }
}
