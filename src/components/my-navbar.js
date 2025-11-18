/* eslint-disable lit-a11y/click-events-have-key-events */
import { LitElement, html, css } from 'lit';

class MyNavbar extends LitElement {
  static properties = {
    user: { type: Object },
    menuVisible: { type: Boolean },
  };

  constructor() {
    super();
    this.user = null;
    this.menuVisible = false;
  }

  static styles = css`
    :host {
      display: block;
      background-color: #333;
      color: white;
      padding: 10px 0;
      position: fixed;
      z-index: 100;
      width: 100%;
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
    .menu-button {
      display: none;
    }
    @media (max-width: 37.5em) {
      nav {
        flex-direction: column;
        display: none;
      }
      nav[visible] {
        display: flex;
      }
      label {
        margin: 10px 0;
      }
      .menu-button {
        display: block;
        background-color: #444;
        color: white;
        border: none;
        padding: 10px;
        cursor: pointer;
        width: 100%;
        text-align: left;
        font-size: 24px;
      }
    }
  `;

  render() {
    return html`
      <button class="menu-button" @click="${this.toggleMenu}" aria-label="Abrir menú" aria-expanded="${this.menuVisible}">&#9776;</button>
      <nav ?visible="${this.menuVisible}" role="navigation" aria-label="Menú principal">
        <button class="nav-link" @click="${this.navClicked}" aria-label="Ir a Calendario">Calendario</button>
        <button class="nav-link" @click="${this.navClicked}" aria-label="Ir a Tabla General">Tabla General</button>
        <button class="nav-link" @click="${this.navClicked}" aria-label="Ir a Liguilla">Liguilla</button>
        <div class="nav-user" aria-label="Usuario">Usuario: ${this.user?.email || ''}</div>
      </nav>
    `;
  }

  toggleMenu() {
    this.menuVisible = !this.menuVisible;
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
