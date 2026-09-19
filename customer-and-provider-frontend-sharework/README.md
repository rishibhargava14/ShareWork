# ShareWork Customer + Provider

One Next.js 16 (TypeScript) application for both **customers** (hire) and **providers** (work). Port **3000**. Role is chosen at login/signup. The live UI is a client SPA (`ShareWorkSpa`) on the App Router.

This app does **not** own business data. The canonical API is Express at `http://localhost:5000`.

Admin is a **separate** app: `sharework-admin` on port **3001**.

## What this application is

Fixed-price marketplace UI:

- Customers discover providers, chat, approve agreements, fund escrow, review deliverables, post requirements.
- Providers list gigs, chat, create agreements, submit deliverables, view earnings, request withdrawals.

## Prerequisites

- Node.js 20+
- Canonical backend running (`sharework-backend` on port 5000 unless you override the API base URL)
- MongoDB used by the backend (this frontend does not connect to Mongo for live features)

## Installation

```bash
npm install
```

On Windows PowerShell the folder name contains `&`. Use a literal path from the repo root:

```powershell
Set-Location -LiteralPath 'ShareWork-Customer&Provider'
```

## Environment

There is **no** `.env.example` in this folder.

`src/lib/api.ts` defaults `NEXT_PUBLIC_API_BASE_URL` to `http://localhost:5000`. Create `.env.local` only if Express is not on that origin:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

That is the only live frontend env var. Do not point it at `src/app/api`. Do not commit `.env.local`.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Scripts from `package.json`:

```bash
npm run dev      # next dev -p 3000
npm run build    # intended production build (currently failing; see Limitations)
npm start        # next start (port 3000)
npm run lint     # ESLint
```

There is no `npm test` script. Optional: `node tests/password-reset.run.mjs` against a running Express API.

On Windows, `npm run lint` can fail because `&` in the folder name splits `PATH`. Use a quoted ESLint binary path, or `Set-Location -LiteralPath`.

## Authentication

Express JWT. Signup creates an unverified user and sends an OTP (Resend on the backend; live mailbox is configuration-dependent). After verify, `token` + `refreshToken` are stored and sent as `Authorization: Bearer <token>`.

Verified seed customer/provider logins issue tokens without a second OTP. Password reset is `ForgotPasswordFlow` → `/api/auth/forgot-password` and `/api/auth/reset-password`.

Roles used here: `customer` and `provider`. Admin accounts should use `sharework-admin`.

Logout is client-side token disposal.

Seed accounts (created by backend `npm run seed`):

| Role | Email | Password |
|---|---|---|
| customer | `customer@sharework.dev` | `ShareWorkDev1!` |
| provider | `provider@sharework.dev` | `ShareWorkDev1!` |

Development-only.

## Customer functionality

- Discover providers (`GET /api/customers/discover`), including category from `GET /api/categories`
- Provider profile, gigs, and portfolio images
- Start conversation
- Send messages (optional file attach), approve/reject agreements
- Fund escrow (Razorpay checkout → backend verify; live Checkout needs real keys)
- Request revision, approve deliverable, submit review, open dispute
- Requirements (`GET/POST /api/customer/requirements`)
- Payments history (`GET /api/transactions/me`)
- Notification inbox (`GET /api/notifications`)

## Provider functionality

- Dashboard stats, gigs (create/update with optional portfolio images), availability
- Profile
- Reply in chat, create agreements
- Submit deliverables (optional files)
- Earnings (`GET /api/provider/earnings`)
- Withdrawal request (`POST /api/provider/withdraw`) — pending record only, not a bank transfer
- Notification inbox

## Chat / Socket.IO

REST is source of truth for messages. Socket.IO connects to the same API base with JWT in `auth.token`.

Events used by the UI: `join_conversation`, `send_message`, `new_message`, `agreement_created`, `escrow_funded`, `deliverable_submitted`, `payment_released`. Disconnect does not crash the UI.

Chat attachments are implemented (multipart → Express → S3). Live S3 success is configuration-dependent and not claimed verified here. Download uses `GET /api/files/:id`.

## Agreements

Provider creates. Customer approves or rejects. Approval creates the project on the backend.

## Projects

Listed with `GET /api/projects?role=customer|provider`. Detail is participant-only. Delivery, revision, approval, review, and dispute go through Express project routes.

## Payments and escrow

1. Customer `POST /api/payments/create-order`
2. Razorpay Checkout (public key + order id only)
3. `POST /api/payments/verify-checkout`
4. Backend locks escrow

Razorpay secret never leaves the backend. Placeholder keys make create-order return 502. The UI must not mark payment successful from a button click. This README does not claim live Checkout was verified.

## Notifications

App shell loads `/api/notifications` and can mark items read. Same API as Admin, scoped to the signed-in user.

## Frozen Next.js `/api`

`src/app/api/**` is leftover from an older in-app API. Live screens use `src/lib/api.ts` → Express `:5000`. Do not add new live features to the frozen routes.

## Troubleshooting

- API errors / CORS: backend not running, or `NEXT_PUBLIC_API_BASE_URL` wrong
- Socket fails: missing JWT or backend down. Chat REST still works
- PowerShell cannot `cd` this folder: `-LiteralPath`
- File upload fails: backend AWS configuration
- OTP email missing: backend Resend configuration / `NODE_ENV=test` skip
- Stale UI after backend changes: restart `npm run dev`

## Limitations

- `npm run build` currently fails on Next.js 16 prerender of `/auth` (`InvariantError: Expected workStore to be initialized`). Local `npm run dev` is the supported run path until that is fixed.
- Live Razorpay, Resend, and S3 depend on backend `.env`. Not claimed verified here.
- Withdrawals do not pay out to a bank.

## Relationship to the backend

Keep Express as the only business API. Do not recreate auth, payments, or projects inside Next.js.
