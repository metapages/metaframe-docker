import objectHash from "object-hash"
import fetch from "isomorphic-fetch"

// represents a way of getting a blob of data (inputs/outputs)
export enum DataRefType {
    base64 = "base64", //default, value is a base64 encoded bytes
    url = "url", // request the data at this URL
    utf8 = "utf8",
    json = "json",
    // Inline = "inline", // string or JSON as the actual final input/output data. binary is hard here, so use others when needed
    hash = "hash", // the internal system can get this data blob given the hash address (stored in the value)
}


export const DataRefTypeDefault = DataRefType.base64;

export type DataRef<T=string> = {
    value: T;
    hash?: string;
    type?: DataRefType;
}

// convert a lump of binary encoded as a base64 string into a DataRef
export const base64ToDataRef = async (value: string, options: {ignoreHash?: boolean, putUrl:string}): Promise<DataRef> => {
    const { ignoreHash, putUrl } = options;
    // AWS S3 pre-signed URLs are about 500 chars
    // If the size of the value is too high then upload it to S3
    // and just store the hash value since we refer to it with that
    // but we don't store AWS S3 pre-signed URLs we give them to you when
    // you ask but we just store the hash so this value is pretty arbitray
    // but we want the size of inputs to be small since any increase gunks
    // up the state passed around (carries entire job history)
    if (value.length < 200) {
        return {
            value,
            type: DataRefType.base64,
            hash: ignoreHash ? undefined : objectHash.sha1(value)
        }
    }

    const resp = await fetch(putUrl);
    const json : { url:string, ref: DataRef} = await resp.json();
    const responseUpload = fetch(json.url, {method: 'PUT', body:null})
    await responseUpload.blob();

    return {
        value: json.ref.value,
        type: json.ref.type,
        hash: ignoreHash ? undefined : objectHash.sha1(value)
    }

}



// const b64toBlob = (b64Data:string, contentType='', sliceSize=512) => {
//     const byteCharacters = atob(b64Data);
//     const byteArrays = [];

//     for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
//       const slice = byteCharacters.slice(offset, offset + sliceSize);

//       const byteNumbers = new Array(slice.length);
//       for (let i = 0; i < slice.length; i++) {
//         byteNumbers[i] = slice.charCodeAt(i);
//       }

//       const byteArray = new Uint8Array(byteNumbers);
//       byteArrays.push(byteArray);
//     }

//     const blob = new Blob(byteArrays, {type: contentType});
//     return blob;
//   }
