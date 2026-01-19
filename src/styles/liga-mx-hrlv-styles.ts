import { css } from 'lit';

export default css`
  :host {
    /* Layout base */
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    margin: 0 auto;
    text-align: center;

    /* Tipografía base */
    font-family: var(
      --font-family,
      Roboto,
      system-ui,
      -apple-system,
      Segoe UI,
      Arial,
      sans-serif
    );
    font-size: 14px;

    /* Design tokens (mezcla marca + M3) */
    --color-primary: #4caf50; /* marca */
    --color-on-primary: #ffffff;
    --color-surface: #f7f7f7;
    --color-surface-variant: #e0e0e0;
    --color-on-surface: #1a2b42;
    --color-outline: #d0d7de;
    --table-row-alt: #d0e4f5;

    /* Espaciado y radios */
    --space-2: 2px;
    --space-4: 4px;
    --space-6: 6px;
    --space-8: 8px;
    --space-12: 12px;
    --space-16: 16px;
    --space-24: 24px;
    --radius-s: 6px;
    --radius-m: 12px;

    /* Map a tokens de Material Web */
    --md-sys-color-primary: var(--color-primary);
    --md-sys-color-on-primary: var(--color-on-primary);
    /* RGB helper for translucent accents (use as: rgba(var(--color-primary-rgb), .06)) */
    --color-primary-rgb: 76, 175, 80;
    --md-sys-color-surface: var(--color-surface);
    --md-sys-color-on-surface: var(--color-on-surface);
    --md-sys-color-surface-container-highest: var(--color-surface-variant);
    --md-filled-select-text-field-container-color: var(--color-surface-variant);
    --md-sys-color-secondary-container: var(--color-primary);
    --md-menu-item-label-text-color: var(--color-on-surface);
    --md-menu-container-color: var(--color-surface-variant);
    --md-filled-select-text-field-input-text-color: var(--color-on-surface);
    --md-dialog-container-color: var(--color-surface-variant);

    background-color: var(--color-surface);
    color: var(--color-on-surface);
  }

  main {
    flex-grow: 1;
    margin-top: 35px;
  }

  .app-footer {
    font-size: 12px;
    align-items: center;
  }

  .app-footer a {
    margin-left: 5px;
  }

  table.greyGridTable {
    width: 100%;
    text-align: center;
    border-collapse: collapse;
    overflow-x: auto;
  }
  table.greyGridTable td,
  table.greyGridTable th {
    border: 1px solid #ffffff;
    padding: 3px 4px;
  }
  table.greyGridTable tr:nth-child(even) {
    background: var(--table-row-alt);
  }
  table.greyGridTable thead {
    background: #ffffff;
    /* make header sticky */
    position: sticky;
    top: 0;
    z-index: 3;
  }
  table.greyGridTable thead th {
    font-size: 15px;
    font-weight: bold;
    color: #333333;
    text-align: center;
    border-left: 2px solid #333333;
    position: sticky;
    top: 0;
  }

  table.greyGridTable tfoot td {
    font-size: 14px;
  }

  /* Row hover and chips */
  table.greyGridTable tr:hover {
    background: rgba(var(--color-primary-rgb), 0.06);
  }
  table.greyGridTable tr.selected-row {
    background: rgba(var(--color-primary-rgb), 0.12);
  }

  /* Small chip used for jornada / status */
  .chip {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    background: var(--md-sys-color-surface-container-highest);
    color: var(--md-sys-color-on-surface);
    border: 1px solid var(--color-outline);
    font-size: 12px;
    line-height: 1;
    vertical-align: middle;
  }

  /* Row actions menu */
  .actions-cell {
    position: relative;
  }
  .row-menu {
    position: absolute;
    right: 8px;
    top: 36px;
    background: var(--md-sys-color-surface-container-highest);
    border-radius: 8px;
    padding: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 140px;
    z-index: 6;
  }
  .row-menu md-filled-button {
    width: 100%;
    justify-content: flex-start;
  }

  /* Generic card + section used across components */
  .card,
  .app-card {
    background: var(--md-sys-color-surface-container-highest);
    border-radius: var(--radius-m);
    padding: var(--space-12);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    margin-bottom: var(--space-12);
    text-align: left;
  }
  .section {
    margin-top: var(--space-12);
  }

  /* Action button pattern used app-wide */
  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .action-btn md-icon {
    font-size: 18px;
  }
  .action-btn .btn-label {
    display: inline-block;
  }
  @media (max-width: 600px) {
    .action-btn .btn-label {
      display: none;
    }
    .action-btn {
      padding: 6px 8px;
      min-width: 40px;
      justify-content: center;
    }
  }

  /* Heading and list normalization for consistency */
  h2,
  h3,
  h4 {
    margin: 0;
  }
  ul {
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }

  /* Avatar utility */
  .avatar--60 {
    width: 60px;
    height: auto;
    object-fit: contain;
  }

  .todayMatch {
    background: var(--color-primary) !important;
    color: var(--color-on-primary);
  }

  /* Para un match activo (en vivo) poner una animación de borde parpadeando */
  .activeMatch {
    animation: blink-border 1s infinite;
    border: 2px solid var(--color-on-primary);
    border-radius: var(--radius-s);
  }

  @keyframes blink-border {
    0%,
    100% {
      border-color: var(--color-on-primary);
    }
    50% {
      border-color: transparent;
    }
  }

  .logo {
    height: 3em;
  }

  .logo-error {
    height: 3em;
    background-color: red;
  }

  .checkboxToday {
    margin: auto 0;
  }

  .matches-filter {
    max-height: 350px;
    display: flex;
    justify-content: space-evenly;
  }

  h1 {
    font-size: 2em;
    color: #333;
    margin-bottom: 20px;
  }

  p {
    font-size: 1.2em;
    color: #666;
    margin-bottom: 20px;
  }

  input {
    width: 80%;
    max-width: 300px;
    padding: 10px;
    margin-bottom: 15px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 1em;
  }

  /* Focus states accesibles */
  input:focus,
  button:focus,
  md-filled-button:focus,
  md-icon-button:focus,
  md-outlined-select:focus {
    outline: 3px solid rgba(76, 175, 80, 0.35);
    outline-offset: 3px;
  }

  /* Use focus-visible for keyboard users when available */
  :is(button, md-filled-button, md-icon-button):focus:not(:focus-visible) {
    outline: none;
  }

  button {
    width: 80%;
    max-width: 300px;
    padding: 10px;
    margin-bottom: 10px;
    border: none;
    border-radius: var(--radius-s);
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    font-size: 1em;
    cursor: pointer;
    transition: background-color 0.3s ease;
  }

  button:hover {
    background-color: #45a049;
  }

  .qualified {
    background-color: var(--color-primary) !important;
    color: var(--color-on-primary);
  }

  .playin {
    background-color: #ff9800 !important;
    color: white;
  }

  .eliminated {
    background-color: #f44336 !important;
    color: white;
  }

  /* Dark mode automático */
  @media (prefers-color-scheme: dark) {
    :host {
      --color-surface: #0f1115;

      --color-surface-variant: #1a2028;
      --color-on-surface: #e6e6e6;
      --table-row-alt: #19202a;
      background-color: var(--color-surface);
      color: var(--color-on-surface);
    }
    table.greyGridTable thead {
      background: var(--color-surface-variant);
    }
    table.greyGridTable thead th {
      color: var(--color-on-surface);
      border-left: 2px solid var(--color-outline);
    }
  }

  #scrollTopButton {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: var(--color-primary);
    color: var(--color-on-primary);
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    transition: background-color 0.3s ease;
    z-index: 10;
  }

  #scrollTopButton:hover {
    background-color: #45a049;
  }
`;
