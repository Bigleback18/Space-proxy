import { createServer } from 'node:http';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { baremuxPath } from '@mercuryworkshop/bare-mux/node';
import { epoxyPath } from '@mercuryworkshop/epoxy-transport';
import { libcurlPath } from '@mercuryworkshop/libcurl-transport';
import { attachBrowsing } from './wisp.mjs';

const app = Fastify({ logger: false });
for (const [prefix, root] of [
  ['/baremux/', baremuxPath], ['/epoxy/', epoxyPath], ['/libcurl/', libcurlPath],
]) {
  await app.register(fastifyStatic, { root, prefix, decorateReply: false });
}
app.get('/api/health', async () => ({ browsing: true }));
app.get('/wisp/', async (_request, reply) => reply.code(426).send({ error: 'WebSocket upgrade required' }));
await app.ready();
const server = createServer((request, response) => app.routing(request, response));
attachBrowsing(server);
export default server;
