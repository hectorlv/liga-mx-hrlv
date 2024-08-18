import { LitElement, css, html } from 'lit';
import {
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
} from 'firebase/auth';
import '@material/web/dialog/dialog.js';
import styles from './liga-mx-hrlv-styles.js';
class LoginPage extends LitElement {
  static properties = {
    auth: { type: Object },
    titleError: { type: String },
    contentError: { type: String },
  };

  constructor() {
    super();
    this.auth = null;
    this.tittleError = '';
    this.contentError = '';
  }

  static get styles() {
    return [styles];
  }

  render() {
    return html`
      <h1>Login</h1>
      <p>Por favor, inicia sesión para continuar</p>
      <input id="email" type="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button @click="${this.loginWithEmail}">Login with email</button>
      <button @click="${this.loginWithGoogle}">Login with google</button>
      <md-dialog id="dialogLogin" type="alert">
        <div slot="headline">${this.titleError}</div>
        <div slot="content">${this.contentError}</div>
      </md-dialog>
    `;
  }

  firstUpdated() {
    getRedirectResult(this.auth)
      .then(result => {
        if (result && result.user) {
          const user = result.user;
          this.dispatchEvent(
            new CustomEvent('login-success', {
              detail: { user },
              bubbles: true,
              composed: true,
            }),
          );
        }
      })
      .catch(error => {
        const errorCode = error.code;
        const errorMessage = error.message;
        const email = error.email;
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.error('Error al autenticar con google:', {
          errorCode,
          errorMessage,
          email,
          credential,
        });
        this.titleError = 'Error al autenticar con google';
        this.contentError = errorMessage;
        const dialog = this.shadowRoot.querySelector('#dialogLogin');
        dialog.open = true;
      });
  }

  loginWithEmail() {
    const email = this.shadowRoot.querySelector('#email').value;
    const password = this.shadowRoot.querySelector('#password').value;
    signInWithEmailAndPassword(this.auth, email, password)
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

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithRedirect(this.auth, provider);
  }
}

customElements.define('login-page', LoginPage);
