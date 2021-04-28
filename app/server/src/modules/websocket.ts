import * as fastify from "fastify";
import { SocketStream } from "fastify-websocket";
import { UserDockerJobQueue } from "../docker-jobs/UserDockerJobQueue";

export interface WebsocketUrlParameters {
  token: string;
}

// in memory active queue of jobs. they're persisted to the db
// only to make this in-memory queue durable
const userJobQueues: { [id in string]: UserDockerJobQueue } = {};

export function wsHandlerBrowser(connection: SocketStream, request: fastify.FastifyRequest) {
  // const server:FastifyInstanceWithDB = this as FastifyInstanceWithDB;

  try {
    console.log(`/browser/:token wsHandler`)
    const params = request.params as WebsocketUrlParameters;
    const token = params.token;
    console.log('token', token);
    if (!token || token === "" || token === 'undefined' || token === 'null') {
      console.log('No token, closing socket');
      connection.end();
      return;
    }
    if (!userJobQueues[token]) {
      // TODO: hydrate queue from some kind of persistence
      userJobQueues[token] = new UserDockerJobQueue(token);
    }
    userJobQueues[token].connectBrowser(connection);
  } catch (err) {
    console.error(err);
  }
}

export function wsHandlerWorker(connection: SocketStream, request: fastify.FastifyRequest) {
  try {
    console.log(`/worker/:token wsHandler`)
    const params = request.params as WebsocketUrlParameters;
    const token = params.token;
    console.log('token', token);
    if (!token) {
      console.log('No token, closing socket');
      connection.end();
      return;
    }
    if (!userJobQueues[token]) {
      // TODO: hydrate queue from some kind of persistence
      userJobQueues[token] = new UserDockerJobQueue(token);
    }
    userJobQueues[token].connectWorker(connection);
  } catch (err) {
    console.error(err);
  }
}
