import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repository = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const configuration = JSON.parse(readFileSync(path.join(repository, ".devcontainer/devcontainer.json"), "utf8"));
const versions = readFileSync(path.join(repository, ".devcontainer/agent-versions.env"), "utf8");
const pins = Object.fromEntries([...versions.matchAll(/^([A-Z_]+)=(.+)$/gm)].map((match) => match.slice(1)));
assert(!("CLAUDE_CODE_VERSION" in pins), "Claude uses the no-argument native bootstrap's latest default; a temporary regression pin or frozen experiment must update this check and its qualification receipt");
assert.equal(pins.CODEX_VERSION, "latest", "CODEX_VERSION: normal policy is latest; a temporary regression pin or frozen experiment must update this check and its qualification receipt");
const temporary = realpathSync(mkdtempSync(path.join(tmpdir(), "drawing-board-agent-setup-")));
const home = path.join(temporary, "home");
const workspace = path.join(temporary, "workspace");
const stubs = path.join(temporary, "stubs");
const local = (value) => {
  assert(value.startsWith("/home/vscode/"), "Agent paths must remain in the devcontainer user's home");
  return path.join(home, value.slice("/home/vscode/".length));
};
const environment = {
  HOME: home,
  PATH: `${stubs}:/usr/bin:/bin`,
  TMPDIR: path.join(temporary, "tmp"),
  CODESPACES: "true",
  CLAUDE_CONFIG_DIR: local(configuration.containerEnv.CLAUDE_CONFIG_DIR),
  CODEX_HOME: local(configuration.containerEnv.CODEX_HOME),
  NPM_CONFIG_CACHE: local(configuration.containerEnv.NPM_CONFIG_CACHE),
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_ALLOW_PROTOCOL: "",
  GIT_TERMINAL_PROMPT: "0",
  SETUP_TEST_REGISTRY: path.join(temporary, "registry.json"),
  SETUP_TEST_INSTALLS: path.join(temporary, "installs.jsonl"),
  SETUP_TEST_NATIVE_INSTALLER: path.join(stubs, "native-install.mjs"),
};
const run = (command, args, cwd = workspace) => {
  const result = spawnSync(command, args, { cwd, env: environment, encoding: "utf8", timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
};
const write = (file, content, mode = 0o600) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, { mode });
};

