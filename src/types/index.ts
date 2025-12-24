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
  goals: Goal[];
  substitutions: Substitution[];
  cards: Card[];
  phaseEvents?: PhaseEvent[];
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
    imgSrc: string;
    name: string;
    number: number;
    position: string;
}

export type PlayerTeam = Map<string, Player[]>;

export interface Goal {
    minute: number;
    player: number;
    team: 'local' | 'visitor';
    ownGoal?: boolean;
    goalType?: GoalType;
    assist?: number | null;
}

export interface Substitution {
    minute: number;
    playerIn: number;
    playerOut: number;
    team: 'local' | 'visitor';
}

export interface Card {
    minute: number;
    player: number;
    cardType: 'yellow' | 'red';
    team: 'local' | 'visitor';
    foulType?: FoulType;
}

export interface PhaseEvent {
  minute: number;
  phase: 'start' | 'halftime' | 'secondHalf' | 'fulltime';
}

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

export type TimelineItem =
  | { kind: 'goal'; minute: number; team: 'local' | 'visitor'; goal: Goal }
  | { kind: 'card'; minute: number; team: 'local' | 'visitor'; card: Card }
  | { kind: 'sub'; minute: number; team: 'local' | 'visitor'; sub: Substitution }
  | { kind: 'phase'; minute: number; phase: 'start' | 'halftime' | 'secondHalf' | 'fulltime' };
