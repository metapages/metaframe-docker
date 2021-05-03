
import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();
import ReconnectingWebSocket from 'reconnecting-websocket';
import WebSocket from 'ws';
import { parse } from 'ts-command-line-args';
import machineId from 'node-machine-id';
import fse from "fs-extra"
import { DockerJobQueue, DockerJobQueueArgs } from './queue';
import { BroadcastState, WebsocketMessage, WebsocketMessageType, WebsocketMessageSender } from '../../shared/dist/shared/types';
import { DEFAULT_SERVER_ORIGIN } from "./util/origin"

// running in docker doesn't automatically kill on ctrl-c
// https://github.com/nodejs/node/issues/4182
process.on('SIGINT', function () {
  process.exit();
});

const VERSION: string = JSON.parse(fse.readFileSync("./package.json", 'utf8')).version;
const MACHINE_ID: string = machineId.machineIdSync().substr(0, 12);

interface Arguments {
  cpus: number;
  server?: string;
  version?: Boolean;
  queue: String;
  id: String;
}

export async function start() {

  const args = parse<Arguments>({
    cpus: { type: Number, alias: 'c', description: 'Number of CPUs allowed (default 1)', defaultValue: 1 },
    server: { type: String, alias: 's', description: `Custom server (default:${DEFAULT_SERVER_ORIGIN})`, optional: true, defaultValue: DEFAULT_SERVER_ORIGIN },
    queue: { type: String, alias: 'q', description: 'Queue id. Browser links to this queue ' },
    version: { type: Boolean, alias: 'v', description: 'Print version', optional: true },
    id: { type: String, alias: 'i', description: `Worker Id (default:${MACHINE_ID})`, defaultValue: MACHINE_ID },
  });

  console.log('CLI:', args);

  if (args.version) {
    console.log(`Version: ${VERSION}`);
    process.exit(0);
  }

  const queueId: string = args.queue.toString();
  if (!queueId) {
    throw 'Must supply the queue id as the first argument';
  }

  // @ts-ignore: frustrating cannot get compiler "default" import setup working
  const url = `${args.server.toString().replace('http', 'ws')}/worker/${queueId}`;
  console.log(`🪐 connecting... ${url}`)
  const rws: ReconnectingWebSocket = new ReconnectingWebSocket(url, [], { WebSocket: WebSocket });

  const sender: WebsocketMessageSender = (message: WebsocketMessage) => {
    rws.send(JSON.stringify(message));
  }

  const dockerJobQueueArgs: DockerJobQueueArgs = { sender, cpus: args.cpus, id: args.id.toString() };
  const dockerJobQueue = new DockerJobQueue(dockerJobQueueArgs);

  rws.addEventListener('error', (error: any) => {
    console.log(`error=${error.message}`);
  });

  rws.addEventListener('open', () => {
    console.log(`🚀 connected! ${url} `)
    dockerJobQueue.register();
  });

  rws.addEventListener('close', () => {
    console.log(`💥🚀💥 disconnected! ${url}`)
  });

  rws.addEventListener('message', (message: MessageEvent) => {
    try {
      const messageString = message.data.toString();
      // console.log(messageString)
      if (!messageString.startsWith('{')) {
        console.log('message not JSON')
        return;
      }
      const possibleMessage: WebsocketMessage = JSON.parse(messageString);
      switch (possibleMessage.type) {
        case WebsocketMessageType.State:
          const state: BroadcastState = possibleMessage.payload as BroadcastState;
          if (!state) {
            console.log({ error: 'Missing payload in message', message });
            break;
          }
          dockerJobQueue.onState(state);
          break;
        default:
        //ignored
      }
    } catch (err) {
      console.log(err);
    }
  });
}
