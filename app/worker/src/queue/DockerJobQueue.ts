import * as path from "path"
import * as fse from "fs-extra"
import { DockerRunResult, dockerJobExecute, DockerJobArgs, DockerJobExecution, Volume } from './DockerJob'
import { InputsRefs, InputsBase64String, BroadcastState, WorkerRegistration, WebsocketMessageType, WebsocketMessageSender, DockerJobDefinitionRow, DockerJobState, StateChangeValueWorkerFinished, StateChangeValueRunning, DockerJobFinishedReason } from '../../../shared/dist/shared/types.js';
import { asyncForEach } from '../../../shared/dist/shared/util.js'
import { DataRef } from '../../../shared/dist/dataref/index.js'
import {dataRefToBuffer} from "./DataRefUtil"
import {convertIOToVolumeMounts , getOutputs} from "./IO"

export interface DockerJobQueueArgs {
    sender: WebsocketMessageSender;
    cpus: number;
}

type WorkerJobQueueItem = {
    execution:DockerJobExecution|null;
    // TODO: put local state
}

export class DockerJobQueue {
    workerId: string;
    cpus: number;
    // space in the value structure for local state
    queue: { [hash in string]: WorkerJobQueueItem } = {};

    // If we finish a job but the server is unavailabe when we request a stateChange
    // then we persist (for some interval (1 week?)) the stateChange so that when the
    // server reconnects, we can send the results
    // cachedResults: any = {};
    // Tell the server our state change requests
    sender: WebsocketMessageSender;

    constructor(args: DockerJobQueueArgs) {
        const { sender, cpus } = args;
        this.cpus = cpus || 1;
        this.sender = sender;
        this.workerId = 'docker-compose-worker';
    }

    register() {
        const registration: WorkerRegistration = {
            id: this.workerId,
        };
        this.sender({
            type: WebsocketMessageType.WorkerRegistration,
            payload: registration,
        });
    }


    // take jobs off the queue
    // kill jobs the server says to kill
    onState(state: BroadcastState) {
        // console.log(`workerState ${JSON.stringify(state, null, '  ')}`)
        this._checkRunningJobs(state);
        this._claimJobs(state);
    }

    _claimJobs(state: BroadcastState) {
        const jobs = state.state.jobs;

        // check if the server says I have a job running (that I told it)
        // but I don't have it running now (I restarted?) and didn't reconnect
        // to the running container

        const jobsServerSaysAreRunningOnMe = Object.keys(jobs).filter(key => jobs[key].state === DockerJobState.Running && (jobs[key].value as StateChangeValueRunning).worker === this.workerId);
        jobsServerSaysAreRunningOnMe.forEach(runningJobId => {
            if (!this.queue[runningJobId]) {
                this._startJob(jobs[runningJobId]);
            }
        });

        // only care about queued jobs
        const queuedJobKeys: string[] = Object.keys(jobs).filter(key => jobs[key].state === DockerJobState.Queued);
        while (queuedJobKeys.length > 0 && Object.keys(this.queue).length < this.cpus) {
            console.log('about to claim');
            this._startJob(jobs[queuedJobKeys.pop()!]);
            return;
        }
    }

