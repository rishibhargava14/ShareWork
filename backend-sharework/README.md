# ShareWork Backend

Backend-only REST + Socket.IO API for ShareWork. It owns authentication, authorization, validation, persistence, chat anti-leakage, files, projects, payments/escrow, notifications, admin moderation, and customer requirements.

Stack: **Node.js 20+**, **Express**, **MongoDB / Mongoose**, **JWT**, **Socket.IO**, **Razorpay**, **Resend**, **AWS S3**.

This folder is the canonical API. Sibling apps in the same workspace:

- `ShareWork-Customer&Provider` — Next.js (TypeScript) UI on port **3000**
- `sharework-admin` — Next.js (JavaScript) Admin UI on port **3001**

Frontend mapping notes: `docs/frontend-integration.md`.

This is **not** NestJS, PostgreSQL, or Supabase. Those appear only in `reference/` HTML.

## Architecture

```
Route → Middleware (auth / role / Zod) → Controller → Service → Model / MongoDB
```

Controllers stay thin. Services own business rules. Models own schema and indexes. Socket.IO chat handlers reuse conversation and provider services.

## Prerequisites

- Node.js 20 or newer (`engines.node` is `>=20`)
- MongoDB 6/7 reachable at `MONGODB_URI`
- npm

## Local setup

1. Copy environment defaults:

```bash
cp .env.example .env
```

2. Replace placeholder values in `.env`. Startup fails if required variables are missing or invalid.

3. Install dependencies:

```bash
npm install
```

4. Start MongoDB locally, or start only the database container:

```bash
docker compose up mongodb
```

`.env.example` uses `MONGODB_URI=mongodb://127.0.0.1:27017/sharework`.

## Environment

See `.env.example`. Runtime groups (parsed in `src/config/env.js`):

- Server: `PORT` (local default **5000**), `NODE_ENV`
- Database: `MONGODB_URI` (alias `MONGO_URI`)
- Auth: `JWT_SECRET`, `JWT_EXPIRES_IN` (alias `JWT_EXPIRE`), `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN` (alias `JWT_REFRESH_EXPIRE`)
- CORS: `CLIENT_URL`, `CORS_ORIGIN` (comma-separated browser origins; local Customer/Provider `:3000` and Admin `:3001`)
- Payments: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `PLATFORM_FEE_PERCENT`, `GST_ON_FEE_PERCENT`
- Storage: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`, `AWS_REGION`
- Email: `RESEND_API_KEY`, `RESEND_FROM` (aliases `MAIL_FROM`, `EMAIL_FROM`), `OTP_EXPIRY_MIN`
- Optional: `BCRYPT_SALT_ROUNDS`, `DEV_OTP` (alias `MVP_OTP`; rejected in production)

`CLIENT_URL` is validated but unused by runtime code. CORS uses `CORS_ORIGIN`.

`SMTP_*` keys may still appear in `.env.example`. They are **unused**. Outbound mail is Resend only.

`DEV_OTP` is development/test only. Production rejects it and rejects placeholder secrets.

Never commit `.env` or real credentials.

Live email requires `RESEND_API_KEY` and `RESEND_FROM`. OTP send is skipped only for `NODE_ENV=test` or `@example.com` addresses. This README does not claim a real mailbox was verified.

Live S3 and Razorpay calls need valid provider credentials. Placeholder Razorpay keys make `create-order` return **502**. Invalid AWS keys fail uploads. Those live paths are configuration-dependent.

## Scripts

```bash
npm run dev
npm start
npm run seed
```

`npm run dev` uses nodemon. `npm start` is `node src/server.js`. The HTTP server listens only after MongoDB connects.

## API base URL

Local backend default: `http://localhost:5000` (`PORT=5000` in `.env.example`).

Customer/Provider and Admin default `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:5000`.

If backend `PORT` is not `5000`, set `NEXT_PUBLIC_API_BASE_URL` on both frontends to `http://localhost:<PORT>`. Do not leave the Admin app on 5000 while the API listens elsewhere.

## Authentication

1. `POST /api/auth/signup` — customer or provider only. Admin signup is rejected. Creates an unverified user and emails an OTP. Does not issue JWTs.
2. `POST /api/auth/verify-otp` — verifies the email OTP and issues access/refresh tokens.
3. `POST /api/auth/resend-otp` — body `{ email, purpose: "verify" | "reset" }`. Rotates the OTP even if the previous code expired. Cooldown and resend limits apply.
4. `POST /api/auth/login` — body `{ email, password, role }`. Verified customer/provider accounts receive tokens. Unverified accounts receive `requiresVerification` and an OTP, with no tokens. Verified **admin** login returns `requiresOtp` and no tokens until `POST /api/auth/verify-otp`.
5. `POST /api/auth/refresh` — body `{ refreshToken }`. Rotates access and refresh tokens.
6. `POST /api/auth/forgot-password` then `POST /api/auth/reset-password` — email OTP recovery. Does not reveal whether the account exists.
7. Send `Authorization: Bearer <token>` on protected routes. Unverified accounts are rejected.
8. Current user: `GET /api/users/me`

