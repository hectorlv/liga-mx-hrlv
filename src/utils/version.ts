declare const __APP_VERSION__: string;
declare const __APP_BUILD_ID__: string;
declare const __APP_BUILD_DATE__: string;

const fallbackVersion = 'dev';
const fallbackBuildId = 'local';
const fallbackBuildDate = '';

export const APP_VERSION = __APP_VERSION__ ?? fallbackVersion;
export const APP_BUILD_ID = __APP_BUILD_ID__ ?? fallbackBuildId;
export const APP_BUILD_DATE = __APP_BUILD_DATE__ ?? fallbackBuildDate;
export const APP_VERSION_LABEL = `v${APP_VERSION} · build ${APP_BUILD_ID}`;
