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


export type Stadium = string;
export type Team = string;

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
}

export type FirebaseUpdates = Record<string, unknown>;