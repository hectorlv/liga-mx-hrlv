import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Player } from '../types';

@customElement('player-info')
export class PlayerInfo extends LitElement {
  static override styles = [
    css`
    :host{
        display: flex;
        align-items: center;
        flex: 1 1 auto;
        min-width: 0;
        height: auto;
    }
      .player-card {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
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
      }

      .player-name {
        margin: 0;
        padding: 0;
        font-size: 1em;
        font-weight: 500;
        color: var(--md-sys-color-on-surface, #1a2b42);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.2;
      }

      .player-position,
      .player-number{
        margin: 0;
        padding: 0;
        font-size: 0.875em;
        line-height: 1.2;
        color: var(--md-sys-color-on-surface-variant, #666);
      }
    `,
  ];
  @property({ type: Object }) player!: Player;

  override render() {
    return html`
      <div class="player-card">
        <img
          class="player-photo"
          src="${this.player.imgSrc}"
          alt="Photo of ${this.player.name}"
        />
        <div class="player-details">
          <h3 class="player-name">${this.player.name}</h3>
          <p class="player-position">Posición: ${this.player.position}</p>
          <p class="player-number">
            Número de Jersey: ${this.player.number}
          </p>
        </div>
      </div>
    `;
  }
}
