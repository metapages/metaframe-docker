import { FunctionalComponent } from "preact"
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  CircularProgress,
  HStack,
  SimpleGrid,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  TableCaption,
} from "@chakra-ui/react"
import { useServerState } from "../hooks/serverStateHook"
import {
  BroadcastState,
  DockerJobState,
  StateChangeValueRunning,
} from "../../../shared/dist/shared/types"

export const Workers: FunctionalComponent = () => {
  const serverState = useServerState();
  const state = serverState.state;

  return (
    <Box
      maxW="100%"
      p={2}
      borderWidth="4px"
      borderRadius="lg"
      overflow="hidden"
    >
      <Table variant="simple">
        <TableCaption>Workers (will run jobs)</TableCaption>
        <Thead>
          <Tr>
            <Th>Worker (total {state?.workers ? state.workers.length : 0})</Th>
            <Th>CPUs</Th>
            <Th>GPUs</Th>
            <Th>Jobs</Th>
          </Tr>
        </Thead>
        <Tbody>
          {state?.workers?.map((worker) => (
            <WorkerComponent
              key={worker.id}
              workerId={worker.id}
              state={state}
            />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

const WorkerComponent: FunctionalComponent<{
  workerId: string;
  state: BroadcastState;
}> = ({ workerId, state }) => {
  // How many jobs is this worker running
  const jobCount = Object.keys(state.state.jobs)
    .filter((jobId) => state.state.jobs[jobId].state === DockerJobState.Running)
    .reduce<number>((count: number, jobHash: string) => {
      const running = state.state.jobs[jobHash].history.filter(
        (state) => state.state === DockerJobState.Running
      );
      if (running.length > 0) {
        const workerRunning = running[running.length - 1]
          .value as StateChangeValueRunning;
        if (workerRunning.worker === workerId) {
          return count + 1;
        }
      }
      return count;
    }, 0);

  return (
    <Tr>
      <Td>{workerId}</Td>
      <Td>1</Td>
      <Td>0</Td>
      <Td>{jobCount}</Td>
    </Tr>
  );
};
