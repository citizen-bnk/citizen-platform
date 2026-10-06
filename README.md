# Citizen Platform

Shared code for the Citizen Bank ecosystem, so the website, Citizen Hub and Bank Core agree on the same definitions
instead of each keeping a copy.

**Status: not started in this repository.** Candidates to move here, from the website's `backend/app/libs`:

| Module | What it defines |
|---|---|
| `platform_tokens` | The one-time signed handoff token between the website and the banking hosts (ES256, 60 seconds, one audience, one use) and the published key set |
| `platform_people` / the `platform` schema | One person per sign-in identity, roles and memberships; people are never merged by email |
| Role names and service access | Which role may open which host |

Rule for moving code here: only when two repositories need the same thing, and with tests that both sides run (the
website and Core already share a token fixture for exactly this reason).

Each repository deploys on its own on Vercel; this one is a library, not a service.

The full map of the six repositories and four hosts is in
[`docs/ECOSYSTEM.md`](https://github.com/citizen-bnk/CitizenBankWebsite/blob/claude/practical-volta-tqe0qk/docs/ECOSYSTEM.md)
in the website repository.
