#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {execFileSync, spawnSync} from "node:child_process";
import {fileURLToPath, pathToFileURL} from "node:url";
const {assertSameInventory, committedInventory, filesystemInventory} = await import(
  pathToFileURL(path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd(), "script/application-repository-inventory-lib.mjs")),
);

const repositoryRoot = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "drawing-board-application-init-test-"));
const harnessRoot = path.join(temporaryRoot, "drawing-board");
const applicationRoot = path.join(harnessRoot, "application");
const initializer = path.join(harnessRoot, "script", "initialize-application");
const originalUmask = process.umask(0o077);

class PrerequisiteError extends Error {}

function writeAt(root, relativePath, contents, mode = 0o644) {
  const destination = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.writeFileSync(destination, contents, {mode});
  fs.chmodSync(destination, mode);
}

function write(relativePath, contents, mode = 0o644) {
  writeAt(harnessRoot, relativePath, contents, mode);
}

function copyApplication(name) {
  const destination = path.join(harnessRoot, name);
  fs.cpSync(applicationRoot, destination, {recursive: true});
  return destination;
}

function initializerEnvironment(changes = {}) {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: "Drawing Board Test",
    GIT_AUTHOR_EMAIL: "drawing-board-test@example.invalid",
    ...changes,
  };
}

function runInitializer(applicationPath, environment = {}) {
  return spawnSync("bash", [initializer, applicationPath], {
    cwd: harnessRoot,
    encoding: "utf8",
    env: initializerEnvironment(environment),
  });
}

function sha256(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

function fileTreeDigest(root) {
  const records = [];

  function visit(directory, relativeDirectory = "") {
    for (const entry of fs.readdirSync(directory, {withFileTypes: true})) {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        records.push([relativePath, sha256(fs.readFileSync(absolutePath))]);
      } else {
        throw new Error(`Unexpected ambient Git entry: ${relativePath}`);
      }
    }
  }

  visit(root);
  return sha256(Buffer.from(JSON.stringify(records.sort()), "utf8"));
}

