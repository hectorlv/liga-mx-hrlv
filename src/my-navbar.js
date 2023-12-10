/* eslint-disable lit-a11y/click-events-have-key-events */
import { LitElement, html, css } from 'lit';

class MyNavbar extends LitElement {
  static styles = css`
    :host {
      display: block;
      background-color: #333;
      color: white;
      padding: 10px 0;
    }
    nav {
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    label {
      color: white;
      text-decoration: none;
      margin: 0 15px;
      cursor: pointer;
    }
    a:hover {
      text-decoration: underline;
    }
  `;

  render() {
    return html`
      <nav>
        <label @click="${this.navClicked}">Calendario</label>
        <label @click="${this.navClicked}">Tabla General</label>
        <label @click="${this.navClicked}">Liguilla</label>
      </nav>
    `;
  }

  navClicked(e) {
    this.dispatchEvent(new CustomEvent("nav-clicked", {
      bubbles: true,
      composed: true,
      detail: e.target.innerHTML
    }))
  }
}

customElements.define('my-navbar', MyNavbar);
