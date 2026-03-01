import { PhaseEvent } from '../types';

const todayDate = new Date();

/**
 * Formats the date from a String
 * @param {String} fechaString
 * @param {String} hora
 * @returns Date
 */
export function formatDate(fechaString: string | Date, hora: string) {
  if (fechaString === '') {
    return '';
  }
  // Dividir la cadena en día, mes y año
  const partesFecha = (fechaString as string).split('/');
  const year = Number.parseInt(partesFecha[0], 10);
  const month = Number.parseInt(partesFecha[1], 10);
  const day = Number.parseInt(partesFecha[2], 10);
  const fecha = new Date(year, month - 1, day);
  return new Date(fecha.toISOString().substring(0, 11) + hora);
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
  const day = fecha.getDate();
  const month = fecha.getMonth() + 1;
  const year = fecha.getFullYear();
  const fechaFormateada = `${(day < 10 ? '0' : '') + day}/${
    month < 10 ? '0' : ''
  }${month}/${year}`;
  return fechaFormateada;
}

export function formatDateYYYYMMDD(fecha: Date) {
  if (!fecha) {
    return '';
  }
  const day = fecha.getDate();
  const month = fecha.getMonth() + 1;
  const year = fecha.getFullYear();
  const fechaFormateada = `${year}-${(month < 10 ? '0' : '') + month}-${
    day < 10 ? '0' : ''
  }${day}`;
  return fechaFormateada;
}

export function replaceDateSeparator(date: string) {
  return date.replaceAll('-', '/');
}

export function isMatchLive(phaseEvents?: PhaseEvent[]): boolean {
  const hasStart = phaseEvents?.some(event => event.phase === 'start') ?? false;
  const hasFulltime =
    phaseEvents?.some(event => event.phase === 'fulltime') ?? false;
  return hasStart && !hasFulltime;
}

export function getMatchRowClass(
  fecha: Date,
  phaseEvents?: PhaseEvent[],
): string {
  let className = '';
  if (
    fecha &&
    fecha.getFullYear() === todayDate.getFullYear() &&
    fecha.getMonth() === todayDate.getMonth() &&
    fecha.getDate() === todayDate.getDate()
  ) {
    className += ' todayMatch';
  }
  if (isMatchLive(phaseEvents)) {
    className += ' activeMatch';
  }
  return className.trim();
}
