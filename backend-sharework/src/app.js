import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { corsOrigins } from './config/env.js';
import { isMongoConnected } from './config/db.js';
import { getIoOrNull } from './config/socketRegistry.js';
import { openapiSpec } from './docs/openapi.js';
import { renderApiDocs } from './docs/renderDocs.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { requestLogger } from './middlewares/requestLogger.js';
import routes from './routes/index.js';

const isPaymentWebhook = (req) =>
  req.method === 'POST' &&
  (req.path === '/api/payments/verify' || req.originalUrl?.split('?')[0] === '/api/payments/verify');

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');

  app.set("trust proxy", 1)

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
  app.use((req, res, next) => {
    if (isPaymentWebhook(req)) {
      return express.raw({ type: 'application/json', limit: '1mb' })(req, res, next);
    }
    return next();
  });
  app.use((req, res, next) => {
    if (isPaymentWebhook(req)) {
      return next();
    }
    return express.json({ limit: '10mb' })(req, res, next);
  });
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) =>
        req.path === '/health' || req.path === '/openapi.json' || req.path === '/api-docs',
    }),
  );
  app.use((req, res, next) => {
    if (isPaymentWebhook(req)) {
      return next();
    }
    return mongoSanitize()(req, res, next);
  });
  app.use((req, res, next) => {
    if (isPaymentWebhook(req)) {
      return next();
    }
    return xss()(req, res, next);
  });
  app.use(requestLogger);
  app.use((req, _res, next) => {
    req.io = getIoOrNull();
    next();
  });

  app.get('/health', (_req, res) => {
    const dbConnected = isMongoConnected();
    if (!dbConnected) {
      res.status(503).json({
        ok: false,
        time: new Date().toISOString(),
        db: 'disconnected',
        success: false,
        message: 'ShareWork backend is not ready',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      time: new Date().toISOString(),
      db: 'connected',
      success: true,
      message: 'ShareWork backend is healthy',
    });
  });

  app.get('/openapi.json', (_req, res) => {
    res.status(200).json(openapiSpec);
  });

  app.get('/api-docs', (_req, res) => {
    res.status(200).type('html').send(renderApiDocs(openapiSpec));
  });

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
