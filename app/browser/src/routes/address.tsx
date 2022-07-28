
import { useHashParamBoolean } from "@metapages/hash-query";
import { JobProcessor } from "../components/JobProcessor";
import { ServerStateProvider } from "../hooks/serverStateHook";
import { DockerJobDefinitionProvider } from "../hooks/jobDefinitionHook";
import { Workers } from "../components/Workers";
import { Jobs } from "../components/Jobs";

export const Address: React.FC = () => {
  const [debug] = useHashParamBoolean("debug");
  return (
    <div className="container">
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
