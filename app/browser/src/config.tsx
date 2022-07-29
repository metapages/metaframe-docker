let serverOrigin = window.location.origin;

if (import.meta.env.VITE_SERVER_ORIGIN) {
    serverOrigin = `${import.meta.env.VITE_SERVER_ORIGIN}`;
    if (import.meta.env.DEV) {
        console.log(`SERVER_ORIGIN=${origin}`);
    }
}

export const websocketConnectionUrl = `${serverOrigin.replace("http", "ws")}${serverOrigin.endsWith("/") ? "" : "/"}browser/`;