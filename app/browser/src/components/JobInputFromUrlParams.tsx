import { FunctionalComponent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useQueryParam, StringParam } from 'use-query-params';
import {useHashParam} from "../hooks/useHashParam";
import { parse } from "shell-quote";
import {
  Box,
  Button,
  ButtonGroup,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Grid,
  GridItem,
  Input,
  Select,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
// https://chakra-ui.com/docs/media-and-icons/icon
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";
import { useHashParamJson } from "../hooks/useHashParamJson";
import { DockerJobDefinitionParamsInUrlHash, DockerJobDefinitionMetadata } from "./types";
import { DataMode, DataModeDefault } from "../utils/dataref"
// import { DataRefType } from  "../../../shared/dist/dataref";


export const JobInputFromUrlParams: FunctionalComponent<{
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}> = ({ isOpen, setOpen }) => {
  // isOpen = true;

  const [
    jobDefinitionBlob,
    setJobDefinitionBlob,
  ] = useHashParamJson<DockerJobDefinitionParamsInUrlHash>("job");

  const [
    nocacheString,
    setnocacheString,
  ] = useHashParam("nocache");

  // something like: ?x=123&foo=bar in the URL
  // const [num, setNum] = useQueryParam('x', NumberParam);
  // Allow the user to define what format the inputs are. If they can
  // tell us, then we can make data move better/faster
  const [inputsMode, setInputsMode] = useQueryParam('inputsmode', StringParam);
  const [localInputsMode, setLocalInputsMode] = useState<DataMode|undefined>(inputsMode as DataMode);

  const [localImage, setLocalImage] = useState<string | undefined>(
    jobDefinitionBlob?.image
      ? jobDefinitionBlob?.image
      : undefined
  );
  const [localCommandString, setLocalCommandString] = useState<
    string | undefined
  >(
    jobDefinitionBlob?.command
      ? jobDefinitionBlob?.command.join(" ")
      : undefined
  );

  const [localnoCache, setLocalNoCache] = useState<boolean>(
    nocacheString === "1"
  );

  const onClose = useCallback(() => {
    setOpen(!isOpen);
  }, [setOpen, isOpen]);

  const onCloseAndAccept = useCallback(() => {
    setOpen(!isOpen);

    const newJobDefinitionBlob = ({} as DockerJobDefinitionParamsInUrlHash)
    if (localImage) {
      newJobDefinitionBlob.image = localImage;
    }
    let maybeArray: string[] | undefined;
    try {
      maybeArray =
        localCommandString && localCommandString !== ""
          ? (parse(localCommandString) as string[])
          : undefined;
    } catch (err) {
      // ignore parsing errors
    }

    maybeArray = maybeArray?.map(s => typeof(s) === 'object' ? (s as {op:string}).op : s );
    newJobDefinitionBlob.command = maybeArray;
    setJobDefinitionBlob(newJobDefinitionBlob);
    setnocacheString(localnoCache ? "1" : undefined);
    if (localInputsMode !== undefined && localInputsMode !== DataMode.base64) {
      setInputsMode(localInputsMode);
    }
  }, [setOpen, isOpen, localImage, localCommandString, localnoCache, localInputsMode, setJobDefinitionBlob, setnocacheString, setInputsMode]);

  const onChangeImage = useCallback(
    // this typing/casting is awful but the only thing I found that works
    (event: any) => {
      setLocalImage((event.target as HTMLInputElement).value);
    },
    [setJobDefinitionBlob, setLocalImage]
  );

  const onChangeNoCache = useCallback(
    () => {
      setLocalNoCache(!localnoCache)
    },
    [setJobDefinitionBlob, localnoCache, setLocalNoCache]
  );

  const onChangeCommand = useCallback(
    // this typing/casting is awful but the only thing I found that works
    (event: any) => {
      const inputString: string | undefined = (event.target as HTMLInputElement)
        .value;
      setLocalCommandString(inputString);
    },
    [setJobDefinitionBlob, setLocalCommandString]
  );

  // preact complains in dev mode if this is moved out of a functional component
  useEffect(() => {
    const onKeyup = (e: KeyboardEvent) => {
      if (e.key === "Enter" && isOpen) onCloseAndAccept();
    };
    window.addEventListener("keyup", onKeyup);
    return () => {
      window.removeEventListener("keyup", onKeyup);
    };
  }, [onCloseAndAccept, isOpen]);

  useCallback((e:React.ChangeEvent<HTMLInputElement>) => {
    setLocalInputsMode(e.target.value as DataMode)
  }, [setLocalInputsMode])

  return (
    <Drawer placement="top" onClose={onCloseAndAccept} isOpen={isOpen}>
      <DrawerOverlay>
        <DrawerContent>
          <DrawerHeader borderBottomWidth="0px">
            Choose and configure docker image to run
          </DrawerHeader>
          <DrawerBody>
            <Box
              maxW="80%"
              p={2}
              borderWidth="4px"
              borderRadius="lg"
              overflow="hidden"
            >
              <Grid templateColumns="repeat(12, 1fr)" gap={6}>
                <GridItem rowSpan={1} colSpan={2}>
                  <Box
                    w="100%"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Text textAlign={"right"} verticalAlign="bottom">
                      Docker image:
                    </Text>
                  </Box>
                </GridItem>
                <GridItem rowSpan={1} colSpan={10}>
                  {" "}
                  <Box w="100%" h="10">
                    <Input
                      type="text"
                      placeholder="hello-world"
                      value={localImage}
                      onInput={onChangeImage}
                    />
                  </Box>
                </GridItem>

                <GridItem rowSpan={1} colSpan={2}>
                  <Box
                    w="100%"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Text textAlign={"right"} verticalAlign="bottom">
                      Docker image command:
                    </Text>
                  </Box>
                </GridItem>
                <GridItem rowSpan={1} colSpan={10}>
                  {" "}
                  <Box w="100%" h="10">
                    <Input
                      type="text"
                      placeholder=""
                      value={localCommandString}
                      onInput={onChangeCommand}
                    />
                  </Box>
                </GridItem>

                <GridItem rowSpan={1} colSpan={2}>
                  <Box
                    w="100%"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Text textAlign={"right"} verticalAlign="bottom">
                      Cache results:
                    </Text>
                  </Box>
                </GridItem>

                <GridItem rowSpan={1} colSpan={10}>
                  <Switch
                    // @ts-ignore
                    rightIcon={<CheckIcon />}
                    onChange={onChangeNoCache}
                    isChecked={!localnoCache}
                    value={localnoCache ? 1 : 0}
                  />
                </GridItem>

                <GridItem rowSpan={1} colSpan={2}>
                  <Box
                    w="100%"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Text textAlign={"right"} verticalAlign="bottom">
                      Inputs format:
                    </Text>
                  </Box>
                </GridItem>

                <GridItem rowSpan={1} colSpan={10}>
                <Select value={localInputsMode} onChange={(e) => setLocalInputsMode(e.target.value as DataMode)} placeholder="Select option" >
                  {
                    Object.keys(DataMode).map(datamode => <option value={datamode}>{datamode + (datamode === DataModeDefault ? " (default)": "")}</option>)
                  }
                  </Select>
                </GridItem>

                <GridItem rowSpan={1} colSpan={12}></GridItem>
                <GridItem rowSpan={1} colSpan={12}></GridItem>
                <GridItem rowSpan={1} colSpan={12}></GridItem>
                <GridItem rowSpan={1} colSpan={2}></GridItem>

                <GridItem rowSpan={1} colSpan={2}>
                  <Stack spacing={4}>
                    <ButtonGroup variant="outline" spacing="6">
                      <Button
                        colorScheme="red"
                        // @ts-ignore
                        rightIcon={<CloseIcon />}
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        colorScheme="green"
                        // @ts-ignore
                        rightIcon={<CheckIcon />}
                        onClick={onCloseAndAccept}
                      >
                        Run
                      </Button>
                    </ButtonGroup>
                  </Stack>
                </GridItem>
              </Grid>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </DrawerOverlay>
    </Drawer>
  );
};
