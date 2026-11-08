import type { Match, Player } from '../src/types/index.js';
import { normalizeMatches } from '../src/utils/matchData.js';
import { resolveMatchStatus } from '../src/utils/matchStatus.js';
import { getTeamPlayerAppearances } from '../src/utils/playerAppearances.js';
import {
  getPlayoffSeriesMatches,
  getPlayoffSeriesResult,
} from '../src/utils/functionUtils.js';
import { LIGUILLA } from '../src/utils/constants.js';
import {
  POSTSEASON_FORMAT,
  REGULAR_SEASON_LAST_JORNADA,
} from '../src/utils/tournamentRules.js';
import {
  PublicDataError,
  publicMatch,
  publicMetadata,
  score,
} from './public-data-common.js';
import {
  canonicalTeam,
  chronological,
  folded,
  phaseMatches,
  publicPlayer,
  rosterFor,
  statistics,
  values,
} from './extended-data.js';
import type { RawPlayers, TeamPhase } from './extended-data.js';
import { publicTable } from './table-data.js';

export type RankingMetric =
  | 'goleadores'
  | 'asistencias'
  | 'amarillas'
  | 'rojas'
  | 'participaciones'
  | 'minutos'
  | 'ofensivas'
  | 'defensivas'
  | 'porterias_cero'
  | 'puntos_local'
  | 'puntos_visitante';
export type TournamentQuery =
  | {
      tipo: 'estadisticas';
      metrica?: RankingMetric;
      fase?: TeamPhase;
      equipo?: string;
      limite?: number;
    }
  | {
      tipo: 'jugador';
      equipo: string;
      jugador?: string;
      dorsal?: number;
      idJugador?: string;
      fase?: TeamPhase;
    }
  | { tipo: 'liguilla' };

const CRITERION =
  'Solo partidos finalizados con marcador completo; cifras individuales según eventos y alineaciones registrados. No se cuentan goles ni asistencias de tandas de penales. Los autogoles no se suman al goleador ni al asistidor.';
const MINUTES_CRITERION =
  'Misma convención de la app: participaciones registradas y minutos por cambios o expulsión, con base de 90 minutos; sin tiempo añadido ni prórroga. Si falta el minuto del cambio se usa la estimación de la app (entrada 0, salida 90).';
const emptyCounters = () => ({
  goles: 0,
  autogoles: 0,
  asistencias: 0,
  amarillas: 0,
  rojas: 0,
  rojasDirectas: 0,
  rojasDobleAmarilla: 0,
  participaciones: 0,
  titularidades: 0,
  minutos: 0,
});

function playerIdentity(team: string, number: number, rawPlayers: RawPlayers) {
  const candidates = (rosterFor(team, rawPlayers) || []).filter(
    player => player.number === number,
  );
  const resolved =
    candidates.length === 1 &&
    Boolean(candidates[0].name?.trim() || candidates[0].fullName?.trim());
  return {
    equipo: team,
    number,
    id: resolved ? (candidates[0].id ?? null) : null,
    name: resolved ? candidates[0].name || null : null,
    fullName: resolved ? candidates[0].fullName || null : null,
    identidad: resolved
      ? 'resuelta'
      : candidates.length > 1
        ? 'ambigua'
        : 'sin_registro',
  };
}

