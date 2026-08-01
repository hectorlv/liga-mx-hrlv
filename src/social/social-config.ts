import favicon from '../assets/images/favicon.png';

export type TemplateId =
  | 'round-preview'
  | 'day-preview'
  | 'day-results'
  | 'standings'
  | 'round-results';

export type StandingsRange = 'all' | 'top' | 'bottom';
export type DailyMatchesVariant =
  'one-match' | 'two-matches' | 'three-matches' | 'four-matches';
export type JourneyResultsVariant =
  'single-image' | 'carousel-cover' | 'carousel-day' | 'carousel-standings';

export interface SocialPresentationOptions {
  showDomain: boolean;
  showHandle: boolean;
  showGrid: boolean;
  showUpdatedAt: boolean;
  standingsRange: StandingsRange;
}

export interface SocialConfig {
  brandName: string;
  siteUrl: string;
  locale: string;
  timezone: string;
  width: number;
  height: number;
  safeInset: number;
  logoPath: string;
  socialHandle: string;
  theme: 'HRLV';
}

export const SOCIAL_CONFIG: SocialConfig = {
  brandName: 'Liga MX HRLV',
  siteUrl: 'https://ligamx-b16f7.web.app/',
  locale: 'es-MX',
  timezone: 'America/Mexico_City',
  width: 1080,
  height: 1350,
  safeInset: 58,
  logoPath: favicon,
  socialHandle: '@LigaMX_HRLV',
  theme: 'HRLV',
};

export const DEFAULT_SOCIAL_PRESENTATION: SocialPresentationOptions = {
  showDomain: true,
  showHandle: true,
  showGrid: true,
  showUpdatedAt: true,
  standingsRange: 'all',
};

export const SOCIAL_COLORS = {
  background: '#0f172a',
  backgroundStrong: '#0b1120',
  surface: '#1e293b',
  surfaceStrong: '#334155',
  primary: '#4ade80',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: 'rgba(203, 213, 225, 0.22)',
  warning: '#ffb300',
  danger: '#c62828',
  info: '#61c6f2',
} as const;
