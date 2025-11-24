export function dispatchEventMatchUpdated(detail: any): CustomEvent {
  const event = new CustomEvent('edit-match', {
    detail,
    bubbles: true,
    composed: true,
  });
  return event;
}
