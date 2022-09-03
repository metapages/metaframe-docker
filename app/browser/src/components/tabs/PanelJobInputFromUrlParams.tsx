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
  Heading,
  VStack,
} from "@chakra-ui/react";
import { useFormik } from "formik";
import * as yup from "yup";
import { DataMode, DataModeDefault } from "/@/utils/dataref";
import { DockerJobDefinitionParamsInUrlHash } from "/@/components/types";

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

export const PanelJobInputFromUrlParams: React.FC<{
  onSave?: () => void;
}> = ({ onSave }) => {
  const [jobDefinitionBlob, setJobDefinitionBlob] =
    useHashParamJson<DockerJobDefinitionParamsInUrlHash>("job");
  const [nocache, setnocache] = useHashParamBoolean("nocache");
  const [debug, setDebug] = useHashParamBoolean("debug");
  // Allow the user to define what format the inputs are. If they can
  // tell us, then we can make data move better/faster
  const [inputsMode, setInputsMode] = useHashParam("inputsmode");

  const onSubmit = useCallback(
    (values: FormType) => {
      const newJobDefinitionBlob = {} as DockerJobDefinitionParamsInUrlHash;
      if (values.image) {
        newJobDefinitionBlob.image = values.image;
      }

      if (values.workdir) {
        newJobDefinitionBlob.workdir = values.workdir;
      }

      newJobDefinitionBlob.command = values.command
      newJobDefinitionBlob.entrypoint = values.entrypoint

      setJobDefinitionBlob(newJobDefinitionBlob);
      setnocache(!values.cache);
      if (
        values.inputsmode !== undefined &&
        values.inputsmode !== DataMode.base64
      ) {
        setInputsMode(values.inputsmode);
      }

      setDebug(values.debug!!);
      if (onSave) {
        onSave();
      }
    },
    [onSave, setJobDefinitionBlob, setnocache, setInputsMode, setDebug]
  );

  const formik = useFormik({
    initialValues: {
      debug,
      image: jobDefinitionBlob?.image,
      command: jobDefinitionBlob?.command,
      entrypoint: jobDefinitionBlob?.entrypoint,
      workdir: jobDefinitionBlob?.workdir,
      cache: !nocache,
      inputsmode: inputsMode || DataModeDefault,
    },
    onSubmit,
    validationSchema,
  });

  return (
    <VStack width="100%" alignItems="stretch">
      <form onSubmit={formik.handleSubmit}>
        <Heading size="sm">Configure docker batch job </Heading>

        <br />

        <VStack alignItems="stretch" width="100%" spacing="4px">
          <VStack
            borderWidth="1px"
            p={4}
            borderRadius="lg"
            alignItems="stretch"
            width="100%"
            spacing="4px"
          >
            <Heading size="xs" textAlign="right">
              Docker container
            </Heading>

            {["image", "command", "entrypoint", "workdir"].map((key) => (
              <FormControl key={key}>
                <FormLabel htmlFor={key}>{key}:</FormLabel>
                <InputGroup>
                  <Input
                    width="100%"
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
          </VStack>

          <br />
          {/* <Divider /> */}

          <VStack
            borderWidth="1px"
            p={4}
            borderRadius="lg"
            alignItems="stretch"
            width="100%"
            spacing="4px"
          >
            <Heading size="xs" textAlign="right">
              Misc
            </Heading>
            <br />

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
          </VStack>

          <Button alignSelf="flex-end" type="submit" colorScheme="green" mr={3}>
            ✅ OK
          </Button>
        </VStack>

        {/* {error ? <Message type="error" message={error} /> : null} */}
      </form>
    </VStack>
  );
};
