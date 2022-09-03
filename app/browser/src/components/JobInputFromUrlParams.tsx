import { useCallback } from "react";
import {
  useHashParam,
  useHashParamJson,
  useHashParamBoolean,
} from "@metapages/hash-query";
import {
  Input,
  Select,
  Switch,
  Button,
  FormControl,
  FormLabel,
  InputGroup,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Heading,
  Divider,
  ModalCloseButton,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import * as yup from "yup";
import { DockerJobDefinitionParamsInUrlHash } from "./types";
import { DataMode, DataModeDefault } from "../utils/dataref";

const validationSchema = yup.object({
  image: yup.string(),
  command: yup.string(),
  entrypoint: yup.string(),
  workdir: yup.string(),
  cache: yup.boolean(),
  inputsmode: yup.string(),
  debug: yup.boolean(),
});
interface FormType extends yup.InferType<typeof validationSchema> {}

export const JobInputFromUrlParams: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [jobDefinitionBlob, setJobDefinitionBlob] =
    useHashParamJson<DockerJobDefinitionParamsInUrlHash>("job");
  const [nocache, setnocache] = useHashParamBoolean("nocache");
  const [debug, setDebug] = useHashParamBoolean("debug");
  // Allow the user to define what format the inputs are. If they can
  // tell us, then we can make data move better/faster
  const [inputsMode, setInputsMode] = useHashParam("inputsmode");

  const onSubmit = useCallback(
    (values: FormType) => {
      console.log('values', values);
      const newJobDefinitionBlob = {} as DockerJobDefinitionParamsInUrlHash;
      if (values.image) {
        newJobDefinitionBlob.image = values.image;
      }

      if (values.workdir) {
        newJobDefinitionBlob.workdir = values.workdir;
      }

      // CMD
      // let maybeCommandArray: string[] | undefined;
      // console.log('values.command', values.command);
      // try {
      //   maybeCommandArray =
      //     values.command && values.command !== ""
      //       ? (parse(values.command) as string[])
      //       : undefined;

      // console.log('maybeCommandArray', maybeCommandArray);
      // } catch (err) {
      //   // ignore parsing errors
      // }

      // maybeCommandArray = maybeCommandArray?.map((s) =>
      //   typeof s === "object" ? (s as { op: string }).op : s
      // );
      // newJobDefinitionBlob.command = maybeCommandArray;

      newJobDefinitionBlob.command = values.command

      // ENTRYPOINT
      // let maybeEntrypointArray: string[] | undefined;
      // try {
      //   maybeEntrypointArray =
      //     values.entrypoint && values.entrypoint !== ""
      //       ? (parse(values.entrypoint) as string[])
      //       : undefined;
      // } catch (err) {
      //   // ignore parsing errors
      // }
      // maybeEntrypointArray = maybeEntrypointArray?.map((s) =>
      //   typeof s === "object" ? (s as { op: string }).op : s
      // );
      // newJobDefinitionBlob.entrypoint = maybeEntrypointArray;
      newJobDefinitionBlob.entrypoint = values.entrypoint;

      setJobDefinitionBlob(newJobDefinitionBlob);
      setnocache(!values.cache);
      if (
        values.inputsmode !== undefined &&
        values.inputsmode !== DataMode.base64
      ) {
        setInputsMode(values.inputsmode);
      }

      setDebug(values.debug!!);
      onClose();
    },
    [onClose, setJobDefinitionBlob, setnocache, setInputsMode, setDebug]
  );

  const formik = useFormik({
    initialValues: {
      debug,
      image: jobDefinitionBlob?.image,
      command: jobDefinitionBlob?.command, //?.join(" "),
      entrypoint: jobDefinitionBlob?.entrypoint, //?.join(" "),
      workdir: jobDefinitionBlob?.workdir,
      cache: !nocache,
      inputsmode: inputsMode || DataModeDefault,
    },
    onSubmit,
    validationSchema,
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Configure docker batch job</ModalHeader>
        <ModalCloseButton />
        <form onSubmit={formik.handleSubmit}>
          <ModalBody>
            <Heading size="xs" textAlign="center">
              Docker container:
            </Heading>
            <br />

            <Stack direction="column" spacing="4px">
              {["image", "command", "entrypoint", "workdir"].map((key) => (
                <FormControl key={key}>
                  <FormLabel htmlFor={key}>{key}:</FormLabel>
                  <InputGroup>
                    <Input
                      id={key}
                      name={key}
                      type="text"
                      variant="filled"
                      onChange={formik.handleChange}
                      value={(formik.values as any)[key] || ""}
                    />
                  </InputGroup>
                </FormControl>
              ))}

              <br />
              <Divider />
              <Heading size="xs" textAlign="center">
                Misc:
              </Heading>

              <FormControl>
                <FormLabel htmlFor="nocache">Cache</FormLabel>
                <Switch
                  id="nocache"
                  name="cache"
                  onChange={formik.handleChange}
                  isChecked={formik.values.cache}
                />
              </FormControl>

              <FormControl>
                <FormLabel htmlFor="inputsmode">Inputs Mode</FormLabel>
                <Select
                  id="inputsmode"
                  name="inputsmode"
                  onChange={formik.handleChange}
                  value={formik.values.inputsmode}
                >
                  {Object.keys(DataMode).map((datamode) => (
                    <option value={datamode} key={datamode}>
                      {datamode +
                        (datamode === DataModeDefault ? " (default)" : "")}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel htmlFor="debug">Debug</FormLabel>
                <Switch
                  id="debug"
                  name="debug"
                  onChange={formik.handleChange}
                  isChecked={formik.values.debug}
                />
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button type="submit" colorScheme="green" mr={3}>
              ✅ OK
            </Button>
          </ModalFooter>
          {/* {error ? <Message type="error" message={error} /> : null} */}
        </form>
      </ModalContent>
    </Modal>
  );
};
