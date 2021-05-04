/**
 * Gets the server state and a method to send state changes over a websocket connection
 */
import { createContext } from "preact";
import { useEffect, useState, useContext } from "preact/hooks";
import { useParams } from "react-router-dom";
import ReconnectingWebSocket from "reconnecting-websocket";
import { useHashParam } from "./useHashParam";
import {APP_ORIGIN  } from "../utils/origin";
import {
  BroadcastState,
  WebsocketMessage,
  WebsocketMessageSender,
  WebsocketMessageType,
} from "../../../shared/dist/shared/types";

// interface RouteParams {
//   address: string;
// }

type Props = {
  children: React.ReactNode;
};

interface ServerStateObject {
  state?: BroadcastState | undefined;
  stateChange?: WebsocketMessageSender | undefined;
  connected: boolean;
}

const FAKESENDER = (_: WebsocketMessage)=> {}

const serverStateMachine = (): [
  BroadcastState | undefined,
  WebsocketMessageSender,
  boolean
] => {
  // const params = useParams<RouteParams>();
  // const { address } = params;
  // const [ address ] = useHashParam('queue');
  const [address] = useHashParam("queue");
  const [connected, setConnected] = useState<boolean>(false);
  const [state, setState] = useState<BroadcastState | undefined>(undefined);
  const [sendMessage, setSendMessage] = useState<
    {sender:WebsocketMessageSender}
  >({sender:FAKESENDER});

  useEffect(() => {
    if (!address || address === '') {
      return;
    }
    const url = `${APP_ORIGIN.replace("http", "ws")}/browser/${address}`;
    setConnected(false);
    const rws = new ReconnectingWebSocket(url);

    // setTimeout(() => {
    //   console.log('💥 TEST setSendMessage', sender);
    //   setSendMessage({sender:(m: WebsocketMessage)=> {}});
    // }, 1000)

    const onMessage = (message: MessageEvent) => {
      try {
        const messageString = message.data.toString();
        if (!messageString.startsWith("{")) {
          return;
        }
        const possibleMessage: WebsocketMessage = JSON.parse(messageString);
        switch (possibleMessage.type) {
          case WebsocketMessageType.State:
            const state: BroadcastState = possibleMessage.payload as BroadcastState;
            if (!state) {
              console.log({
                error: "Missing payload in message",
                message: messageString,
              });
              break;
            }
            setState(state);
            break;
          default:
          //ignored
        }
      } catch (err) {
        console.log(err);
      }
    };

    const sender = (m: WebsocketMessage) => {
      rws.send(JSON.stringify(m));
    };

    const onError = (error: any) => {
      console.error(error);
    };

    const onOpen = () => {
      setConnected(true);
      setSendMessage({sender});
    };

    const onClose = () => {
      setConnected(false);
      setSendMessage({sender:FAKESENDER});
    };

    rws.addEventListener("message", onMessage);
    rws.addEventListener("error", onError);
    rws.addEventListener("open", onOpen);
    rws.addEventListener("close", onClose);

    return () => {
      rws.removeEventListener("message", onMessage);
      rws.removeEventListener("error", onError);
      rws.removeEventListener("open", onOpen);
      rws.removeEventListener("close", onClose);
      rws.close();
      setConnected(false);
      setSendMessage({sender:FAKESENDER});
    };
  }, [address, setState, setSendMessage, setConnected]);

  return [state, sendMessage.sender, connected];
};

const defaultServerStateObject: ServerStateObject = {
  state: undefined,
  stateChange: undefined,
  connected: false,
};

const ServerStateContext = createContext<ServerStateObject>(
  defaultServerStateObject
);

export const ServerStateProvider = ({ children }: Props) => {
  const [state, stateChange, connected] = serverStateMachine();

  return (
    <ServerStateContext.Provider
      value={{ state: state, stateChange: stateChange, connected }}
    >
      {children}
    </ServerStateContext.Provider>
  );
};

export const useServerState = () => {
  return useContext(ServerStateContext);
};
