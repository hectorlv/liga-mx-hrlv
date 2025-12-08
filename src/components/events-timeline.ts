import '@material/web/icon/icon.js';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Match, Player, TimelineItem } from '../types';
import { FOUL_TYPE_LABELS, GOAL_TYPE_LABELS } from '../constants';
import '../components/player-info.js';

@customElement('events-timeline')
export class EventsTimeline extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 4px 0;
        flex-wrap: wrap;
      }
      .time {
        font-weight: 600;
        min-width: 60px;
      }
      .badge {
        background: var(--md-sys-color-secondary-container, #e8def8);
        color: var(--md-sys-color-on-secondary-container, #1d192b);
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.85em;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge.goal {
        background: var(--md-sys-color-tertiary-container, #d0bcff);
      }
      .badge.card-yellow {
        background: #fff3cd;
        color: #665500;
      }
      .badge.card-red {
        background: #ffdad6;
        color: #5c1a12;
      }
      .details {
        display: flex;
        flex-direction: column;
        gap: 4px;
        align-items: flex-start;
      }
      .title-line {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        width: fit-content;
      }
      .assist {
        font-size: 0.9em;
      }
      .details-text {
        font-size: 1em;
        white-space: normal;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        width: fit-content;
      }
      .section-card {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
    `,
  ];

  @property({ type: Object }) match: Match | null = null;
  @property({ type: Array }) localPlayers: Player[] = [];
  @property({ type: Array }) visitorPlayers: Player[] = [];

  override render() {
    if (!this.match) return html``;
    const items = this._buildTimelineItems();
    return html`
      <div class="section-card">
        <h3>Cronología</h3>
        ${items.length === 0
          ? html`<p>No hay eventos registrados.</p>`
          : html`
              <div class="timeline">
                ${items.map(item => this._renderItem(item))}
              </div>
            `}
      </div>
    `;
  }

  private _renderItem(item: TimelineItem) {
    const teamLabel = item.team === 'local' ? 'Local' : 'Visitante';
    switch (item.kind) {
      case 'goal':
        return html`
          <div class="item">
            <span class="time">${item.minute}'</span>
            <div class="details">
              <div class="title-line">
                <span class="badge goal">
                  <md-icon>sports_soccer</md-icon>
                  Gol ${teamLabel}
                </span>
                ${item.goal.goalType
                  ? html`<span class="badge"
                      >${GOAL_TYPE_LABELS[item.goal.goalType]}</span
                    >`
                  : null}
                ${item.goal.ownGoal
                  ? html`<span class="badge">Autogol</span>`
                  : null}
              </div>
              <div class="details-text">
                ${this._playerName(item.team, item.goal.player)}
              </div>
              ${item.goal.assist
                ? html`<div class="assist">
                    Asistencia: ${this._playerName(item.team, item.goal.assist)}
                  </div>`
                : null}
            </div>
          </div>
        `;
      case 'card':
        return html`
          <div class="item">
            <span class="time">${item.minute}'</span>
            <div class="details">
              <div class="title-line">
                <span
                  class="badge ${item.card.cardType === 'yellow'
                    ? 'card-yellow'
                    : 'card-red'}"
                >
                  <md-icon>crop_portrait</md-icon>
                  ${item.card.cardType === 'yellow' ? 'Amarilla' : 'Roja'}
                  ${teamLabel}
                </span>
                ${item.card.foulType
                  ? html`<span class="badge"
                      >${FOUL_TYPE_LABELS[item.card.foulType]}</span
                    >`
                  : null}
              </div>
              <div class="details-text">
                ${this._playerName(item.team, item.card.player)}
              </div>
            </div>
          </div>
        `;
      case 'sub':
        return html`
          <div class="item">
            <span class="time">${item.minute}'</span>
            <div class="details">
              <div class="title-line">
                <span class="badge">
                  <md-icon>swap_horiz</md-icon>
                  Cambio ${teamLabel}
                </span>
              </div>
              <div class="details-text">
                <strong>Sale:</strong> ${this._playerName(
                  item.team,
                  item.sub.playerOut,
                )}
                &nbsp; | &nbsp; <strong>Entra:</strong> ${this._playerName(
                  item.team,
                  item.sub.playerIn,
                )}
              </div>
            </div>
          </div>
        `;
      default:
        return null;
    }
  }

  private _buildTimelineItems(): TimelineItem[] {
    if (!this.match) return [];
    const { goals = [], cards = [], substitutions = [] } = this.match;
    const goalItems: TimelineItem[] = goals.map(goal => ({
      kind: 'goal',
      minute: goal.minute,
      team: goal.team,
      goal,
    }));
    const cardItems: TimelineItem[] = cards.map(card => ({
      kind: 'card',
      minute: card.minute,
      team: card.team,
      card,
    }));
    const subItems: TimelineItem[] = substitutions.map(sub => ({
      kind: 'sub',
      minute: sub.minute,
      team: sub.team,
      sub,
    }));
    return [...goalItems, ...cardItems, ...subItems].sort(
      (a, b) => a.minute - b.minute,
    );
  }

  private _playerName(team: 'local' | 'visitor', number: number) {
    const list = team === 'local' ? this.localPlayers : this.visitorPlayers;
    return list.find(p => p.number === number)?.name || `#${number}`;
  }
}
