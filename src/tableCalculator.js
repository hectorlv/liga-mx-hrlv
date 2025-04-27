function calculateTeamStats(team, matches) {
    let jg = 0;
    let je = 0;
    let jp = 0;
    let gf = 0;
    let gc = 0;
    for (const match of matches) {
        const { golLocal, golVisitante, local, visitante } = match;
        if (local === team) {
            if (golLocal > golVisitante) {
                jg += 1;
            } else if (golLocal < golVisitante) {
                jp += 1;
            } else {
                je += 1;
            }
            gf += Number(golLocal);
            gc += Number(golVisitante);
        } else if (visitante === team) {
            if (golLocal < golVisitante) {
                jg += 1;
            } else if (golLocal > golVisitante) {
                jp += 1;
            } else {
                je += 1;
            }
            gf += Number(match.golVisitante);
            gc += Number(match.golLocal);
        }
    }
    return {
        equipo: team,
        jj: jg + je + jp,
        jg,
        je,
        jp,
        gf,
        gc,
        dg: gf - gc,
        pts: 3 * jg + je,
    };
}

export function calculateTable(teams, matches) {
    const table = teams.map(team => {
        const teamMatches = matches.filter(
            match =>
                (match.local === team || match.visitante === team) &&
                match.golLocal !== '' &&
                match.golVisitante !== '' &&
                match.jornada <= 17,
        );
        const teamStats = calculateTeamStats(team, teamMatches);
        return teamStats;
    });
    table.sort((a, b) => {
        if (a.pts !== b.pts) {
            return b.pts - a.pts;
        }
        if (a.dg !== b.dg) {
            return b.dg - a.dg;
        }
        return b.gf - a.gf;
    });
    table.forEach((team, index) => {
        team.eliminado = index >= 10;
    });
    return table;
}