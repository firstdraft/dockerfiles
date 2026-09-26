# Direct Compilation in the Drawing Board workspace

Retained Drawing Board evidence, relocated from `416ed5cbf08b` without a new provider trial.
Current maintenance commands live in [the maintainer guide](../README.md).

## Goal

Let an agent author a Foundation Plan in a Drawing Board Codespace, compile it into the workspace root, and continue
developing and testing the generated Rails Foundation in that same Codespace and Git repository. GitHub
remains the authentication provider, and the existing GitHub Publication flow remains available for callers that
want a separate repository.

The internal-alpha guide selects `--output .` mode after explicit approval of the Plan, gaps, and
move of existing Drawing Board files into `.firstdraft/design/`. Git history and any existing remote remain in place.
The recommended direct-template Codespace starts without a remote; inspect and commit the staged baseline, then use
VS Code's **Publish to GitHub** or the [Codespaces publication API](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/CONTRIBUTING.md#publish-from-the-codespace-terminal)
to save it to the user's private repository before setup or edits. The [startup investigation](STARTUP_INVESTIGATION.md)
distinguishes local no-remote CLI proof and live publication of a small Git fixture from the still-pending complete
hosted Compile-to-publication journey. Never run the nested initializer or application smoke after that move.
The optional `./application` and Publication paths remain available. The packets and dated receipts below preserve
the earlier nested-first delivery sequence; they are not instructions to initialize a nested app after root Compile.

## Package pins and prior release observations

