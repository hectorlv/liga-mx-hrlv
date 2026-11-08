import { Worker } from 'node:worker_threads';
import { PublicDataError, pointBalances } from './generated/public-data.js';

const workerUrl = new URL('./scenario-worker.mjs', import.meta.url);

/** One slot per instance; ordinary MCP reads never wait for the solver. */
export function createScenarioRunner({ budgetMs = 20_000, makeWorker = data => new Worker(workerUrl, {
  workerData: data,
  ...(process.execArgv.some(arg => arg.startsWith('--input-type')) ? {
    execArgv: process.execArgv.filter((arg, index, args) => !arg.startsWith('--input-type') && args[index - 1] !== '--input-type'),
  } : {}),
}), includeEvidence = false } = {}) {
  let active = false;
  return async snapshot => {
    const report = structuredClone(snapshot);
    if (report.estado === 'no_verificable') return report;
    if (active) throw new PublicDataError(503, 'analysis_busy', 'Hay un análisis de escenarios en curso. Inténtalo de nuevo.');
    active = true;
    const startedAt = Date.now();
    let worker;
    let timer;
    let verified = false;
    let failure;
    try {
      await new Promise((resolve, reject) => {
        worker = makeWorker({ snapshot, budgetMs, startedAt });
        timer = setTimeout(resolve, budgetMs);
        worker.on('message', message => {
          if (message.type === 'verified') verified = true;
          if (message.type === 'invalid') {
            report.advertencias.push(message.motivo);
            verified = false;
            resolve();
          }
          if (message.type === 'case') {
            const target = report.equipos[message.teamIndex];
            target.casos[message.caseIndex] = message.value;
            if (includeEvidence) target.casos[message.caseIndex].testigos = message.evidence;
          }
          if (message.type === 'failed') reject(new Error('Scenario worker failed'));
          if (message.type === 'done') {
            report.comprobaciones = message.checks;
            resolve();
          }
        });
        worker.on('error', reject);
        worker.on('exit', code => code === 0 ? resolve() : reject(new Error('Scenario worker exited')));
      });
    } catch (error) {
      failure = error;
    } finally {
      clearTimeout(timer);
      // terminate also stops initialization or an unresponsive solver thread.
      try { if (worker) await worker.terminate(); }
      finally { active = false; }
    }
    if (failure) throw new PublicDataError(503, 'analysis_unavailable', 'No se pudo completar el análisis de escenarios. Inténtalo de nuevo.');
    // A full proof across every own-points case can strengthen a conservative
    // source flag. Keep the source table intact and identify these extra proofs.
    const extraQualified = verified ? report.equipos.filter(team => team.casos.every(row => row.estado === 'asegura_su_lugar')).map(team => team.equipo) : [];
    const extraEliminated = verified ? report.equipos.filter(team => team.casos.every(row => row.estado === 'sin_opcion_bajo_este_caso')).map(team => team.equipo) : [];
    report.garantiasTablaBase = { clasificados: snapshot.clasificadosAsegurados, eliminados: snapshot.eliminadosAsegurados };
    report.garantiasAdicionalesDelAnalisis = { clasificados: extraQualified, eliminados: extraEliminated };
    report.clasificadosAsegurados.push(...extraQualified);
    report.eliminadosAsegurados.push(...extraEliminated);
    report.candidatos = report.candidatos.filter(name => !extraQualified.includes(name) && !extraEliminated.includes(name));
    report.equipos = report.equipos.filter(team => report.candidatos.includes(team.equipo));
    report.plazasDisponibles = Math.max(0, report.plazasTotales - report.clasificadosAsegurados.length);
    report.cobertura.candidatosIniciales = snapshot.candidatos.length;
    report.cobertura.partidosRelevantes = report.pendientes.filter(match => report.candidatos.includes(match.local) || report.candidatos.includes(match.visitante)).length;
    // Excluded rivals no longer compete for the residual places.
    for (const team of report.equipos) {
      team.condicionesDesempate = team.condicionesDesempate.filter(row => report.candidatos.includes(row.rival));
      const rivals = report.tablaBase.filter(row => row.equipo !== team.equipo && report.candidatos.includes(row.equipo));
      team.resumenPuntos = {
        aseguran: team.casos.filter(row => row.estado === 'asegura_su_lugar').map(row => row.puntosSumados),
        condicionales: team.casos.filter(row => row.estado === 'depende_de_otros_resultados').map(row => row.puntosSumados),
        insuficientes: team.casos.filter(row => row.estado === 'sin_opcion_bajo_este_caso').map(row => row.puntosSumados),
      };
      for (const row of team.casos) {
        if (row.ejemplosDesempate) row.ejemplosDesempate = row.ejemplosDesempate.filter(example => report.candidatos.includes(example.rival));
        if (row.estado !== 'depende_de_otros_resultados') continue;
        const alwaysBelow = rivals.filter(rival => rival.pts + 3 * report.restantesPorEquipo[rival.equipo] < row.puntosFinales);
        const conditional = rivals.filter(rival => rival.pts <= row.puntosFinales &&
          rival.pts + 3 * report.restantesPorEquipo[rival.equipo] >= row.puntosFinales);
        row.condicionConjunta = {
          caracter: 'suficiente',
          minimoRivalesDetras: Math.max(0, report.candidatos.length - report.plazasDisponibles - alwaysBelow.length),
          rivales: conditional.map(rival => {
            const attainable = pointBalances(report.restantesPorEquipo[rival.equipo]).map(value => value.puntosSumados);
            const tie = row.puntosFinales - rival.pts;
            return { rival: rival.equipo,
              maximoPuntosSumados: Math.max(-1, ...attainable.filter(value => value < tie)),
              empateSumando: attainable.includes(tie) ? tie : null,
            };
          }),
        };
      }
    }
    report.criterioCondicionConjunta = 'Para asegurar una plaza en un caso condicional, al menos minimoRivalesDetras de los rivales listados deben terminar estrictamente detrás. Cada rival queda detrás por puntos si suma como máximo maximoPuntosSumados; si suma empateSumando, hay que superarlo por DG o GF usando condicionesDesempate. empateSumando null significa que ese empate de puntos no es alcanzable. Un umbral negativo de puntos es imposible por puntos. No se exige que todos los rivales fallen. Las condiciones deben cumplirse conjuntamente en el calendario compartido. Un empate total sin resolver no se cuenta como rival superado.';
    const pending = report.equipos.flatMap(team => team.casos.filter(row => row.estado === 'no_verificado')
      .map(row => ({ equipo: team.equipo, puntosSumados: row.puntosSumados })));
    report.estado = !verified ? 'no_verificable' : pending.length ? 'parcial' : 'completo';
    report.exclusionesVerificadas = verified;
    report.casosPendientes = pending;
    report.duracionAnalisisMs = Date.now() - startedAt;
    if (!verified) {
      // Do not publish conclusions based on exclusions that were not proved.
      for (const team of report.equipos) for (const row of team.casos) {
        row.estado = 'no_verificado';
        delete row.ejemplosDesempate;
      }
      report.advertencias.push('No se verificaron todas las exclusiones matemáticas; no se deben publicar conclusiones de este informe.');
    } else if (pending.length) report.advertencias.push('Análisis parcial: los casos no verificados no equivalen a eliminación ni clasificación.');
    return report;
  };
}

export const runScenarioReport = createScenarioRunner();
