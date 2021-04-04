import { FunctionalComponent } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { useQueryParam, StringParam } from 'use-query-params';
import { Box } from "@chakra-ui/react";
import { Metaframe, MetaframeInputMap, isIframe } from "@metapages/metapage";
import { useDockerJobDefinition } from "../hooks/jobDefinitionHook";
import { useServerState } from "../hooks/serverStateHook";
import { useHashParam } from "../hooks/useHashParam";
import { shaJobDefinition } from "../../../shared/dist/shared/util";
import { DataRefType } from "../../../shared/dist/dataref";
import {
  DockerJobDefinitionRow,
  DockerJobState,
  StateChange,
  StateChangeValueQueued,
  WebsocketMessage,
  WebsocketMessageType,
  DockerJobDefinitionInputRefs,
  StateChangeValueWorkerFinished,
  InputsRefs,
} from "../../../shared/dist/shared/types";
import { JobDisplayState } from "./JobDisplayState";
import { JobDisplayLogs } from "./JobDisplayLogs";
import { JobDisplayError } from "./JobDisplayError";
// import { MetaframeContext } from '../../../metaframe-react-hook/src/metaframe/preact/metaframeHook';
// import { MetaframeContext } from '../../../metaframe-react-hook/src/metaframe/preact/metaframeHook';
import { MetaframeContext } from "../hooks/metaframeHook";
import { convertJobOutputDataRefsToExpectedFormat, DataMode, DataModeDefault } from '../utils/dataref';

export const JobProcessor: FunctionalComponent<{}> = () => {
  // this is where two complex hooks are threaded together:
  // 1. get the job definition
  // 2. send the job definition if changed
  // 3. Show the status of the current job, and allow cancelling
  // 4. If the current job is finished, send the outputs (once)
  const dockerJob = useDockerJobDefinition();
  const serverState = useServerState();
  const [jobHash, setJobHash] = useState<string | undefined>(undefined);
  const [job, setJob] = useState<DockerJobDefinitionRow | undefined>(undefined);
  const metaframe = useContext(MetaframeContext);
  const [nocacheString] = useHashParam("nocache");
  const [inputsMode ] = useQueryParam('inputsmode', StringParam);
  const outputsMode :DataMode = inputsMode as DataMode || DataModeDefault

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
      setJob(undefined);
      return;
    }
    const newJobState = serverState?.state?.state?.jobs[jobHash];
    if (!newJobState) {
      setJob(undefined);
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

  // temporary while i figure out compilation issue from upgraden
  // only maybe update metaframe outputs if the job updates and is finished (with outputs)
  useEffect(() => {
    if (
      metaframe &&
      metaframe.setOutputs &&
      job &&
      job.state === DockerJobState.Finished
    ) {
      const stateFinished: StateChangeValueWorkerFinished = job.value as StateChangeValueWorkerFinished;
      console.log("stateFinished", stateFinished);
      if (isIframe() && stateFinished?.result?.outputs) {
        const outputs: InputsRefs = stateFinished!.result!.outputs;
        console.log("outputs", outputs);
        (async () => {
          const metaframeOutputs: MetaframeInputMap|undefined = await convertJobOutputDataRefsToExpectedFormat(outputs, outputsMode);
          console.log("Setting metaframe outputs", metaframeOutputs);
          if (metaframeOutputs) {
            metaframe.setOutputs!(metaframeOutputs);
          }
        })()

      }
    }
  }, [job, metaframe]);

  // Update the local job on change
  // useEffect(() => {
  //   if (jobHash && serverState?.state?.state?.jobs[jobHash]?.state && serverState?.state?.state?.jobs[jobHash]?.state !== jobState) {
  //     setJobState(serverState?.state?.state?.jobs[jobHash].state);
  //   }
  // }, [jobHash, job, setJob, serverState?.state, setJobState]);

  // // If the job state is finished, push the outputs (if any) to the metaframe outputs
  // useEffect(() => {
  //   if (metaframe.setOutputs && jobHash && serverState?.state?.state?.jobs[jobHash].state && serverState?.state?.state?.jobs[jobHash].state === DockerJobState.Finished) {
  //     const job :DockerJobDefinitionRow = serverState.state.state.jobs[jobHash];
  //     const stateFinished = job.value as StateChangeValueWorkerFinished;
  //     if (stateFinished?.result?.outputs) {
  //       const outputs :InputsRefs = stateFinished!.result!.outputs;
  //       const metaframeOutputs :MetaframeInputMap = {};
  //       Object.keys(outputs).forEach(key => {
  //         // TODO: ensure base64, right now we're assuming, but this could change
  //         if (outputs[key].type !== DataRefType.Base64) {
  //           throw 'Currently we are assuming base64 strings as outputs SORRY pls fix me';
  //         }
  //         metaframeOutputs[key] = outputs[key].value;
  //       });
  //       console.log("Setting metaframe outputs", metaframeOutputs)
  //       metaframe?.setOutputs(metaframeOutputs);
  //     }
  //   }
  // }, [jobHash, jobState, serverState, metaframe]);

  // console.log('JobProcessor dockerJob', dockerJob);

  // let x :DockerJobDefinitionInputRefs = {} as DockerJobDefinitionInputRefs;

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
          // inputs are already minified (fat blobs uploaded to the cloud)
          const definition: DockerJobDefinitionInputRefs = dockerJob.definitionMeta!
            .definition!;
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
        } else {
          console.error("Why no state change?");
        }
      }
    }
  }, [dockerJob, serverState]);

  // TODO: streaming logs

  // const job: DockerJobDefinitionRow | undefined = jobHash
  //   ? serverState.state!.state!.jobs[jobHash]
  //   : undefined;

  return (
    <Box>
      <JobDisplayState job={job} />
      <JobDisplayError job={job} />
      <JobDisplayLogs job={job} />
    </Box>
  );
};