    async _startJob(jobBlob: DockerJobDefinitionRow) {
        console.log(`${jobBlob.hash} starting job `)
        const definition = jobBlob.definition;

        // add a placeholder on the queue for this job
        this.queue[jobBlob.hash] = {execution:null};

        // tell the server we've started the job
        const valueRunning: StateChangeValueRunning = {
            worker: this.workerId,
            time: new Date(),
        };
        this.sender({
            type: WebsocketMessageType.StateChange,
            payload: {
                job: jobBlob.hash,
                tag: this.workerId,
                state: DockerJobState.Running,
                value: valueRunning,
            }
        });

        const volumes = await convertIOToVolumeMounts(jobBlob);

        // TODO hook up the durationMax to a timeout
        // TODO add input mounts
        const executionArgs: DockerJobArgs = {
            image: definition.image!,
            command: definition.command,
            entrypoint: definition.entrypoint,
            env: definition.env,
            volumes: [volumes.inputs, volumes.outputs],
            // outStream?: Writable;
            // errStream?: Writable;
        }

        const dockerExecution :DockerJobExecution = await dockerJobExecute(executionArgs);
        this.queue[jobBlob.hash].execution = dockerExecution;

        dockerExecution.finish.then(async (result :DockerRunResult) => {
            console.log('result', result);

            let valueFinished: StateChangeValueWorkerFinished | undefined;
            if (result.error) {
                // no outputs on error
                valueFinished = {
                    reason: DockerJobFinishedReason.Error,
                    worker: this.workerId,
                    time: new Date(),
                    result,
                };

            } else {
                // get outputs
                try {
                    const outputs = await getOutputs(jobBlob)
                    valueFinished = {
                        reason: DockerJobFinishedReason.Success,
                        worker: this.workerId,
                        time: new Date(),
                        result: {...result, outputs},
                    };
                } catch (err) {
                    console.log('failed to getOutputs', err)
                    valueFinished = {
                        reason: DockerJobFinishedReason.Error,
                        worker: this.workerId,
                        time: new Date(),
                        result: {...result, error:`${err}`},
                    };
                }

            }

            // Delete from our local queue first
            // TODO: cache locally before attempting to send
            delete this.queue[jobBlob.hash];

            this.sender({
                type: WebsocketMessageType.StateChange,
                payload: {
                    job: jobBlob.hash,
                    tag: this.workerId,
                    state: DockerJobState.Finished,
                    value: valueFinished,
                }
            });
        }).catch(err => {
            console.log(`${jobBlob.hash} errored`, err);

            // Delete from our local queue before sending
            // TODO: cache locally before attempting to send
            delete this.queue[jobBlob.hash];

            const valueError: StateChangeValueWorkerFinished = {
                reason: DockerJobFinishedReason.Error,
                worker: this.workerId,
                time: new Date(),
                result: {
                    error: err,
                },
            };

            this.sender({
                type: WebsocketMessageType.StateChange,
                payload: {
                    job: jobBlob.hash,
                    tag: this.workerId,
                    state: DockerJobState.Finished,
                    value: valueError,
                }
            });

        }).finally(() => {
            // I had the queue removal here initially but I wanted
            // to remove the element from the queue before sending to server
            // in case server send fails and throws an error
        })


    }

    _checkRunningJobs(state: BroadcastState) {
        const jobs = state.state.jobs;

        // make sure our local jobs should be running (according to the server state)
        Object.keys(this.queue).forEach(locallyRunningJobId => {

            const localJob = this.queue[locallyRunningJobId];

            // do we have local jobs the server doesn't even know about? This should never happen
            if (!jobs[locallyRunningJobId]) {
                console.log(`Cannot find local job ${locallyRunningJobId} in server state, killing and removing`);
                this._killJobAndIgnore(locallyRunningJobId);
                return;
            }

            const serverJobState = jobs[locallyRunningJobId];

            switch (serverJobState.state) {
                case DockerJobState.Finished:
                    // FINE it finished elsewhere
                    this._killJobAndIgnore(locallyRunningJobId);
                    break;
                case DockerJobState.Queued:
                    // server says queued, I say running, remind the server
                    // this can easily happen if I submit Running, but then
                    // the worker gets another update immediately
                    // The server will ignore this if it gets multiple times
                    this.sender({
                        type: WebsocketMessageType.StateChange,
                        payload: {
                            tag: this.workerId,
                            job: locallyRunningJobId,
                            state: DockerJobState.Running,
                            value: {
                                worker: this.workerId,
                                time: new Date(),
                            },
                        }
                    });
                    break;
                case DockerJobState.Running:
                    // good!
                    // except if another worker has taken it, then kill ours (server is dictator)
                    if ((serverJobState.value as StateChangeValueRunning).worker !== this.workerId) {
                        this._killJobAndIgnore(locallyRunningJobId);
                    }
                    break;
            }

            // are any jobs running locally actually killed by the server? or running
            if (serverJobState.state === DockerJobState.Finished) {
                console.log(`Cannot find local job ${locallyRunningJobId} in server state, killing and removing`);
                this._killJobAndIgnore(locallyRunningJobId);
            }
        });
        const jobKeys = Object.keys(jobs);
    }

    _killJobAndIgnore(locallyRunningJobId: string) {
        console.log(`Killing job ${locallyRunningJobId}`);
        const localJob = this.queue[locallyRunningJobId];
        delete this.queue[locallyRunningJobId];
        localJob?.execution?.kill();
    }
}
