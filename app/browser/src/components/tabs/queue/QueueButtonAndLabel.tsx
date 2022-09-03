import { useCallback } from "react";
import {
  Alert,
  AlertIcon,
  IconButton,
  useDisclosure,
  Button,
  FormControl,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalOverlay,
  ModalHeader,
  ModalContent,
  HStack,
  Tag,
  Box,
} from "@chakra-ui/react";
import { RiSignalWifiErrorLine, RiSignalWifiFill } from "react-icons/ri";
import { useFormik } from "formik";
import * as yup from "yup";
import { useHashParam } from "@metapages/hash-query";
import { useServerState } from "/@/hooks/serverStateHook";

const validationSchema = yup.object({
  queue: yup.string(),
});
interface FormType extends yup.InferType<typeof validationSchema> {}

export const QueueButtonAndLabel: React.FC = () => {
  const { isOpen, onClose, onToggle } = useDisclosure();
  const [queue, setQueue] = useHashParam("queue", "");
  const serverState = useServerState();

  const onSubmit = useCallback(
    (values: FormType) => {
      setQueue(values.queue);
      formik.resetForm();
      onClose();
    },
    [onClose, setQueue]
  );

  const formik = useFormik({
    initialValues: {
      queue,
    },
    onSubmit,
    validationSchema,
  });

  const closeAndClear = useCallback(() => {
    formik.resetForm();
    onClose();
  }, [formik, onClose]);

  return (
    <HStack width="100%">

      <IconButton
        size="lg"
        onClick={onToggle}
        colorScheme="blue"
        aria-label="edit docker job queue"
        icon={queue && serverState.connected ? <RiSignalWifiFill /> : <RiSignalWifiErrorLine />}
        // isLoading={!!queue && !serverState.connected}
      />

<Box p={2}>
        {`Queue key:`} {queue ? <Tag>{queue}</Tag> : null}{" "}
      </Box>

      <Modal isOpen={isOpen} onClose={closeAndClear}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Job queue key:</ModalHeader>
          <form onSubmit={formik.handleSubmit}>
            <ModalBody>
              <FormControl>
                <InputGroup>
                  <Input
                    id="queue"
                    name="queue"
                    type="text"
                    variant="filled"
                    onChange={formik.handleChange}
                    value={formik.values.queue}
                  />
                </InputGroup>
              </FormControl>
            </ModalBody>

            <ModalFooter>
              <Button type="submit" colorScheme="green" mr={3}>
                Add
              </Button>
            </ModalFooter>
            {/* {error ? <Message type="error" message={error} /> : null} */}
          </form>
        </ModalContent>
      </Modal>

      {!queue || queue === "" ? (
        <Alert status="error">
          <AlertIcon />
          ◀️ You must connect to a queue
        </Alert>
      ) : null}
    </HStack>
  );
};
