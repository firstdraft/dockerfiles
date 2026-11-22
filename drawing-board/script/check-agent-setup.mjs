import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repository = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const configuration = JSON.parse(readFileSync(path.join(repository, ".devcontainer/devcontainer.json"), "utf8"));
const versions = readFileSync(path.join(repository, ".devcontainer/agent-versions.env"), "utf8");
const pins = Object.fromEntries([...versions.matchAll(/^([A-Z0-9_]+)=(.+)$/gm)].map((match) => match.slice(1)));
assert(!("CLAUDE_CODE_VERSION" in pins), "Claude uses the no-argument native bootstrap's latest default; a temporary regression pin or frozen experiment must update this check and its qualification receipt");
assert.equal(pins.CODEX_VERSION, "latest", "CODEX_VERSION: normal policy is latest; a temporary regression pin or frozen experiment must update this check and its qualification receipt");
assert(!Object.keys(pins).some((name) => name.startsWith("FIRSTDRAFT_")), "The template pins no First Draft version");
assert(!Object.keys({ ...configuration.containerEnv, ...configuration.remoteEnv }).some((name) => name.startsWith("FIRSTDRAFT_")),
  "The Codespace defines no First Draft token or origin; the plugin's CLI uses its saved login and production by default");
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
  SETUP_TEST_AGENT: path.join(stubs, "agent.mjs"),
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
  const renderAsset = `cli_${pins.RENDER_CLI_VERSION}_linux_`;
  const downloads = {
    render: `https://github.com/render-oss/cli/releases/download/v${pins.RENDER_CLI_VERSION}/${renderAsset}`,
    revyl: `https://github.com/RevylAI/revyl-cli/releases/download/v${pins.REVYL_CLI_VERSION}/revyl-linux-`,
  };
  // The fixture's release assets: a stand-in Render zip that the unzip stub expands, and a Revyl
  // script binary. Setup verifies their digests, so the fixture pins those digests below.
  const fixtureAssets = {
    render: "fixture Render CLI archive\n",
    revyl: `#!/usr/bin/env node\nconsole.log("revyl version v${pins.REVYL_CLI_VERSION}");\n`,
  };
  const sha256 = (content) => createHash("sha256").update(content).digest("hex");
  write(path.join(stubs, "curl"), `#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
assert.equal(args[0], "-fsSL");
if (args.length === 2) {
  const agent = {
    "https://claude.ai/install.sh": "claude",
    "https://chatgpt.com/codex/install.sh": "codex",
  }[args[1]];
  assert(agent, "Only supported vendor installer URLs may be piped to a shell");
  process.stdout.write('exec node "$SETUP_TEST_NATIVE_INSTALLER" ' + agent + ' "$@"\\n');
} else {
  assert.equal(args.length, 4, "Pinned downloads use curl -fsSL -o FILE URL");
  assert.equal(args[1], "-o");
  const downloads = ${JSON.stringify(downloads)};
  const assets = ${JSON.stringify(fixtureAssets)};
  const tool = Object.keys(downloads).find((name) =>
    new RegExp("^" + downloads[name].replace(/[.]/g, "[.]") + "(amd64|arm64)" + (name === "render" ? "[.]zip" : "") + "$").test(args[3]));
  assert(tool, "Only the pinned Render and Revyl release assets may be downloaded: " + args[3]);
  writeFileSync(args[2], assets[tool]);
  appendFileSync(process.env.SETUP_TEST_INSTALLS, JSON.stringify({ agent: tool, args: [args[3].replace(/(amd64|arm64)/, "ARCH")] }) + "\\n");
}
`, 0o755);
  write(path.join(stubs, "unzip"), `#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
assert.deepEqual([args[0], args[1], args[3], args[4]], ["-q", "-o", "cli_v${pins.RENDER_CLI_VERSION}", "-d"]);
assert.equal(readFileSync(args[2], "utf8"), ${JSON.stringify(fixtureAssets.render)});
writeFileSync(path.join(args[5], args[3]), "#!/usr/bin/env node\\nconsole.log(" +
  JSON.stringify("render v${pins.RENDER_CLI_VERSION}") + ");\\n", { mode: 0o755 });
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
writeFileSync(path.join(bin, agent), "#!/bin/sh\\nexec node " + JSON.stringify(process.env.SETUP_TEST_AGENT) + " " +
  agent + " " + version + ' "$@"\\n', { mode: 0o755 });
`);
  // The installed agents' plugin commands, recorded with their arguments. They change agent state as
  // the vendors document: adding a catalog to Claude Code declares it in user settings, and installing
  // the plugin gives it an install path that 'claude plugin list --json' reports.
  const pluginVersion = "1.2.3";
  const pluginRoot = path.join(environment.CLAUDE_CONFIG_DIR, "plugins/cache/firstdraft-skills/firstdraft", pluginVersion);
  write(environment.SETUP_TEST_AGENT, `import assert from "node:assert/strict";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const [agent, version, ...args] = process.argv.slice(2);
const command = args.join(" ");
if (command === "--version") {
  console.log(agent + " " + version);
  process.exit(0);
}
const pluginRoot = ${JSON.stringify(pluginRoot)};
const settingsFile = path.join(process.env.CLAUDE_CONFIG_DIR, "settings.json");
const settings = () => existsSync(settingsFile) ? JSON.parse(readFileSync(settingsFile, "utf8")) : {};
if (agent === "claude" && command === "plugin list --json") {
  const installed = settings().enabledPlugins?.["firstdraft@firstdraft-skills"] === true;
  console.log(JSON.stringify(installed ? [{
    id: "firstdraft@firstdraft-skills", version: ${JSON.stringify(pluginVersion)}, scope: "user", enabled: true, installPath: pluginRoot,
  }] : []));
  process.exit(0);
}
appendFileSync(process.env.SETUP_TEST_INSTALLS, JSON.stringify({ agent, args }) + "\\n");
switch (agent + " " + command) {
  case "claude plugin marketplace add firstdraft/skills --scope user": {
    const current = settings();
    current.extraKnownMarketplaces = {
      ...current.extraKnownMarketplaces,
      "firstdraft-skills": { source: { source: "github", repo: "firstdraft/skills" }, ...current.extraKnownMarketplaces?.["firstdraft-skills"] },
    };
    writeFileSync(settingsFile, JSON.stringify(current));
    break;
  }
  case "claude plugin install firstdraft@firstdraft-skills --scope user": {
    const current = settings();
    assert(current.extraKnownMarketplaces?.["firstdraft-skills"], "Add the catalog before installing from it");
    current.enabledPlugins = { ...current.enabledPlugins, "firstdraft@firstdraft-skills": true };
    writeFileSync(settingsFile, JSON.stringify(current));
    mkdirSync(path.join(pluginRoot, "bin"), { recursive: true });
    writeFileSync(path.join(pluginRoot, "bin/firstdraft"), '#!/bin/sh\\n[ "$1" = --version ] && echo ' + ${JSON.stringify(pluginVersion)} + "\\n", { mode: 0o755 });
    break;
  }
  case "codex plugin marketplace add firstdraft/skills": {
    const config = path.join(process.env.CODEX_HOME, "config.toml");
    const current = existsSync(config) ? readFileSync(config, "utf8") : "";
    if (!current.includes("[marketplaces.firstdraft-skills]")) {
      writeFileSync(config, current + '\\n[marketplaces.firstdraft-skills]\\nsource_type = "git"\\n');
    }
    break;
  }
  case "codex plugin add firstdraft@firstdraft-skills":
    break;
  default:
    assert.fail("Unexpected " + agent + " command: " + command);
}
`);
  write(path.join(stubs, "npm"), `#!/usr/bin/env node
import assert from "node:assert/strict";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const args = process.argv.slice(2);
const prefix = path.join(process.env.HOME, ".local");
assert.deepEqual(args.slice(0, 4), ["install", "--global", "--prefix", prefix]);
assert.equal(args.length, 5);
const [, name, version] = args[4].match(/^(neonctl)@([0-9]+[.][0-9]+[.][0-9]+)$/) ?? [];
assert(name, "Only the pinned neonctl may use npm; the First Draft plugin is the only First Draft install");
appendFileSync(process.env.SETUP_TEST_INSTALLS, JSON.stringify({ agent: name, args }) + "\\n");
mkdirSync(path.join(prefix, "bin"), { recursive: true });
writeFileSync(path.join(prefix, "bin", name), "#!/usr/bin/env node\\nconsole.log(" + JSON.stringify(version) + ");\\n", { mode: 0o755 });
`, 0o755);

  const devcontainer = path.join(workspace, ".devcontainer");
  mkdirSync(devcontainer);
  for (const helper of ["configure-codex.mjs", "workshop-notes.mjs"]) {
    copyFileSync(path.join(repository, ".devcontainer", helper), path.join(devcontainer, helper));
  }
  cpSync(path.join(repository, ".devcontainer", "workshop"), path.join(devcontainer, "workshop"), { recursive: true });
  const setup = readFileSync(path.join(repository, ".devcontainer/setup-agents"), "utf8");
  const hostEnvironmentGuard = "if [[ -x /usr/sbin/sshd && -f /etc/environment ]]; then";
  assert.equal(setup.split(hostEnvironmentGuard).length, 2, "Review fixture isolation if the host integration changes");
  // Exercise production setup while excluding the SSH host integration, even on Linux.
  write(path.join(devcontainer, "setup-agents"), setup.replace(hostEnvironmentGuard, "if false; then"), 0o755);
  write(path.join(devcontainer, "agent-versions.env"), versions
    .replace(/^RENDER_CLI_SHA256_(AMD64|ARM64)=.+$/gm, (_, arch) => `RENDER_CLI_SHA256_${arch}=${sha256(fixtureAssets.render)}`)
    .replace(/^REVYL_CLI_SHA256_(AMD64|ARM64)=.+$/gm, (_, arch) => `REVYL_CLI_SHA256_${arch}=${sha256(fixtureAssets.revyl)}`));

  const userSettings = { theme: "dark", autoUpdatesChannel: "stable" };
  const userCodexConfig = 'model = "user-choice"\nsandbox_mode = "workspace-write"\n';
  const preserved = new Map([
    [path.join(home, ".claude.json"), '{"fixture":"existing user settings"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, ".claude.json"), '{"fixture":"mounted global settings"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, ".credentials.json"), '{"fixture":"synthetic Claude credentials"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, "projects/workspace/session.jsonl"), '{"fixture":"existing Claude conversation"}\n'],
    [path.join(environment.CODEX_HOME, "auth.json"), '{"fixture":"synthetic Codex credentials"}\n'],
    [path.join(environment.CODEX_HOME, "sessions/session.jsonl"), '{"fixture":"existing Codex conversation"}\n'],
    [path.join(environment.CLAUDE_CONFIG_DIR, "skills/user-skill/SKILL.md"), "Claude user Skill\n"],
    [path.join(home, ".agents/skills/user-skill/SKILL.md"), "Codex user Skill\n"],
  ]);
  const userNotes = "# The user's own Claude notes\n";
  write(path.join(environment.CLAUDE_CONFIG_DIR, "CLAUDE.md"), userNotes);
  write(path.join(environment.CLAUDE_CONFIG_DIR, "settings.json"), JSON.stringify(userSettings) + "\n");
  write(path.join(environment.CODEX_HOME, "config.toml"), userCodexConfig);
  for (const [file, content] of preserved) write(file, content);
  const notes = readFileSync(path.join(repository, ".devcontainer/workshop/app-instructions.md"), "utf8").trimEnd();
  const block = `<!-- drawing-board-workshop: start -->\n${notes}\n<!-- drawing-board-workshop: end -->\n`;
  const verifyPreserved = () => {
    for (const [file, content] of preserved) assert.equal(readFileSync(file, "utf8"), content, `Setup changed ${file}`);
    // Setup adds only the catalog's automatic updates to the user's own Claude settings.
    const settings = JSON.parse(readFileSync(path.join(environment.CLAUDE_CONFIG_DIR, "settings.json"), "utf8"));
    assert.deepEqual(settings, {
      ...userSettings,
      extraKnownMarketplaces: {
        "firstdraft-skills": { source: { source: "github", repo: "firstdraft/skills" }, autoUpdate: true },
      },
      enabledPlugins: { "firstdraft@firstdraft-skills": true },
    });
    assert(readFileSync(path.join(environment.CODEX_HOME, "config.toml"), "utf8").startsWith(userCodexConfig),
      "Setup must keep the user's own Codex settings");
    for (const root of [path.join(environment.CLAUDE_CONFIG_DIR, "skills"), path.join(home, ".agents/skills")]) {
      assert.equal(existsSync(path.join(root, "create-full-stack-app")), false, "The plugin is the only source of the First Draft Skill");
      assert.equal(readFileSync(path.join(root, "workshop-signin/SKILL.md"), "utf8"),
        readFileSync(path.join(repository, ".devcontainer/workshop/skills/workshop-signin/SKILL.md"), "utf8"));
    }
    assert.equal(readFileSync(path.join(environment.CLAUDE_CONFIG_DIR, "CLAUDE.md"), "utf8"), `${userNotes}\n${block}`,
      "Setup must keep the user's own Claude notes and hold exactly one workshop block");
    assert.equal(readFileSync(path.join(environment.CODEX_HOME, "AGENTS.md"), "utf8"), block);
    assert.equal(statSync(path.join(home, ".workshop")).mode & 0o777, 0o700);
    for (const helper of ["auth.sh", "cloudinary.sh", "firstdraft.sh", "git-identity.sh", "login.sh", "neon-key.sh", "open.sh", "render-workspace.sh"]) {
      assert.equal(statSync(path.join(home, ".workshop", helper)).mode & 0o777, 0o755, `missing workshop helper ${helper}`);
    }
    assert.equal(existsSync(path.join(home, ".local/bin/firstdraft")), false, "Nothing but the plugin may install the First Draft CLI");
    assert.equal(run("bash", [path.join(home, ".workshop/firstdraft.sh"), "--version"]), pluginVersion);
    assert.equal(run(path.join(home, ".local/bin/render"), ["--version"]), `render v${pins.RENDER_CLI_VERSION}`);
    assert.equal(run(path.join(home, ".local/bin/neonctl"), ["--version"]), pins.NEONCTL_VERSION);
    assert(lstatSync(path.join(home, ".local/bin/revyl")).isSymbolicLink());
    assert.equal(run(path.join(home, ".local/bin/revyl"), ["--version"]), `revyl version v${pins.REVYL_CLI_VERSION}`);
    assert.equal(existsSync(path.join(workspace, ".env")), false, "Setup must not create a First Draft .env");
  };
  const publishFixtureRelease = (version) => write(environment.SETUP_TEST_REGISTRY, JSON.stringify({
    claude: version, codex: version,
  }) + "\n");
  const expectedInstalls = [
    { agent: "claude", args: [] },
    { agent: "claude", args: ["plugin", "marketplace", "add", "firstdraft/skills", "--scope", "user"] },
    { agent: "claude", args: ["plugin", "install", "firstdraft@firstdraft-skills", "--scope", "user"] },
    { agent: "codex", args: ["--release", "latest"] },
    { agent: "codex", args: ["plugin", "marketplace", "add", "firstdraft/skills"] },
    { agent: "codex", args: ["plugin", "add", "firstdraft@firstdraft-skills"] },
    { agent: "neonctl", args: ["install", "--global", "--prefix", path.join(home, ".local"), `neonctl@${pins.NEONCTL_VERSION}`] },
    { agent: "render", args: [`${downloads.render}ARCH.zip`] },
    { agent: "revyl", args: [`${downloads.revyl}ARCH`] },
  ];
  const installs = () => readFileSync(environment.SETUP_TEST_INSTALLS, "utf8").trim().split("\n").map(JSON.parse);
  const byAgent = (records) => records.toSorted((left, right) => left.agent.localeCompare(right.agent));

  publishFixtureRelease("1.0.0");
  const first = run("bash", [path.join(devcontainer, "setup-agents")]);
  assert.deepEqual(byAgent(installs()), expectedInstalls);
  assert(first.includes("claude 1.0.0") && first.includes("codex 1.0.0"));
  assert(first.split("\n").includes(pluginVersion), "Setup must report the plugin CLI's version");
  verifyPreserved();

  publishFixtureRelease("2.0.0");
  run("bash", ["-o", "pipefail", "-c", 'curl -fsSL https://claude.ai/install.sh | bash']);
  run("bash", ["-o", "pipefail", "-c", 'curl -fsSL https://chatgpt.com/codex/install.sh | CODEX_NON_INTERACTIVE=1 sh -s -- --release latest']);
  for (const agent of ["claude", "codex"]) assert.equal(run(path.join(home, ".local/bin", agent), ["--version"]), `${agent} 2.0.0`);
  const rerun = run("bash", [path.join(devcontainer, "setup-agents")]);
  assert.equal(installs().length, 2 * expectedInstalls.length + 2);
  assert.deepEqual(byAgent(installs().slice(-expectedInstalls.length)), expectedInstalls, "Reruns must not reapply an obsolete client pin");
  assert(rerun.includes("claude 2.0.0") && rerun.includes("codex 2.0.0"));
  assert(rerun.split("\n").includes(pluginVersion));
  verifyPreserved();
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log("Offline native installer selectors, plugin installs and updates, pinned CLIs, workshop helpers, rerun, and user-state preservation checks passed.");
