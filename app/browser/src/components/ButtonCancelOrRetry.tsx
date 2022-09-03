import { useCallback, useEffect, useState } from "react";
import { Button } from "@chakra-ui/react";
import { CloseIcon, RepeatClockIcon } from "@chakra-ui/icons";
import { useHashParam } from "@metapages/hash-query";
import { useServerState } from "../hooks/serverStateHook";
import {
  DockerJobDefinitionRow,
  DockerJobState,
  StateChange,
  DockerJobFinishedReason,
  WebsocketMessageType,
  StateChangeValueWorkerFinished,
  StateChangeValueQueued,
} from "/@shared";

interface ButtonCancelOrRetryProps {
  job?: DockerJobDefinitionRow;
}

export const ButtonCancelOrRetry: React.FC<ButtonCancelOrRetryProps> = ({
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
        nocache: nocacheString === "1" || nocacheString === "true",
      };

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
          leftIcon={<CloseIcon />}
          onClick={onClickCancel}
          isActive={!clicked}
          size="lg"
        >
          Cancel
        </Button>
      );
    case DockerJobState.Finished:
      const value: StateChangeValueWorkerFinished | undefined =
        job?.value as StateChangeValueWorkerFinished;

      if (value) {
        switch (value.reason) {
          case DockerJobFinishedReason.Error:
          case DockerJobFinishedReason.Success:
          case DockerJobFinishedReason.Cancelled:
          case DockerJobFinishedReason.TimedOut:
            return (
              <Button
                aria-label="Re-queue"
                leftIcon={<RepeatClockIcon />}
                size="lg"
                onClick={onClickRetry}
              >
                Re-queue
              </Button>
            );
          case DockerJobFinishedReason.WorkerLost:
            return (
              <Button
                aria-label="Disabled"
                leftIcon={<CloseIcon />}
                isDisabled={true}
                size="lg"
              >
                Cancel job
              </Button>
            );
        }
      }
      return (
        <Button
          aria-label="Disabled"
          leftIcon={<CloseIcon />}
          isDisabled={true}
          size="lg"
        />
      );
    default:
      return (
        <Button
          aria-label="Disabled"
          leftIcon={<CloseIcon />}
          isDisabled={true}
          size="lg"
        />
      );
  }
};
