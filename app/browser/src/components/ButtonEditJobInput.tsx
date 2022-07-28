import { IconButton, useDisclosure } from "@chakra-ui/react";
import { SettingsIcon } from "@chakra-ui/icons";
import { JobInputFromUrlParams } from "./JobInputFromUrlParams";

export const ButtonEditJobInput: React.FC = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <IconButton
        verticalAlign="top"
        aria-label="Docker configuration: image and command"
        icon={<SettingsIcon />}
        size="lg"
        onClick={onOpen}
      />
      <JobInputFromUrlParams
        isOpen={isOpen}
        onClose={onClose}
      />
    </>
  );
};
