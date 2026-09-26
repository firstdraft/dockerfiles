# Remaining Codespaces startup avenues

Retained Drawing Board evidence, relocated from `416ed5cbf08b` without a new provider trial.
Current maintenance commands live in [the maintainer guide](../README.md).

Follow-up measurements on September 8, 2026 Central time (September 9 UTC). This extends
[the first prebuild experiment](PREBUILD_EXPERIMENT.md) with browser-attached launches, actual unpublished template
launches, cold binary reads, PostgreSQL readiness, and a published tool-baked image.

Keep the existing workspace image, tool installer, main-branch prebuild, and overlapping editor startup. Across
25 fresh hosted samples, the alternatives did not demonstrate a substantial, repeatable improvement to the usable
template experience. The retained container change makes PostgreSQL's existing five-second health check use TCP.
This fixes an initialization race; it is not a claimed startup speedup.

## Measurement boundaries

All hosted samples use `basicLinux32gb` (2 CPUs, 8 GB RAM) in `EastUs`. Start is the Codespaces API's `created_at`
(one-second resolution); tool readiness is the timestamped `Drawing Board setup complete.` creation-log marker.
Every included sample passed the template runtime smoke twice. Actual Git trees and CLI pins were checked;
unpublished-template samples also had no remote. No agent or First Draft credentials were supplied.

These are small operational comparisons, not randomized statistical trials or startup guarantees. Browser connection,
workspace trust, installed tools, and first model response are distinct endpoints. The API sometimes continued to
report `Queued` while the creation log showed the container already building; API state is not a reliable way to
divide provisioning from build time.

