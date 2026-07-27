import '@material/web/button/filled-button.js';
import '@material/web/button/outlined-button.js';
import '@material/web/icon/icon.js';
import { css, html, LitElement, PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import * as teamImages from '../assets/images/index.js';
import { Match, TableEntry } from '../types/index.js';
import { LOGOS } from '../utils/constants.js';
import { hasMatchEnded, hasMatchStarted } from '../utils/matchStatus.js';

type SocialTemplate = 'preview' | 'results' | 'table';
type SocialPlatform = 'instagram' | 'x';
type GeneratorContext = 'matches' | 'table';

interface CanvasSize {
  width: number;
  height: number;
}

const SOCIAL_SIZES: Record<SocialPlatform, CanvasSize> = {
  instagram: { width: 1080, height: 1350 },
  x: { width: 1600, height: 900 },
};

const teamImageMap = teamImages as unknown as Record<string, string>;

@customElement('social-post-generator')
export class SocialPostGenerator extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: 0 auto 28px;
      max-width: 980px;
    }

    .generator {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(17, 205, 137, 0.26);
      border-radius: 20px;
      background:
        radial-gradient(circle at top right, rgba(31, 197, 154, 0.17), transparent 36%),
        linear-gradient(132deg, #061d33 0%, #082d45 54%, #051729 100%);
      box-shadow: 0 20px 42px rgba(4, 24, 40, 0.22);
      color: #f5fbff;
    }

    .generator::before {
      position: absolute;
      inset: 0;
      background-image: linear-gradient(rgba(145, 238, 207, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(145, 238, 207, 0.05) 1px, transparent 1px);
      background-size: 26px 26px;
      content: '';
      mask-image: linear-gradient(to bottom, black, transparent 68%);
      pointer-events: none;
    }

    .content {
      position: relative;
      display: grid;
      grid-template-columns: minmax(260px, 0.88fr) minmax(0, 1.12fr);
    }

    .controls {
      padding: 28px;
      border-right: 1px solid rgba(220, 255, 246, 0.14);
    }

    .copy-panel {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid rgba(220, 255, 246, 0.16);
    }

    .copy-panel h3 {
      margin: 0 0 6px;
      color: #fff;
      font-size: 1rem;
    }

    .copy-panel p {
      margin: 0 0 12px;
      color: #a9c5d5;
      font-size: 0.82rem;
      line-height: 1.35;
    }

    textarea {
      box-sizing: border-box;
      width: 100%;
      min-height: 148px;
      padding: 11px;
      border: 1px solid rgba(216, 249, 241, 0.2);
      border-radius: 10px;
      resize: vertical;
      background: rgba(0, 13, 28, 0.52);
      color: #dffdf1;
      font: 0.78rem/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .tracking-label {
      display: block;
      margin-top: 14px;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      min-height: 40px;
      padding: 0 11px;
      border: 1px solid rgba(216, 249, 241, 0.2);
      border-radius: 10px;
      background: rgba(0, 13, 28, 0.52);
      color: #dffdf1;
      font: 0.72rem ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    md-outlined-button {
      width: 100%;
      margin-top: 10px;
      --md-outlined-button-outline-color: rgba(111, 243, 198, 0.5);
      --md-outlined-button-label-text-color: #8cf5d0;
    }

    .copy-status {
      min-height: 1.1em;
      margin: 8px 0 0;
      color: #7ff2c7;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .eyebrow {
      margin: 0 0 8px;
      color: #6af0c2;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      color: #fff;
      font-size: clamp(1.35rem, 2vw, 1.8rem);
      line-height: 1.05;
    }

    .description {
      margin: 12px 0 22px;
      color: #c4d8e6;
      font-size: 0.9rem;
      line-height: 1.45;
    }

    label {
      display: block;
      margin: 16px 0 7px;
      color: #dbeaf3;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.07em;
      text-transform: uppercase;
    }

    select {
      width: 100%;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid rgba(216, 249, 241, 0.25);
      border-radius: 10px;
      background: rgba(0, 13, 28, 0.45);
      color: #fff;
      font: inherit;
    }

    md-filled-button {
      width: 100%;
      margin-top: 24px;
      --md-filled-button-container-color: #13b879;
      --md-filled-button-label-text-color: #001f17;
    }

    .preview {
      display: grid;
      place-items: center;
      min-width: 0;
      padding: 28px;
      background: linear-gradient(145deg, rgba(0, 11, 25, 0.26), rgba(5, 33, 54, 0.15));
    }

    canvas {
      display: block;
      width: min(100%, 500px);
      height: auto;
      border-radius: 12px;
      background: #06213d;
      box-shadow: 0 18px 35px rgba(0, 0, 0, 0.34);
    }

    .empty {
      margin: 0;
      color: #c4d8e6;
      text-align: center;
    }

    @media (max-width: 760px) {
      .content {
        grid-template-columns: 1fr;
      }

      .controls {
        border-right: 0;
        border-bottom: 1px solid rgba(220, 255, 246, 0.14);
      }
    }
  `;

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ type: Array }) table: TableEntry[] = [];
  @property({ type: String }) context: GeneratorContext = 'matches';
  @property({ type: String }) initialTemplate?: SocialTemplate;

  @state() private template: SocialTemplate = 'preview';
  @state() private platform: SocialPlatform = 'instagram';
  @state() private jornada?: number;
  @state() private dateKey?: string;
  @state() private copyStatus = '';

  @query('canvas') private canvas?: HTMLCanvasElement;

  override firstUpdated() {
    if (this.initialTemplate) this.template = this.initialTemplate;
    this._syncSelection();
    void this._draw();
  }

  override updated(changedProperties: PropertyValues) {
    if (changedProperties.has('matchesList') || changedProperties.has('context')) {
      this._syncSelection();
    }
    void this._draw();
  }

  override render() {
    const isTable = this.context === 'table';
    const dates = this._datesForSelectedJornada();
    const hasContent = isTable ? this.table.length > 0 : dates.length > 0;

    return html`
      <section class="generator" aria-label="Generador de contenido para redes">
        <div class="content">
          <div class="controls">
            <p class="eyebrow">Administración · Redes</p>
            <h2>${isTable ? 'Tabla general' : 'Publicación de jornada'}</h2>
            <p class="description">
              ${isTable
                ? 'Descarga una tabla editorial lista para compartir.'
                : 'Usa los partidos registrados para crear una previa o los resultados de un día.'}
            </p>

            ${
              isTable
                ? ''
                : html`
                    <label for="template">Plantilla</label>
                    <select id="template" @change=${this._onTemplateChange}>
                      <option value="preview" ?selected=${this.template === 'preview'}>Previa por día</option>
                      <option value="results" ?selected=${this.template === 'results'}>Resultados por día</option>
                    </select>
                    <label for="jornada">Jornada</label>
                    <select id="jornada" @change=${this._onJornadaChange}>
                      ${this._jornadas().map(
                        jornada => html`<option value=${jornada} ?selected=${jornada === this.jornada}>Jornada ${jornada}</option>`,
                      )}
                    </select>
                    <label for="date">Día</label>
                    <select id="date" @change=${this._onDateChange}>
                      ${dates.map(
                        date => html`<option value=${date} ?selected=${date === this.dateKey}>${this._formatDateLabel(date)}</option>`,
                      )}
                    </select>
                  `
            }

            <label for="platform">Formato</label>
            <select id="platform" @change=${this._onPlatformChange}>
              <option value="instagram" ?selected=${this.platform === 'instagram'}>Instagram · 1080 × 1350</option>
              <option value="x" ?selected=${this.platform === 'x'}>X · 1600 × 900</option>
            </select>

            <md-filled-button ?disabled=${!hasContent} @click=${this._download}>
              <md-icon slot="icon">download</md-icon>
              Descargar PNG
            </md-filled-button>
            <div class="copy-panel">
              <h3>Texto para publicar</h3>
              <p>Incluye el enlace profundo y seguimiento UTM para ${this.platform === 'x' ? 'X' : 'Instagram'}.</p>
              <textarea aria-label="Texto listo para publicar" readonly .value=${this._postCopy()}></textarea>
              <md-outlined-button @click=${this._copyText}>
                <md-icon slot="icon">content_copy</md-icon>
                Copiar texto
              </md-outlined-button>
              <label class="tracking-label" for="tracking-link">Enlace de seguimiento</label>
              <input id="tracking-link" aria-label="Enlace de seguimiento" readonly .value=${this._trackingUrl()}>
              <md-outlined-button @click=${this._copyTrackingLink}>
                <md-icon slot="icon">link</md-icon>
                Copiar enlace
              </md-outlined-button>
              <p class="copy-status" aria-live="polite">${this.copyStatus}</p>
            </div>
          </div>
          <div class="preview">
            ${hasContent ? html`<canvas aria-label="Vista previa de la publicación"></canvas>` : html`<p class="empty">Aún no hay datos para generar esta publicación.</p>`}
          </div>
        </div>
      </section>
    `;
  }

  private _onTemplateChange(event: Event) {
    this.template = (event.target as HTMLSelectElement).value as SocialTemplate;
  }

  private _onJornadaChange(event: Event) {
    this.jornada = Number((event.target as HTMLSelectElement).value);
    this.dateKey = this._datesForSelectedJornada()[0];
  }

  private _onDateChange(event: Event) {
    this.dateKey = (event.target as HTMLSelectElement).value;
  }

  private _onPlatformChange(event: Event) {
    this.platform = (event.target as HTMLSelectElement).value as SocialPlatform;
  }

  private _syncSelection() {
    if (this.context === 'table') {
      this.template = 'table';
      return;
    }

    const jornadas = this._jornadas();
    if (!this.jornada || !jornadas.includes(this.jornada)) {
      this.jornada = jornadas[jornadas.length - 1];
    }
    const dates = this._datesForSelectedJornada();
    if (!this.dateKey || !dates.includes(this.dateKey)) {
      this.dateKey = dates[0];
    }
  }

  private _jornadas(): number[] {
    return [...new Set(this.matchesList.map(match => match.jornada))].sort((a, b) => a - b);
  }

  private _datesForSelectedJornada(): string[] {
    if (!this.jornada) return [];
    return [
      ...new Set(
        this.matchesList
          .filter(match => match.jornada === this.jornada)
          .map(match => this._dateKey(match.fecha)),
      ),
    ].sort();
  }

  private _selectedMatches(): Match[] {
    return this.matchesList
      .filter(
        match =>
          match.jornada === this.jornada &&
          this._dateKey(match.fecha) === this.dateKey,
      )
      .sort((first, second) => first.hora.localeCompare(second.hora));
  }

  private _dateKey(value: string | Date): string {
    const date = value instanceof Date ? value : new Date(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private _formatDateLabel(key: string): string {
    const date = new Date(`${key}T12:00:00`);
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }

  private async _draw() {
    const canvas = this.canvas;
    if (!canvas) return;
    const size = SOCIAL_SIZES[this.platform];
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return;

    if (this.context === 'table') {
      await this._drawTable(context, size);
      return;
    }
    await this._drawMatches(context, size);
  }

  private async _drawMatches(context: CanvasRenderingContext2D, size: CanvasSize) {
    const matches = this._selectedMatches();
    this._drawBackdrop(context, size);
    this._drawHeader(
      context,
      size,
      this.template === 'results' ? 'RESULTADOS' : 'PREVIA DE JORNADA',
      `JORNADA ${this.jornada ?? ''} · ${this.dateKey ? this._formatDateLabel(this.dateKey) : ''}`,
    );

    const startY = size.height * 0.19;
    const endY = size.height * 0.89;
    const gap = size.height > 1000 ? 18 : 12;
    const cardHeight = Math.max(56, (endY - startY - gap * Math.max(0, matches.length - 1)) / Math.max(1, matches.length));

    await Promise.all(
      matches.map(async (match, index) => {
        const y = startY + index * (cardHeight + gap);
        await this._drawMatchCard(context, match, 58, y, size.width - 116, cardHeight);
      }),
    );
    this._drawFooter(context, size, 'Calendario · Resultados · Tabla · Estadísticas');
  }

  private async _drawTable(context: CanvasRenderingContext2D, size: CanvasSize) {
    this._drawBackdrop(context, size);
    this._drawHeader(context, size, 'TABLA GENERAL', 'LIGA MX · ACTUALIZACIÓN EN TIEMPO REAL');
    const isX = this.platform === 'x';
    const columns = isX ? 2 : 1;
    const entriesPerColumn = Math.ceil(this.table.length / columns);
    const top = size.height * 0.2;
    const bottom = size.height * 0.9;
    const columnGap = isX ? 22 : 0;
    const columnWidth = (size.width - 116 - columnGap * (columns - 1)) / columns;
    const rowHeight = (bottom - top) / Math.max(1, entriesPerColumn);

    for (let index = 0; index < this.table.length; index += 1) {
      const column = Math.floor(index / entriesPerColumn);
      const row = index % entriesPerColumn;
      const x = 58 + column * (columnWidth + columnGap);
      const y = top + row * rowHeight;
      await this._drawTableRow(context, this.table[index], index + 1, x, y, columnWidth, rowHeight - 5);
    }
    this._drawFooter(context, size, 'Calendario · Resultados · Tabla · Estadísticas');
  }

  private _drawBackdrop(context: CanvasRenderingContext2D, size: CanvasSize) {
    const gradient = context.createLinearGradient(0, 0, size.width, size.height);
    gradient.addColorStop(0, '#051a30');
    gradient.addColorStop(0.52, '#082d45');
    gradient.addColorStop(1, '#031321');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size.width, size.height);

    const glow = context.createRadialGradient(size.width, 0, 20, size.width, 0, size.width * 0.72);
    glow.addColorStop(0, 'rgba(20, 214, 142, 0.21)');
    glow.addColorStop(1, 'rgba(20, 214, 142, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, size.width, size.height);

    context.strokeStyle = 'rgba(148, 244, 206, 0.08)';
    context.lineWidth = 1;
    for (let x = 0; x <= size.width; x += 54) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, size.height);
      context.stroke();
    }
    for (let y = 0; y <= size.height; y += 54) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(size.width, y);
      context.stroke();
    }
  }

  private _drawHeader(context: CanvasRenderingContext2D, size: CanvasSize, title: string, subtitle: string) {
    context.fillStyle = '#6af0c2';
    context.fillRect(58, size.height * 0.075, 10, size.height * 0.078);
    context.fillStyle = '#ffffff';
    context.font = `800 ${size.height > 1000 ? 60 : 50}px system-ui, sans-serif`;
    context.fillText(title, 88, size.height * 0.116);
    context.fillStyle = '#b7cfdf';
    context.font = `700 ${size.height > 1000 ? 22 : 18}px system-ui, sans-serif`;
    context.fillText(subtitle.toLocaleUpperCase('es-MX'), 90, size.height * 0.151);
    context.textAlign = 'right';
    context.fillStyle = '#d9fff0';
    context.font = `800 ${size.height > 1000 ? 25 : 20}px system-ui, sans-serif`;
    context.fillText('LIGA MX HRLV', size.width - 58, size.height * 0.105);
    context.textAlign = 'left';
  }

  private async _drawMatchCard(context: CanvasRenderingContext2D, match: Match, x: number, y: number, width: number, height: number) {
    context.fillStyle = 'rgba(1, 15, 29, 0.72)';
    this._roundedRect(context, x, y, width, height, 18);
    context.fill();
    context.strokeStyle = 'rgba(193, 246, 226, 0.16)';
    context.lineWidth = 1;
    context.stroke();

    const logoSize = Math.min(height * 0.62, 84);
    const centerY = y + height / 2;
    const leftLogoX = x + 30;
    const rightLogoX = x + width - 30 - logoSize;
    await this._drawLogo(context, match.local, leftLogoX, centerY - logoSize / 2, logoSize);
    await this._drawLogo(context, match.visitante, rightLogoX, centerY - logoSize / 2, logoSize);

    const teamFontSize = Math.max(18, Math.min(31, height * 0.22));
    context.fillStyle = '#f9fffd';
    context.font = `700 ${teamFontSize}px system-ui, sans-serif`;
    context.textAlign = 'left';
    this._fitText(context, match.local, leftLogoX + logoSize + 16, centerY + teamFontSize * 0.35, width * 0.25, teamFontSize);
    context.textAlign = 'right';
    this._fitText(context, match.visitante, rightLogoX - 16, centerY + teamFontSize * 0.35, width * 0.25, teamFontSize);

    context.textAlign = 'center';
    const hasScore = Number.isFinite(match.golLocal) && Number.isFinite(match.golVisitante);
    const isFinal = this._isFinalMatch(match);
    const isLive = hasMatchStarted(match) && !isFinal;
    const showScore = this.template === 'results' && hasScore && (isFinal || isLive);
    const resultLabel = showScore
      ? `${match.golLocal}  —  ${match.golVisitante}`
      : 'VS';
    context.fillStyle = showScore ? '#71f4c6' : '#ffffff';
    context.font = `800 ${Math.max(25, Math.min(42, height * 0.34))}px system-ui, sans-serif`;
    context.fillText(resultLabel, x + width / 2, centerY + 5);
    context.fillStyle = '#a9c3d4';
    context.font = `700 ${Math.max(13, Math.min(18, height * 0.15))}px system-ui, sans-serif`;
    const status = this.template === 'results'
      ? isFinal
        ? 'MARCADOR FINAL'
        : isLive
          ? 'EN VIVO'
          : `PENDIENTE · ${match.hora}`
      : match.hora;
    context.fillText(status, x + width / 2, centerY + height * 0.27);
    context.textAlign = 'left';
  }

  private async _drawTableRow(context: CanvasRenderingContext2D, entry: TableEntry, position: number, x: number, y: number, width: number, height: number) {
    const statusColor = entry.clasificado ? '#18d28d' : entry.playin ? '#f4bd40' : entry.eliminado ? '#ed6a6a' : '#5bc6f0';
    context.fillStyle = 'rgba(1, 15, 29, 0.7)';
    this._roundedRect(context, x, y, width, height, Math.min(12, height / 3));
    context.fill();
    context.fillStyle = statusColor;
    context.fillRect(x, y + 8, 5, Math.max(0, height - 16));

    const fontSize = Math.max(16, Math.min(this.platform === 'x' ? 23 : 24, height * 0.47));
    const logoSize = Math.min(height * 0.7, this.platform === 'x' ? 34 : 42);
    context.fillStyle = '#d5e9f2';
    context.font = `800 ${fontSize}px system-ui, sans-serif`;
    context.fillText(String(position), x + 18, y + height / 2 + fontSize * 0.34);
    await this._drawLogo(context, entry.equipo, x + 50, y + (height - logoSize) / 2, logoSize);
    context.fillStyle = '#ffffff';
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    this._fitText(context, entry.equipo, x + 60 + logoSize, y + height / 2 + fontSize * 0.34, width * 0.47, fontSize);
    context.textAlign = 'right';
    context.fillStyle = '#aac9d8';
    context.font = `700 ${Math.max(13, fontSize * 0.66)}px system-ui, sans-serif`;
    context.fillText(`JJ ${entry.jj} · DG ${entry.dg >= 0 ? '+' : ''}${entry.dg}`, x + width - 76, y + height / 2 + fontSize * 0.25);
    context.fillStyle = '#71f4c6';
    context.font = `800 ${fontSize}px system-ui, sans-serif`;
    context.fillText(String(entry.pts), x + width - 18, y + height / 2 + fontSize * 0.34);
    context.textAlign = 'left';
  }

  private _drawFooter(context: CanvasRenderingContext2D, size: CanvasSize, text: string) {
    context.fillStyle = 'rgba(129, 235, 199, 0.78)';
    context.fillRect(58, size.height * 0.93, size.width - 116, 1);
    context.fillStyle = '#b8d1dc';
    context.font = `600 ${size.height > 1000 ? 18 : 15}px system-ui, sans-serif`;
    context.fillText(text, 58, size.height * 0.963);
    context.textAlign = 'right';
    context.fillStyle = '#6af0c2';
    context.fillText('ligamx-b16f7.web.app', size.width - 58, size.height * 0.963);
    context.textAlign = 'left';
  }

  private async _drawLogo(context: CanvasRenderingContext2D, team: string, x: number, y: number, size: number) {
    const image = await this._loadLogo(team);
    if (!image) return;
    context.drawImage(image, x, y, size, size);
  }

  private _loadLogo(team: string): Promise<HTMLImageElement | undefined> {
    const logo = LOGOS.find(entry => entry.equipo === team);
    const source = logo ? teamImageMap[logo.img] : undefined;
    if (!source) return Promise.resolve(undefined);
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(undefined);
      image.src = source;
    });
  }

  private _fitText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, maxFontSize: number) {
    let fontSize = maxFontSize;
    while (fontSize > 12) {
      context.font = `700 ${fontSize}px system-ui, sans-serif`;
      if (context.measureText(text).width <= maxWidth) break;
      fontSize -= 1;
    }
    context.fillText(text, x, y);
  }

  private _roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  private _postCopy(): string {
    const link = this._trackingUrl();
    const directLink = this.platform === 'x'
      ? `\n\n${link}`
      : '\n\n🔗 Consulta el enlace de la bio.';
    const jornada = this.context === 'table'
      ? this._latestPlayedJornada()
      : this.jornada;

    if (this.context === 'table') {
      return `📊 Así queda la tabla general${jornada ? ` después de la Jornada ${jornada}` : ''}.\n\nConsulta posiciones, resultados y próximos partidos en Liga MX HRLV.${directLink}\n\n#LigaMX #TablaGeneral`;
    }

    const day = this.dateKey ? this._formatDateLabel(this.dateKey) : 'la jornada';
    if (this.template === 'results') {
      const matches = this._selectedMatches();
      const hasLiveMatch = matches.some(
        match => hasMatchStarted(match) && !this._isFinalMatch(match),
      );
      const hasPendingMatch = matches.some(
        match => !this._isFinalMatch(match) && !hasMatchStarted(match),
      );
      const headline = hasLiveMatch
        ? `⚽ Partidos en vivo y resultados del ${day} de la Jornada ${this.jornada}.`
        : hasPendingMatch
          ? `⚽ Resultados y partidos pendientes del ${day} de la Jornada ${this.jornada}.`
          : `⚽ Resultados del ${day} de la Jornada ${this.jornada}.`;
      return `${headline}\n\nRevisa los marcadores y todos los partidos de la jornada en Liga MX HRLV.${directLink}\n\n#LigaMX #Resultados`;
    }
    return `⚽ Previa del ${day} de la Jornada ${this.jornada}.\n\nConsulta horarios, partidos y la tabla general en Liga MX HRLV.${directLink}\n\n#LigaMX #Calendario`;
  }

  private _trackingUrl(): string {
    const source = this.platform === 'x' ? 'x' : 'instagram';
    const jornada = this.context === 'table'
      ? this._latestPlayedJornada()
      : this.jornada;
    const campaign = jornada ? `jornada_${jornada}` : 'liga_mx';
    const content = this.context === 'table'
      ? `tabla_general_jornada_${jornada ?? 'actual'}`
      : `${this.template}_${this.dateKey ?? 'jornada'}`;
    const url = new URL('https://ligamx-b16f7.web.app/');
    url.searchParams.set('tab', this.context === 'table' ? 'Tabla General' : 'Calendario');
    if (this.context !== 'table' && this.jornada) {
      url.searchParams.set('filterJornada', String(this.jornada));
    }
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', campaign);
    url.searchParams.set('utm_content', content);
    return url.toString();
  }

  private _latestPlayedJornada(): number | undefined {
    const playedJornadas = this.matchesList
      .filter(
        match =>
          hasMatchStarted(match) ||
          (match.golLocal != null && match.golVisitante != null),
      )
      .map(match => match.jornada);
    return playedJornadas.length > 0
      ? Math.max(...playedJornadas)
      : undefined;
  }

  private _isFinalMatch(match: Match): boolean {
    return hasMatchEnded(match) ||
      (!hasMatchStarted(match) &&
        match.golLocal != null &&
        match.golVisitante != null);
  }

  private async _copyText() {
    const text = this._postCopy();
    try {
      await navigator.clipboard.writeText(text);
      this.copyStatus = 'Texto copiado. Ya puedes pegarlo en la publicación.';
    } catch {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.append(helper);
      helper.select();
      const copied = document.execCommand('copy');
      helper.remove();
      this.copyStatus = copied
        ? 'Texto copiado. Ya puedes pegarlo en la publicación.'
        : 'No se pudo copiar automáticamente; selecciona el texto y cópialo.';
    }
  }

  private async _copyTrackingLink() {
    try {
      await navigator.clipboard.writeText(this._trackingUrl());
      this.copyStatus = 'Enlace copiado. Úsalo en X, bio de Instagram o una story.';
    } catch {
      this.copyStatus = 'No se pudo copiar automáticamente; selecciona el enlace y cópialo.';
    }
  }

  private _download() {
    const canvas = this.canvas;
    if (!canvas) return;
    const label = this.context === 'table'
      ? 'tabla-general'
      : `${this.template === 'results' ? 'resultados' : 'previa'}-jornada-${this.jornada}-${this.dateKey}`;
    canvas.toBlob(blob => {
      if (!blob) return;
      const anchor = document.createElement('a');
      const url = URL.createObjectURL(blob);
      anchor.href = url;
      anchor.download = `liga-mx-hrlv-${label}-${this.platform}.png`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }, 'image/png');
  }
}
