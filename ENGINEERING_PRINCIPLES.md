# Engineering Principles — WiseTech (timeless charter)

> [`CONTRIBUTING.md`](./CONTRIBUTING.md) says *what to do today*; its commands and branch names will age.
> This charter is the *why* — principles that stay true regardless of stack, tooling, team size, or hosting.
> When a tool changes, change the Working Agreement; keep these. Every rule we adopt should trace back to one of these.

### 1. One source of truth
Exactly one canonical line of history and one place each thing lives. Ambiguity about "which branch / which copy is real" is how work gets lost. *Live it:* one trunk, one config per environment, one owner per concern.

### 2. Make the right way the easy way — automate enforcement
Rules that rely on memory get broken under deadline. Anything important is enforced by tooling (CI, branch protection, hooks, linters), not reminders. *Live it:* if a mistake happens twice, add a gate so it can't happen a third time.

### 3. Small, reversible steps
Small changes are easy to review, test, understand, and undo; big changes hide regressions. Everything should be revertable with one action. *Live it:* small PRs, one logical change per commit, feature flags for risky work.

### 4. Nothing reaches production unverified
Every change is reviewed by a human and proven by automation (types, build, tests) before merge. "Works on my machine" is not verification. *Live it:* green CI is a permanent merge precondition — only the checks get stronger.

### 5. Deploys are immutable, reproducible, and reversible
Always be able to answer "exactly what is running in prod?" and "how do I get back to the last good state in minutes?". Release artifacts never change after creation. *Live it:* tag-based releases, healthchecks, one-step rollback, no manual edits on servers/bundles.

### 6. Never destroy work or history
Prefer additive, reversible operations. Destructive actions (`reset --hard` on shared refs, force-push to trunk, deleting branches/data) require a backup and a second pair of eyes. *Live it:* `revert` over `reset`, `--force-with-lease` over `--force`, back up before you delete.

### 7. Secure and private by default
Secrets and user data never enter version control or logs. Least privilege everywhere. Assume every repo could leak. *Live it:* secrets in vaults/CI, PII in object storage, rotate on any exposure — removing the file is not enough.

### 8. Design for change: stable contracts, backward-compatible migrations
Interfaces between systems (API ↔ client, code ↔ database) evolve without breaking the other side. Expand before you contract. *Live it:* version/extend contracts, ship DB changes in backward-compatible steps, deploy interdependent systems together.

### 9. Consistency over cleverness
A codebase a stranger can predict beats a clever one only the author understands. One way to do a common thing. *Live it:* shared conventions, boring/proven tools, retire duplicate ways of doing the same job.

### 10. Observability — you can't fix what you can't see
Know what's deployed, whether it's healthy, and what changed when something breaks. *Live it:* healthchecks, meaningful logs/metrics, an audit trail from commit → release → deploy.

### 11. Blameless learning from failure
Incidents are system problems, not people problems. Every failure ends with a guardrail that prevents its whole class — not a scolding. *Live it:* short post-incident note → which principle/automation was missing → add it.

### 12. Leave it better; document the non-obvious
Each change leaves the code and docs slightly healthier. Onboarding knowledge lives in the repo (`CLAUDE.md`, `CONTRIBUTING.md`, READMEs), not in one person's head. *Live it:* update docs with the code, write down the "why," delete dead things.

---
**Relationship:** This charter rarely changes (review ~yearly). [`CONTRIBUTING.md`](./CONTRIBUTING.md) is the current implementation of these principles and is updated whenever tools/stack change or something breaks.
