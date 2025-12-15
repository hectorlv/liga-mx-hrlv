import '@material/web/button/filled-button.js';
import '@material/web/icon/icon.js';
import '@material/web/iconbutton/icon-button.js';
import '@material/web/select/filled-select.js';
import '@material/web/select/select-option.js';
import '@material/web/switch/switch.js';
import '@material/web/textfield/filled-text-field.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import {
  customElement,
  property,
  query,
  queryAll,
  state,
} from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import './match-detail-page.js';

import { MdFilledButton } from '@material/web/button/filled-button.js';
import { MdIconButton } from '@material/web/iconbutton/icon-button.js';
import { MdFilledSelect } from '@material/web/select/filled-select.js';
import { MdSwitch } from '@material/web/switch/switch.js';
import {
  Match,
  PlayerTeam,
  Stadium,
  Team
} from '../types/index.js';
import { JORNADA_LIGUILLA, LIGUILLA } from '../utils/constants.js';
import {
  formatDateDDMMYYYY,
  getMatchRowClass
} from '../utils/dateUtils.js';
import { getTeamImage } from '../utils/imageUtils.js';
/**
 * Page for show the fixture
 */
@customElement('matches-page')
export class MatchesPage extends LitElement {
  static override styles = [
    styles,
    css`
      .filters-card {
        width: 100%;
        max-width: 1100px;
        margin: var(--space-8) auto var(--space-16);
        padding: var(--space-12) var(--space-16);
        background: var(--md-sys-color-surface-container-highest);
        border-radius: var(--radius-m);
        display: flex;
        gap: var(--space-12);
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;
      }

      .filters-card md-filled-select {
        min-width: 220px;
      }

      .today-row {
        display: inline-flex;
        align-items: center;
        gap: var(--space-8);
      }

      @media (max-width: 600px) {
        .filters-card {
          flex-direction: column;
          align-items: stretch;
        }
        .greyGridTable {
          display: none;
        }
        .match-cards {
          display: block;
          padding: 0 var(--space-8);
        }
        .match-card {
          background: var(--md-sys-color-surface-container-highest);
          border-radius: var(--radius-s);
          padding: var(--space-8);
          margin-bottom: var(--space-8);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
        }
        .match-card .teams {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          justify-content: space-between;
        }
        .match-card .meta {
          margin-top: var(--space-6);
          font-size: 13px;
          color: var(--md-sys-color-on-surface);
        }
        .matches-filter {
          display: flex;
          flex-direction: column;
        }
        .matches-filter md-filled-select {
          width: 100%;
          margin-bottom: 10px;
        }
      }

      .champion-legend {
        max-width: 1100px;
        margin: var(--space-8) auto var(--space-16);
        padding: var(--space-12) var(--space-16);
        background: var(--md-sys-color-surface-container);
        border-radius: var(--radius-m);
        display: flex;
        align-items: center;
        gap: var(--space-8);
        font-weight: 600;
        justify-content: center;
      }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) teams: Team[] = [];
  @property({ type: Array }) stadiums: Stadium[] = [];
  @property({ type: Array }) players: PlayerTeam[] = [];

  @state() matchesRender: Match[] = [];
  @state() showDetails: boolean = false;
  @state() selectedMatch: Match | null = null;

  private todayDate: Date = new Date();
  private todayDateSelected: boolean = false;

  private savedFilters: {
    teamIndex: string;
    matchDayValue: string;
    todayDateSelected: boolean;
    onlyPlayOffSelected: boolean;
  } | null = null;
  private isMobile: boolean = window.innerWidth < 600;
  private openRowMenuId: number | null = null;

  private _boundOnResize: (() => void) | undefined;
  private _boundOnDocClick: (() => void) | undefined;
  private _boundOnGlobalKey: ((e: KeyboardEvent) => void) | undefined;

  private get championLegend(): string | null {
    const finalIda = this.matchesList.find(
      match => match.idMatch === LIGUILLA.final.ida.id,
    );
    const finalVuelta = this.matchesList.find(
      match => match.idMatch === LIGUILLA.final.vuelta.id,
    );

    if (!finalIda || !finalVuelta) return null;

    const hasTeams =
      finalIda.local.trim() !== '' &&
      finalIda.visitante.trim() !== '' &&
      finalVuelta.local.trim() !== '' &&
      finalVuelta.visitante.trim() !== '';
    const hasScores =
      finalIda.golLocal >= 0 &&
      finalIda.golVisitante >= 0 &&
      finalVuelta.golLocal >= 0 &&
      finalVuelta.golVisitante >= 0;

    if (!hasTeams || !hasScores) return null;

    const teamA = finalIda.local;
    const teamB = finalIda.visitante;
    const aggregate: Record<string, number> = {
      [teamA]: finalIda.golLocal,
      [teamB]: finalIda.golVisitante,
    };

    if (finalVuelta.local === teamA) aggregate[teamA] += finalVuelta.golLocal;
    else if (finalVuelta.visitante === teamA)
      aggregate[teamA] += finalVuelta.golVisitante;
    else return null;

    if (finalVuelta.local === teamB) aggregate[teamB] += finalVuelta.golLocal;
    else if (finalVuelta.visitante === teamB)
      aggregate[teamB] += finalVuelta.golVisitante;
    else return null;

    if (aggregate[teamA] === aggregate[teamB]) return null;

    const champion = aggregate[teamA] > aggregate[teamB] ? teamA : teamB;
    return `🏆 Campeón: ${champion} (${aggregate[teamA]}-${aggregate[teamB]} marcador global)`;
  }

  @query('.row-menu') rowMenu!: HTMLElement;
  @query('button, [role="menuitem"]') firstMenuItem!: HTMLElement;
  @query('#teamsSelect') teamsSelect!: MdFilledSelect;
  @query('#matchDaySelect') matchDaySelect!: MdFilledSelect;
  @query('#todayCheckbox') todayDateCheckbox!: MdSwitch;
  @queryAll('button, [role="menuitem"]')
  menuFocusableElements!: MdFilledButton[];
  @query('#onlyPlayOffSwitch') onlyPlayOffSwitch!: MdSwitch;

  override connectedCallback() {
    super.connectedCallback();
    this._boundOnResize = this._onResize.bind(this);
    window.addEventListener('resize', this._boundOnResize);
    this._boundOnDocClick = this._onDocumentClick.bind(this);
    window.addEventListener('click', this._boundOnDocClick);
    this._boundOnGlobalKey = this._onGlobalKeyDown.bind(this);
    window.addEventListener('keydown', this._boundOnGlobalKey);
  }

  override disconnectedCallback() {
    if (this._boundOnResize) {
      window.removeEventListener('resize', this._boundOnResize);
    }
    if (this._boundOnDocClick) {
      window.removeEventListener('click', this._boundOnDocClick);
    }
    if (this._boundOnGlobalKey) {
      window.removeEventListener('keydown', this._boundOnGlobalKey);
    }
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this._onResize();
  }

  /**
   *
   * @param changed
   */
  override updated(changed: PropertyValues) {
    if (changed.has('matchesList')) {
      if (!this.showDetails) {
        this._filtersChanged();
      } else {
        // in details view, just update the selected match reference
        if (this.selectedMatch) {
          const updatedMatch = this.matchesList.find(
            m => m.idMatch === this.selectedMatch?.idMatch,
          );
          if (updatedMatch) {
            this.selectedMatch = updatedMatch;
          }
        }
      }
    }
  }

  private _toggleRowMenu(e: CustomEvent) {
    e.stopPropagation();
    const id = Number(
      (e.currentTarget as MdIconButton).getAttribute('data-id'),
    );
    this.openRowMenuId = this.openRowMenuId === id ? null : id;
    this.requestUpdate();
    // After menu opens, focus first actionable item
    this.updateComplete.then(() => {
      if (this.openRowMenuId === id) {
        const menu = this.rowMenu;
        if (menu) {
          if (
            this.firstMenuItem &&
            typeof this.firstMenuItem.focus === 'function'
          )
            this.firstMenuItem.focus();
          // attach keydown handler to trap focus inside menu
          menu.addEventListener('keydown', this._onRowMenuKeydown.bind(this));
        }
      } else {
        // closed, restore focus to the trigger button
        const btn = this.shadowRoot?.querySelector(
          `md-icon-button[data-id="${id}"]`,
        ) as MdIconButton;
        if (btn && typeof btn.focus === 'function') btn.focus();
      }
    });
  }

  private _onDocumentClick() {
    if (this.openRowMenuId !== null) {
      this.openRowMenuId = null;
      this.requestUpdate();
    }
  }

  private _onDetailsFromMenu(e: Event) {
    e.stopPropagation();
    const id = Number(
      (e.currentTarget as MdFilledButton).getAttribute('data-id'),
    );
    this._showMatchDetails({
      target: { getAttribute: () => id },
    } as unknown as Event);
    this.openRowMenuId = null;
    this.updateComplete.then(() => {
      const btn = this.shadowRoot?.querySelector(
        `md-icon-button[data-id="${id}"]`,
      ) as MdIconButton;
      if (btn && typeof btn.focus === 'function') btn.focus();
    });
  }

  private _onGlobalKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (this.openRowMenuId !== null) {
        // close menu and restore focus to trigger
        const id = this.openRowMenuId;
        this.openRowMenuId = null;
        this.requestUpdate();
        this.updateComplete.then(() => {
          const btn = this.shadowRoot?.querySelector(
            `md-icon-button[data-id="${id}"]`,
          ) as MdIconButton;
          if (btn && typeof btn.focus === 'function') btn.focus();
        });
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  private _onRowMenuKeydown(e: KeyboardEvent) {
    // Trap Tab focus inside the menu and handle Escape
    const menu = e.currentTarget;
    const focusable = Array.from(this.menuFocusableElements).filter(
      n => !n.hasAttribute('disabled'),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    } else if (e.key === 'Escape' || e.key === 'Esc') {
      // close menu and restore focus
      const idAttr = (menu as HTMLElement).parentElement
        ?.querySelector('md-icon-button')
        ?.getAttribute('data-id');
      const id = idAttr ? Number(idAttr) : null;
      this.openRowMenuId = null;
      this.requestUpdate();
      this.updateComplete.then(() => {
        if (id !== null) {
          const btn = this.shadowRoot?.querySelector(
            `md-icon-button[data-id="${id}"]`,
          ) as MdIconButton;
          if (btn && typeof btn.focus === 'function') btn.focus();
        }
      });
      e.preventDefault();
      e.stopPropagation();
    }
  }

  override render() {
    if (this.showDetails && this.selectedMatch) {
      return html` <main>
        <match-detail-page
          .match="${this.selectedMatch}"
          .teams="${this.teams}"
          .players="${this.players}"
          .stadiums="${this.stadiums}"
          @back-to-calendar="${this._backToCalendar}"
        ></match-detail-page>
      </main>`;
    }
    return html`
      <main>
        <div class="filters-card">
          <md-filled-select
            id="teamsSelect"
            label="Equipos"
            aria-label="Seleccionar equipo"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${this.teams.map(
              (team, i) => html`
                <md-select-option value="${i}"
                  ><div slot="headline">${team}</div></md-select-option
                >
              `,
            )}
          </md-filled-select>
          <md-filled-select
            id="matchDaySelect"
            label="Jornada"
            aria-label="Seleccionar jornada"
            @change="${this._filtersChanged}"
          >
            <md-select-option selected></md-select-option>
            ${Array.from(
              { length: this.teams.length - 1 },
              (_, i) => i + 1,
            ).map(
              i => html`
                <md-select-option value="${i}"
                  ><div slot="headline">${i}</div></md-select-option
                >
              `,
            )}
            ${JORNADA_LIGUILLA.map(
              i => html`
                <md-select-option value="${i.id}"
                  ><div slot="headline">${i.descripcion}</div></md-select-option
                >
              `,
            )}
          </md-filled-select>
          <div class="today-row">
            <md-switch
              id="todayCheckbox"
              aria-label="Partidos de hoy"
              @change="${this.checkboxChanged}"
            ></md-switch>
            <span>Partidos de hoy</span>
          </div>
          <div class="today-row">
            <md-switch
              id="onlyPlayOffSwitch"
              aria-label="Solo partidos de Liguilla"
              @change="${this._filtersChanged}"
            ></md-switch>
            <span>Solo partidos de Liguilla</span>
          </div>
        </div>
        ${!this.isMobile
          ? html`
              <table class="greyGridTable">
                <thead>
                  <tr>
                    <th class="dynamic-colspan" colspan="2">Local</th>
                    <th>Gol Local</th>
                    <th class="dynamic-colspan" colspan="2">Visitante</th>
                    <th>Gol Visitante</th>
                    <th>Jornada</th>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Estadio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.matchesRender.map(
                    match => html`
                      <tr
                        id="match${match.idMatch}"
                        class="${getMatchRowClass(match.fecha as Date)}"
                      >
                        <td>
                          ${match.local.trim() !== ''
                            ? html`${getTeamImage(match.local)}`
                            : html``}
                        </td>
                        <td>${match.local}</td>
                        <td>${match.golLocal}</td>
                        <td>
                          ${match.visitante.trim() !== ''
                            ? html` ${getTeamImage(match.visitante)} `
                            : html``}
                        </td>
                        <td>${match.visitante}</td>
                        <td>${match.golVisitante}</td>
                        <td><span class="chip">${match.jornada}</span></td>
                        <td>${formatDateDDMMYYYY(match.fecha as Date)}</td>
                        <td>${match.hora}</td>
                        <td>${match.estadio}</td>
                        <td class="actions-cell">
                          <md-icon-button
                            data-id="${match.idMatch}"
                            aria-label="Acciones"
                            title="Más"
                            @click="${this._toggleRowMenu}"
                          >
                            <md-icon>more_vert</md-icon>
                          </md-icon-button>
                          ${this.openRowMenuId === match.idMatch
                            ? html`<div
                                class="row-menu"
                                role="menu"
                                aria-label="Menú de acciones"
                              >
                                <md-filled-button
                                  role="menuitem"
                                  @click="${this._onDetailsFromMenu}"
                                  data-id="${match.idMatch}"
                                  ><md-icon>info</md-icon
                                  >Detalles</md-filled-button
                                >
                              </div>`
                            : ''}
                        </td>
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            `
          : html`
              <div class="match-cards">
                ${this.matchesRender.map(
                  match => html`
                    <div class="match-card">
                      <div class="teams">
                        <div class="team-left">
                          ${match.local.trim() !== ''
                            ? getTeamImage(match.local)
                            : ''}
                          <div>${match.local}</div>
                        </div>
                        <div class="score">
                          <strong>${match.golLocal}</strong>
                          <span> - </span>
                          <strong>${match.golVisitante}</strong>
                        </div>
                        <div class="team-right">
                          ${match.visitante.trim() !== ''
                            ? getTeamImage(match.visitante)
                            : ''}
                          <div>${match.visitante}</div>
                        </div>
                      </div>
                      <div class="meta">
                        <div>Jornada: ${match.jornada}</div>
                        <div>
                          ${formatDateDDMMYYYY(match.fecha as Date)}
                          ${match.hora}
                        </div>
                        <div>${match.estadio}</div>
                      </div>
                      <div
                        class="actions"
                        style="margin-top:8px; display:flex; gap:8px;"
                      >
                        <md-filled-button
                          class="action-btn"
                          index="${match.idMatch}"
                          aria-label="Detalles"
                          @click="${this._showMatchDetails}"
                        >
                          <md-icon>info</md-icon>
                          <span class="btn-label">Detalles</span>
                        </md-filled-button>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `}
        ${this.championLegend
          ? html`<div class="champion-legend" role="note">
              ${this.championLegend}
            </div>`
          : ''}
      </main>
    `;
  }

  /**
   * Filter the matches when selected options change
   */
  private _filtersChanged() {
    if (this.todayDateSelected || this.onlyPlayOffSwitch.selected) {
      this.teamsSelect.value = '';
      this.matchDaySelect.value = '';
    }
    const team =
      this.teamsSelect.value === ''
        ? ''
        : this.teams[Number(this.teamsSelect.value)];
    const matchDay = this.matchDaySelect.value as number | '';
    this.matchesRender = this.matchesList.filter(match => {
      const findTeam =
        team === '' ? true : match.local === team || match.visitante === team;
      const findMatchDay = matchDay === '' ? true : match.jornada === matchDay;
      const onlyPlayOff =
        !this.onlyPlayOffSwitch.selected ||
        match.jornada > this.teams.length - 1;
      const todayDate =
        !this.todayDateSelected ||
        (this.todayDateSelected &&
          match.fecha instanceof Date &&
          match.fecha.getFullYear() === this.todayDate.getFullYear() &&
          match.fecha.getMonth() === this.todayDate.getMonth() &&
          match.fecha.getDate() === this.todayDate.getDate());
      return findTeam && findMatchDay && todayDate && onlyPlayOff;
    });
  }

  /**
   * Fired when the checkbox change
   * @param {Event} e
   */
  private checkboxChanged(e: Event) {
    this.todayDateSelected =
      ((e.target as MdSwitch).selected ??
        (e.target as HTMLInputElement).checked) ||
      false;
    this._filtersChanged();
  }

  private _onResize() {
    const isMobile = window.innerWidth < 600;
    if (this.isMobile !== isMobile) {
      this.isMobile = isMobile;
      this.requestUpdate();
    }
  }

  private _showMatchDetails(e: Event) {
    const index = (e.target as HTMLElement).getAttribute('index');
    const match = this.matchesList.find(m => m.idMatch === Number(index));
    if (!match) return;

    //Guardar filtros actuales
    const teamIndex = this.teamsSelect.value || '';
    const matchDayValue = this.matchDaySelect.value || '';
    this.savedFilters = {
      teamIndex,
      matchDayValue,
      todayDateSelected: this.todayDateSelected,
      onlyPlayOffSelected: this.onlyPlayOffSwitch.selected,
    };
    this.selectedMatch = match;
    this.showDetails = true;
    // Reset scroll to top
    window.scrollTo(0, 0);
    this.requestUpdate();
  }

  private _backToCalendar() {
    this.showDetails = false;
    //Restaurar filtros
    this.updateComplete.then(() => {
      if (this.savedFilters) {
        this.teamsSelect.value = this.savedFilters.teamIndex;
        this.matchDaySelect.value = this.savedFilters.matchDayValue;
        this.todayDateSelected = this.savedFilters.todayDateSelected;
        if (this.todayDateCheckbox)
          this.todayDateCheckbox.selected = this.todayDateSelected;
        this.onlyPlayOffSwitch.selected = this.savedFilters.onlyPlayOffSelected;
        this.savedFilters = null;
        this._filtersChanged();
      }
    });
  }
}
