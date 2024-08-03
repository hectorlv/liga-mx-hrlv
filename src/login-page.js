import { LitElement, html } from 'lit';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
class LoginPage extends LitElement {
  static properties = {
    auth: { type: Object },
  };

  constructor() {
    super();
    this.auth = null;
  }

  render() {
    return html`
      <h1>Login</h1>
      <button @click="${this.loginWithGoogle}">Login with google</button>
    `;
  }

  loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(this.auth, provider)
      .then(() => {
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
