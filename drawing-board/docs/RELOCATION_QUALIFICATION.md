# Maintainer relocation qualification — 2026-09-26

This records local and hosted checks for [Drawing Board #54](https://github.com/firstdraft/drawing-board/issues/54).
It does not qualify a new image publication or a Codespaces provider session.

## Revisions and installation

| Input | Observed revision or version |
|---|---|
| Original Board | `416ed5cbf08b0248f5a43cbe2bfe84c1a730c813` |
| Cleaned Board used for local application proof | `467ed2307ceff4932538ebdfb534134f9b35af2b` |
| External checks and relocated image recipe | `1f3efee9456c201c9ae221dc01a7adef9fd2638b` |
| Local Service Compiler | `ac29a2556e9ae8b0eb30ae50961f2cb93a560833` |
| Released First Draft CLI | `0.7.0` |
| Installed Claude / Codex | `2.1.283` / `0.157.1` |
| Container Ruby / Node / PostgreSQL | `4.0.5` / `24.18.0` / `18` |
| Dev Container CLI | `0.89.0` |

The cleaned candidate preserves every retained runtime/bootstrap file's bytes and mode. The external source
checks passed against both original and cleaned candidates. They exercised setup/rerun, wrapper credentials,
Skill discovery and preservation, nested Git initialization, private-port behavior, Codex configuration, and
the historical image receipt, including its source commit through a real shallow clone.

The [maintainer contract](https://github.com/firstdraft/dockerfiles/actions/runs/36276370503/job/108499800105)
passed against the original Board. The [Board contract](https://github.com/firstdraft/drawing-board/actions/runs/36276405837/job/108499900873)
passed against merge candidate `28a5ae9` for cleaned Board `467ed23`, using the SHA-pinned external action.
Each ran the actual candidate Dev Container and two installation smokes. Final amendments still require the
current Board candidate's own hosted result; these historical runs cannot substitute for that gate.

A separate local ARM64 Dev Container used the published immutable runtime image and mounted the maintainer
directory outside the student workspace. Source checks and two complete installation smokes passed, including
native agent discovery without sign-in or a model turn, blank credential-file permissions, PostgreSQL, SSH,
and Selenium remaining stopped. This exercised the existing latest-agent installation policy unchanged.

## Root application proof

A task-private adaptation of the Service's existing HTTP/CLI smoke pushed and analyzed its Movie Catalog Plan
through a local Service, then invoked the released CLI with `plan compile --output .` in the live cleaned Board
checkout. It produced 259 files, preserved Git HEAD and the existing remote, preserved an extra student note in
the planning archive, and retained the submitted Plan byte-for-byte. The archive contained no removed maintainer
runner, image recipe, contributor guide, or investigation report. The fixture recorded zero GitHub Publications.
The local Service transport was used directly; this was not a staging-wrapper or remote-publication observation.

- Compiler identity: `foundation-plan-rails/compiler-application-2026-09-26-rails-csp`, profile `rails-sketch/2026-09`.
- Artifact SHA-256: `7611e21cd3a6a676dbab04307dbc71cb4727fdddac999cfb3e112fa010aa4646` (1,114,289 bytes).
- File manifest SHA-256: `32efefb539a1241cea6f960b7cd38a0c7ad0d7fcd8c1f7519937a9eb156cba00`.

The entire `.firstdraft/design/` directory was then moved outside the generated application. Its generated
Compose recipe started Selenium in the existing container's project. Ordinary `bin/setup --skip-server` and
`CI=1 bin/ci` passed: dependency/security checks, style, schema, assets, 77 ordinary RSpec examples, seeds,
9 browser examples, and no generated diff. Selenium reported `4.47.0` from the locally available image;
neither the server session-request deadline nor the Ruby HTTP timeout was changed.

The Service fixture's final database drop waited on a shared PostgreSQL `ProcSignalBarrier`. Only this task's
drop was canceled; the stopped fixture's disposable database was handed to the coordinator for later cleanup.
The materialization assertions and generated application CI passed, but the fixture's complete cleanup did not.
No shared PostgreSQL restart or unrelated backend cancellation was performed.

## Relocated image recipe

The relocated recipe and locked Features built locally for ARM64. The resulting local image ID was
`sha256:916f0ef942c6979f2cf2e195247f1d022959e70c91c108f283e0a1ca0f41b260`.
The external image smoke passed locked Feature-ID metadata, the default command, the maintained SSH Feature's
lifecycle and key-only policy, and matching PostgreSQL client tools (`18.6`). This image was never pushed and
does not replace the historical receipt or the Board's runtime digest.

The image caller preserves separate `build` and `verify` jobs because the pinned `devcontainers/ci` publishes
during its post phase. That ordering is checked against the pinned action source; no publication was performed
to test it. Workflow lint, shell/Node syntax, documentation links, and whitespace checks also passed.

Paid Codespaces creation, private forwarded-port behavior, authenticated model invocation, publication,
deployment, and release were not exercised. Service #729 and #730 retain their provider qualification scope.
