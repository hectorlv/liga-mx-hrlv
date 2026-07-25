import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
);

export function createBuildMetadata(now = new Date()) {
  return {
    version: packageJson.version,
    buildId: formatBuildId(now),
    buildDate: now.toISOString(),
  };
}

export function createAppVersionDefines(metadata = createBuildMetadata()) {
  return {
    __APP_VERSION__: JSON.stringify(metadata.version),
    __APP_BUILD_ID__: JSON.stringify(metadata.buildId),
    __APP_BUILD_DATE__: JSON.stringify(metadata.buildDate),
  };
}

function formatBuildId(date) {
  date = new Date(date.getTime() - 6 * 60 * 60 * 1000);
  const parts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ].map(part => String(part).padStart(2, '0'));

  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}
