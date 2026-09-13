/** Estados editoriales que no pueden inferirse de la cronología del partido. */
export type MatchPublicationStatus = 'postponed' | 'cancelled';

export interface Match {
  /** Clave persistente de Realtime Database; nunca es el índice de un arreglo. */
  idMatch: number;
  estadio: string;
  fecha: string | Date;
  hora: string;
  jornada: number;
  local: string;
  visitante: string;
  golLocal: number;
  golVisitante: number;
  penaltyLocal?: number | null;
  penaltyVisitante?: number | null;
  /** Sobrescribe el estado derivado para partidos que no se jugarán como estaban programados. */
  status?: MatchPublicationStatus;
  /** Minuto informado por el administrador durante un partido en vivo. */
  liveMinute?: number | null;
  lineupLocal: PlayerGame[];
  lineupVisitor: PlayerGame[];
  events: MatchEvent[];
}

export interface PlayerGame {
  number: number;
  titular?: boolean;
  entroDeCambio?: boolean;
  salioDeCambio?: boolean;
}

export interface TableEntry {
  equipo: string;
  jj: number;
  jg: number;
  je: number;
  jp: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  clasificado?: boolean;
  eliminado?: boolean;
  playin?: boolean;
}

export interface Player {
  /** Identidad estable del futbolista, independiente de dorsal o equipo. */
  id?: string;
  birthDate: string | Date;
  fullName: string;
  /** Conserva los datos y estadísticas previos a un traslado. */
  historical?: boolean;
  imgSrc: string;
  name: string;
  nationality: string;
  number: number;
  position: string;
}

export type PlayerTeam = Map<string, Player[]>;

/**
 * Partidos de fase regular que un jugador no disputó por una convocatoria a
 * selección nacional. Las llaves externas usan la misma llave de equipo que
 * `/players` y las internas el número de jersey del jugador.
 */
export type U23NationalTeamCallups = Map<string, Record<string, number>>;

export type CardType = 'yellow' | 'red';
export type TeamSide = 'local' | 'visitor';
export type TeamSideOptional = TeamSide | '';

export type MatchEventType = 'goal' | 'card' | 'substitution' | 'phase';
export type MatchPeriod = '1T' | '2T' | '1TE' | '2TE' | 'PEN';

export interface BaseMatchEvent {
  id: string;
  type: MatchEventType;
  team: TeamSideOptional;
  minute: number;
  addedTime?: number;
  period: MatchPeriod;
  sequence: number;
}

export interface GoalMatchEvent extends BaseMatchEvent {
  type: 'goal';
  player: number;
  ownGoal?: boolean;
  goalType?: GoalType;
  assist?: number | null;
}

export interface SubstitutionMatchEvent extends BaseMatchEvent {
  type: 'substitution';
  playerIn: number;
  playerOut: number;
}

export interface CardMatchEvent extends BaseMatchEvent {
  type: 'card';
  player: number;
  cardType: CardType;
  foulType?: FoulType;
}
export interface PhaseMatchEvent extends BaseMatchEvent {
  minute: number;
  phase: 'start' | 'halftime' | 'secondHalf' | 'fulltime';
}

export type MatchEvent =
  GoalMatchEvent | SubstitutionMatchEvent | CardMatchEvent | PhaseMatchEvent;

export type FirebaseUpdates = Record<string, unknown>;

export type AdminWriteState = 'idle' | 'saving' | 'conflict' | 'error';

export interface AdminWriteRequest {
  updates: FirebaseUpdates;
  expectedRevisions: Record<string, number>;
}

export interface AdminWriteSuccess {
  ok: true;
  revisions: Record<string, number>;
}

export interface AdminWriteConflict {
  ok: false;
  code: 'conflict';
  revisions: Record<string, number>;
  current: Record<string, unknown>;
}

export interface AdminWriteFailure {
  ok: false;
  code: 'error';
  message: string;
}

export type AdminWriteResult =
  | AdminWriteSuccess
  | AdminWriteConflict
  | AdminWriteFailure;

export type GoalType =
  'penal' | 'area' | 'fueraArea' | 'tiroLibre' | 'cabeza' | 'otro';

export type FoulType =
  | 'conductaAntideportiva'
  | 'protesta'
  | 'reiteracion'
  | 'retrasoReanudacion'
  | 'distancia'
  | 'ingresoSinPermiso'
  | 'antideportivaCuerpoTecnico'
  | 'juegoBruscoGrave'
  | 'conductaViolenta'
  | 'escupir'
  | 'dogso'
  | 'lenguajeOfensivo'
  | 'dobleAmarilla';
