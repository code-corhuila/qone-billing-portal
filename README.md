# qone-billing-portal

> billing bounded context: web UI (remote)

Part of the **Qampus (Quorum One)** distributed system — team `quorum-one`, Grupo 1.
Governance and documentation live in [`qone-docs`](https://github.com/code-corhuila/qone-docs).

## Purpose

The web portal of the **billing** domain (course norm 5.4, Annex H): the term invoice of a
student and its simulated payment, and the admin's invoice issue. It is a Module Federation
**remote** named `billing` that exposes `./App` (and `./mocks` for synthetic data); `qone-front` mounts it at `/billing/*`. The
portal owns only its screens: the HTTP client and the session come from the shell and the
portal never knows the gateway URL or the token (norm 5.4.1, verified on the built bundle by
`scripts/check-isolation.sh`). Money travels as integer cents and is parsed from the text the
person typed, never through a float (norm 5.4.3).

Specification: `07-api/contracts/openapi/qone-billing-api.yaml` (BI-01..BI-06),
`06-data/models.md` (schema `billing`), ADR-007 and ADR-009 in `qone-docs`. Story:
`code-corhuila/qone-docs#43` (HU-BIL-001).

## How to run it

Requirements: Node 22 LTS (or 24), npm, and the shell (`qone-front`) running at `VITE_SHELL_URL`.

```bash
cp .env.example .env        # VITE_SHELL_URL only; .env is ignored by git
npm ci
npm run dev                 # http://localhost:5004 (standalone) - or open /billing in the shell
```

Checks (`ci.yml` runs the same on every pull request):
```bash
npm run typecheck           # TypeScript strict
npm test                    # Vitest + Testing Library + MSW; contract tests against the synced YAML
npm run build               # remoteEntry.js and assets in dist/
npm run check:isolation     # no gateway URL, no token handling, no raw fetch in dist/
```

`npm run contracts:sync [ref]` refreshes the contract copies in `contracts/openapi/` from `qone-docs`.

Container image and compose (`deploy/`, Annex H and G): `docker build -f deploy/Dockerfile -t
qone-billing-portal:dev .`, `docker run --rm -p 5004:80 qone-billing-portal:dev`, then
`deploy/smoke.sh http://localhost:5004`. NGINX serves `remoteEntry.js` to any origin without
caching it and the hashed chunks as immutable; `deploy/compose.yml` is what `qone-infra` includes
(port 5004 published only in `develop`).

## Dependencies

- `qone-front` at `VITE_SHELL_URL`: `shell/apiClient`, `shell/session` and the mount point `/billing/*`.
- `qone-billing-api` behind the gateway; with the shell's `VITE_USE_MOCKS=true` the fixtures answer.

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `qone-docs`.
