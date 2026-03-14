import { html } from 'lit';
import { LOGOS } from './constants.js';
import * as images from '../assets/images/index.js';
export function getTeamImage(equipo: string) {
  const imagesMap = images as unknown as Record<string, string>;
  const logoEntry = LOGOS.find(t => t.equipo === equipo);
  if (!logoEntry) return html``;
  const imgSrc = imagesMap[logoEntry.img];
  return html`<img
    src="${imgSrc}"
    class="logo"
    alt="equipo"
    loading="lazy"
    decoding="async"
  />`;
}
