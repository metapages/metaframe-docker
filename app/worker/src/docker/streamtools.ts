import { Duplex, Readable, Transform, Writable } from 'stream';

export function createStringConsumer(f :(a:string)=>void) :Writable
{
    const writable = new Writable({decodeStrings:false,objectMode:false});
    writable._write = function(chunk :Buffer, encoding :string, done :(e :Error|null)=>void) {
        if (chunk != null) {
            try {
                f(chunk.toString('utf8'));
            } catch(err) {
                done(err);
                return;
            }
        }
        done(null);
    };
    return writable;
}

export function createTransformStream<T>(f :(a:T)=>T) :Duplex
{
    const transform = new Transform({decodeStrings:false,objectMode:false});
    transform._transform = function(chunk :T, encoding :string, callback) {
        if (chunk != null) {
            try {
                chunk = f(chunk);
            } catch(err) {
                callback(err, null);
                return;
            }
        }
        callback(null, chunk);
    };
    return transform;
}

export function createTransformPrepend(s :string) :Duplex
{
    const transform = new Transform({decodeStrings:false, objectMode:false});
    transform._transform = function(chunk :string, encoding :string, callback :any) {
        if (chunk != null) {
            chunk = s + chunk;
        }
        callback(null, chunk);
    };
    return transform;
}

export function stringToStream(s :string) :Readable
{
    const stream :Readable = new Readable({encoding:'utf8'});
    stream.push(s);
    stream.push(null);
    return stream;
}

export function bufferToStream(b :Buffer) :Readable
{
    const stream :Readable = new Readable();
    stream.push(b);
    stream.push(null);
    return stream;
}
