import { FunctionalComponent } from "preact";
import {
  DockerJobDefinitionRow,
} from "../../../shared/dist/shared/types";
import {
  Box,
} from "@chakra-ui/react";

export const JobDisplayId: FunctionalComponent<{
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