---
name: frontend-auth
description: Log in, stay authenticated, and call the JWT cookie-authenticated GraphQL API from a browser frontend. Use for login/logout/refresh flows, CSRF and cookie setup, session checks, and auth troubleshooting.
---

# Frontend JWT Auth (cookie-based)

Backend: `src/authentication/mutation.py`, `src/authentication/tokens.py`,
`src/authentication/middleware.py`. Auth mutations live **only** on the
dashboard endpoint:

- GraphQL: `/dashboard/graphql/` (login, refresh, logout, and all dashboard queries)
- Public `/graphql/` has no auth mutations.

## Mental model (read this first)

You **never touch tokens in JS**. `login` sets two `HttpOnly` cookies and the
browser attaches them automatically. Your only jobs:

1. Send `credentials: 'include'` on every request.
2. Send the `X-CSRFToken` header on every `POST` (see below — required).
3. Refresh the access cookie before it expires (5 min default).
4. Switch on the typed `status` field — auth failures are data, not exceptions.

Token lifetimes (defaults, overridable via env): access
`ACCESS_TOKEN_LIFETIME_MINUTES=5`, refresh `REFRESH_TOKEN_LIFETIME_DAYS=7`.

## 0. One-time fetch setup

```js
const API = 'https://api.example.com/dashboard/graphql/';

async function gql(query, variables) {
  const res = await fetch(API, {
    method: 'POST',
    credentials: 'include', // REQUIRED: sends/receives cookies
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'), // REQUIRED: 403 without it
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

function getCookie(name) {
  return document.cookie.split('; ')
    .find(c => c.startsWith(name + '='))?.split('=')[1] ?? '';
}

// Prime the CSRF cookie once per page load (endpoint sets it on GET):
await fetch(API, { credentials: 'include' });
```

Why: the GraphQL view is **not** CSRF-exempt — `POST` without `X-CSRFToken`
returns `403`, and the `csrftoken` cookie is set via `ensure_csrf_cookie`.
(With `axios`: `withCredentials: true` + read `csrftoken` the same way.
With Apollo Client: `credentials: 'include'` plus a header link for CSRF.)

## 1. Login

```graphql
mutation Login($email: String!, $password: String!) {
  login(email: $email, password: $password) {
    ok
    status      # SUCCESS | INVALID_CREDENTIALS
    message
    expireDate  # access-cookie expiry, ISO-8601. Start your refresh timer from this.
  }
}
```

```js
const { data } = await gql(LOGIN, { email, password });
if (!data.login.ok) {
  // status === 'INVALID_CREDENTIALS' (also covers disabled accounts)
  showError(data.login.message);
  return;
}
// Logged in. Cookies (access + refresh) are already stored by the browser.
// Schedule refresh at ~80% of lifetime using expireDate.
scheduleRefresh(new Date(data.login.expireDate));
```

Notes:

- `ok: true` does **not** mean "can use the dashboard" — it means cookies
  were set. Dashboard queries additionally require the `DASHBOARD_ACCESS`
  permission (see Troubleshooting). Superusers bypass all permission checks.
- The access token carries a permission snapshot. If an admin grants a user
  new permissions, call `refresh` (or re-login) — otherwise the token's
  permission set is stale.

## 2. Authenticated calls (nothing special)

```graphql
query Me { me { email } }
```

Just call `gql()` — cookies go along automatically. Do **not** look for a
token in JS: both cookies are `HttpOnly`, and the permission claim inside the
JWT is Fernet-encrypted (opaque to the frontend by design). Session state =
`me` query; expiry state = `expireDate` from the last login/refresh.

## 3. Staying logged in (refresh)

The `refresh` mutation takes **no arguments** — it reads the `refresh` cookie:

```graphql
mutation Refresh {
  refresh { ok status message expireDate }
}
```

```js
async function authedGql(query, variables, retried = false) {
  const res = await gql(query, variables);
  if (!retried && needsRefresh(res)) {
    const r = await gql(REFRESH);
    if (r.data?.refresh?.ok) {
      scheduleRefresh(new Date(r.data.refresh.expireDate));
      return authedGql(query, variables, true); // retry once
    }
    redirectToLogin(); // REFRESH_TOKEN_MISSING | REFRESH_TOKEN_EXPIRED | ...
  }
  return res;
}

// An expired access cookie yields an anonymous user, which surfaces as a
// permission error on dashboard fields (message contains 'DASHBOARD_ACCESS'
// or 'permissions'), not as HTTP 401. Treat that as "try refresh once".
function needsRefresh(res) {
  const msgs = (res.errors ?? []).map(e => e.message).join(' ');
  return /permission|authenticated|anonymous|unauthorized/i.test(msgs);
}
```

`status` values for `refresh`: `SUCCESS`, `REFRESH_TOKEN_MISSING`,
`REFRESH_TOKEN_EXPIRED`, `INVALID_REFRESH_TOKEN`, `INVALID_TOKEN_TYPE`,
`USER_NOT_FOUND`. Any non-`SUCCESS` → send the user to login.
(`ACCOUNT_DISABLED` exists in the enum but is never returned; disabled
accounts fail login as `INVALID_CREDENTIALS`.)

## 4. Logout

```graphql
mutation Logout { logout { ok status message } }
```

Clears both cookies. No client-side token cleanup exists (there is nothing
stored in JS).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `403` on every `POST` | Missing CSRF header | Prime via `GET`, send `X-CSRFToken: <csrftoken>` |
| `login.ok: true`, but next query acts logged-out (dev on `http://localhost`) | Cookies are `Secure`-flagged; browsers reject them over plain HTTP | Serve backend over HTTPS locally, or gate `secure=` on `DEBUG`/env |
| Cookies never stored/sent, frontend on a **different origin** than the API | `refresh` is `SameSite=Strict`, `access` is `SameSite=Lax` — cross-site `fetch` carries neither | Same-site deploy, or switch cookies to `SameSite=None` **with** `Secure` + `CORS_ALLOW_CREDENTIALS=true` |
| `"You don't have these permissions ...: DASHBOARD_ACCESS"` | Authenticated but unauthorized (e.g. plain registered user) | Use a superuser / grant the permission in admin, then `refresh` |
| Permission granted but still denied | Access token embeds permissions at login/refresh time | Call `refresh` (rotates access token with fresh permissions) |
| Random logouts every ~5 min | Access cookie expired, no refresh scheduled | Refresh proactively from `expireDate`, plus retry-once above |
| Trying to read `access`/`refresh` in JS | Impossible — `HttpOnly` | Use `me` + `expireDate`; never design around reading cookies |

## WebSockets

Subscriptions authenticate with the same cookies
(`ChannelsJWTMiddleware` reads the `access` cookie from the handshake).
Same-origin sockets just work; cross-origin needs the same
`SameSite=None` + CORS treatment as above.
