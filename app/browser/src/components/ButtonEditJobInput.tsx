import { Fragment, FunctionalComponent } from "preact";
import { useCallback, useState } from "preact/hooks";
import { IconButton } from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";
import { JobInputFromUrlParams } from "./JobInputFromUrlParams";

export const ButtonEditJobInput: FunctionalComponent = () => {
  const [open, setOpen] = useState<boolean>(false);

  const onClick = useCallback(() => {
    console.log('button edit click')
    setOpen(!open);
  }, [open]);

  return (
    <Fragment>
      <IconButton
        verticalAlign="top"
        aria-label="Docker configuration: image and command"
        // @ts-ignore
        icon={<EditIcon />}
        size="lg"
        onClick={onClick}
      />
      <JobInputFromUrlParams isOpen={open} setOpen={setOpen} />
    </Fragment>
  );
};