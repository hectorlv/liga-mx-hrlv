import { FoulType, GoalType } from './types';

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'penal', label: 'Penal' },
  { value: 'area', label: 'Dentro del área' },
  { value: 'fueraArea', label: 'Fuera del área' },
  { value: 'tiroLibre', label: 'Tiro libre' },
  { value: 'cabeza', label: 'Cabeza' },
  { value: 'otro', label: 'Otro' },
];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = GOAL_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<GoalType, string>,
);

export const FOUL_TYPES: { value: FoulType; label: string }[] = [
  { value: 'mano', label: 'Mano' },
  { value: 'entrada', label: 'Entrada fuerte' },
  { value: 'empujon', label: 'Empujón' },
  { value: 'táctica', label: 'Falta táctica' },
  { value: 'protesta', label: 'Protesta' },
  { value: 'tiempo', label: 'Pérdida de tiempo' },
  { value: 'otro', label: 'Otra' },
];

export const FOUL_TYPE_LABELS: Record<FoulType, string> = FOUL_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<FoulType, string>,
);
