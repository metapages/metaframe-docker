/**
 * Via Context provide the current docker job definition which is combined from metaframe inputs
 * and URL query parameters, and the means to change (some of) them
 */
import { createContext } from "preact";
import { useContext, useEffect, useState } from "preact/hooks";
import { useQueryParam, StringParam } from "use-query-params";
import { MetaframeInputMap } from "@metapages/metapage";
import {
  MetaframeContext,
  useHashParamJson,
  useHashParam,
} from "@metapages/metaframe-hook";
import {
  copyLargeBlobsToCloud,
  DataMode,
  DataModeDefault,
} from "../utils/dataref";
import { DataRefType } from "../../../shared/src/dataref/index";
import {
  DockerJobDefinitionMetadata,
  DockerJobDefinitionParamsInUrlHash,
} from "../components/types";
import {
  DockerJobDefinitionInputRefs,
  InputsBase64String,
  InputsRefs,
} from "../../../shared/dist/shared/types";

type Props = {
  children: React.ReactNode;
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
  const [definitionParamsInUrl] =
    useHashParamJson<DockerJobDefinitionParamsInUrlHash | undefined>("job");

  const metaframe = useContext(MetaframeContext);

  const [nocacheString] = useHashParam("nocache");

  const [inputsModeFromQuery] = useQueryParam("inputsmode", StringParam);

  const nocache = nocacheString === "1" ? true : false;

  const [definitionMeta, setDefinitionMeta] =
    useState<DockerJobDefinitionMetadata | undefined>(undefined);

  // if the URL inputs change, or the metaframe inputs change, maybe update the dockerJobDefinitionMeta
  useEffect(() => {
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
    definition.inputs = {};
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
        setDefinitionMeta(newJobDefinition);
      }

      return () => {
        cancelled = true;
      };
    })();
  }, [metaframe.inputs, definitionParamsInUrl, inputsModeFromQuery]);

  return (
    <DockerJobDefinitionContext.Provider value={{ definitionMeta }}>
      {children}
    </DockerJobDefinitionContext.Provider>
  );
};

export const useDockerJobDefinition = () => {
  return useContext(DockerJobDefinitionContext);
};