/** Reuses the app's participation/minute calculation; goal ownership matches match detail. */
function collectPlayers(
  matches: Match[],
  teams: string[],
  rawPlayers: RawPlayers,
) {
  const rows = new Map<
    string,
    {
      jugador: ReturnType<typeof playerIdentity>;
      estadisticas: ReturnType<typeof emptyCounters>;
    }
  >();
  const ensure = (team: string, number: number) => {
    const key = JSON.stringify([team, number]);
    if (!rows.has(key))
      rows.set(key, {
        jugador: playerIdentity(team, number, rawPlayers),
        estadisticas: emptyCounters(),
      });
    return rows.get(key)!;
  };
  const warnings = new Set<string>();
  for (const team of teams) {
    if (!rosterFor(team, rawPlayers))
      warnings.add(
        `${team}: plantilla no registrada; las identidades faltantes se conservan por dorsal.`,
      );
    for (const [number, appearances] of getTeamPlayerAppearances(
      matches,
      team,
    )) {
      const stat = ensure(team, number).estadisticas;
      stat.participaciones = appearances.length;
      stat.titularidades = appearances.filter(
        row => row.starter === true,
      ).length;
      stat.minutos = appearances.reduce((total, row) => total + row.minutes, 0);
    }
  }
  for (const match of matches) {
    for (const [side, lineup] of [
      ['local', match.lineupLocal],
      ['visitor', match.lineupVisitor],
    ] as const) {
      if (lineup.filter(player => player.titular === true).length !== 11)
        warnings.add(
          `Partido ${match.idMatch}: alineación ${side} sin once titulares registrados; las participaciones y minutos pueden estar incompletos.`,
        );
    }
    const goals = match.events.filter(
      event => event.type === 'goal' && event.period !== 'PEN',
    );
    if (
      goals.filter(event => event.team === 'local').length !== match.golLocal ||
      goals.filter(event => event.team === 'visitor').length !==
        match.golVisitante
    )
      warnings.add(
        `Partido ${match.idMatch}: eventos de gol y marcador no coinciden; las cifras individuales reflejan solo eventos registrados.`,
      );
    for (const event of match.events) {
      if (event.type !== 'goal' && event.type !== 'card') continue;
      if (event.team !== 'local' && event.team !== 'visitor') {
        warnings.add(
          `Partido ${match.idMatch}, evento ${event.id}: equipo ausente; no se atribuye al jugador.`,
        );
        continue;
      }
      const credited = event.team === 'local' ? match.local : match.visitante;
      const opponent = event.team === 'local' ? match.visitante : match.local;
      if (event.type === 'goal') {
        if (event.period === 'PEN') continue;
        if (event.ownGoal)
          ensure(opponent, event.player).estadisticas.autogoles++;
        else {
          ensure(credited, event.player).estadisticas.goles++;
          if (event.assist != null)
            ensure(credited, event.assist).estadisticas.asistencias++;
        }
      } else {
        const stat = ensure(credited, event.player).estadisticas;
        if (event.cardType === 'yellow') stat.amarillas++;
        else {
          stat.rojas++;
          if (event.foulType === 'dobleAmarilla') stat.rojasDobleAmarilla++;
          else stat.rojasDirectas++;
        }
      }
    }
  }
  if ([...rows.values()].some(row => row.jugador.identidad !== 'resuelta'))
    warnings.add(
      'Hay identidades ausentes o ambiguas: los totales de esos dorsales no se atribuyen a un nombre. No se combinan estadísticas entre clubes ni dorsales.',
    );
  return { rows: [...rows.values()], advertencias: [...warnings] };
}

function selectPlayer(
  query: Extract<TournamentQuery, { tipo: 'jugador' }>,
  team: string,
  rawPlayers: RawPlayers,
): Player {
  const roster = rosterFor(team, rawPlayers);
  if (roster === null)
    throw new PublicDataError(
      503,
      'data_unavailable',
      'La plantilla del equipo no está registrada.',
    );
  const selected = roster.filter(player =>
    query.idJugador !== undefined
      ? player.id === query.idJugador
      : query.dorsal !== undefined
        ? player.number === query.dorsal
        : [player.name, player.fullName].some(
            name =>
              typeof name === 'string' &&
              folded(name) === folded(query.jugador!),
          ),
  );
  const label = (player: Player) =>
    `${player.name || player.fullName || 'Sin nombre'} · dorsal ${player.number}${player.historical ? ' · histórico' : ''}${player.id ? ` · ID ${player.id}` : ''}`;
  if (selected.length > 1)
    throw new PublicDataError(
      400,
      'ambiguous_player',
      'El selector coincide con varios jugadores; precisa nombre o ID.',
      selected.map(label),
    );
  if (!selected.length)
    throw new PublicDataError(
      404,
      'player_not_found',
      'No se encontró el jugador en el equipo. Usa nombre exacto, dorsal o ID.',
      roster.map(label),
    );
  return selected[0];
}

