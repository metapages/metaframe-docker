import { Writable } from "stream"
import fse from "fs-extra"
import * as Docker from 'dockerode'
// import { DockerRunResultWithOutputs } from '../../../shared/dist/shared/types.js';
import * as StreamTools from "../docker/streamtools"
import * as execa from "execa"

// Minimal interface for interacting with docker jobs:
//  inputs:
//    - job spec
//    - std streams writables
//  exposed/output:
//      - Promise<result>:
//          - stdout+stderr
//          - exit code
//          - errors
//          - StatusCode
//      - kill switch => Promise<void>
// just that no more.

// Docker specific
// interface DockerVolumeDef {
//   dockerOpts?: any; //:DockerConnectionOpts;
//   docker?: Docker;
//   name: string;
// }

// export interface MountedDockerVolumeDef extends DockerVolumeDef {
// /* Container mount point */
// mount?: string;
// /* This path refers to a sub path inside a docker container */
// path?: string;
// }

export interface Volume {
  host: string;
  container: string;
}

// this goes in
export interface DockerJobArgs {
  image: string;
  command?: string[] | undefined;
  env?: any;
  entrypoint?: string[] | undefined;
  workdir?: string;
  // volumes?: Array<MountedDockerVolumeDef>;
  volumes?: Array<Volume>;
  outStream?: Writable;
  errStream?: Writable;
}

// this comes out
export interface DockerJobExecution {
  finish: Promise<DockerRunResult>;
  kill: () => Promise<void>;
}

if (!fse.existsSync("/var/run/docker.sock")) {
  console.error('You must give access to the local docker daemon via: " -v /var/run/docker.sock:/var/run/docker.sock"');
  process.exit(1);
}

const docker = new Docker.default({ socketPath: "/var/run/docker.sock" });

export interface DockerRunResult {
  StatusCode?: number;
  stdout?: string[];
  stderr?: string[];
  error?: any;
}

export const dockerJobExecute = async (args: DockerJobArgs): Promise<DockerJobExecution> => {

  const { image, command, env, workdir, entrypoint, volumes, outStream, errStream } = args;

  const result: DockerRunResult = {
    stdout: [],
    stderr: [],
  }

  let container: Docker.Container | undefined;

  const kill = async (): Promise<any> => {
    if (container) {
      await killAndRemove(container);
    }
  }

  const createOptions: Docker.ContainerCreateOptions = {
    Image: image,
    Cmd: command,
    WorkingDir: workdir,
    Entrypoint: entrypoint,
    HostConfig: {},
    Env: env != null
      ? Object.keys(env).map(key => `${key}=${env[key]}`)
      : undefined,
    Tty: false, // needed for splitting stdout/err
    AttachStdout: true,
    AttachStderr: true
  };

  // if (somehow decide if GPU needed) {
  //   createOptions.HostConfig["Runtime"] = "nvidia";
  // }

  if (volumes != null) {
    createOptions.HostConfig!.Binds = [];
    volumes.forEach(volume => {
      // assert(volume.host, `Missing volume.host`);
      // assert(volume.container, `Missing volume.container`);
      createOptions.HostConfig!.Binds!.push(`${volume.host}:${volume.container}:Z`);
    });
  }

  var grabberOutStream = StreamTools.createTransformStream((s: string) => {
    result.stdout!.push(s.toString());
    return s;
  });
  if (outStream) {
    grabberOutStream.pipe(outStream!);
  }

  var grabberErrStream = StreamTools.createTransformStream((s: string) => {
    result.stderr!.push(s.toString());
    return s;
  });
  if (errStream) {
    grabberErrStream.pipe(errStream!);
  }

  console.log('createOptions', createOptions);

  const finish = async () => {

    try {
      await ensureDockerImage(image);
    } catch (err) {
      console.error(err)
      result.error = `Failure to pull or build the docker image:\n${err}`;
      return result;
    }

    container = await docker.createContainer(createOptions);
    const stream = await container!.attach({ stream: true, stdout: true, stderr: true });
    container!.modem.demuxStream(stream, grabberOutStream, grabberErrStream);

    const startData: Buffer = await container!.start();

    // console.log('startData', startData.toString('utf8'));

    const dataWait = await container!.wait();
    // console.log('dataWait', dataWait);

    result.StatusCode = dataWait != null
      ? dataWait.StatusCode
      : null;

    // remove the container out-of-band (return quickly)
    killAndRemove(container);

    return result;
  }

  return {
    kill,
    finish: finish(),
  }
}

