import { DataRef } from "../dataref";

export type Image = string;
export type Command = string;
export type Env = { [name in string]: string } | undefined;
export type InputsRefs = { [name in string]: DataRef };
// values are base64 encoded buffers
export type InputsBase64String = { [name in string]: string };

// inputs values are base64 encoded strings
export type DockerJobDefinitionInputsBase64 = {
    image?: Image;
    command?: Command;
    env?: Env;
    // entrypoint?: string[];
    entrypoint?: string;
    workdir?:string;
    inputs?: InputsBase64String;
    durationMax?: number;
}

// as soon as the DockerJobDefinition hits the server, it is converted
// immediately to this version, otherwise big lumps in the inputs will
// completely clog up the data pipes. Stay small out there, definitions,
// you're the living entities flowing
export type DockerJobDefinitionInputRefs = Omit<DockerJobDefinitionInputsBase64, "inputs"> & {
    inputs?: InputsRefs;
}

export interface DockerRunResultWithOutputs {
    StatusCode?: number;
    stdout?: string[];
    stderr?: string[];
    error?: any;
    outputs :InputsRefs;
}

export enum DockerJobState {
    Queued = "Queued",
    ReQueued = "ReQueued",
    Running = "Running",
    Finished = "Finished",
}

export enum DockerJobFinishedReason {
    Cancelled = "Cancelled",
    TimedOut = "TimedOut",
    Success = "Success",
    Error = "Error",
    WorkerLost = "WorkerLost",
}

// export type DockerJobStateValue = StateChangeValueQueuedFromBrowser | StateChangeValueQueuedInternal | StateChangeValueRunning | StateChangeValueWorkerFinished;
export type DockerJobStateValue = StateChangeValueQueued | StateChangeValueReQueued | StateChangeValueRunning | StateChangeValueWorkerFinished;

export interface StateChange {
    // 'id' implies permanence, and you should never delete it
    // 'tag' can be changed, when a driver for the state machine
    // updates or takes over another processes control of the fsm process
    tag: string;
    state: DockerJobState;
    job: string;
    value: DockerJobStateValue
}

export interface StateChangeValueQueued {
    definition: DockerJobDefinitionInputRefs;
    time: Date;
    nocache?:boolean;
}

export interface StateChangeValueReQueued {
    time: Date;
}

export interface StateChangeValueRunning {
    worker: string;
    time: Date;
}

export interface StateChangeValueWorkerFinished {
    result?: DockerRunResultWithOutputs;
    reason: DockerJobFinishedReason;
    worker?: string;
    time: Date;
}

export interface DockerJobDefinitionRow {
    // hash of the definition.
    hash: string;
    definition: DockerJobDefinitionInputRefs;
    state: DockerJobState;
    value: DockerJobStateValue;
    history: StateChange[];
}

export type StateMap = { [id in string]: DockerJobDefinitionRow };

export interface State {
    jobs: StateMap;
}

export interface BroadcastState {
    state: State;
    workers: WorkerRegistration[];
    version: number;
    browsers: number;
}

export interface WorkerRegistration {
    id: string;
    cpus: number;
}

export enum WebsocketMessageType {
    State = "State",
    StateChange = "StateChange",
    Logs = "Logs",
    WorkerRegistration = "WorkerRegistration",
}

export type LogMessage = [string, string];

export interface WebsocketMessage {
    type: WebsocketMessageType;
    payload: BroadcastState | StateChange | LogMessage | WorkerRegistration;
}

export type WebsocketMessageSender = (message: WebsocketMessage) => void;
