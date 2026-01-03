import { html } from 'lit';
import { LOGOS } from './constants.js';
import * as images from '../assets/images/index.js';
export function getTeamImage(equipo: string) {
  type ImageAsset = { src: string; className?: string };
  const imagesMap = images as unknown as Record<string, ImageAsset>;
  Object.values(imagesMap).forEach(img => {
    img.className = 'logo';
  });
  const logoEntry = LOGOS.find(t => t.equipo === equipo);
  if (!logoEntry) return html``;
  const img = imagesMap[logoEntry.img];
  return html`<img
    src="${img.src}"
    class="${img.className}"
    alt="equipo"
    loading="lazy"
    decoding="async"
  />`;
}
