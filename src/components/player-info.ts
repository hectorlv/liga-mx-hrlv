import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Player } from '../types';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';

@customElement('player-info')
export class PlayerInfo extends LitElement {
  static override readonly styles = [
    css`
      :host {
        display: flex;
        align-items: center;
        flex: 1 1 auto;
        min-width: 0;
        max-width: 100%;
        height: auto;
        --md-icon-size: 60px;
      }
      .player-card {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-width: 0;
        max-width: 100%;
      }

      .player-photo {
        width: 60px;
        height: 60px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .player-photo-wrapper {
        position: relative;
        width: 60px;
        height: 60px;
        flex-shrink: 0;
      }

      .player-photo-wrapper md-icon {
        width: 60px;
        height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .u23-badge {
        position: absolute;
        right: -12px;
        top: -4px;
        border-radius: 999px;
        padding: 2px 6px;
        font-size: 0.65em;
        font-weight: 700;
        letter-spacing: 0.04em;
        background-color: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.28);
      }

      .player-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        overflow: hidden;
      }

      .player-name {
        margin: 0;
        padding: 0;
        font-size: 1em;
        font-weight: 500;
        color: var(--md-sys-color-on-surface);
        white-space: normal;
        line-height: 1.2;
      }

      .player-position,
      .player-number {
        margin: 0;
        padding: 0;
        font-size: 0.875em;
        line-height: 1.2;
        color: var(--md-sys-color-on-surface);
        white-space: normal;
      }
    `,
  ];
  @property({ type: Object }) player!: Player;
  @state() private resolvedImageSrc = '';

  private readonly storage = getStorage();

  override render() {
    const imageSrc = this.resolvedImageSrc;
    const isU23 = this.isU23Player();

    return html`
      <div class="player-card">
        <div class="player-photo-wrapper">
          ${imageSrc
            ? html`
                <img
                  class="player-photo"
                  src="${imageSrc}"
                  alt="Photo of ${this.player.name}"
                  title="${this.player.fullName}"
                />
              `
            : html` <md-icon title="${this.player.fullName}">person</md-icon>`}
          ${isU23 ? html`<span class="u23-badge">U23</span>` : null}
        </div>
        <div class="player-details">
          <h3 class="player-name">${this.player.name}</h3>
          <p class="player-position">Posición: ${this.player.position}</p>
          <p class="player-number">Número: ${this.player.number}</p>
        </div>
      </div>
    `;
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('player')) {
      void this.resolveImageSrc();
    }
  }

  private async resolveImageSrc(): Promise<void> {
    const originalSrc = this.player?.imgSrc ?? '';

    if (!originalSrc) {
      this.resolvedImageSrc = '';
      return;
    }

    if (!originalSrc.includes('cldrsrcs.apilmx')) {
      this.resolvedImageSrc = originalSrc;
      return;
    }

    const sanitizedSrc = originalSrc.split('?rnd=')[0];
    const fileName = sanitizedSrc.split('/').pop();

    if (!fileName) {
      this.resolvedImageSrc = originalSrc;
      return;
    }

    // Clear the previous resolved image before fetching the new one to avoid stale-image bleed-through
    this.resolvedImageSrc = '';

    try {
      const downloadUrl = await getDownloadURL(ref(this.storage, fileName));

      if (this.player?.imgSrc === originalSrc) {
        this.resolvedImageSrc = downloadUrl;
      }
    } catch (error) {
      console.error(
        `Error fetching download URL for ${this.player.name}:`,
        error,
      );
      if (this.player?.imgSrc === originalSrc) {
        this.resolvedImageSrc = originalSrc;
      }
    }
  }

  private isU23Player(): boolean {
    const birthYear = this.getBirthYear(this.player?.birthDate);
    if (!birthYear) {
      return false;
    }

    // Regla U23 para 2026: nacidos en 2003 o después y nacionalidad mexicano
    const currentYear = new Date().getFullYear();
    const minBirthYear = currentYear - 23;
    const isMexican = this.player?.nationality?.toLowerCase() === 'mexicano';

    return birthYear >= minBirthYear && isMexican;
  }

  private getBirthYear(birthDate?: string | Date): number | null {
    if (!birthDate) {
      return null;
    }

    if (birthDate instanceof Date) {
      return birthDate.getFullYear();
    }

    const [day, month, year] = birthDate.split('/');
    if (day && month && year) {
      const parsedYear = Number.parseInt(year, 10);
      return Number.isNaN(parsedYear) ? null : parsedYear;
    }

    const parsedDate = new Date(birthDate);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    return parsedDate.getFullYear();
  }
}
