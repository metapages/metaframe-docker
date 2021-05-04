let origin = window.location.origin;
if (process.env.NODE_ENV === "development") {
    origin = `https://${process.env.APP_FQDN || "docker-run.dev"}${
    process.env.APP_PORT ? ":" + process.env.APP_PORT : ""
    }`;
    console.log(`NODE_ENV=== development => APP_ORIGIN=${origin}`)
}

export const APP_ORIGIN = origin;