try {
  fs.mkdirSync(path.join(harnessRoot, "script"), {recursive: true});
  for (const script of [
    "initialize-application",
    "application-repository-inventory.mjs",
    "application-repository-inventory-lib.mjs",
  ]) {
    fs.copyFileSync(path.join(repositoryRoot, "script", script), path.join(harnessRoot, "script", script));
  }

  const inventoryLink = path.join(harnessRoot, "script", "inventory-entrypoint-link.mjs");
  fs.symlinkSync("application-repository-inventory.mjs", inventoryLink);
  const linkedEntrypoint = spawnSync(process.execPath, [inventoryLink], {encoding: "utf8"});
  assert.notEqual(linkedEntrypoint.status, 0, "the inventory entry point must not skip execution through a symlink");
  assert.match(linkedEntrypoint.stderr, /Usage: application-repository-inventory\.mjs/);

  let rubyVersion;
  try {
    rubyVersion = execFileSync("ruby", ["-e", "print RUBY_VERSION"], {encoding: "utf8"});
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new PrerequisiteError(
        "script/check requires the pinned Ruby on PATH; run it through the pinned toolchain or in the Dev Container.",
      );
    }
    throw error;
  }
  const nodeVersion = process.versions.node;
  write(
    ".devcontainer/agent-versions.env",
    `FOUNDATION_RUBY_VERSION=${rubyVersion}\n` +
      `FOUNDATION_NODE_VERSION=${nodeVersion}\n` +
      "FOUNDATION_POSTGRES_VERSION=18\n",
  );

  write(
    "application/.gitignore",
    "/.firstdraft/\n/.env*\n/config/*.key\n/node_modules\n",
  );
  write("application/.ruby-version", `ruby-${rubyVersion}\n`);
  write("application/.node-version", `${nodeVersion}\n`);
  write("application/.firstdraft/submitted-foundation-plan.json", "{\"plan\":true}\n");
  write("application/.firstdraft/gaps.json", "{\"gaps\":[]}\n");
  write("application/bin/setup", "#!/usr/bin/env bash\ntouch setup-ran\n", 0o755);
  write("application/bin/ci", "#!/usr/bin/env bash\nexit 0\n", 0o755);
  write("application/ordinary.txt", "trailing whitespace stays exact  \n");
  process.umask(0o022);

  const expectedPaths = [
    ".firstdraft/gaps.json",
    ".firstdraft/submitted-foundation-plan.json",
    ".gitignore",
    ".node-version",
    ".ruby-version",
    "bin/ci",
    "bin/setup",
    "ordinary.txt",
  ].sort();
  const expected = filesystemInventory(applicationRoot, expectedPaths);

  copyApplication("custom-application");
  const envApplication = copyApplication("env-application");
  writeAt(envApplication, ".env", "SECRET=do-not-commit\n", 0o600);
  const keyApplication = copyApplication("key-application");
  writeAt(keyApplication, "config/master.key", "do-not-commit\n", 0o600);
  const extraFirstdraftApplication = copyApplication("extra-firstdraft-application");
  writeAt(extraFirstdraftApplication, ".firstdraft/extra.json", "{}\n");
  const setupApplication = copyApplication("setup-application");
  writeAt(setupApplication, "node_modules/tool.js", "export default true;\n");
  fs.mkdirSync(path.join(setupApplication, "node_modules/.bin"), {recursive: true});
  fs.symlinkSync("../tool.js", path.join(setupApplication, "node_modules/.bin/tool"));
  const linkedApplication = copyApplication("linked-application");
  fs.symlinkSync("ordinary.txt", path.join(linkedApplication, "ordinary-link"));
  const modeApplication = copyApplication("mode-application");
  fs.chmodSync(path.join(modeApplication, "ordinary.txt"), 0o664);

  const hostileGitRoot = path.join(temporaryRoot, "ambient-repository");
  fs.mkdirSync(hostileGitRoot);
  execFileSync("git", ["init", "--quiet", "--initial-branch=main", hostileGitRoot]);
  writeAt(hostileGitRoot, "marker.txt", "ambient repository\n");
  execFileSync("git", ["-C", hostileGitRoot, "add", "marker.txt"]);
  execFileSync(
    "git",
    [
      "-C",
      hostileGitRoot,
      "-c",
      "user.name=Ambient Test",
      "-c",
      "user.email=ambient@example.invalid",
      "commit",
      "--quiet",
      "--message=Ambient repository",
    ],
  );
  const hostileGitDirectory = path.join(hostileGitRoot, ".git");
  const ambientHead = execFileSync("git", ["-C", hostileGitRoot, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const ambientIndexSha256 = sha256(fs.readFileSync(path.join(hostileGitDirectory, "index")));
  const ambientObjectsSha256 = fileTreeDigest(path.join(hostileGitDirectory, "objects"));

  const uninitializedSmoke = spawnSync("bash", [fileURLToPath(new URL("application-smoke", import.meta.url))], {
    cwd: harnessRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      DRAWING_BOARD_PATH: harnessRoot,
      GIT_DIR: hostileGitDirectory,
      GIT_WORK_TREE: hostileGitRoot,
      GIT_INDEX_FILE: path.join(hostileGitDirectory, "index"),
    },
  });
  assert.notEqual(uninitializedSmoke.status, 0, "application smoke must reject a missing nested repository");
  assert.match(uninitializedSmoke.stderr, /Initialize the generated application with script\/initialize-application/);
  assert.equal(
    fs.existsSync(path.join(applicationRoot, "setup-ran")),
    false,
    "application setup ran before Git validation",
  );

  const extraArguments = spawnSync("bash", [initializer, "application", "extra"], {
    cwd: harnessRoot,
    encoding: "utf8",
  });
  assert.notEqual(extraArguments.status, 0, "initializer must reject extra arguments");
  assert.match(extraArguments.stderr, /Usage: script\/initialize-application/);
  assert.equal(fs.existsSync(path.join(applicationRoot, ".git")), false);

  const outsideRoot = spawnSync("bash", [initializer, temporaryRoot], {
    cwd: harnessRoot,
    encoding: "utf8",
  });
  assert.notEqual(outsideRoot.status, 0, "initializer must reject paths outside Drawing Board");
  assert.match(outsideRoot.stderr, /must resolve inside the Drawing Board/);
  assert.equal(fs.existsSync(path.join(applicationRoot, ".git")), false);

  for (const [name, rejectedRoot, rejectedPath] of [
    ["env-application", envApplication, ".env"],
    ["key-application", keyApplication, "config/"],
    ["extra-firstdraft-application", extraFirstdraftApplication, ".firstdraft/extra.json"],
    ["setup-application", setupApplication, "node_modules/"],
  ]) {
    const rejected = runInitializer(name);
    assert.notEqual(rejected.status, 0, `${name} must reject ignored local state`);
    assert.match(rejected.stderr, new RegExp(`application/${rejectedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.match(rejected.stderr, /nothing was removed/);
    assert.equal(fs.existsSync(path.join(rejectedRoot, ".git")), false);
  }
  assert.equal(fs.readFileSync(path.join(envApplication, ".env"), "utf8"), "SECRET=do-not-commit\n");
  assert.equal(fs.readFileSync(path.join(keyApplication, "config/master.key"), "utf8"), "do-not-commit\n");
  assert.equal(fs.lstatSync(path.join(setupApplication, "node_modules/.bin/tool")).isSymbolicLink(), true);

  const linkedRejected = runInitializer("linked-application");
  assert.notEqual(linkedRejected.status, 0, "initializer must reject an admitted symbolic link");
  assert.match(linkedRejected.stderr, /Unsupported generated application entry: ordinary-link/);
  assert.equal(fs.lstatSync(path.join(linkedApplication, "ordinary-link")).isSymbolicLink(), true);
  assert.equal(fs.existsSync(path.join(linkedApplication, ".git")), false);

  const modeRejected = runInitializer("mode-application");
  assert.notEqual(modeRejected.status, 0, "initializer must reject a noncanonical generated mode");
  assert.match(modeRejected.stderr, /Unsupported generated application mode at ordinary\.txt: 664/);
  assert.match(modeRejected.stderr, /Compile again into a fresh absent directory/);
  assert.equal(fs.statSync(path.join(modeApplication, "ordinary.txt")).mode & 0o777, 0o664);
  assert.equal(fs.existsSync(path.join(modeApplication, ".git")), false);

  const initialized = runInitializer("application", {
    GIT_DIR: hostileGitDirectory,
    GIT_WORK_TREE: hostileGitRoot,
    GIT_INDEX_FILE: path.join(hostileGitDirectory, "index"),
    GIT_OBJECT_DIRECTORY: path.join(hostileGitDirectory, "objects"),
    GIT_ALTERNATE_OBJECT_DIRECTORIES: path.join(hostileGitDirectory, "objects"),
    GIT_COMMON_DIR: hostileGitDirectory,
    GIT_NAMESPACE: "ambient",
    GIT_CONFIG_COUNT: "3",
    GIT_CONFIG_KEY_0: "commit.gpgsign",
    GIT_CONFIG_VALUE_0: "true",
    GIT_CONFIG_KEY_1: "core.autocrlf",
    GIT_CONFIG_VALUE_1: "true",
    GIT_CONFIG_KEY_2: "core.fileMode",
    GIT_CONFIG_VALUE_2: "false",
  });
  assert.equal(initialized.status, 0, initialized.stderr);

  assert.equal(
    execFileSync("git", ["-C", hostileGitRoot, "rev-parse", "HEAD"], {encoding: "utf8"}).trim(),
    ambientHead,
  );
  assert.equal(
    sha256(fs.readFileSync(path.join(hostileGitDirectory, "index"))),
    ambientIndexSha256,
    "initializer changed the ambient Git index",
  );
  assert.equal(
    fileTreeDigest(path.join(hostileGitDirectory, "objects")),
    ambientObjectsSha256,
    "initializer changed the ambient Git object store",
  );
  assert.equal(
    execFileSync("git", ["-C", hostileGitRoot, "status", "--porcelain"], {encoding: "utf8"}).trim(),
    "",
  );

  const git = (...arguments_) => execFileSync("git", ["-C", applicationRoot, ...arguments_], {
    encoding: "utf8",
  }).trim();
  assert.equal(git("branch", "--show-current"), "main");
  assert.equal(git("rev-list", "--parents", "--max-count=1", "HEAD").split(/\s+/).length, 1);
  assert.equal(git("status", "--porcelain"), "");

  const current = filesystemInventory(applicationRoot, expectedPaths);
  const committed = committedInventory(applicationRoot, path.join(applicationRoot, ".git"));
  assertSameInventory(expected, current, "Fixture source inventory");
  assertSameInventory(expected, committed, "Fixture commit inventory");
  assert.equal(committed.find((record) => record.path === "bin/setup")?.mode, "100755");
  assert.deepEqual(committed.map((record) => record.path), expectedPaths);
  assert.equal(
    fs.readFileSync(path.join(applicationRoot, "ordinary.txt"), "utf8"),
    "trailing whitespace stays exact  \n",
  );

  const customRoot = path.join(harnessRoot, "custom-application");
  const customInitialized = runInitializer("custom-application");
  assert.equal(customInitialized.status, 0, customInitialized.stderr);
  assert.equal(execFileSync("git", ["-C", customRoot, "branch", "--show-current"], {
    encoding: "utf8",
  }).trim(), "main");
  assertSameInventory(expected, filesystemInventory(customRoot, expectedPaths), "Custom-path source inventory");
  assertSameInventory(
    expected,
    committedInventory(customRoot, path.join(customRoot, ".git")),
    "Custom-path commit inventory",
  );

  console.log("Generated application initialization contract passed.");
} catch (error) {
  if (!(error instanceof PrerequisiteError)) throw error;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  process.umask(originalUmask);
  fs.rmSync(temporaryRoot, {recursive: true, force: true});
}
