import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify"
import { PluginMetadata } from "fastify-plugin";
import { default as fp } from "fastify-plugin";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { DataRefType } from '../../../../shared/dist/dataref/index.js';

interface UrlParameters {
    hash: string;
}

const bucketParams = { Bucket: "metaframe-asman-test", ContentType: "application/octet-stream" };
const client = new S3Client({ region: "us-west-1" });

export default fp((server: FastifyInstance, _: PluginMetadata, next: any) => {
    // get s3 upload URL and data ref for the downstream worker
    server.get<{ Params: UrlParameters }>('/download/:hash', async (request: FastifyRequest, reply: FastifyReply) => {
        const params = request.params as UrlParameters;
        const hash: string = params.hash;
        console.log('params', params);

        // Add headers for
        // https://www.reddit.com/r/aws/comments/j5lhhn/limiting_the_s3_put_file_size_using_presigned_urls/
        // In your service that's generating pre-signed URLs, use the Content-Length header as part of the V4 signature (and accept object size as a parameter from the app). In the client, specify the Content-Length when uploading to S3.
        // Your service can then refuse to provide a pre-signed URL for any object larger than some configured size.
        //  ContentLength: 4
        // ContentMD5?: string;
        // ContentType?: string;
        const command = new GetObjectCommand({ ...bucketParams, Key: params.hash});
        const url = await getSignedUrl(client, command, { expiresIn: 3600 });
        return reply.send({
            url, ref: {
                value: url,
                type: DataRefType.url,
                hash,
            }
        });
    });
    next();
});
