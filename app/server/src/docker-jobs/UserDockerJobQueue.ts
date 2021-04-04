/**
 * Each unique user has their own queue of jobs and registered workers.
 * The browser will send jobs down to this queue, and the workers will
 * get and return jobs.
 *
 * Data model: finite state machines. jobs go through states.
 * Workers take jobs off the queue and have some time to get it done.
 *
 * Finished jobs stay in the state list for a few minutes before getting
 * removed. The results are cached tho
 *
 */

// eventually this should be persisted but for now it's just in memory
import { EventEmitter } from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';
import * as WebSocket from 'ws';
import { assert } from 'console';
import {
    DockerJobDefinitionInputRefs,
    DockerJobFinishedReason,
    DockerJobDefinitionRow,
    DockerJobState,
    StateChangeValueQueued,
    StateChangeValueRunning,
    StateChangeValueWorkerFinished,
    DockerJobDefinitionInputsBase64,
    State,
    StateChange,
    BroadcastState, WebsocketMessageType, WebsocketMessage, WorkerRegistration
} from '../../../shared/dist/shared/types';
// import {inputsBase64ToInputsDataRefs } from "../../../shared/dist/dataref"
import {
    shaJobDefinition,
} from '../../../shared/dist/shared/util';
import { db } from "../modules/db"

// define your events
interface Events {
    state: (s: State) => void;
}

type UserDockerJobQueueEmitter = StrictEventEmitter<EventEmitter, Events>;

/**
 * Each user has their own personal docker job queue
 * The UserDockerJobQueue handled browser and worker websocket connections
 * and communications and tracking state.
 */
export class UserDockerJobQueue extends (EventEmitter as { new(): UserDockerJobQueueEmitter }) {
    state: State;
    readonly workers: { connection: WebSocket, registration: WorkerRegistration }[];
    readonly browsers: WebSocket[];
    readonly address:string;

    constructor(address:string) {
        super();
        this.address = address;
        this.workers = [];
        this.browsers = [];
        this.state = { jobs: {} };

        // TODO get only for this queue
        const allPersistedJobInTheQueue = db.queueGetAll(this.address);
        allPersistedJobInTheQueue.forEach(j => this.state.jobs[j.hash] = j)
    }

