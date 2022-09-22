let serverOrigin = window.location.origin;

const SERVER_ORIGIN :string|undefined = import.meta.env.VITE_SERVER_ORIGIN;
if (!SERVER_ORIGIN) {
    throw "SERVER_ORIGIN MUST be defined as VITE_SERVER_ORIGIN for build and dev"
}

serverOrigin = SERVER_ORIGIN;
if (import.meta.env.DEV) {
    console.log(`SERVER_ORIGIN=${serverOrigin}`);
}

export const websocketConnectionUrl = `${serverOrigin.replace("http", "ws")}${serverOrigin.endsWith("/") ? "" : "/"}browser/`;
export const UPLOAD_DOWNLOAD_BASE_URL = SERVER_ORIGIN;
