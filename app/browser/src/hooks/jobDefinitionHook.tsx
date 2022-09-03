/**
 * Via Context provide the current docker job definition which is combined from metaframe inputs
 * and URL query parameters, and the means to change (some of) them
 */
import { createContext, useContext, useEffect, useState } from "react";
import { MetaframeInputMap } from "@metapages/metapage";
import {
  MetaframeAndInputsContext,
  MetaframeAndInputsObject,
} from "@metapages/metaframe-hook";
import { useHashParamJson, useHashParam } from "@metapages/hash-query";
import { JobInputs } from '../components/PanelInputs';
import {
  copyLargeBlobsToCloud,
  DataMode,
  DataModeDefault,
} from "/@/utils/dataref";
import {
  DataRefType,
  DockerJobDefinitionInputRefs,
  InputsBase64String,
  InputsRefs,
} from "/@shared";
import {
  DockerJobDefinitionMetadata,
  DockerJobDefinitionParamsInUrlHash,
} from "/@/components/types";

type Props = {
  // children: React.ReactNode;
  children: any;
};

interface DockerJobDefinitionObject {
  // this is the entire job definition
  definitionMeta?: DockerJobDefinitionMetadata;
  // TODO: metaframe inputs
}

const defaultDockerJobDefinitionObject: DockerJobDefinitionObject = {
  definitionMeta: undefined,
};

const DockerJobDefinitionContext = createContext<DockerJobDefinitionObject>(
  defaultDockerJobDefinitionObject
);

export const DockerJobDefinitionProvider = ({ children }: Props) => {
  // we listen to the job parameters embedded in the URL changing
  const [definitionParamsInUrl] = useHashParamJson<
    DockerJobDefinitionParamsInUrlHash | undefined
  >("job");
  const [jobInputs] = useHashParamJson<JobInputs | undefined>(
    "inputs"
  );
  const metaframe = useContext<MetaframeAndInputsObject>(
    MetaframeAndInputsContext
  );
  const [nocacheString] = useHashParam("nocache");
  const nocache = nocacheString === "1" ? true : false;
  const [inputsModeFromQuery] = useHashParam("inputsmode");
  const [definitionMeta, setDefinitionMeta] = useState<
    DockerJobDefinitionMetadata | undefined
  >(undefined);

  // if the URL inputs change, or the metaframe inputs change, maybe update the dockerJobDefinitionMeta
  useEffect(() => {
    // console.log(`🍔 useEffect`)
    let cancelled = false;
    // we DO NOT process inputs, pass them along. The job consumer expects base64 encoded strings
    // but maybe we can be graceful and convert objects to JSON strings?
    // TODO: validate inputs as strings
    // const mode
    // The user claims inputsMode is the format of the inputs
    const inputsMode: DataMode = inputsModeFromQuery
      ? (inputsModeFromQuery as DataMode)
      : DataModeDefault;
    // So convert all possible input data types into datarefs for smallest internal representation (no big blobs)
    const definition: DockerJobDefinitionInputRefs = {
      ...definitionParamsInUrl,
    };
    definition.inputs = !jobInputs ? {} : Object.fromEntries(Object.keys(jobInputs).map((key) => {
      return [key, { type: DataRefType.utf8, value: jobInputs[key] as string }];
    }));

    // console.log("🍔 useEffect definition", definition);


    if (!definition.image) {
      setDefinitionMeta(undefined);
      return;
    }

    (async () => {
      switch (inputsMode) {
        case DataMode.dataref:
          const refsInputs = metaframe.inputs as InputsRefs;
          Object.keys(refsInputs).forEach((name) => {
            definition.inputs![name] = refsInputs[name];
          });
          break;
        case DataMode.json:
          const metaframeInputs = metaframe.inputs as MetaframeInputMap;
          Object.keys(metaframeInputs).forEach((name) => {
            definition.inputs![name] = {
              value: metaframeInputs[name],
              type: DataRefType.json,
            };
          });
          break;
        case DataMode.utf8:
          const stringInputs = metaframe.inputs as MetaframeInputMap;
          Object.keys(stringInputs).forEach((name) => {
            definition.inputs![name] = {
              value: stringInputs[name],
              type: DataRefType.utf8,
            };
          });
          break;
        // base64 is the default if unrecognized
        case DataMode.base64:
        default:
          const base64Inputs = metaframe.inputs as InputsBase64String;
          Object.keys(base64Inputs).forEach((name) => {
            definition.inputs![name] = {
              value: base64Inputs[name],
              type: DataRefType.base64,
            };
          });
          break;
      }

      // at this point, these inputs could be very large blobs.
      // any big things are uploaded to cloud storage, then the input is replaced with a reference to the cloud lump
      definition.inputs = await copyLargeBlobsToCloud(definition.inputs);

      // if uploading a large blob means new inputs have arrived and replaced this set, break out
      if (!cancelled) {
        const newJobDefinition: DockerJobDefinitionMetadata = {
          definition,
          nocache,
        };
        // console.log(`🍔 setDefinitionMeta`, newJobDefinition)
        setDefinitionMeta(newJobDefinition);
      }

      return () => {
        // console.log("🍔😞 useEffect cancelled");
        cancelled = true;
      };
    })();
  }, [metaframe.inputs, definitionParamsInUrl, jobInputs, inputsModeFromQuery]);

  return (
    <DockerJobDefinitionContext.Provider value={{ definitionMeta }}>
      {children}
    </DockerJobDefinitionContext.Provider>
  );
};

export const useDockerJobDefinition = () => {
  return useContext(DockerJobDefinitionContext);
};
