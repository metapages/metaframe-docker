import ReconnectingWebSocket from 'reconnecting-websocket';
import * as sourceMapSupport from 'source-map-support';
import WebSocket from 'ws';

import {
  args,
  VERSION,
} from './args.js';
import {
  DockerJobQueue,
  DockerJobQueueArgs,
} from './queue/index.js';
import {
  BroadcastState,
  WebsocketMessage,
  WebsocketMessageSender,
  WebsocketMessageType,
} from './shared/index.js';

sourceMapSupport.install();

// running in docker doesn't automatically kill on ctrl-c
// https://github.com/nodejs/node/issues/4182
process.on('SIGINT', function () {
  process.exit();
});

export async function start() {

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

  let timeLastPong = Date.now();
  let timeLastPing = Date.now();

  const dockerJobQueueArgs: DockerJobQueueArgs = { sender, cpus: args.cpus, id: args.id.toString() };
  const dockerJobQueue = new DockerJobQueue(dockerJobQueueArgs);

  rws.addEventListener('error', (error: any) => {
    console.log(`error=${error.message}`);
  });

  rws.addEventListener('open', () => {
    console.log(`🚀 connected! ${url} `)
    rws.send('PING');
    timeLastPing = Date.now();
    dockerJobQueue.register();
  });

  rws.addEventListener('close', () => {
    console.log(`💥🚀💥 disconnected! ${url}`)
  });

  rws.addEventListener('message', (message: MessageEvent) => {
    try {
      const messageString = message.data.toString();
      if (messageString === 'PONG') {
        timeLastPong = Date.now();

        // wait a bit then send a ping
        setTimeout(() => {
          if ((Date.now() - timeLastPing) >= 5000) {
            rws.send('PING');
            timeLastPing = Date.now();
          }
          setTimeout(() => {
            if ((Date.now() - timeLastPong) >= 10000 && rws.readyState === rws.OPEN) {
              console.log(`Reconnecting because no PONG since ${Date.now() - timeLastPong}ms `);
              rws.reconnect();
            }
          }, 10000);
        }, 5000);

        return;
      }

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
