import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { openapiSpec } from '../../src/docs/openapi.js';

const results = [];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const record = (name, passed, detail = '') => {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const request = (server, { method, path: urlPath }) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: server.address().port,
        method,
        path: urlPath,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed = data;
          try {
            parsed = data ? JSON.parse(data) : data;
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });

const requiredPaths = [
  '/health',
  '/api/auth/login',
  '/api/users/me',
  '/api/customers/discover',
  '/api/projects',
  '/api/conversations',
  '/api/transactions/me',
  '/api/customer/requirements',
  '/api/categories',
  '/api/admin/stats',
];

const server = http.createServer(createApp());
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

try {
  const spec = await request(server, { method: 'GET', path: '/openapi.json' });
  record('GET /openapi.json 200', spec.status === 200 && spec.body?.openapi?.startsWith('3.'));
  record(
    'OpenAPI contains required paths',
    requiredPaths.every((item) => Boolean(spec.body?.paths?.[item])),
    requiredPaths.filter((item) => !spec.body?.paths?.[item]).join(','),
  );
  record(
    'OpenAPI documents real requirements routes',
    Boolean(spec.body?.paths?.['/api/customer/requirements']?.post) &&
      Boolean(spec.body?.paths?.['/api/customer/requirements']?.get),
  );
  record('OpenAPI has no secrets', !JSON.stringify(spec.body).includes(env.JWT_SECRET));
  record('in-code spec matches served spec title', openapiSpec.info.title === spec.body.info.title);

  const docs = await request(server, { method: 'GET', path: '/api-docs' });
  record(
    'GET /api-docs is reachable HTML',
    docs.status === 200 &&
      String(docs.headers['content-type'] || '').includes('text/html') &&
      String(docs.body).includes('/api/customer/requirements'),
  );

  const mapping = fs.readFileSync(path.join(root, 'docs/frontend-integration.md'), 'utf8');
  record(
    'integration mapping document exists',
    mapping.includes('GET /api/users/me') &&
      mapping.includes('/api/customers/discover') &&
      mapping.includes('client-side token disposal'),
  );

  const seedSource = fs.readFileSync(path.join(root, 'src/scripts/seed.js'), 'utf8');
  record(
    'seed refuses production',
    seedSource.includes("NODE_ENV === 'production'") &&
      seedSource.includes('process.exit(1)') &&
      !seedSource.includes('src/server.js'),
  );
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  record(
    'README documents seed credentials',
    readme.includes('customer@sharework.dev'),
  );
  record(
    'README documents test commands and mapping doc',
    readme.includes('node tests/requirements/run.js') &&
      readme.includes('docs/frontend-integration.md') &&
      readme.includes('GET /api/users/me'),
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const failed = results.filter((item) => !item.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length > 0) process.exit(1);
