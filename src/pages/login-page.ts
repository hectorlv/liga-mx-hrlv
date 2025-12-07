import '@material/web/dialog/dialog.js';
import type { MdDialog } from '@material/web/dialog/dialog.js';
import '@material/web/textfield/filled-text-field.js';
import type { Auth, User, UserCredential } from 'firebase/auth';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { LitElement, html } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import type { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';

@customElement('login-page')
export class LoginPage extends LitElement {
  @property({ type: Object })
  auth: Auth | null = null;
  @state()
  private titleError: string = '';
  @state()
  private contentError: string = '';
  @state()
  private email: string = '';
  @state()
  private password: string = '';

  @query('#dialogLogin')
  private dialog!: MdDialog;

static override styles = [styles];

  override render() {
    return html`
      <h1>Login</h1>
      <p>Por favor, inicia sesión para continuar</p>
      <form id="loginForm" @submit="${this.loginWithEmail}">
        <md-filled-text-field
          id="email"
          label="Email"
          type="email"
          inputmode="email"
          .value=${this.email}
          aria-label="Email"
          required
          @input="${this.onEmailInput}"
        ></md-filled-text-field>
        <md-filled-text-field
          id="password"
          label="Password"
          type="password"
          inputmode="text"
          aria-label="Password"
          .value=${this.password}
          required
          @input="${this.onPasswordInput}"
        ></md-filled-text-field>
        <button type="submit" aria-label="Iniciar sesión">Login</button>
      </form>
        <md-dialog id="dialogLogin" type="alert">
          <div slot="headline">${this.titleError}</div>
          <div slot="content">${this.contentError}</div>
        </md-dialog>
    `;
  }

  private onEmailInput(e: InputEvent) {
    const target = e.target as MdFilledTextField;
    this.email = target.value;
  }

  private onPasswordInput(e: InputEvent) {
    const target = e.target as MdFilledTextField;
    this.password = target.value;
  }
  override firstUpdated() {
    if (!this.auth) return;

    onAuthStateChanged(this.auth, user => {
      if (user) {
        this.dispatchSucess(user);
      }
    });
  }

  private dispatchSucess(user: User) {
    this.dispatchEvent(
      new CustomEvent('login-success', {
        detail: { user },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private loginWithEmail(e: SubmitEvent) {
    e.preventDefault();
    if (!this.auth) {
      console.error('Auth no está inicializado');
      return;
    }
    signInWithEmailAndPassword(this.auth, this.email, this.password)
      .then((result : UserCredential) => {
        this.dispatchSucess(result.user);
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
        this.dialog.open = true;
      });
  }
}
