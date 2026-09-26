# Drawing Board startup investigation

Retained Drawing Board evidence, relocated from `416ed5cbf08b` without a new provider trial.
Current maintenance commands live in [the maintainer guide](../README.md).

Investigated September 7–8, 2026, including September 9 UTC, from Drawing Board main
`69020938f08cc9731c84701646f9d1847643b8e7`, tree `f5346596a628d8ad32bcfd3a060040cd4f646a47`.

Use the template's existing prebuild through **Use this template → Open in a codespace**, then publish the useful
compiled baseline to the user's private repository from VS Code or the Codespaces publication API. Keep tool and
Skill pins independent of image publication. The first local tool-baking experiments were withdrawn. The
[later follow-up](STARTUP_FOLLOWUP.md) tested a published successor, cold reads, browser attachment, and database
readiness. The retained container correction checks PostgreSQL over TCP; installation, versions, image receipt,
and CI remain unchanged.

The [follow-up hosted comparison](PREBUILD_EXPERIMENT.md) tested tool preparation during a real prebuild. Two
prepared launches averaged **55.7 seconds**, versus **60.3 seconds** for two existing-prebuild baselines. A fresh
direct-template launch also passed at **84.9 seconds**, illustrating timing variation. The roughly five-second
measured saving does not justify the extra setup paths. The important optimization is using the existing template
prebuild; moving tool installation into it did not remove the first-use filesystem wait.

## Actual startup costs

The existing image already includes Ruby, Node, GitHub CLI, PostgreSQL client, Active Storage dependencies, SSH,
and Docker tooling. PostgreSQL starts with the workspace; Selenium is already deferred until browser tests.
Post-create setup installs three pinned npm CLIs and shallow-fetches the pinned Skill when its cache is empty.

