/**
 * Processes docker runs as a queue.
 */


import EventEmitter from "https://deno.land/x/events/mod.ts"
import Docker, { Container } from "https://deno.land/x/denocker/index.ts"
import { sha256 } from "https://denopkg.com/chiefbiiko/sha256@v1.0.0/mod.ts"


enum DockerJobQueueEventType {
    Container = "CONTAINER",
    Log = "Log",
}

interface DockerJobFinish {
    id:string;
    logs: {stdout:string[], stderr:string[]};
    exitCode: number|undefined;
    error?:string;
    definition:RunDefinition;
}

export interface DockerJobQueueEvent {
    type: DockerJobQueueEventType;
    id: string;
    state ?: State;
    logs ?: {stdout?:string, stderr?:string};
    job?:DockerJobFinish;
}

interface DockerJobQueueArgs {
    cpus: number;
}

export interface RunDefinition {
    image: string;
    command?: string;
    // if the job exceeds durationMaxMs it will be killed
    durationMaxMs:number;
}
enum State {
    Queued = "QUEUED",
    Running = "RUNNING",
    Finished = "FINISHED",
}

const docker = new Docker("/var/run/docker.sock");



export class DockerJobQueue extends EventEmitter<DockerJobQueueEvent>  {
    cpus: number;
    runs: RunDefinition[];
    running: Map<string, { timeout: number, definition: RunDefinition, container: Container, logs:{stdout:string[],stderr:string[]}}>;
    finished: DockerJobFinish[];

    constructor(args?: DockerJobQueueArgs) {
        super();
        this.cpus = 1; // TODO: add to args eventually
        this.runs = [];
        this.finished = [];
        this.running = new Map();
    }

    run(definition: { image: string, command?: string }) {
        // const { image, command } = args;
        this.runs.push(definition);
        console.log('runs', this.runs);
        this._internalCheckQueue();

    }

    _internalCheckQueue() {
        // while there's spare CPUs, add docker jobs
        while (this.runs.length > 0 && Object.keys(this.running).length < this.cpus) {
            const definition = this.runs.shift()!;
            const hash = sha256Json(definition);

            let container :undefined|Container = undefined;
            const containerName = "my_container";
            try {
                container = await docker.containers.create(containerName, {
                    Image: "alpine",
                    Cmd: ["ls"],
                    StopTimeout: 10,
                  });
            } catch(err) {
                const finish :DockerJobFinish = {id: hash, definition, exitCode:undefined, logs:{stdout:[], stderr:[]}, error:`Failed to create container:\n${err}`};
                this.finished.push(finish);
                const e :DockerJobQueueEvent = {
                    type:DockerJobQueueEventType.Container,
                    id:hash,
                    job:finish,
                    state:State.Finished,
                }
                super.emit(e);
                console.log(err);
                continue;
            }

            const maxTime = 1000 * 10;
            let timeExceeded = false;
            const timeout = setTimeout(async () => {
                // this is only called if the run hasn't finished on time.
                timeExceeded = true;
                await docker.containers.kill(container.Id, "SIGKILL");
            }, maxTime);

            this.running.set(hash, {
                definition,
                timeout,
                container,
                logs:{stdout:[], stderr:[]},
            });

            docker.container.wait(container.Id).then(()=> {
                const finish :DockerJobFinish = {id: hash, definition, exitCode:undefined, logs:{stdout:[], stderr:[]}, error:`Failed to create container:\n${err}`};
                this.finished.push(finish);
                const e :DockerJobQueueEvent = {
                    type:DockerJobQueueEventType.Container,
                    id:hash,
                    job:finish,
                    state:State.Finished,
                }
                super.emit(e);
            }).catch((err) => {
                console.error(err);
            })
        }
    }
}

interface RunningJob {
    container:Container;
    stdout:
}

const runDockerJob = async (definition :RunDefinition):Promise<void> => {
    const hash = sha256Json(definition);

    let container :undefined|Container = undefined;
    const containerName = "my_container";
    try {
        container = await docker.containers.create(containerName, {
            Image: "alpine",
            Cmd: ["ls"],
            StopTimeout: 10,
            });
    } catch(err) {
        const finish :DockerJobFinish = {id: hash, definition, exitCode:undefined, logs:{stdout:[], stderr:[]}, error:`Failed to create container:\n${err}`};
        this.finished.push(finish);
        const e :DockerJobQueueEvent = {
            type:DockerJobQueueEventType.Container,
            id:hash,
            job:finish,
            state:State.Finished,
        }
        super.emit(e);
        console.log(err);
        continue;
    }

    const maxTime = 1000 * 10;
    let timeExceeded = false;
    const timeout = setTimeout(async () => {
        // this is only called if the run hasn't finished on time.
        timeExceeded = true;
        await docker.containers.kill(container.Id, "SIGKILL");
    }, maxTime);

    this.running.set(hash, {
        definition,
        timeout,
        container,
        logs:{stdout:[], stderr:[]},
    });

    docker.container.wait(container.Id).then(()=> {
        const finish :DockerJobFinish = {id: hash, definition, exitCode:undefined, logs:{stdout:[], stderr:[]}, error:`Failed to create container:\n${err}`};
        this.finished.push(finish);
        const e :DockerJobQueueEvent = {
            type:DockerJobQueueEventType.Container,
            id:hash,
            job:finish,
            state:State.Finished,
        }
        super.emit(e);
    }).catch((err) => {
        console.error(err);
    })

}

// interface DockerRun {

// }
//:({github?:string})

//const ensureDockerImage = (args :({github?:string})) => {
interface ensureGitDockerImageArgs { github?: string }
/**
 * returns the docker image name that will be build locally from the git repo
 * @param args
 */
const ensureGitDockerImage = (args: ensureGitDockerImageArgs): string => {
    const { github } = args;
    return "";
}

/**
 * Stringifies a JSON object (not any randon JS object).
 *
 * It should be noted that JS objects can have members of
 * specific type (e.g. function), that are not supported
 * by JSON.
 *
 * @param {Object} obj JSON object
 * @returns {String} stringified JSON object.
 */
const serialize = (obj: any): string => {
    if (Array.isArray(obj)) {
        return JSON.stringify(obj.map(i => serialize(i)))
    } else if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj)
            .sort()
            .map(k => `${k}:${serialize(obj[k])}`)
            .join('|')
    }

    return obj
}

const sha256Json = (obj :any) :string => sha256(serialize(obj), "utf8", "hex");
