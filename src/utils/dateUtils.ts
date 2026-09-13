import { PhaseMatchEvent } from '../types';

const todayDate = new Date();
export const TOURNAMENT_TIME_ZONE = 'America/Mexico_City';

function tournamentDateParts(fecha: Date) {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TOURNAMENT_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(fecha)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  ) as Record<'year' | 'month' | 'day', string>;
}

/**
 * Formats the date from a String
 * @param {String} fechaString
 * @param {String} hora
 * @returns Date
 */
export function formatDate(fechaString: string | Date, hora: string) {
  if (!fechaString || !hora) {
    return '';
  }
  if (fechaString instanceof Date) return fechaString;
  // Dividir la cadena en día, mes y año
  const partesFecha = (fechaString as string).split('/');
  const year = Number.parseInt(partesFecha[0], 10);
  const month = Number.parseInt(partesFecha[1], 10);
  const day = Number.parseInt(partesFecha[2], 10);
  const [hours, minutes] = hora.split(':').map(Number);
  if (
    ![year, month, day, hours, minutes].every(Number.isFinite) ||
    month < 1 || month > 12 || day < 1 || day > 31 || hours < 0 || hours > 23 ||
    minutes < 0 || minutes > 59
  ) {
    return '';
  }

  // El fixture se captura en hora CDMX, no en la zona del visitante.
  // Ajustamos iterativamente el instante para la zona IANA, incluso en fechas
  // históricas donde el offset de Ciudad de México era distinto.
  const wanted = Date.UTC(year, month - 1, day, hours, minutes);
  let instant = wanted;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TOURNAMENT_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant))
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, Number(part.value)]));
    const actual = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    instant += wanted - actual;
  }
  return new Date(instant);
}

/**
 * Format a date to dd/MM/yyyy
 * @param {Date} fecha
 * @returns String
 */
export function formatDateDDMMYYYY(fecha: Date) {
  if (!fecha) {
    return '';
  }
  const { day, month, year } = tournamentDateParts(fecha);
  return `${day}/${month}/${year}`;
}

export function formatDateYYYYMMDD(fecha: Date) {
  if (!fecha) {
    return '';
  }
  const { day, month, year } = tournamentDateParts(fecha);
  return `${year}-${month}-${day}`;
}

export function replaceDateSeparator(date: string) {
  return date.replaceAll('-', '/');
}

export function isMatchLive(phaseEvents?: PhaseMatchEvent[]): boolean {
  const hasStart = phaseEvents?.some(event => event.phase === 'start') ?? false;
  const hasFulltime =
    phaseEvents?.some(event => event.phase === 'fulltime') ?? false;
  return hasStart && !hasFulltime;
}

export function getMatchRowClass(
  fecha: Date,
  phaseEvents?: PhaseMatchEvent[],
): string {
  let className = '';
  if (
    fecha?.getFullYear() === todayDate.getFullYear() &&
    fecha?.getMonth() === todayDate.getMonth() &&
    fecha?.getDate() === todayDate.getDate()
  ) {
    className += ' todayMatch';
  }
  if (isMatchLive(phaseEvents)) {
    className += ' activeMatch';
  }
  return className.trim();
}
