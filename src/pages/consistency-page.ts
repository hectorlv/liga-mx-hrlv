import '@material/web/icon/icon.js';
import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from '../styles/liga-mx-hrlv-styles.js';
import { Match, PlayerTeam } from '../types/index.js';
import {
  analyzeConsistency,
  ConsistencyIssue,
  ConsistencyIssueKind,
} from '../utils/consistencyChecker.js';
import { EDITORIAL_TOURNAMENT } from '../utils/tournamentRules.js';

const ISSUE_META: Record<ConsistencyIssueKind, { icon: string; label: string }> = {
  'invalid-schedule': { icon: 'event_busy', label: 'Calendario' },
  'too-many-starters': { icon: 'groups', label: 'Alineación' },
  'duplicate-jersey': { icon: 'confirmation_number', label: 'Plantilla' },
  'score-event-mismatch': { icon: 'scoreboard', label: 'Marcador' },
  'incomplete-playoff': { icon: 'account_tree', label: 'Liguilla' },
};

@customElement('consistency-page')
export class ConsistencyPage extends LitElement {
  static override readonly styles = [
    styles,
    css`
      :host { display: block; max-width: 980px; margin: 0 auto; padding: 24px 16px 48px; }
      .eyebrow { margin: 0 0 8px; color: var(--md-sys-color-primary); font-size: .75rem; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 0; color: var(--md-sys-color-on-surface); font-size: clamp(1.8rem, 4vw, 2.6rem); letter-spacing: -.04em; }
      .intro { max-width: 660px; color: #475569; line-height: 1.6; }
      .rule-note { display: grid; grid-template-columns: auto 1fr; gap: 12px; margin: 24px 0; padding: 16px; border-left: 4px solid var(--md-sys-color-primary); border-radius: 0 12px 12px 0; background: var(--md-sys-color-surface-container); color: #334155; }
      .rule-note md-icon { color: var(--md-sys-color-primary); }
      .summary { display: flex; align-items: baseline; gap: 12px; margin: 28px 0 14px; }
      .summary strong { color: var(--md-sys-color-primary); font-size: 2rem; letter-spacing: -.06em; }
      .summary span { color: #475569; font-weight: 700; }
      .issues { display: grid; gap: 10px; }
      .issue { display: grid; grid-template-columns: 42px 1fr auto; align-items: center; gap: 14px; padding: 16px; border: 1px solid var(--md-sys-color-outline-variant); border-radius: 14px; background: var(--md-sys-color-surface); color: inherit; text-decoration: none; }
      .issue:hover, .issue:focus-visible { border-color: var(--md-sys-color-primary); background: var(--md-sys-color-primary-container); outline: none; }
      .issue-icon { display: grid; width: 42px; height: 42px; place-items: center; border-radius: 50%; background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); }
      .issue h2 { margin: 0; color: var(--md-sys-color-on-surface); font-size: 1rem; }
      .issue p { margin: 4px 0 0; color: #475569; font-size: .9rem; line-height: 1.45; }
      .issue-tag { color: #475569; font-size: .72rem; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
      .clear { padding: 40px 20px; border: 1px dashed var(--md-sys-color-outline); border-radius: 16px; text-align: center; background: var(--md-sys-color-surface); }
      .clear md-icon { color: var(--md-sys-color-primary); font-size: 40px; width: 40px; height: 40px; }
      .clear h2 { margin: 10px 0 4px; }
      .clear p { margin: 0; color: #475569; }
      @media (max-width: 560px) { .issue { grid-template-columns: 42px 1fr; } .issue-tag { grid-column: 2; } }
    `,
  ];

  @property({ type: Array }) matchesList: Match[] = [];
  @property({ attribute: false }) players: PlayerTeam = new Map();

  override render() {
    const issues = analyzeConsistency(this.matchesList, this.players);
    return html`
      <main>
        <p class="eyebrow">Administración · Solo lectura</p>
        <h1>Centro de consistencia</h1>
        <p class="intro">Revisa los datos antes de que lleguen al calendario, la tabla o Redes. Este diagnóstico nunca cambia información automáticamente.</p>
        <aside class="rule-note" role="note">
          <md-icon aria-hidden="true">verified_user</md-icon>
          <span><strong>${EDITORIAL_TOURNAMENT.label}.</strong> ${EDITORIAL_TOURNAMENT.regularSeason.jornadas} jornadas, ${EDITORIAL_TOURNAMENT.postseason.directQualificationSpots} plazas directas y sin Play-in. Reglas editoriales, no certificación externa.</span>
        </aside>
        <div class="summary" aria-live="polite"><strong>${issues.length}</strong><span>${issues.length === 1 ? 'hallazgo para revisar' : 'hallazgos para revisar'}</span></div>
        ${issues.length ? html`<section class="issues" aria-label="Hallazgos de consistencia">${issues.map(issue => this._renderIssue(issue))}</section>` : html`
          <section class="clear" aria-label="Sin hallazgos">
            <md-icon aria-hidden="true">task_alt</md-icon>
            <h2>Sin inconsistencias detectadas</h2>
            <p>Los controles editoriales revisados están alineados.</p>
          </section>`}
      </main>
    `;
  }

  private _renderIssue(issue: ConsistencyIssue) {
    const meta = ISSUE_META[issue.kind];
    return html`<a class="issue" href=${issue.href} aria-label="Revisar: ${issue.title}. ${issue.detail}">
      <span class="issue-icon"><md-icon aria-hidden="true">${meta.icon}</md-icon></span>
      <span><h2>${issue.title}</h2><p>${issue.detail}</p></span>
      <span class="issue-tag">${meta.label} · Revisar</span>
    </a>`;
  }
}
