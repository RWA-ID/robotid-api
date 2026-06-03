import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import swaggerUi from 'swagger-ui-express';

import { config } from './lib/config.js';
import { openapiSpec } from './openapi/spec.js';
import { authRouter } from './routes/auth.js';
import { robotsRouter } from './routes/robots.js';
import { capabilityRouter } from './routes/capability.js';
import { intentRouter } from './routes/intent.js';
import { otaRouter } from './routes/ota.js';
import { subscriptionRouter } from './routes/subscription.js';
import { graphqlHandler } from './graphql.js';
import { attachWebSocket } from './ws/server.js';
import { startSubscriptionWatcher } from './listeners/subscription-watcher.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' })); // large batches

// serialize BigInt in JSON responses
app.set('json replacer', (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v));

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', chainId: config.chainId, parent: config.ensParent, ts: Date.now() }),
);

app.use('/auth', authRouter);
app.use('/api/v1/robots', robotsRouter);
app.use('/api/v1/capability', capabilityRouter);
app.use('/api/v1/intent', intentRouter);
app.use('/api/v1/ota', otaRouter);
app.use('/api/v1/subscription', subscriptionRouter);

app.all('/graphql', graphqlHandler);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec as object, { customSiteTitle: 'robot-id.eth API' }));
app.get('/openapi.json', (_req, res) => res.json(openapiSpec));

// error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'internal error', detail: err.message });
});

const server = createServer(app);
attachWebSocket(server);

server.listen(config.port, () => {
  console.log(`robot-id.eth API listening on :${config.port}`);
  console.log(`  Swagger  → http://localhost:${config.port}/docs`);
  console.log(`  GraphQL  → http://localhost:${config.port}/graphql`);
  console.log(`  WebSocket→ ws://localhost:${config.port}/ws`);
  startSubscriptionWatcher();
});

export { app, server };
