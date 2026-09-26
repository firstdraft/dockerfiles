# Tool preparation in Codespaces prebuilds

Retained Drawing Board evidence, relocated from `416ed5cbf08b` without a new provider trial.
Current maintenance commands live in [the maintainer guide](../README.md).

Measured September 8, 2026 Central time (September 9 UTC). This records the first hosted prebuild comparison;
the [second round](STARTUP_FOLLOWUP.md) tests the remaining avenues and owns the later recommendation.
Keep the existing template prebuild and installer.
Moving tools into the prebuild saved **4.6 seconds, about 7.7%**, across two comparable launches per variant. That
small sample does not establish a reliable five-second improvement, and does not justify maintaining the extra
installation paths. No container, image, pin, or CI change was retained from this first experiment.

## What was tested

- Baseline: Drawing Board [`69020938`](https://github.com/firstdraft/drawing-board/tree/69020938f08cc9731c84701646f9d1847643b8e7),
  tree `f5346596a628d8ad32bcfd3a060040cd4f646a47`, with the existing main prebuild.
- Prototype: [`12c667b9`](https://github.com/firstdraft/drawing-board/commit/12c667b9cb36629dd2c8b76b7deb39f2eaf0f387),
  tree `ed4add77c68816a05f835bf2b6d22a257e2d17a9`, retained on
  `codex/codespaces-prebuild-prototype-20260908` for inspection.
- Same image: `ghcr.io/firstdraft/drawing-board-workspace@sha256:06602be5cc829d5142c12b06c505dbf8353a3ade6751ca4bf01a785ea2c3e6e3`.
- Same pins: Claude Code `2.1.226`, Codex `0.147.0`, First Draft CLI `0.2.2`, Skill
  `8ae02160b44b40d21ec432cf2d1ab2772f9aae6b`, Ruby `4.0.5`, Node `24.18.0`, PostgreSQL `18`.
- Every sample used `basicLinux32gb` (2 CPUs, 8 GB RAM) in `EastUs`. No agent or First Draft credentials were supplied.

The prototype split installation into `.devcontainer/prepare-agents`, called by `updateContentCommand`. It installed
the exact npm pins under `~/.local` and fetched the exact Skill under `~/.local/share/firstdraft/skills/<SHA>`, outside
the mounted cache and agent configuration directories. Post-create configured the user environment and Skill links,
reusing matching tools or installing missing/mismatched pins. Both phases executed CLI version checks.

This follows GitHub's documented boundary: prebuilds include `onCreateCommand` and `updateContentCommand`, take a
snapshot, then run remaining lifecycle commands after restoring it on a fresh VM. `postCreateCommand` is excluded
from prebuild creation. See [GitHub's prebuild documentation](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds).

## Hosted timings

Start is the Codespaces API `created_at`; finish is the timestamped `Drawing Board setup complete.` marker in the
creation log. The API's start timestamp has one-second resolution. “Before setup” includes provisioning and
container work; “Setup” is post-create. The endpoint is installed tools, not browser-editor readiness, sign-in,
first model response, or Compilation. Every included launch passed `script/devcontainer-smoke` after setup.

| Sample | Prebuild | Created UTC | Before setup | Setup | Total |
|---|---|---|---:|---:|---:|
| Baseline A | yes | 00:30:26 | 24.588 s | 35.784 s | 60.372 s |
| Baseline B | yes | 00:34:14 | 24.314 s | 35.923 s | 60.237 s |
| Prepared A | yes | 00:49:22 | 25.958 s | 28.500 s | 54.458 s |
| Prepared B | yes | 00:50:52 | 27.276 s | 29.598 s | 56.874 s |
| Prepared, no prebuild | no | 00:37:43 | 236.388 s | 1.468 s | 237.856 s |
| Direct template, baseline | yes | 01:05:45 | 22.724 s | 62.177 s | 84.901 s |

The first four launches used the repository Codespaces API with the corresponding branch. Baseline mean was
60.3045 seconds; prepared mean was 55.666 seconds. Baselines ran before the prepared pair because its prebuild
needed to finish first; this was not a randomized trial. npm reported 29 seconds in each baseline. Prepared
post-create did no npm installation, yet still took 28–30 seconds.

The no-prebuild sample used the same prototype. About 204 seconds elapsed before `onCreateCommand`; tool preparation
then took 29.477 seconds in `updateContentCommand`, including npm's reported 25 seconds. Its 237.856-second total
supports the value of a ready prebuild, but is one cold observation, not a matched cold baseline for unmodified main.

The last sample used the actual **Use this template → Open in a codespace** UI on main. npm reported 41 seconds.
GitHub created parentless commit `3d3bdb4f6131b06a942c8eb126ebbeee39607a59`, with the exact baseline tree and no
remotes. Smoke passed twice. From the menu click at 01:05:43.588 UTC to setup completion was 86.313 seconds.
Together with the [earlier 88.1-second template observation](STARTUP_INVESTIGATION.md#actual-startup-costs), this
shows why neither the initial ten-second local install nor the paired one-minute hosted launches is a startup SLA.

## Why moving installation did not remove its whole cost

A separate diagnostic launch of the prepared snapshot completed in 56.055 seconds. A read-only process sampler
observed Claude's first `--version` invocation waiting on file reads:

| Observation | First sample | Last waiting sample |
|---|---|---|
| UTC | 01:02:06.939 | 01:02:20.471 |
| Process elapsed time | 5 s | 19 s |
| Process state | `Dl+` | `Dl+` |
| Wait channel | `folio_wait_bit_common` | `folio_wait_bit_common` |
| `/proc/PID/io` `read_bytes` | 28,246,016 | 207,503,360 |
| Displayed CPU time | 00:00:00 | 00:00:00 |

Claude finished at about 20 seconds elapsed. Codex subsequently showed a smaller similar file-read wait. These
observations support cold filesystem reads after snapshot restore as the remaining delay; they do not establish
GitHub's internal storage implementation. No hidden installer was observed. Removing version checks would leave
the first CLI launch unmeasured, shifting that wait to the user rather than demonstrating faster tool readiness.

The earlier [local image-baking experiment](STARTUP_INVESTIGATION.md#rails-comparison-and-rejected-image-experiment)
reduced setup from 10.153 to 0.655 seconds, including an offline run, but added roughly 230 MB of compressed arm64
layers and coupled pin changes to image publication. No new baked image was published or benchmarked in hosted
Codespaces in this first round. The [second round](STARTUP_FOLLOWUP.md#published-tool-baked-image) subsequently
published and measured an image that extends the immutable base. These first-round results alone do not prove
that a different image cannot improve startup.

## Freshness and mounted volumes

The existing prebuild can carry an older source checkout. After pushing diagnostic commit
`3d8c5b5811a452ef06ea0885620be6de15bf4f88` to the test branch, a new `prebuild: true` Codespace actually checked out
`12c667b9cb36629dd2c8b76b7deb39f2eaf0f387`; its files and tree lacked the diagnostic change. The new prebuild was
unavailable. Thus post-create reconciles pins from the checked-out source, not necessarily the latest remote head.
For new-pin qualification, wait for a successful prebuild of the intended revision and inspect the actual tree.
Do not add automatic Git pulls to unpublished template workspaces, which start without an `origin`.

The prototype's hosted prebuilds retained approximately 585 MB of global npm modules, 2 MB of Skill source, and
221 MB of npm cache. Mounted agent/cache directories had usable ownership; normal hosted smoke passed. Separately,
restoring the local prototype with fresh mounted home volumes but skipping `onCreateCommand`'s ownership repair
failed when `.claude` was root-owned. Offline fresh-volume tests passed only after that repair. This is a limitation
of the experimental setup, not an observed failure of the current main Codespace. It would need resolution before
adopting the split for that reconstruction path.

Local checks also passed: source contracts, full devcontainer lifecycle, repeated runtime smoke, two offline
post-create runs after ownership repair (0.601 and 0.552 seconds), missing-CLI recovery (8.836 seconds), and stale
CLI `0.2.1` recovery to pinned `0.2.2` (8.001 seconds). Hosted smoke verified all three CLI versions, both Skill links
and the pinned SHA, wrapper resolution, Ruby/Node/PostgreSQL, SSH policy, and Selenium remaining stopped.

## Prebuild refresh and retained evidence

The [prototype prebuild](https://github.com/firstdraft/drawing-board/actions/runs/34295552132) passed for `12c667b9`;
its job took 15 minutes 11 seconds. Tool preparation itself took about 10.2 seconds, including npm's reported eight
seconds. The existing [main prebuild](https://github.com/firstdraft/drawing-board/actions/runs/34003313712) had taken
19 minutes 32 seconds. These were different runs with different region coverage, not a prebuild-build-speed
comparison. Refresh latency matters when iterating on pins even though users can start from an older snapshot.
The [prototype CI run](https://github.com/firstdraft/drawing-board/actions/runs/34295932348) also passed.

Main's configuration was preserved: **Every push**, all five regions, two retained versions, failure notifications,
and prebuild optimization enabled. The experiment temporarily used one region and one retained version. That
configuration and all experiment Codespaces were deleted; the prototype branch and measurements remain. No image
publication, main merge, new user repository, or live Compile was performed in this follow-up.

Raw non-secret metadata, creation logs, smoke logs, and process samples are retained in the task worktree's ignored
`tmp/prebuild-test/`. The sample identities are:

| Sample | Codespace |
|---|---|
| Baseline A | `fd-startup-baseline-0908-a-vxxv9x4r5cxqxg` |
| Baseline B | `fd-startup-baseline-0908-b-www7pw6992pw5` |
| Prepared A | `fd-startup-candidate-0908-a-xjjw7j6p6269w6` |
| Prepared B | `fd-startup-candidate-0908-b-7gg96g64pcxv5g` |
| Prepared, no prebuild | `fd-startup-candidate-0908-cold-g4w9qrqvc55g` |
| Direct template | `effective-rotary-phone-pxxr4xvggc6qxp` |
| File-read diagnostic | `fd-startup-process-0908-g45j6597rhvq66` |
| Older-source diagnostic | `fd-startup-trace-ready-0908-6jjgqjqjjcxrgw` |
