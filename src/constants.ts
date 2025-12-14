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

export const FOUL_TYPES_BY_CARD: Record<
  'yellow' | 'red',
  { value: FoulType; label: string }[]
> = {
  yellow: [
    { value: 'conductaAntideportiva', label: 'Conducta antideportiva' },
    { value: 'protesta', label: 'Protestar decisiones del árbitro' },
    { value: 'reiteracion', label: 'Infringir reiteradamente las reglas' },
    { value: 'retrasoReanudacion', label: 'Retrasar la reanudación del juego' },
    { value: 'distancia', label: 'No respetar la distancia reglamentaria' },
    {
      value: 'ingresoSinPermiso',
      label: 'Entrar/reingresar/salir del campo sin permiso',
    },
    {
      value: 'antideportivaCuerpoTecnico',
      label: 'Conducta antideportiva del cuerpo técnico',
    },
  ],
  red: [
    { value: 'juegoBruscoGrave', label: 'Juego brusco grave' },
    { value: 'conductaViolenta', label: 'Conducta violenta' },
    { value: 'escupir', label: 'Escupir' },
    {
      value: 'dogso',
      label: 'Impedir una oportunidad manifiesta de gol (DOGSO)',
    },
    {
      value: 'lenguajeOfensivo',
      label: 'Lenguaje o gestos ofensivos/insultantes/humillantes',
    },
    { value: 'dobleAmarilla', label: 'Doble amarilla' },
  ],
};

export const FOUL_TYPE_LABELS: Record<FoulType, string> = Object.values(
  FOUL_TYPES_BY_CARD,
).flat().reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<FoulType, string>,
);
