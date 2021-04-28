import { h, render } from 'preact';
import { ChakraProvider } from "@chakra-ui/react";
import { App } from "./App";

render(
  <ChakraProvider>
    <App />
  </ChakraProvider>,
  document.getElementById("root")!
);
