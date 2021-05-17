import { FunctionalComponent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { useHashParam } from "@metapages/metaframe-hook";
import {
  Box,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Grid,
  GridItem,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
// https://chakra-ui.com/docs/media-and-icons/icon
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";

export const JobQueue: FunctionalComponent<{
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}> = ({ isOpen, setOpen }) => {
  // isOpen = true;
  const [queue, setQueue] = useHashParam("queue");
  const [localQueue, setLocalQueue] = useState<string | undefined>(queue);

  const onClose = useCallback(() => {
    setOpen(!isOpen);
  }, [setOpen, isOpen]);

  const onCloseAndAccept = useCallback(() => {
    setOpen(false);
    setQueue(localQueue);
  }, [localQueue, setQueue]);

  const onChangeQueue = useCallback(
    // this typing/casting is awful but the only thing I found that works
    (event: any) => {
      setLocalQueue((event.target as HTMLInputElement).value);
    },
    [setLocalQueue]
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

  return (
    <Drawer placement="top" onClose={onCloseAndAccept} isOpen={isOpen}>
      <DrawerOverlay>
        <DrawerContent>
          <DrawerHeader borderBottomWidth="0px">
            Connect to a worker job queue
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
                <GridItem rowSpan={1} colSpan={3}>
                  <Box
                    w="100%"
                    h="100%"
                    display="flex"
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Text textAlign={"right"} verticalAlign="bottom">
                      Queue:
                    </Text>
                  </Box>
                </GridItem>
                <GridItem rowSpan={1} colSpan={9}>
                  {" "}
                  <Box w="100%" h="10">
                    <Input
                      type="text"
                      placeholder="myqueue"
                      value={localQueue}
                      onInput={onChangeQueue}
                    />
                  </Box>
                </GridItem>

                {/* <GridItem rowSpan={1} colSpan={2}></GridItem> */}

                <GridItem rowSpan={1} colSpan={10}></GridItem>

                <GridItem rowSpan={1} colSpan={1}>
                  {/*
                      // @ts-ignore */}
                  <IconButton
                    size="lg"
                    color="red"
                    icon={(<CloseIcon />) as any}
                    onClick={onClose}
                  />
                </GridItem>

                <GridItem rowSpan={1} colSpan={1}>
                  {/*
                      // @ts-ignore */}
                  <IconButton
                    size="lg"
                    color="green"
                    icon={(<CheckIcon />) as any}
                    onClick={onCloseAndAccept}
                  />
                </GridItem>
              </Grid>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </DrawerOverlay>
    </Drawer>
  );
};
