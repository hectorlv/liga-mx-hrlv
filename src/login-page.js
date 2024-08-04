import { LitElement, css, html } from 'lit';
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
class LoginPage extends LitElement {
  static properties = {
    auth: { type: Object },
  };

  constructor() {
    super();
    this.auth = null;
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        font-family: Arial, sans-serif;
      }

      h1 {
        font-size: 2em;
        color: #333;
        margin-bottom: 20px;
      }

      p {
        font-size: 1.2em;
        color: #666;
        margin-bottom: 20px;
      }

      input {
        width: 80%;
        max-width: 300px;
        padding: 10px;
        margin-bottom: 15px;
        border: 1px solid #ccc;
        border-radius: 5px;
        font-size: 1em;
      }

      button {
        width: 80%;
        max-width: 300px;
        padding: 10px;
        margin-bottom: 10px;
        border: none;
        border-radius: 5px;
        background-color: #4caf50;
        color: white;
        font-size: 1em;
        cursor: pointer;
        transition: background-color 0.3s ease;
      }

      button:hover {
        background-color: #45a049;
      }
    `;
  }

  render() {
    return html`
      <h1>Login</h1>
      <p>Por favor, inicia sesión para continuar</p>
      <input id="email" type="email" placeholder="Email" />
      <input id="password" type="password" placeholder="Password" />
      <button @click="${this.loginWithEmail}">Login with email</button>
      <button @click="${this.loginWithGoogle}">Login with google</button>
    `;
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
      });
  }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(this.auth, provider)
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
        const email = error.email;
        const credential = GoogleAuthProvider.credentialFromError(error);
        console.error('Error al autenticar con google:', {
          errorCode,
          errorMessage,
          email,
          credential,
        });
      });
  }
}

customElements.define('login-page', LoginPage);
