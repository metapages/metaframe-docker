import { useCallback } from "react";
import { MetaframeStandaloneComponent } from "@metapages/metapage-embed-react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  useDisclosure,
  IconButton,
} from "@chakra-ui/react";
import { EditIcon } from "@chakra-ui/icons";

export interface EditorJsonProps {
  content: string;
  onUpdate: (s: string) => void;
}

export const ButtonModalEditor: React.FC<EditorJsonProps> = ({
  content,
  onUpdate,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const onOutputs = useCallback(
    (outputs: any) => {
      if (outputs["value"] === undefined || outputs["value"] === null) {
        return;
      }
      const newValue = outputs["value"];
      onUpdate(newValue);
      onClose();
    },
    [onUpdate, onClose]
  );

  return (
    <>
      <IconButton
        size="md"
        colorScheme="blue"
        aria-label="edit"
        onClick={onOpen}
        icon={<EditIcon />}
      ></IconButton>

      <Modal isOpen={isOpen} onClose={onClose} size="full">
        <ModalOverlay />
        <ModalContent maxW="70rem">
          <ModalHeader>Edit</ModalHeader>
          <ModalCloseButton />
          <div>
            <MetaframeStandaloneComponent
              url="https://editor.mtfm.io/#?options=eyJoaWRlbWVudWlmaWZyYW1lIjp0cnVlLCJtb2RlIjoic2giLCJzYXZlbG9hZGluaGFzaCI6ZmFsc2UsInRoZW1lIjoidnMtZGFyayJ9"
              inputs={{ value: content }}
              onOutputs={onOutputs as any}
            />
          </div>
        </ModalContent>
      </Modal>
    </>
  );
};
