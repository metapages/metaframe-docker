import { DockerJobDefinitionInputRefs } from "../../../shared/dist/shared/types";

export type DockerJobDefinitionParamsInUrlHash = Omit<DockerJobDefinitionInputRefs, "inputs">;

// this set of params is embedded in the URL
// export interface DockerUrlParams {
//   definition: DockerJobDefinitionParamsInUrlHash;
//   nocache: boolean;
// }

// this is the actual job definition consumed by the workers
export interface DockerJobDefinitionMetadata {
  definition: DockerJobDefinitionInputRefs;
  nocache: boolean;
}
