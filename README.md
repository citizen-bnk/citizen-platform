# Citizen Platform

Shared code for the Citizen Bank ecosystem, so the website, Citizen Hub and Bank Core agree on the same definitions
instead of each keeping a copy.

**Status: version 0.1.0, in use by nobody yet.** It holds the contract between the website and everything that
receives its people:

| Module | What it defines |
|---|---|
| `handoff` | Verifying the one-time signed token the website gives a signed-in person to start a session on a banking host: ES256, one audience, 60 seconds, a unique `jti` the receiver must record (this package verifies, it does not store). Also reads `PLATFORM_JWKS_URL`, `PLATFORM_ISSUER`, `SSO_AUDIENCES` |
| `access` | Role names, and which role may open which service (`hub`, `banking`, `app`). Unknown role names are ignored, never granted |
| `redirect` | `safeNext`: only a relative path on the destination host is a valid post-sign-in target |

```bash
npm install github:citizen-bnk/citizen-platform
```

```ts
import { readHandoffConfig, remoteKeys, verifyHandoff, servicesFor, safeNext } from "@citizen-bnk/platform";
```

Tested with a token produced by the website's Python signer (`tests/fixtures/website-handoff.json`), so the two
languages are proven to agree; `npm test` runs 8 tests and CI runs them on every push. Rule for adding code here: only
when two repositories need the same thing, with tests both sides can run. Not yet moved here: the website's token
*signing* (Python) and the `platform` person schema, which stay in the website repository.

Bank Core, CitizenBankApp and CitizenInternetBanking still carry their own copies of the verifier and redirect rule;
switching them to this package is the next step and is deliberately not done in the same change.

Each repository deploys on its own on Vercel; this one is a library, not a service.

The full map of the six repositories and four hosts is in
[`docs/ECOSYSTEM.md`](https://github.com/citizen-bnk/CitizenBankWebsite/blob/claude/practical-volta-tqe0qk/docs/ECOSYSTEM.md)
in the website repository.