JWT access tokens are stateless. Logout is client-side token disposal. There is no revoke/blacklist route. `refreshToken` is issued but not persisted.

Banned users receive `403` on login and on authenticated routes.

Roles:

- `customer` — discovery, requirements, project funding, message start, deliverable approval
- `provider` — gigs, provider dashboard/earnings/availability/withdraw, deliverable submit
- `admin` — `/api/admin/*` only. Admin accounts are not created by public signup.

## Major route groups

| Group | Base | Notes |
|---|---|---|
| Health | `GET /health` | Readiness. `200` when Mongo is connected, `503` when it is not. |
| Docs | `GET /openapi.json`, `GET /api-docs` | OpenAPI 3 JSON and browsable HTML (not swagger-ui-express). |
| Auth | `/api/auth` | signup, login, verify-otp, resend-otp, forgot-password, reset-password, refresh |
| Users | `/api/users` | `GET/PUT /me`, `GET /:id/profile` |
| Discovery | `/api/customers/discover` | Customer JWT. Filters: category, budget, rating, online, search. |
| Provider public | `/api/providers/:id/gigs` | Authenticated |
| Provider account | `/api/provider` | Provider JWT: stats, earnings, availability, withdraw |
| Gigs | `/api/gigs` | Provider create/update (multipart portfolio); public GET by id |
| Conversations | `/api/conversations` | Participant-scoped list/send + agreements; optional chat file |
| Projects | `/api/projects` | `GET /?role=customer\|provider`, detail, fund, deliverable, revision, dispute, review |
| Payments | `/api/payments` | Customer `create-order` and `verify-checkout`; webhook `verify` (HMAC, no JWT) |
| Transactions | `/api/transactions/me` | Own payment/escrow history |
| Escrow | `/api/escrow/release` | Customer, delivered + locked only |
| Requirements | `/api/customer/requirements` | Customer POST + GET own briefs |
| Categories | `GET /api/categories` | Public active list from the Category collection |
| Files | `GET /api/files/:id` | Portfolio public; deliverable/attachment need participant JWT |
| Notifications | `/api/notifications` | Own inbox, unread count, mark read / read-all |
| Admin | `/api/admin` | Admin JWT only |

Suggested frontend names such as `/api/auth/me` or `/api/experts` are **not** duplicated. See `docs/frontend-integration.md`.

## Customer requirements

`POST /api/customer/requirements` and `GET /api/customer/requirements`.

Customer JWT only. Ownership is `req.user.id`. Status on create is always `open`.

## Categories

Single source: Mongo `Category` model.

- Public: `GET /api/categories`
- Admin: `GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/:id`
- Gig, requirement, and discovery category fields use that list, not a hardcoded enum
- System names (`UI/UX`, `Web`, `App`, `Figma`, `IT`) cannot be deleted

## Projects

`GET /api/projects?role=customer` lists the caller’s customer projects.
`GET /api/projects/:id` is participant-only.
Amount is `fixedPrice`. Provider display name is not denormalized; join via `providerId`.

## Conversations / messages

REST: `GET/POST /api/conversations`, `GET/POST /api/conversations/:id/messages`.

Socket.IO uses the same JWT (`auth.token` or `Authorization`). Client events: `join_conversation`, `send_message`, `typing`, `update_online_status`. Phone/email/UPI are blocked; links are masked. Leakage logs store raw content in Mongo; admin list returns masked content only.

Chat may attach a file (S3 + `StoredFile`). Download is `GET /api/files/:id`. Live S3 success depends on AWS configuration.

## Notifications

Authenticated, own-rows only:

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## Files / S3

`StoredFile` kinds: `portfolio`, `attachment`, `deliverable`. Upload goes through multer memory → `storage.service` (AWS SDK Put). Authorization is object-level (owner/participant). Live Put/Get against AWS is not claimed verified here.

## Payments / escrow

Customer `POST /api/payments/create-order` asks Razorpay for an order. It does **not** lock escrow. The frontend opens Razorpay Checkout with the public `keyId` and `orderId` only.

Two verification paths, both backend-controlled:

- `POST /api/payments/verify-checkout` — customer JWT. HMAC of `order_id|payment_id` with `RAZORPAY_KEY_SECRET`. Order id must match the project.
- `POST /api/payments/verify` — webhook, no JWT. HMAC of the raw body with `RAZORPAY_WEBHOOK_SECRET`. Handles `payment.captured` and `order.paid`.

Both call `lockEscrow` and are idempotent. Release is customer-only (`POST /api/escrow/release` or approve-deliverable), delivered + locked. Fee and GST percents come from environment / platform settings.

Admin money paths:

- `POST /api/admin/projects/:id/force-release` — release locked escrow without delivered check; idempotent if already released
- `POST /api/admin/disputes/:id/resolve` — `refund=true` refunds locked escrow once; `split=true` pays 50/50; cannot set both

Provider withdraw writes a **pending** request transaction only. No payout processor.

Placeholder Razorpay keys make `create-order` return **502** (`Payment provider is unavailable`). That is intentional. Do not treat a frontend click as payment success. Tests cover the software path (including mocks). Live Checkout is not claimed verified here.

## Admin

`/api/admin/*` requires `role=admin`.

- `GET /stats` `GET /users` `GET /projects` `GET /escrows` `GET /transactions` `GET /withdrawals` `GET /leakage-logs` `GET /disputes` `GET /categories` `GET /settings` `GET /audit-logs`
- `PUT /settings` — fee percent, GST percent, maintenance flag
- `POST /projects/:id/force-release`
- `POST /disputes/:id/resolve` — refund, 50/50 split, or close
- `POST /categories` `PUT /categories/:id` `DELETE /categories/:id`
- `PUT /users/:id/ban`

Sensitive admin mutations write `AdminAuditLog` rows. There is no Admin UI for that list.

72-hour auto-release is a UI notice only.

## CORS

Allowed browser origins come from `CORS_ORIGIN`. Local Customer/Provider is `http://localhost:3000`. Local Admin is `http://localhost:3001`. Credentials are enabled. Unknown origins do not receive `Access-Control-Allow-Origin`.

## Seed / test accounts

```bash
npm run seed
```

Seed upserts local development data. It refuses `NODE_ENV=production` and is never started by `src/server.js`. Repeat runs are idempotent.

| Role | Email | Password |
|---|---|---|
| customer | `customer@sharework.dev` | `ShareWorkDev1!` |
| provider | `provider@sharework.dev` | `ShareWorkDev1!` |
| admin | `admin@sharework.dev` | `ShareWorkDev1!` |

These accounts are development-only.

## Tests

There is no `npm test` script. Run suites with Node:

```bash
node tests/models/run.js
node tests/auth/run.js
node tests/users/run.js
node tests/gigs/run.js
node tests/provider/run.js
node tests/conversations/run.js
node tests/projects/run.js
node tests/payments/run.js
node tests/escrow/run.js
node tests/admin/run.js
node tests/finance/run.js
node tests/notifications/run.js
node tests/hardening/run.js
node tests/requirements/run.js
node tests/docs/run.js
node tests/closure/run.js
```

Suites use the Mongo URI from `.env` and delete records they create. External providers are mocked or expected to fail honestly (for example Razorpay 502 on placeholder keys). They do not prove live Resend, S3, or Razorpay cloud.

`tests/docs/run.js` checks OpenAPI, this README (seed credentials, `node tests/requirements/run.js`, `docs/frontend-integration.md`, `GET /api/users/me`).

## Docker

Dockerfile uses Node 20 Alpine, `npm ci --omit=dev`, `src/server.js`, port 5000, user `node`, and does not copy `.env` or tests.

```bash
docker compose up --build
```

Compose starts MongoDB and the API. Application secrets come from `.env`. Compose overrides `MONGODB_URI` to `mongodb://mongodb:27017/sharework`. Host `.env` can still set `NODE_ENV=development`; production deploys must set `NODE_ENV=production` and real secrets.

## Production configuration

- Supply real JWT, Razorpay, AWS, and Resend values (`RESEND_FROM` included).
- Startup rejects obvious placeholders and `DEV_OTP`.
- `JWT_REFRESH_SECRET` must differ from `JWT_SECRET`.
- Set `CORS_ORIGIN` to the deployed frontend origin.

## Known limitations

- Live Resend/S3/Razorpay are environment-dependent and not claimed verified here
- `CLIENT_URL` is validated and unused
- `xss-clean` is deprecated and still used
- Provider withdraw creates a request record only. No bank payout
- JWT logout is client-side. No token blacklist
- `refreshToken` is not persisted. `POST /api/auth/refresh` still rotates tokens
- Docker CLI may be unavailable on some developer machines; validate the files statically if so

## Frontend integration

Contract mapping, field joins, and response adapter notes: `docs/frontend-integration.md`.
