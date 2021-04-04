import { FunctionalComponent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { Button } from "@chakra-ui/react";
import { CloseIcon, RepeatClockIcon } from "@chakra-ui/icons";
import { useServerState } from "../hooks/serverStateHook";
import { useHashParam } from "../hooks/useHashParam";
import {
  DockerJobDefinitionRow,
  DockerJobState,
  StateChange,
  DockerJobFinishedReason,
  WebsocketMessageType,
  StateChangeValueWorkerFinished,
  StateChangeValueQueued,
} from "../../../shared/dist/shared/types";

interface ButtonCancelProps {
  job?: DockerJobDefinitionRow;
}

export const ButtonCancel: FunctionalComponent<ButtonCancelProps> = ({
  job,
}) => {
  const [clicked, setClicked] = useState<boolean>(false);
  const serverState = useServerState();
  const [nocacheString, setnocacheString] = useHashParam("nocache");

  useEffect(() => {
    setClicked(false);
  }, [serverState]);

  const state = job?.state;

  const onClickCancel = useCallback(() => {
    if (serverState.stateChange && job) {
      setClicked(true);
      serverState.stateChange({
        type: WebsocketMessageType.StateChange,
        payload: {
          tag: "",
          state: DockerJobState.Finished,
          job: job.hash,
          value: {
            reason: DockerJobFinishedReason.Cancelled,
            time: new Date(),
          },
        } as StateChange,
      });
    }
  }, [job, serverState.stateChange]);

  const onClickRetry = useCallback(() => {
    if (serverState.stateChange && job) {
      setClicked(true);

      const value: StateChangeValueQueued = {
        definition: (job.history[0].value as StateChangeValueQueued).definition,
        time: new Date(),
        nocache: nocacheString === "1",
      };
      console.log('attempting stateChange')
      serverState.stateChange({
        type: WebsocketMessageType.StateChange,
        payload: {
          tag: "",
          state: DockerJobState.Queued,
          job: job.hash,
          value,
        } as StateChange,
      });
    }
  }, [job, serverState.stateChange]);

  switch (state) {
    case DockerJobState.Queued:
    case DockerJobState.Running:
      return (
        <Button
          aria-label="Cancel"
          // @ts-ignore
          leftIcon={<CloseIcon />}
          onClick={onClickCancel}
          isActive={!clicked}
          size="lg"
        ></Button>
      );
    case DockerJobState.Finished:
      const value:
        | StateChangeValueWorkerFinished
        | undefined = job?.value as StateChangeValueWorkerFinished;

      if (value) {
        switch (value.reason) {
          case DockerJobFinishedReason.Error:
          case DockerJobFinishedReason.Success:
          case DockerJobFinishedReason.Cancelled:
          case DockerJobFinishedReason.TimedOut:
            return (
              <Button
                aria-label="Re-queue"
                // @ts-ignore
                leftIcon={<RepeatClockIcon />}
                size="lg"
                onClick={onClickRetry}
              />
            );
          case DockerJobFinishedReason.WorkerLost:
            return (
              <Button
                aria-label="Disabled"
                // @ts-ignore
                leftIcon={<CloseIcon />}
                isDisabled={true}
                size="lg"
              />
            );
        }
      }
      return (
        <Button
          aria-label="Disabled"
          // @ts-ignore
          leftIcon={<CloseIcon />}
          isDisabled={true}
          size="lg"
        />
      );
    default:
      return (
        <Button
          aria-label="Disabled"
          // @ts-ignore
          leftIcon={<CloseIcon />}
          isDisabled={true}
          size="lg"
        />
      );
  }
};
