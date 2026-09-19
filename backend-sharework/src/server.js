import { createServer } from 'node:http';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { closeSocket, initSocket } from './config/socket.js';
import { createApp } from './app.js';
import { redactSecrets } from './utils/redact.js';

const app = createApp();
const httpServer = createServer(app);
const SHUTDOWN_TIMEOUT_MS = 10_000;

initSocket(httpServer);

let isShuttingDown = false;

const shutdown = (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`Received ${signal}. Starting graceful shutdown.`);

  httpServer.close(async () => {
    try {
      await closeSocket();
      await disconnectDb();
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', redactSecrets(error.message));
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
};

const start = async () => {
  try {
    await connectDb();

    httpServer.listen(env.PORT, '0.0.0.0', () => {
      console.log(`ShareWork backend listening on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', redactSecrets(error.message));
    process.exit(1);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error('Unhandled rejection:', redactSecrets(message));
  shutdown('unhandledRejection');
});

start();