    stateChange(change: StateChange) {

        // console.log('🌘stateChange', JSON.stringify(change, null, '  '));
        // console.log('this.state.jobs', JSON.stringify(this.state.jobs, null, '  '));

        let sendBroadcast = false;
        const jobId = change.job;

        if (change && change.state) {
            console.log(`${jobId} stateChange(${change.state}) current=${this.state.jobs[jobId] ? this.state!.jobs![jobId]!.state : ''}`)
        }

        if (change.state !== DockerJobState.Queued && !this.state.jobs[jobId]) {
            console.log(`jobId=${jobId} ignoring because not queued but there's no existing job`);
            return;
        }

        let jobRow: DockerJobDefinitionRow | undefined = this.state.jobs[jobId];

        const updateState = () => {
            jobRow!.history.push(change);
            jobRow!.state = change.state;
            jobRow!.value = change.value;
            sendBroadcast = true;
            if (change.state === DockerJobState.Queued) {
                db.queueJobAdd(this.address, jobRow!);
            } else {
                db.queueJobUpdate(this.address, jobRow!);
            }
        }

        // console.log(`🌗jobId=${jobId} jobRow=${JSON.stringify(jobRow, null, "  ")}`)
        try {
            switch (change.state) {
                // incoming state
                case DockerJobState.Finished:
                    switch (this.state.jobs[jobId].state) {
                        case DockerJobState.Queued:
                        case DockerJobState.ReQueued:
                        case DockerJobState.Running:
                            console.log(`${jobId} Job finished`)
                            updateState();
                            break;
                        case DockerJobState.Finished:
                            console.log(`${jobId} already finished?`)
                            break;
                    }
                    break;
                // incoming state
                case DockerJobState.Queued:
                    console.log(`${jobId} Job Queued`)
                    const changeStateQueued = (change.value as StateChangeValueQueued);
                    const nocache = !!changeStateQueued.nocache;
                    console.log('nocache', nocache);

                    if (this.state.jobs[jobId]) {
                        switch (this.state.jobs[jobId].state) {
                            case DockerJobState.Queued: // cached don't matter here
                            case DockerJobState.Running: // cached don't matter here
                                console.log('ignoring queue request, job already queued or running');
                                break;
                            case DockerJobState.Finished:
                                const valueFinishedPrev :StateChangeValueWorkerFinished = this.state.jobs[jobId].value as StateChangeValueWorkerFinished;
                                switch(valueFinishedPrev.reason) {
                                    case DockerJobFinishedReason.Cancelled:
                                        console.log(`${jobId} restarting from user`)
                                        updateState();
                                    case DockerJobFinishedReason.Success:
                                    case DockerJobFinishedReason.Error:
                                    case DockerJobFinishedReason.TimedOut:
                                    case DockerJobFinishedReason.WorkerLost:
                                        if (changeStateQueued.nocache) {
                                            console.log('adding to queue because nocache=1');
                                            // cache busting so wipe out the previous history
                                            updateState();
                                        } else {
                                            console.log('ignoring queue request, job pending restart or finished and not restartable');
                                        }
                                }
                                break;
                        }
                        break;
                    } else {
                        const valueQueued = change.value as StateChangeValueQueued;
                        const definition = valueQueued.definition;
                        // TODO hash job on the backend? Otherwise users can submit jobs with up jobIds that collide
                        // const hashId = shaJobDefinition(definition);
                        // if (jobId !== hashId) {
                        //     const valueFinished: StateChangeValueWorkerFinished = {
                        //         reason: DockerJobFinishedReason.Error,
                        //         result: {
                        //             error: `jobId(${jobId} !== hashId(${hashId}) from ${JSON.stringify(definition)}`,
                        //         },
                        //         time: new Date(),
                        //     }
                        //     jobRow = {
                        //         hash: jobId,
                        //         definition,
                        //         state: DockerJobState.Finished,
                        //         value: valueFinished,
                        //         history: [change],
                        //     };
                        //     this.state.jobs[jobId] = jobRow!;
                        //     sendBroadcast = true;
                        //     break;
                        // }
                        jobRow = {
                            hash: jobId,
                            definition,
                            state: DockerJobState.Queued,
                            value: valueQueued,
                            history: [],
                        };
                        this.state.jobs[jobId] = jobRow;
                        updateState();
                        sendBroadcast = true;
                    }

                    break;
                // incoming state
                case DockerJobState.Running:
                    console.log(`${jobId} Job Running, previous job ${this.state.jobs[jobId].state}`)

                    switch (this.state.jobs[jobId].state) {
                        case DockerJobState.Finished:
                            // it can NEVER go from Finished to Running
                            console.log(`${jobId} ignoring request state change ${change.state} !=> ${DockerJobState.Finished}`)
                            break;
                        // yeah running can be set again, e.g. updated the value to include sub-states
                        case DockerJobState.Running:
                            // TODO: check the worker
                            // update the value if changed, that's a sub-state
                            const valueRunningCurrent = this.state.jobs[jobId].value as StateChangeValueRunning;
                            const valueRunningIncoming = change.value as StateChangeValueRunning;
                            if (jobRow.value !== change.value && valueRunningCurrent.worker === valueRunningIncoming.worker) {
                                updateState();
                            }
                            break;
                        case DockerJobState.Queued:
                            // queued to running is great
                            // ok some other worker, or the same one, is saying it's running again
                            updateState();
                            break;
                    }
                    break;
            }
        } catch (err) {
            console.log(`💥💥💥 ERROR ${err}`);
        }

        console.log(`stateChange(${change.state}) end `)
        if (sendBroadcast) {
            // save to disk
            // resultCacheAdd

            console.log('sending broadcast')
            this.broadcast();
            if (change.state === DockerJobState.Queued) {
                db.queueJobAdd(this.address, jobRow);
            } else {
                db.queueJobUpdate(this.address, jobRow);
            }

            // when a job finishes, check the queue a bit later
            // and remove old jobs from the queue. the results
            // have already been persisted in the db
            if (change.state === DockerJobState.Finished) {
                setTimeout(() => {
                    this.removeOldFinishedJobsFromQueue();
                }, 60000);
            }
        }
        // needed?
        // this.emit('state', this.state);
    }

    removeOldFinishedJobsFromQueue() {
        // check for finished jobs around longer than a minute
        const now = Date.now();
        const oneMinute = 60000;
        let sendBroadcast = false;
        Object.keys(this.state.jobs).forEach(jobId => {
            if (this.state.jobs[jobId].state === DockerJobState.Finished) {

                const stateChange = this.state.jobs[jobId].value as StateChangeValueWorkerFinished;
                console.log('typeof(stateChange.time)', typeof(stateChange.time));
                if (typeof(stateChange.time) !== 'object') {
                    stateChange.time = new Date(stateChange.time);
                }
                if ((now - stateChange.time.getTime()) > oneMinute) {
                    console.log(`🪓 removing finished job from queue id=${jobId}`);
                    delete this.state.jobs[jobId];
                    sendBroadcast = true;
                    db.queueJobRemove(this.address, jobId);
                }
            }
        });
        if (sendBroadcast) {
            this.broadcast();
        }
    }

