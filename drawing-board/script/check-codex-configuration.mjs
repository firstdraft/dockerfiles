import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const setup = join(process.env.DRAWING_BOARD_PATH ?? process.cwd(), ".devcontainer/configure-codex.mjs");
const fixture = mkdtempSync(join(tmpdir(), "drawing-board-codex-"));
const configure = (codexHome, codespaces) => {
  const result = spawnSync(process.execPath, [setup], {
    env: { ...process.env, CODEX_HOME: codexHome, CODESPACES: codespaces },
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
};

try {
  for (const codespaces of ["", "false"]) {
    const localHome = join(fixture, `local-${codespaces}`);
    configure(localHome, codespaces);
    assert.equal(existsSync(localHome), false, "Local devcontainers must keep their own policy");
  }

  const mountedHome = join(fixture, "mounted-codex-home");
  mkdirSync(mountedHome);
  writeFileSync(join(mountedHome, "auth-placeholder"), "preserve");
  configure(mountedHome, "true");
  const configPath = join(mountedHome, "config.toml");
  const initial = readFileSync(configPath, "utf8");
  assert.equal(initial, 'sandbox_mode = "danger-full-access"\napproval_policy = "on-request"\n');
  assert.equal(statSync(configPath).mode & 0o777, 0o600);
  configure(mountedHome, "true");
  assert.equal(readFileSync(configPath, "utf8"), initial, "Repeated setup is idempotent");
  assert.equal(readFileSync(join(mountedHome, "auth-placeholder"), "utf8"), "preserve");

  const custom = 'model = "example-model"\nsandbox_mode = "workspace-write"\n';
  writeFileSync(configPath, custom);
  configure(mountedHome, "true");
  assert.equal(readFileSync(configPath, "utf8"), custom, "Preserve existing user configuration byte for byte");

  const linkedHome = join(fixture, "dotfiles-home");
  mkdirSync(linkedHome);
  symlinkSync(configPath, join(linkedHome, "config.toml"));
  configure(linkedHome, "true");
  assert.equal(readFileSync(configPath, "utf8"), custom, "Preserve dotfile symlinks and their targets");

  const danglingHome = join(fixture, "missing-dotfile-target");
  mkdirSync(danglingHome);
  const absentTarget = join(fixture, "absent-config.toml");
  symlinkSync(absentTarget, join(danglingHome, "config.toml"));
  configure(danglingHome, "true");
  assert.equal(existsSync(absentTarget), false, "Do not replace a user's dangling dotfile symlink");

  const freshHome = join(fixture, "new-volume");
  configure(freshHome, "true");
  assert.equal(readFileSync(join(freshHome, "config.toml"), "utf8"), initial, "Seed every fresh mounted home");

  if (process.argv.includes("--runtime")) {
    const readPermissions = (overrides = []) => {
      const result = spawnSync("codex", [...overrides, "debug", "prompt-input", "Configuration smoke."], {
        env: { ...process.env, CODEX_HOME: freshHome },
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30_000,
      });
      assert.equal(result.status, 0, result.stderr);
      const permissions = JSON.parse(result.stdout)
        .flatMap((item) => item.content ?? [])
        .filter((item) => item.type === "input_text")
        .map((item) => item.text.match(/<permissions instructions>[\s\S]*?<\/permissions instructions>/)?.[0])
        .find(Boolean);
      assert.ok(permissions, "Codex must expose its effective permission instructions");
      return permissions;
    };
    const permissions = readPermissions();
    assert.match(permissions, /`sandbox_mode` is `danger-full-access`/);
    assert.match(permissions, /# Escalation Requests/);
    assert.doesNotMatch(permissions, /Approval policy is currently never/);
    const never = readPermissions(["-c", 'approval_policy="never"']);
    assert.match(never, /Approval policy is currently never/);
    assert.doesNotMatch(never, /# Escalation Requests/);
  }
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

console.log("Codex configuration checks passed.");
