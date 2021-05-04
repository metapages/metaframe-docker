import { FunctionalComponent } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import { isIframe } from "@metapages/metapage";
import { useHashParam } from "../hooks/useHashParam";
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
  Stack,
  Text,
} from "@chakra-ui/react";
// https://chakra-ui.com/docs/media-and-icons/icon
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";

const iframe = isIframe();

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
                <GridItem rowSpan={1} colSpan={2}>
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
                <GridItem rowSpan={1} colSpan={10}>
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
                        Connect
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
