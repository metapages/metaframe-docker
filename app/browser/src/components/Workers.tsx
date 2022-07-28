import {
  Box,
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
} from "@metapages/asman-shared"

export const Workers: React.FC = () => {
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
              cpus={worker.cpus}
              workerId={worker.id}
              state={state}
            />
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

const WorkerComponent: React.FC<{
  workerId: string;
  cpus: number;
  state: BroadcastState;
}> = ({ workerId, cpus, state }) => {
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
      <Td>{cpus}</Td>
      <Td>0</Td>
      <Td>{jobCount}</Td>
    </Tr>
  );
};
