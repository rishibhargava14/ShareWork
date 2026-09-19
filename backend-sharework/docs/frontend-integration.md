# ShareWork frontend integration mapping

This document maps `Backend_Integration.pdf` suggested endpoints to the **current** backend. Do not invent duplicate APIs for naming differences.

Base URL (local): `http://localhost:5000` when `PORT=5000`.
Frontend origins allowed by CORS: `http://localhost:3000` (Customer/Provider), `http://localhost:3001` (Admin).
Set frontend `NEXT_PUBLIC_API_BASE_URL` to the same origin the backend listens on. If `PORT` is not 5000, both frontends must override the default.

Live OTP email requires `RESEND_API_KEY` and `RESEND_FROM`.

Machine-readable docs: `GET /openapi.json`
Browsable docs: `GET /api-docs`

## Auth

| Contract | Actual | Notes |
|---|---|---|
| `POST /api/auth/login` | `POST /api/auth/login` | Body: `{ email, password, role }`. Verified accounts return `{ success, user, token, refreshToken }`. Unverified accounts return `{ success, user, requiresVerification, message, retryAfterSeconds }` with no tokens. |
| `POST /api/auth/signup` | `POST /api/auth/signup` | Creates an unverified user and emails an OTP. Does **not** issue JWTs. |
| `POST /api/auth/verify-otp` | `POST /api/auth/verify-otp` | Body `{ email, otp }`. On success returns `{ verified, user, token, refreshToken }`. |
| `POST /api/auth/resend-otp` | `POST /api/auth/resend-otp` | Body `{ email, purpose: "verify" \| "reset" }`. Rotates the OTP even if the previous code expired. Cooldown and resend limits apply. |
| `GET /api/auth/me` | `GET /api/users/me` | Current authenticated user + role profile. |
| `POST /api/auth/logout` | none | JWT is stateless. Logout is **client-side token disposal**. There is no server-side revoke/blacklist. `refreshToken` is not persisted. Use `POST /api/auth/refresh` to rotate tokens. |
| `POST /api/auth/forgot-password` | `POST /api/auth/forgot-password` | Body `{ email }`. Always `{ message: "OTP sent" }`. |
| `POST /api/auth/reset-password` | `POST /api/auth/reset-password` | Body `{ email, otp, newPassword }`. Completes recovery. |

Frontend must send `Authorization: Bearer <token>` on protected routes.

Customer routes require `user.role === "customer"`. Provider routes require `user.role === "provider"`.

## Profile

`GET /api/users/me` returns `{ success, user, profile }`.

Customer `user` includes id, name, email, phone, role, isVerified.
Customer `profile` includes company/bio fields and optional `country` (CustomerProfile, not User).

Banned accounts receive `403` on authenticated calls. That is the account-status signal. `isBanned` is not included on the customer payload.

## Discovery

| Contract | Actual |
|---|---|
| `GET /api/experts` | `GET /api/customers/discover` |

Customer JWT only. Query: `category`, `budgetMin`, `budgetMax`, `rating`, `online`, `search`, `page`.

Response: `{ success, providers, total, page }`.
Provider item: id, name, title, skills, rating, reviewsCount, startingPrice, onlineStatus.

## Projects

| Contract | Actual |
|---|---|
| `GET /api/customer/projects` | `GET /api/projects?role=customer` |
| `GET /api/customer/projects/:id` | `GET /api/projects/:id` |

`role` is a filter label. Identity always comes from the JWT. A customer passing `role=provider` gets an empty list, not another user’s projects.

Field mapping:

- `fixedPrice` → frontend `amount`
- `providerId` → frontend `providerName` via `GET /api/users/:id/profile` (name is not denormalized on the project)
- `status`, `progress`, `escrow` are already on the project object

## Conversations

| Contract | Actual |
|---|---|
| `GET /api/customer/conversations` | `GET /api/conversations` |
| `GET /api/customer/conversations/:id/messages` | `GET /api/conversations/:id/messages` |
| `POST /api/customer/conversations/:id/messages` | `POST /api/conversations/:id/messages` |

