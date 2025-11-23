export interface Match {
  editMatch: boolean;
  idMatch: number;
  estadio: string;
  fecha: string | Date;
  hora: string;
  jornada: number;
  local: string;
  visitante: string;
  golLocal: number;
  golVisitante: number;
  lineupLocal?: string[];
  lineupVisitor?: string[];
  goals?: Goal[];
  substitutions?: Substitution[];
  cards?: Card[];
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
    number: string;
    position: string;
}

export type PlayerTeam = Map<string, Player[]>;

export interface Goal {
    minute: number;
    player: string;
    team: 'local' | 'visitor';
    ownGoal?: boolean;
}

export interface Substitution {
    minute: number;
    playerIn: string;
    playerOut: string;
    team: 'local' | 'visitor';
}

export interface Card {
    minute: number;
    player: string;
    cardType: 'yellow' | 'red';
    team: 'local' | 'visitor';
}