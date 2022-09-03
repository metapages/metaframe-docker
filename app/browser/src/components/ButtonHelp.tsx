import { useCallback, useState } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  IconButton,
  DrawerCloseButton,
  Center,
} from "@chakra-ui/react";
import { isIframe } from "@metapages/metaframe-hook";
import { QuestionIcon } from "@chakra-ui/icons";

export const ButtonHelp: React.FC<{ url?: string; color?: string }> = ({
  url,
  color,
}) => {
  const [open, setOpen] = useState<boolean>(
    isIframe() || window.location.hash.length >= 3 ? false : true
  );

  url = url
    ? url
    : `${window.location.origin}${window.location.pathname}/README.md`;

  const onClick = useCallback(() => {
    setOpen(!open);
  }, [open]);

  return (
    <>
      <Center>
        <IconButton
          color={color}
          verticalAlign="top"
          aria-label="Help"
          icon={<QuestionIcon />}
          size="sm"
          onClick={onClick}
          mr="4"
        />
      </Center>
      <HelpPanel url={url} isOpen={open} setOpen={setOpen} />
    </>
  );
};

const HelpPanel: React.FC<{
  url: string;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}> = ({ isOpen, setOpen, url }) => {
  const onClose = useCallback(() => {
    setOpen(!isOpen);
  }, [setOpen, isOpen]);

  const onOverlayClick = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const iframeUrl = `https://metapages.github.io/metaframe-markdown/#?url=${url}`;

  return (
    <Drawer
      size="full"
      placement="top"
      onClose={onClose}
      isOpen={isOpen}
      onOverlayClick={onOverlayClick}
    >
      <DrawerOverlay>
        <DrawerContent>
          <DrawerCloseButton size="lg" bg="gray.100" />
          <DrawerBody>
            <iframe width="100%" height="100%" src={iframeUrl} />
          </DrawerBody>
        </DrawerContent>
      </DrawerOverlay>
    </Drawer>
  );
};
