# Drawing Board maintenance

This directory owns the checks, image source, and qualification reports for the
[Drawing Board student template](https://github.com/firstdraft/drawing-board). Read that candidate's `AGENTS.md` when
changing its runtime or onboarding. The student checkout contains bootstrap and application work, while CI obtains
these maintainer tools separately. [The relocation inventory](docs/relocation.md) maps every former path.

Run commands below from `drawing-board/` in this repository. `DRAWING_BOARD_PATH` is an absolute path to a separate,
disposable Drawing Board checkout. Keep credentials and user work out of that checkout.

## Repository contract

A repository created from this template must provide one ready-to-use workspace for Claude or Codex:

- the Dev Container installs the latest public Claude Code and Codex releases and the exact reviewed First Draft CLI;
- every Skill declared by one exact source revision is linked into both agents;
- `.env` supplies the shared staging origin and token without entering Git;
- bare `firstdraft` on the Codespace PATH resolves to `bin/firstdraft`, and AGENTS.md routes Skill-issued commands
  through that wrapper; and
- the same container carries the current generated Foundation's Ruby and Node toolchain plus healthy PostgreSQL;
  generated browser tests start Selenium on demand, so the generated application can be
  developed without a second Codespace.

PostgreSQL health checks use TCP so the entrypoint's temporary Unix-socket-only initialization server cannot
release the workspace dependency early. Keep the existing five-second cadence; the measured one-second alternative
saves about four seconds locally but adds sustained polling, and Codespaces rejected the startup-only interval.
See the [follow-up startup measurements](docs/STARTUP_FOLLOWUP.md).

The template itself does not contain generated application source. For the internal alpha, Drawing Board's
`AGENTS.md` selects explicit `--output .` approval: the application replaces the workspace layout, original material
moves under `.firstdraft/design/`, and the same Git repository holds both. The primary **Use this template → Open in a
codespace** route starts without a remote. Inspect and commit the staged baseline, then publish it from VS Code or
the [Codespaces publication API](https://github.com/firstdraft/drawing-board/blob/main/README.md#publish-from-the-codespace-terminal) to the user's own private repository before
setup or edits. Preserve and use an existing remote when the user chooses
repository-first creation. Do not run the nested initializer or application smoke after root adoption, including their
relocated copies. The optional `--output ./application` mode keeps an ignored, separate nested application. Its initializer remains
a student tool; its optional `script/application-smoke` qualification runner lives here and is not needed by students. **Compile and publish through First Draft** selects the separate
`--github` Publication mode; **Create GitHub repository** saves the existing workspace and does not Compile again.
The accepted cross-repository sequence and its safety boundaries live in
[DIRECT_COMPILATION_PLAN.md](docs/DIRECT_COMPILATION_PLAN.md).

## Repository map

| Location | Responsibility |
|---|---|
| Drawing Board `.devcontainer/` | Runtime Compose, lifecycle configuration, agent setup and selected tool pins |
| Drawing Board `bin/` | CLI wrapper, installation diagnostics and optional Plan review |
| Drawing Board `script/initialize-application` and inventory modules | Nested application's initial Git checkpoint |
| Drawing Board `script/refresh-codespaces-private-port` | Existing Codespaces attachment behavior |
| `image/` | Dockerfile, locked build Features and the historical published-image receipt |
| `action.yml` | Source checks and two installation smokes in the exact caller checkout's Dev Container |
| `image/action.yml`, `image/verify/action.yml` | Authorized image build, then AMD64 runtime / ARM64 metadata verification in a dependent job |
| `script/check*` | Source, credential, installation, preservation, discovery and Git-initialization checks |
| `script/agent-smoke`, `script/devcontainer-smoke` | Installed-agent and workspace runtime checks |
| `script/application-smoke`, `script/selenium` | Optional nested-app qualification; not the root materialization path |
| `docs/` | Relocation inventory and retained investigation/qualification evidence |

The nested initializer follows the generated application's own ignore rules. The only artifact-owned paths allowed to
bypass those rules are `.firstdraft/submitted-foundation-plan.json` and `.firstdraft/gaps.json`. Any other ignored
path is preserved and stops initialization; a future generated ignored file must update this narrow allowlist and
its exact-byte fixture in the same coordinated release. Canonical `0644` and `0755` modes are part of the generated
artifact contract; a mismatch requires a fresh compile into an absent directory rather than local mode repair.
A mode mismatch aborts initialization before the nested repository exists. Preserve that directory under the
Drawing Board's ignored, bind-mounted `tmp/` before recompiling; never use `/tmp` or the container home, and never
delete or overwrite it to manufacture an absent destination.

## Work on the template

Create a branch from current `main` in the repository being changed. From this directory, run:

```sh
script/check /absolute/path/to/drawing-board-candidate
```

Use the candidate's pinned Ruby and Node, or run inside its Dev Container. Checks read the candidate's production
modules directly and keep their fixtures in temporary directories. They do not need a First Draft token.

Drawing Board's `contract` job checks out GitHub's exact PR merge candidate (or the pushed main commit), then calls
`firstdraft/dockerfiles/drawing-board` at one full commit SHA. The action copies its `script/` and `image/` into an
owned ignored `tmp/` directory only in that disposable CI checkout, starts the actual candidate Dev Container with
the existing pinned `devcontainers/ci` action, and runs source checks plus the installation smoke twice. An always
step removes only that temporary directory. No maintainer code is committed to the template or retained in a
student planning archive. Keep the original check name and read-only token permissions in the caller.

This repository's own workflow tests changes against the explicit Drawing Board SHA in
`.github/workflows/drawing-board.yml`. Manual dispatch can select another exact SHA. That check qualifies the
maintainer change against the named template; the Board PR still needs its own current-candidate check after its
caller pin changes. Land the maintainer revision first, then update all Board action pins to its merged SHA.
No private Service checkout, dispatch credential, or repository-access change is required.

For a local Dev Container run, mount this directory outside the workspace, for example at `/opt/board-checks`, using
the Dev Container CLI's `--mount` option. Inside the container:

```sh
export DRAWING_BOARD_PATH=/workspaces/drawing-board
/opt/board-checks/script/check "$DRAWING_BOARD_PATH"
/opt/board-checks/script/devcontainer-smoke
/opt/board-checks/script/devcontainer-smoke
```

Use a disposable checkout and task-owned Compose resources. The runtime checks verify the pinned Ruby and its
mise-selected runtime; interactive [mise activation](https://mise.jdx.dev/dev-tools/shims.html) can select the real
executable ahead of its shim. Agent probes require no sign-in or model turn. They do not prove authenticated
Compilation or Codespaces attachment. The optional nested runner is a separate explicit invocation with
`DRAWING_BOARD_PATH` set; it runs an already-compiled `application/` and never substitutes for root materialization.

### Agent installation and updates

New Codespaces install the vendors' latest public agents using their native installers. Claude's no-argument
installer defaults to `latest` and preserves an existing user's channel choice on explicit setup reruns. Codex
selects `latest` explicitly. Temporary exact agent pins need a demonstrated regression or an explicitly frozen
experiment with its reason recorded; update the setup policy check and qualification receipt with that exception.
First Draft CLI/Skills/service compatibility and the language, database, and image pins follow separate policies.

Native installers and vendor updates share the user-owned `~/.local/bin` launchers. A container-wide npm prefix
breaks the image's interactive nvm initialization, so only the pinned First Draft CLI uses a per-command npm prefix.
Claude's normal updater is enabled; users can also run `claude update`. Codex offers updates through its normal
update prompt or `codex update`. These are different vendor mechanisms; Drawing Board does not run an updater or
reinstall agents on attach/resume. See
[Anthropic's installation and updates](https://code.claude.com/docs/en/setup),
[OpenAI's native installation instructions](https://learn.chatgpt.com/docs/codex/cli#getting-started), and
[Codex's update command](https://learn.chatgpt.com/docs/developer-commands#codex-update).

The existing named volumes retain `/home/vscode/.claude`, `/home/vscode/.codex`, and `/home/vscode/.cache` across
container rebuilds. `CLAUDE_CONFIG_DIR` and `CODEX_HOME` select those config/conversation homes. Setup recreates
executables under `~/.local` and the shared Skill links, preserves unrelated Skills and user settings, and only
seeds Codex defaults when its config is absent. It never resets authentication or conversation directories.
Historical qualification receipts retain the versions they actually tested; current smoke output records the
installed versions instead of requiring a historical client number. `script/agent-smoke` can run without Rails or
PostgreSQL, and is also called by `script/devcontainer-smoke`.

Keep `CLAUDE.md` as the minimal `@AGENTS.md` import. Claude's native discovery still has first-session and
feature-availability restrictions; upgrading alone does not qualify import removal. The shared instruction source
remains `AGENTS.md`. See [Anthropic's discovery limits](https://code.claude.com/docs/en/memory#agents-md) and the
[installation qualification boundary](docs/DIRECT_COMPILATION_PLAN.md#agent-release-policy-and-qualification-2026-09-18).

Skill linking reads the pinned checkout's `.claude-plugin/plugin.json` and links all declared canonical Skill
folders into Claude's configured `skills/` and Codex's `~/.agents/skills/`. Both clients therefore read the same
reference files as well as the same entrypoints. The installer preflights collisions, preserves unrelated files
and symlinks, and removes obsolete links only when they point into the managed First Draft revision cache.
`bin/agent-doctor` checks the complete inventory. The agent smoke verifies every namespaced Codex Skill in
model-visible context and Claude's catalog loading of the same installed sources in an isolated home. Claude's
`--init-only` probe disables hooks and MCP configuration and reads discovery diagnostics without a model turn.
Neither probe proves authenticated invocation. The optional npm plugin remains a separate installation path owned
by the Skills repo.

The offline check covers one-Skill and three-Skill manifests without changing distribution pins. Linking changes
alone do not make unreleased Skills available. The UI infrastructure release distributes `create-full-stack-app`
only; selection and packaging of application UI Skills remain deferred. Qualify the exact declared inventory in
the built container and both agent adapters before changing its pin.

The current template consumes a public development image by immutable manifest digest. A credential-free manifest
request reproduced that exact multi-platform index, so ordinary template-derived Codespaces can pull it without
access to the First Draft organization. CI still authenticates with its job token, but that is not an availability
requirement. To update the image:

1. change `image/Dockerfile` or `image/.devcontainer.json` in this repository;
2. let the current Dev Container CLI regenerate `image/.devcontainer-lock.json`, then review every
   resolved Feature version and digest rather than editing the lock by hand;
3. after separate publication approval, update both Board image-action pins to the merged maintainer revision and
   push one Board `devcontainer-image-candidate-safe-<short-sha>` tag (or use its existing manual dispatch);
4. verify both image platforms, then record the reviewed receipt and immutable digest, including the Board caller
   revision and exact dockerfiles image-source revision; update the receipt checker for that successor provenance;
5. prove a credential-free manifest read by immutable digest and update the receipt's observation; and
6. run the contracts, the built-container smoke twice, and one fresh non-prebuilt Codespace comparison before
   calling the successor digest qualified for the ordinary template.

The image uses the maintained `ghcr.io/devcontainers/features/sshd:1` Feature for the SSH server lifecycle expected
by Codespaces and keeps only the key-only, non-root policy in the Dockerfile. Do not replace the Feature entrypoint
with a custom OpenSSH startup script; the ordinary local image smoke is not proof that a different entrypoint will
be started by Codespaces. Image-layer host keys supplied by the maintained Feature are accepted for this disposable,
GitHub-tunneled development environment; client authentication remains key-only and root login remains denied. This
supersedes the per-container-host-key experiment, but does not approve consumption of its quarantined package.

The candidate workflow remains Board-owned and uses its existing package-write job token. Its SHA-pinned build
and verification actions live here; they do not move a stable or `latest` tag. Keep verification in a separate job
with `needs: build`, because `devcontainers/ci` pushes during the build job's post phase. No image was published
during this relocation.
The retained receipt describes the prior Board publication, not a build from this new location. Its historical
source commit and blobs are still checked against Board Git history. The relocated Dockerfile and lockfile are
byte-identical; the image configuration differs only in relative build paths. The receipt binds the source revision, source
tree, workflow run, platforms, and manifest digest consumed by the template. The current receipt records both
anonymous access and the retained comparison Codespace as passed. That exact Codespace also proved that
`script/selenium` resolves the Compose project from its runtime container identity; no speculative fallback was
needed. The helper remains in use by `script/application-smoke` for the optional nested application and by
`script/devcontainer-smoke` to verify that workspace setup has not started Selenium. Root-adopted applications use
their generated `.devcontainer/compose.yaml` and the running container's Compose project, as shown in the
[browser-testing instructions](https://github.com/firstdraft/drawing-board/blob/main/README.md#7-open-your-app). The generated health check uses Selenium's supplied
`/opt/bin/check-grid.sh`; Compose owns readiness for that command and fresh generated Dev Container startup.

Selenium uses its upstream session-request queue deadline, currently 300 seconds. The generated app's Ruby client
retains its separate 60-second HTTP read timeout, so an unanswered session request can still fail sooner.
The former 30-second override rejected a slow first browser start in Codespaces; the observation and remaining
qualification are tracked in [Service #729](https://github.com/firstdraft/firstdraft/issues/729).

The Docker-outside-of-Docker Feature reaches the host daemon: that host is a disposable VM in Codespaces, but it is
the developer's own machine on the supported local path. Do not run an untrusted workspace or agent with that socket
mounted. The planning workspace starts Selenium only when browser proof requests it.

The runtime Dev Container opts the remote extension host into Node's supported `navigator` global through
`extensions.supportNodeGlobalNavigator`. A 2026-09-01 browser-Codespaces observation found VS Code 1.133.0 and the
GitHub Codespaces extension 1.18.16 loading Axios and Microsoft Dev Tunnels while VS Code's migration guard still
replaced that global with a throwing getter and raised `PendingMigrationError`. The private forwarded URL then
returned 502 before a healthy Rails server received the request. This is the conventional VS Code migration setting
documented in the
[VS Code 1.101 release notes](https://code.visualstudio.com/updates/v1_101). The exact VS Code 1.133.0 source
[registers it at the default window scope](https://github.com/microsoft/vscode/blob/a5b500951314efd502d07465bd138dfbd714a960/src/vs/workbench/contrib/extensions/browser/extensions.contribution.ts#L363-L367),
which accepts remote settings, and the
[remote server turns it into the extension host's `--supportGlobalNavigator` argument](https://github.com/microsoft/vscode/blob/a5b500951314efd502d07465bd138dfbd714a960/src/vs/server/node/extensionHostConnection.ts#L283-L290).
Dev Container settings are applied to the remote Codespaces machine as described by
[GitHub's Dev Container documentation](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers).
A fresh Codespace proved that the setting supplies `--supportGlobalNavigator` and removes the migration error, but
the unchanged private forwarded URL still returned a relay-level 502. The setting remains because it closes that
independently observed extension-host failure; it is not the tunnel repair.

The repository's long-running student Rails template supplied the missing control: at exact revision
[`7bfb0c17`](https://github.com/appdev-projects/rails-8-template/blob/7bfb0c173b13203dbbae612ea410b893d041d240/bin/fix-ports#L1-L9),
its post-attach hook changes port 3000 from public back to private specifically to repair Codespaces 502 responses.
Repeating that transition once in the fresh Drawing Board Codespace changed the unchanged request from relay 502
with no Rails log to Rails 403 with an exact `Blocked hosts` log. `script/refresh-codespaces-private-port` performs
the same registration refresh on every Codespaces attach, but only while port 3000 has no listener. Codespaces can
remove that unbound registration between the public and private commands; the script accepts only that exact
no-listener result, after which the next server started in the integrated terminal is forwarded privately by
default. It reports every other GitHub CLI error and fails instead of exposing an active application or hiding an
unexpected result. Lifecycle commands obtain the Codespace name and session-scoped `GITHUB_TOKEN` from Codespaces'
protected shared environment when they have not yet been exported into their process; they never print or persist
either value. GitHub documents
[`CODESPACES` and `CODESPACE_NAME`](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace)
as the runtime discriminator and
[private as the default forwarded-port visibility](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace);
the current CLI's visibility command is the supported control surface. This is a containment for an observed
provider registration defect, not a custom tunnel or application workaround.

The `postAttachCommand` runs the executable helper at `script/refresh-codespaces-private-port` first, or at
`.firstdraft/design/script/refresh-codespaces-private-port` when only the archived helper remains. If neither is
executable, it succeeds without changing port registration. Retained planning context is optional for application
work; no helper is copied into generated application source to replace it. This uses the standard
[Dev Container shell lifecycle](https://containers.dev/implementors/json_reference/#lifecycle-scripts), not a new
service: the [reference implementation](https://github.com/devcontainers/cli/blob/main/src/spec-common/injectHeadless.ts)
runs a string command in `/bin/sh` with the workspace as its working directory. An inline path selection survives
the move even when the already-running container retains its original lifecycle configuration. Helper errors still
propagate, including its active-listener refusal; no port policy changes with the path. The focused
`script/check-codespaces-private-port.mjs` exercises root precedence, archived execution, non-executable or removed
helpers, and the existing private-port and listener cases. Both helper locations preserve actual failures; the
guard does not turn a failed refresh into success. Existing containers can retain the lifecycle command recorded
when they were created; this source change does not rewrite their provider metadata. These shell checks do not
qualify fresh-template attachment or private preview after reattachment and stop/start. Those provider observations
remain under [Service #730](https://github.com/firstdraft/firstdraft/issues/730).

The repaired tunnel exposed the already-recorded generated Rails HostAuthorization boundary. Do not copy the
student template's broad `config.hosts.clear` or disabled origin check into Drawing Board. Generated-app host and
Origin handling remain target-owned. The [successor qualification](docs/DIRECT_COMPILATION_PLAN.md#observed-successor-qualification-on-2026-09-0102)
subsequently proved a private forwarded browser GET, valid-CSRF state-changing POST, missing-CSRF rejection, and
unrelated-Host rejection on its exact generated artifact. Preserve that dated proof; it is not a claim about every
future generated target revision.

## Release handoff and periodic tool refresh

Drawing Board is a post-publication follow-up in the
[coordinated release process](https://github.com/firstdraft/firstdraft/blob/main/RELEASE_COORDINATION.md#drawing-board-release-handoff).
After the service and packages are released, update `FIRSTDRAFT_CLI_VERSION` and `FIRSTDRAFT_SKILLS_REVISION` in
`.devcontainer/agent-versions.env` to the published compatible CLI and the released plugin's exact source revision.
Reconcile the wrapper, setup messages, guide, root-adoption paths, and affected fixtures. Run `script/check "$DRAWING_BOARD_PATH"`, require
the pull request's built-container CI, and verify the merged revision's prebuild before declaring the template ready.
Record the selected pins and observed checks; installation and discovery do not prove authenticated Compilation.
This update and its prebuild do not block package publication. Pins install during workspace setup, so changing
them alone requires no workspace-image rebuild. Local development starts in an empty folder; this template serves
the Codespaces fallback.

Review tools weekly as well as during releases. Fresh setup already selects the vendors' latest public Claude and
Codex releases; verify those installers still work with the template. Review the pinned First Draft CLI/Skills,
Ruby, Node, PostgreSQL, Dev Container Features, GitHub CLI, and Selenium/image dependencies against their official
releases. Prepare small compatible updates and run the checks for the affected surface. A runtime pin must continue
to match generated Foundations; record a concrete compatibility reason when retaining an older version.

Use the existing vendor updaters for running workspaces, as described above. Do not reinstall tools on every attach,
change a user's selected channel, or reset authentication and conversation state. Image changes follow the existing
image publication and qualification procedure; an agent or First Draft package update alone needs no new image.

## Codespaces prebuilds

`setup-agents` calls `configure-codex.mjs` to initialize a missing `$CODEX_HOME/config.toml` only when `CODESPACES=true`, with
`sandbox_mode = "danger-full-access"` and `approval_policy = "on-request"`. The supported
[Codex configuration](https://learn.chatgpt.com/docs/config-file/config-basic) keeps plain `codex` and `codex resume`
usable after the [September 13 namespace failure](docs/STARTUP_FOLLOWUP.md#codex-command-sandbox--september-13-2026).
The Codespace's disposable VM
provides isolation from the student's computer; Codex still has access to the workspace, credentials, network,
and mounted Docker socket inside it. On-request approvals let the agent ask; they are not a command-level sandbox.
Drawing Board's separate Compile and publication instructions still apply.

The config is created during `postCreateCommand`, after the per-Codespace home volume is mounted. It survives root
adoption and container restarts intentionally, supporting normal application work in the same Codespace. After
Compile, the generated root `AGENTS.md` governs application work; Drawing Board's instructions move into
`.firstdraft/design/`.
This home setting is not scoped to those instructions or to First Draft commands. Setup never overwrites an existing
config or dotfile symlink and makes no change
in local devcontainers, where the mounted Docker socket can reach the developer's host. A user preserving older
settings can explicitly choose the same policy for a session with
`codex --sandbox danger-full-access --ask-for-approval on-request resume` inside their Codespace.

`script/check-codex-configuration.mjs` checks fresh volumes, repeated setup, local exclusion, and preservation of
existing settings. The agent smoke checks the installed Codex binary's loaded sandbox and permission-request
instructions, including a `never` control that must disable requests, without sign-in or a model request.

The primary template launch can reuse the prebuild on `firstdraft/drawing-board`; a new repository created with
**Create a new repository** does not inherit that configuration. Keep the README's **Use this template → Open in a
codespace** route and its private-repository checkpoint after Compile.

Manage the existing configuration under **Settings → Codespaces**, for `main` and
`.devcontainer/devcontainer.json`. Keep prebuild optimization enabled so a usable older prebuild can serve a launch
while its successor runs. The observed configuration uses **Every push**, all five regions, two retained versions,
and failure notifications to the maintainer. Region coverage and retention are cost choices; choose them from the
actual audience rather than adding a separate configuration for each generated repository.

Keep the agent/CLI/Skill install in `postCreateCommand` so tool updates need no workspace-image publication. The
[hosted experiment](docs/PREBUILD_EXPERIMENT.md) moved preparation into `updateContentCommand`: two prepared launches
averaged 55.7 seconds to setup completion versus 60.3 seconds for two existing-prebuild baselines. First native CLI
execution still waited on file reads after snapshot restore. That roughly five-second saving did not justify the
extra installation paths. The [second round](docs/STARTUP_FOLLOWUP.md) also found no useful improvement from file
read-ahead or concurrent warm-up. Its baked tool image made cold creation about 53 seconds slower in two matched
pairs. The shared image already contains the slower-changing Rails/system toolchain.

Setup reads pins from the **checked-out source**, which can itself come from an older prebuild. In the experiment,
requesting the branch after a push restored the previous commit while its new prebuild was unavailable. Keep
**Every push**, wait for a successful prebuild of the intended revision before qualifying a new pin, and verify the
Codespace's actual tree. Direct-template creation starts a new Git history, so compare its tree rather than expecting
the template commit SHA. Post-create installation does not by itself guarantee the latest remote pins.

To investigate a slow launch, record the exact template commit, region, machine, creation time, editor-ready time,
and `Drawing Board setup complete.` time. In that Codespace, check whether it actually used a prebuild:

```sh
gh api "/user/codespaces/$CODESPACE_NAME" --jq '.prebuild'
git rev-parse HEAD 'HEAD^{tree}'
```

Use **Codespaces: View Creation Log** to separate provisioning/container work from lifecycle commands. A green
prebuild workflow alone does not prove a particular Codespace used it. Compare the same revision and region before
claiming a speedup. See [GitHub's prebuild semantics](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds),
[configuration options](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/configuring-prebuilds), and
the [startup investigation](docs/STARTUP_INVESTIGATION.md) for measurements and proof boundaries.

## Publish from the Codespace terminal

The student-facing [terminal publication instructions](https://github.com/firstdraft/drawing-board/blob/main/README.md#publish-from-the-codespace-terminal)
remain with the template. The [historical credential receipt](docs/STARTUP_INVESTIGATION.md#publication-credentials)
records the existing built-in-token behavior; relocation adds no publication permission or provider observation.

## Credentials and external systems

Never commit a First Draft API token, GitHub token, agent credential, or generated `.env`. `script/check` scans the
Board candidate for common credential shapes and verifies that `.env` remains ignored.

The shared ignored `.env` is the credential path for both agents; do not add agent-specific token configuration.
The template wrapper intentionally selects staging. Its existing `.env` format keeps the staging token under
`FIRSTDRAFT_API_TOKEN`; the wrapper maps it to the CLI's `FIRSTDRAFT_STAGING_API_TOKEN`, removes the production token
and legacy plugin settings from the child environment, and overrides any inherited staging token. This applies to
the version probe as well as the requested command. A blank `.env` token never falls back to shell credentials.
The standalone CLI defaults to production and selects staging with `--staging`; Drawing Board's wrapper continues
to select staging through its required URL. Production defaults, GitHub Publication, and Service deployment
are owned by [firstdraft/firstdraft](https://github.com/firstdraft/firstdraft); Skill and plugin delivery are owned by
[firstdraft/skills](https://github.com/firstdraft/skills).

## Documentation

Keep [README.md](https://github.com/firstdraft/drawing-board/blob/main/README.md) focused on the beginner journey. Put maintainer commands and implementation details here,
and keep student agent guardrails in Drawing Board `AGENTS.md`. If a workflow change affects what a tester must do, update
the README and verify the affected journey before landing it: root adoption for the internal-alpha path, nested
`application/` when selected, or the separate-repository journey for Publication.
[DIRECT_COMPILATION_PLAN.md](docs/DIRECT_COMPILATION_PLAN.md) owns the
current direct-journey acceptance steps and every explicitly unfinished step; do not call that journey complete
until those steps are observed.

The internal-alpha delivery scope is the editor-first loop in the README: Codespace, installed Skill, existing
agent, approved root Compile, private-repository publication, boot, source inspection, ordinary source iteration, and saving to the same repository.
Deployment is optional follow-on work, not a pre-send gate for that code-sharing test. A separate Plan web editor,
public plugin promotion, and completion of all realization gaps are not prerequisites. The existing web surface
supplies access and credentials; an explorable read-only Plan view can improve independently.

The retained direct-journey receipts prove compile, boot, browser mutation, and same-agent iteration, not a hosted
application deployment. The README's Render/Neon route is provider-backed guidance, not an observed deployment
receipt. Before claiming that final leg qualified, exercise a saved generated application repository, a live Render
web service using Neon, persistent sample records across a redeploy, and one tested source edit reaching the live
URL. Record the actual source and provider configuration without secrets. Do not rerun unchanged Codespace image or
Compile qualification solely because this guide changes.
