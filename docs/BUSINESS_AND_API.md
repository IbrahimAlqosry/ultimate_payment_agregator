# Business Context & API Integration Guide

This document exists for two purposes:

1. **Understand the business** — give anyone (a new developer, or a future Claude
   Code session) enough context on the Aggregator Platform's business rules to work
   on this codebase without re-reading the full BRD.
2. **Connect the real backend** — once the backend developer hands over the live
   API, this is the checklist and contract reference for swapping out the mock
   backend without breaking the UI.

The source of truth for business rules is the **Business Requirements Document
(BRD)** — "Aggregator Platform — Connecting ERP Systems & Banks" (Yemen market,
prepared for Anas). If anything here conflicts with a newer BRD revision, the BRD
wins; update this file to match.

---

## 1. What this platform is

An aggregator that sits between **ERP systems** (merchant point-of-sale/back-office
software) and **banks / licensed wallets** in Yemen, so a merchant can accept a
payment at a bank/wallet and have that payment routed back to their own ERP as a
notification, matched against an invoice.

Three actor categories, each with its own portal in this app:

| Actor | Who | Self-service? | Approval |
|---|---|---|---|
| **Platform Operator** | Internal aggregator staff | No — invite-only by an Admin | N/A (they *are* the approvers) |
| **Merchant** | A business accepting payments | Yes — public sign-up | Maker-checker (2 different operators) |
| **Financial Institution (Bank/Wallet)** | A bank or licensed wallet | No — contract-gated, operator-onboarded | Maker-checker (2 different operators) |

Every Merchant and every Financial Institution account has **two kinds of users**:

- **Interactive user** — a human, logs in with email + password + OTP (web portal).
- **Integration user** — a system-to-system credential (username + password →
  bearer token, no OTP), used by an ERP or core-banking system to call the
  platform's APIs directly. Exactly **one** per Merchant and per Financial
  Institution, self-created via the portal once the Interactive account is Active.

Platform Operators are **Interactive-only** — they never have an Integration user.

## 2. The maker-checker control (Segregation of Duties)

This is the platform's central internal control, and it recurs everywhere:

> Two **different** Platform Operators must act on any onboarding/approval
> request — one **Maker** creates or reviews it, a different **Checker** gives
> final approval or rejection. The system must block the same person from being
> both.

Applies to: Merchant sign-up/onboarding, Financial Institution onboarding, ERP
System List entries, and Integration-user detail changes (Merchant and FI).

**Does not apply to**: a Bank's own approval of a merchant's payment point — that
stays a single-approver action by the Financial Institution (see §4). Maker-checker
is specifically an *internal Platform Operator* control.

Operator roles: **Maker, Checker, Reader, Admin** (an operator can hold more than
one, e.g. Checker + Reader). An **Admin** can create new operators and assign
roles, and may also act as Checker, but **can never act as Maker**.

