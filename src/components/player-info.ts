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

    return html`
      <div class="player-card">
        ${imageSrc
          ? html`
              <img
                class="player-photo"
                src="${imageSrc}"
                alt="Photo of ${this.player.name}"
              />
            `
          : html` <md-icon>person</md-icon>`}
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
}