const killAndRemove = async (container?: Docker.Container): Promise<any> => {
  if (container) {
    let killResult: any;
    try {
      killResult = await container.kill();
    } catch (err) {

    }
    (async () => {
      try {
        await container.remove();
      } catch (err) {
        console.log(`Failed to remove but ignoring error: ${err}`);
      }
    })()
    return killResult;
  }
}


// assume that no images are deleted while we are running
const CACHED_DOCKER_IMAGES: { [key: string]: boolean } = {};

const ensureDockerImage = async (image: string, pullOptions?: any): Promise<void> => {
  if (!image) {
    throw new Error('ensureDockerImage missing image');
  }
  if (CACHED_DOCKER_IMAGES[image]) {
    // console.log('FOUND IMAGE IN MY FAKE CACHE')
    return;
  }

  const imageExists = await hasImage(image);
  // console.log('imageExists', imageExists);
  if (imageExists) {
    CACHED_DOCKER_IMAGES[image] = true;
    return;
  }

  const subprocess = execa.command(`docker pull ${image}`);
  subprocess!.stdout!.pipe(process.stdout);
  subprocess!.stderr!.pipe(process.stderr);

  await subprocess;
}

const hasImage = async (imageUrl: string): Promise<boolean> => {
  const images = await docker.listImages();
  return images.some((e: any) => {
    return e.RepoTags != null && e.RepoTags.some((tag: string) => {
      return tag != null && dockerUrlMatches(parseDockerUrl(imageUrl), parseDockerUrl(tag));
    });
  });
}

const dockerUrlMatches = (a: DockerUrlBlob, b: DockerUrlBlob) => {
  if (a.repository == b.repository) {
    const tagA = a.tag;
    const tagB = b.tag;
    return !tagA || !tagB ? true : (tagA === tagB);
  } else {
    return false;
  }
}

interface DockerUrlBlob {
  repository: string;
  registry?: string;
  tag?: string;
}

const parseDockerUrl = (s: string): DockerUrlBlob => {
  s = s.trim();
  const r = /(.*\/)?([a-z0-9_-]+)(:[a-z0-9_\.-]+)?/i;
  const result = r.exec(s);
  if (!result) {
    throw `Not a docker URL: ${s}`;
  }
  let registryAndNamespace: string | undefined = result[1];
  const repository = result[2];
  let tag = result[3];
  if (tag) {
    tag = tag.substr(1);
  }
  registryAndNamespace = registryAndNamespace ? registryAndNamespace.substr(0, registryAndNamespace.length - 1) : undefined;
  let namespace: string | undefined;
  let registry: string | undefined;
  if (registryAndNamespace) {
    var tokens = registryAndNamespace.split('/');
    if (tokens.length > 1) {
      namespace = tokens.pop();
      registry = tokens.length > 0 ? tokens.join('/') : undefined;
    } else {
      //If the registry and namespace does not contain /
      //and there's no '.'/':' then there's no registry
      if (registryAndNamespace.indexOf('.') > -1 || registryAndNamespace.indexOf(':') > -1) {
        registry = registryAndNamespace;
      } else {
        namespace = registryAndNamespace;
      }
    }
  }

  var url: DockerUrlBlob = {
    repository: namespace == null ? repository : `${namespace}/${repository}`,
  }
  if (tag != null) {
    url.tag = tag;
  }
  if (registry != null) {
    url.registry = registry;
  }
  return url;
}
