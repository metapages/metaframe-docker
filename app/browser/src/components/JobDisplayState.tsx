import { FunctionalComponent } from "preact";
import { ButtonCancel } from "../components/ButtonCancel";
import { ButtonEditJobInput } from "../components/ButtonEditJobInput";
import { ButtonEditQueue } from "../components/ButtonEditQueue";
import { useServerState } from "../hooks/serverStateHook";
import {
  DockerJobDefinitionRow,
  DockerJobFinishedReason,
  DockerJobState,
  StateChangeValueWorkerFinished,
} from "../../../shared/dist/shared/types";
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  CircularProgress,
  HStack,
} from "@chakra-ui/react";

export const JobDisplayState: FunctionalComponent<{
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
      <HStack spacing="24px">
        <div>
          <ButtonEditQueue />
        </div>
        <div>
          <ButtonEditJobInput />
        </div>
        <JobStatusDisplay job={job} />
        <ButtonCancel job={job} />
      </HStack>
    </Box>
  );
};

// show e.g. running, or exit code, or error
const JobStatusDisplay: FunctionalComponent<{
  job: DockerJobDefinitionRow | undefined;
}> = ({ job }) => {
  const state = job?.state;

  if (!job) {
    return (
      <Alert status="error">
        <AlertIcon />
        No job definition. Click edit
      </Alert>
    );
  }

  if (!state) {
    return (
      <Alert status="error">
        <AlertIcon />
        No job state. This is a bug. Wait for a bit, otherwise click edit.
      </Alert>
    );
  }

  switch (state) {
    case DockerJobState.Finished:
      const resultFinished = job.value as StateChangeValueWorkerFinished;
      console.log('resultFinished', resultFinished);
      if (!resultFinished) {
        return (
          <Alert status="error">
            <AlertIcon />
            <AlertTitle mr={2}>
              Something went wrong and it's our fault
            </AlertTitle>
            <AlertDescription>
              The job says done but there's no other information. Try
              re-running. Sorry.
            </AlertDescription>
          </Alert>
        );
      }
      switch (resultFinished.reason) {
        case DockerJobFinishedReason.Cancelled:
          return (
            <Alert status="info">
              <AlertIcon />
              <AlertTitle>Cancelled</AlertTitle>
            </Alert>
          );
        case DockerJobFinishedReason.Error:
          return (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Failed</AlertTitle>
              <AlertDescription>
                {resultFinished?.result?.StatusCode
                  ? `Exit code: ${resultFinished.result.StatusCode}`
                  : null}
              </AlertDescription>
            </Alert>
          );
        case DockerJobFinishedReason.Success:
          return (
            <Alert
              status={
                resultFinished?.result?.StatusCode === 0 ? "success" : "warning"
              }
            >
              <AlertIcon />
              <AlertTitle>Exit code:</AlertTitle>
              {resultFinished?.result?.StatusCode}
            </Alert>
          );
        case DockerJobFinishedReason.TimedOut:
          return (
            <Alert status="warning">
              <AlertIcon />
              <AlertTitle>Timed out</AlertTitle>
              Are you allowing enough time for your job to finish?
            </Alert>
          );
        case DockerJobFinishedReason.WorkerLost:
          return (
            <Alert status="warning">
              <AlertIcon />
              Lost connection with the worker running your job, waiting to
              re-queue...
            </Alert>
          );
      }
    case DockerJobState.Queued:
    case DockerJobState.ReQueued:
      return (
        <Alert status="warning">
          <CircularProgress size="20px" isIndeterminate color="grey" />
          <AlertTitle>&nbsp;&nbsp;&nbsp;{state}</AlertTitle>
        </Alert>
      );
    case DockerJobState.Running:
      return (
        <Alert status="warning">
          <CircularProgress size="20px" isIndeterminate color="grey" />
          <AlertTitle>&nbsp;&nbsp;&nbsp;{state}</AlertTitle>
        </Alert>
      );
  }
};