    connectWorker(connection: { socket: WebSocket }) {
        console.log('🔌 Connecting a worker');

        let worker: WorkerRegistration;

        connection.socket.addEventListener('close', () => {
            console.log(`🌪 Removing ${worker ? worker.id : "unknown worker"}`);
            var index = this.workers.findIndex(w => w.connection === connection.socket);
            if (index > -1) {
                assert(worker === this.workers[index].registration);
                console.log(`🌪 Removing ${this.workers[index].registration.id}`);
                this.workers.splice(index, 1);
            }
        });

        connection.socket.on('message', message => {
            try {
                const messageString = message.toString().trim();
                if (!messageString.startsWith('{')) {
                    console.log('message not JSON', message)
                    return;
                }
                const possibleMessage: WebsocketMessage = JSON.parse(messageString);
                switch (possibleMessage.type) {
                    case WebsocketMessageType.StateChange:
                        const change: StateChange = possibleMessage.payload as StateChange;
                        if (!change) {
                            console.log({ error: 'Missing payload in message', message });
                            break;
                        }
                        this.stateChange(change);
                        break;
                    case WebsocketMessageType.WorkerRegistration:
                        worker = possibleMessage.payload as WorkerRegistration;
                        if (!worker) {
                            console.log({ error: 'Missing payload in message', message });
                            break;
                        }
                        this.workers.push({ registration: worker, connection: connection.socket });
                        this.broadcast();
                        break;
                    default:
                    //ignored
                }
            } catch (err) {
                console.log(err);
            }
        });
    }

    connectBrowser(connection: { socket: WebSocket }) {
        console.log('Connecting a browser');
        this.browsers.push(connection.socket);
        connection.socket.addEventListener('close', () => {
            var index = this.browsers.indexOf(connection.socket);
            if (index > -1) {
                this.browsers.splice(index, 1);
            }
        });
        this.broadcast();

        connection.socket.on('message', message => {
            try {
                const messageString = message.toString();
                if (!messageString.startsWith('{')) {
                    console.log('message not JSON', message)
                    return;
                }
                const possibleMessage: WebsocketMessage = JSON.parse(messageString);
                switch (possibleMessage.type) {
                    case WebsocketMessageType.StateChange:
                        const change: StateChange = possibleMessage.payload as StateChange;
                        if (!change) {
                            console.log({ error: 'Missing payload in message', message });
                            break;
                        }
                        this.stateChange(change);
                        break;
                    default:
                    //ignored
                }
            } catch (err) {
                console.log(err);
            }
        });
    }

    broadcast() {
        const state: BroadcastState = {
            state: this.state,
            workers: this.workers.map(w => w.registration),
            browsers: this.browsers.length,
            version: -1,
        };
        const message: WebsocketMessage = {
            type: WebsocketMessageType.State,
            payload: state,
        }
        const messageString = JSON.stringify(message);
        this.workers.forEach(worker => {
            try {
                worker.connection.send(messageString);
            } catch (err) {
                console.log(`Failed to send broadcase to worker ${err}`);
            }
        });
        this.browsers.forEach(connection => {
            try {
                connection.send(messageString);
            } catch (err) {
                console.log(`Failed to send broadcase to worker ${err}`);
            }
        });
    }

    // utility method used for testing and poking, not actually used normally,
    // all modifications are state change requests
    // async appendJob(definition: DockerJobDefinitionInputsBase64) {
    //     const hash = shaJobDefinition(definition);
    //     // only add to the queue if no existing job
    //     console.log(`${hash} appendJob`);
    //     // TODO: convert DockerJobDefinitionInputsBase64 to DockerJobDefinitionInputRefs
    //     const inputsDataRefs = await inputsBase64ToInputsDataRefs(definition.inputs);
    //     const definitionInputRefs :DockerJobDefinitionInputRefs = {...definition, inputs:inputsDataRefs};
    //     if (!this.state.jobs[hash]) {
    //         const stateChange :StateChangeValueQueued = {
    //             definition: definitionInputRefs,
    //             time: new Date(),
    //         }
    //         this.stateChange({
    //             tag: '',
    //             state: DockerJobState.Queued,
    //             job: hash,
    //             value: stateChange,
    //         });
    //     }
    // }
}

const cacheDisabled = (job :DockerJobDefinitionRow) => {
    return (job.history[0].value as StateChangeValueQueued).nocache === true;
}
