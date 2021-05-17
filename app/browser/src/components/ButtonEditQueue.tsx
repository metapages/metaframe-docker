import { Fragment, FunctionalComponent } from "preact";
import { useCallback, useState } from "preact/hooks";
import { Alert, AlertIcon, IconButton, Icon, Spinner } from "@chakra-ui/react";
import { RiSignalWifiErrorLine, RiSignalWifiFill } from "react-icons/ri";
import { useHashParam } from "@metapages/metaframe-hook";
import { JobQueue } from "./JobQueue";
import { useServerState } from "../hooks/serverStateHook";

export const ButtonEditQueue: FunctionalComponent = () => {
  const [open, setOpen] = useState<boolean>(false);
  const serverState = useServerState();
  const [queue] = useHashParam("queue");

  const onClick = useCallback(() => {
    setOpen(!open);
  }, [open]);

  const icon =
    queue && !serverState.connected ? (
      <Spinner />
    ) : (
      <Icon as={queue ? RiSignalWifiFill : RiSignalWifiErrorLine} />
    );

  return (
    <Fragment>
      <div>
        <IconButton
          verticalAlign="top"
          aria-label="Docker job queue"
          // @ts-ignore
          icon={icon}
          size="lg"
          onClick={onClick}
        />

        <JobQueue isOpen={open} setOpen={setOpen} />
      </div>

      {!queue || queue === "" ? (
        <Alert status="error">
          <AlertIcon />
          ◀️ You must connect to a queue
        </Alert>
      ) : null}
    </Fragment>
  );
};
