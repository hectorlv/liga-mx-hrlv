import '@material/web/icon/icon.js';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { Match, Player, TeamSide, TimelineItem } from '../types';
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
        --card-bg: var(--md-sys-color-surface);
        --header-bg: var(--md-sys-color-surface-container);
        --line-color: var(--md-sys-color-outline-variant);
      }

      .card {
        background: var(--card-bg);
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        border: 1px solid var(--line-color);
        overflow: hidden;
      }

      .section-header {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        background: var(--header-bg);
        border-bottom: 1px solid var(--line-color);
      }

      .section-header h3 {
        margin: 0;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--md-sys-color-on-surface);
      }

      /* CONTENEDOR DE LA LÍNEA DE TIEMPO */
      .timeline-container {
        padding: 24px 16px;
        position: relative;
        overflow: hidden;
      }

      .no-events {
        text-align: center;
        color: var(--md-sys-color-on-surface-variant);
        font-style: italic;
        padding: 20px;
      }

      /* --- VISTA MÓVIL (Línea a la izquierda) --- */
      .timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 800px;
        margin: 0 auto;
      }

      /* La línea vertical principal */
      .timeline::before {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        left: 20px; /* Posición de la línea en móvil */
        width: 2px;
        background: var(--line-color);
        z-index: 0;
      }

      /* CADA EVENTO */
      .event-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 1;
      }

      /* LA BURBUJA DEL MINUTO */
      .minute-bubble {
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface);
        font-weight: bold;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 0.9rem;
        border: 2px solid var(--card-bg); /* Efecto de corte en la línea */
        z-index: 2;
      }

      /* CONTENIDO DEL EVENTO */
      .event-content {
        background: var(--md-sys-color-surface-container-lowest, #f8fafc);
        padding: 12px 16px;
        border-radius: 12px;
        flex: 1;
        border: 1px solid var(--line-color);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
      }

      /* --- BADGES (Etiquetas de color) --- */
      .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;
        align-items: center;
      }

      .badge {
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .badge md-icon {
        font-size: 14px;
      }

      .badge.goal {
        background: #d6f5d6;
        color: #005229;
      }
      .badge.goal-own {
        background: #ffebee;
        color: #b71c1c;
      }
      .badge.card-yellow {
        background: #fff8e1;
        color: #f57f17;
      }
      .badge.card-red {
        background: #ffebee;
        color: #b71c1c;
      }
      .badge.sub {
        background: var(--header-bg);
        color: var(--md-sys-color-on-surface-variant);
      }
      .badge.phase-badge {
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
      }

      /* TEXTOS DEL EVENTO */
      .event-text {
        font-size: 0.95rem;
        color: var(--md-sys-color-on-surface);
        font-weight: 500;
        line-height: 1.4;
      }

      .event-subtext {
        font-size: 0.8rem;
        color: var(--md-sys-color-on-surface-variant);
        margin-top: 4px;
      }

      /* EVENTO DE FASE (Medio tiempo, Fin, etc.) */
      .event-item.phase-item {
        justify-content: flex-start;
      }
      .event-item.phase-item .event-content {
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        text-align: center;
        font-weight: bold;
        flex: 0 1 auto;
      }

      /* --- VISTA ESCRITORIO (> 700px) --- */
      @media (min-width: 700px) {
        .timeline::before {
          left: 50%;
          transform: translateX(-50%); /* Línea al centro exacto */
        }

        .event-item {
          width: 100%; /* La fila ocupa todo el ancho */
          position: relative;
          display: flex;
        }

        .minute-bubble {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          margin: 0;
        }

        /* Eventos Locales (Tarjeta a la izquierda) */
        .event-item.team-local {
          justify-content: flex-start; /* Empuja el contenido a la izquierda */
        }
        .event-item.team-local .event-content {
          width: calc(
            50% - 40px
          ); /* La mitad exacta menos un respiro para la burbuja */
          flex: none;
          text-align: right;
          box-sizing: border-box;
        }
        .event-item.team-local .badge-row {
          justify-content: flex-end;
        }

        /* Eventos Visitantes (Tarjeta a la derecha) */
        .event-item.team-visitor {
          justify-content: flex-end; /* Empuja el contenido a la derecha */
        }
        .event-item.team-visitor .event-content {
          width: calc(50% - 40px);
          flex: none;
          text-align: left;
          box-sizing: border-box;
        }

        /* Eventos de Fase (Centro) */
        .event-item.phase-item {
          justify-content: center;
        }
        .event-item.phase-item .event-content {
          width: auto;
        }
        .event-item.phase-item .minute-bubble {
          display: none; /* En PC las fases no ocupan burbuja extra */
        }
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
      <div class="card">
        <div class="section-header">
          <h3><md-icon>history</md-icon> Cronología del Partido</h3>
        </div>

        <div class="timeline-container">
          ${items.length === 0
            ? html`<div class="no-events">
                El partido no ha comenzado o no hay eventos registrados.
              </div>`
            : html`
                <div class="timeline">
                  ${items.map(item => this._renderItem(item))}
                </div>
              `}
        </div>
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
    const isLocal = item.team === 'local';
    const ownGoalTeam = isLocal ? 'visitor' : 'local';
    const playerTeam = item.goal.ownGoal ? ownGoalTeam : item.team;
    const alignClass = isLocal ? 'team-local' : 'team-visitor';

    return html`
      <div class="event-item ${alignClass}">
        <div class="minute-bubble">${item.minute}'</div>
        <div class="event-content">
          <div class="badge-row">
            <span class="badge ${item.goal.ownGoal ? 'goal-own' : 'goal'}">
              <md-icon>sports_soccer</md-icon>
              ${item.goal.ownGoal ? 'Autogol' : 'Gol'}
            </span>
            ${item.goal.goalType
              ? html`<span
                  class="badge"
                  style="background:var(--md-sys-color-surface-variant); color:var(--md-sys-color-on-surface)"
                  >${GOAL_TYPE_LABELS[item.goal.goalType]}</span
                >`
              : ''}
          </div>
          <div class="event-text">
            ${this._playerName(playerTeam, item.goal.player)}
          </div>
          ${item.goal.assist
            ? html`<div class="event-subtext">
                A: ${this._playerName(item.team, item.goal.assist)}
              </div>`
            : ''}
        </div>
      </div>
    `;
  }

  private _renderCardItem(item: TimelineItem) {
    if (item.kind !== 'card') return null;
    const isLocal = item.team === 'local';
    const alignClass = isLocal ? 'team-local' : 'team-visitor';
    const isYellow = item.card.cardType === 'yellow';

    return html`
      <div class="event-item ${alignClass}">
        <div class="minute-bubble">${item.minute}'</div>
        <div class="event-content">
          <div class="badge-row">
            <span class="badge ${isYellow ? 'card-yellow' : 'card-red'}">
              <md-icon style="font-size:16px;"
                >${isYellow ? 'style' : 'crop_portrait'}</md-icon
              >
              ${isYellow ? 'Amarilla' : 'Roja'}
            </span>
            ${item.card.foulType
              ? html`<span
                  class="badge"
                  style="background:var(--md-sys-color-surface-variant); color:var(--md-sys-color-on-surface)"
                  >${FOUL_TYPE_LABELS[item.card.foulType] ||
                  item.card.foulType}</span
                >`
              : ''}
          </div>
          <div class="event-text">
            ${this._playerName(item.team, item.card.player)}
          </div>
        </div>
      </div>
    `;
  }

  private _renderSubItem(item: TimelineItem) {
    if (item.kind !== 'sub') return null;
    const isLocal = item.team === 'local';
    const alignClass = isLocal ? 'team-local' : 'team-visitor';

    return html`
      <div class="event-item ${alignClass}">
        <div class="minute-bubble">${item.minute}'</div>
        <div class="event-content">
          <div class="badge-row">
            <span class="badge sub">
              <md-icon>swap_horiz</md-icon> Cambio
            </span>
          </div>
          <div class="event-text" style="color: var(--md-sys-color-primary)">
            + ${this._playerName(item.team, item.sub.playerIn)}
          </div>
          <div
            class="event-text"
            style="color: var(--app-color-danger, #D32F2F); opacity: 0.8;"
          >
            - ${this._playerName(item.team, item.sub.playerOut)}
          </div>
        </div>
      </div>
    `;
  }

  private _renderPhaseItem(item: TimelineItem) {
    if (item.kind !== 'phase') return null;
    return html`
      <div class="event-item phase-item">
        <div class="minute-bubble mobile-only">${item.minute}'</div>
        <div class="event-content">
          <md-icon style="vertical-align: middle; margin-right: 4px;"
            >schedule</md-icon
          >
          ${item.minute}' - ${this._phaseLabel(item.phase)}
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
        return priority(a) - priority(b);
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

  private _playerName(team: TeamSide, number: number) {
    const list = team === 'local' ? this.localPlayers : this.visitorPlayers;
    return list.find(p => p.number === number)?.name || `#${number}`;
  }
}
