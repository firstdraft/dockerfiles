#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";

const repositoryRoot = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const refresher = path.join(repositoryRoot, "script", "refresh-codespaces-private-port");
const {postAttachCommand} = JSON.parse(fs.readFileSync(path.join(repositoryRoot, ".devcontainer", "devcontainer.json"), "utf8"));
assert.equal(typeof postAttachCommand, "string", "The post-attach command must use the Dev Container shell lifecycle.");
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "drawing-board-port-refresh-test-"));
const workspaceRoot = path.join(temporaryRoot, "workspace with spaces");
const mockBin = path.join(temporaryRoot, "bin");
const statePath = path.join(temporaryRoot, "visibility");
const logPath = path.join(temporaryRoot, "gh.log");
const privateAttemptsPath = path.join(temporaryRoot, "private-attempts");
const listenerAttemptsPath = path.join(temporaryRoot, "listener-attempts");
const codespacesEnvPath = path.join(temporaryRoot, "codespaces.env");
const malformedEnvPath = path.join(temporaryRoot, "malformed.env");
const missingNameEnvPath = path.join(temporaryRoot, "missing-name.env");

function writeExecutable(name, contents) {
  const destination = path.join(mockBin, name);
  fs.writeFileSync(destination, contents, {mode: 0o755});
  fs.chmodSync(destination, 0o755);
}

function run(changes = {}, pathValue = `${mockBin}:/usr/bin:/bin`) {
  return spawnSync("/bin/sh", ["-c", postAttachCommand], {
    cwd: workspaceRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: pathValue,
      PORT_REFRESH_LOG: logPath,
      PORT_REFRESH_STATE: statePath,
      PORT_REFRESH_PRIVATE_ATTEMPTS: privateAttemptsPath,
      PORT_REFRESH_LISTENER_ATTEMPTS: listenerAttemptsPath,
      CODESPACES: "true",
      CODESPACE_NAME: "drawing-board-test",
      CODESPACES_ENV_FILE: codespacesEnvPath,
      GH_TOKEN: "",
      GITHUB_TOKEN: "",
      ...changes,
    },
  });
}

function logLines() {
  if (!fs.existsSync(logPath)) return [];
  return fs.readFileSync(logPath, "utf8").trim().split("\n").filter(Boolean);
}

try {
  fs.mkdirSync(path.join(workspaceRoot, "script"), {recursive: true});
  fs.copyFileSync(refresher, path.join(workspaceRoot, "script", "refresh-codespaces-private-port"));
  fs.chmodSync(path.join(workspaceRoot, "script", "refresh-codespaces-private-port"), 0o755);
  fs.mkdirSync(mockBin);
  writeExecutable(
    "gh",
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >>"$PORT_REFRESH_LOG"
if [[ "\${MOCK_REQUIRE_GH_TOKEN:-false}" == "true" && "\${GH_TOKEN:-}" != "ghu_drawing_board_test" ]]; then
  exit 41
fi
if [[ "$1 $2" == "codespace ports" && "\${3:-}" != "visibility" ]]; then
  state="$(<"$PORT_REFRESH_STATE")"
  [[ "$state" == "missing" ]] || printf '%s\\n' "$state"
  exit 0
fi
if [[ "$1 $2 $3" == "codespace ports visibility" ]]; then
  visibility="\${4#*:}"
  if [[ "$visibility" == "public" && "\${MOCK_PUBLIC_FAILURE:-false}" == "true" ]]; then
    exit 42
  fi
  if [[ "$visibility" == "public" && "\${MOCK_PUBLIC_REMOVES_PORT:-false}" == "true" ]]; then
    printf '%s' missing >"$PORT_REFRESH_STATE"
    exit 0
  fi
  if [[ "$visibility" == "private" && "$(<"$PORT_REFRESH_STATE")" == "missing" ]]; then
    exit 44
  fi
  if [[ "$visibility" == "private" && "\${MOCK_PRIVATE_FAILURES:-0}" != "0" ]]; then
    attempts=0
    [[ ! -f "$PORT_REFRESH_PRIVATE_ATTEMPTS" ]] || attempts="$(<"$PORT_REFRESH_PRIVATE_ATTEMPTS")"
    attempts="$((attempts + 1))"
    printf '%s' "$attempts" >"$PORT_REFRESH_PRIVATE_ATTEMPTS"
    if (( attempts <= MOCK_PRIVATE_FAILURES )); then
      exit 43
    fi
  fi
  printf '%s' "$visibility" >"$PORT_REFRESH_STATE"
  exit 0
fi
exit 64
`,
  );
  writeExecutable(
    "ss",
    `#!/usr/bin/env bash
if [[ -n "\${MOCK_LISTENER_ERROR_AFTER:-}" ]]; then
  attempts=0
  [[ ! -f "$PORT_REFRESH_LISTENER_ATTEMPTS" ]] || attempts="$(<"$PORT_REFRESH_LISTENER_ATTEMPTS")"
  attempts="$((attempts + 1))"
  printf '%s' "$attempts" >"$PORT_REFRESH_LISTENER_ATTEMPTS"
  if (( attempts > MOCK_LISTENER_ERROR_AFTER )); then
    exit 2
  fi
fi
case "\${MOCK_LISTENER:-false}" in
  true) printf '%s\\n' 'LISTEN 0 4096 0.0.0.0:3000 0.0.0.0:*'; exit 0 ;;
  false) exit 0 ;;
  error) exit 2 ;;