The exact released CLI, Skills source, and runtime pins live in
[`.devcontainer/agent-versions.env`](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/.devcontainer/agent-versions.env). The September 22 local release selected
Skills `5f544bff149173a249899d2b5dfd403057cc5a30` (plugin `0.4.0`) and CLI `0.4.0`, both observed on npm `latest`.
That pair uses API `0.4` and Foundation Plan `sketch/0.20`. Its
[container CI](https://github.com/firstdraft/drawing-board/actions/runs/35808456552) and merged
[prebuild](https://github.com/firstdraft/drawing-board/actions/runs/35808770746) passed at release tree `b173010a`.
The image and runtime pins did not change. No fresh Codespace consumed the prebuild in this release.

CLI `0.4.0` defaults to local `--output .`, preserving planning material at `.firstdraft/design/`. GitHub Publication
requires `--github`. The earlier receipts below retain the versions and paths they exercised. Follow the
[release handoff](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/CONTRIBUTING.md#release-handoff-and-periodic-tool-refresh) when updating the pins.

Earlier on September 22, Drawing Board `b4899909` selected Skills `384fb9422a0cdd2a4bd08b86d6ca677e20048225`
(plugin `0.3.0`) with CLI `0.3.0`. That earlier tuple also used `.firstdraft/design/`, but its zero-flag Compilation
selected GitHub Publication.

The [September 15 release receipt](https://github.com/firstdraft/firstdraft/blob/c4ac120903d100622b6d625d650a8b26bd597eb8/docs/solutions/2026-09-15-account-settings-release.md)
records the preceding Skills `0.2.5` / CLI `0.2.2` tuple, Drawing Board `aed9635a` container CI, and prebuild success.
It did not exercise a fresh Codespace on that tuple.

### Earlier Skills 0.2.2 qualification (2026-09-10)

That update selected Skills source
[`7920d06717d0f70a1d7afe1405a8754109f7d388`](https://github.com/firstdraft/skills/commit/7920d06717d0f70a1d7afe1405a8754109f7d388),
tree `8cf3c0a78ba3b5392aea588ba84430db961d7d77`, the source of shared plugin `0.2.2`.
The canonical helper selects `./bin/firstdraft` before a bundled or PATH CLI. Before Compilation this is Drawing
Board's root wrapper. After root adoption, the Skill directs later First Draft commands to run from `design/`, so
`./bin/firstdraft` resolves to the moved wrapper and retains its credential setup. Ordinary Rails work stays at the
generated root; the Skill forbids the moved nested-only initializer and smoke helpers. **Create GitHub repository**
saves the current workspace; **Compile and publish through First Draft** creates a separate compiled repository.
CLI `0.2.2`, both agent versions, and language/runtime pins were unchanged by that Skill update.

The [0.2.2 release receipt](https://github.com/firstdraft/skills/blob/fb6c8e63105f1f139e6ae59f3958f9c98b44cd69/evidence/2026-09-10-shared-plugin-0.2.2-release.md)
records exact-package tests against the real local service with Claude and a synthetic HTTP fixture with Codex.
That receipt records a byte-for-byte comparison of all nine canonical Skill files, including the helper and
references, between the registry package and this source revision. Drawing Board nevertheless fetches the Git revision and uses its own
wrapper and installed CLI; package tests do not establish that environment's complete workflow.
The [new-pin hosted container contract](https://github.com/firstdraft/drawing-board/actions/runs/34563183070)
passed at Drawing Board `26caab0e4cefd05236dedea1f9332307c43bef97`, running `script/devcontainer-smoke` twice against
this pin. It verifies exact versions and Skill discovery without sign-in or Compilation. The dated records below
retain the earlier Skills revisions they exercised. No fresh authenticated Codespace journey at this Skill
revision with either agent was part of that checkpoint; it did not establish a Codex hosted journey.

## Agent release policy and qualification (2026-09-18)

New Codespaces select the vendors' latest public agents through their official native installers. Claude's
no-argument bootstrap defaults to `latest` while preserving an existing user's chosen channel on setup reruns;
Codex explicitly selects `latest`. Agent versions are observations in test receipts, not permanent compatibility
pins. The [maintainer policy](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/CONTRIBUTING.md#agent-installation-and-updates) owns update behavior and the independent
First Draft/runtime pins. A normal attach or resume does not run setup or a custom updater.

Primary-source inspection used [Claude's native bootstrap](https://claude.ai/install.sh), its public `2.1.278`
installer and shipped install/update code, and Codex
[`rust-v0.155.1`](https://github.com/openai/codex/tree/be2951ea34f0d295ed0becf97079f92fa5f6950e), including its
[native installer](https://github.com/openai/codex/blob/be2951ea34f0d295ed0becf97079f92fa5f6950e/scripts/install/install.sh).
Both installers own launchers in `~/.local/bin`; their ordinary vendor update commands use the same installation.
Claude's explicit `latest` install argument writes the user's channel setting, so setup deliberately omits it.
First Draft's pinned CLI alone retains a per-command npm prefix.

The first npm-based candidate, `5c0f9e355445fec7238e8e08f6a3fa22c18fc7c3` / tree
`ec9cdaa555a6eb222972708d47ba5ccd6466356f`, passed local agent checks,
[hosted CI](https://github.com/firstdraft/drawing-board/actions/runs/35419895381), and two full smokes in the fresh
repository/branch Codespace `fd-board39-20260919-4xx75x45p3wwx`. That fixture was created at `2026-09-19T03:59:28Z`
on East US `basicLinux32gb`, with normal post-create setup installing Claude `2.1.278`, Codex `0.155.1`, CLI `0.2.2`,
and Skills `54294d6c`. Prebuild status was not reported, so no prebuild or timing comparison is inferred.
**That candidate was rejected:** a subsequent interactive shell reproduced nvm's refusal of `NPM_CONFIG_PREFIX`,
leaving Node/npm unavailable. Its green noninteractive checks do not qualify the corrected native installation.
The retained smoke now runs noninteractive, interactive non-login, and interactive login shells. A negative control
with the bad prefix reproduced missing Node in the non-login shell and exited `127` at the first command; the
login shell alone retained Node despite the nvm warning. That observation motivated retaining all three modes.

Native installer checks used the existing immutable workspace image on **linux/arm64**, task-private containers,
no Docker socket, no database, and no real authentication files:

- Claude's no-target bootstrap installed latest `2.1.278` for a fresh profile and retained it on rerun. An existing
  user-selected `stable` channel stayed unchanged and selected `2.1.267`; explicitly passing `latest` overwrote
  that setting, confirming why setup omits the argument.
- Native `claude update` advanced `2.1.277` to `2.1.278` at the same launcher. Credentials, history, conversation,
  and settings fixtures retained exact bytes; custom global/project configuration keys survived vendor bookkeeping.
- The existing npm `2.1.226` installation migrated to native `2.1.278` without force or preliminary removal.
  Its old npm package directory remained inert; `~/.local/bin/claude` selected the native binary. An unrelated
  package sentinel and synthetic user state survived.

- Combined setup installed Claude `2.1.278`, Codex `0.155.1`, pinned CLI `0.2.2`, and Skills `54294d6c`.
  Both vendor update commands, complete setup rerun, and repeated `script/agent-smoke` passed. Noninteractive and
  interactive login shells both retained Node `24.18.0`, npm `11.16.0`, and both agents. Eight synthetic state files
  remained byte-identical and a custom global Claude setting survived vendor bookkeeping.
- The combined smoke retained executable/PATH, login/update/resume and review commands, effective Codex permissions,
  exact First Draft CLI help/compatibility, and both shared Skill catalog probes. Claude's isolated `--init-only`
  probe disabled hooks and MCP; Codex's prompt-input probe found the namespaced Skill.
- `script/check` passed under Ruby `4.0.5` and Node `24.18.0`; ShellCheck passed. The offline fixture exercises actual
  setup with simulated native installers, enforces the approved selectors, and preserves an existing user's channel.

The corrected source checkpoint is `6e6b34c5ffdc22678c09c0bf2bd9a191a7f05f2f`, tree
`fa16e0b654ee615d67b7aa48a0cd2ea86e241ee4`:

- A separate full migration fixture started with npm Claude `2.1.226` and Codex `0.154.0`, then ran that exact setup
  and unmodified agent smoke twice. Both launchers remained native at `2.1.278` / `0.155.1`. Seven synthetic
  credentials/history/conversation/Codex-config files retained exact bytes. Every original Claude setting and global
  configuration value survived; the vendor formatted settings and copied the existing global `theme: light`
  preference into settings. Settings bytes then stayed identical across all four setup/smoke snapshots.
- Native `codex update` advanced `0.154.0` to `0.155.1`, preserving the synthetic state and passing agent smoke.
- [Hosted container CI](https://github.com/firstdraft/drawing-board/actions/runs/35420709793) passed on that exact
  checkpoint, including source/depth-one contracts and both full container smokes on linux/amd64 with the same
  native agent versions.
- The one retained Codespace was updated to that checkpoint and normally rebuilt. Docker reported a new container
  created at `2026-09-19T04:14:49Z` from the unchanged `06602be5` image, with the same three named state volumes.
  SSH timed out during banner exchange after the rebuild; one stop/start restored access at `04:19:25Z` without
  configuration changes. The exported creation log records that resume; it replaced the earlier rebuild log.
- From `04:20:05Z` to `04:20:41Z`, the rebuilt linux/amd64 fixture passed full `script/devcontainer-smoke` twice,
  both vendor updates, explicit setup rerun, and agent smoke. The normal environment had no global npm prefix;
  both shell modes retained Node `24.18.0`, npm `11.16.0`, and both native clients. Claude doctor reported
  auto-updates enabled on `latest`. All eight pre-rebuild synthetic/configuration/blank-env files stayed
  byte-identical; vendor-owned global installation bookkeeping was excluded from that byte comparison.

A final fresh local run at `a12ddae7d2f8a19bb5d6f9a59d64871fe47a33c8` / tree
`9d9f539bc9b772009580271dbe1b5c2cea905feb` used empty agent/cache volumes and `CODESPACES=true`. Real native setup
installed the same client/CLI versions and created the mode-0600 Codex config with the then-current
`danger-full-access` / `on-request` defaults. The loaded permission check and full agent smoke passed all three
shell modes. This exercises first-install configuration composition locally; it is not a GitHub Codespace creation.

A fresh Codespace attempt on `2026-09-19` did not reach that corrected source. The assigned fixture,
created at `15:02:07Z` for `main`, reported `prebuild: true` and opened the clean pre-update checkout
`aed9635a4dc191eb1f384e500c10648a5cec2215`, tree `47cae4a0f88fd5503260d994a0bb5a4545cc1c0f`.
Its initial post-create log installed Claude `2.1.226` and Codex `0.154.0`, even though remote `main` was already
`d2f488f783dd98167c4ba65fb6a7937ddea92e53` / tree `d94c7e80aecefd549719ee70709475c191ffc62e`.
The source, provider log, unchanged image digest, and mounted volumes were retained; no setup rerun, smoke, or
synthetic-state mutation was performed on the mismatched checkout. The fixture was confirmed stopped by `15:09Z`.
The log completed setup without recording a source update phase or its failure; it does not establish why the
provider selected the old checkout. This repeats the [prebuild freshness boundary](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/CONTRIBUTING.md#codespaces-prebuilds)
and does not qualify or falsify the corrected native implementation.

Read-only review of existing configuration `151299` found **Every push** for `main` and
`.devcontainer/devcontainer.json`, all five regions, two retained versions, and prebuild optimization enabled.
During the `15:02–15:09Z` attempt, its latest [prebuild run](https://github.com/firstdraft/drawing-board/actions/runs/35027951438)
was the successful September 15 run at `aed9635`; workflow history contained no newer run before the fixture stopped.
A failed-latest-run fallback was therefore not established. GitHub's
[older-prebuild fallback documentation](https://docs.github.com/en/codespaces/troubleshooting/troubleshooting-prebuilds#preventing-out-of-date-prebuilds-being-used)
explains the possibility of an older checkout, not why an automatic successor run was absent in this attempt.

A manual refresh of unchanged configuration `151299` then produced a successful
[prebuild at merged `main`](https://github.com/firstdraft/drawing-board/actions/runs/35451319086). A new disposable
Codespace created at `15:38:08Z` reported `prebuild: true` and actually opened
`d2f488f783dd98167c4ba65fb6a7937ddea92e53` / tree `d94c7e80aecefd549719ee70709475c191ffc62e`.
Its initial post-create setup ran from `15:38:32.789Z` to `15:39:09.634Z`, installing native Claude `2.1.278`,
Codex `0.155.1`, CLI `0.2.2`, and Skills `54294d6c`. The source was clean and unchanged before and after qualification;
the image remained `06602be5`, with the three configured agent/cache volume mounts.

- Before any synthetic seeding, `.env` matched the blank-token template and had mode `0600`. The checked agent
  credential files and authentication environment variables were absent; neither standard conversation directory
  contained files.
  Codex's initial mode-`0600` config selected the then-current `danger-full-access` / `on-request` defaults.
- From `15:43:15Z` to `15:43:33Z`, two full `script/devcontainer-smoke` runs passed in that fresh linux/amd64
  Codespace. All three Bash modes (`-c`, `-ic`, `-lic`) retained Node `24.18.0`, npm `11.16.0`, and both agents.
  Effective Codex permissions, required commands, pinned CLI/Skill compatibility, and both Skill catalogs passed.
  Claude doctor reported native installation, auto-updates enabled, and the `latest` channel.
- Six synthetic files represented credentials, conversations, and unrelated Skills for both agents. Supported setup
  rerun and all three modes of agent smoke passed by `15:46:42Z`. Those six files plus the initial Codex config and
  blank `.env` retained bytes, modes, and ownership after setup and again after smoke. Existing settings were not
  edited; no Claude `settings.json` existed before or after. Vendor global bookkeeping was recorded separately
  from those eight files. The native client versions and Claude doctor's channel/update status stayed the same.

The initial provider log, runtime logs, source/image/mount metadata, and hash receipts were exported before the
fixture was stopped; `Shutdown` was confirmed at `15:49:35Z`, before its `16:23:08Z` deadline. This completes the
fresh corrected-source installation observation for [Drawing Board #39](https://github.com/firstdraft/drawing-board/issues/39).
The successful manual prebuild refresh does not explain the earlier missing automatic successor run.

For future qualification, use an assigned disposable fixture and verify its actual source head/tree matches the
frozen candidate before running checks. Retain its post-create log, installed versions, and mount configuration.
With the initial blank `.env`, run `script/devcontainer-smoke` twice. Then seed only synthetic agent state, rerun
setup, and verify preservation, distinguishing vendor-owned configuration migration from byte-preserved credentials
and conversations. Do not reuse or alter a signed-in Codespace without its assigned lease.

These checks concern installation, update commands, shell availability, and Skill catalogs. They do not prove
direct-template creation/publication, credential validity or signed-in conversation restoration, an authenticated
Skill/model turn, first-session instruction loading, or a Plan-to-Compilation journey. No agent signed in, and no
First Draft service, Compilation, repository publication, or release operation ran. Requalify affected commands and
discovery when a future vendor release changes them; record actual versions instead of retaining observations as pins.

The minimal `CLAUDE.md` import stays. [Anthropic's native AGENTS discovery](https://code.claude.com/docs/en/memory#agents-md)
has first-session and feature-availability limits; neither latest installation nor catalog diagnostics prove it can
replace the import. [Service #712](https://github.com/firstdraft/firstdraft/issues/712) owns that remaining qualification.

## Earlier Codex qualification boundary (2026-09-10)

That update selected [`@openai/codex@0.154.0`](https://github.com/openai/codex/releases/tag/rust-v0.154.0).
An actual local `gpt-6-astra` model turn with `0.147.0` returned HTTP 400 saying that the model required a newer
Codex version, before any Skill or First Draft service use. The same model starts successfully with `0.154.0`.
This compatibility failure, rather than a new First Draft CLI or Skill requirement, motivates the pin change.

Local `0.154.0` command-help checks passed. Separate model tests exercised the shared packaged Skill candidate,
published CLI `0.2.2`, and authentication/approval continuity against a local HTTP fixture. The
[Skills receipt](https://github.com/firstdraft/skills/blob/7920d06717d0f70a1d7afe1405a8754109f7d388/evidence/2026-09-10-codex-onboarding.md) records exact
package identities and boundaries. The fixture tests do not prove real First Draft Analysis or Compilation.
The separate real-service package tests linked above used Claude; they do not establish a Codex Compiler journey.
`bin/agent-doctor --installation-only` checks login and resume command availability. Hosted
`script/devcontainer-smoke` additionally checked the pinned version and exact Skill inventory; neither check signs
in or proves the complete agent journey.

The earlier [hosted container contract](https://github.com/firstdraft/drawing-board/actions/runs/34561285350) passed at
`aa7ec605ba3f57dc2b05f2bb65244e3d31aba74e`, including both runtime-smoke invocations with Codex `0.154.0` and the
updated alias-aware Skill-path check. That is container/installation evidence, without agent sign-in or Compilation.

OpenAI's [Skill instructions](https://learn.chatgpt.com/docs/build-skills#how-chatgpt-and-codex-use-skills) document
`/skills` selection and `$` mentions; local discovery supplies the `firstdraft:create-full-stack-app` name. The
README uses those supported interfaces, without claiming an observed interactive picker or message-entry smoke.

At that checkpoint, the retained hosted full-journey receipts exercised **Claude**, with Codex `0.147.0` installed. Fresh browser device
sign-in, Codex's Codespace permission prompts, a Codex-driven Plan-to-root-Compile journey, and resuming that
conversation after a Codespace stop/start were still unproved. Local model/CLI results and a green container contract
must not be reported as that hosted Codex journey.

## Packet 1: direct artifact output in the CLI

Exact implementation candidate before this document:

- repository: `firstdraft/cli`;
- base: `a251df7870491d5b9bdc390c27373933563f99fd`;
- reviewed head: `89ca49b3046ae86e540886868887eb0e60970ad5`;
- integrated main: `d38ef3e54a6476b3a91f22a17fe7bd47aa6d6d68`; and
- tree-identical result: `e62ee3ff1fb6d188c5d2c5a6e5e0efd50b40245f`.

`firstdraft plan compile --output <absent-directory>` is a distinct execution mode:

1. Preflight the explicit output path before any network mutation. The target must be absent beneath an existing,
   real parent directory.
2. Push the exact Plan and wait for the matching valid Analysis using the current Plan flow.
3. Re-read local state and exact Plan bytes before starting Compilation.
4. Send one conditional, bodyless `POST` to the existing Service Compilation endpoint. Do not retry an ambiguous
   start.
5. Poll only the returned retained Compilation identity.
6. Fetch and verify the existing Compilation artifact contract.
7. Materialize exact files and modes into a sibling temporary directory, verify the tree, recheck that the target
   remains absent, and atomically rename it into place. Remove the task-owned staging directory on every
   pre-rename failure.

Artifact extraction accepts only relative ASCII path components and regular files with canonical `0644` or `0755`
modes. It rejects `.`, `..`, `.git`, symlinks, special files, duplicate paths, digest mismatches, and any file not
declared by the verified manifest. Verification re-reads the staged tree before the rename.

Once the Service has returned a validated Compilation identity, every later status, artifact, or local
materialization failure must retain that identity in its structured error. An ambiguous start (including a
validated timeout or server problem response) reports that the outcome is unknown and never sends a second start;
the current Service has no collection read or idempotency key that can recover a Compilation whose response was
lost before its identity reached the client. The first packet therefore stops explicitly and does not claim
automated recovery for that rare path. A future Service packet may add a client-generated idempotency key or an
equivalent exact lookup; until then, neither an agent nor the CLI may turn an unknown outcome into another Compile.

This mode performs no GitHub Publication, formatter, repair, merge, or Git initialization. It creates no Service
API or artifact format. Without `--output`, `firstdraft plan compile` retains its current GitHub Publication
behavior and URL-only success output. CLI tests exercise that zero-flag route, and its exact-head hosted matrix owns
the regression proof; packet 3 does not create a throwaway Publication merely to repeat that unit of evidence.

The direct mode is noninteractive. Structured failures tell an agent whether the path, Plan, Analysis, Compilation,
artifact, or materialization failed.

## Packet 2: one Drawing Board Dev Container for both phases

Exact implementation candidate before this document:

- repository: `firstdraft/drawing-board`;
- base: `0434aa330c51e1771c24b61a22dd8096c614e1d7`;
- head: `5788de045d2f39842b7b3d692620aa00d2efe32b`; and
- tree: `9a0c52d2ed8bcbe5c13bc22245ffb85c0aca0f11`.

Drawing Board uses Compose and reuses the generated Foundation runtime instead of maintaining a second Rails
environment:

- the active Rails Ruby 4.0.5 image and Dockerfile shape;
- Node 24.18.0;
- PostgreSQL 18 with the generated parent-volume topology and health gate;
- Selenium and the generated DB/Capybara environment;
- ports 3000 and 5432; and
- the same noninteractive toolchain PATH.

Drawing Board-specific state remains its workspace root, persistent agent homes, and agent installation. The parent
repository ignores `/application/`.

The artifact intentionally contains no `.git`. A nested app would otherwise let Git-sensitive generated checks
discover the parent Drawing Board repository. Drawing Board therefore owns `script/initialize-application`, which
accepts a safe application path (default `application`), requires a directly materialized application, creates a
nested `main` repository and parentless initial commit, and proves that the committed path/blob/mode inventory equals
the on-disk application tree at initialization time. It does not re-verify that tree against a retained Service
manifest. Running it before application setup or user edits is a workflow rule; its ignored-state hard stop catches
setup byproducts but cannot detect an arbitrary edit to a tracked generated file. It honors the generated
`.gitignore` and force-stages only the two exact current artifact-owned files under `.firstdraft`. Any other ignored,
derived, or local path is a safe hard stop rather than an invitation to commit `.env`, keys, dependency trees, or an
unknown future artifact file. It does not lint or normalize the generated bytes. The CLI remains transport-pure.

`script/application-smoke` verifies the real nested repository before dependency, database, or server work, then
runs generated setup, PostgreSQL readiness, and the complete generated `CI=1 bin/ci`. It does not patch generated
bytes. Drawing Board's ordinary hosted contract executes a hermetic initializer fixture, including ignored
`.firstdraft` bytes, executable modes, trailing whitespace, safe-path rejection, and hostile ambient Git state.

## Packet 2.5: release and authoring bridge

Packets 1 and 2 cannot form a fresh user journey merely as source branches. The coherent delivery tuple is:

1. Integrate the direct-output CLI as backward-compatible `0.2.1`, retaining zero-flag Publication.
2. Update the authoring Skill to `0.2.1`, require exact CLI `0.2.1`, and teach two separate completion modes:
   direct `firstdraft plan compile --output ./application` in a shared workspace, or zero-flag GitHub Publication.
   For Drawing Board direct output, the Skill issues the relative path only from the physical workspace root. The
   agent selects and states the mode before the final Plan/GapSet approval, so approval covers the intended local or
   external effect; it never switches modes to recover from an ambiguous start.
3. After explicit release authorization, publish the exact reviewed CLI `0.2.1` package under the `next` dist-tag
   and verify the immutable registry artifact and Git provenance.
4. Confirm that staging advertises the API contract required by the pinned CLI. Update Drawing Board's exact CLI
   version and Skills revision together, then run its real Dev Container contract. In that same packet, update
   Drawing Board's README, `AGENTS.md`, `CONTRIBUTING.md`, setup banner, and this plan's status lines. The README needs
   two explicit completion branches, including `script/initialize-application` for direct output, rather than a
   wording-only change; zero-flag Publication remains the separate-repository branch.

The Skill preserves exact Plan and GapSet review, conditional state, credentials, retained-identity recovery, and
the explicit stop on an ambiguous start with no retained identity; it routes transport and container details to
their owning tools rather than copying them. Drawing Board continues to install Skills from an exact Git revision,
so plugin publication or catalog promotion is not required for this packet. CLI `latest`, plugin publication, and
catalog promotion remain separate release choices.

The original packet-2.5 inputs observed on 2026-08-28 were:

- CLI `0.2.1`, source/tag commit `d38ef3e54a6476b3a91f22a17fe7bd47aa6d6d68`, tree
  `e62ee3ff1fb6d188c5d2c5a6e5e0efd50b40245f`, published under npm's `next` tag while `latest` remains `0.1.0`;
- Skills `0.2.1` at `160d33a5a7d9f9b2282729ecfd3b2e24a1123143`, tree
  `6f3db12c017e884d8b14c66f7d82e64229ec2073`, installed by Drawing Board from source; and
- staging advertising First Draft API contract `0.3.0`.

That Drawing Board revision pinned the CLI/Skills pair and taught direct `./application` output as its ordinary
path. The candidate plugin `0.2.1` digest is
`36e3e80db76d4af6c2af96d87fe42e00b944aab01e16584e6eb5149dc3f196b1`, but this source-pin packet does not publish
plugin bytes, move a catalog, or move npm's `latest` dist-tag. At that boundary, npm's `next` tag selected CLI
`0.2.1`. Packet 3 owns the observed non-prebuilt journey rather than inferring it from these compatible release
coordinates; the result below also preserves what that journey did not yet prove.

The 2026-08-30 successor pin candidate uses:

- CLI `0.2.2` from source/tag commit `799a184cb2453ceadf5575f7b46ba975e084f192`, tree
  `7c66247b4d8460b130a5d65443466575a9a3cea1`, package SHA-256
  `42814e22249da7f46a186814cbfcb883c62f081b6c25bd8951f54cb43bc1902a`, published under npm's `next` tag while
  `latest` remains `0.1.0`; and
- Skills source `0a765f88d1cd500168e18ce1adda03802773f35e`, tree
  `4a6c87a5853d13332f7a4b04be01ed46c3e08605`, candidate package SHA-256
  `6ba0efb4fcb2dbf06d412ea8847593593fa832dc9cbcb419857a74c42e6cf74f`, requiring exact CLI `0.2.2`.

Drawing Board installed Skills from that exact source revision at that boundary, so the unpublished plugin package
did not block the template. CLI 0.2.2 retains absent `./application` output and zero-flag Publication while adding
explicit current-root
adoption. At that successor-pin boundary, the beginner journey still selected `./application`; the current guide's
root-first choice is recorded above.

## Packet 3: one real non-prebuilt Codespace journey

After packets 1 and 2 are integrated into a coherent candidate tuple, confirm that staging serves the API contract
required by that tuple, then exercise a newly created Drawing Board Codespace without relying on a prebuild:

1. Confirm the Drawing Board authoring/agent setup still works, the pinned Skill advertises both completion modes,
   and the active agent can locate the retained design context without being retaught it in the test prompt.
2. Author or load one reviewed Foundation Plan and configure an approved staging API token.
3. From the physical Drawing Board workspace root, record the current directory and run
   `firstdraft plan compile --output ./application`. The Skill must not issue that relative path from inside the
   generated application or another directory.
4. Prove that no GitHub Publication or generated-repository creation occurred by retaining the CLI request sequence,
   the Project's Publication route before and after, and the GitHub repository inventory before and after.
5. Run `script/initialize-application application`.
6. From the Drawing Board root, run `script/application-smoke` to prove nested-Git isolation, exact Ruby/Node pins,
   PostgreSQL compatibility, readiness, and the complete generated CI. Then enter `application`, boot `bin/dev`,
   and verify the app through the forwarded web port in a real browser.
7. Ask the same agent to explain one Plan decision from the retained design context and make one bounded application
   change that follows it, then run a focused generated-app check.

### Observed Packet 3 boundary on 2026-08-28

A fresh private repository and Codespace exercised the exact Drawing Board candidate without a prebuild:

- Drawing Board source `f93d54a2a55ca7d06abe072424092b1dd0544117`, tree
  `ade2a7079299d84cfd746c241aff905b3cd0115b`, was copied into one parentless test-repository commit
  `fd73196251e341893f8e0496e4d1ba6765c89f49` with the same tree.
- One `basicLinux32gb` East US Codespace reached `Available` 404.5 seconds after its create request. Its runtime
  reported CLI `0.2.1`, Skills `160d33a5a7d9f9b2282729ecfd3b2e24a1123143`, Claude Code `2.1.226`, and Codex
  `0.147.0`; the Dev Container smoke and direct-output capability checks passed.
- The approved Neighborhood Guide Plan SHA-256 was
  `1e88f919436d779176abd115f79f84293d4ea4579d21cc07bdc64db3b1a2a962`. Analysis
  `01a04a08-e38a-7708-accb-d2980cfc0c7f` returned a valid zero-record GapSet with SHA-256
  `e1d40a25d442b18380882e644ff1e4d5a6191159eb3b0cdaff258f20f7ad3fc7` before the owner approved direct mode.
- Exactly one direct Compile started. Compilation `01a04a0d-3484-7e29-b743-0c77b96db063` succeeded with artifact
  SHA-256 `0f26014b38d64816ce4b7934e969ce9a3db715a96f3789df609a45b81bf35188`, 479,770 artifact bytes,
  168 output files, and manifest SHA-256
  `08269fa09226d41d89894dbef1f0a26cbd51c7fc47b7ca81d5085f44c8480d1c`. The emitted submitted Plan and
  GapSet bytes matched the approved inputs, and the new directory had no Git metadata.
- The Project's Publication route returned exact `404 publication_not_found` before and after Compile. The owner's
  551-repository GitHub inventory was byte-identical before and after, so the direct path created no Publication or
  generated repository.
- `script/initialize-application application` produced parentless commit
  `3f763a84ceab6d7f3564f382bc77cce267a528f1`, tree `11a52026505434bd3242c9cab94d49ed68638681`, on
  nested `main`. `script/application-smoke` passed setup, PostgreSQL 18.6, readiness, 56 Rails tests with 209
  assertions, seven system tests with 34 assertions, and the complete clean generated CI in 69.22 seconds under
  Ruby 4.0.5 and Node 24.18.0.
- A real browser rendered `It works. · Neighborhood Guide` and the empty `Places · Neighborhood Guide` index
  through an authenticated localhost forward to the same Codespace process. The ordinary private Codespaces
  `*.app.github.dev` URL instead reached Rails' blocked-host page. The generated Rails development configuration did
  not admit that exact Codespaces host; broadening the Drawing Board container environment would not preserve Rails'
  exact host boundary. This is a generated Foundation target defect, not a successful ordinary forwarded-port
  observation, and requires a target-owned correction before the colleague Codespaces browser journey is complete.
- The single task token was revoked after proof and the exact credential then received `401 authentication_required`.
  The revoked value was removed from the Codespace, and the Codespace stop was requested.

This run proved agent and Skill installation/discovery, but neither installed agent was signed in inside the
Codespace. The active external agent drove the exact Skill sequence over SSH, loaded a previously reviewed Plan,
and obtained fresh owner approval of its exact Plan, GapSet, and direct effect. It did not perform the new
in-Codespace conversational authoring pass, boot the browser process through step 6's `bin/dev` wrapper, or perform
step 7's retained-context explanation and bounded source change. Those remain explicit acceptance work rather than
being inferred from installation, `bin/rails server`, or Compilation success.

### Observed successor tunnel blocker on 2026-09-01

The successor attempt in Codespace `fd-direct-025-85d2035-gggqjg9r42vvv4` reached a distinct provider-side blocker.
VS Code 1.133.0 (`a5b500951314efd502d07465bd138dfbd714a960`) launched its Node 24.18.0 remote extension host without
`--supportGlobalNavigator`; GitHub Codespaces extension 1.18.16 then raised `PendingMigrationError` while loading
Axios and Microsoft Dev Tunnels. Puma was healthy on `0.0.0.0:3000`, local GET returned 200, and the Ports view
resolved the exact process and private URL, but both an authenticated browser request and an official
`X-Github-Token` request returned 502 before Rails received them.

The runtime Dev Container now carries VS Code's documented `extensions.supportNodeGlobalNavigator` migration
setting. A fresh immutable-ref Codespace proved the extension-host flag and absence of the migration error, but its
private URL still returned relay 502 before Rails. In Codespace `fd-nav-ca8165f-0901-www7pwj4v25446`, pre-reset
request `3a23a4e6-92e0-4475-a345-34ff755a5f7a` reproduced that boundary with local HTTP 200. A controlled comparison
then applied the existing student Rails template's exact public-to-private visibility reset. Post-reset request
`09174d73-2baa-480d-a41c-bb6e42c4b2fb` immediately reached the unchanged Rails process and returned the separately
expected `Blocked hosts` response. Drawing Board now runs a guarded, diagnostic version of that reset on Codespaces
attach only while port 3000 has no listener. If Codespaces removes the unbound registration between the visibility
commands, the next integrated-terminal listener creates a fresh private registration; every other incomplete or
exposed result fails. This tunnel containment
does not retire the 2026-08-28 generated Rails host-admission finding or prove a state-changing POST; those remain
target-owned correction and proof.

### Observed successor qualification on 2026-09-01/02

One fresh template-derived, non-prebuilt Codespace completed the successor journey:

- Drawing Board `117a45e040ce579f84aa69dd8968a560301199bc`, tree
  `af28087081d85fa93cd82969b057914e3a73d29a`, was copied byte-for-byte into parentless template-repository commit
  `d228b0782122ce4f0625fd1cc08b3a73f40313c9`. The public workspace-image manifest
  `sha256:06602be5cc829d5142c12b06c505dbf8353a3ade6751ca4bf01a785ea2c3e6e3` was retrievable without credentials.
- The sole `basicLinux32gb` East US Codespace `fd-successor-117a45e-0901-5wwqjwwxj27vrr` reported no prebuild. It
  reached `Available` 197 seconds after creation and the first SSH probe completed in six seconds. Runtime setup
  installed CLI `0.2.2`, Skills `0a765f88d1cd500168e18ce1adda03802773f35e`, Claude Code `2.1.226`, and Codex
  `0.147.0`, with both Skill links targeting the exact source checkout.
- Staging advertised API contract `0.3.0` and its web and worker used Service
  `cc72dad5b26b887f3f21496b568b80678ceac47f`, tree `4aea5019e2d9e43031b68a03d2129bfca4d0013e`.
  The same signed-in Claude session `8615af73-f549-461c-8155-7818785d3c0d` explained the approved Neighborhood
  Guide Plan, submitted its exact SHA-256 `1e88f919436d779176abd115f79f84293d4ea4579d21cc07bdc64db3b1a2a962`,
  and retained Analysis `01a06000-5908-715f-936a-4d448a818705`. The reviewed GapSet was empty, with SHA-256
  `8126a9155702c201da5d06013366f1afb824e6bd7100c5866be5ff8b1282684e`. The observed releases were Analyzer
  `foundation-plan-rails/application-2026-08-28-reviewed-realization` and Compiler
  `foundation-plan-rails/compiler-application-2026-08-28-reviewed-realization`.
- After explicit approval of those exact bytes, gaps, and direct effect, the session invoked exactly one
  `bin/firstdraft plan compile --output ./application`. Compilation
  `01a06006-8c58-7206-b335-4d346ebfe8da` succeeded with artifact-source SHA-256
  `a9d7b0a67748073f8ae0d867daada532f48b357c4a04b3cb4dbbfbf523e00eba`, manifest SHA-256
  `f3b0175f5be0a587247af14a2ea29f0e61d79f2a8676e5fefd2ccce4fb036244`, 494,373 bytes, and 169 files. Service
  inspection proved a zero-to-one Compilation count and no Publication. The owner's 556-repository GitHub
  inventory was byte-identical before and after Compile, so the Service created no repository.
- `script/initialize-application application` produced parentless nested commit
  `248c19fc76adccb47056aca1b3d6ac28e0e35d42`, tree `a025f870dc6cf8bfcf7e52e8d6d3f9c3690be5c5`,
  on clean `main` with no remote. The unchanged generated app then passed root `script/application-smoke`; its
  `script/selenium start` resolved the Compose project from the runtime container label without a fallback. The
  smoke passed setup, PostgreSQL readiness, 60 Rails tests with 247 assertions, seven system tests with 34
  assertions, and complete CI in 83.41 seconds under Ruby 4.0.5 and Node 24.18.0. The first external noninteractive
  SSH invocation lacked Codespaces' normally exported name/domain variables and stopped before database
  preparation; the exact app passed when the SSH harness supplied those platform values. This is an external-harness
  boundary, not an integrated-terminal source repair.
- A live terminal `bin/dev` served the app through its ordinary private
  `fd-successor-117a45e-0901-5wwqjwwxj27vrr-3000.app.github.dev` URL. The remote extension host carried
  `--supportGlobalNavigator` and logged no `PendingMigrationError`. An authenticated GET returned 200; a genuine
  Place form POST with GitHub's rewritten `Origin: http://localhost:3000` returned 303 and committed exactly one
  row; the same-session missing-CSRF negative returned 422 without another row; and an altered forwarded Host
  returned 403 while the exact Host returned 200. After server shutdown, the guarded port refresh ended with no
  listener and private visibility.
- The same agent explained the Plan's public Place CRUD decision, changed exactly the Places index lede to make that
  decision visible, and passed YAML parsing, an exact translation check, and the focused scaffold integration test
  at one run and one assertion. The edit remained uncommitted in the nested no-remote repository for inspection.
- The task-scoped staging token was revoked, the old credential received `401 authentication_required`, credential
  material was removed from the Codespace, the agent logged out, and the sole Codespace reached `Shutdown` after
  one stop request.

This exact observation moves the workspace image's `comparison_codespace` result to `passed` and completes the
beginner `./application` qualification. It does not qualify `--output .`, arm64 image runtime, Publication,
deployment, or persistence of the unpushed nested application after the disposable Codespace.

Retain exact Service, CLI, Drawing Board, Plan, GapSet, artifact, generated tree, nested initial commit, container,
database, smoke output, and browser coordinates. If the Compilation start has an unknown outcome without a retained
identity, abort the qualification, preserve its Project/request/response/timing evidence, and ask a Service operator
to reconcile it; do not retry, switch modes, or create a replacement Project as an improvised recovery. Stop the
Codespace after proof or a recorded abort. Do not treat a local Docker rehearsal as the Codespace observation.

## Compile into an existing root

For current root eligibility, archive paths, and later authoring commands, use the
[root-Compile instructions](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/README.md#5-describe-your-app). The CLI owns the transaction details. The following
contract records CLI 0.2.2 for the dated qualification below; it is historical.

CLI 0.2.2 implemented POSIX current-root adoption in any eligible real directory rather than recognizing Drawing
Board specially:

```sh
bin/firstdraft plan compile --output .
```

The CLI reserves the root before network work, verifies the artifact outside it, and journals the installation.
On success it moves every preexisting non-Git top-level entry beneath `design/`, installs the generated Foundation
at the root, and reports the root-adoption result. It preserves an existing `.git` directory and history, stages the
tracked moves and exact generated paths without staging previously untracked or ignored files, and leaves a non-Git
root non-Git. The authoring Plan and private CLI state move under `design/.firstdraft`, which remains the location
for later First Draft commands.

Root adoption rejects unsupported platforms, nested worktrees, unsafe entry types, an existing `design` or
`.firstdraft-root-output`, unclean tracked Git state, unmerged or sparse state, submodules, and concurrent adoption.
A failed transaction either restores the original identities or retains its private journal for explicit recovery.
It never creates a Git repository, starts Publication, deploys, or substitutes for absent `./application` output.

Drawing Board now selects root adoption for the internal-alpha handoff so the same conversation can move from Plan
to inspectable source and an ordinary feature commit in one repository. The older nested path retains its separate
initializer/smoke workflow. Root mode uses generated `bin/setup` and `bin/ci` at the root, starting Selenium through
the generated `.devcontainer/compose.yaml` in the running container's Compose project. Compose waits for Selenium's
health check; see the [current browser-testing instructions](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/README.md#7-open-your-app). The dated observations
below retain the helpers and source they exercised. Current fallback qualification remains under
[Service #729](https://github.com/firstdraft/firstdraft/issues/729) and
[#730](https://github.com/firstdraft/firstdraft/issues/730), including private preview and fresh-template attachment.

### Observed current-root qualification on 2026-09-02

One fresh, non-prebuilt Codespace completed that separate observation; it did not change the beginner default at
that time:

- Drawing Board main `6f36fa22901ff818b7d369fb92ce042ec62a6a6f`, tree
  `4b15c5ade7465e16e7c922b996470b88b082a23e`, was copied byte-for-byte into parentless test-repository commit
  `93f7b99777f1466c20548d9bacb3317f98cad4f1`. The public workspace image remained
  `ghcr.io/firstdraft/drawing-board-workspace@sha256:06602be5cc829d5142c12b06c505dbf8353a3ade6751ca4bf01a785ea2c3e6e3`.
  The East US Codespace reported no prebuild, reached the first retained `Available` snapshot 222 seconds after the
  create request, and completed its first SSH probe eight seconds later. An earlier pre-authentication Codespace
  expired after the configured one-hour
  retention with no staging credential, Plan, Analysis, Compile, or Publication; it is not part of the qualified
  external-operation sequence.
- Runtime setup installed CLI `0.2.2`, Skills `0a765f88d1cd500168e18ce1adda03802773f35e`, Claude Code `2.1.226`,
  and Codex `0.147.0`. Staging advertised API contract `0.3.0`; its observed web and worker Service revision was
  `cc72dad5b26b887f3f21496b568b80678ceac47f`, with the 2026-08-28 reviewed-realization Analyzer and Compiler
  releases. One signed-in Claude session `5ecb8613-813c-4a08-b60a-7d7b37d4ffae` retained the design context through
  Plan review, Compile, and the later source edit.
- The session explained the approved Neighborhood Guide Plan at SHA-256
  `1e88f919436d779176abd115f79f84293d4ea4579d21cc07bdc64db3b1a2a962`, retained valid Analysis
  `01a063fc-9e09-7bd7-b097-441f2afbd68d`, and presented its empty GapSet at SHA-256
  `45bad750de4a3674ab7c5a2bb578cbd7bcc647a91ee3e7df5f514b15df32bd08`. After explicit approval of those
  exact bytes, the empty gap result, and the relocation effect, it invoked exactly one
  `bin/firstdraft plan compile --output .` from the workspace root. Compilation
  `01a06400-b750-7753-beb9-5f7aa86e4e49` succeeded with artifact-source SHA-256
  `77caf405d9fa104a5c301722b35cf543e5c293a4e6d591e86895b0085a874630`, manifest SHA-256
  `51ec1026e1adf41cbf857b34bcd20d55cff640aa91b36176e9bdc1e312cbd7e9`, 494,373 bytes, and 169 files.
  Service inspection proved a zero-to-one Compilation count and no Publication. The owner's 557-repository GitHub
  inventory was byte-identical before and after Compile, so the Service created no repository.
- Root adoption moved all 15 preexisting non-Git top-level entries under `design/`, preserved `.git`, its original
  commit and remote, staged the 37 tracked moves plus 169 generated paths, left ignored `.env`, `.firstdraft`, and
  `tmp` material relocated under `design/` unstaged, and left no nested `.git`, `application/`, or recovery journal.
  Committing the staged
  result produced `fba5ce7daa55c2c5013bc1910303e53283817fc1`, tree
  `0a646f8162bf608476847ab4041a92caae0af935`, as the child of the original template commit. This successful run
  rechecked the transaction's clean-root, absent-`design`, absent-journal, exact-index, and Git-preservation fences;
  it did not induce a failed transaction to repeat the CLI's separate rollback tests.
- Root `bin/setup` passed in 115.21 seconds. The first unchanged `CI=1 bin/ci` made one current-container boundary
  visible: all non-system gates passed, but seven system tests could not resolve `selenium` because the already-live
  Drawing Board container had started only its original `rails-app` and PostgreSQL services before root relocation.
  Starting the already-declared sibling through relocated `design/script/selenium start` took 121.68 seconds on a
  cold image pull. The unchanged CI then passed in 66.71 seconds internally and 76.81 seconds including wrapper
  cleanup: 60 Rails tests with 247 assertions and seven system tests with 34 assertions. The helper stopped Selenium.
  This required no generated-source patch, custom browser service, or Codespace rebuild, but root adoption does not
  yet have the nested path's one-command `script/application-smoke` orchestration inside the still-running container.
- Root `bin/dev` reached readiness through the ordinary private forwarded URL. A genuine Place form POST returned
  303 and committed exactly one row; a missing-CSRF-token POST returned 422 with state unchanged; the exact forwarded
  Host returned 200 and an altered Host returned 403. After shutdown, the guarded port refresh completed in ten
  seconds with no listener and private visibility.
- In the same Claude session, the agent recovered the Plan's public Place CRUD decision, changed only the Places
  index lede to make that decision visible, and passed safe YAML loading, exact I18n lookup, and the focused scaffold
  integration test at one run and one assertion. The clean commit
  `107b2b338b56b90c6330d565a71fecb8e42430f6`, tree
  `f71f86ac968448c213a19fdfbccd21e5b30f32c4`, retained the root-adoption commit, original history, remote, submitted
  Plan, and GapSet.
- The task-scoped staging token was revoked and then received `401 authentication_required`; credential and transient
  files were removed; Claude reported `loggedIn: false`; Selenium and the Rails listener were absent; port 3000 was
  private; and the exact Codespace reached `Shutdown` after one stop request. No Publication, package release,
  deployment, or application-repository push occurred.

The comparison supported the mode split. At that checkpoint, root adoption preserved one Git history and let one
agent carry the reviewed design into ordinary Rails work without a nested repository or second workspace. It moved
First Draft commands under `design/`, required an immediate inspection and commit, and used the relocated Selenium
helper inside the container that predated the move. The nested path used its dedicated initializer and smoke.
Those observed paths remain historical. Use the current [root-Compile instructions](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/README.md#5-describe-your-app)
and [browser-testing instructions](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/README.md#7-open-your-app).

## Ownership and sequencing

- Service owns Compilation lifecycle and artifact bytes; no Service change is needed for packets 1 or 2.
- That does not remove release coupling: a generated artifact file-set, ignore-rule, or mode change, or a generated
  Ruby/Node/PostgreSQL bump, requires a coordinated Drawing Board update to its `.firstdraft` allowlist, exact-byte
  fixture, container pins, and smoke assertions in the same candidate.
- CLI owns direct mode, output-path validation, polling, artifact verification, exact materialization, and the
  current-root relocation transaction. Drawing Board selects approved root adoption for the internal alpha and must not
  restate or reimplement the root transaction.
- Drawing Board owns its combined Dev Container and nested-repository initialization.
- The authoring Skill teaches the coherent command sequence only after the CLI contract lands; it does not duplicate
  detailed transport or container contracts.
- GitHub authentication and the existing Publication path stay intact.
- Broad Foundation Plan realization gaps and the documentation/website audit are separate work lanes.

Land packet 1 and packet 2 independently after their repository checks and reviews. Complete packet 2.5 and prove
its exact released/pinned tuple before packet 3. The dated nested and root observations above remain separate proof;
changing the guide's preferred mode does not expand either observation to a new candidate or a container rebuild.

## Review questions

1. Does the mode split preserve the no-flag Publication contract while making direct Compilation genuinely
   publication-free?
2. Is Drawing Board the correct owner for nested Git initialization, or should another integration layer own it?
3. Does reusing the generated runtime create any hidden coupling or omit a requirement needed by either authoring
   or generated development?
4. Are the absent-directory and later root-relocation boundaries safe, understandable, and proportional for an
   agent-first pre-alpha workflow?
5. Is the three-packet landing order sufficient to prevent a false end-to-end claim or incompatible candidate
   tuple?
