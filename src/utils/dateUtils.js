const todayDate = new Date();

/**
 * Formats the date from a String
 * @param {String} fechaString
 * @param {String} hora
 * @returns
 */
export function formatDate(fechaString, hora) {
    if (fechaString === '') {
        return '';
    }
    // Dividir la cadena en día, mes y año
    const partesFecha = fechaString.split('/');
    const year = parseInt(partesFecha[0], 10);
    const month = parseInt(partesFecha[1], 10);
    const day = parseInt(partesFecha[2], 10);
    const fecha = new Date(year, month - 1, day);
    return new Date(fecha.toISOString().substring(0, 11) + hora);
}

/**
 * Format a date to dd/MM/yyyy
 * @param {Date} fecha
 * @returns String
 */
export function formatDateDDMMYYYY(fecha) {
    if (fecha == '') {
        return '';
    }
    const day = fecha.getDate();
    const month = fecha.getMonth() + 1;
    const year = fecha.getFullYear();
    const fechaFormateada = `${(day < 10 ? '0' : '') + day}/${month < 10 ? '0' : ''
        }${month}/${year}`;
    return fechaFormateada;
}

export function formatDateYYYYMMDD(fecha) {
    if (fecha === '') {
        return '';
    }
    const day = fecha.getDate();
    const month = fecha.getMonth() + 1;
    const year = fecha.getFullYear();
    const fechaFormateada = `${year}-${(month < 10 ? '0' : '') + month}-${day < 10 ? '0' : ''
        }${day}`;
    return fechaFormateada;
}

export function replaceDateSeparator(date) {
    return date.replaceAll('-', '/');
}

export function getMatchRowClass(fecha) {
    return fecha != '' &&
      fecha.getFullYear() === todayDate.getFullYear() &&
      fecha.getMonth() === todayDate.getMonth() &&
      fecha.getDate() === todayDate.getDate()
      ? 'todayMatch'
      : '';
  }
