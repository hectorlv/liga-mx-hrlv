import type { SocialPresentationOptions, TemplateId } from './social-config.js';
import type { SocialCopyTone, SocialPlatform } from './social-utils.js';

export const SOCIAL_SESSION_KEY = 'liga-mx-hrlv:social:v1';

export interface SocialSession {
  template: TemplateId;
  platform: SocialPlatform;
  jornada?: number;
  dateSelection?: string;
  matchId?: number;
  presentation: SocialPresentationOptions;
  copyTone: SocialCopyTone;
  copyDraft?: string;
}

export function readSocialSession(): Partial<SocialSession> {
  try {
    const raw = JSON.parse(
      sessionStorage.getItem(SOCIAL_SESSION_KEY) || 'null',
    );
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const result: Partial<SocialSession> = {};
    if (
      [
        'round-preview',
        'day-preview',
        'day-results',
        'standings',
        'round-results',
        'match-summary',
        'match-preview',
      ].includes(raw.template)
    )
      result.template = raw.template;
    if (['instagram', 'x'].includes(raw.platform))
      result.platform = raw.platform;
    if (
      ['informative', 'rhythm', 'data', 'conversation'].includes(raw.copyTone)
    )
      result.copyTone = raw.copyTone;
    if (Number.isInteger(raw.jornada) && raw.jornada > 0)
      result.jornada = raw.jornada;
    if (Number.isInteger(raw.matchId) && raw.matchId >= 0)
      result.matchId = raw.matchId;
    if (
      typeof raw.dateSelection === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(raw.dateSelection)
    )
      result.dateSelection = raw.dateSelection;
    if (typeof raw.copyDraft === 'string') result.copyDraft = raw.copyDraft;
    const presentation = raw.presentation;
    if (presentation && typeof presentation === 'object') {
      result.presentation = {
        showDomain:
          typeof presentation.showDomain === 'boolean'
            ? presentation.showDomain
            : true,
        showHandle:
          typeof presentation.showHandle === 'boolean'
            ? presentation.showHandle
            : true,
        showGrid:
          typeof presentation.showGrid === 'boolean'
            ? presentation.showGrid
            : true,
        standingsRange: ['all', 'top', 'bottom'].includes(
          presentation.standingsRange,
        )
          ? presentation.standingsRange
          : 'all',
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function writeSocialSession(session: SocialSession): void {
  try {
    sessionStorage.setItem(SOCIAL_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Algunos navegadores o sesiones privadas no permiten almacenamiento.
  }
}