function createLiguilla(
  matches: Match[],
  rawTeams: Record<string, string> | string[] | null,
) {
  const table = publicTable(rawTeams, matches);
  const teams = values(rawTeams);
  const regular = matches.filter(
    match =>
      match.jornada >= 1 &&
      match.jornada <= REGULAR_SEASON_LAST_JORNADA &&
      match.status !== 'cancelled',
  );
  const finalScore = (match: Match | null) =>
    !!match &&
    resolveMatchStatus(match) === 'finished' &&
    score(match.golLocal) !== null &&
    score(match.golVisitante) !== null;
  const complete =
    regular.length > 0 &&
    regular.every(finalScore) &&
    teams.every(
      team =>
        regular.filter(
          match => match.local === team || match.visitante === team,
        ).length >= REGULAR_SEASON_LAST_JORNADA,
    );
  const rounds = [
    {
      fase: 'cuartos',
      jornada: 20,
      llaves: [
        ['quarter1', LIGUILLA.quarter1],
        ['quarter2', LIGUILLA.quarter2],
        ['quarter3', LIGUILLA.quarter3],
        ['quarter4', LIGUILLA.quarter4],
      ] as const,
    },
    {
      fase: 'semifinal',
      jornada: 21,
      llaves: [
        ['semi1', LIGUILLA.semi1],
        ['semi2', LIGUILLA.semi2],
      ] as const,
    },
    {
      fase: 'final',
      jornada: 22,
      llaves: [['final', LIGUILLA.final]] as const,
    },
  ];
  const warnings = new Set<string>();
  if (!complete)
    warnings.add(
      'La fase regular no está completa: los cruces registrados son provisionales; no implican clasificación confirmada.',
    );
  const result = rounds.map(round => ({
    fase: round.fase,
    jornada: round.jornada,
    llaves: round.llaves.map(([id, config]) => {
      const { ida, vuelta } = getPlayoffSeriesMatches(config, matches);
      const source = getPlayoffSeriesResult(config, matches, table.posiciones);
      const finished = finalScore(ida) && finalScore(vuelta);
      const validTeams =
        [ida?.local, ida?.visitante, vuelta?.local, vuelta?.visitante].every(
          team => !!team && teams.includes(team),
        ) &&
        ida?.local !== ida?.visitante &&
        vuelta?.local !== vuelta?.visitante;
      const tied = source
        ? new Set(Object.values(source.aggregate)).size === 1
        : false;
      const rankNeeded = round.fase !== 'final' && tied;
      const rankConfirmed = !rankNeeded || (complete && !table.provisional);
      const winner =
        finished && validTeams && rankConfirmed
          ? (source?.winner ?? null)
          : null;
      if (!ida || !vuelta)
        warnings.add(`${id}: falta al menos un partido de la serie.`);
      if (ida && vuelta && !validTeams)
        warnings.add(
          `${id}: equipos ausentes o no válidos; no se confirma ganador.`,
        );
      if (finished && !source)
        warnings.add(
          `${id}: participantes de ida y vuelta inconsistentes; no se confirma ganador.`,
        );
      if (finished && source && !rankConfirmed)
        warnings.add(
          `${id}: empate global con orden de tabla todavía provisional; ganador pendiente.`,
        );
      return {
        id,
        ida: ida ? publicMatch(ida) : null,
        vuelta: vuelta ? publicMatch(vuelta) : null,
        global: source?.aggregate ?? null,
        globalProvisional: !finished,
        estado: winner
          ? 'definida'
          : finished && source?.requiresExtraTimeOrPenalties
            ? 'pendiente_desempate'
            : ida && resolveMatchStatus(ida) === 'finished'
              ? 'en_disputa'
              : 'pendiente',
        ganador: winner,
        criterioGanador: !winner
          ? null
          : !tied
            ? 'global'
            : round.fase === 'final'
              ? 'penales'
              : 'posicion_tabla',
        penales: source?.penaltyScore ?? null,
        requiereTiempoExtraOPenales:
          finished && source?.requiresExtraTimeOrPenalties === true && !winner,
      };
    }),
  }));
  const final = result.find(round => round.fase === 'final')!.llaves[0];
  return {
    tipo: 'liguilla' as const,
    formato: POSTSEASON_FORMAT,
    crucesProvisionales: !complete,
    criterio:
      'Llaves registradas y cálculo de global/desempate de la app: mejor posición en tabla en cuartos y semifinales; penales separados en la final empatada. Solo se confirma ganador con ambos partidos finalizados y coherentes.',
    clasificacion: table,
    rondas: result,
    campeon: final.ganador,
    advertencias: [...warnings],
  };
}

