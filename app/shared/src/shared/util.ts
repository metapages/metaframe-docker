import objectHash from 'object-hash';

import { DockerJobDefinitionInputRefs } from './types.js';

export const asyncForEach = < T extends {} > (array: T[], callback: any) :Promise<void> => {
    return new Promise(async (resolve, reject) => {
        for (let index = 0; index < array.length; index++) {
            try {
                await callback(array[index], index, array);
            } catch (err) {
                reject(err);
            }
        }
        resolve();
    });


};

export const shaJobDefinition = (obj :DockerJobDefinitionInputRefs) :string => objectHash.sha1(obj);
