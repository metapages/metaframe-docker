import { FunctionalComponent } from "preact";
import { JobProcessor } from "../components/JobProcessor";
import { ServerStateProvider } from "../hooks/serverStateHook";
import { DockerJobDefinitionProvider } from "../hooks/jobDefinitionHook";
import { Workers } from "../components/Workers";
import { Jobs } from "../components/Jobs";

export const Address: FunctionalComponent = () => {
  return (
    <div class="container">
      <ServerStateProvider>
        <DockerJobDefinitionProvider>
          <JobProcessor />
        </DockerJobDefinitionProvider>
        <br />
        <Workers />
        <Jobs />
      </ServerStateProvider>
    </div>
  );
};