esac
`,
  );
  fs.writeFileSync(codespacesEnvPath, "CODESPACE_NAME=drawing-board-test\nCODESPACE_NAME=drawing-board-test\nGITHUB_TOKEN=ghu_drawing_board_test\n", {mode: 0o600});

  fs.writeFileSync(statePath, "private");
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Refreshing the unbound Codespaces port 3000 registration/);
  assert.match(first.stdout, /private visibility confirmed/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.deepEqual(logLines(), [
    "codespace ports --codespace drawing-board-test --json sourcePort,visibility --jq .[] | select(.sourcePort == 3000) | .visibility",
    "codespace ports visibility 3000:public --codespace drawing-board-test",
    "codespace ports visibility 3000:private --codespace drawing-board-test",
    "codespace ports --codespace drawing-board-test --json sourcePort,visibility --jq .[] | select(.sourcePort == 3000) | .visibility",
  ]);

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  const protectedEnvironmentToken = run({MOCK_REQUIRE_GH_TOKEN: "true"});
  assert.equal(protectedEnvironmentToken.status, 0, protectedEnvironmentToken.stderr);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  const protectedEnvironmentName = run({CODESPACE_NAME: "", MOCK_REQUIRE_GH_TOKEN: "true"});
  assert.equal(protectedEnvironmentName.status, 0, protectedEnvironmentName.stderr);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  const unboundPortRemoval = run({MOCK_PUBLIC_REMOVES_PORT: "true"});
  assert.equal(unboundPortRemoval.status, 0, unboundPortRemoval.stderr);
  assert.match(unboundPortRemoval.stdout, /cleared the unbound port 3000 registration/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "missing");
  assert.equal(logLines().filter((line) => line.includes(" visibility ")).length, 2);

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  fs.rmSync(listenerAttemptsPath, {force: true});
  const unboundPortUnknownListener = run({MOCK_PUBLIC_REMOVES_PORT: "true", MOCK_LISTENER_ERROR_AFTER: "1"});
  assert.notEqual(unboundPortUnknownListener.status, 0);
  assert.match(unboundPortUnknownListener.stderr, /Could not determine whether port 3000 has a listener/);
  assert.match(unboundPortUnknownListener.stderr, /Could not verify the no-listener condition/);
  assert.doesNotMatch(unboundPortUnknownListener.stderr, /URGENT/);
  assert.doesNotMatch(unboundPortUnknownListener.stdout, /cleared the unbound port/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "missing");

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  const repeated = run();
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.equal(logLines().filter((line) => line.includes(" visibility ")).length, 2);

  fs.writeFileSync(logPath, "");
  const listener = run({MOCK_LISTENER: "true"});
  assert.notEqual(listener.status, 0);
  assert.match(listener.stderr, /Refusing to re-register port 3000 while a listener is active/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.equal(logLines().some((line) => line.includes(" visibility ")), false);

  fs.writeFileSync(logPath, "");
  const listenerProbeError = run({MOCK_LISTENER: "error"});
  assert.notEqual(listenerProbeError.status, 0);
  assert.match(listenerProbeError.stderr, /Could not determine whether port 3000 has a listener/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.equal(logLines().some((line) => line.includes(" visibility ")), false);

  fs.writeFileSync(statePath, "public");
  fs.writeFileSync(logPath, "");
  const exposedListener = run({MOCK_LISTENER: "true"});
  assert.notEqual(exposedListener.status, 0);
  assert.match(exposedListener.stderr, /Restoring forwarded port 3000 from public to private/);
  assert.match(exposedListener.stderr, /Refusing to re-register port 3000 while a listener is active/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.equal(logLines().filter((line) => line.includes(" visibility ")).length, 1);

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  const failedPublic = run({MOCK_PUBLIC_FAILURE: "true"});
  assert.notEqual(failedPublic.status, 0);
  assert.doesNotMatch(failedPublic.stderr, /URGENT/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.deepEqual(logLines().filter((line) => line.includes(" visibility ")), [
    "codespace ports visibility 3000:public --codespace drawing-board-test",
  ]);

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  fs.rmSync(privateAttemptsPath, {force: true});
  const transientPrivateFailure = run({MOCK_PRIVATE_FAILURES: "1"});
  assert.notEqual(transientPrivateFailure.status, 0);
  assert.match(transientPrivateFailure.stderr, /Port refresh was interrupted; restoring private visibility/);
  assert.doesNotMatch(transientPrivateFailure.stderr, /URGENT/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  assert.equal(logLines().filter((line) => line.includes("visibility 3000:private")).length, 2);

  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  fs.rmSync(privateAttemptsPath, {force: true});
  const permanentPrivateFailure = run({MOCK_PRIVATE_FAILURES: "2"});
  assert.notEqual(permanentPrivateFailure.status, 0);
  assert.match(permanentPrivateFailure.stderr, /URGENT: Codespaces did not restore private visibility/);
  assert.equal(fs.readFileSync(statePath, "utf8"), "public");

  fs.writeFileSync(statePath, "missing");
  fs.writeFileSync(logPath, "");
  const missing = run();
  assert.equal(missing.status, 0, missing.stderr);
  assert.match(missing.stdout, /has no stale registration/);
  assert.equal(logLines().some((line) => line.includes(" visibility ")), false);

  const missingWithListener = run({MOCK_LISTENER: "true"});
  assert.notEqual(missingWithListener.status, 0);
  assert.match(missingWithListener.stderr, /active listener but no forwarded-port registration/);

  const missingWithUnknownListener = run({MOCK_LISTENER: "error"});
  assert.notEqual(missingWithUnknownListener.status, 0);
  assert.match(missingWithUnknownListener.stderr, /Could not determine whether port 3000 has a listener/);

  const missingTokenSource = run({CODESPACES_ENV_FILE: path.join(temporaryRoot, "missing.env")});
  assert.notEqual(missingTokenSource.status, 0);
  assert.match(missingTokenSource.stderr, /did not export GITHUB_TOKEN/);

  fs.writeFileSync(malformedEnvPath, "not-a-codespaces-environment\n");
  const malformedTokenSource = run({CODESPACES_ENV_FILE: malformedEnvPath});
  assert.notEqual(malformedTokenSource.status, 0);
  assert.match(malformedTokenSource.stderr, /did not provide one usable GITHUB_TOKEN/);

  fs.writeFileSync(logPath, "");
  const outside = run({CODESPACES: "false", CODESPACE_NAME: ""});
  assert.equal(outside.status, 0, outside.stderr);
  assert.match(outside.stdout, /skipped outside GitHub Codespaces/);
  assert.deepEqual(logLines(), []);

  fs.writeFileSync(missingNameEnvPath, "GITHUB_TOKEN=ghu_drawing_board_test\n");
  const missingName = run({CODESPACE_NAME: "", CODESPACES_ENV_FILE: missingNameEnvPath});
  assert.notEqual(missingName.status, 0);
  assert.match(missingName.stderr, /did not provide CODESPACE_NAME/);

  const realSs = spawnSync("ss", ["--version"], {encoding: "utf8"});
  if (realSs.status === 0) {
    const realBin = path.join(temporaryRoot, "real-bin");
    fs.mkdirSync(realBin);
    fs.copyFileSync(path.join(mockBin, "gh"), path.join(realBin, "gh"));
    fs.chmodSync(path.join(realBin, "gh"), 0o755);
    const realPath = `${realBin}:${process.env.PATH}`;
    const server = net.createServer();
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(3000, "127.0.0.1", resolve);
    });
    fs.writeFileSync(statePath, "private");
    fs.writeFileSync(logPath, "");
    const realListener = run({}, realPath);
    assert.notEqual(realListener.status, 0);
    assert.match(realListener.stderr, /Refusing to re-register port 3000 while a listener is active/);
    assert.equal(logLines().some((line) => line.includes(" visibility ")), false);
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

    fs.writeFileSync(logPath, "");
    const realNoListener = run({}, realPath);
    assert.equal(realNoListener.status, 0, realNoListener.stderr);
    assert.equal(fs.readFileSync(statePath, "utf8"), "private");
  }

  const archiveRoot = path.join(workspaceRoot, ".firstdraft", "design");
  const archivedScriptRoot = path.join(archiveRoot, "script");
  const archivedRefresher = path.join(archivedScriptRoot, "refresh-codespaces-private-port");
  fs.mkdirSync(archivedScriptRoot, {recursive: true});
  fs.writeFileSync(archivedRefresher, "#!/bin/sh\nexit 99\n", {mode: 0o755});
  fs.writeFileSync(statePath, "private");
  fs.writeFileSync(logPath, "");
  const preferredRoot = run();
  assert.equal(preferredRoot.status, 0, preferredRoot.stderr);
  assert.match(preferredRoot.stdout, /private visibility confirmed/);

  const rootFailure = run({MOCK_PUBLIC_FAILURE: "true"});
  assert.equal(rootFailure.status, 42, rootFailure.stderr);

  fs.rmSync(archivedScriptRoot, {recursive: true});
  fs.renameSync(path.join(workspaceRoot, "script"), archivedScriptRoot);
  for (let attach = 0; attach < 2; attach += 1) {
    fs.writeFileSync(statePath, "private");
    fs.writeFileSync(logPath, "");
    const adoptedRoot = run();
    assert.equal(adoptedRoot.status, 0, adoptedRoot.stderr);
    assert.match(adoptedRoot.stdout, /private visibility confirmed/);
    assert.equal(fs.readFileSync(statePath, "utf8"), "private");
    assert.equal(logLines().filter((line) => line.includes(" visibility ")).length, 2);
  }

  fs.writeFileSync(logPath, "");
  const adoptedListener = run({MOCK_LISTENER: "true"});
  assert.notEqual(adoptedListener.status, 0);
  assert.match(adoptedListener.stderr, /Refusing to re-register port 3000 while a listener is active/);
  assert.match(adoptedListener.stderr, /rerun .*\.firstdraft\/design\/script\/refresh-codespaces-private-port/);
  assert.equal(logLines().some((line) => line.includes(" visibility ")), false);
  assert.equal(fs.readFileSync(statePath, "utf8"), "private");

  const adoptedOutside = run({CODESPACES: "false"});
  assert.equal(adoptedOutside.status, 0, adoptedOutside.stderr);
  assert.match(adoptedOutside.stdout, /skipped outside GitHub Codespaces/);

  const archivedFailure = run({MOCK_PUBLIC_FAILURE: "true"});
  assert.equal(archivedFailure.status, 42, archivedFailure.stderr);

  fs.chmodSync(archivedRefresher, 0o644);
  for (const archivePresent of [true, false]) {
    if (!archivePresent) fs.rmSync(archiveRoot, {recursive: true});
    for (const listener of ["false", "true"]) {
      fs.writeFileSync(logPath, "");
      const noExecutableHelper = run({MOCK_LISTENER: listener});
      assert.equal(noExecutableHelper.status, 0, noExecutableHelper.stderr);
      assert.equal(noExecutableHelper.stdout, "");
      assert.equal(noExecutableHelper.stderr, "");
      assert.deepEqual(logLines(), []);
      assert.equal(fs.readFileSync(statePath, "utf8"), "private");
    }
  }
  console.log("Codespaces post-attach contracts passed with root, archived, and absent helpers, preserving helper failures.");
} finally {
  fs.rmSync(temporaryRoot, {recursive: true, force: true});
}
