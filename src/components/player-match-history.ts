import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import {
  appearanceDateLabel,
  appearancePhase,
  type PlayerAppearance,
} from '../utils/playerAppearances.js';

const HEADERS = [
  'FASE',
  'LOCAL',
  'GL',
  'GV',
  'VISITA',
  'JORNADA',
  'FECHA',
  'HORA',
  'SEDE',
  'ESTATUS',
  'MJ',
  'TITULAR',
];

@customElement('player-match-history')
export class PlayerMatchHistory extends LitElement {
  @property({ type: Array }) appearances: PlayerAppearance[] = [];
  @property() playerName = '';

  static override readonly styles = css`
    :host {
      display: block;
      min-width: 0;
      color: var(--md-sys-color-on-surface);
    }
    h2 {
      margin: 0 0 4px;
      font-size: 1rem;
    }
    .summary {
      margin: 0 0 16px;
      font-size: 0.85rem;
      color: var(--md-sys-color-on-surface-variant);
    }
    .table-scroll {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--md-sys-color-outline-variant);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    caption {
      text-align: left;
      padding: 12px;
    }
    th {
      background: var(
        --md-sys-color-surface-container-high,
        var(--md-sys-color-surface-container)
      );
      font-size: 0.7rem;
      letter-spacing: 0.04em;
    }
    th,
    td {
      padding: 12px 8px;
      text-align: center;
    }
    td {
      border-top: 1px solid var(--md-sys-color-outline-variant);
    }
    .score {
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    a {
      color: var(--md-sys-color-primary);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    a:hover {
      color: var(--md-sys-color-on-primary-container);
    }
    a:focus-visible {
      outline: 2px solid var(--md-sys-color-primary);
      outline-offset: 4px;
      border-radius: 3px;
    }
    .mobile-matches {
      display: none;
    }
    @media (max-width: 799px) {
      .table-scroll {
        display: none;
      }
      .mobile-matches {
        display: grid;
        gap: 12px;
      }
      article {
        padding: 16px;
        background: var(--md-sys-color-surface);
        border: 1px solid var(--md-sys-color-outline-variant);
        border-radius: 12px;
        min-width: 0;
      }
      h3 {
        margin: 0 0 14px;
        font-size: 1rem;
        line-height: 1.5;
        overflow-wrap: anywhere;
      }
      h3 .score {
        color: var(--md-sys-color-primary);
      }
      dl {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin: 0;
      }
      dt {
        color: var(--md-sys-color-on-surface-variant);
        font-size: 0.65rem;
        letter-spacing: 0.04em;
      }
      dd {
        margin: 3px 0 0;
        font-size: 0.85rem;
        overflow-wrap: anywhere;
      }
    }
  `;

  private values({ match, minutes, starter }: PlayerAppearance) {
    return [
      appearancePhase(match),
      match.local || '—',
      match.golLocal ?? '—',
      match.golVisitante ?? '—',
      match.visitante || '—',
      match.jornada || '—',
      appearanceDateLabel(match),
      match.hora || '—',
      match.estadio || '—',
      'Finalizado',
      minutes,
      starter === undefined ? '—' : starter ? 'Sí' : 'No',
    ];
  }

  private matchHref({ match }: PlayerAppearance): string {
    return `?tab=Calendario&match=${encodeURIComponent(match.idMatch)}`;
  }

  private matchLinkLabel({ match }: PlayerAppearance): string {
    return `Abrir detalle de ${match.local} contra ${match.visitante}, ${appearanceDateLabel(match)}`;
  }

  override render() {
    if (!this.appearances.length)
      return html`<p>Sin partidos jugados registrados</p>`;
    return html`
      <h2>Partidos de ${this.playerName}</h2>
      <p class="summary">
        ${this.appearances.length} PJ ·
        ${this.appearances.reduce((sum, row) => sum + row.minutes, 0)} minutos ·
        Hora CDMX
      </p>
      <div
        class="table-scroll"
        tabindex="0"
        role="region"
        aria-label="Tabla de partidos de ${this.playerName}"
      >
        <table>
          <caption>
            Participaciones en partidos finalizados
          </caption>
          <thead>
            <tr>
              ${HEADERS.map(label => html`<th scope="col">${label}</th>`)}
            </tr>
          </thead>
          <tbody>
            ${this.appearances.map(
              row =>
                html`<tr>
                  ${this.values(row).map(
                    (value, i) =>
                      html`<td class=${i === 2 || i === 3 ? 'score' : ''}>
                        ${
                          i === 6
                            ? html`<a
                                href=${this.matchHref(row)}
                                aria-label=${this.matchLinkLabel(row)}
                                >${value}</a
                              >`
                            : value
                        }
                      </td>`,
                  )}
                </tr>`,
            )}
          </tbody>
        </table>
      </div>
      <div class="mobile-matches">
        ${this.appearances.map(row => {
          const values = this.values(row);
          return html`<article
            aria-label="${row.match.local} contra ${row.match.visitante}"
          >
            <h3>
              <a
                href=${this.matchHref(row)}
                aria-label=${this.matchLinkLabel(row)}
              >
                ${values[1]}
                <span class="score">${values[2]} – ${values[3]}</span>
                ${values[4]}
              </a>
            </h3>
            <dl>
              ${HEADERS.map(
                (label, i) =>
                  html`<div>
                    <dt>${label}</dt>
                    <dd>${values[i]}</dd>
                  </div>`,
              )}
            </dl>
          </article>`;
        })}
      </div>
    `;
  }
}
