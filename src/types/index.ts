export interface Match {
  idMatch: number;
  estadio: string;
  fecha: string | Date;
  hora: string;
  jornada: number;
  local: string;
  visitante: string;
  golLocal: number;
  golVisitante: number;
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
  eliminado?: boolean;
}

export interface Player {
  birthDate: string | Date;
  fullName: string;
  imgSrc: string;
  name: string;
  nationality: string;
  number: number;
  position: string;
}

export type PlayerTeam = Map<string, Player[]>;

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

export type MatchEvent = GoalMatchEvent | SubstitutionMatchEvent | CardMatchEvent | PhaseMatchEvent;


export type FirebaseUpdates = Record<string, unknown>;

export type GoalType =
  | 'penal'
  | 'area'
  | 'fueraArea'
  | 'tiroLibre'
  | 'cabeza'
  | 'otro';

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
