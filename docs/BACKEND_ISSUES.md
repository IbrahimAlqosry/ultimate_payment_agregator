# Backend issue reports (v3.0 - v6.0 guides)

Test environment: `http://88.80.145.121:9519` (the remote domain — not `localhost:8080`).

**Why requests below carry `Host: localhost:8080`:** the backend validates the `Host` header
against an allowlist and only accepts `localhost:8080` (matching the guide's documented test
base), regardless of the actual address the request is sent to. Without that header, **every**
path on the remote domain — `/`, `/healthz`, `/api/v1/...` — returns a blanket `400 Bad Request`
with no indication `Host` is the problem. We are not connecting to `localhost:8080` anywhere in
this file; every request below goes to the real remote domain `88.80.145.121:9519`, with `Host:
localhost:8080` sent alongside it purely to pass that check.

This also affects the running app, not just curl testing here: the dev server's proxy
(`proxy.conf.json`) sends the same `Host: localhost:8080` override (`changeOrigin: false` +
explicit header), and the IIS production deployment (`public/web.config`) has the matching
`serverVariables` fix, so the app's own requests carry the allowed `Host` value while physically
connecting to `88.80.145.121:9519`.

## All previously open issues — confirmed fixed live 2026-09-15

Re-verified end-to-end against the real environment using the v6.0 guide's actual test
credentials (`platform.{admin,maker,checker}@example.test`), not just the backend team's word for
it. All four are closed.

### Issue 1 — Notification endpoint configuration submission (was: always `503`)

**Fixed, confirmed live.** Registered a fresh merchant, activated it (Maker submit → Admin
approve), logged in as that merchant, and submitted a real configuration:

```
POST /api/v1/notification-endpoint-configurations
{"callbackUrl":"https://httpbin.org/status/200","authentication":{"mode":"basic","username":"callback-user","password":"..."}}
→ 202 Accepted
{"configurationId":"f9cf0a00-...","version":1,"status":"awaitingMaker","isActive":false,"isVerified":false,"approvalRequired":true,...}
```

Previously this always returned `503` regardless of destination or account. Now returns the
documented `202` with a real `awaitingMaker` version.

### Issue 2 — Financial Institution activation (was: stuck in `provisioning`, `503` on approval)

**Fixed, confirmed live.** Created a fresh FI application as Maker, approved it as Admin:

```
POST /api/v1/financial-institution-onboarding/applications/{id}/decision {"decision":"approved",...}
→ 200 OK
{"status":"active","decidedAt":"2026-09-15T07:26:55Z","activatedAt":"2026-09-15T07:26:57Z",...}
```

Went straight to `active` with `activatedAt` set — no `503`, no stuck `provisioning`.

### Issue 3 — Operators directory (was: scoped to caller only, even for Admin)

**Fixed, confirmed live** — matches the v6.0 guide's documented behavior change. Logged in as
Admin and Maker separately:

- **Maker**: `GET .../operators` → 1 item (self only) — correct, matches the guide's documented
  scope for non-Admin roles.
- **Admin**: `GET .../operators` → all 3 operators (admin, maker, checker), each with a real
  `email` field now present on every row.

Frontend (`users.ts`/`users.html`) already built for this: shows `email`, and the self-only banner
now only renders for non-Admin roles.

### Issue 4 — Requests queue (was: scoped to "submitted by me," invisible to Checker/Admin)

**Fixed, confirmed live.** Logged in as Admin (holds both `.read` and `.decide`):

```
GET /api/v1/platform-operator-administration/requests
→ {"items":[ <4 pending requests, submitted by the Maker> ], "nextCursor": null}
```

Previously this returned an empty list for every role except the original submitter. The
maker-checker decide step is now reachable in practice.

## v6.0 additions — Merchant side confirmed live 2026-09-16, FI side still unverified

The v6.0 guide (2026-09-15) added real endpoints that close previously-documented,
guide-acknowledged gaps. Registered and activated a fresh merchant end-to-end today to verify:

- `GET /api/v1/financial-institutions/choices` — **confirmed live**, real FI directory, replacing
  the out-of-band-UUID convention in `add-payment-point.ts` and `payment-inquiry.ts`. Returned the
  test FIs correctly for a fresh merchant session.
- `POST /api/v1/payment-points` with an FI picked from that directory — **confirmed live**,
  created successfully (`status: "pendingFinancialInstitution"`).
- `GET /api/v1/payment-points/pending-approval` (FI pending queue, `pp-approvals.ts`) and
  first-time credential reissue (`bootstrap-reissues.ts` + the merchant/FI-detail action) —
  **still not live-verified**; no FI test credentials are available in this environment (only the
  three Platform accounts and merchants we register ourselves), and reissue needs a real expired
  credential to exercise meaningfully. Built to the documented contract, not yet exercised.

## New in the 2026-09-16 OpenAPI update — confirmed live

### `POST /api/v1/auth/password/change` — confirmed live

Any authenticated portal session (tested with a Merchant). Success revokes the session:

```
POST /api/v1/auth/password/change {"currentPassword":"...","newPassword":"..."}
→ 204 No Content
Set-Cookie: __Host-pa-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ...
```

Confirmed the old password stops working and the new one logs in successfully afterward. Wired
into `account-settings.ts`'s existing password form (previously mock-only) — success now signs
the user out (`auth.logout(true)`) instead of just resetting the form, since the session is
already dead server-side.

### `GET /api/v1/payment-points` and `GET /api/v1/payment-points/{id}` — confirmed live for Merchant, `403` for Platform

```
GET /api/v1/payment-points          (Platform Maker/Admin session) → 403 Forbidden
GET /api/v1/payment-points          (Merchant session)             → 200, own points only
GET /api/v1/payment-points/{id}     (Merchant session, own point)  → 200, full record
```

So this closes the Merchant "My Payment Points" and (presumed, not yet FI-tested) FI "All Payment
Points" gaps, but **not** the Platform-operator-wide view — that's a confirmed `403`, not a bug,
matching the pattern of every other operator-wide listing gap already documented. Wired into new
`real-payment-points.ts`, replacing the mock `orders.ts` for the `/my-payment-points` and
`/all-payment-points` routes; `orders.ts`/`point-detail.ts` now serve only the remaining mock
Platform-operator `/payment-points` route, with the now-dead Merchant/FI branches removed.

FI-side scoping of `GET /payment-points` (does it return only that FI's linked points?) is
inferred from the Merchant behavior and the API's session-scoped design, not independently
confirmed — no FI test credentials available. Verify once one exists.

## Requested from backend team

1. Not a bug, just worth flagging: the environment rejects any request whose `Host` header isn't
   `localhost:8080`, even when connecting to the remote domain `88.80.145.121:9519` directly —
   every path returns a generic `400` with no hint that `Host` is the problem. Worth a heads-up to
   anyone else testing against the remote domain so they don't lose time on it the way we did.

---

*Filed after the v3.0 guide ERP-systems work (Phase 3) was completed and live-verified end-to-end
— Maker submit → Checker approve → appears in `/erp-systems/choices` — with no issues found
there. All four issues below that section closed and confirmed live 2026-09-15.*
