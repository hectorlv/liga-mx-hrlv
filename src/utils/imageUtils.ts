import { html } from "lit";
import { LOGOS } from "./constants.js";
import * as images from '../images/index.js';
import { Team } from "../app/types/index.js";
export function getTeamImage(equipo : Team) {
    const keys = Object.keys(images);
    keys.forEach(key => {
      // eslint-disable-next-line no-param-reassign
      images[key].className = 'logo';
    });
    const img = images[LOGOS.find(t => t.equipo === equipo).img];
    return html`<img src="${img.src}" class="${img.className}" alt="equipo" loading="lazy" decoding="async" />`;
}
