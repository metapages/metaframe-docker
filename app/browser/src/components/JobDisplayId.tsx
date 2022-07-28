
import {
  Box,
} from "@chakra-ui/react";
import {
  DockerJobDefinitionRow,
} from "@metapages/asman-shared";

export const JobDisplayId: React.FC<{
  job: DockerJobDefinitionRow | undefined;
}> = ({ job }) => {
  return (
    <Box
      maxW="100%"
      p={2}
      borderWidth="4px"
      borderRadius="lg"
      overflow="hidden"
    >
      {job?.hash}

    </Box>
  );
};
