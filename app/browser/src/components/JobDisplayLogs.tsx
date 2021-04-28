import { Fragment, FunctionalComponent } from "preact";
import {
  DockerJobDefinitionRow,
  DockerJobState,
  StateChangeValueWorkerFinished,
} from "../../../shared/dist/shared/types";
import { Box, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";

export const JobDisplayLogs: FunctionalComponent<{
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
      <SimpleGrid columns={2} spacing={5}>
        <Heading size="md">stdout</Heading>
        <Heading size="md">stderr</Heading>
        <DisplayLogs job={job} />
      </SimpleGrid>
    </Box>
  );
};

// show e.g. running, or exit code, or error
const DisplayLogs: FunctionalComponent<{
  job?: DockerJobDefinitionRow;
}> = ({ job }) => {
  const state = job?.state;

  if (!job || !state) {
    return (
      <Fragment>
        <JustLogs logs={undefined} />
        <JustLogs logs={undefined} />
      </Fragment>
    );
  }

  switch (state) {
    case DockerJobState.Finished:
      const resultFinished = job?.value as StateChangeValueWorkerFinished;
      return (
        <Fragment>
          <JustLogs logs={resultFinished?.result?.stdout} />
          <JustLogs logs={resultFinished?.result?.stderr} />
        </Fragment>
      );
    case DockerJobState.Queued:
    case DockerJobState.ReQueued:
    case DockerJobState.Running:
      // TODO: handled streaming logs
      return (
        <Fragment>
          <JustLogs logs={undefined} />
          <JustLogs logs={undefined} />
        </Fragment>
      );
  }
};

const JustLogs: FunctionalComponent<{
  logs?: string[];
}> = ({ logs }) => {
  let logsNewlineHandled: string[] = [];
  if (logs) {
    logs.forEach((line) => {
      const lines = line.split("\n");
      logsNewlineHandled = logsNewlineHandled.concat(lines);
    });
  }
  return (
    <Stack spacing={3}>
      {logsNewlineHandled.map(line => (
        <Fragment>
          <Text lineHeight="60%" fontFamily="monospace">{line}</Text>
        </Fragment>
      ))}
    </Stack>
  );
};
