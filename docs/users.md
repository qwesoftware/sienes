# Users

How Sienes staff get access to the assistant, locally and in production.

Verified: 2026-11-07 against the code and `tests/e2e/auth.spec.ts` (local flow). The production steps have not been run: nothing is deployed yet.

## Account model

- There is no public sign-up. Every account is created by an administrator; the very first one by a developer with `pnpm db:seed`.
- Two roles. **Usuario** works on cases: upload, analyze, generate, review, copy and download. **Administrador** does all of that too (an administrator is also an ordinary reviewer) and additionally sees **Usuarios** in the header, where they create, disable, re-enable and reset accounts. Neither role has extra permissions over clinical data or any settings screen.
- The role is chosen when the account is created and the app offers no way to change it afterwards.
- Accounts are never deleted, only disabled, so audit records keep their author.
- Passwords have at least 10 characters. Anyone can change their own from **Cambiar contraseña** in the header.
- An administrator cannot disable or reset their own account, and the last enabled administrator cannot be disabled.

## Local development

1. Seed the first administrator (see [Run locally](../README.md#run-locally)): `ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm db:seed`. The password needs 10+ characters. Running it again with an existing email does nothing (it does not reset the password); with a new email it creates another administrator.
2. Open http://localhost:3000, sign in on **Ingresar** and choose a new password on **Cambiar contraseña** (required at first sign-in).
3. Open **Usuarios** and press **Nuevo usuario**. Fill **Nombre** and **Email**, pick **Rol** (**Usuario** is preselected, or **Administrador**) and press **Crear**.
4. The page shows **Usuario creado** with a **Contraseña temporal**. It is shown once: it disappears when you leave or reload the page. If it is lost, use **Restablecer contraseña** to get a new one.
5. The person signs in with it and is sent to **Cambiar contraseña** (**Contraseña actual**, **Contraseña nueva**, **Repetir contraseña nueva**) before they can use the app.

## Production

Run after the Deploy steps in the [README](../README.md#deploy-prepared-not-executed) (migrations applied, app reachable on its URL).

1. From a developer machine with a clone and its `.env.dev` (the script reads the other variables from it), create the first administrator once:
   `DATABASE_URL=<neon pooled url> ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... pnpm db:seed`
2. That administrator signs in on the production URL and replaces the temporary password when asked.
3. In **Usuarios**, they create one account per Sienes staff member with **Nuevo usuario** (role **Usuario** unless the person must manage accounts too). Accounts are personal; nobody shares one.
4. They hand each person their temporary password in person or by phone; if that is not possible, by a direct message deleted once the person has signed in. Not by email: the email address is the user name, so one stored, forwardable message would carry both halves of the login.
5. The person signs in and sets their own password at first sign-in.

**Someone leaves:** press **Deshabilitar** on their row. All their sessions end at once; their next page load lands on **Ingresar**, and signing in shows "La cuenta está deshabilitada". In a tab they still have open, the next analyze or generate request fails with "Sesión no válida"; the work in that tab is not cleared until it is reloaded or closed, and a request already sent to the model cannot be recalled. **Habilitar** restores access with the same password.

**Someone forgets their password:** press **Restablecer contraseña** on their row. It shows a new temporary password once, signs the person out everywhere and asks them for a new password at their next sign-in. Hand it over as in step 4.

If the only administrator forgets their password, the app cannot recover it (the seed does nothing for an existing email); a developer has to intervene in the database. Keeping two enabled administrators avoids that.

## Who holds the administrator account (open)

ADR-0002 places the Vercel and Neon resources under the info@qwesoftware.com accounts; it does not decide who administers users inside the app. The options:

| Option | Day to day | Trade-off |
| --- | --- | --- |
| QWE administrator (info@qwesoftware.com side) | Sienes asks QWE for every new account, departure and reset. | Access stays with whoever runs the infrastructure; Sienes depends on QWE's response time. |
| Sienes administrator (a named staff member) | Sienes manages its own staff; QWE seeds this account and hands it over. | Faster for Sienes; that person must follow the handover and departure rules above. |

Both can coexist (two administrators), which also covers the forgotten-password case above.
