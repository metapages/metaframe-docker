
import * as sourceMapSupport from "source-map-support";
sourceMapSupport.install();
import ReconnectingWebSocket from 'reconnecting-websocket';
import WebSocket from 'ws';
import { DockerJobQueue } from './queue';
import { BroadcastState, WebsocketMessage, WebsocketMessageType, WebsocketMessageSender } from '../../shared/dist/shared/types';
import { SERVER_ORIGIN } from "./util/origin"


async function start() {

  // @ts-ignore: frustrating cannot get compiler "default" import setup working
  const url = `${SERVER_ORIGIN.replace('http', 'ws')}/worker/1`;
  console.log(`🪐 connecting... ${url}...`)
  const rws: ReconnectingWebSocket = new ReconnectingWebSocket(url, [], { WebSocket: WebSocket });

  const sender: WebsocketMessageSender = (message: WebsocketMessage) => {
    rws.send(JSON.stringify(message));
  }
  const dockerJobQueue = new DockerJobQueue({ sender, cpus: 1 });

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

start();
