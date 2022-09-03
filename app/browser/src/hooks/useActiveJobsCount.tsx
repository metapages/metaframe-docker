import { useServerState } from "./serverStateHook";
import { DockerJobState } from "/@shared";

export const useActiveJobsCount = () => {
  const serverState = useServerState();
  const state = serverState.state;

  const jobIds = (
    state?.state?.jobs ? Object.keys(state?.state?.jobs) : []
  ).filter((jobId) => {
    const jobState = state?.state?.jobs
      ? state?.state?.jobs?.[jobId]?.state
      : DockerJobState.Finished;
    return jobState !== DockerJobState.Finished;
  });

  return jobIds.length;
};
