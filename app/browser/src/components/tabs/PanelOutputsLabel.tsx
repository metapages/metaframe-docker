import { getOutputNames } from "./PanelOutputs";
import { DockerJobDefinitionRow } from "/@shared";

export const PanelOutputsLabel: React.FC<{
  job: DockerJobDefinitionRow | undefined;
}> = ({ job }) => {
  const jobCount = getOutputNames(job).length;

  return <> Outputs {`(${jobCount})`}</>;
};