export function createTournamentData(
  query: TournamentQuery,
  rawMatches: Record<string, Match> | Match[] | null,
  rawTeams: Record<string, string> | string[] | null,
  rawPlayers: RawPlayers,
  now = new Date(),
) {
  const matches = normalizeMatches(rawMatches).map(match => ({
    ...match,
    events: values(match.events),
    lineupLocal: values(match.lineupLocal),
    lineupVisitor: values(match.lineupVisitor),
  }));
  const metadata = publicMetadata(now);
  if (query.tipo === 'liguilla')
    return { ...metadata, ...createLiguilla(matches, rawTeams) };
  const teams = values(rawTeams);
  if (
    !teams.length ||
    teams.some(team => typeof team !== 'string' || !team.trim())
  )
    throw new PublicDataError(
      503,
      'data_unavailable',
      'No se pudieron obtener los nombres canónicos de equipos.',
    );
  const team =
    query.equipo === undefined ? undefined : canonicalTeam(query.equipo, teams);
  const phase = query.fase ?? 'regular';
  const scoped = matches.filter(
    match =>
      phaseMatches(match, phase) &&
      (!team || match.local === team || match.visitante === team),
  );
  const completed = scoped.filter(
    match => resolveMatchStatus(match) === 'finished',
  );
  const eligible = completed.filter(
    match =>
      score(match.golLocal) !== null && score(match.golVisitante) !== null,
  );
  const excluded = completed
    .filter(match => !eligible.includes(match))
    .map(match => match.idMatch);
  const relevantTeams = team ? [team] : teams;
  const collected = collectPlayers(eligible, relevantTeams, rawPlayers);
  const coverage = {
    partidosFinalizadosIncluidos: eligible.length,
    excluidosSinMarcador: excluded,
    aviso:
      'Las cifras reflejan solo registros disponibles; ausencia de eventos o alineaciones no demuestra ausencia de goles, tarjetas o participaciones.',
  };
  const warnings = [
    ...collected.advertencias,
    ...(excluded.length
      ? [
          'Finalizados sin marcador completo excluidos; consulta excluidosSinMarcador.',
        ]
      : []),
  ];
  if (query.tipo === 'jugador') {
    const player = selectPlayer(query, team!, rawPlayers);
    const ambiguousJersey =
      (rosterFor(team!, rawPlayers) || []).filter(
        item => item.number === player.number,
      ).length !== 1;
    const stat =
      collected.rows.find(
        row =>
          row.jugador.equipo === team && row.jugador.number === player.number,
      )?.estadisticas ?? emptyCounters();
    const history = ambiguousJersey
      ? []
      : [...eligible]
          .sort((a, b) => chronological(a, b, true))
          .flatMap(match => {
            const row = collectPlayers([match], [team!], rawPlayers).rows.find(
              item =>
                item.jugador.equipo === team &&
                item.jugador.number === player.number,
            );
            return row
              ? [
                  {
                    jornada: match.jornada,
                    ...publicMatch(match),
                    estadisticas: row.estadisticas,
                  },
                ]
              : [];
          });
    return {
      ...metadata,
      tipo: 'jugador' as const,
      equipo: team!,
      fase: phase,
      jugador: publicPlayer(player),
      criterio: CRITERION,
      criterioMinutos: MINUTES_CRITERION,
      alcanceIdentidad:
        'Estadísticas del equipo y dorsal consultados; no se combinan traslados ni cambios de dorsal.',
      estadisticas: ambiguousJersey ? null : stat,
      historial: history,
      cobertura: coverage,
      advertencias: [
        ...warnings,
        ...(ambiguousJersey
          ? [
              'El dorsal está compartido por registros de distintos jugadores; no se atribuyen estadísticas ni historial al nombre seleccionado.',
            ]
          : []),
      ],
    };
  }
  const metric = query.metrica ?? 'goleadores';
  const limit = query.limite ?? 10;
  const playerMetrics = {
    goleadores: 'goles',
    asistencias: 'asistencias',
    amarillas: 'amarillas',
    rojas: 'rojas',
    participaciones: 'participaciones',
    minutos: 'minutos',
  } as const;
  const isPlayerMetric = metric in playerMetrics;
  const playerField = playerMetrics[metric as keyof typeof playerMetrics];
  const playerRanking = isPlayerMetric
    ? collected.rows
        .filter(row => !team || row.jugador.equipo === team)
        .map(row => ({ ...row, valor: row.estadisticas[playerField] }))
        .filter(row => row.valor > 0)
    : [];
  const teamRanking = isPlayerMetric
    ? []
    : relevantTeams
        .map(name => {
          const own = eligible.filter(
            match => match.local === name || match.visitante === name,
          );
          const total = statistics(own, name);
          const home = statistics(
            own.filter(match => match.local === name),
            name,
          );
          const away = statistics(
            own.filter(match => match.visitante === name),
            name,
          );
          const cleanSheets = own.filter(
            match =>
              (match.local === name ? match.golVisitante : match.golLocal) ===
              0,
          ).length;
          const value =
            metric === 'ofensivas'
              ? total.gf
              : metric === 'defensivas'
                ? total.gc
                : metric === 'porterias_cero'
                  ? cleanSheets
                  : metric === 'puntos_local'
                    ? home.pts
                    : away.pts;
          return {
            equipo: name,
            valor: value,
            estadisticas: {
              total,
              local: home,
              visitante: away,
              porteriasCero: cleanSheets,
            },
          };
        })
        .filter(
          row =>
            row.estadisticas.total.jj > 0 &&
            (metric !== 'puntos_local' || row.estadisticas.local.jj > 0) &&
            (metric !== 'puntos_visitante' ||
              row.estadisticas.visitante.jj > 0),
        );
  const ascending = metric === 'defensivas';
  const ranking = [...playerRanking, ...teamRanking]
    .sort((a, b) => {
      const left =
        'equipo' in a
          ? a.equipo
          : `${a.jugador.equipo} ${a.jugador.name ?? ''} ${a.jugador.number}`;
      const right =
        'equipo' in b
          ? b.equipo
          : `${b.jugador.equipo} ${b.jugador.name ?? ''} ${b.jugador.number}`;
      return (
        (ascending ? a.valor - b.valor : b.valor - a.valor) ||
        left.localeCompare(right, 'es')
      );
    })
    .map((row, index, all) => ({
      posicion: all.findIndex(item => item.valor === row.valor) + 1,
      ...row,
    }));
  return {
    ...metadata,
    tipo: 'estadisticas' as const,
    metrica: metric,
    entidad: isPlayerMetric ? 'jugadores' : 'equipos',
    fase: phase,
    equipo: team ?? null,
    criterio: CRITERION,
    criterioMinutos: MINUTES_CRITERION,
    orden: ascending ? 'menor_a_mayor' : 'mayor_a_menor',
    criterioEmpates:
      'Mismo valor comparte posición; orden alfabético solo para presentación. El límite puede recortar empates.',
    ranking: ranking.slice(0, limit),
    limite: limit,
    totalRegistros: ranking.length,
    empateEnCorte:
      ranking.length > limit &&
      ranking[limit - 1].valor === ranking[limit].valor,
    cobertura: coverage,
    advertencias: warnings,
  };
}
