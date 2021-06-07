import { FunctionalComponent } from "preact";
import {
  Box,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
} from "@chakra-ui/react";
import { useHashParam } from "@metapages/metaframe-hook";
import {
  DockerJobDefinitionRow,
  DockerJobState,
  StateChangeValueWorkerFinished,
} from "../../../shared/dist/shared/types";

export const JobDisplayOutputs: FunctionalComponent<{
  job: DockerJobDefinitionRow | undefined;
}> = ({ job }) => {
  const [queue] = useHashParam("queue");
  return (
    <Box
      maxW="100%"
      p={2}
      borderWidth="4px"
      borderRadius="lg"
      overflow="hidden"
    >
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Outputs:</Th>
          </Tr>
        </Thead>
        <Tbody>
          {getOutputNames(job).map((name) => (
            <Tr key={name}>
              <Td>{name}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
};

const getOutputNames = (job?: DockerJobDefinitionRow) => {
  if (!job?.state || job.state !== DockerJobState.Finished) {
    return [];
  }
  const result = (job.value as StateChangeValueWorkerFinished).result;
  if (result && result.outputs) {
    const names = Object.keys(result.outputs);
    names.sort();
    return names;
  }
  return [];
};
