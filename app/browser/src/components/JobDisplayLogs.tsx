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
} from "@metapages/asman-shared";

export const JobDisplayLogs: React.FC<{
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
const DisplayLogs: React.FC<{
  stdout: boolean;
  job?: DockerJobDefinitionRow;
}> = ({ job, stdout }) => {
  const state = job?.state;

  if (!job || !state) {
    return (
      <>
        <JustLogs logs={undefined} />
      </>
    );
  }

  switch (state) {
    case DockerJobState.Finished:
      const resultFinished = job?.value as StateChangeValueWorkerFinished;
      return (
        <>
          <JustLogs
            logs={
              stdout
                ? resultFinished?.result?.stdout
                : resultFinished?.result?.stderr
            }
          />
        </>
      );
    case DockerJobState.Queued:
    case DockerJobState.ReQueued:
    case DockerJobState.Running:
      // TODO: handled streaming logs
      return (
        <>
          <JustLogs logs={undefined} />
        </>
      );
  }
};

const JustLogs: React.FC<{
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
        <>
          <Code fontSize={10}>
            {line}
          </Code>
        </>
      ))}
    </Stack>
  );
};

// lineHeight="100%" fontFamily="monospace"
