import { parse } from 'ts-command-line-args';
import fse from "fs-extra";
import machineId from 'node-machine-id';

export const VERSION: string = JSON.parse(fse.readFileSync("./package.json", 'utf8')).version;
const MACHINE_ID: string = machineId.machineIdSync().substring(0, 12);

export interface Arguments {
    cpus: number;
    server?: String;
    version?: Boolean;
    queue: String;
    id: String;
    gpus?: Boolean;
}
export const args = parse<Arguments>({
    cpus: { type: Number, alias: 'c', description: 'Number of CPUs allowed (default 1)', defaultValue: 1 },
    server: { type: String, alias: 's', description: `Custom server (default: https://docker-metapage-io.glitch.me)`, optional: true, defaultValue: "https://docker-metapage-io.glitch.me" },
    queue: { type: String, alias: 'q', description: 'Queue id. Browser links to this queue ' },
    version: { type: Boolean, alias: 'v', description: 'Print version', optional: true },
    id: { type: String, alias: 'i', description: `Worker Id (default:${MACHINE_ID})`, defaultValue: MACHINE_ID },
    gpus: { type: Boolean, alias: 'g', description: `Enable "--gpus all" flag if the job requests and the worker supports`, optional: true },
});
