import { LitElement, html } from 'lit';
import styles from './liga-mx-hrlv-styles.js';
import * as images from './images/index.js';
import { LOGOS } from './constants.js';

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
        <section class="team">
          <img src="${images[LOGOS.find(t => t.equipo === this.team.equipo).img]}" />
          <div>
            <p><strong>Director Técnico:</strong> ${this.team.dt}</p>
            <p><strong>Estadio:</strong> ${this.team.estadio}</p>
            <p><strong>Capacidad:</strong> ${this.team.capacidad}</p>
            <p><strong>Ubicación:</strong> ${this.team.ubicacion}</p>
          </div>
        </section>
      </main>
    `;
  }
}