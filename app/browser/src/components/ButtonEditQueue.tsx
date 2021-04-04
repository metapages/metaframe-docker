import { Fragment, FunctionalComponent } from "preact";
import { useCallback, useState } from "preact/hooks";
import { IconButton, Icon, Spinner } from "@chakra-ui/react";
import { JobQueue } from "./JobQueue";
import { useHashParam } from "../hooks/useHashParam";
import { useServerState } from "../hooks/serverStateHook";
import { RiSignalWifiErrorLine, RiSignalWifiFill } from "react-icons/ri";

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
      <IconButton
        verticalAlign="top"
        aria-label="Docker job queue"
        // @ts-ignore
        icon={icon}
        size="lg"
        onClick={onClick}
      />

      <JobQueue isOpen={open} setOpen={setOpen} />
    </Fragment>
  );
};
