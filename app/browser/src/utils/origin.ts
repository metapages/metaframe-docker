let origin = window.location.origin;
if (process.env.NODE_ENV === "development") {
    console.log('process.env.NODE_ENV', process.env.NODE_ENV);
    console.log('process.env.APP_FQDN', process.env.APP_FQDN);
    console.log('process.env.APP_PORT', process.env.APP_PORT);
    origin = `https://${process.env.APP_FQDN || "docker-run.dev"}${
    process.env.APP_PORT ? ":" + process.env.APP_PORT : ""
    }`;
}

export const APP_ORIGIN = origin;
