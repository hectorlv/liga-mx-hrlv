import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '../components/social-post-generator.js';
import { Match, TableEntry } from '../types/index.js';

@customElement('social-page')
export class SocialPage extends LitElement {
  static override styles = css`
    :host {
      display: block;
      width: 100%;
      box-sizing: border-box;
    }

    main {
      width: min(1240px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 56px;
    }

    header {
      position: relative;
      overflow: hidden;
      margin-bottom: 24px;
      padding: clamp(26px, 5vw, 52px);
      border-radius: 24px;
      background:
        radial-gradient(circle at 85% 20%, rgba(45, 224, 166, 0.28), transparent 23%),
        linear-gradient(125deg, #05192d, #0a3550 58%, #062237);
      color: #fff;
    }

    header::after {
      position: absolute;
      right: -80px;
      bottom: -110px;
      width: 330px;
      height: 330px;
      border: 28px solid rgba(119, 245, 204, 0.13);
      border-radius: 50%;
      content: '';
    }

    .eyebrow,
    h1,
    .intro {
      position: relative;
      z-index: 1;
    }

    .eyebrow {
      margin: 0 0 10px;
      color: #76f4c8;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    h1 {
      max-width: 620px;
      margin: 0;
      font-size: clamp(2rem, 5vw, 4rem);
      letter-spacing: -0.055em;
      line-height: 0.94;
    }

    .intro {
      max-width: 620px;
      margin: 18px 0 0;
      color: #c7dce8;
      font-size: 1rem;
      line-height: 1.5;
    }

    .section-label {
      margin: 34px 0 14px;
      color: var(--md-sys-color-on-surface-variant, #425c6b);
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }
  `;

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];

  override render() {
    return html`
      <main>
        <header>
          <p class="eyebrow">Administración · Liga MX HRLV</p>
          <h1>Centro de publicaciones</h1>
          <p class="intro">
            Genera la imagen, copia el texto y publica. Cada enlace ya identifica la red, jornada y tipo de contenido en Analytics.
          </p>
        </header>

        <p class="section-label">Jornada</p>
        <social-post-generator
          .matchesList=${this.matchesList}
          .table=${this.table}
          context="matches"
          initialTemplate="results"
        ></social-post-generator>

        <p class="section-label">Clasificación</p>
        <social-post-generator
          .matchesList=${this.matchesList}
          .table=${this.table}
          context="table"
        ></social-post-generator>
      </main>
    `;
  }
}
