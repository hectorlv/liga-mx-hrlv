const POSITION_ORDER = ['Portero', 'Defensa', 'Medio', 'Delantero'];

/** Orden editorial compartido por las alineaciones y sus imágenes sociales. */
export function comparePlayersByPositionAndNumber(
  first: { position?: string; number: number },
  second: { position?: string; number: number },
): number {
  const positionIndex = (position?: string) => {
    const index = POSITION_ORDER.indexOf(position || '');
    return index === -1 ? POSITION_ORDER.length : index;
  };
  return (
    positionIndex(first.position) - positionIndex(second.position) ||
    first.number - second.number
  );
}
