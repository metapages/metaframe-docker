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

interface RouteParams {
  address: string;
}

type Props = {
  children: React.ReactNode;
};

interface ServerStateObject {
  state?: BroadcastState | undefined;
  stateChange?: WebsocketMessageSender | undefined;
  connected: boolean;
}

const FAKESENDER = (_: WebsocketMessage)=> {
  console.log('💥💥💥✨✨✨✨ NOT sending message!')
}

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

  // const [sendMessageTest, setSendMessageTest] = useState<
  //   string
  // >('start');

  // console.log('🌵 serverStateMachine sendMessage', sendMessage);
  // console.log('🌵 serverStateMachine sendMessageTest', sendMessageTest);

  useEffect(() => {
    const url = `${APP_ORIGIN.replace("http", "ws")}/browser/${address}`;
    console.log("url", url);
    setConnected(false);
    const rws = new ReconnectingWebSocket(url);

    // setTimeout(() => {
    //   console.log('💥 TEST setSendMessage', sender);
    //   setSendMessage({sender:(m: WebsocketMessage)=> {}});
    // }, 1000)

    const onMessage = (message: MessageEvent) => {
      try {
        const messageString = message.data.toString();
        // console.log(messageString);
        if (!messageString.startsWith("{")) {
          console.log("message not JSON");
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

    const onError = (error: any) => {
      console.error(error);
    };

    const onOpen = () => {
      setConnected(true);
    };

    const onClose = () => {
      setConnected(false);
    };

    const sender = (m: WebsocketMessage) => {
      console.log('✨✨✨✨ actually sending message!', m)
      rws.send(JSON.stringify(m));
    };

    rws.addEventListener("message", onMessage);
    rws.addEventListener("error", onError);
    rws.addEventListener("open", onOpen);
    rws.addEventListener("close", onClose);

    // console.log('💥setSendMessage', sender);
    // setSendMessage(sender);
    setSendMessage({sender});

    // setSendMessageTest('inside')
    // console.log('🏓🏓🏓 end')
    return () => {
      rws.removeEventListener("message", onMessage);
      rws.removeEventListener("error", onError);
      rws.removeEventListener("open", onOpen);
      rws.removeEventListener("close", onClose);
      rws.close();
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

  // console.log('ServerStateProvider stateChange', stateChange);
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
