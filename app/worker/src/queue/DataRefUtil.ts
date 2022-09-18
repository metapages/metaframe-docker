import * as path from "path"
import fse from "fs-extra"
import {pipeline} from "stream";
import {promisify} from "util";
import { DataRef, DataRefType, fetchRobust as fetch} from '../../../shared/dist/dataref/index.js';
import { args } from "../args";
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
    let errString:string;
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

            const responseUrl = await fetch(ref.value, {redirect:'follow'});
            if (!responseUrl.ok) {
                errString = `Failed to download="${ref.value}" status=${responseUrl.status} statusText=${responseUrl.statusText}`;
                console.error(errString);
                throw new Error(errString);
            }

            // console.log(`fse.createWriteStream url ${filename}`)
            const fileStreamUrl = fse.createWriteStream(filename);
            // console.log(`👍 fse.createWriteStream url ${filename}`)

            if (!responseUrl.body) {
                errString = `Failed to download="${ref.value}" status=${responseUrl.status} no body in response`
                console.error(errString);
                throw new Error(errString);
            }
            // @ts-ignore
            await streamPipeline(responseUrl.body, fileStreamUrl);
            return;
        case DataRefType.hash:
            // we know how to get this internal cloud referenced
            const cloudRefUrl = `${args.server}/download/${ref.hash || ref.value}`;
            // console.log('cloudRefUrl', cloudRefUrl);
            const responseHash = await fetch(cloudRefUrl);

            // console.log(`fse.createWriteStream hash ${filename}`)
            const fileStreamHash = fse.createWriteStream(filename);
            // console.log(`👍 fse.createWriteStream hash ${filename}`)
            fileStreamHash.on('error', (err) => {
                fileStreamHash.close();
                console.error('fileStream error', err)
            });

            const json : { url:string, ref: DataRef} = await responseHash.json();
            // console.log('json', json);
            // console.log('json.url', json.url);


            // console.log('fetching')
            const responseHashUrl = await fetch(json.url, {redirect:'follow'});
            // console.log('fetched ok', responseHashUrl.ok)
            if (!responseHashUrl.ok) {
                throw new Error(`Failed to download="${json.url}" status=${responseHashUrl.status} statusText=${responseHashUrl.statusText}`);
            }
            if (!responseHashUrl.body) {
                throw new Error(`Failed to download="${json.url}" status=${responseHashUrl.status} no body in response`);
            }
            // @ts-ignore
            await streamPipeline(responseHashUrl.body, fileStreamHash);
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
