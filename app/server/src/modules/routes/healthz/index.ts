import { FastifyRequest, FastifyReply, FastifyInstance } from "fastify"
import { PluginMetadata } from "fastify-plugin";
import { default as fp } from "fastify-plugin";

export default fp((server: FastifyInstance, _: PluginMetadata, next: any) => {
    server.get("/healthz",  { logLevel: 'warn' }, async (_: FastifyRequest, reply: FastifyReply) => {
        return reply.code(200).send('OK');
    });
    next();
});
