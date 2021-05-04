import { FunctionalComponent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import {
  Box,
  Button,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  TableCaption,
} from "@chakra-ui/react";
import { CloseIcon } from "@chakra-ui/icons";
import { useServerState } from "../hooks/serverStateHook";
import {
  BroadcastState,
  DockerJobState,
  StateChangeValueQueued,
  DockerJobDefinitionRow,
  WebsocketMessageType,
  StateChange,
  DockerJobFinishedReason,
} from "../../../shared/dist/shared/types";

export const Jobs: FunctionalComponent = () => {
  const serverState = useServerState();
  const state = serverState.state;

  const jobIds = state?.state?.jobs ? Object.keys(state?.state?.jobs) : [];
  jobIds.sort((jobA, jobB) => {
    const jobAActive =
      state?.state?.jobs[jobA].state === DockerJobState.Running ||
      state?.state?.jobs[jobA].state === DockerJobState.Queued;
    const jobBActive =
      state?.state?.jobs[jobB].state === DockerJobState.Running ||
      state?.state?.jobs[jobB].state === DockerJobState.Queued;
    if (jobAActive && !jobBActive) {
      return -1;
    }
    if (!jobAActive && jobBActive) {
      return 1;
    }

    const timeA = state!.state!.jobs[jobA].value.time;
    const timeB = state!.state!.jobs[jobB].value.time;
    return new Date(timeB).getTime() - new Date(timeA).getTime();
  });

  return (
    <Box
      maxW="100%"
      p={2}
      borderWidth="4px"
      borderRadius="lg"
      overflow="hidden"
    >
      <Table variant="simple">
        <TableCaption>Jobs</TableCaption>
        <Thead>
          <Tr>
            <Th>JobId (total {jobIds.length})</Th>
            <Th>image</Th>
            <Th>command</Th>
            <Th>Time</Th>
            <Th>Cancel</Th>
          </Tr>
        </Thead>
        <Tbody>
          {jobIds.map((jobHash) => (
            <JobComponent key={jobHash} jobId={jobHash} state={state!} />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

const JobComponent: FunctionalComponent<{
  jobId: string;
  state: BroadcastState;
}> = ({ jobId, state }) => {
  // How many jobs is this worker running
  const jobBlob = state.state.jobs[jobId];
  const definition = (jobBlob!.history[0]!.value as StateChangeValueQueued)
    .definition;

  return (
    <Tr>
      <Td>{jobId}</Td>
      <Td>{definition.image}</Td>
      <Td>{definition.command}</Td>
      <Td>TBD</Td>
      <Td>
        <ButtonJobCancel job={jobBlob} />
      </Td>
    </Tr>
  );
};

const ButtonJobCancel: FunctionalComponent<{ job: DockerJobDefinitionRow }> = ({
  job,
}) => {
  const [clicked, setClicked] = useState<boolean>(false);
  const serverState = useServerState();

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
          size="sm"
        ></Button>
      );
    case DockerJobState.Finished:
      return null;
    default:
      return null;
  }
};
