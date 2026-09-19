import { env } from '../config/env.js';

export const requestLogger = (req, res, next) => {
  if (env.NODE_ENV === 'test') {
    return next();
  }

  const startedAt = Date.now();
  const pathOnly = (req.originalUrl || req.path || '').split('?')[0];
  const path = env.NODE_ENV === 'development' ? req.originalUrl : pathOnly;

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    console.log(`${req.method} ${path} ${res.statusCode} ${durationMs}ms`);
  });

  next();
};