These routes are participant-scoped, not customer-only. Providers use the same paths.

Field mapping:

- `unreadCount` is a map keyed by user id. Use `unreadCount[currentUserId] ?? 0`
- message text is `content`
- sender is `senderId`
- timestamp is `createdAt`
- participants on list are public user objects when populated

Socket.IO uses the same JWT (`auth.token` or `Authorization`). Join and send are participant-checked.
File messages are HTTP multipart only. Socket `send_message` is text-only.

## Files

| Contract | Actual |
|---|---|
| Stored file download | `GET /api/files/:id` |
| Deliverable submit | `POST /api/projects/:id/submit-deliverable` multipart `files` + `message` |
| Chat attachment | `POST /api/conversations/:id/messages` multipart `file` + `content` + `type=file` |
| Gig portfolio | `POST /api/gigs` and `PUT /api/gigs/:id` multipart `portfolioImages` |

API JSON never returns raw S3 URLs or storage keys. File refs are `{ id, originalName, mimeType, size, url }` where `url` is `/api/files/:id`.
Portfolio downloads are public. Deliverables and chat attachments require a participant JWT.

## Payments

| Contract | Actual |
|---|---|
| `GET /api/customer/payments` | `GET /api/transactions/me` |

Transaction fields: `id`, `projectId`, `amount`, `status`, `createdAt`, `escrowStatus`, fee/gst/net.

Missing on purpose (join in the frontend):

- `projectTitle` ← `GET /api/projects/:id` → `project.title`
- `providerName` ← project `providerId` + public profile
- `date` ← `createdAt`

## Requirements

Contract and actual:

- `POST /api/customer/requirements`
- `GET /api/customer/requirements`

Customer JWT only. `customerId` is taken from the token. Status on create is always `open`. No PATCH/DELETE/cancel requirement routes exist in the current backend or Admin/Customer HTML contract. They are intentionally unsupported.

## Categories

| Contract | Actual |
|---|---|
| public list | `GET /api/categories` |
| admin list | `GET /api/admin/categories` |
| admin create/update/delete | `POST /api/admin/categories`, `PUT /api/admin/categories/:id`, `DELETE /api/admin/categories/:id` |

Gig create, requirement create, and discovery filters use active database category names. System names `UI/UX`, `Web`, `App`, `Figma`, `IT` are seeded and cannot be deleted.

## Notifications

| Contract | Actual |
|---|---|
| inbox | `GET /api/notifications` |
| unread | `GET /api/notifications/unread-count` |
| mark one read | `PATCH /api/notifications/:id/read` |
| mark all read | `PATCH /api/notifications/read-all` |

Authenticated user only. Another user's notifications return `403`.

## Admin

Admin login: `POST /api/auth/login` with `role: "admin"` returns `{ requiresOtp: true }` and no tokens. `POST /api/auth/verify-otp` completes the session.

Sensitive admin mutations write `AdminAuditLog` rows (ban, dispute resolve/split/refund, force-release, settings, category CRUD).

## Response adapter

Backend success:

```json
{ "success": true, "requirement": {}, "message": "optional" }
```

Payload fields are siblings of `success`, not wrapped in `data`.

Backend error:

```json
{ "success": false, "message": "Authentication required" }
```

HTTP status carries the code. There is no `error.code` object. Optional `details` appears on validation failures. `stack` appears only in development.

Frontend wanting `{ success, data, message }` / `{ success: false, error: { code, message } }` must adapt in its service layer.

## Seed credentials (local only)

```bash
npm run seed
```

| Role | Email | Password |
|---|---|---|
| customer | `customer@sharework.dev` | `ShareWorkDev1!` |
| provider | `provider@sharework.dev` | `ShareWorkDev1!` |
| admin | `admin@sharework.dev` | `ShareWorkDev1!` |

Seed refuses `NODE_ENV=production`. Repeat runs upsert the same development records.
