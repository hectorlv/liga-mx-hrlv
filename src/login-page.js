import { LitElement, html } from 'lit';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import '@material/web/dialog/dialog.js';
import styles from './liga-mx-hrlv-styles.js';
class LoginPage extends LitElement {
  static properties = {
    auth: { type: Object },
    titleError: { type: String },
    contentError: { type: String },
    email: { type: String },
    password: { type: String },
  };

  constructor() {
    super();
    this.auth = null;
    this.tittleError = '';
    this.contentError = '';
    this.email = '';
    this.password = '';
  }

  static get styles() {
    return [styles];
  }

  render() {
    return html`
      <h1>Login</h1>
      <p>Por favor, inicia sesión para continuar</p>
      <form id="loginForm" @submit="${this.loginWithEmail}">
        <input
          id="email"
          type="email"
          .value=${this.email}
          placeholder="Email"
          required
          @input="${e => (this.email = e.target.value)}"
        />
        <input
          id="password"
          type="password"
          placeholder="Password"
          .value=${this.password}
          required
          @input="${e => (this.password = e.target.value)}"
        />
        <button type="submit">Login</button>
      </form>
        <md-dialog id="dialogLogin" type="alert">
          <div slot="headline">${this.titleError}</div>
          <div slot="content">${this.contentError}</div>
        </md-dialog>
      </form>
    `;
  }

  firstUpdated() {
    onAuthStateChanged(this.auth, user => {
      if (user) {
        this.dispatchEvent(
          new CustomEvent('login-success', {
            detail: { user },
            bubbles: true,
            composed: true,
          }),
        );
      }
    });
  }

  loginWithEmail(e) {
    e.preventDefault();
    signInWithEmailAndPassword(this.auth, this.email, this.password)
      .then(result => {
        const user = result.user;
        this.dispatchEvent(
          new CustomEvent('login-success', {
            detail: { user },
            bubbles: true,
            composed: true,
          }),
        );
      })
      .catch(error => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.error('Error al autenticar con email:', {
          errorCode,
          errorMessage,
        });
        this.titleError = 'Error al autenticar con email';
        this.contentError = errorMessage;
        const dialog = this.shadowRoot.querySelector('#dialogLogin');
        dialog.open = true;
      });
  }
}

customElements.define('login-page', LoginPage);
