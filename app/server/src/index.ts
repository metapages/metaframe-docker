// inspired by https://github.com/sharenowTech/fastify-with-typescript-demo
import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();

import { Server, IncomingMessage, ServerResponse } from "http";
import path from "path";
import fs from "fs";
import * as fastify from "fastify";
import fastifyws from "fastify-websocket";
import fastifyBlipp from "fastify-blipp";
import fastifyCors from "fastify-cors";
import fastifyStatic from "fastify-static"
import fastifyRequestLogger from '@mgcrea/fastify-request-logger';
import envVar from "env-var"
import healthz from "./modules/routes/healthz";
import { wsHandlerBrowser, wsHandlerWorker, WebsocketUrlParameters } from "./modules/websocket";
import upload from "./modules/routes/upload";
import download from "./modules/routes/download";

const BROWSER_ASSETS_DIRECTORY :string = path.resolve(envVar.get('BROWSER_ASSETS_DIRECTORY').default("../browser/dist/").asString());


const LOG_LEVEL = 'info';

console.log(`BROWSER_ASSETS_DIRECTORY=${BROWSER_ASSETS_DIRECTORY}`);

async function start() {

  const api: fastify.FastifyInstance<Server,
    IncomingMessage,
    ServerResponse> = fastify.fastify({
      disableRequestLogging: true,
      logger: {
        level: LOG_LEVEL
      }
    });

  api.register(fastifyRequestLogger);

  // The websocket handler needs to be added before all other routes/handlers
  // https://github.com/fastify/fastify-websocket#attaching-event-handlers
  api.register(fastifyws, {
    errorHandler: function (error: any, connection: any) {
      console.log(error)
    }
  });

  api.register(fastifyBlipp);
  api.register(fastifyCors);
  api.register(healthz);

  api.register(upload);
  api.register(download);
  api.get<{ Params: WebsocketUrlParameters }>('/browser/:token', { websocket: true }, wsHandlerBrowser);
  api.get<{ Params: WebsocketUrlParameters }>('/worker/:token', { websocket: true }, wsHandlerWorker);

  // serve browser assets
  // even if using a CDN, likely makes sense to serve index.html from the main app
  console.log('readdirSync', fs.readdirSync(BROWSER_ASSETS_DIRECTORY))
  api.register(fastifyStatic, {
    root:BROWSER_ASSETS_DIRECTORY,
    wildcard: false,
  });

  // Run the server!
  const port = process.env.PORT
    ? parseInt(process.env.PORT)
    : 4000;
  try {
    console.log('1️⃣  listen')
    const address = await api.listen(port, "0.0.0.0");
    api.log.info(`🚀 🍀😎 server listening on ${address}`);
  } catch (err) {
    console.error(`Failed to start`, err);
    process.exit(1);
  }
}

start();
