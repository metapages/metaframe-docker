// helpers to upload large input blobs to the cloud, when required
import objectHash from "object-hash"
import { Unibabel } from "unibabel";
import { MetaframeInputMap } from "@metapages/metapage";
import { DataRef, DataRefType, DataRefTypeDefault } from "../../../shared/src/dataref";
import { InputsRefs } from "../../../shared/src/index";
import { APP_ORIGIN } from "../utils/origin";

const ENV_VAR_DATA_ITEM_LENGTH_MAX = 200;

export enum DataMode {
  dataref = "dataref",
  base64 = "base64",
  utf8 = "utf8",
  json = "json",
}

export const DataModeDefault = DataMode.base64;

// Takes map of DataRefs and checks if any are too big, if so
// uploads the data to the cloud, and replaces the data ref
// with a DataRef pointing to the cloud blob
export const copyLargeBlobsToCloud = async (inputs: InputsRefs | undefined): Promise<InputsRefs | undefined> => {
  if (!inputs) {
    return;
  }
  const result: InputsRefs = {};

  await Promise.all(Object.keys(inputs).map(async (name) => {
    const type: DataRefType = inputs[name].type || DataRefTypeDefault;
    let uint8ArrayIfBig: Uint8Array | undefined;
    switch (type) {
      case DataRefType.hash:
        // this is already cloud storage. weird. or really advanced? who knows, but trust it anyway,
        break;
      case DataRefType.json:
        throw 'TODO: check input[].type === "json"'
      case DataRefType.utf8:
        if (inputs[name] && inputs[name]?.value.length > ENV_VAR_DATA_ITEM_LENGTH_MAX) {
          uint8ArrayIfBig = Unibabel.utf8ToBuffer(inputs[name].value);
        }
        break;
      // base64 is the default if unrecognized
      case DataRefType.base64:
      default:
        if (inputs[name] && inputs[name]?.value.length > ENV_VAR_DATA_ITEM_LENGTH_MAX) {
          uint8ArrayIfBig = Unibabel.base64ToBuffer(inputs[name].value);
        }
        break;
    }

    if (uint8ArrayIfBig) {
      // upload and replace the dataref
      const hash = objectHash.sha1(uint8ArrayIfBig);
      const urlGetUpload = `${APP_ORIGIN}/upload/${hash}`;
      const resp = await fetch(urlGetUpload);
      if (!resp.ok) {
        throw new Error(`Failed to get upload URL from ${urlGetUpload} status=${resp.status}`);
      }
      const json: { url: string, ref: DataRef } = await resp.json();
      const responseUpload = await fetch(json.url, { method: 'PUT', redirect: 'follow', body: uint8ArrayIfBig, headers: { 'Content-Type': "application/octet-stream" } });
      await responseUpload.text();
      result[name] = json.ref; // the server gave us this ref to use
    } else {
      result[name] = inputs[name];
    }
  }));
  return result;
}

// Takes map of DataRefs and converts all to desired DataMode
// e.g. gets urls and downloads to local ArrayBuffers
export const convertJobOutputDataRefsToExpectedFormat = async (outputs: InputsRefs | undefined, mode: DataMode): Promise<MetaframeInputMap | undefined> => {
  if (!outputs) {
    return;
  }
  let arrayBuffer :ArrayBuffer;
  switch (mode) {
    case DataMode.base64:
      return Object.keys(outputs).reduce<MetaframeInputMap>(async (newOutputs: MetaframeInputMap, name: string) => {
        const type: DataRefType = outputs[name].type || DataRefTypeDefault;
        switch (type) {
          case DataRefType.base64:
            // well that was easy
            newOutputs[name] = outputs[name].value;
            break;
          case DataRefType.hash:
            arrayBuffer = await fetchBlobFromHash(outputs[name].hash || outputs[name].value);
            newOutputs[name] = Unibabel.bufferToBase64(arrayBuffer);
            break;
          case DataRefType.json:
            newOutputs[name] = Unibabel.utf8ToBase64(JSON.stringify(outputs[name].value));
            break;
          case DataRefType.url:
            arrayBuffer = await fetchBlobFromUrl(outputs[name].value);
            newOutputs[name] = Unibabel.bufferToBase64(arrayBuffer);
            break;
          case DataRefType.utf8:
            newOutputs[name] = Unibabel.utf8ToBase64(outputs[name].value);
            break;
        }
        return newOutputs;
      }, {} as MetaframeInputMap);
    case DataMode.dataref:
      console.log('❗❗❗ There is no actual size checking for mode=dataref')
      return outputs;
    case DataMode.json:
      return Object.keys(outputs).reduce<MetaframeInputMap>(async (newOutputs: MetaframeInputMap, name: string) => {
        const type: DataRefType = outputs[name].type || DataRefTypeDefault;
        switch (type) {
          case DataRefType.base64:
            newOutputs[name] = JSON.parse(Unibabel.base64ToUtf8(outputs[name].value));
            break;
          case DataRefType.hash:
            arrayBuffer = await fetchBlobFromHash(outputs[name].hash || outputs[name].value);
            newOutputs[name] = JSON.parse(Unibabel.bufferToUtf8(arrayBuffer));
            break;
          case DataRefType.json:
            newOutputs[name] = outputs[name].value;
            break;
          case DataRefType.url:
            arrayBuffer = await fetchBlobFromUrl(outputs[name].value);
            newOutputs[name] = JSON.parse(Unibabel.bufferToUtf8(arrayBuffer));
            break;
          case DataRefType.utf8:
            newOutputs[name] = JSON.parse(outputs[name].value);
            break;
        }
        return newOutputs;
      }, {} as MetaframeInputMap);
    case DataMode.utf8:
      return Object.keys(outputs).reduce<MetaframeInputMap>(async (newOutputs: MetaframeInputMap, name: string) => {
        const type: DataRefType = outputs[name].type || DataRefTypeDefault;
        switch (type) {
          case DataRefType.base64:
            newOutputs[name] = Unibabel.base64ToUtf8(outputs[name].value);
            break;
          case DataRefType.hash:
            arrayBuffer = await fetchBlobFromHash(outputs[name].hash || outputs[name].value);
            newOutputs[name] = Unibabel.bufferToUtf8(arrayBuffer);
            break;
          case DataRefType.json:
            newOutputs[name] = JSON.stringify(outputs[name].value);
            break;
          case DataRefType.url:
            arrayBuffer = await fetchBlobFromUrl(outputs[name].value);
            newOutputs[name] = Unibabel.bufferToUtf8(arrayBuffer);
            break;
          case DataRefType.utf8:
            newOutputs[name] = outputs[name].value;
            break;
        }
        return newOutputs;
      }, {} as MetaframeInputMap);
  }
}

const fetchBlobFromUrl = async (url: string): Promise<ArrayBuffer> => {
  const response = await fetch(url, { method: 'GET', redirect: 'follow', headers: { 'Content-Type': "application/octet-stream" } });
  const arrayBuffer = await response.arrayBuffer();
  return arrayBuffer;
}

const fetchBlobFromHash = async (hash: string): Promise<ArrayBuffer> => {
  const resp = await fetch(`${APP_ORIGIN}/download/${hash}`);
  const json: { url: string, ref: DataRef } = await resp.json();
  const arrayBuffer =  fetchBlobFromUrl(json.url);
  return arrayBuffer;
}
