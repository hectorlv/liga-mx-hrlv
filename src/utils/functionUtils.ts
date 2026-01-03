import { FirebaseUpdates } from '../types';

export function dispatchEventMatchUpdated(
  detail: FirebaseUpdates,
): CustomEvent {
  const event = new CustomEvent('edit-match', {
    detail,
    bubbles: true,
    composed: true,
  });
  return event;
}
