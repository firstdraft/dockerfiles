# Drawing Board file ownership

Inventory from template `416ed5cbf08b0248f5a43cbe2bfe84c1a730c813` (47 tracked files).
The destination is the existing public `firstdraft/dockerfiles` repository, under `drawing-board/`.
Paths in the destination column are relative to that directory unless they name Drawing Board.

| Original Drawing Board path | Responsibility and destination |
|---|---|
| `.devcontainer/Dockerfile` | Image build input → `image/Dockerfile` |
| `.devcontainer/agent-skills.mjs` | Runtime configuration / installation; stays in Board |
| `.devcontainer/agent-versions.env` | Runtime configuration / installation; stays in Board |
| `.devcontainer/compose.yaml` | Runtime configuration / installation; stays in Board |
| `.devcontainer/configure-codex.mjs` | Runtime configuration / installation; stays in Board |
| `.devcontainer/devcontainer.json` | Runtime configuration / installation; stays in Board |
| `.devcontainer/image/devcontainer-lock.json` | Image build input / historical receipt → `image/.devcontainer-lock.json` |
| `.devcontainer/image/devcontainer.json` | Image build input / historical receipt → `image/.devcontainer.json` |
| `.devcontainer/image/receipt.json` | Image build input / historical receipt → `image/receipt.json` |
| `.devcontainer/setup-agents` | Runtime configuration / installation; stays in Board |
| `.env.example` | Student context / onboarding / private-file protection; stays in Board |
| `.github/dependabot.yml` | Runtime and caller dependency updates stay; maintainer image/action updates move here |
| `.github/workflows/ci.yml` | Thin exact-candidate caller remains; implementation → `action.yml` |
| `.github/workflows/devcontainer-image.yml` | Thin existing publication trigger and build/verify jobs remain; implementation → `image/action.yml` and `image/verify/action.yml` |
| `.gitignore` | Student context / onboarding / private-file protection; stays in Board |
| `AGENTS.md` | Student context / onboarding / private-file protection; stays in Board |
| `CLAUDE.md` | Student context / onboarding / private-file protection; stays in Board |
| `CONTRIBUTING.md` | Maintainer guidance → `README.md`; student terminal publication → Board `README.md` |
| `DIRECT_COMPILATION_PLAN.md` | Historical investigation / qualification → `docs/DIRECT_COMPILATION_PLAN.md` |
| `LICENSE` | Attribution stays in Board and accompanies relocated code here |
| `PREBUILD_EXPERIMENT.md` | Historical investigation / qualification → `docs/PREBUILD_EXPERIMENT.md` |
| `README.md` | Student context / onboarding / private-file protection; stays in Board |
| `STARTUP_FOLLOWUP.md` | Historical investigation / qualification → `docs/STARTUP_FOLLOWUP.md` |
| `STARTUP_INVESTIGATION.md` | Historical investigation / qualification → `docs/STARTUP_INVESTIGATION.md` |
| `bin/agent-doctor` | Student CLI / installation diagnostics / Plan review; stays in Board |
| `bin/firstdraft` | Student CLI / installation diagnostics / Plan review; stays in Board |
| `bin/review-plan-with-claude` | Student CLI / installation diagnostics / Plan review; stays in Board |
| `bin/review-plan-with-codex` | Student CLI / installation diagnostics / Plan review; stays in Board |
| `script/agent-smoke` | Maintainer check / qualification runner → `script/agent-smoke` |
| `script/application-repository-inventory-lib.mjs` | Student nested Git initialization; stays in Board |
| `script/application-repository-inventory.mjs` | Student nested Git initialization; stays in Board |
| `script/application-smoke` | Maintainer check / qualification runner → `script/application-smoke` |
| `script/check` | Maintainer check / qualification runner → `script/check` |
| `script/check-agent-setup.mjs` | Maintainer check / qualification runner → `script/check-agent-setup.mjs` |
| `script/check-agent-skills.mjs` | Maintainer check / qualification runner → `script/check-agent-skills.mjs` |
| `script/check-claude-discovery.mjs` | Maintainer check / qualification runner → `script/check-claude-discovery.mjs` |
| `script/check-codespaces-private-port.mjs` | Maintainer check / qualification runner → `script/check-codespaces-private-port.mjs` |
| `script/check-codex-configuration.mjs` | Maintainer check / qualification runner → `script/check-codex-configuration.mjs` |
| `script/check-depth-one` | Maintainer check / qualification runner → `script/check-depth-one` |
| `script/check-firstdraft-wrapper.mjs` | Maintainer check / qualification runner → `script/check-firstdraft-wrapper.mjs` |
| `script/check-image-receipt.mjs` | Maintainer check / qualification runner → `script/check-image-receipt.mjs` |
| `script/check-initialize-application.mjs` | Maintainer check / qualification runner → `script/check-initialize-application.mjs` |
| `script/devcontainer-image-smoke` | Maintainer check / qualification runner → `script/devcontainer-image-smoke` |
| `script/devcontainer-smoke` | Maintainer check / qualification runner → `script/devcontainer-smoke` |
| `script/initialize-application` | Student nested Git initialization; stays in Board |
| `script/refresh-codespaces-private-port` | Runtime Codespaces attachment; stays in Board |
| `script/selenium` | Maintainer check / qualification runner → `script/selenium` |

## Checks and interpretation

The [relocation qualification receipt](RELOCATION_QUALIFICATION.md) records the actual local and hosted checks,
including root application CI with the planning archive removed and the remaining provider boundary.

The relocated checks import the candidate's actual setup, wrapper, Skill and nested-initialization code. They retain
installation/rerun behavior, user-state preservation, credential handling, Git bytes/modes, private-port behavior,
actual agent discovery and ordinary application CI. Old assertions that only repeated workflow action strings and
Skill prose were removed; executable CLI compatibility and pinned image/runtime checks remain.

`application-smoke` remains an optional maintainer runner for a nested, already-compiled app. It is no longer a
student command or a conditional branch of the installation smoke. Root materialization uses the CLI's existing
root-output transaction and the generated app's own setup, Compose and tests. The planning archive is optional
context, not a test-runner location. Ordinary generated application tests are unchanged.

## Integration and retained decisions

Land this maintainer destination before updating the Board CI/image caller pins and removing their old files.
After the Board lands, update both default candidate SHAs in the maintainer workflow to that merged Board revision.
The small Board callers retain the `contract` job, pull-request/main triggers, candidate-image trigger and existing
job-token permissions. The image action is not run by ordinary CI. Publication requires its existing separate
authorization; this relocation neither publishes an image nor changes GHCR package access.

The image verification job must keep `needs: build`: `devcontainers/ci` publishes in its end-of-job post step.
Verification inside the build job would run before the candidate exists in GHCR.

GitHub supports [public callers using public reusable code](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations#access-to-reusable-workflows).
Using the existing public image repository avoids a private-Service dispatch credential or access change.
No branch-protection setting is changed. A required-check result must still belong to the actual Board merge
candidate; the maintainer repository's fixed-candidate test does not replace it.

The maintainer guide was moved from current Board main. Pending Board #48 maps from `CONTRIBUTING.md` to this
`README.md`; Service #762 still owns its separate `RELEASE_COORDINATION.md` change. Neither pending diff was
absorbed. The root coordinator owns their later reconciliation.

Latest Claude/Codex native installation, the runtime image digest, tool pins, attachment logic and Selenium
session timeouts are unchanged. Local/source/container results are distinct from Codespaces-provider behavior.
Service #729 and #730 retain their remaining provider qualification. No paid provider trial is part of this move.