**Current implementation gap**: the mock backend enforces role-based *who can
approve* (`canApprove` in `core/auth/access.ts`), but does **not** track or block
"the checker must be a different person than the maker" — there's no persisted
maker identity on the request to compare against. This needs a real backend
data model (see `ApprovalRequest` in the BRD's §5 data entities) with `MakerUserId`
/ `CheckerUserId` fields and a server-side check that rejects `CheckerUserId ===
MakerUserId`.

## 3. Authentication rules (BR-AUTH-*)

- Every user authenticates with email/username + password.
- **Interactive** users get an OTP emailed on every successful password check;
  login only completes after the correct OTP. OTP is valid **5 minutes**; **10**
  consecutive wrong attempts locks the account for **3 hours**.
- **Integration** users skip OTP — see the Bank/Wallet Login API (§6 below).
- Session/token lifetime: **30 minutes** for Platform Operators, **5 minutes** for
  Merchant/Financial Institution Interactive users. Integration bearer-token
  expiry/refresh is **mutually agreed per Merchant/FI**, not a fixed value.
- A password reset invalidates **all other active sessions** for that user.
- Platform Operator accounts must use a **hardcoded, pre-approved email domain**
  — enforced at code/config level, changeable only by a developer, not by any
  Admin through the app.
- Password policy: minimum 8 characters, letters and numbers.
- A Merchant/FI account **cannot log in** until checker approval passes.
- On FI approval: system generates a temporary password, emails it to the
  registered contact, forced change at first login (same mechanism for a new
  Platform Operator invite).
- Merchant sign-up: merchant sets their **own** password at sign-up (no emailed
  credentials). Verified by CR (Commercial Registration) number alone — **no
  document upload**.

**Current implementation gap**: the mock backend hardcodes the OTP code to
`123456` for everyone and does not actually deliver an email; there is no real
lockout-duration timer (it's effectively permanent until the in-memory store
resets on reload); the Integration-user "no OTP" login path is not distinctly
implemented — every `/auth/login` call goes through the OTP challenge regardless
of audience.

## 4. Integration user maintenance rules

- Creation is always self-service, no maker-checker needed (BR-AUTH-25).
- **Changing details** of an existing Integration user requires full maker-checker
  approval — for both Merchant and FI.
- **Credential rotation is the one asymmetry**: a Financial Institution may
  rotate its own Integration credential itself, any time, no approval needed
  (OTP-gated instead). A **Merchant's** credential rotation is **not** exempted —
  it follows the same maker-checker approval as any other detail change.
- Viewing (unmasking) an FI's Integration password also requires an OTP step
  first, same as regenerating it.

This asymmetry (FI self-service rotation vs. Merchant maker-checker rotation) is
easy to get backwards when wiring the real API — double check which audience is
calling `credentials/regenerate` vs. `credentials/change-request`.

## 5. Payment Points (MVP1) — the platform's first delivery-scope service

- A **Payment Point** is a merchant-registered, bank-approved endpoint that can
  receive routed payment notifications — identified by a **wallet number** or a
  **merchant point number**.
- Flow: merchant links one or more banks + payment points to their account → each
  new payment point is **Pending Approval** until the linked bank approves it →
  only an **Approved** point can receive live notifications.
- The bank-selection list when adding a point only shows FIs that are already
  onboarded and **Approved** — an FI still mid-onboarding must not be selectable.
- Bank approval/rejection of a payment point is a **single-approver** action (not
  maker-checker) — see §2. SLA: **1 working day**, tracked on the operator
  dashboard. Rejection reason is **free text**, no fixed code taxonomy.
- Currencies supported: **USD, SAR, YER**.

### Two payment-confirmation methods

- **Method A — Code entry (offline-capable)**: customer pays via bank/wallet app;
  merchant matches it to an invoice by scanning a QR code on the customer's phone
  or manually entering the transaction code/reference. Works without a live
  connection — verified once the device syncs. The platform's role here is
  limited to confirming the entered code matches the value already relayed from
  the bank via the Payment Notification API — **not** an independent validation
  against the bank.
- **Method B — Notification tap (online)**: the incoming payment notification
  appears live on the merchant's cashier system; the merchant taps it to link it
  to an invoice immediately. Requires an active connection.
- If a code can't be auto-matched (conflict, mismatch, no notification received),
  reconciliation is **manual, directly between merchant and bank** — the platform
  does not provide automated refund/escalation.

**Current implementation gap**: **Method A does not exist in the codebase at
all** — no QR scan UI, no offline code-entry, no sync-on-reconnect logic. Only
something resembling Method B's *inbound notification list* exists, and even that
is static mock data, not a live tap-to-match interaction. This is the single
biggest functional gap versus the BRD and should be flagged before anyone assumes
MVP1 is "basically done" because the screens exist.

### Notification delivery (push, not poll)

- Merchant configures a **Notification User** — their ERP's endpoint (URL, Port)
  + credentials (Username, Password) — via the Merchant menu.
- Requires Platform Operator maker-checker approval before becoming Approved.
- Once Approved, the platform pushes **every** Payment Notification it receives
  from a bank to that endpoint.
- This is a **different credential from the Integration user**: Integration User
  = how the merchant's ERP authenticates *into* the platform; Notification User =
  the endpoint the platform pushes *out to*. Don't conflate the two when wiring
  real APIs — they're opposite directions.

## 6. The two foundational APIs already specified in the BRD

These are meant to anchor the OpenAPI spec platform-wide, not just Payment Points.
Once the backend team ships them, they map directly onto `AuthService.login`/
`verifyOtp` and a to-be-added Integration/Notification client.

### 6.1 Bank/Wallet Login API (Integration user login — no OTP)

Serves **both** FI and Merchant Integration users.

```
Request:  { "UserName": string, "Password": string }
Response (success): { "IsSuccess": true,  "Code": "200", "Data": { "Token": "<jwt>" }, "Message": "successful." }
Response (failure): { "IsSuccess": false, "Code": "401", "Data": {}, "Message": "Invalid username or password." }
```

### 6.2 Payment Notification API (Bank → Platform)

`TransactionId` is the idempotency key (unique per transaction per bank) used to
de-duplicate retried/duplicate notifications. `PointNumber` identifies which of
the merchant's payment points the notification belongs to.

```
Request:
{
  "TransactionId": long,          // mandatory, bank's unique payment ID
  "TransactionStatus": string,    // mandatory. Paid = "00002", Refunded = "00007"
  "TransactionDate": DateTime,    // mandatory
  "Amount": decimal,              // mandatory, must be > 0
  "Currency": string,             // mandatory. USD | SAR | YER
  "PointNumber": string,          // mandatory
  "CashierId": string,            // optional
  "CashierName": string,          // optional
  "CustomerName": string,         // mandatory, masked per customer privacy prefs
  "CashierActivityName": string,  // mandatory, branch name
  "Notes": string                 // optional free text
}

Response (success):
{ "Name": "Payment Response", "IsSuccess": true,  "Code": 200, "Data": { "Reference": "892492685" }, "Message": "success" }

Response (failure):
{ "IsSuccess": false, "Code": "HSN-001", "Data": { "Reference": "" }, "Message": "Invalid data input" }
```

`Name` in the response is a fixed mandatory label (e.g. `"Payment Response"`) —
don't drop it when implementing the client/server contract.

### 6.3 Notification Delivery (Platform → Merchant ERP)

Push, not poll. Exact payload shape is expected to mirror §6.2's schema plus the
matched Payment Point/Invoice references — **to be finalized during OpenAPI
drafting** with the backend team; treat the current `PaymentNotification` model
in `core/models.ts` as provisional until that spec lands.

---

## 7. Current implementation state (front-end prototype)

This Angular app is a **UI-complete, business-logic-shallow prototype**, built
ahead of the real backend. Every screen implied by the BRD's Authentication and
Payment-Points sections exists and is wired to a typed HTTP client
(`AtlasApi`), but the mock backend (`core/http/mock-backend.interceptor.ts` +
`mock-data.ts`, gated by `environment.useMockApi`) fakes the data with simple
in-memory arrays and does not implement the deeper business rules. Treat the
mock layer and `core/models.ts` as a rough scaffold to validate against the BRD
and the real API contract — not as the source of truth for what the backend
must do.

### Implemented at UI + mock level
- Login (multi-audience: operator/merchant/institution) → OTP → session
- Forgot/reset password screens, account-locked page
- Merchant self-sign-up + pending state; operator-assisted onboarding
- Merchant/FI/ERP-System list + detail + approve/reject (single-step, see gap below)
- Platform Operator invite (2-step wizard) + role & per-operator screen-permission matrix
- Payment Point registration (merchant) + approval (institution) + three scoped list views
- Notification User / webhook config (merchant), notification log (institution)
- Integration user credential view (masked, OTP-style reveal) + change-request flow
  + Integration Requests approval queue (operator)
- Institution self-service contact profile, merchant self-service business profile
- Operator audit/reports screen with CSV export
- Bilingual EN/AR (Transloco) with RTL, role-aware nav shell, toasts, loading states

### Known gaps vs. the BRD (fix before/while wiring the real backend)
- **No real maker ≠ checker enforcement** — approvals are a single generic
  `POST /approvals` status flip, gated only by role, not by comparing maker vs.
  checker identity.
- **No Payment Confirmation Method A** (QR/offline code entry + sync-on-reconnect)
  anywhere in the UI or model.
- **No Bank/Wallet Login API path** distinct from the Interactive OTP flow —
  Integration-user login (§6.1) isn't modeled as a separate no-OTP endpoint.
- **No Payment Notification API ingestion or push-delivery simulation** — bank →
  platform posting and platform → merchant pushing are both just static mock
  lists, no retry/backoff engine despite the UI showing "retrying/failed" badges.
- **No SLA computation** — the dashboard's SLA numbers are hardcoded constants,
  not derived from any due-date/timestamp logic.
- **No Invoice or Payment-Match entities** — `invoice` is just a free-text string
  field on `PaymentNotification`; no reconciliation model.
- **`Settlement` model + `AtlasApi.settlements()` exist but are orphaned** — no
  route/screen consumes them.
- Reset-password screen likely doesn't consume a real reset token from the URL
  (worth re-checking once the real forgot/reset endpoints exist).

---

## 8. Connecting the real backend — checklist

The app was deliberately built so that swapping mock → live should be mostly
config, provided the real API matches (or is adapted to match) the shape below.

1. **Get the OpenAPI spec from the backend team** for both the Authentication
   foundation and Payment Points (see BRD §16, Next Steps) and diff it against
   `AtlasApi` (`src/app/core/http/atlas-api.ts`) and `AuthService`
   (`src/app/core/auth/auth.service.ts`) — these two files are the **entire**
   HTTP surface the UI calls today.
2. **Flip the mock off**: in `src/environments/environment.ts` (and
   `environment.production.ts`), set `apiUrl` to the real host and
   `useMockApi: false`. This drops `mockBackendInterceptor` from the interceptor
   chain in `app.config.ts` — no other wiring changes needed for that step alone.
3. **Reconcile `core/models.ts`** field-by-field against the real API's DTOs.
   Expect the biggest deltas around: `ApprovalRequest` (needs Maker/Checker user
   IDs + timestamps, not just a decision DTO), `PaymentNotification` (needs to
   split into the inbound bank payload vs. outbound merchant-push payload —
   see §6.2 vs §6.3), and the Integration/Notification user credential shapes.
4. **Re-implement `AuthService`** once the real Integration Login API (§6.1) and
   Interactive OTP flow are confirmed — today both audiences share one
   `/auth/login` → OTP path; the real backend must expose the no-OTP path for
   Integration users separately (BR-AUTH-3).
5. **Confirm error-shape contracts** against `core/http/http-error.ts`
   (`ApiError`/`readApiError`) and `error.interceptor.ts` — the app currently
   assumes 401/404/501/503 route to status pages and everything else toasts;
   verify the real backend's error codes/bodies line up (e.g. Code 401 vs.
   `"HSN-001"` style codes from §6.2 — those look bank-specific, not platform-wide,
   so don't assume they generalize to every endpoint).
6. **Watch the asymmetric rules** that are easy to implement backwards:
   - FI Integration-credential rotation = self-service (OTP-gated); Merchant
     rotation = maker-checker. (§4)
   - Payment Point approval = single-approver (bank side); everything else
     onboarding-related = maker-checker (two operators). (§2, §5)
   - Integration User vs. Notification User = opposite data directions, don't
     merge their models. (§5, "Notification delivery")
7. **Add the maker ≠ checker server-side check** if the real backend doesn't
   already enforce it — the current front end has no client-side way to catch
   this, so it must be enforced by whichever API owns `POST /approvals`.
8. **Re-test session lifetimes** once real tokens exist: 30 min (Operator) vs.
   5 min (Merchant/FI) Interactive sessions, vs. mutually-agreed Integration
   token expiry — today's mock JWT is a flat 12-hour, unsigned token for every
   audience.

### Current mock endpoint inventory (for the backend diff)

All prefixed with `environment.apiUrl` (currently `/api`); see `AtlasApi` and
`AuthService` for exact call sites.

```
POST /auth/login              POST /auth/otp            POST /auth/otp/resend
POST /auth/forgot             POST /auth/register

GET  /dashboard
GET  /operators               POST /operators           PUT  /operators/:id
GET  /merchants                POST /merchants          GET  /merchants/:id
GET  /institutions             POST /institutions       GET  /institutions/:id
GET  /fi-options               GET  /erp-options
GET  /payment-points           POST /payment-points      GET  /payment-points/:id
GET  /erps                     POST /erps                GET  /erps/:id
GET  /integration-requests     GET  /integration-users
GET  /notifications
GET  /audit
GET  /inbox
GET  /settlements

GET  /profile
PUT  /profile/merchant         PUT  /profile/operator    PUT  /profile/password
PUT  /institution-profile/contact
GET  /institution-profile

GET  /webhook                  PUT  /webhook
GET  /credentials              POST /credentials/regenerate
POST /credentials/change-request

POST /approvals                (generic decide: {entity, id, decision})
GET  /simulate/:status         (401 | 404 | 501 | 503, dev-only)
```

None of these are guaranteed to match the real backend's naming/shape — they are
simply what today's mock answers. Use this list as a "what the UI currently
expects" reference when reviewing the backend's OpenAPI spec, not as a spec to
hold the backend to.

---

## 9. Where to look for more detail

- Full BRD: shared separately (not stored in this repo as of writing) — covers
  Sections 1–16 including field-level form definitions (§6), user stories with
  acceptance criteria (§7, §13), proposed data entities (§5, §12), and the two
  foundational API schemas in full (§14).
- `README.md` (repo root) — how to run the app, demo login credentials, the
  interceptor stack, and design tokens.
- `src/app/core/models.ts` — current TypeScript shape of every entity.
- `src/app/core/http/mock-data.ts` — what the mock backend seeds/returns today.
