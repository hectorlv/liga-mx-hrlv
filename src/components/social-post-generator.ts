import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import * as teamImages from '../assets/images/index.js';
import { Match, TableEntry } from '../types/index.js';
import { LOGOS } from '../utils/constants.js';
import {
  DEFAULT_SOCIAL_PRESENTATION,
  SOCIAL_COLORS,
  SOCIAL_CONFIG,
  SocialPresentationOptions,
  TemplateId,
} from '../social/social-config.js';
import {
  buildRenderResult,
  buildSocialCopy,
  buildTrackingUrl,
  dateKey,
  dailyMatchesVariant,
  formatSocialDate,
  formatKickoff,
  groupMatchesByDay,
  latestPlayedJornada,
  resolveMatchStatus,
  selectStandingsRange,
  selectTemplateMatches,
  SocialImageInput,
  SocialPlatform,
  templateLabel,
} from '../social/social-utils.js';

const teamImageMap = teamImages as unknown as Record<string, string>;
const DAY_TEMPLATES = new Set<TemplateId>(['day-preview', 'day-results']);

@customElement('social-post-generator')
export class SocialPostGenerator extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: 0 auto 28px;
      max-width: 1180px;
    }
    .generator {
      overflow: hidden;
      border: 1px solid rgba(74, 222, 128, 0.24);
      border-radius: 22px;
      background: linear-gradient(140deg, #0b1120, #172238);
      box-shadow: 0 20px 42px rgba(2, 6, 23, 0.28);
      color: #e2e8f0;
    }
    .content {
      display: grid;
      grid-template-columns: minmax(278px, 0.78fr) minmax(0, 1.22fr);
    }
    .controls {
      padding: 28px;
      border-right: 1px solid rgba(203, 213, 225, 0.14);
    }
    .eyebrow {
      margin: 0 0 9px;
      color: #4ade80;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }
    h2 {
      margin: 0;
      color: #fff;
      font-size: clamp(1.5rem, 2.5vw, 2rem);
      line-height: 1;
    }
    .description {
      margin: 12px 0 20px;
      color: #b6c4d5;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    label {
      display: block;
      margin: 15px 0 7px;
      color: #dbe7f4;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    select,
    input,
    textarea {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid rgba(203, 213, 225, 0.24);
      border-radius: 10px;
      background: rgba(2, 6, 23, 0.45);
      color: #f8fafc;
      font: inherit;
    }
    select,
    input {
      min-height: 42px;
      padding: 0 10px;
    }
    textarea {
      min-height: 126px;
      padding: 10px;
      resize: vertical;
      font:
        0.76rem/1.45 ui-monospace,
        SFMono-Regular,
        Menlo,
        monospace;
    }
    md-filled-button,
    md-outlined-button {
      width: 100%;
      margin-top: 12px;
    }
    md-filled-button {
      --md-filled-button-container-color: #4ade80;
      --md-filled-button-label-text-color: #052e16;
    }
    md-outlined-button {
      --md-outlined-button-outline-color: rgba(134, 239, 172, 0.55);
      --md-outlined-button-label-text-color: #bbf7d0;
    }
    .copy-panel {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid rgba(203, 213, 225, 0.14);
    }
    .copy-panel h3 {
      margin: 0 0 6px;
      font-size: 1rem;
    }
    .copy-panel p,
    .hint {
      margin: 0 0 10px;
      color: #9fb1c6;
      font-size: 0.8rem;
      line-height: 1.4;
    }
    .copy-status {
      min-height: 1.2em;
      margin-top: 9px !important;
      color: #86efac !important;
      font-weight: 700;
    }
    .presentation-options {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 18px;
      padding-top: 16px;
      border-top: 1px solid rgba(203, 213, 225, 0.14);
    }
    .presentation-options h3 {
      grid-column: 1 / -1;
      margin: 0;
      color: #dbe7f4;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .presentation-options label {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0;
      color: #b6c4d5;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: normal;
      text-transform: none;
    }
    .presentation-options input[type='checkbox'] {
      width: 16px;
      min-height: 16px;
      margin: 0;
      accent-color: #4ade80;
    }
    .theme-label {
      grid-column: 1 / -1;
      margin: 3px 0 0;
      color: #94a3b8;
      font-size: 0.72rem;
    }
    .validation {
      margin: 14px 0 0;
      padding: 10px;
      border: 1px solid rgba(251, 146, 60, 0.45);
      border-radius: 10px;
      background: rgba(124, 45, 18, 0.25);
      color: #fed7aa;
      font-size: 0.78rem;
      line-height: 1.35;
    }
    .preview {
      display: grid;
      min-width: 0;
      place-items: center;
      padding: 28px;
      background:
        radial-gradient(
          circle at 80% 5%,
          rgba(74, 222, 128, 0.09),
          transparent 32%
        ),
        #0b1120;
    }
    canvas {
      display: block;
      width: min(100%, 560px);
      height: auto;
      border-radius: 13px;
      background: #0f172a;
      box-shadow: 0 18px 36px rgba(0, 0, 0, 0.38);
    }
    @media (max-width: 820px) {
      .content {
        grid-template-columns: 1fr;
      }
      .controls {
        border-right: 0;
        border-bottom: 1px solid rgba(203, 213, 225, 0.14);
      }
    }
  `;

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];
  @state() private template: TemplateId = 'round-preview';
  @state() private platform: SocialPlatform = 'instagram';
  @state() private jornada?: number;
  @state() private dateSelection?: string;
  @state() private copyStatus = '';
  @state() private presentation: SocialPresentationOptions = {
    ...DEFAULT_SOCIAL_PRESENTATION,
  };
  @query('canvas') private canvas?: HTMLCanvasElement;
  private readonly imageCache = new Map<
    string,
    Promise<HTMLImageElement | undefined>
  >();
  private drawVersion = 0;

  override firstUpdated() {
    this._syncSelection();
    void this._draw();
  }

  override updated(changed: PropertyValues) {
    if (changed.has('matchesList')) this._syncSelection();
    void this._draw();
  }

  override render() {
    const input = this._input();
    const result = buildRenderResult(input);
    const isDay = DAY_TEMPLATES.has(this.template);
    const dates = this._datesForJornada();
    return html` <section
      class="generator"
      aria-label="Generador editorial para redes"
    >
      <div class="content">
        <div class="controls">
          <p class="eyebrow">Administración · Redes</p>
          <h2>Mesa editorial</h2>
          <p class="description">
            Crea una pieza 4:5, su copy y su descripción alternativa con datos
            en tiempo real.
          </p>
          <label for="template">Plantilla</label>
          <select id="template" @change=${this._onTemplateChange}>
            <option
              value="round-preview"
              ?selected=${this.template === 'round-preview'}
            >
              Previa completa de jornada
            </option>
            <option
              value="day-preview"
              ?selected=${this.template === 'day-preview'}
            >
              Previa de partidos del día
            </option>
            <option
              value="day-results"
              ?selected=${this.template === 'day-results'}
            >
              Resultados del día
            </option>
            <option
              value="standings"
              ?selected=${this.template === 'standings'}
            >
              Tabla general
            </option>
            <option
              value="round-results"
              ?selected=${this.template === 'round-results'}
            >
              Resultados completos de jornada
            </option>
          </select>
          ${
            this.template === 'standings'
              ? ''
              : html`
                  <label for="jornada">Jornada</label>
                  <select id="jornada" @change=${this._onJornadaChange}>
                    ${this._jornadas().map(value => html`<option value=${value} ?selected=${value === this.jornada}>Jornada ${value}</option>`)}
                  </select>
                  ${
                    isDay
                      ? html` <label for="date">Día</label>
                          <select id="date" @change=${this._onDateChange}>
                            ${dates.map(value => html`<option value=${value} ?selected=${value === this.dateSelection}>${formatSocialDate(`${value}T12:00:00`)}</option>`)}
                          </select>`
                      : ''
                  }
                `
          }
          <label for="platform">Copy para</label>
          <select id="platform" @change=${this._onPlatformChange}>
            <option
              value="instagram"
              ?selected=${this.platform === 'instagram'}
            >
              Instagram · 1080 × 1350
            </option>
            <option value="x" ?selected=${this.platform === 'x'}>
              X · 1080 × 1350
            </option>
          </select>
          <p class="hint">
            La imagen siempre se exporta en PNG 4:5; sólo cambia la llamada a la
            acción del copy.
          </p>
          <div class="presentation-options">
            <h3>Presentación</h3>
            ${
              this.template === 'standings'
                ? html` <label for="standings-range">Rango de tabla</label>
                    <select
                      id="standings-range"
                      @change=${this._onStandingsRangeChange}
                    >
                      <option
                        value="all"
                        ?selected=${this.presentation.standingsRange === 'all'}
                      >
                        Completa · 1–18
                      </option>
                      <option
                        value="top"
                        ?selected=${this.presentation.standingsRange === 'top'}
                      >
                        Parte alta · 1–10
                      </option>
                      <option
                        value="bottom"
                        ?selected=${this.presentation.standingsRange === 'bottom'}
                      >
                        Parte baja · 11–18
                      </option>
                    </select>`
                : ''
            }
            <label
              ><input
                data-presentation="showDomain"
                type="checkbox"
                .checked=${this.presentation.showDomain}
                @change=${this._onPresentationToggle}
              />Dominio</label
            >
            <label
              ><input
                data-presentation="showHandle"
                type="checkbox"
                .checked=${this.presentation.showHandle}
                @change=${this._onPresentationToggle}
              />Usuario</label
            >
            <label
              ><input
                data-presentation="showGrid"
                type="checkbox"
                .checked=${this.presentation.showGrid}
                @change=${this._onPresentationToggle}
              />Cuadrícula</label
            >
            ${
              this.template === 'standings'
                ? html`<label
                    ><input
                      data-presentation="showUpdatedAt"
                      type="checkbox"
                      .checked=${this.presentation.showUpdatedAt}
                      @change=${this._onPresentationToggle}
                    />Hora de corte</label
                  >`
                : ''
            }
            <p class="theme-label">Tema: ${SOCIAL_CONFIG.theme}</p>
          </div>
          <md-filled-button
            ?disabled=${result.errors.length > 0}
            @click=${this._download}
          >
            <md-icon slot="icon">download</md-icon> Descargar PNG
          </md-filled-button>
          ${result.errors.length ? html`<p class="validation">${result.errors[0]}</p>` : ''}
          <div class="copy-panel">
            <h3>Texto para publicar</h3>
            <textarea
              aria-label="Texto listo para publicar"
              readonly
              .value=${buildSocialCopy(input, this.platform)}
            ></textarea>
            <md-outlined-button
              @click=${() => this._copy(buildSocialCopy(input, this.platform), 'Texto copiado.')}
              ><md-icon slot="icon">content_copy</md-icon>Copiar
              texto</md-outlined-button
            >
            <label for="alt-text">Descripción alternativa</label>
            <textarea
              id="alt-text"
              aria-label="Descripción alternativa"
              readonly
              .value=${result.alt}
            ></textarea>
            <md-outlined-button
              @click=${() => this._copy(result.alt, 'Descripción alternativa copiada.')}
              ><md-icon slot="icon">accessibility_new</md-icon>Copiar
              alt</md-outlined-button
            >
            <label for="tracking-link">Enlace de seguimiento</label>
            <input
              id="tracking-link"
              readonly
              .value=${buildTrackingUrl(input, this.platform)}
            />
            <md-outlined-button
              @click=${() => this._copy(buildTrackingUrl(input, this.platform), 'Enlace copiado.')}
              ><md-icon slot="icon">link</md-icon>Copiar
              enlace</md-outlined-button
            >
            <p class="copy-status" aria-live="polite">${this.copyStatus}</p>
          </div>
        </div>
        <div class="preview">
          <canvas aria-label="Vista previa de la publicación social"></canvas>
        </div>
      </div>
    </section>`;
  }

  private _input(): SocialImageInput {
    return {
      template: this.template,
      matches: this.matchesList,
      standings: this.table,
      jornada:
        this.template === 'standings'
          ? latestPlayedJornada(this.matchesList)
          : this.jornada,
      dateKey: DAY_TEMPLATES.has(this.template)
        ? this.dateSelection
        : undefined,
      presentation: this.presentation,
    };
  }

  private _jornadas(): number[] {
    return [...new Set(this.matchesList.map(match => match.jornada))]
      .filter(Number.isFinite)
      .sort((a, b) => a - b);
  }
  private _datesForJornada(): string[] {
    return [
      ...new Set(
        this.matchesList
          .filter(match => match.jornada === this.jornada)
          .map(match => dateKey(match.fecha)),
      ),
    ]
      .filter(value => value !== '')
      .sort();
  }
  private _syncSelection() {
    const jornadas = this._jornadas();
    if (!this.jornada || !jornadas.includes(this.jornada))
      this.jornada = jornadas[jornadas.length - 1];
    const dates = this._datesForJornada();
    if (!this.dateSelection || !dates.includes(this.dateSelection))
      this.dateSelection = dates[0];
  }
  private _onTemplateChange(event: Event) {
    this.template = (event.target as HTMLSelectElement).value as TemplateId;
  }
  private _onJornadaChange(event: Event) {
    this.jornada = Number((event.target as HTMLSelectElement).value);
    this.dateSelection = this._datesForJornada()[0];
  }
  private _onDateChange(event: Event) {
    this.dateSelection = (event.target as HTMLSelectElement).value;
  }
  private _onPlatformChange(event: Event) {
    this.platform = (event.target as HTMLSelectElement).value as SocialPlatform;
  }
  private _onStandingsRangeChange(event: Event) {
    this.presentation = {
      ...this.presentation,
      standingsRange: (event.target as HTMLSelectElement)
        .value as SocialPresentationOptions['standingsRange'],
    };
  }
  private _onPresentationToggle(event: Event) {
    const input = event.target as HTMLInputElement;
    const presentationKey = input.dataset.presentation as
      | keyof Pick<
          SocialPresentationOptions,
          'showDomain' | 'showHandle' | 'showGrid' | 'showUpdatedAt'
        >
      | undefined;
    if (!presentationKey) return;
    this.presentation = {
      ...this.presentation,
      [presentationKey]: input.checked,
    };
  }

  private async _draw() {
    const target = this.canvas;
    if (!target) return;
    const version = ++this.drawVersion;
    const canvas = document.createElement('canvas');
    canvas.width = SOCIAL_CONFIG.width;
    canvas.height = SOCIAL_CONFIG.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    const input = this._input();
    this._drawBackdrop(context, input.presentation);
    const result = buildRenderResult(input);
    if (result.errors.length) {
      await this._drawHeader(
        context,
        'REVISAR DATOS',
        templateLabel(input.template),
      );
      this._drawEmptyState(context, result.errors[0]);
    } else if (input.template === 'standings')
      await this._drawStandings(context, input);
    else await this._drawMatches(context, input);
    if (version !== this.drawVersion || !this.canvas) return;
    this.canvas.width = SOCIAL_CONFIG.width;
    this.canvas.height = SOCIAL_CONFIG.height;
    this.canvas.getContext('2d')?.drawImage(canvas, 0, 0);
  }

  private _drawBackdrop(
    context: CanvasRenderingContext2D,
    presentation = DEFAULT_SOCIAL_PRESENTATION,
  ) {
    const { width, height } = SOCIAL_CONFIG;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, SOCIAL_COLORS.backgroundStrong);
    gradient.addColorStop(0.58, SOCIAL_COLORS.background);
    gradient.addColorStop(1, '#172238');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(
      width,
      0,
      40,
      width,
      0,
      width * 0.75,
    );
    glow.addColorStop(0, 'rgba(74, 222, 128, .18)');
    glow.addColorStop(1, 'rgba(74, 222, 128, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    if (!presentation.showGrid) return;
    context.strokeStyle = 'rgba(226, 232, 240, .035)';
    context.lineWidth = 1;
    for (let x = 0; x <= width; x += 54) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 0; y <= height; y += 54) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  private async _drawHeader(
    context: CanvasRenderingContext2D,
    title: string,
    subtitle: string,
  ) {
    const { safeInset, width } = SOCIAL_CONFIG;
    context.fillStyle = SOCIAL_COLORS.primary;
    context.fillRect(safeInset, 76, 10, 95);
    context.fillStyle = '#fff';
    let titleSize = 62;
    context.font = `800 ${titleSize}px system-ui, sans-serif`;
    while (context.measureText(title).width > 690 && titleSize > 44) {
      titleSize -= 2;
      context.font = `800 ${titleSize}px system-ui, sans-serif`;
    }
    context.fillText(title, safeInset + 30, 122);
    context.fillStyle = SOCIAL_COLORS.muted;
    context.font = '700 23px system-ui, sans-serif';
    context.fillText(
      subtitle.toLocaleUpperCase(SOCIAL_CONFIG.locale),
      safeInset + 30,
      158,
    );
    const logo = await this._loadImage(SOCIAL_CONFIG.logoPath);
    if (logo) context.drawImage(logo, width - safeInset - 54, 72, 54, 54);
    context.textAlign = 'right';
    context.fillStyle = '#e2e8f0';
    context.font = '800 22px system-ui, sans-serif';
    context.fillText(
      SOCIAL_CONFIG.brandName.toLocaleUpperCase(SOCIAL_CONFIG.locale),
      width - safeInset - 66,
      107,
    );
    context.textAlign = 'left';
  }

  private async _drawMatches(
    context: CanvasRenderingContext2D,
    input: SocialImageInput,
  ) {
    const matches = selectTemplateMatches(input);
    const isDaily = DAY_TEMPLATES.has(input.template);
    const isResults =
      input.template !== 'round-preview' && input.template !== 'day-preview';
    const subtitle = input.dateKey
      ? formatSocialDate(`${input.dateKey}T12:00:00`)
      : `JORNADA ${input.jornada} · ${matches.length} PARTIDOS`;
    await this._drawHeader(
      context,
      isResults
        ? input.template === 'round-results'
          ? 'RESULTADOS DE LA JORNADA'
          : 'RESULTADOS'
        : input.template === 'round-preview'
          ? 'PREVIA DE JORNADA'
          : 'PARTIDOS DEL DÍA',
      subtitle,
    );
    if (isDaily) await this._drawDailyMatches(context, matches, isResults);
    else await this._drawGroupedMatches(context, matches, isResults);
    this._drawFooter(
      input.presentation,
      context,
      isResults
        ? 'Marcadores y fichas completas'
        : 'Calendario, horarios y resultados',
    );
  }

  private async _drawGroupedMatches(
    context: CanvasRenderingContext2D,
    matches: Match[],
    isResults: boolean,
  ) {
    const groups = groupMatchesByDay(matches.slice(0, 9));
    const labelSpace = groups.length * 29;
    const gap = 8;
    const available =
      1195 - 220 - labelSpace - gap * Math.max(0, matches.length - 1);
    const height = Math.max(
      74,
      Math.min(88, Math.floor(available / Math.max(1, matches.length))),
    );
    let y = 220;
    for (const group of groups) {
      context.fillStyle = SOCIAL_COLORS.primary;
      context.font = '700 18px system-ui, sans-serif';
      context.fillText(
        `${group.label} · ${group.matches.length} PARTIDOS`,
        58,
        y + 18,
      );
      y += 29;
      for (const match of group.matches) {
        await this._drawMatchCard(
          context,
          match,
          58,
          y,
          964,
          height,
          isResults,
          'compact',
        );
        y += height + gap;
      }
    }
    if (matches.length > 9)
      this._drawOverflowNote(
        context,
        `${matches.length - 9} partidos más · Consulta el calendario completo`,
      );
  }

  private async _drawDailyMatches(
    context: CanvasRenderingContext2D,
    matches: Match[],
    isResults: boolean,
  ) {
    const visible = matches.slice(0, 4);
    const variant = dailyMatchesVariant(visible);
    const heights: Record<ReturnType<typeof dailyMatchesVariant>, number> = {
      'one-match': 470,
      'two-matches': 390,
      'three-matches': 275,
      'four-matches': 205,
    };
    const height = heights[variant];
    const gap = visible.length <= 2 ? 32 : 20;
    const totalHeight =
      height * visible.length + gap * Math.max(0, visible.length - 1);
    let y = 220 + Math.max(0, (940 - totalHeight) / 2);
    for (const match of visible) {
      await this._drawMatchCard(
        context,
        match,
        58,
        y,
        964,
        height,
        isResults,
        'daily',
      );
      y += height + gap;
    }
    if (matches.length > 4)
      this._drawOverflowNote(
        context,
        `${matches.length - 4} partidos más · Consulta el calendario completo`,
      );
  }

  private async _drawMatchCard(
    context: CanvasRenderingContext2D,
    match: Match,
    x: number,
    y: number,
    width: number,
    height: number,
    isResults: boolean,
    layout: 'compact' | 'daily',
  ) {
    context.fillStyle = 'rgba(30, 41, 59, .94)';
    this._roundedRect(context, x, y, width, height, 18);
    context.fill();
    context.strokeStyle = SOCIAL_COLORS.border;
    context.stroke();
    const isDaily = layout === 'daily';
    const logoSize = isDaily
      ? Math.min(100, height * 0.42)
      : Math.min(54, height * 0.56);
    const centerY = y + height / 2;
    const leftLogoX = x + 25;
    const rightLogoX = x + width - 25 - logoSize;
    await this._drawTeamBadge(
      context,
      match.local,
      leftLogoX,
      centerY - logoSize / 2,
      logoSize,
    );
    await this._drawTeamBadge(
      context,
      match.visitante,
      rightLogoX,
      centerY - logoSize / 2,
      logoSize,
    );
    const teamSize = isDaily
      ? Math.max(24, Math.min(34, height * 0.14))
      : Math.max(20, Math.min(27, height * 0.28));
    const status = resolveMatchStatus(match);
    const scoreAvailable =
      Number.isFinite(match.golLocal) && Number.isFinite(match.golVisitante);
    const highlightWinner =
      isResults &&
      status === 'finished' &&
      scoreAvailable &&
      match.golLocal !== match.golVisitante;
    context.fillStyle =
      highlightWinner && match.golLocal > match.golVisitante
        ? SOCIAL_COLORS.primary
        : SOCIAL_COLORS.text;
    this._drawFittedText(
      context,
      match.local,
      leftLogoX + logoSize + 13,
      centerY - (teamSize > 25 ? 3 : 0),
      width * 0.245,
      teamSize,
      'left',
      highlightWinner && match.golLocal > match.golVisitante ? 800 : 700,
    );
    context.fillStyle =
      highlightWinner && match.golVisitante > match.golLocal
        ? SOCIAL_COLORS.primary
        : SOCIAL_COLORS.text;
    this._drawFittedText(
      context,
      match.visitante,
      rightLogoX - 13,
      centerY - (teamSize > 25 ? 3 : 0),
      width * 0.245,
      teamSize,
      'right',
      highlightWinner && match.golVisitante > match.golLocal ? 800 : 700,
    );
    const showScore =
      isResults &&
      scoreAvailable &&
      (status === 'finished' || status === 'live');
    const centerX = x + width / 2;
    const centerWidth = isDaily ? 164 : 126;
    context.fillStyle = SOCIAL_COLORS.surfaceStrong;
    this._roundedRect(
      context,
      centerX - centerWidth / 2,
      centerY - (isDaily ? 52 : 28),
      centerWidth,
      isDaily ? 104 : 56,
      12,
    );
    context.fill();
    context.textAlign = 'center';
    context.fillStyle = showScore ? SOCIAL_COLORS.primary : '#fff';
    context.font = `800 ${isDaily ? Math.min(54, Math.max(34, height * 0.2)) : Math.min(35, Math.max(25, height * 0.32))}px system-ui, sans-serif`;
    if (isDaily && !isResults) {
      context.font = '800 18px system-ui, sans-serif';
      context.fillStyle = SOCIAL_COLORS.muted;
      context.fillText('VS', centerX, centerY - 15);
      context.fillStyle = '#fff';
      context.font = `800 ${Math.min(30, Math.max(22, height * 0.12))}px system-ui, sans-serif`;
      context.fillText(formatKickoff(match.hora || ''), centerX, centerY + 22);
    } else {
      context.fillText(
        showScore
          ? `${match.golLocal} — ${match.golVisitante}`
          : isResults
            ? '—'
            : formatKickoff(match.hora || ''),
        centerX,
        centerY + 5,
      );
    }
    const detail = this._matchDetail(match, status, isResults);
    context.fillStyle = this._statusColor(status);
    context.font = `700 ${Math.max(14, Math.min(18, height * 0.16))}px system-ui, sans-serif`;
    context.fillText(
      detail,
      x + width / 2,
      centerY + (isDaily ? 43 : Math.min(28, height * 0.31)),
    );
    const penalties = this._penaltyLabel(match);
    if (penalties) {
      context.fillStyle = SOCIAL_COLORS.muted;
      context.font = `700 ${isDaily ? 16 : 13}px system-ui, sans-serif`;
      context.fillText(
        penalties,
        centerX,
        centerY + (isDaily ? 67 : height * 0.47),
      );
    }
    context.textAlign = 'left';
  }

  private _matchDetail(
    match: Match,
    status: ReturnType<typeof resolveMatchStatus>,
    isResults: boolean,
  ): string {
    if (status === 'postponed') return 'POSPUESTO';
    if (status === 'cancelled') return 'CANCELADO';
    if (status === 'live')
      return `EN VIVO${match.liveMinute == null ? '' : ` · ${match.liveMinute}'`}`;
    if (isResults)
      return status === 'finished' ? 'MARCADOR FINAL' : 'PENDIENTE';
    return '';
  }

  private _penaltyLabel(match: Match): string | undefined {
    if (
      !Number.isFinite(match.penaltyLocal) ||
      !Number.isFinite(match.penaltyVisitante)
    )
      return undefined;
    return `PEN. ${match.penaltyLocal} — ${match.penaltyVisitante}`;
  }

  private async _drawStandings(
    context: CanvasRenderingContext2D,
    input: SocialImageInput,
  ) {
    const presentation = input.presentation || DEFAULT_SOCIAL_PRESENTATION;
    const entries = selectStandingsRange(
      input.standings,
      presentation.standingsRange,
    );
    const compact = entries.length > 10;
    const rowHeight = compact ? 48 : 75;
    const gap = compact ? 4 : 7;
    await this._drawHeader(
      context,
      'TABLA GENERAL',
      presentation.showUpdatedAt
        ? `ACTUALIZADA ${new Intl.DateTimeFormat(SOCIAL_CONFIG.locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: SOCIAL_CONFIG.timezone }).format(new Date())}`
        : `RANGO ${presentation.standingsRange === 'all' ? '1–18' : presentation.standingsRange === 'top' ? '1–10' : '11–18'}`,
    );
    const top = 224;
    context.fillStyle = SOCIAL_COLORS.primary;
    this._roundedRect(context, 58, 184, 964, 30, 8);
    context.fill();
    context.fillStyle = SOCIAL_COLORS.backgroundStrong;
    context.font = '800 18px system-ui, sans-serif';
    context.fillText('POS', 82, 205);
    context.fillText('EQUIPO', 166, 205);
    context.textAlign = 'right';
    context.fillText('PJ', 816, 205);
    context.fillText('DG', 887, 205);
    context.fillText('PTS', 976, 205);
    context.textAlign = 'left';
    for (const { entry, position } of entries)
      await this._drawStandingRow(
        context,
        entry,
        position,
        58,
        top + (position - entries[0].position) * (rowHeight + gap),
        964,
        rowHeight,
      );
    this._drawFooter(
      presentation,
      context,
      'PJ · Partidos jugados   DG · Diferencia de goles   PTS · Puntos',
    );
  }

  private async _drawStandingRow(
    context: CanvasRenderingContext2D,
    entry: TableEntry,
    position: number,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    context.fillStyle = 'rgba(30, 41, 59, .94)';
    this._roundedRect(context, x, y, width, height, 13);
    context.fill();
    context.fillStyle = entry.clasificado
      ? SOCIAL_COLORS.primary
      : entry.playin
        ? SOCIAL_COLORS.warning
        : entry.eliminado
          ? '#ef4444'
          : SOCIAL_COLORS.info;
    context.fillRect(x, y + 9, 5, height - 18);
    const compact = height < 60;
    const logoSize = compact ? 30 : 48;
    const numberSize = compact ? 18 : 25;
    const teamSize = compact ? 18 : 24;
    context.fillStyle = SOCIAL_COLORS.text;
    context.font = `800 ${numberSize}px system-ui, sans-serif`;
    context.fillText(
      String(position),
      x + 25,
      y + height / 2 + numberSize * 0.34,
    );
    await this._drawTeamBadge(
      context,
      entry.equipo,
      x + 75,
      y + (height - logoSize) / 2,
      logoSize,
    );
    context.font = `700 ${teamSize}px system-ui, sans-serif`;
    this._drawFittedText(
      context,
      entry.equipo,
      x + 88 + logoSize,
      y + height / 2 + teamSize * 0.34,
      530,
      teamSize,
      'left',
    );
    context.fillStyle = SOCIAL_COLORS.surfaceStrong;
    this._roundedRect(
      context,
      x + width - 82,
      y + 5,
      72,
      height - 10,
      Math.min(10, height / 3),
    );
    context.fill();
    context.textAlign = 'right';
    context.fillStyle = SOCIAL_COLORS.muted;
    context.font = `700 ${compact ? 18 : 22}px system-ui, sans-serif`;
    context.fillText(
      String(entry.jj),
      x + width - 205,
      y + height / 2 + (compact ? 6 : 8),
    );
    context.fillText(
      `${entry.dg >= 0 ? '+' : ''}${entry.dg}`,
      x + width - 128,
      y + height / 2 + (compact ? 6 : 8),
    );
    context.fillStyle = SOCIAL_COLORS.primary;
    context.font = `800 ${compact ? 20 : 27}px system-ui, sans-serif`;
    context.fillText(
      String(entry.pts),
      x + width - 27,
      y + height / 2 + (compact ? 7 : 9),
    );
    context.textAlign = 'left';
  }

  private _drawEmptyState(context: CanvasRenderingContext2D, message: string) {
    context.fillStyle = 'rgba(30, 41, 59, .96)';
    this._roundedRect(context, 110, 480, 860, 210, 22);
    context.fill();
    context.fillStyle = SOCIAL_COLORS.warning;
    context.font = '800 34px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText('NO PUBLICAR', 540, 560);
    context.fillStyle = SOCIAL_COLORS.text;
    context.font = '600 25px system-ui, sans-serif';
    context.fillText(message, 540, 620, 760);
    context.textAlign = 'left';
    this._drawFooter(
      DEFAULT_SOCIAL_PRESENTATION,
      context,
      'Corrige los datos y vuelve a generar la pieza',
    );
  }
  private _drawOverflowNote(context: CanvasRenderingContext2D, note: string) {
    context.fillStyle = SOCIAL_COLORS.warning;
    context.font = '700 17px system-ui, sans-serif';
    context.textAlign = 'center';
    context.fillText(note, 540, 1215);
    context.textAlign = 'left';
  }
  private _drawFooter(
    presentation: SocialPresentationOptions | undefined,
    context: CanvasRenderingContext2D,
    text: string,
  ) {
    const { safeInset, width, height, siteUrl, socialHandle } = SOCIAL_CONFIG;
    const options = presentation || DEFAULT_SOCIAL_PRESENTATION;
    context.fillStyle = 'rgba(74, 222, 128, .45)';
    context.fillRect(safeInset, height - 78, width - safeInset * 2, 1);
    context.fillStyle = SOCIAL_COLORS.muted;
    context.font = '600 17px system-ui, sans-serif';
    context.fillText(text, safeInset, height - 42);
    context.textAlign = 'right';
    context.fillStyle = SOCIAL_COLORS.primary;
    const identity = [
      options.showHandle ? socialHandle : '',
      options.showDomain ? new URL(siteUrl).host : '',
    ]
      .filter(Boolean)
      .join(' · ');
    context.fillText(identity, width - safeInset, height - 42);
    context.textAlign = 'left';
  }
  private _statusColor(status: ReturnType<typeof resolveMatchStatus>) {
    return status === 'postponed'
      ? SOCIAL_COLORS.warning
      : status === 'cancelled'
        ? '#f87171'
        : status === 'live'
          ? SOCIAL_COLORS.primary
          : SOCIAL_COLORS.muted;
  }
  private async _drawTeamBadge(
    context: CanvasRenderingContext2D,
    team: string,
    x: number,
    y: number,
    size: number,
  ) {
    const logo = LOGOS.find(entry => entry.equipo === team);
    const image = logo
      ? await this._loadImage(teamImageMap[logo.img])
      : undefined;
    if (image) {
      const scale = Math.min(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(
        image,
        x + (size - width) / 2,
        y + (size - height) / 2,
        width,
        height,
      );
      return;
    }
    context.fillStyle = SOCIAL_COLORS.surfaceStrong;
    this._roundedRect(context, x, y, size, size, size / 2);
    context.fill();
    context.fillStyle = SOCIAL_COLORS.text;
    context.font = `800 ${Math.max(16, size * 0.38)}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.fillText(
      team.trim().slice(0, 2).toLocaleUpperCase(SOCIAL_CONFIG.locale),
      x + size / 2,
      y + size * 0.64,
    );
    context.textAlign = 'left';
  }
  private _loadImage(source?: string): Promise<HTMLImageElement | undefined> {
    if (!source) return Promise.resolve(undefined);
    const saved = this.imageCache.get(source);
    if (saved) return saved;
    const load = new Promise<HTMLImageElement | undefined>(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(undefined);
      image.src = source;
    });
    this.imageCache.set(source, load);
    return load;
  }
  private _roundedRect(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }
  private _drawFittedText(
    context: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    maxSize: number,
    align: CanvasTextAlign,
    fontWeight = 700,
  ) {
    let size = maxSize;
    let lines: string[] = [text];
    while (size >= 22) {
      context.font = `${fontWeight} ${size}px system-ui, sans-serif`;
      lines = this._wrapText(context, text, maxWidth);
      if (lines.length <= 2) break;
      size -= 1;
    }
    if (lines.length > 2) {
      lines = [lines[0], `${lines.slice(1).join(' ').slice(0, 22).trimEnd()}…`];
    }
    context.textAlign = align;
    const lineHeight = size * 0.91;
    lines.forEach((line, index) =>
      context.fillText(
        line,
        x,
        y + (index - (lines.length - 1) / 2) * lineHeight,
      ),
    );
    context.textAlign = 'left';
  }
  private _wrapText(
    context: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
  ): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width <= maxWidth || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
    return lines;
  }
  private async _copy(value: string, success: string) {
    try {
      await navigator.clipboard.writeText(value);
      this.copyStatus = success;
    } catch {
      this.copyStatus =
        'No se pudo copiar automáticamente; selecciona el texto y cópialo.';
    }
  }
  private _download() {
    const result = buildRenderResult(this._input());
    const canvas = this.canvas;
    if (!canvas || result.errors.length) return;
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, 'image/png');
  }
}
