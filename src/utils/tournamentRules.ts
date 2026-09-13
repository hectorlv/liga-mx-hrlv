/**
 * Reglamento editorial congelado para la temporada activa.
 * No certifica ni sustituye un reglamento oficial externo.
 */
export const EDITORIAL_TOURNAMENT = {
  id: 'liga-mx-hrlv-editorial-2026',
  label: 'Torneo editorial vigente',
  regularSeason: { jornadas: 17 },
  postseason: {
    directQualificationSpots: 8,
    playInSpots: 0,
    jornadas: [
      { id: 20, descripcion: 'Cuartos de final' },
      { id: 21, descripcion: 'Semifinal' },
      { id: 22, descripcion: 'Final' },
    ],
  },
  youth: { minimumBirthYear: 2004 },
  tableTiebreakers: ['Puntos', 'Diferencia de goles', 'Goles a favor'],
} as const;

export const POSTSEASON_FORMAT = EDITORIAL_TOURNAMENT.postseason;
export const REGULAR_SEASON_LAST_JORNADA =
  EDITORIAL_TOURNAMENT.regularSeason.jornadas;
export const U23_MIN_BIRTH_YEAR = EDITORIAL_TOURNAMENT.youth.minimumBirthYear;
export const JORNADA_LIGUILLA = EDITORIAL_TOURNAMENT.postseason.jornadas;
