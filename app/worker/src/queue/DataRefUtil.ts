import * as path from "path"
import fse from "fs-extra"
import fetch from "node-fetch"
import {pipeline} from "stream";
import {promisify} from "util";
import { DataRef, DataRefType } from '../../../shared/dist/dataref/index.js';
import { SERVER_ORIGIN } from '../util/origin';
const streamPipeline = promisify(pipeline);

export const dataRefToBuffer = async (ref: DataRef): Promise<Buffer> => {
    switch(ref.type) {
        case DataRefType.base64:
            return Buffer.from(ref.value as string, 'base64');
        case DataRefType.utf8:
            return Buffer.from(ref.value as string, 'utf8');
        case DataRefType.url:
// TODO: HERE
            throw 'Not yet implemented: DataRef.type === DataRefType.Url';
        default: // undefined assume DataRefType.Base64
            throw 'Not yet implemented: DataRef.type === undefined or unknown';
    }
}

export const dataRefToFile = async (ref: DataRef, filename:string): Promise<void> => {
    const dir = path.dirname(filename);
    await fse.ensureDir(dir);
    switch(ref.type) {
        case DataRefType.base64:
            await fse.writeFile(filename, Buffer.from(ref.value as string, 'base64'));
            return;
        case DataRefType.utf8:
            await fse.writeFile(filename, Buffer.from(ref.value as string, 'utf8'));
            return;
        case DataRefType.json:
            await fse.writeFile(filename, JSON.stringify(ref.value));
            return;
        case DataRefType.url:
            let fileStream = fse.createWriteStream(filename);
            let response = await fetch(ref.value, {redirect:'follow'});
            if (!response.ok) {
                throw new Error(`Failed to download="${ref.value}" status=${response.status} statusText=${response.statusText}`);
            }
            if (!response.body) {
                throw new Error(`Failed to download="${ref.value}" status=${response.status} no body in response`);
            }
            await streamPipeline(response.body, fileStream);
            return;
        case DataRefType.hash:
            // we know how to get this internal cloud referenced
            const cloudRefUrl = `${SERVER_ORIGIN}/download/${ref.hash || ref.value}`;
            console.log('cloudRefUrl', cloudRefUrl);
            const resp = await fetch(cloudRefUrl);
            const json : { url:string, ref: DataRef} = await resp.json();
            console.log('json', json);
            console.log('json.url', json.url);

            fileStream = fse.createWriteStream(filename);
            response = await fetch(json.url, {redirect:'follow'});
            if (!response.ok) {
                throw new Error(`Failed to download="${json.url}" status=${response.status} statusText=${response.statusText}`);
            }
            if (!response.body) {
                throw new Error(`Failed to download="${json.url}" status=${response.status} no body in response`);
            }
            await streamPipeline(response.body, fileStream);
            break;
        default: // undefined assume DataRefType.Base64
            throw `Not yet implemented: DataRef.type === undefined or unrecognized value="${ref.type}"`;
    }
}

export const bufferToBase64Ref = async (buffer: Buffer): Promise<DataRef> => {
    return {
        value: buffer.toString('base64'),
        type: DataRefType.base64,
    }
}

// const downloadFile = async (url:string, path:string) => promisify(pipeline)(
//     (await fetch(url)).body as ReadableStream,
//     createWriteStream(path)
// );
