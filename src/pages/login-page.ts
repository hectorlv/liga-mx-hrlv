import { css, html, LitElement } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import {
  Auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from 'firebase/auth';

// Material Web imports
import '@material/web/button/filled-button.js';
import { MdFilledTextField } from '@material/web/textfield/filled-text-field.js';
import '@material/web/icon/icon.js';
import { MdDialog } from '@material/web/dialog/dialog.js';
import { FirebaseError } from 'firebase/app';

@customElement('login-page')
export class LoginPage extends LitElement {
  static override readonly styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh; /* Ocupa casi toda la altura visible */
        box-sizing: border-box;
        padding: 24px;
        --md-sys-color-surface: #ffffff;
        --md-sys-color-surface-container: #f8fafc;
      }

      /* LA TARJETA DEL LOGIN */
      .login-card {
        background: var(--md-sys-color-surface);
        border-radius: 24px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--md-sys-color-outline-variant, #e2e8f0);
        padding: 40px 32px;
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      /* EL LOGO / ÍCONO SUPERIOR */
      .logo-container {
        width: 64px;
        height: 64px;
        background: var(--md-sys-color-primary-container, #eaddff);
        color: var(--md-sys-color-on-primary-container, #21005d);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
      }
      .logo-container md-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      /* TEXTOS PRINCIPALES */
      h2 {
        margin: 0 0 8px;
        font-size: 1.8rem;
        font-weight: 700;
        color: var(--md-sys-color-on-surface);
        letter-spacing: -0.5px;
      }

      p.subtitle {
        margin: 0 0 32px;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.95rem;
      }

      /* EL FORMULARIO */
      form {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      md-filled-text-field {
        width: 100%;
        --md-filled-text-field-container-shape: 12px;
      }

      /* EL BOTÓN DE ENTRAR */
      md-filled-button {
        width: 100%;
        margin-top: 16px;
        --md-filled-button-container-height: 48px;
        font-size: 1.05rem;
      }

      /* ESTADOS DE CARGA */
      .loading-state {
        opacity: 0.7;
        pointer-events: none;
      }
    `,
  ];

  @property({ attribute: false }) auth!: Auth;

  @state() private titleError: string = '';
  @state() private contentError: string = '';
  @state() private isLoading: boolean = true; // Empieza en true mientras checamos la sesión

  @query('#emailInput') emailInput!: MdFilledTextField;
  @query('#passwordInput') passwordInput!: MdFilledTextField;
  @query('#dialogLogin') dialog!: MdDialog;

  override connectedCallback() {
    super.connectedCallback();
    if (this.auth) {
      // Escuchamos el estado de autenticación al cargar
      onAuthStateChanged(this.auth, (user: User | null) => {
        if (user) {
          this._dispatchLoginSuccess(user);
        } else {
          this.isLoading = false; // Mostramos el form si no hay sesión
        }
      });
    }
  }

  override render() {
    // Si Firebase está decidiendo si ya hay un usuario logueado, no mostramos el formulario de golpe
    if (this.isLoading) {
      return html`
        <div
          style="display:flex; flex-direction:column; align-items:center; gap: 16px; color: var(--md-sys-color-on-surface-variant);"
        >
          <md-icon
            style="font-size: 48px; width:48px; height:48px; animation: spin 2s linear infinite;"
            >sports_soccer</md-icon
          >
          <span>Cargando Liga MX...</span>
        </div>
      `;
    }

    return html`
      <div class="login-card">
        <div class="logo-container">
          <md-icon>admin_panel_settings</md-icon>
        </div>

        <h2>Bienvenido</h2>
        <p class="subtitle">Inicia sesión para gestionar el torneo.</p>

        <form @submit=${this._handleLogin} novalidate>
          <md-filled-text-field
            id="emailInput"
            label="Correo electrónico"
            type="email"
            required
            autocomplete="email"
          >
            <md-icon slot="leading-icon">email</md-icon>
          </md-filled-text-field>

          <md-filled-text-field
            id="passwordInput"
            label="Contraseña"
            type="password"
            required
            autocomplete="current-password"
          >
            <md-icon slot="leading-icon">lock</md-icon>
          </md-filled-text-field>

          <md-filled-button type="submit" ?disabled=${this.isLoading}>
            <md-icon slot="icon">login</md-icon>
            Ingresar
          </md-filled-button>
        </form>
      </div>

      <md-dialog id="dialogLogin" type="alert">
        <div
          slot="headline"
          style="color: var(--md-sys-color-error); display: flex; align-items: center; gap: 8px;"
        >
          <md-icon>error</md-icon> ${this.titleError}
        </div>
        <div slot="content">${this.contentError}</div>
        <div slot="actions">
          <md-filled-button @click=${() => this.dialog.close()}
            >Aceptar</md-filled-button
          >
        </div>
      </md-dialog>
    `;
  }

  private async _handleLogin(e: Event) {
    e.preventDefault();

    const email = this.emailInput.value.trim();
    const password = this.passwordInput.value;

    if (!email || !password) {
      this._showError(
        'Campos incompletos',
        'Por favor, ingresa tu correo y contraseña.',
      );
      return;
    }

    this.isLoading = true; // Desactivar botón temporalmente

    try {
      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password,
      );
      this._dispatchLoginSuccess(userCredential.user);
    } catch (error: unknown) {
      this.isLoading = false;
      let errorMsg = 'Ocurrió un error al iniciar sesión. Intenta nuevamente.';

      // Traducción amigable de errores comunes de Firebase
      if (error instanceof FirebaseError) {
        if (
          error.code === 'auth/user-not-found' ||
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-credential'
        ) {
          errorMsg = 'El correo o la contraseña son incorrectos.';
        } else if (error.code === 'auth/invalid-email') {
          errorMsg = 'El formato del correo electrónico no es válido.';
        } else if (error.code === 'auth/too-many-requests') {
          errorMsg = 'Demasiados intentos fallidos. Intenta más tarde.';
        }
      }

      this._showError('Error de Autenticación', errorMsg);
    }
  }

  private _showError(title: string, content: string) {
    this.titleError = title;
    this.contentError = content;
    this.dialog.show();
  }

  private _dispatchLoginSuccess(user: User) {
    this.dispatchEvent(
      new CustomEvent('login-success', {
        detail: { user },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
