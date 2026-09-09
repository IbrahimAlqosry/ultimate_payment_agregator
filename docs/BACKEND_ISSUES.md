# Backend issue reports (v3.0 guide)

## Financial Institution activation is stuck in `provisioning` — `503` on approval

Found while live-verifying Phase 5 (Merchant/FI profiles). Created a fresh FI onboarding
application as Maker, approved it as Admin (`POST
/api/v1/financial-institution-onboarding/applications/{id}/decision` with
`{"decision":"approved",...}`).

The decision itself is persisted (status moves `pendingChecker` → `provisioning`, `decidedAt` is
set), but the HTTP response is:

```json
{"type":"...#section-15.6.4","title":"Service unavailable","status":503,"detail":"A required service is temporarily unavailable.",...}
```

Polling the application afterwards (`GET .../applications/{id}`) repeatedly shows it permanently
stuck at `status: "provisioning"` — `activatedAt` never gets set, and it never reaches `active`.
Likely a downstream dependency failing (e.g. the service that generates/emails the FI's temporary
bootstrap password, per `POST /auth/bootstrap/financial-institution`'s
`temporaryPassword`/`newPassword` shape) — since Merchant self-service approval (which needs no
such downstream step, the merchant already set their own password at registration) completes to
`active` immediately with no error.

**Impact:** no Financial Institution can currently be activated in this environment, which blocks
testing anything that requires a *real, active* FI: FI self-login, the FI's own profile
(`GET/PUT /profiles/financial-institution`), the Platform-governed FI profile change flow
(`/profiles/financial-institutions/{id}` — confirmed `404` for the stuck application above, since
it never became a real FI), and Payment Points' FI-decide step.

*The Merchant and ERP-systems flows do not depend on this and were both live-verified working
end-to-end, including PUT on `/profiles/merchant`.*

---

# Backend issue report — Platform Operator Administration API (v3.0 guide §10)

Found while wiring the UI's "Users / Platform Operators" screen against the real backend
(`http://88.80.145.121:9519`), via curl through the dev proxy, using the seeded test accounts
(`platform.admin@example.test`, `platform.maker@example.test`, `platform.checker@example.test`).

## Issue 1 — `GET /api/v1/platform-operator-administration/operators` returns only the caller's own record, not a directory

Expected (per the guide/OpenAPI, `PlatformOperatorPageResponse`): a paged list of all platform
operators, so an Admin/Checker/Maker can browse the team.

Observed: every account, regardless of role, gets back exactly one item — themselves.

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

**Impact:** there is currently no way for anyone — including Admin — to see a directory of
platform operators through this API. The UI can only show "my own operator profile."

## Issue 2 — `POST /api/v1/platform-operator-administration/invitations` always returns a generic `400 Bad Request`

Tested as `platform.maker@example.test`, who does carry `platform.operators.invite` (confirmed
via `GET /auth/me`). Tried every reasonable payload variation, all matching the documented
`PlatformOperatorInvitationRequest` schema exactly (`email`, `role`, `permissions[]`,
`additionalProperties: false`):

- Fresh, never-used email addresses (multiple domains tried: `.test`, `gmail.com`)
- Every `role` enum value (`reader`, `maker`, `admin`)
- Various `permissions` arrays: empty `[]`, a single permission, the exact permission set an
  existing operator of that role already has (copied from their own `/auth/me` response)

Every attempt returned the same generic error, with no field-level detail:

```json
{
  "type": "https://www.rfc-editor.org/rfc/rfc9110#section-15.5.1",
  "title": "Bad request",
  "status": 400,
  "detail": "The request could not be processed.",
  "instance": "urn:payment-aggregator:request:...",
  "traceId": "..."
}
```

**Control test** — confirmed this isn't a permission problem: calling the same endpoint as
`platform.admin@example.test` (who does *not* carry `platform.operators.invite`) correctly
returns `403 Forbidden` with a distinct message. So the endpoint is live and permission-checked;
the Maker's request is passing auth and failing some other validation that isn't reflected in the
OpenAPI schema or the error body.

**Impact:** no new Platform Operator can currently be invited through the API, which blocks
building and testing the whole invite → accept-invitation → decide flow end-to-end.

## Requested from backend team

1. Confirm whether `GET .../operators` is intentionally scoped to "self only," or whether it's
   meant to return the full team (and if scoped, what permission/role is meant to see the full
   list — none of Admin/Maker/Checker currently can).
2. Return field-level validation detail on the `invitations` 400 (or tell us what's actually
   wrong with the payload above) so we can complete the invite flow.

*(Filed after the v3.0 guide ERP-systems work (Phase 3) was completed and live-verified
end-to-end — Maker submit → Checker approve → appears in `/erp-systems/choices` — with no issues
found there.)*
