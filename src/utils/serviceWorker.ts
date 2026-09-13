function isLocalhost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/** Registers production PWA updates without affecting local development. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || isLocalhost(window.location.hostname)) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}
