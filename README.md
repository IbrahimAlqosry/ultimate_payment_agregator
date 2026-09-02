# Aggregator Platform

Angular 22 console for the **Aggregator Platform** — connecting ERP system providers and banks / licensed wallets in **Yemen**. Authenticated slices cover the **Platform Operator**, **Merchant** (Al-Amal Pharmacies), and **Financial Institution** (Tadhamon Bank) portals from the Ultimate pay Figma file.

The app is **standalone**, **zoneless**, **SCSS**, with **dummy JWT login**, **email OTP**, **Transloco English / Arabic**, **RTL**, **Angular signal forms** on auth screens, and HTTP interceptors.

Login, OTP, forgot-password, and merchant sign-up follow the **Ultimate pay** Figma file (`ndPZQD4CLQqDbhJcd51MIW`, login node `2:9`).

## Architecture

```
src/
  environments/          apiUrl + useMockApi (swap mock → live API here)
  app/
    core/                singleton services, interceptors, guards, models, i18n
      auth/              JWT session, functional guards, Bearer interceptor
      http/              AtlasApi, loading, errors, mock backend
      i18n/              Transloco loader, locale/RTL, page TitleStrategy
      notifications/     toast service
    shared/              language switch, page header, data states, search, progress, toasts
    features/            login, shell, dashboard, merchants, payment points, operators, status
```

Path aliases: `@core/*`, `@shared/*`, `@env/*`.

## Run locally

Needs Node.js **22.22.3** or newer.

```bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm use 22.22.3

npm install
npm start
```

The app serves at [http://127.0.0.1:43123](http://127.0.0.1:43123).

```bash
npm run build   # production build
npm run lint    # angular-eslint
npm test        # Vitest unit tests
```

## Demo login

Interactive users authenticate with **email + password**, then a **6-digit OTP** (dummy code `123456`, 5 minute expiry). Ten failed password attempts lock the account for the dummy 3-hour window.

Password policy from the BRD: at least 8 characters, letters and numbers. Operator emails use the hardcoded `@aggregator.ye` domain. Pick the matching audience tab on login or credentials fail.

| Email | Password | Portal / role | After OTP |
| --- | --- | --- | --- |
| `admin@aggregator.ye` | `Agg12345!` | Platform Operator — Admin | Full operator nav including Platform Operators. Can approve. Never Maker. |
| `maker@aggregator.ye` | `Agg12345!` | Platform Operator — Maker | Operator nav without Operators. Can see queues; cannot approve. |
| `checker@aggregator.ye` | `Agg12345!` | Platform Operator — Checker | Operator nav without Operators. Approve / reject pending merchants, FIs, ERPs, integration requests. |
| `reader@aggregator.ye` | `Agg12345!` | Platform Operator — Reader | Same operator screens, read-only. No approve actions. No Operators admin. |
| `finance@alamal.ye` | `Agg12345!` | Merchant — Finance lead, Al-Amal Pharmacies | Merchant portal: own payment points, integration user, notification delivery. |
| `ops@tadhamon.ye` | `Agg12345!` | Financial Institution — Operations, Tadhamon Bank | FI portal: pending point approvals, all Tadhamon points, notifications, integration user, institution profile. |

Sign-in returns a dummy JWT after OTP. The token is stored in `localStorage` as `aggregator.token`. There is no real backend. Dummy Yemen merchants, banks, wallets, ERPs, and notifications live in `src/app/core/http/mock-data.ts`.

Merchant sign-up is public in the BRD and stays **Pending** until two different Platform Operators complete maker-checker approval.

## HTTP interceptor map

Registered in `src/app/app.config.ts`. Angular runs them **outer → inner on the request**, reverse on the response:

| Order | Interceptor | Role |
| --- | --- | --- |
| 1 | `loadingInterceptor` | Counts in-flight `/api` calls for the top progress bar |
| 2 | `errorInterceptor` | **401 / 404 / 501 / 503** → status pages (401 also clears the session). **403 / 400 / other 5xx / network** → friendly error toast |
| 3 | `authInterceptor` | Adds `Authorization: Bearer …` on `environment.apiUrl` except `/auth/*` |
| 4 | `mockBackendInterceptor` | In-memory API, **only if** `environment.useMockApi` is `true` |

Guards: `canMatch` + `canActivate` (`authMatch` / `authGuard` for the shell, `guestMatch` / `guestGuard` for login, `audienceGuard` for merchant / FI / operator routes, `adminGuard` for `/operators`). Route `title` keys are translated by `TranslocoTitleStrategy`.

Success and error feedback uses a bottom-end toast card (`ToastService` + `app-toast-host`): approve/reject, onboard submits, login/OTP, register, and password reset fire a friendly EN/AR message. HTTP 403, 400, 5xx, and network failures toast from `errorInterceptor` instead of raw `FORBIDDEN` / `Request failed` text.

## Replace the mock API

1. Point `apiUrl` at the real host in `src/environments/environment.ts` (and `environment.production.ts`).
2. Set `useMockApi: false`. That drops `mockBackendInterceptor` from the stack.
3. Keep `AtlasApi` and `AuthService` — they already use `HttpClient` + `apiUrl()`.

Typed errors live in `src/app/core/http/http-error.ts` (`ApiError` / `readApiError`).

## Design tokens

Tokens live in `src/styles.scss` on `:root`. Login / OTP / register use the Ultimate pay Figma palette in `src/app/features/login/auth-screen.scss` (`#1fa64d` on `#efe8e8`). The authenticated shell matches Figma dashboards `10:8` / `15:9` / `17:1629`: charcoal sidebar `#2a2a2b`, green active bar, content `#efe8e8`.

| Token | Use |
| --- | --- |
| `--bg`, `--bg-elev`, `--bg-muted` | Page and card surfaces |
| `--ink`, `--muted`, `--line` | Text and borders |
| `--navy`, `--login-navy-mid`, `--login-gold`, `--login-sand` | Login visual |
| `--login-panel`, `--login-input-h`, `--login-gap`, `--login-pad-x/y` | Login form metrics |
| `--accent`, `--accent-hover`, `--accent-ink` | Primary actions |
| `--teal`, `--teal-hover`, `--teal-soft` | Shell, focus, badges |
| `--danger`, `--warn`, `--ok` | Status color |
| `--radius`, `--radius-sm`, `--shadow` | Shape |
| `--font` | Inter (self-hosted 400/500/600/700/800) + IBM Plex Sans Arabic (self-hosted 400/500/600/700) |

Layout uses logical CSS (`inset-inline`, `text-align: start`) so RTL does not need a second stylesheet. Arabic sets `dir="rtl"` and `lang="ar"` on `<html>`.

Screens: bilingual Ultimate pay login (EN/AR), OTP, forgot/reset password, merchant sign-up, role-aware shell, operator / merchant / FI dashboards, merchants, banks & wallets, ERP list, integration requests, operators (Admin only), reports, payment points, merchant ERP webhook settings, FI notification log, integration user, institution profile, account settings, and `/401` `/404` `/501` `/503`.
