// Reference: https://miyauchi.dev/posts/vite-preact-typescript/

import fs from "fs";
import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

enum DeployTarget {
  GithubPages = "githubpages",
  Glitch = "glitch",
}

const APP_FQDN: string = process.env.APP_FQDN || "metaframe1.dev";
const APP_PORT: string = process.env.APP_PORT || "443";
const INSIDE_CONTAINER: boolean = fs.existsSync("/.dockerenv");

// Adapt the build to the deploy/build target idiosyncrasies
const DEPLOY_TARGET: DeployTarget = process.env.DEPLOY_TARGET as DeployTarget || DeployTarget.GithubPages;

const OUTDIR: string =
  DEPLOY_TARGET === DeployTarget.Glitch ? "dist" : process.env.OUTDIR || "dist";

const GithubPages_BUILD_SUB_DIR: string = process.env.BUILD_SUB_DIR || "";
const fileKey: string = `../ingress/https/.certs/${APP_FQDN}-key.pem`;
const fileCert: string = `../ingress/https/.certs/${APP_FQDN}.pem`;

// Get the github pages path e.g. if served from https://<name>.github.io/<repo>/
// then we need to pull out "<repo>"
const packageName = JSON.parse(
  fs.readFileSync("./package.json", { encoding: "utf8", flag: "r" })
)["name"];
const GithubPages_baseWebPath = packageName.split("/")[1];

console.log("packageName", packageName);
console.log("GithubPages_baseWebPath", GithubPages_baseWebPath);
console.log("DEPLOY_TARGET", DEPLOY_TARGET);

let base =
  DEPLOY_TARGET === DeployTarget.Glitch
    ? undefined
    : GithubPages_BUILD_SUB_DIR !== ""
    ? `/${GithubPages_baseWebPath}/v/${GithubPages_BUILD_SUB_DIR}/`
    : `/${GithubPages_baseWebPath}/`;

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  // For serving NOT at the base path e.g. with github pages: https://<user_or_org>.github.io/<repo>/
  base:
    DEPLOY_TARGET === DeployTarget.Glitch
      ? undefined
      : GithubPages_BUILD_SUB_DIR !== ""
      ? `/${GithubPages_baseWebPath}/v/${GithubPages_BUILD_SUB_DIR}/`
      : `/${GithubPages_baseWebPath}/`,
  resolve: {
    alias: {
      "/@": resolve(__dirname, "./src"),
      "@metapages/asman-shared": resolve(__dirname, "../shared/src"),
    },
  },
  // this is really stupid this should not be necessary
  plugins: [react()],
  build: {
    outDir: OUTDIR,
    target: "esnext",
    sourcemap: true,
    minify: mode === "development" ? false : "esbuild",
    emptyOutDir: DEPLOY_TARGET === DeployTarget.Glitch,
  },
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    // jsxInject: `import React from 'react'`,
  },
  server:
    DEPLOY_TARGET === DeployTarget.Glitch
      ? {
          strictPort: true,
          hmr: {
            port: 443, // Run the websocket server on the SSL port
          },
        }
      : {
          open: INSIDE_CONTAINER ? undefined : "/",
          host: INSIDE_CONTAINER ? "0.0.0.0" : APP_FQDN,
          port: parseInt(fs.existsSync(fileKey) ? APP_PORT : "8000"),
          https:
            fs.existsSync(fileKey) && fs.existsSync(fileCert)
              ? {
                  key: fs.readFileSync(fileKey),
                  cert: fs.readFileSync(fileCert),
                }
              : undefined,
        },
}));
