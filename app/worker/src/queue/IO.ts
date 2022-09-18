import * as path from "path";
import fse from "fs-extra";
import klaw from "klaw";
import objectHash from "object-hash";
import { Volume } from "./DockerJob";
import {
  InputsRefs,
  DockerJobDefinitionRow,
} from "../../../shared/dist/shared/types.js";
import { asyncForEach } from "../../../shared/dist/shared/util.js";
import { DataRef } from "../../../shared/dist/dataref/index.js";
import { dataRefToFile, bufferToBase64Ref } from "./DataRefUtil";
import { args } from "../args";

// const TMPDIR = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp';
const TMPDIR = "/tmp/asman";

/**
 *
 * @param job Returns input and output docker volumes to mount into the container
 */
export const convertIOToVolumeMounts = async (
  job: DockerJobDefinitionRow
): Promise<{ inputs: Volume; outputs: Volume }> => {
  const baseDir = path.join(TMPDIR, job.hash);
  const inputsDir = path.join(baseDir, "inputs");
  const outputsDir = path.join(baseDir, "outputs");

  // create the tmp directory for inputs+outputs
  await fse.ensureDir(inputsDir);
  await fse.ensureDir(outputsDir);

  // security/consistency: empty directories, in case restarting jobs
  await fse.emptyDir(inputsDir);
  await fse.ensureDir(outputsDir);

  // make sure directories are writable
  await fse.chmod(inputsDir, 0o777);
  await fse.chmod(outputsDir, 0o777);

  console.log(`[${job.hash}] creating\n\t ${inputsDir}\n\t ${outputsDir}`);

  // copy the inputs (if any)
  const inputs = job.definition.inputs;

  if (inputs) {
    await asyncForEach(Object.keys(inputs), async (name: string) => {
      const ref: DataRef = inputs[name];
      await dataRefToFile(ref, path.join(inputsDir, name));
    });
  }

  const result = {
    inputs: {
      host: inputsDir,
      // TODO: allow this to be configurable
      container: "/inputs",
    },
    outputs: {
      host: outputsDir,
      // TODO: allow this to be configurable
      container: "/outputs",
    },
  };

  return result;
};

/**
 *
 */
export const getOutputs = async (
  job: DockerJobDefinitionRow
): Promise<InputsRefs> => {
  // TODO: duplicate code
  const baseDir = path.join(TMPDIR, job.hash);
  const outputsDir = path.join(baseDir, "outputs");

  // copy the inputs (if any)
  const outputs: InputsRefs = {};

  const files = await getFiles(outputsDir);

  await asyncForEach(files, async (file: string) => {
    // TODO: handle BIG blobs
    const ref = await fileToDataref(file);
    // const fileBuffer: Buffer = await fse.readFile(file);
    // const ref: DataRef = await bufferToBase64Ref(fileBuffer);
    outputs[file.replace(`${outputsDir}/`, "")] = ref;
  });
  console.log(
    `[${job.hash}] outputs ${JSON.stringify(outputs, null, "  ").substring(
      0,
      100
    )}`
  );
  return outputs;
};

const ENV_VAR_DATA_ITEM_LENGTH_MAX = 200;
export const fileToDataref = async (file: string): Promise<DataRef> => {
  const fileBuffer: Buffer = await fse.readFile(file);

  if (fileBuffer.length > ENV_VAR_DATA_ITEM_LENGTH_MAX) {
    const hash = objectHash.sha1(fileBuffer);
    const urlGetUpload = `${args.server}/upload/${hash}`;
    const resp = await fetch(urlGetUpload);
    if (!resp.ok) {
      throw new Error(
        `Failed to get upload URL from ${urlGetUpload} status=${resp.status}`
      );
    }
    const json: { url: string; ref: DataRef } = await resp.json();
    const responseUpload = await fetch(json.url, {
      method: "PUT",
      redirect: "follow",
      body: fileBuffer,
      headers: { "Content-Type": "application/octet-stream" },
    });
    await responseUpload.text();
    return json.ref; // the server gave us this ref to use
  } else {
    const ref: DataRef = await bufferToBase64Ref(fileBuffer);
    return ref;
  }
};

const getFiles = async (path: string): Promise<string[]> => {
  const exists = fse.pathExists(path);
  if (!exists) {
    throw `getFiles path=${path} does not exist`;
  }
  return new Promise((resolve, reject) => {
    const files: string[] = []; // files, full path
    klaw(path)
      // .pipe(excludeDirFilter)
      .on("data", (item) => {
        if (item && !item.stats.isDirectory()) files.push(item.path);
      })
      .on("error", (err: any, item: any) => {
        console.error(`error on item`, item);
        console.error(err);
        reject(err);
      })
      .on("end", () => resolve(files));
  });
};

// https://www.npmjs.com/package/klaw
// const excludeDirFilter = through2.obj(function (item, _, next) {
//     if (!item.stats.isDirectory()) this.push(item);
//     next();
// })
