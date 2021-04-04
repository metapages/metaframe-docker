import { FunctionalComponent } from "preact";
import {
  DockerJobDefinitionRow,
  DockerJobFinishedReason,
  DockerJobState,
  StateChangeValueWorkerFinished,
} from "../../../shared/dist/shared/types";
import { Alert, AlertDescription, Box, Text } from "@chakra-ui/react";

/**
 * Show just the error message
 */
export const JobDisplayError: FunctionalComponent<{
  job: DockerJobDefinitionRow | undefined;
}> = ({ job }) => {
  const state = job?.state;

  if (!job || !state) {
    return null;
  }


  console.log('job', job);

  let content: JSX.Element | undefined;
  switch (state) {
    case DockerJobState.Finished:
      const resultFinished = job.value as StateChangeValueWorkerFinished;
      if (!resultFinished) {
        break;
      }

      switch (resultFinished.reason) {
        case DockerJobFinishedReason.Cancelled:
          break;
        case DockerJobFinishedReason.Error:
          content = resultFinished?.result?.error ? (
            <Alert status="error">
              <AlertDescription>
                {resultFinished.result.error?.json?.message
                  ? resultFinished.result.error!.json!.message
                  : `${resultFinished.result.error}`.split('\n').map(line => <Text lineHeight="150%" fontFamily="monospace">{line}</Text>)}
              </AlertDescription>
            </Alert>
          ) : undefined;
          break;
        case DockerJobFinishedReason.Success:
          break;
        case DockerJobFinishedReason.TimedOut:
          break;
        case DockerJobFinishedReason.WorkerLost:
          break;
      }
      break;
    case DockerJobState.Queued:
    case DockerJobState.Running:
      break;
  }

  if (!content) {
    return null;
  }

  return (
    <Box
      maxW="100%"
      p={2}
      borderWidth="4px"
      borderRadius="lg"
      overflow="hidden"
    >
      {content}
    </Box>
  );
};
