// import { Stream } from "stream";

export const asyncForEach = async function <T>(array: T[], callback: any) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
};

// // util function for easy docker stuff. used in their examples.
// const promisifyStream = (stream:Stream) => new Promise((resolve, reject) => {
//     stream.on("data", data => console.log(data.toString()));
//     stream.on("end", resolve);
//     stream.on("error", reject);
// });

// const promiseTimeout = function <T>(ms: number, promise: Promise<T>) {
//     console.log("Timer in " + ms + "ms.");
//     // Create a promise that rejects in <ms> milliseconds
//     let timeout = new Promise((resolve, reject) => {
//         let id = setTimeout(() => {
//             console.log("rejecting");
//             clearTimeout(id);
//             reject("Timed out in " + ms + "ms.");
//         }, ms);
//     });

//     // Returns a race between our timeout and the passed in promise
//     return Promise.race([promise, timeout]);
// };
