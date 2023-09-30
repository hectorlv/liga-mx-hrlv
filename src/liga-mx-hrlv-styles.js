import { css } from 'lit';

export default css`
  :host {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    font-size: 12px;
    color: #1a2b42;
    margin: 0 auto;
    text-align: center;
    background-color: var(--liga-mx-hrlv-background-color);
  }

  main {
    flex-grow: 1;
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
    background: #d0e4f5;
  }
  table.greyGridTable thead {
    background: #ffffff;
  }
  table.greyGridTable thead th {
    font-size: 15px;
    font-weight: bold;
    color: #333333;
    text-align: center;
    border-left: 2px solid #333333;
  }
  table.greyGridTable thead th:first-child {
    border-left: none;
  }

  table.greyGridTable tfoot td {
    font-size: 14px;
  }

  .todayMatch {
    background: green !important;
    color: white;
  }

  .logo {
    height: 3em
  }
`;
