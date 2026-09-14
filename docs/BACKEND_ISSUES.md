# Backend issue reports (v3.0 / v4.0 / v5.0 guides)

Test environment: `http://88.80.145.121:9519` (the remote domain — not `localhost:8080`).

**Why requests below carry `Host: localhost:8080`:** the backend validates the `Host` header
against an allowlist and only accepts `localhost:8080` (matching the v5.0 guide's documented test
base), regardless of the actual address the request is sent to. Without that header, **every**
path on the remote domain — `/`, `/healthz`, `/api/v1/...` — returns a blanket `400 Bad Request`
with no indication `Host` is the problem. We are not connecting to `localhost:8080` anywhere in
this file; every request below goes to the real remote domain `88.80.145.121:9519`, with `Host:
localhost:8080` sent alongside it purely to pass that check. Confirmed by testing the same request
twice, identical in every way except the `Host` header: `400` without it, normal response with it.

This also affects the running app, not just curl testing here: the dev server's proxy
(`proxy.conf.json`) used to send the target's own address as `Host` (`changeOrigin: true`), which
the backend now rejects the same way. Fixed by setting `changeOrigin: false` and an explicit
`headers: { "Host": "localhost:8080" }` override, so the app's own requests carry the same allowed
`Host` value while still physically connecting to `88.80.145.121:9519`.

## Open issues

### Issue 1 — Notification endpoint configuration submission always returns `503` (v4.0/v5.0 §15.2)

**Status: open.** First found while live-verifying the v4.0 notification-settings feature;
re-verified 2026-09-13 and 2026-09-14, most recently against the remote domain per the `Host` note
above — identical result every time.

`POST /api/v1/notification-endpoint-configurations` (Merchant session, `basic` auth mode, a valid
HTTPS `callbackUrl`) always returns:

```json
{"type":"...#section-15.6.4","title":"Service unavailable","status":503,"detail":"A required service is temporarily unavailable.",...}
```

Ruled out one at a time, same result every time:
- An illustrative/unreachable callback URL (`https://merchant.example.test/...`) — `503`.
- A real, publicly reachable HTTPS URL (`https://httpbin.org/status/200`) — still `503`, which
  rules out "can't reach the destination" as the cause. Per the guide's own §15.4, submission only
  checks URL syntax/ports — destination reachability isn't checked until maker-submit/approval —
  so this `503` happens before any outbound check should even occur.
- A brand-new merchant account created specifically for this test — still `503`, ruling out
  anything account-specific.

**Impact:** no Merchant can currently save a notification endpoint configuration at all, which
blocks the whole feature end-to-end (Maker review, Checker/Admin approval, active-version
selection). The Platform review queue itself (`GET
/api/v1/notification-endpoint-configurations/reviews`) does work and correctly returns an empty
page, consistent with nothing ever having been submitted successfully.

Likely the same class of issue as Issue 2 below — a shared downstream dependency (possibly the
same delivery/outbox infrastructure) failing in this environment.

### Issue 2 — Financial Institution activation is stuck in `provisioning`, `503` on approval

**Status: open.** First found while live-verifying Phase 5 (Merchant/FI profiles); re-verified
2026-09-13 (twice) and 2026-09-14, most recently against the remote domain per the `Host` note
above — identical result every time, three fresh applications in total.

Create a fresh FI onboarding application as Maker, approve it as Admin (`POST
/api/v1/financial-institution-onboarding/applications/{id}/decision` with
`{"decision":"approved",...}`). The decision itself is persisted (status moves `pendingChecker` →
`provisioning`, `decidedAt` is set), but the HTTP response is:

```json
{"type":"...#section-15.6.4","title":"Service unavailable","status":503,"detail":"A required service is temporarily unavailable.",...}
```

Polling the application afterwards (`GET .../applications/{id}`) shows it permanently stuck at
`status: "provisioning"` — `activatedAt` never gets set, and it never reaches `active`.

Likely a downstream dependency failing (e.g. the service that generates/emails the FI's temporary
bootstrap password, per `POST /api/v1/auth/financial-institution-bootstrap`'s
`temporaryPassword`/`newPassword` shape) — since Merchant self-service approval (which needs no
such downstream step, the merchant already set their own password at registration) completes to
`active` immediately with no error.

**Impact:** no Financial Institution can currently be activated in this environment, which blocks
testing anything that requires a *real, active* FI: FI self-login, the FI's own profile
(`GET/PUT /profiles/financial-institution`), the Platform-governed FI profile change flow
(`/profiles/financial-institutions/{id}` — confirmed `404` for the stuck application above, since
it never became a real FI), and Payment Points' FI-decide step.

*The Merchant and ERP-systems flows do not depend on this and were both live-verified working
end-to-end, including `PUT /profiles/merchant`.*

