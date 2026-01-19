import '@material/web/icon/icon.js';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Match, Player, TimelineItem } from '../types';
import { FOUL_TYPE_LABELS, GOAL_TYPE_LABELS } from '../constants';
import '../components/player-info.js';

@customElement('events-timeline')
export class EventsTimeline extends LitElement {
  static override readonly styles = [
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
      .item.phase .badge {
        background: var(--md-sys-color-primary-container, #eaddff);
        color: var(--md-sys-color-on-primary-container, #21005d);
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
    switch (item.kind) {
      case 'goal':
        return this._renderGoalItem(item);
      case 'card':
        return this._renderCardItem(item);
      case 'sub':
        return this._renderSubItem(item);
      case 'phase':
        return this._renderPhaseItem(item);
      default:
        return null;
    }
  }

  private _renderGoalItem(item: TimelineItem) {
    if (item.kind !== 'goal') return null;
    const goalTeamLabel = item.team === 'local' ? 'Local' : 'Visitante';
    return html`
      <div class="item">
        <span class="time">${item.minute}'</span>
        <div class="details">
          <div class="title-line">
            <span class="badge goal">
              <md-icon>sports_soccer</md-icon>
              Gol ${goalTeamLabel}
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
  }

  private _renderCardItem(item: TimelineItem) {
    if (item.kind !== 'card') return null;
    const cardTeamLabel = item.team === 'local' ? 'Local' : 'Visitante';
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
              ${cardTeamLabel}
            </span>
            ${item.card.foulType
              ? html`<span class="badge"
                  >${FOUL_TYPE_LABELS[item.card.foulType] ||
                  item.card.foulType}</span
                >`
              : null}
          </div>
          <div class="details-text">
            ${this._playerName(item.team, item.card.player)}
          </div>
        </div>
      </div>
    `;
  }

  private _renderSubItem(item: TimelineItem) {
    if (item.kind !== 'sub') return null;
    const subTeamLabel = item.team === 'local' ? 'Local' : 'Visitante';
    return html`
      <div class="item">
        <span class="time">${item.minute}'</span>
        <div class="details">
          <div class="title-line">
            <span class="badge">
              <md-icon>swap_horiz</md-icon>
              Cambio ${subTeamLabel}
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
  }

  private _renderPhaseItem(item: TimelineItem) {
    if (item.kind !== 'phase') return null;
    return html`
      <div class="item phase">
        <span class="time">${item.minute}'</span>
        <div class="details">
          <span class="badge">
            <md-icon>schedule</md-icon>
            ${this._phaseLabel(item.phase)}
          </span>
        </div>
      </div>
    `;
  }

  private _buildTimelineItems(): TimelineItem[] {
    if (!this.match) return [];
    const {
      goals = [],
      cards = [],
      substitutions = [],
      phaseEvents = [],
    } = this.match;
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
    const phaseItems: TimelineItem[] = phaseEvents.map(phase => ({
      kind: 'phase',
      minute: phase.minute,
      phase: phase.phase,
    }));
    return [...phaseItems, ...goalItems, ...cardItems, ...subItems].sort(
      (a, b) => {
        if (a.minute !== b.minute) return a.minute - b.minute;
        const priority = (item: TimelineItem) => {
          if (item.kind == 'phase') {
            const p = item.phase;
            if (p === 'start' || p === 'secondHalf') return 0;
            if (p === 'halftime' || p === 'fulltime') return 2;
          }
          return 1;
        };
        const pa = priority(a);
        const pb = priority(b);
        return pa - pb;
      },
    );
  }

  private _phaseLabel(phase: 'start' | 'halftime' | 'secondHalf' | 'fulltime') {
    switch (phase) {
      case 'start':
        return 'Inicio del partido';
      case 'halftime':
        return 'Medio tiempo';
      case 'secondHalf':
        return 'Inicio del segundo tiempo';
      case 'fulltime':
        return 'Fin del partido';
      default:
        return '';
    }
  }

  private _playerName(team: 'local' | 'visitor', number: number) {
    const list = team === 'local' ? this.localPlayers : this.visitorPlayers;
    return list.find(p => p.number === number)?.name || `#${number}`;
  }
}
