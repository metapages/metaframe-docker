import { h, FunctionalComponent } from "preact";
import { useEffect, useState } from "preact/hooks";
import { BrowserRouter as Router, Route } from "react-router-dom";
import { QueryParamProvider } from "use-query-params";
import { Address } from "./routes/address";
import { MetaframeObject, MetaframeContext } from "./hooks/metaframeHook";
import { Metaframe, MetaframeInputMap } from "@metapages/metapage";

export const App: FunctionalComponent = () => {
  const [metaframeObject] = useMetaframe();

  return (
    /* I tried to pull this out into it's own file but preact hates it */
    <MetaframeContext.Provider value={metaframeObject}>
      <Router>
        <QueryParamProvider ReactRouterRoute={Route}>
          <Address />
        </QueryParamProvider>
      </Router>
      ,
    </MetaframeContext.Provider>
  );
};

// ALL this before the render is to set up the metaframe provider
// I tried pulling the metaframProvider out into a separate class
// but preact crashed
const useMetaframe = () => {
  const [metaframeObject, setMetaframeObject] = useState<MetaframeObject>({
    inputs: {},
  });
  const [metaframe, setMetaframe] = useState<Metaframe | undefined>(undefined);
  const [inputs, setInputs] = useState<MetaframeInputMap>(
    metaframeObject.inputs
  );

  useEffect(() => {
    // console.log('🌱 NEW METAFRAME')
    const newMetaframe = new Metaframe();
    newMetaframe.debug = true;

    const onInputs = (newinputs: MetaframeInputMap): void => {
      // console.log('newinputs', newinputs);
      setInputs(newinputs);
    };
    newMetaframe.onInputs(onInputs);
    setMetaframe(newMetaframe);
    return () => {
      // If the metaframe is cleaned up, also remove the inputs listener
      newMetaframe.removeListener(Metaframe.INPUTS, onInputs);
      newMetaframe.dispose();
    };
  }, [setMetaframe, setInputs]);

  useEffect(() => {
    if (inputs && metaframe) {
      setMetaframeObject({
        metaframe,
        inputs,
        setOutputs: metaframe.setOutputs,
      });
    }
  }, [inputs, metaframe]);

  return [metaframeObject];
};