| Observation | Before agent setup | Agent setup | Boundary |
|---|---:|---:|---|
| [Current-main CI, September 6](https://github.com/firstdraft/drawing-board/actions/runs/34003314237) | 92.3 s | 6.6 s | Dev Container command start through setup complete; not Codespaces |
| Local existing image, September 7 | excluded | 10.153 s | Setup only, cached image on Apple Silicon |
| Direct-template prebuild, September 8 UTC | 27.6 s | 60.5 s | Fresh hosted creation through setup complete; 88.1 s total |

The hosted prebuild run was `studious-funicular-www7pwp4w354wj`, created through the actual template menu at
01:29:10 UTC, using `basicLinux32gb` in `EastUs`. The API returned `prebuild: true`. Its source tree exactly matched
current main; GitHub initialized a new local commit `7189d380bd7d80eaf2f52a039ca89fd0c3c505bd` with no remote.
The creation log retained the earlier prebuild phase and showed the new workspace reusing its containers with
`up -d --no-recreate`.

The API was first observed Available at 01:29:39 UTC, but this was not tool readiness. `postCreateCommand` ran
from 01:29:37.633 to the setup-complete marker at 01:30:38.100. npm reported 43 seconds. An SSH probe during that
interval correctly found tools not yet installed. The web editor connected and presented its workspace-trust
prompt; the setup log finished before that prompt was accepted, so the trust pause did not cause the install time.
Installation diagnostics and the full template runtime smoke passed afterward. From the menu click at
01:29:08.824 to setup completion was 89.3 seconds.

The prior September 2 root-adoption Codespace first showed Available after 222 seconds, plus an eight-second SSH
probe. Its [dated receipt](DIRECT_COMPILATION_PLAN.md#observed-current-root-qualification-on-2026-09-02) used an earlier
revision and does not isolate setup time. These initial observations are not a matched cold/prebuilt benchmark or
a guaranteed time saving. The follow-up report separates comparable samples, a cold candidate, and direct-template
observations. Tool installation is more variable than the initial local sample suggested.

Anonymous registry metadata showed 1,113,655,919 compressed layer bytes for the existing Drawing Board amd64 image,
versus 659,600,910 for the representative Rails image. Transfer size is a cost input, not elapsed-time proof.

## Prebuild configuration and iteration

The template already had a successful [prebuild for current main](https://github.com/firstdraft/drawing-board/actions/runs/34003313712).
Its repository settings were inspected directly: `main`, `.devcontainer/devcontainer.json`, **Every push**, all five
regions, two retained versions, maintainer failure notifications, and **Disable prebuild optimization** unchecked.
The main configuration was left unchanged. The follow-up experiment added and then deleted a temporary one-region
configuration for its branch. Fresh launches prove the template route can use the main configuration.

GitHub scopes prebuilds to a repository, branch, devcontainer configuration, and region. A repository generated from
a template does not inherit its prebuild configuration. Direct-template launch therefore makes the existing
prebuild useful to the primary onboarding path. Prebuilds run `onCreateCommand` and `updateContentCommand`, and
exclude `postCreateCommand`. See [GitHub's prebuild documentation](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds)
and [configuration semantics](https://docs.github.com/en/codespaces/prebuilding-your-codespaces/configuring-prebuilds).

Keeping setup in post-create allows a tool or Skill update without an image build, publication, digest change, or
image receipt. It reads the pins in the checked-out source. The follow-up experiment found that an older prebuild
could restore the older **source revision** too; post-create does not guarantee the latest remote pins. Keep
**Every push** and verify the actual tree after an exact-revision prebuild succeeds when qualifying new pins.
The existing optimization setting allows reuse while a new prebuild runs. Configuration-only or scheduled triggers
reduce Actions work at the cost of freshness; no trigger change was made. Region/retention reductions remain
audience and storage-cost decisions.

Preparing tools during the prebuild was implemented and tested, then withdrawn after the hosted comparison.
It preserved image independence and passed normal runtime checks, but yielded only a small measured improvement.
The retained [experiment](PREBUILD_EXPERIMENT.md) includes the prototype revision, prebuild run, volume behavior,
first-use I/O observations, and fallback tests. The original installer still serves repository-first creation too.

## Rails comparison and rejected image experiment

The shared Rails image owner is [firstdraft/project-syncing](https://github.com/firstdraft/project-syncing/tree/6e49f2bee75ad5ac752ca75e97b5ebf92a4849f2).
Its Rails 8 phase-one Dockerfile installs the toolchain and a superset Gemfile bundle before publication.

| Representative repository and exact revision | Work after image startup |
|---|---|
| [photogram-capstone](https://github.com/appdev-projects/photogram-capstone/blob/602fe8d71e90f5cf7135b22081f8df7f876f345e/.devcontainer/devcontainer.json) | Bundle check/install fallback, database prep, browser downloads, formatter gems |
| [link-in-bio-4-validations](https://github.com/appdev-projects/link-in-bio-4-validations/blob/90e20cced7a9f76e8d15966c81d14032ff658bba/.devcontainer/devcontainer.json) | Same pattern |
| [ai-chat-2](https://github.com/appdev-projects/ai-chat-2/blob/ea223dede5ca8dbf3fca70f22996f9f17ea3c742/.devcontainer/devcontainer.json) | No post-create command |

These setups support baking stable shared dependencies, but do not establish uniformly network-free Rails startup
or a controlled timing comparison. Drawing Board keeps its existing immutable, public, multi-platform image.

The local baking experiment made agent setup sub-second with networking disabled, but added about 230 MB of
compressed arm64 image layers. About 209 MB was the expected native Claude/Codex payload; no other-platform payload
or package-manager cache explained it. It also coupled every CLI or Skill pin update to image publication and
qualification. That iteration cost and additional image transfer did not justify adoption. Neither candidate image
was published. No image-source receipt bypass or extra image-build machinery remains in the final change.

Generated-app gems and JavaScript packages still install after Compile, when the actual application's dependencies
are known. Selenium stays on demand. No Compiler, CLI package, Skill pin, or service change was needed for the
startup experiments.

## Onboarding verification

The README now selects direct-template creation and places **Save your app to GitHub** immediately after Compile,
before application setup or feature work. VS Code showed **Publish to GitHub** for the tested no-remote workspace.
Publishing inside VS Code adds a remote and pushes the commits; the separate Codespaces-list publication flow
leaves the existing Codespace unlinked. The primary route creates a personally owned repository; repository-first
creation remains documented for organization ownership. See [GitHub's template workflow](https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-from-a-template)
and [VS Code publishing](https://code.visualstudio.com/docs/sourcecontrol/repos-remotes#publish-to-github).

The exact npm CLI `0.2.2` matches source tag `799a184cb2453ceadf5575f7b46ba975e084f192`. On Node 24.18.0, 103
upstream init/push/status/compile/root-output tests passed against that package. A separate no-remote fixture ran
init, push, status, root Compile, relocated status, and baseline commit; Git history/config, staged artifact
bytes/modes, and ignored private state were preserved. This used a loopback service and synthetic artifact, not
live Compilation. No origin-dependent CLI or Skill change was necessary.

The hosted template smoke verified Claude `2.1.226`, Codex `0.147.0`, CLI `0.2.2`, Skill
`8ae02160b44b40d21ec432cf2d1ab2772f9aae6b`, both Skill links and Codex discovery, Ruby `4.0.5`, Node `24.18.0`,
PostgreSQL `18.6`, wrapper PATH, SSH policy, and Selenium remaining stopped. No First Draft or agent credentials
were supplied. The complete live Compile → VS Code private publication journey remains unobserved in this audit;
installation, local no-remote CLI behavior, and documented publishing semantics are separate evidence.

Normal `script/check`, including the strict image receipt and depth-one checkout regression, passed. Independent
review found no material documentation issues in the initial guide change. Temporary Codespaces were deleted after
verification; pre-existing user Codespaces were preserved.

Logs and fixtures remain in the task checkout's ignored `tmp/startup-evidence/` and `tmp/references/cli-no-remote/`.

## Publication credentials

On September 8 at 23:38 UTC, the fresh direct-template Codespace `fuzzy-tribble-jxx5vxw7j3q4qx` successfully created
a private repository through `POST /user/codespaces/{codespace_name}/publish`, using only its built-in `GITHUB_TOKEN`.
It used the same template tree recorded above and reported `prebuild: true`. The probes ran in the normal VS Code
terminal with an empty, isolated `GH_CONFIG_DIR` and competing token variables unset. Noninteractive Codespaces SSH
did not receive `GITHUB_TOKEN` or `CODESPACE_NAME`, so its presence-only guard stopped before a mutation; it was used
only to transfer scripts and non-secret receipts afterward.

| Route | Observed result |
|---|---|
| `gh repo create OWNER/REPO --private` with GitHub CLI 2.98.0 | GraphQL rejected `CreateRepository` for insufficient permissions |
| `POST /user/repos`, `private: true` | HTTP 403, `Resource not accessible by integration` |
| `POST /user/codespaces/{codespace_name}/publish`, `name` and `private: true` | Created private repository `1362007861` and associated this Codespace with it |

The repository remained empty and local Git still had no remote after API publication. An isolated Git fixture then
added the repository as `origin` and pushed two README-only commits, without workflows or application source. Git's
credential helper was `gh auth git-credential`, with the same isolated CLI configuration and built-in token as its
only credential. The initial push and subsequent ordinary `git push` succeeded. A separate host-side read verified
the private repository, its sole README, and final commit `a14f051c765499ae990e97c496c57e1ee5c2bed9`.

This is the supported API for creating a repository and granting the Codespace write access in one operation;
see [GitHub's endpoint contract](https://docs.github.com/en/rest/codespaces/codespaces#create-a-repository-from-an-unpublished-codespace)
and [token access behavior](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-repository-access-for-your-codespaces).
The [terminal recipe](https://github.com/firstdraft/drawing-board/blob/416ed5cbf08b0248f5a43cbe2bfe84c1a730c813/CONTRIBUTING.md#publish-from-the-codespace-terminal) therefore uses this route and explicitly
adds the local remote and pushes afterward. General repository-creation permissions are not required for this path.

No First Draft credential was supplied. Current Service source at `9f3cdcd9a5966b6d839d6985f398cf8d79f3f1ef` does have
a private-repository client, but its public Publication API starts a Compilation and publishes a fresh server-built
artifact, rather than saving the existing Codespace's Git history. No new Service endpoint or credential handoff is
needed for the tested Codespaces route. This fixture does not replace the pending complete live journey from root
Compile through publication. Non-secret scripts and logs are retained under ignored `tmp/token-publication-probe/`.
The disposable Codespace was deleted after those receipts were saved. The private test repository
`raghubetina/drawing-board-token-probe-20260908-233239` remains available with its two README-only commits.