The ordinary template's default branch and prebuild configuration were preserved. A disposable private template
provided matching `baseline`, `prepared`, `optimized`, `baked`, and `waitfor` branches. Changing only that fixture's default
branch allowed testing **Use this template → Open in a codespace** against different source trees. The actual menu
used the default branch even when opened from a different branch's repository page. Ordinary repository Codespaces
created with a branch argument are a separate workflow, not an unpublished-template substitute. See
[GitHub's template workflow](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-from-a-template).

## Browser and unpublished-template comparisons

On unchanged Drawing Board main, one new headless repository launch took 59.611 seconds. Two launches with the
browser attached immediately took 74.391 and 91.573 seconds. A direct-template launch took 84.446 seconds. A
prepared-tool repository launch with the browser attached took 99.876 seconds; a process sample observed Claude's
version process still waiting in `folio_wait_bit_common` after 51 seconds, with little CPU use.

The private fixture supplied a closer comparison of actual unpublished template launches:

| Template setup | Before post-create | Post-create | Total |
|---|---:|---:|---:|
| Original A | 30.077 s | 70.559 s | 100.636 s |
| Original B | 28.713 s | 75.870 s | 104.583 s |
| Tools prepared in prebuild A | 28.429 s | 68.449 s | 96.878 s |
| Tools prepared in prebuild B | 28.920 s | 65.876 s | 94.796 s |

Both pairs use the same fixture, existing image, original five-second PostgreSQL cadence, and default browser
connection behavior. Mean totals were 102.610 versus 95.837 seconds, a 6.773-second difference. Preparing tools
removes npm installation from post-create but leaves substantial first-use file reads. Browser-attached and headless
results must not be mixed to claim a template-specific penalty or a guaranteed installation saving.

## Sequential reads and concurrent warm-up

The optimized prebuild uses the original image, prepared tools, a cleared npm cache, and the compatible one-second
TCP health check. Its observed npm cache was 28 KB, versus approximately 221 MB in the earlier prototype. Codespaces
reported Docker server `24.0.9-2`, API `1.43`, and the expected TCP health configuration. Source/tree were identical
across all read experiments.

The sequential-read variant runs `cat` on the resolved Claude executable into `/dev/null`, then runs unchanged
setup. This explicitly reads all 297,831,432 file bytes, allowing the new VM to cache them; it does not contact
Claude's service. This diagnostic is distinct from the ordinary `claude --version` process, whose complete read
pattern was not traced. The two explicit reads took 26.616 and 23.747 seconds.

Installing and verifying the executable in an image or prebuild saves that installation work. It does not preserve
the builder's warm filesystem cache in the new VM's RAM. GitHub describes restoring the saved container onto a
[fresh virtual machine](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds).
The observed first-use delay survived both prebuild preparation and image baking. Reading the entire file at
Codespace startup moved the wait earlier without reducing total readiness time.

The concurrent variant starts the three CLIs' version checks together, waits for all to succeed, then runs unchanged
setup. It therefore adds one warm version-check pass relative to the sequential control; this measures concurrent
prewarming plus normal setup, not a pure reordering of equal work. Each mode still performs the original pin checks
and completes all user configuration before its final readiness marker.

| Mode | Post-create A | Post-create B | Mean post-create | Mean total |
|---|---:|---:|---:|---:|
| Ordinary setup | 30.678 s | 27.799 s | 29.239 s | 55.008 s |
| Sequential whole-file read, then setup | 31.796 s | 29.346 s | 30.571 s | 55.243 s |
| Concurrent version warm-up, then setup | 31.101 s | 27.284 s | 29.193 s | 52.794 s |

Concurrent warm-up did not reduce the setup phase. Its lower total came from a shorter provisioning/container phase
in one sample, before the experiment command ran. Neither warm-up approach justifies extra startup machinery.

## Published tool-baked image

The candidate extends the exact existing workspace image; it does not rebuild or re-resolve Features. All 25 existing
amd64 layer descriptors remain identical. Its added layers total **216,618,216 compressed bytes**, making the total
1,330,274,135 bytes versus 1,113,655,919 for the existing image.

- Image source: [`1c34b62c`](https://github.com/firstdraft/drawing-board/commit/1c34b62cbea9240c7d15dddcc0fc2cde2a0b6287).
- [Candidate build and image verification](https://github.com/firstdraft/drawing-board/actions/runs/34300291665) passed.
- Experimental index: `sha256:39999b32dfc1e02f67044b875bf03ffb2efc4066cb46418657516e50bba5ba4d` in
  `ghcr.io/firstdraft/drawing-board-workspace`.
- Runtime control: [`85d916c2`](https://github.com/firstdraft/drawing-board/commit/85d916c2d903018e7c64152dba48e2798ec07d74),
  tree `c6e5ba4b2b272c2410c7988be3265fbf3ef989e1`.
- Baked runtime differs only in the image digest:
  [`bfcc8947`](https://github.com/firstdraft/drawing-board/commit/bfcc894756dad5eb2c82869ad6e3df8eecbf744a),
  tree `290dc0e5e13d19a951731df867070a7d78df026f`.

Both runtimes prepare or reuse matching tools before post-create, clear npm's preparation cache, and use the same
TCP PostgreSQL health check. The baked image places tools and Skill source under unmounted `~/.local`; its temporary
npm build cache is removed in the same image layer. No stable image tag or production image receipt was changed.
The baked runtime is an experimental consumer, not a qualified production receipt; production receipt checks were
not weakened to admit it.

An anonymous request reproduced the exact published index. Separate network-disabled runs of both published
platform digests verified Claude `2.1.226`, Codex `0.147.0`, First Draft CLI `0.2.2`, and Skill
`8ae02160b44b40d21ec432cf2d1ab2772f9aae6b`. The amd64 offline check used local emulation; hosted Codespaces supplied
native amd64 CLI/runtime smoke. The workflow's existing image smoke checks Features, SSH, and PostgreSQL rather
than CLI payloads, so the separate offline checks are required evidence for this experiment.

| Cold sample, no prebuild | Before post-create | Post-create | Total |
|---|---:|---:|---:|
| Existing image A | 211.568 s | 0.856 s | 212.424 s |
| Existing image B | 219.865 s | 0.821 s | 220.686 s |
| Baked image A | 265.172 s | 0.803 s | 265.975 s |
| Baked image B | 272.592 s | 0.789 s | 273.381 s |

Mean cold creation was **216.555 seconds with the existing image, 269.678 seconds with the baked image**: 53.123
seconds slower. Container creation through the start of `onCreateCommand` grew from 168.369/174.898 seconds to
246.886/253.317 seconds. Baking reduced the following preparation phase from roughly 28–29 seconds to three,
but did not compensate for that earlier growth. These measurements combine image transfer, extraction, and other
container work; they do not isolate network throughput. They do not support adopting this larger image for cold
creation.

Prebuilt repository launches took 57.851 and 52.642 seconds with the baked image: a mean of 55.247 seconds,
essentially identical to the existing-image sequential controls' 55.008 seconds. In actual unpublished-template
launches, the baked image took 90.254 seconds and the matched optimized existing image took 81.146 seconds.
That last comparison has only one sample per variant; it supplies no evidence of a win, not a reliable penalty
estimate. Image baking adds publication work to each tool/Skill pin change without a demonstrated startup benefit.

## Waiting for setup before connecting the editor

The [`waitfor` variant](https://github.com/firstdraft/drawing-board/commit/911cea7eabffc85d81772e40fab66cabf6f5b8c1)
differs from original main only by `"waitFor": "postCreateCommand"`, with tree
`c95b53f53094465ad24e94c316a5209f8d3cca96`. This delays editor connection until tool setup finishes; the
[Dev Container specification](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainerjson-reference.md)
defaults to waiting for `updateContentCommand`, allowing post-create work to overlap the editor.

| Actual template launch | Before post-create | Post-create | Tool-ready marker | Editor observation |
|---|---:|---:|---:|---|
| Wait for setup A | 29.470 s | 36.145 s | 65.615 s | Trust prompt visible by 97.823 s |
| Wait for setup B | 39.481 s | 35.635 s | 75.116 s | Files visible at 95.828 s; trust prompt by 98.386 s |

Tools finished earlier than in the original template samples, but the editor still had to connect afterward.
In A, the last observation without the trust prompt was at 77.796 seconds; the later observation is an upper
bound, not an exact readiness measurement. In B, the trust prompt appeared between 95.828 and 98.386 seconds.
Manual time spent accepting trust is excluded. The ordinary overlapping baseline already showed the trust prompt
before its 100.636/104.583-second tool-ready markers. Comparing only the earlier setup markers would overstate the
benefit. Keep the existing overlap: these observations do not establish a large end-to-end improvement.

## PostgreSQL readiness

The original `pg_isready -U postgres` can succeed against the entrypoint's temporary Unix-socket-only server before
initialization finishes. A local eight-second initialization script made it report healthy about four seconds before
TCP was available. Checking `pg_isready -h 127.0.0.1 -U postgres` instead waits for the final server.

A startup-only one-second polling interval passed on local Docker 29 but failed in a hosted prebuild with
`can't set healthcheck.start_interval as feature require Docker Engine v25 or later`. The compatible experiment
therefore uses `interval: 1s`, `timeout: 5s`, and `retries: 25`, without `start_interval`. It preserves approximately
the original retry window for prompt failures, not an identical worst-case timeout. Docker documents these settings
in its [healthcheck reference](https://docs.docker.com/reference/compose-file/services/#healthcheck).

Local fresh and restarted containers became healthy in 1.1–1.2 seconds, versus about 5.1 seconds for the original
cadence. With delayed initialization, TCP appeared at 8.881 seconds and health succeeded at 9.570 seconds. The
compatible option keeps polling every second after startup. Over one 60.05-second idle test, it ran 56 checks and
used 1.880 container CPU-seconds, versus 11 checks and 0.427 CPU-seconds for five-second polling: approximately
0.024 additional CPU cores. This is one local arm64 observation and excludes some Docker daemon/containerd overhead.

Retain only the TCP correction with the original `interval: 5s`, `timeout: 5s`, and `retries: 5`. The four-second
local saving does not justify sustained faster polling, and the hosted Docker version cannot use the startup-only
alternative. Both the ordinary TCP check and delayed-initialization behavior were exercised locally; the final PR's
existing hosted container smoke validates the retained configuration.

## Smaller upstream image

Inspection and package-removal simulation identified approximately **148 MB of compressed selected content** in
Rust compiler packages and Node/npm download caches. This is an opportunity estimate, not an observed rebuilt-image
reduction or a Codespaces speedup.

The [Rails Ruby Feature](https://github.com/rails/devcontainer/blob/2a4baafe0236449bfc75c63ea07b96acd59b6ee7/features/src/ruby/install.sh)
installs Rust even with the precompiled Ruby path selected. Removing exactly `rustc`, `libstd-rust-dev`, and
`libstd-rust-1.85` in simulations preserved other packages on both inspected architectures. Their selected amd64
files compressed to 94.6 MB; Node and root npm caches contributed approximately 31.5 and 21.9 MB. Future source
builds of Ruby/YJIT or Rust-based gems would need Rust installed explicitly.

Keep LLVM: removing it also removed FFmpeg, Mesa and related runtime libraries in the simulation. Keep the ordinary
C toolchain, Ruby headers and native-gem support. Ruby documentation occupied considerable disk space but compressed
to only 2.7 MB. Repeated upstream Git/common-utils layers totaled another 83 MB, but also carry package/version
changes; those entire layers are not proven removable.

Useful size reductions must happen in the producing image/Feature layer. Deleting inherited files in another
Drawing Board `RUN` only hides them; the original bytes are still transferred. See
[Docker's build guidance](https://docs.docker.com/build/building/best-practices/). A narrower upstream change is
preferable to replacing the Rails image or removing development capabilities merely to reduce `du` output.

## Evidence and retained scope

The 25 completed samples are grouped below. Every sample passed `script/devcontainer-smoke` twice, including exact
Claude, Codex, First Draft CLI, and Skill checks. The nine unpublished-template samples also verified the expected
source tree and absence of remotes; their new initial commits correctly differ from the template's commit.

| Sample labels | Count | Source variant |
|---|---:|---|
| `api-control-a`, `browser-live-a/b`, `template-control-a`, `fixture-template-baseline-a/b` | 6 | Original main `69020938` |
| `browser-prepared-a`, `fixture-template-prepared-a/b` | 3 | Prepared tools `12c667b9` |
| `cold-prepared-a/b`, `read-seq-a/b`, `read-stream-a/b`, `read-par-a/b`, `fixture-template-optimized-a` | 9 | Optimized existing image `85d916c2` |
| `cold-baked-a/b`, `baked-prebuilt-a/b`, `fixture-template-baked-a` | 5 | Baked image `bfcc8947` |
| `fixture-template-waitfor-a/b` | 2 | Editor wait `911cea7e` |

Raw creation logs, smoke outputs, API timestamps, verified-tree inventories, browser observations, prebuild logs,
image manifests, offline checks, and local PostgreSQL/image-audit evidence are retained under
`tmp/startup-round2/` in the isolated `drawing-board-startup-round2-20260908` experiment checkout. That ignored local
directory is evidence for these measurements, not a dependency of the template. The experimental public branches
and candidate image digest remain available for source reproduction; they are not production recommendations.

All 25 test Codespaces and all temporary prebuild configurations were removed. The disposable private fixture
repository was archived after its prebuild configurations were removed; deletion required additional GitHub
authentication. The original template's main prebuild configuration and pre-existing Codespaces were preserved.

Keep the direct-template onboarding and early private-repository checkpoint established in the first investigation.
Retain the TCP readiness correction and this report. Do not adopt the prepared-tool split, baked image, read-ahead,
concurrent warm-up, faster steady-state polling, or editor wait. Tool/Skill pins, image receipt, installation behavior,
and CI configuration remain unchanged. The setup banner uses the same publication terms as the guide.
No live Compilation, model response, or generated-application qualification
was part of this round. A rebuilt upstream image that omits unnecessary Rust/cache content remains an unmeasured
opportunity; this report does not claim that Codespaces has reached a universal speed limit.
## Codex command sandbox — September 13, 2026

An assisted student trial used template `557921f0debc3d9c1d6178f31aeb867740f571dd` in Codespace
`cuddly-enigma-v6g9wg4g5fw5w6`, with two cores, 8 GB, East US, and a GitHub-reported prebuild. Installed Codex was
`0.154.0`, CLI `0.2.2`, and both Skills resolved to `e84a6ecddfa6a4170774768f24ddc798c0f13331`.
Plain `codex` failed even the shell command `pwd` with:

```text
bwrap: No permissions to create new namespace
```

Repeated individual command approvals interrupted the workflow. After the user approved using the Codespace as
the sandbox, the same conversation resumed with:

```sh
codex --sandbox danger-full-access --ask-for-approval on-request resume
```

Plan authoring, root Compile, private VS Code publication, generated setup/CI, web and local Android previews,
and a normal source edit then passed. The same conversation resumed after stopping and restarting the Codespace.
It ended in `Shutdown`. The private [trial repository](https://github.com/raghubetina/fd-student-android-20260913)
retains baseline `88779d43c70e45615f778d415b951a30d8e3c6ed` and source edit
`c0e7b8da511a85b2b4d6c266be4257400750b2af`. First Draft authentication was reused; this was not an unaided student.

This failure happens before the command can run, including commands needing no network, so granting network
access alone would not address it. Changing container privileges/seccomp to enable nested namespaces was not
tested. The chosen supported Codex setting uses the existing Codespace VM boundary and leaves the local
devcontainer policy intact. It allows ordinary commands without per-command prompts, including after root Compile;
the agent's on-request and conversation instructions are not a technical approval fence.

The follow-up initializes a missing config after the Codex home volume is mounted. Existing settings, including
dotfile symlinks, are preserved. Source checks cover those cases. The pinned binary smoke checks loaded full access
and request instructions against a `never` control. These configuration checks are separate from the complete
student workflow above, which selected the same policy through explicit CLI flags.