### Issue 3 — `GET /api/v1/platform-operator-administration/operators` returns only the caller's own record, not a directory

**Status: open.** First found while wiring the "Platform Operators" screen; re-verified
2026-09-13 and 2026-09-14, most recently against the remote domain per the `Host` note above —
identical result every time.

Expected (per the guide/OpenAPI, `PlatformOperatorPageResponse`): a paged list of all platform
operators, so an Admin/Checker/Maker can browse the team. Observed: every account, regardless of
role, gets back exactly one item — themselves:

```
# Logged in as platform.admin@example.test:
GET /api/v1/platform-operator-administration/operators
→ {"items":[{"userId":"b1000000-...-001","role":"admin",...}],"nextCursor":null}

# Logged in as platform.maker@example.test:
GET /api/v1/platform-operator-administration/operators
→ {"items":[{"userId":"b1000000-...-002","role":"maker",...}],"nextCursor":null}

# Logged in as platform.checker@example.test:
GET /api/v1/platform-operator-administration/operators
→ {"items":[{"userId":"b1000000-...-003","role":"checker",...}],"nextCursor":null}
```

Also, `GET /api/v1/platform-operator-administration/operators/{userId}` for another operator's
real, existing `userId` (e.g. the admin's id, fetched while authenticated as the maker) returns
`404 Not Found`, not `403 Forbidden` — i.e. it behaves as if the other operator doesn't exist at
all, for every role tested including Admin.

On 2026-09-14 the maker test account's own permission grants were confirmed updated by a backend
redeploy (now additionally carrying `platform.audit.read` and `platform.notification-deliveries
.read`, absent the day before) — so this scoping is not a stale-permissions artifact on our end,
it's the list endpoint itself still only ever returning the caller.

**Impact:** there is currently no way for anyone — including Admin — to see a directory of
platform operators through this API. The frontend's real "All Operators" tab (now live) can
therefore only ever show the signed-in operator's own record, with a banner explaining why.

### Issue 4 — `GET /api/v1/platform-operator-administration/requests` is also scoped to "submitted by me," not visible to Checker/Admin

**Status: open, found 2026-09-14** while live-verifying the newly-wired Operators screen's
"Pending Approvals" tab. Same class of bug as Issue 3, but on the change-requests queue instead of
the operators directory — and more severe, because it breaks the maker-checker workflow itself,
not just a browse convenience.

Three real requests exist in this environment (two operator invitations, one role-change), all
still `status: "pendingChecker"`, all submitted by `platform.maker@example.test`. Querying the
same endpoint as three different accounts:

```
# Logged in as platform.maker@example.test (the actual submitter):
GET /api/v1/platform-operator-administration/requests
→ {"items":[ <all 3 requests> ],"nextCursor":null}

# Logged in as platform.admin@example.test (has platform.operators.decide):
GET /api/v1/platform-operator-administration/requests
→ {"items":[],"nextCursor":null}

# Logged in as platform.checker@example.test (has platform.operators.decide):
GET /api/v1/platform-operator-administration/requests
→ {"items":[],"nextCursor":null}
```

The Maker sees everything they personally submitted; every other role — including both roles that
actually hold `.decide` — sees nothing at all, even though those exact same 3 requests are sitting
in `pendingChecker` waiting on them. This isn't a frontend bug: confirmed directly against the raw
API with curl, no UI involved.

**Impact:** a Checker/Admin cannot discover pending operator change requests through the API at
all, which means the decide step of the maker-checker flow (`POST .../requests/{requestId}
/decision`) can never actually be reached in practice — nobody with `.decide` can ever learn a
`requestId` exists to decide on. Combined with Issue 3, the entire Platform Operator
administration feature is currently unusable end-to-end on the backend side, even though every
individual write endpoint (invite, propose-change, decide) works correctly in isolation.

## Requested from backend team

1. Confirm whether `GET .../operators` (Issue 3) is intentionally scoped to "self only," or
   whether it's meant to return the full team — and if scoped, what permission/role is meant to
   see the full list, since none of Admin/Maker/Checker currently can. Still open as of
   2026-09-14.
2. Same question for `GET .../requests` (Issue 4) — this one is more urgent, since it currently
   means Checker/Admin can never see what's waiting on their own decision. Likely the same root
   cause as Issue 3 (a query scoped to the caller instead of the full table/collection).
3. Not a bug, just worth flagging: the environment now rejects any request whose `Host` header
   isn't `localhost:8080`, even when connecting to the remote domain `88.80.145.121:9519`
   directly — every path returns a generic `400` with no hint that `Host` is the problem. Worth a
   heads-up to anyone else testing against the remote domain so they don't lose time on it the way
   we did.

---

*Filed after the v3.0 guide ERP-systems work (Phase 3) was completed and live-verified end-to-end
— Maker submit → Checker approve → appears in `/erp-systems/choices` — with no issues found
there.*
