# Backend issue reports

Test environment: `http://88.80.145.121:9519` (the remote domain — not `localhost:8080`).

**Why requests below carry `Host: localhost:8080`:** the backend validates the `Host` header
against an allowlist and only accepts `localhost:8080` (matching the guide's documented test
base), regardless of the actual address the request is sent to. Without that header, **every**
path on the remote domain — `/`, `/healthz`, `/api/v1/...` — returns a blanket `400 Bad Request`
with no indication `Host` is the problem. We are not connecting to `localhost:8080` anywhere in
this file; every request below goes to the real remote domain `88.80.145.121:9519`, with `Host:
localhost:8080` sent alongside it purely to pass that check. This also affects the running app:
the dev server's proxy (`proxy.conf.json`) and the IIS production deployment
(`public/web.config`) both carry the same `Host: localhost:8080` override.

This file tracks only **currently open** items — confirmed problems that need backend action and
that we're actually blocked on. It does **not** track:
- Things we simply haven't been able to test (e.g. anything requiring a Financial Institution
  credential — this environment has no FI test account, no way to self-serve one, and no
  debug/mail-capture endpoint to retrieve one). That's a testing-access gap on our side, not a
  backend issue.
- Gaps that turned out not to be gaps: Platform Operators don't need payment-point visibility —
  it's Merchant/FI data, not something an Operator acts on — so the real API having no
  Operator-wide payment-points listing endpoint (only 5 session-scoped ones exist: `GET/POST
  /payment-points`, `GET /payment-points/{id}`, `GET /payment-points/pending-approval`, `POST
  /payment-points/{id}/decision` — confirmed via `/openapi/v1.json`, re-checked 2026-09-16) isn't
  a blocker at all. The earlier mock-data "Payment Points" screen under the Operator nav was
  removed for exactly this reason, not because the backend needs to add anything.

Every prior entry in this file (four v3.0-era bugs, the v6.0 FI-directory/payment-point-creation
endpoints, the 2026-09-16 password-change/payment-points-list endpoints) was re-verified live as
fixed/working as of 2026-09-16 and removed. Full history is in git
(`git log -- docs/BACKEND_ISSUES.md`).

## Open issues

1. **Host header requirement has no error message.** The environment rejects any request whose
   `Host` header isn't `localhost:8080`, even when connecting to the remote domain
   `88.80.145.121:9519` directly — every path returns a generic `400` with no indication `Host`
   is the problem. Not blocking (worked around via the proxy config), but worth a fix or at least
   a clearer error so the next person testing against the remote domain doesn't lose time on it.

2. **Feature request: no Platform Operator self-profile edit endpoint at all.** Checked the full
   `/openapi/v1.json` (2026-09-17) and guide v7.0 §8.6 — `GET /platform-operators/me` is
   explicitly documented as read-only ("no edit/email-change action"), and no `PUT`/`PATCH`
   equivalent exists anywhere in the spec. This means there is currently no real way for a
   Platform Operator to change their own display name, phone number, or notification
   preferences. In the UI, Account Settings' "Profile Info" form (name/phone) and its
   "Notification Preferences" toggles (email/SMS) are really one single mock feature, not two
   separate ones: the toggles save immediately on change, and the "Profile Info" form's Update
   Profile button also resends the current toggle state alongside name/phone in the same call —
   both paths ultimately hit the one old mock `PUT /profile/operator` endpoint
   (`AtlasApi.updateOperatorProfile`), which has no real counterpart. Contrast with Merchant
   (`PUT /profiles/merchant`) and FI (`PUT /profiles/financial-institution`), which both have
   real self-edit endpoints — Platform Operators are the one audience missing this entirely.
   Needs a real `PUT/PATCH /platform-operators/me` (or similar) before either control can be
   wired to anything real; until then both remain flagged as mock/prototype-only in the UI.

---

*Last checked live 2026-09-17: the `Host` header requirement still returns an unhelpful generic
`400`; the full OpenAPI spec still has no Platform Operator self-edit endpoint of any kind.*
