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

    /* Colores de marca */
    /* Colores de Marca */
    --md-sys-color-primary: #008744; /* Verde pasto intenso (estilo Google/Sports) */
    --md-sys-color-on-primary: #ffffff; /* Texto en botones primarios */
    --md-sys-color-primary-container: #d6f5d6; /* Fondo suave para elementos activos */
    --md-sys-color-on-primary-container: #003314; /* Texto sobre el fondo suave */
    --md-sys-color-outline-variant: #cbd5e1; /* Líneas de contorno suaves */
    --md-sys-color-surface-variant: #e2e8f0; /* Superficie secundaria (fondo de tarjetas) */
    --md-sys-color-surface-container: #f8fafc; /* Contenedor de superficie (tarjetas) */
    --md-sys-color-background: #f5f7fa; /* Un gris muy sutil, casi blanco, para profundidad */
    --md-sys-color-surface: #ffffff; /* Tarjetas blancas limpias */
    --md-sys-color-on-surface: #1a1c1e; /* Texto principal casi negro */
    --md-sys-color-on-surface-variant: #475569; /* Texto secundario (fechas, estadios) */
    --md-sys-color-surface-container-lowest: #ffffff;
    --md-sys-color-variant: #c5c5c5;

    --row-hover: rgba(0, 0, 0, 0.04);

    --md-filled-select-text-field-container-color: #f0f4f8; /* Fondo del input */
    --md-filled-text-field-container-color: #f0f4f8; /* Fondo del input */

    --md-sys-color-secondary-container: var(--md-sys-color-primary-container);
    --md-menu-item-label-text-color: var(--md-sys-color-on-surface);
    --md-menu-container-color: var(--md-sys-color-surface);
    --md-filled-select-text-field-input-text-color: var(
      --md-sys-color-on-surface
    );
    --md-dialog-container-color: var(--md-sys-color-surface);
    --md-dialog-title-text-color: var(--md-sys-color-on-surface);
    --md-dialog-content-text-color: var(--md-sys-color-on-surface-variant);
    --md-filled-select-text-field-active-indicator-color: var(
      --md-sys-color-primary
    );
    --md-filled-select-text-field-focus-active-indicator-color: var(
      --md-sys-color-primary
    );
    /* Acentos de Futbol */
    --app-color-whistle: #607d8b; /* Gris metálico para íconos neutros o bordes */
    --app-color-warning: #ffc107; /* Amarillo tarjeta */
    --app-color-danger: #d32f2f; /* Rojo tarjeta */

    background-color: var(--md-sys-color-background);
    color: var(--md-sys-color-on-surface);
  }

  /* Dark mode automático */
  @media (prefers-color-scheme: dark) {
    :host {
      /* Colores de Marca */
      --md-sys-color-primary: #4ade80; /* Un verde neón más brillante para resaltar en lo oscuro */
      --md-sys-color-on-primary: #003314;
      --md-sys-color-primary-container: #005229;
      --md-sys-color-on-primary-container: #d6f5d6;

      /* Colores de Fondo */
      --md-sys-color-background: #0f172a; /* Un azul muy oscuro (tipo noche) en vez de negro plano */
      --md-sys-color-surface: #1e293b; /* Tarjetas un poco más claras */
      --md-sys-color-on-surface: #e2e8f0; /* Texto blanco suave */
      --md-sys-color-on-surface-variant: #94a3b8; /* Texto secundario */
      --md-sys-color-surface-variant: #334155;
      --md-sys-color-surface-container: #1e293b;
      --md-sys-color-outline-variant: #475569;
      --row-hover: rgba(255, 255, 255, 0.06);
      --md-sys-color-surface-container-lowest: #0b1120;

      /* Fondo del input (un poco más claro que el fondo de la app) */
      --md-filled-select-text-field-container-color: #334155;
      --md-filled-text-field-container-color: #334155;

      /* Color de fondo selección (Verde bosque oscuro) */
      --md-sys-color-secondary-container: #005229;

      /* Texto claro pero no blanco quemante */
      --md-menu-item-label-text-color: #e2e8f0;

      /* Fondo del menú (igual a las tarjetas) */
      --md-menu-container-color: #1e293b;

      /* Texto del input */
      --md-filled-select-text-field-input-text-color: #e2e8f0;

      /* Fondo del diálogo */
      --md-dialog-container-color: #1e293b;

      /* Texto del diálogo */
      --md-dialog-title-text-color: #e2e8f0;
      --md-dialog-content-text-color: #e2e8f0;
      /* Acentos de Futbol */
      --app-color-whistle: #90a4ae; /* Gris metálico más claro para mejor contraste */
      --app-color-warning: #ffb300; /* Amarillo tarjeta más oscuro para mejor visibilidad */
      --app-color-danger: #c62828; /* Rojo tarjeta más oscuro para mejor visibilidad */

      --md-filled-select-text-field-active-indicator-color: var(
        --md-sys-color-primary
      );
      --md-filled-select-text-field-focus-active-indicator-color: var(
        --md-sys-color-primary
      );
    }
    table.greyGridTable thead {
      background: var(--color-surface-variant);
    }
    table.greyGridTable thead th {
      color: var(--md-sys-color-on-surface);
      border-left: 2px solid var(--md-sys-color-outline-variant);
    }
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
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-on-primary-container);
    font-weight: bold;
    font-size: 0.85rem;
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
    background: var(--md-sys-color-surface);
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
