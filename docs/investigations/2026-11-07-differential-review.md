# Differential security review: 7813c6c..9400a2d

Date: 2026-11-07. Scope: the five commits of the day (design-review plan, brand, lint config, review-finding fixes). Method: `.claude/skills/differential-review` (triage by risk, diff and blame on every HIGH-risk file, blast radius by caller count, test-coverage check, attacker modelling on auth and session code). Codebase: MEDIUM (about 120 source files), so HIGH-risk files were read with their one-hop dependencies and LOW-risk UI files were scanned for storage, logging and raw HTML only.

## Executive summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 (fixed after the review) |
| LOW | 3 (one fixed in this review) |

**Overall risk:** LOW. **Recommendation:** APPROVE.

- Files analysed: 59 of 59 (41 under `src/`); 13 classified HIGH or MEDIUM risk and read in full.
- Security regressions: none. The only removed security-relevant code is the idle-expiry `clear-all`, replaced on purpose by the lock (master-doc updated in place).
- One pre-existing exposure was closed in `9400a2d` and is proven by a test that first demoted a real admin through the open endpoint.
- Test gaps: "lock cancels a running batch" has no automated test (the window is not reachable deterministically); the Ctrl/Cmd+Enter shortcut has none.

## What changed

| File | Risk | Why | Blast radius |
|------|------|-----|--------------|
| `src/app/api/auth/[...all]/route.ts` | HIGH | HTTP surface of Better Auth reduced to 3 endpoints | every sign-in, sign-out, session read |
| `src/lib/session.ts` | HIGH | 401 split into `expired` / `disabled` codes | `requireUser` 6 callers, `requireAdmin` 4, `sessionOrSignIn` 5 |
| `src/lib/http.ts` | HIGH | `HttpError.code` forwarded in the JSON body | `HttpError` 19 call sites (optional param, none changed) |
| `src/lib/users.ts` | HIGH | `resetPasswordDirect(email)` without an admin session | 1 caller (the script) |
| `scripts/reset-password.ts` | HIGH | operator CLI printing a temporary password | n/a |
| `src/case/store.tsx` | HIGH | `leave()` on 401, lock cancels batch, `userEmail` in context | whole workspace |
| `src/components/workspace/session-dialog.tsx` | HIGH | password re-entry through `signIn.email` | lock flow |
| `src/app/(app)/page.tsx` | MEDIUM | session read on the server, email passed to the client | cases page |
| `src/app/(auth)/sign-in/page.tsx` | MEDIUM | `?motivo=` query rendered as a notice | public page |
| `src/lib/client-api.ts` | MEDIUM | `ApiError.code` | 1 caller |
| `src/case/reducer.ts`, `types.ts`, `summary.ts`, `insurer.ts`, `pending.ts` | MEDIUM | state machine additions (lock, insurer proposal, downloads, discard) | reducer tests |
| `src/word/rhc-docx.ts`, `rhc-zip.ts`, `logo.ts` | MEDIUM | logo fetched from `/logo-blue.png` and embedded | downloads |
| `src/components/workspace/main-action.tsx` | LOW | document-level Ctrl/Cmd+Enter handler | one button at a time |
| remaining `src/components/**`, `globals.css`, docs, tests | LOW | UI, copy, tokens | none |

## Findings

### MEDIUM (fixed after the review): the lock hides the clinical data, it does not remove it

`src/case/store.tsx` wraps the workspace in `<div inert className="invisible">` while `locked`. The cases, drafts and header fields stay in React state and in the DOM. Someone at the unattended workstation can read them from the browser's developer tools or "view source" without the password; the lock stops ordinary use, not inspection.

This is the behaviour the owner chose (keep the cases so an idle reviewer loses nothing) and `docs/master-doc.md` now says so. It is weaker than the previous "clear on expiry" only against an attacker with physical access to an unlocked OS session, which the lock never claimed to defend against. Mitigation if wanted later: render `null` instead of the inert wrapper while locked (state survives in the provider, the DOM no longer carries text), at the cost of component-local UI state such as which empty sections were opened.

Fixed after the review: `Workspace` renders only the lock dialog while `locked`, the inert wrapper is gone, and the lock e2e test asserts the page holds no case text.

### LOW (fixed): `?motivo=` lookup reached `Object.prototype`

`src/app/(auth)/sign-in/page.tsx` looked the notice up in a plain object, so `/sign-in?motivo=constructor` returned a function that React would render as nothing after an error log. No data exposure; replaced by a `Map` in this review (verified by `pnpm typecheck` and the auth e2e tests).

### LOW: each unlock adds a Better Auth session row

`LockDialog` verifies the password with `authClient.signIn.email`, which issues a new session and cookie and leaves the previous one valid until it expires (7 days by default). A stolen earlier cookie keeps working after an unlock. Same exposure as before the change for any ordinary sign-in; `changePassword` already revokes other sessions. Optional hardening: call `auth.api.revokeOtherSessions` after a successful unlock, or verify the password through an app endpoint that does not create a session.

### LOW: rate limiting is off outside production

Better Auth enables its limiter only when `NODE_ENV=production` (`rateLimit.enabled ?? isProduction`), where `/sign-in/email` allows 3 attempts per 10 seconds per IP. The lock dialog and the sign-in form share that rule. Nothing to change for the pilot; worth knowing that local and preview environments allow unlimited password guesses.

## What was checked and found sound

- **Allowlist bypass.** The guard and Better Auth read the same `request.url`; the allowlist is deny-by-default, so an encoded (`%61dmin`), double-slash, upper-case or trailing-slash path yields 404 unless it equals one of the three strings exactly. Test: `tests/integration/auth.test.ts` ("answers only sign-in, sign-out and get-session") proves `admin/set-role` and `admin/list-users` answer 404 and the admin keeps the role; before the fix the same test demoted the admin.
- **401 handling.** `leave()` cancels the batch, clears the reducer, signs out and navigates to a fixed path with a typed reason; no user input reaches the URL. Concurrent 401s call it twice, harmlessly. Test: the e2e "disabled user" scenario fails without the transport hook (verified by disabling it) and passes with it.
- **Password reset script.** Hashes with the same `hashPassword` Better Auth verifies with, forces `mustChangePassword`, deletes every session, errors on an unknown email, never enables a disabled account. Test: integration ("resets a password from the command line"). The temporary password goes to the operator's terminal only.
- **Error codes.** `code` is sent only for `HttpError`; `disabled` is unreachable in practice because disabling revokes sessions (the test documents `expired` as the observed code), so no account-status oracle exists.
- **Logo in Word.** Fetched same-origin, fails loudly, embedded as a fixed PNG; no case data involved.
- **No persistence.** No new `localStorage`, `sessionStorage`, `console.*` of case content, or raw HTML in the UI diffs.
- **Removed code.** `.dark` palette (cosmetic, from the scaffold commit), `SignOutButton` (moved into the account menu), the expired-notice branch (replaced by the lock).

## Test coverage of the changed code

| Change | Automated test |
|--------|----------------|
| Auth route allowlist | integration |
| 401 code and clearing the tab | integration + e2e |
| CLI password reset | integration |
| Lock, wrong password, unlock | e2e with a faked clock |
| Lock cancels a running batch | none (timer pauses during calls, so the window is between jobs only) |
| Reducer additions | unit |
| Word header logo | unit |
| Ctrl/Cmd+Enter shortcut | none |
