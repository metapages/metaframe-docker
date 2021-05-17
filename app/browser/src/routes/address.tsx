import { FunctionalComponent } from "preact";
import { useHashParamBoolean } from "@metapages/metaframe-hook";
import { JobProcessor } from "../components/JobProcessor";
import { ServerStateProvider } from "../hooks/serverStateHook";
import { DockerJobDefinitionProvider } from "../hooks/jobDefinitionHook";
import { Workers } from "../components/Workers";
import { Jobs } from "../components/Jobs";

export const Address: FunctionalComponent = () => {
  const [debug] = useHashParamBoolean("debug");
  return (
    <div class="container">
      <ServerStateProvider>
        <DockerJobDefinitionProvider>
          <JobProcessor />
        </DockerJobDefinitionProvider>
        <br />
        { debug ? <Workers /> : null }
        { debug ? <Jobs /> : null }
      </ServerStateProvider>
    </div>
  );
};
