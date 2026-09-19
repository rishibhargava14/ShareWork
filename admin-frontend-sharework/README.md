# ShareWork Admin

Next.js (JavaScript) Admin console for ShareWork. It is a **separate application** from the Customer + Provider UI. Port **3001**.

Canonical API: Express `http://localhost:5000`. Admin JWT (`role=admin`) is required for every `/api/admin/*` call. The UI cannot bypass backend authorization.

## Purpose

Operators can:

- View live dashboard stats
- List, search, and filter users by role; ban / unban
- List and inspect projects; force-release locked escrow
- Inspect escrow and transactions
- Read leakage logs
- List and resolve disputes (close, refund, or 50/50 split)
- Create, update, and delete service categories
- Read the admin notification inbox
- Update platform fee / GST / maintenance settings

## Prerequisites

- Node.js 20+
- `sharework-backend` on port 5000 (or set `NEXT_PUBLIC_API_BASE_URL`)
- An admin user (backend `npm run seed` creates `admin@sharework.dev`)

## Installation

```bash
npm install
```

## Environment

There is **no** `.env.example` in this folder. The client defaults to `http://localhost:5000`.

If the backend listens elsewhere, create `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Do not commit `.env.local`.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

Scripts from `package.json`:

```bash
npm run dev      # next dev -p 3001
npm run build    # production build
npm start        # next start -p 3001
npm run lint     # ESLint (may warn on next/image)
```

There is no `npm test` script. Admin API coverage lives in `sharework-backend/tests/admin/run.js` and `sharework-backend/tests/finance/run.js`. Optional UI-oriented script: `node tests/password-reset.run.mjs` (needs a running API).

## Authentication

Login calls `POST /api/auth/login` with `role: "admin"`.

For a verified admin, the API returns `requiresOtp` and **no tokens**. The UI then collects a 6-digit code and calls `POST /api/auth/verify-otp`. Tokens are stored in localStorage (and a session cookie for middleware) and sent as `Authorization: Bearer`.

OTP email is sent with **Resend** when `RESEND_API_KEY` and `RESEND_FROM` are set and `NODE_ENV` is not `test`. Mail skip also applies to `@example.com` addresses. This README does not claim live mailbox delivery.

Password reset uses the same forgot/reset OTP endpoints as the rest of the platform (`ForgotPasswordFlow`).

Logout clears stored tokens and the admin cookie (client-side). There is no server revoke list.

Development seed account:

| Role | Email | Password |
|---|---|---|
| admin | `admin@sharework.dev` | `ShareWorkDev1!` |

Public signup cannot create admin users.

## Screens

| Page | Backend |
|---|---|
| Dashboard | `GET /api/admin/stats`, projects, leakage-logs |
| Users | `GET /api/admin/users?role=`, `PUT /api/admin/users/:id/ban` |
| Projects | `GET /api/admin/projects`, `POST /api/admin/projects/:id/force-release` |
| Escrow | `GET /api/admin/escrows`, `GET /api/admin/transactions` |
| Leakage | `GET /api/admin/leakage-logs` |
| Disputes | `GET /api/admin/disputes`, `POST /api/admin/disputes/:id/resolve` |
| Categories | `GET/POST /api/admin/categories`, `PUT/DELETE /api/admin/categories/:id` |
| Notifications | `GET /api/notifications`, mark-read endpoints |
| Settings | `GET/PUT /api/admin/settings` (fee, GST, maintenance) |

`lib/api.js` prefixes paths with `NEXT_PUBLIC_API_BASE_URL`.

### Users

List and filter (role, search). Inspect a user. Ban / unban persists through Express. Customer, provider, and admin accounts appear in the list; public signup still cannot create admin.

### Projects

List/filter projects. Detail includes force-release for locked escrow. Repeat force-release is idempotent on the backend.

### Escrow / finance

Escrow table plus transactions. Force-release is also available from the escrow/project UI. Dispute money movement is on the Disputes page.

### Disputes

- **Close** — `refund: false`, `split: false`
- **Refund** — `refund: true` (locked escrow once; Razorpay refund is configuration-dependent)
- **50/50 split** — `split: true` (cannot combine with refund)

Resolutions persist in Mongo. Duplicate money operations are rejected or marked already processed.

The Auto-release notice is UI copy. The backend does **not** auto-release after 72 hours.

### Categories

Categories are **not** read-only. Admin CRUD writes the `Category` collection. Public apps read `GET /api/categories`. System names cannot be deleted.

### Notifications

Inbox of the signed-in admin user (`GET /api/notifications`). Mark one or all read. This is the same notification API as customer/provider, scoped to the caller.

### Settings

Fee percent, GST percent, maintenance flag only.

### Audit logs

`GET /api/admin/audit-logs` exists on the backend. There is **no** Admin audit-log page.

## Architecture

```
sharework-admin (Next.js :3001)
        |
        | REST + JWT
        ↓
sharework-backend (Express :5000)
        ↓
MongoDB
```

## Troubleshooting

- Login fails: backend down, wrong role, or user is not admin
- Password accepted but no tokens: complete the OTP step
- OTP never arrives: Resend not configured, `NODE_ENV=test`, or skip domain
- 403 on every page: token is a customer/provider JWT
- Empty lists: seed/login succeeded but there is no data yet
- CORS: `CORS_ORIGIN` on the backend must include `http://localhost:3001`

## Limitations

- Settings are fee/GST/maintenance only
- Withdrawals listed by the API are pending records; this UI does not approve bank payouts
- 72-hour auto-release is copy only
- Live Resend/S3/Razorpay depend on backend `.env`; not claimed verified here
- `lib/data.js` is unused mock leftover. Live pages do not import it
