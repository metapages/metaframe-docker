
import { useContext, useEffect, useState } from "react";
import { Box } from "@chakra-ui/react";
import { MetaframeInputMap, isIframe } from "@metapages/metapage";
import {
  MetaframeAndInputsContext,
  MetaframeAndInputsObject,
} from "@metapages/metaframe-hook";
import { useHashParam, useHashParamBoolean } from "@metapages/hash-query";
import { useDockerJobDefinition } from "../hooks/jobDefinitionHook";
import { useServerState } from "../hooks/serverStateHook";
import {
  shaJobDefinition,
  DockerJobDefinitionRow,
  DockerJobState,
  StateChange,
  StateChangeValueQueued,
  WebsocketMessage,
  WebsocketMessageType,
  DockerJobDefinitionInputRefs,
  StateChangeValueWorkerFinished,
  InputsRefs,
} from "@metapages/asman-shared";
import { JobDisplayState } from "./JobDisplayState";
import { JobDisplayLogs } from "./JobDisplayLogs";
import { JobDisplayError } from "./JobDisplayError";
import { JobDisplayId } from "./JobDisplayId";
import { JobDisplayOutputs } from "./JobDisplayOutputs";
import {
  convertJobOutputDataRefsToExpectedFormat,
  DataMode,
  DataModeDefault,
} from "../utils/dataref";

export const JobProcessor: React.FC<{}> = () => {
  // this is where two complex hooks are threaded together:
  // 1. get the job definition
  // 2. send the job definition if changed
  // 3. Show the status of the current job, and allow cancelling
  // 4. If the current job is finished, send the outputs (once)
  const dockerJob = useDockerJobDefinition();
  const serverState = useServerState();
  const [jobHash, setJobHash] = useState<string | undefined>(undefined);
  const [jobHashCurrentOutputs, setJobHashCurrentOutputs] = useState<
    string | undefined
  >(undefined);
  const [job, setJob] = useState<DockerJobDefinitionRow | undefined>(undefined);
  const metaframe = useContext<MetaframeAndInputsObject>(
    MetaframeAndInputsContext
  );
  const [nocacheString] = useHashParam("nocache");
  const [inputsMode] = useHashParam("inputsmode");
  // const [inputsMode] = useQueryParam("inputsmode", StringParam);
  const [debug] = useHashParamBoolean("debug");
  const outputsMode: DataMode = (inputsMode as DataMode) || DataModeDefault;

  // Update the local job hash (id) on change
  useEffect(() => {
    if (dockerJob.definitionMeta) {
      const jobHashCurrent = shaJobDefinition(
        dockerJob.definitionMeta.definition
      );

      if (jobHash !== jobHashCurrent) {
        setJobHash(jobHashCurrent);
      }
    } else {
      setJobHash(undefined);
    }
  }, [dockerJob, jobHash, setJobHash]);

  // Update the local job definition on change
  useEffect(() => {
    if (!jobHash) {
      if (job !== undefined) {
        setJob(undefined);
      }
      return;
    }
    const newJobState = serverState?.state?.state?.jobs[jobHash];
    if (!newJobState) {
      // only clear the job IF it's different from our last inputs
      if (jobHash !== jobHashCurrentOutputs) {
        setJob(undefined);
      }
    } else if (!job) {
      setJob(newJobState);
    } else {
      if (
        newJobState.hash !== job.hash ||
        newJobState.history.length !== job.history.length
      ) {
        setJob(newJobState);
      }
    }
  }, [jobHash, serverState, job, setJob]);

  // only maybe update metaframe outputs if the job updates and is finished (with outputs)
  useEffect(() => {
    const metaframeObj = metaframe?.metaframe;
    if (metaframeObj?.setOutputs && job?.state === DockerJobState.Finished) {
      const stateFinished: StateChangeValueWorkerFinished =
        job.value as StateChangeValueWorkerFinished;
      if (isIframe() && stateFinished?.result?.outputs) {
        const outputs: InputsRefs = stateFinished!.result!.outputs;
        (async () => {
          const metaframeOutputs: MetaframeInputMap | undefined =
            await convertJobOutputDataRefsToExpectedFormat(
              outputs,
              outputsMode
            );

          if (metaframeOutputs) {
            try {
              metaframeObj.setOutputs!(metaframeOutputs);
            } catch (err) {
              console.error("Failed to send metaframe outputs", err);
            }
          }
          setJobHashCurrentOutputs(job.hash);
        })();
      }
    }
  }, [job, metaframe, setJobHashCurrentOutputs]);

  // track the job state that matches our job definition (created by URL query params and inputs)
  // when we get the correct job state, it's straightforward to just show it
  useEffect(() => {
    if (dockerJob.definitionMeta && serverState && serverState.state) {
      const jobHashCurrent = shaJobDefinition(
        dockerJob.definitionMeta.definition
      );
      if (jobHash !== jobHashCurrent) {
        setJobHash(jobHashCurrent);
      }
      if (serverState.state.state.jobs[jobHashCurrent]) {
        // const existingJobState =
        //   serverState.state.state.jobs[jobHashCurrent].state;
        // Do we need to do anything here?
      } else {
        if (serverState && serverState.stateChange) {
          // no job found, let's add it
          // BUT only if our last outputs aren't this jobId
          // because the server eventually deletes our job, but we can know we have already computed it
          if (jobHashCurrentOutputs !== jobHashCurrent) {
            // inputs are already minified (fat blobs uploaded to the cloud)
            const definition: DockerJobDefinitionInputRefs =
              dockerJob.definitionMeta!.definition!;
            const value: StateChangeValueQueued = {
              definition,
              nocache: nocacheString === "1",
              time: new Date(),
            };
            const payload: StateChange = {
              state: DockerJobState.Queued,
              value,
              job: jobHashCurrent,
              tag: "", // document the meaning of this. It's the worker claim. Might be unneccesary due to history
            };

            const message: WebsocketMessage = {
              payload,
              type: WebsocketMessageType.StateChange,
            };

            serverState!.stateChange!(message);
          }
        } else {
          console.error("Why no state change?");
        }
      }
    }
  }, [dockerJob, serverState, jobHashCurrentOutputs]);

  // TODO: streaming logs

  return (
    <Box>
      {debug ? <JobDisplayId job={job} /> : null}

      <JobDisplayState job={job} />
      <JobDisplayError job={job} />
      <JobDisplayOutputs job={job} />
      <JobDisplayLogs job={job} />
    </Box>
  );
};
