import { DockerJobDefinitionRow } from "/@shared";
import { StatusIcon } from "/@/components/StatusIcon";

export const PanelJobLabel: React.FC<{
  job: DockerJobDefinitionRow | undefined;
}> = ({ job }) => {
  return (
    <>
      <StatusIcon job={job} />
      &nbsp; Job{" "}
    </>
  );
};
