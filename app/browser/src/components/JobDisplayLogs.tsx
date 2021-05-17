import { Fragment, FunctionalComponent } from "preact";
import {
  Box,
  Code,
  Stack,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Text,
} from "@chakra-ui/react";
import {
  DockerJobDefinitionRow,
  DockerJobState,
  StateChangeValueWorkerFinished,
} from "../../../shared/dist/shared/types";

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
      <Tabs>
        <TabList>
          <Tab>stdout</Tab>
          <Tab>stderr</Tab>
        </TabList>

        <TabPanels>
          <TabPanel background="#ECF2F7">
            <DisplayLogs job={job} stdout={true} />
          </TabPanel>
          <TabPanel>
            <DisplayLogs job={job} stdout={false} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

// show e.g. running, or exit code, or error
const DisplayLogs: FunctionalComponent<{
  stdout: boolean;
  job?: DockerJobDefinitionRow;
}> = ({ job, stdout }) => {
  const state = job?.state;

  if (!job || !state) {
    return (
      <Fragment>
        <JustLogs logs={undefined} />
      </Fragment>
    );
  }

  switch (state) {
    case DockerJobState.Finished:
      const resultFinished = job?.value as StateChangeValueWorkerFinished;
      return (
        <Fragment>
          <JustLogs
            logs={
              stdout
                ? resultFinished?.result?.stdout
                : resultFinished?.result?.stderr
            }
          />
        </Fragment>
      );
    case DockerJobState.Queued:
    case DockerJobState.ReQueued:
    case DockerJobState.Running:
      // TODO: handled streaming logs
      return (
        <Fragment>
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
    <Stack spacing={1}>
      {logsNewlineHandled.map((line) => (
        <Fragment>
          <Code fontSize={10}>
            {line}
          </Code>
        </Fragment>
      ))}
    </Stack>
  );
};

// lineHeight="100%" fontFamily="monospace"