try {
  assert(!("DISABLE_AUTOUPDATER" in configuration.containerEnv), "Drawing Board must allow normal Claude updates");
  for (const key of ["CLAUDE_CONFIG_DIR", "CODEX_HOME"]) {
    assert(configuration.mounts.some((mount) => mount.split(",").includes(`target=${configuration.containerEnv[key]}`)),
      `${key} must use a mounted configuration directory`);
  }
  assert(!("NPM_CONFIG_PREFIX" in configuration.containerEnv), "A global npm prefix must not break the image's nvm initialization");
  for (const directory of [home, workspace, stubs, environment.TMPDIR]) mkdirSync(directory, { recursive: true });
  symlinkSync(process.execPath, path.join(stubs, "node"));
  write(path.join(stubs, "id"), '#!/bin/sh\n[ "$1" = "-u" ] || exit 1\nprintf "1000\\n"\n', 0o755);
  write(path.join(stubs, "sudo"), '#!/bin/sh\necho "Host integration is outside this fixture" >&2\nexit 1\n', 0o755);
  write(path.join(stubs, "curl"), `#!/usr/bin/env node
import assert from "node:assert/strict";
const args = process.argv.slice(2);
assert.equal(args.length, 2);
assert.equal(args[0], "-fsSL");
const agent = {
  "https://claude.ai/install.sh": "claude",
  "https://chatgpt.com/codex/install.sh": "codex",
}[args[1]];
assert(agent, "Only supported vendor installer URLs may be requested");
process.stdout.write('exec node "$SETUP_TEST_NATIVE_INSTALLER" ' + agent + ' "$@"\\n');
`, 0o755);
  write(environment.SETUP_TEST_NATIVE_INSTALLER, `import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const [agent, ...args] = process.argv.slice(2);
assert.deepEqual(args, agent === "claude" ? [] : ["--release", "latest"],
  "Use Claude's no-argument latest bootstrap without changing the user's channel, or Codex's latest release; a temporary pin must update this check and its qualification receipt");
if (agent === "codex") assert.equal(process.env.CODEX_NON_INTERACTIVE, "1", "Codex setup must set CODEX_NON_INTERACTIVE=1");
appendFileSync(process.env.SETUP_TEST_INSTALLS, JSON.stringify({ agent, args }) + "\\n");
const version = JSON.parse(readFileSync(process.env.SETUP_TEST_REGISTRY, "utf8"))[agent];
assert(version, "Fixture release must exist");
const bin = path.join(process.env.HOME, ".local/bin");
mkdirSync(bin, { recursive: true });
writeFileSync(path.join(bin, agent), "#!/usr/bin/env node\\nconsole.log(" +
  JSON.stringify(agent + " " + version) + ");\\n", { mode: 0o755 });
`);
  write(path.join(stubs, "npm"), `#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const prefix = path.join(process.env.HOME, ".local");
assert.deepEqual(args.slice(0, 4), ["install", "--global", "--prefix", prefix]);
assert.equal(args.length, 5);
const version = args[4].match(/^@firstdraft[.]com\\/cli@([0-9]+[.][0-9]+[.][0-9]+)$/)?.[1];
assert(version, "Only the pinned First Draft CLI may use npm");
appendFileSync(process.env.SETUP_TEST_INSTALLS, JSON.stringify({ agent: "firstdraft", args }) + "\\n");
mkdirSync(path.join(prefix, "bin"), { recursive: true });
writeFileSync(path.join(prefix, "bin/firstdraft"), "#!/usr/bin/env node\\nconsole.log(" +
  JSON.stringify("firstdraft " + version) + ");\\n", { mode: 0o755 });
`, 0o755);

  const devcontainer = path.join(workspace, ".devcontainer");
  mkdirSync(devcontainer);
  for (const helper of ["agent-skills.mjs", "configure-codex.mjs"]) {
    copyFileSync(path.join(repository, ".devcontainer", helper), path.join(devcontainer, helper));
  }
  copyFileSync(path.join(repository, ".env.example"), path.join(workspace, ".env.example"));
  const setup = readFileSync(path.join(repository, ".devcontainer/setup-agents"), "utf8");
  const hostEnvironmentGuard = "if [[ -x /usr/sbin/sshd && -f /etc/environment ]]; then";
  assert.equal(setup.split(hostEnvironmentGuard).length, 2, "Review fixture isolation if the host integration changes");
  // Exercise production setup while excluding the SSH host integration, even on Linux.
  write(path.join(devcontainer, "setup-agents"), setup.replace(hostEnvironmentGuard, "if false; then"), 0o755);

  const cache = path.join(home, ".cache/firstdraft/skills");
  const skillName = pins.FIRSTDRAFT_CLAUDE_SKILL_NAME;
  const candidate = path.join(cache, "fixture");
  write(path.join(candidate, ".claude-plugin/plugin.json"), JSON.stringify({
    name: "firstdraft", skills: [`./skills/${skillName}`],
  }) + "\n");
  write(path.join(candidate, "skills", skillName, "SKILL.md"), `---\nname: ${skillName}\n---\nOffline setup fixture.\n`);
  const git = (args) => run("git", ["-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", ...args], candidate);
  git(["init", "--quiet"]);
  git(["add", "."]);
  git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Fixture"]);
  const revision = git(["rev-parse", "HEAD"]);
  const checkout = path.join(cache, revision);
  renameSync(candidate, checkout);
  write(path.join(devcontainer, "agent-versions.env"), versions.replace(/^FIRSTDRAFT_SKILLS_REVISION=.+$/m,
    `FIRSTDRAFT_SKILLS_REVISION=${revision}`));

  const preserved = new Map([
    [path.join(home, ".claude.json"), '{"fixture":"existing user settings"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, ".claude.json"), '{"fixture":"mounted global settings"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, ".credentials.json"), '{"fixture":"synthetic Claude credentials"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, "settings.json"), '{"theme":"dark","autoUpdatesChannel":"stable"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, "projects/workspace/session.jsonl"), '{"fixture":"existing Claude conversation"}\n'],
    [path.join(environment.CODEX_HOME, "auth.json"), '{"fixture":"synthetic Codex credentials"}\n'],
    [path.join(environment.CODEX_HOME, "config.toml"), 'model = "user-choice"\nsandbox_mode = "workspace-write"\n'],
    [path.join(environment.CODEX_HOME, "sessions/session.jsonl"), '{"fixture":"existing Codex conversation"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, "skills/user-skill/SKILL.md"), "Claude user Skill\n"],
    [path.join(home, ".agents/skills/user-skill/SKILL.md"), "Codex user Skill\n"],
    [path.join(workspace, ".env"), `FIRSTDRAFT_API_URL=https://staging.firstdraft.com\n${"FIRSTDRAFT_API_TOKEN"}=fixture-placeholder\n`],
  ]);
  for (const [file, content] of preserved) write(file, content);
  const verifyPreserved = () => {
    for (const [file, content] of preserved) assert.equal(readFileSync(file, "utf8"), content, `Setup changed ${file}`);
    for (const root of [path.join(environment.CLAUDE_CONFIG_DIR, "skills"), path.join(home, ".agents/skills")]) {
      assert.equal(realpathSync(path.join(root, skillName)), path.join(checkout, "skills", skillName));
    }
  };
  const publishFixtureRelease = (version) => write(environment.SETUP_TEST_REGISTRY, JSON.stringify({
    claude: version, codex: version,
  }) + "\n");
  const expectedInstalls = [
    { agent: "claude", args: [] },
    { agent: "codex", args: ["--release", "latest"] },
    { agent: "firstdraft", args: ["install", "--global", "--prefix", path.join(home, ".local"), `@firstdraft.com/cli@${pins.FIRSTDRAFT_CLI_VERSION}`] },
  ];
  const installs = () => readFileSync(environment.SETUP_TEST_INSTALLS, "utf8").trim().split("\n").map(JSON.parse);
  const byAgent = (records) => records.toSorted((left, right) => left.agent.localeCompare(right.agent));

  publishFixtureRelease("1.0.0");
  const first = run("bash", [path.join(devcontainer, "setup-agents")]);
  assert.deepEqual(byAgent(installs()), expectedInstalls);
  assert(first.includes("claude 1.0.0") && first.includes("codex 1.0.0"));
  assert(first.includes(`firstdraft ${pins.FIRSTDRAFT_CLI_VERSION}`));
  verifyPreserved();

  publishFixtureRelease("2.0.0");
  run("bash", ["-o", "pipefail", "-c", 'curl -fsSL https://claude.ai/install.sh | bash']);
  run("bash", ["-o", "pipefail", "-c", 'curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh -s -- --release latest']);
  for (const agent of ["claude", "codex"]) assert.equal(run(path.join(home, ".local/bin", agent), ["--version"]), `${agent} 2.0.0`);
  const rerun = run("bash", [path.join(devcontainer, "setup-agents")]);
  assert.equal(installs().length, 8);
  assert.deepEqual(byAgent(installs().slice(-3)), expectedInstalls, "Reruns must not reapply an obsolete client pin");
  assert(rerun.includes("claude 2.0.0") && rerun.includes("codex 2.0.0"));
  assert(rerun.includes(`firstdraft ${pins.FIRSTDRAFT_CLI_VERSION}`));
  verifyPreserved();
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log("Offline native installer selectors, pinned CLI, rerun, and user-state preservation checks passed.");
