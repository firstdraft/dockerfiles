import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {parseEnv} from "node:util";

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const {readConfiguration, requiresApiToken, run} = require(
  path.join(repositoryRoot, "bin", "firstdraft"),
);
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "drawing-board-wrapper-"));

try {
  const testRepository = path.join(temporaryRoot, "repository");
  const devcontainerDirectory = path.join(testRepository, ".devcontainer");
  const fakeCli = path.join(temporaryRoot, "firstdraft");
  const probeOutput = path.join(temporaryRoot, "probe.json");
  const versionProbeOutput = path.join(temporaryRoot, "version-probe.json");
  fs.mkdirSync(devcontainerDirectory, {recursive: true});
  fs.copyFileSync(
    path.join(repositoryRoot, ".devcontainer", "agent-versions.env"),
    path.join(devcontainerDirectory, "agent-versions.env"),
  );
  const cliVersion = parseEnv(fs.readFileSync(
    path.join(devcontainerDirectory, "agent-versions.env"), "utf8",
  )).FIRSTDRAFT_CLI_VERSION;
  fs.writeFileSync(fakeCli, `#!/usr/bin/env node
const fs = require("node:fs");
const arguments_ = process.argv.slice(2);
const probe = {
  apiUrl: process.env.FIRSTDRAFT_API_URL,
  arguments_,
  tokenIsExpected: process.env.FIRSTDRAFT_API_TOKEN === "test-token",
  tokenPresent: Boolean(process.env.FIRSTDRAFT_API_TOKEN),
  legacyUrlPresent: Object.prototype.hasOwnProperty.call(process.env, "FIRSTDRAFT_BASE_URL"),
  pluginOptionsPresent: [
    "CLAUDE_PLUGIN_OPTION_API_TOKEN",
    "CLAUDE_PLUGIN_OPTION_API_URL",
    "CLAUDE_PLUGIN_OPTION_api_token",
    "CLAUDE_PLUGIN_OPTION_api_url",
  ].some((key) => Object.prototype.hasOwnProperty.call(process.env, key)),
};
if (arguments_.length === 1 && arguments_[0] === "--version") {
  fs.writeFileSync(process.env.FIRSTDRAFT_TEST_VERSION_OUTPUT, JSON.stringify(probe));
  process.stdout.write("firstdraft " +
    (process.env.FIRSTDRAFT_TEST_CLI_VERSION ?? ${JSON.stringify(cliVersion)}) + "\\n");
  if (process.env.FIRSTDRAFT_TEST_CLI_NOTICE) {
    process.stderr.write("A benign version notice.\\n");
  }
  process.exit(0);
}
fs.writeFileSync(process.env.FIRSTDRAFT_TEST_OUTPUT, JSON.stringify(probe));
`);
  fs.chmodSync(fakeCli, 0o755);

  const writeEnvironment = ({
    apiToken = "",
    apiUrl = "https://firstdraft.com",
    extra = "",
    mode = 0o600,
  } = {}) => {
    const environmentPath = path.join(testRepository, ".env");
    fs.writeFileSync(
      environmentPath,
      `FIRSTDRAFT_API_URL=${apiUrl}\n${"FIRSTDRAFT_API_TOKEN"}=${apiToken}\n${extra}`,
    );
    fs.chmodSync(environmentPath, mode);
  };
  const testEnvironment = {
    ...process.env,
    FIRSTDRAFT_API_TOKEN: "ambient-production-token",
    FIRSTDRAFT_API_URL: "https://wrong.example.com",
    FIRSTDRAFT_BASE_URL: "https://legacy.example.com",
    CLAUDE_PLUGIN_OPTION_API_TOKEN: "uppercase-token",
    CLAUDE_PLUGIN_OPTION_API_URL: "https://uppercase.example.com",
    CLAUDE_PLUGIN_OPTION_api_token: "lowercase-token",
    CLAUDE_PLUGIN_OPTION_api_url: "https://lowercase.example.com",
    FIRSTDRAFT_TEST_OUTPUT: probeOutput,
    FIRSTDRAFT_TEST_VERSION_OUTPUT: versionProbeOutput,
  };

  assert.throws(
    () => readConfiguration(testRepository),
    /.env is missing/,
  );

  const symlinkTarget = path.join(testRepository, "environment-target");
  fs.writeFileSync(
    symlinkTarget,
    `FIRSTDRAFT_API_URL=https://firstdraft.com\n${"FIRSTDRAFT_API_TOKEN"}=\n`,
  );
  fs.chmodSync(symlinkTarget, 0o600);
  fs.symlinkSync(symlinkTarget, path.join(testRepository, ".env"));
  assert.throws(
    () => readConfiguration(testRepository),
    /must be a regular file, not a link/,
  );
  fs.unlinkSync(path.join(testRepository, ".env"));
  fs.unlinkSync(symlinkTarget);

  writeEnvironment();
  assert.deepEqual(readConfiguration(testRepository), {
    apiToken: "",
    apiUrl: "https://firstdraft.com",
  });
  assert.equal(requiresApiToken(["plan", "push"]), true);
  assert.equal(requiresApiToken(["plan", "push", "--help"]), false);
  assert.equal(requiresApiToken(["plan", "init", "--name", "Test"]), false);
  assert.equal(requiresApiToken(["generate", "uuid"]), false);
  assert.equal(requiresApiToken(["future", "network-command"]), true);
  assert.equal(requiresApiToken(["--version"]), false);
  await assert.rejects(
    run({
      arguments_: ["plan", "push"],
      downstreamCli: fakeCli,
      environment: testEnvironment,
      root: testRepository,
      stdio: "ignore",
    }),
    /FIRSTDRAFT_API_TOKEN is blank/,
  );
  assert.equal(fs.existsSync(probeOutput), false);

  writeEnvironment({apiToken: "test-token"});
  const result = await run({
    arguments_: ["plan", "push"],
    downstreamCli: fakeCli,
    environment: {...testEnvironment, FIRSTDRAFT_TEST_CLI_NOTICE: "1"},
    root: testRepository,
    stdio: "ignore",
  });
  assert.deepEqual(result, {signal: null, status: 0});
  assert.deepEqual(JSON.parse(fs.readFileSync(probeOutput, "utf8")), {
    apiUrl: "https://firstdraft.com",
    arguments_: ["plan", "push"],
    legacyUrlPresent: false,
    pluginOptionsPresent: false,
    tokenIsExpected: true,
    tokenPresent: true,
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(versionProbeOutput, "utf8")), {
    apiUrl: "https://firstdraft.com",
    arguments_: ["--version"],
    legacyUrlPresent: false,
    pluginOptionsPresent: false,
    tokenIsExpected: true,
    tokenPresent: true,
  });

  writeEnvironment();
  const localResult = await run({
    arguments_: ["plan", "init", "--name", "Test"],
    downstreamCli: fakeCli,
    environment: testEnvironment,
    root: testRepository,
    stdio: "ignore",
  });
  assert.deepEqual(localResult, {signal: null, status: 0});
  assert.deepEqual(JSON.parse(fs.readFileSync(probeOutput, "utf8")), {
    apiUrl: "https://firstdraft.com",
    arguments_: ["plan", "init", "--name", "Test"],
    legacyUrlPresent: false,
    pluginOptionsPresent: false,
    tokenIsExpected: false,
    tokenPresent: false,
  });
  assert.deepEqual(JSON.parse(fs.readFileSync(versionProbeOutput, "utf8")), {
    apiUrl: "https://firstdraft.com",
    arguments_: ["--version"],
    legacyUrlPresent: false,
    pluginOptionsPresent: false,
    tokenIsExpected: false,
    tokenPresent: false,
  });

  const injectionMarker = path.join(temporaryRoot, "injected");
  writeEnvironment({extra: `UNEXPECTED=$(touch ${injectionMarker})\n`});
  assert.throws(
    () => readConfiguration(testRepository),
    /must contain only FIRSTDRAFT_API_URL and FIRSTDRAFT_API_TOKEN/,
  );
  assert.equal(fs.existsSync(injectionMarker), false);

  writeEnvironment({apiToken: "test-token", mode: 0o644});
  assert.throws(() => readConfiguration(testRepository), /mode 0600/);

  writeEnvironment({apiToken: "test-token", apiUrl: "https://staging.firstdraft.com"});
  await assert.rejects(
    run({
      arguments_: ["plan", "compile"],
      downstreamCli: fakeCli,
      environment: testEnvironment,
      root: testRepository,
      stdio: "ignore",
    }),
    /FIRSTDRAFT_API_URL in .env must be https:\/\/firstdraft\.com\./,
  );

  writeEnvironment({apiToken: "test-token"});
  await assert.rejects(
    run({
      arguments_: ["--version"],
      downstreamCli: fakeCli,
      environment: {...testEnvironment, FIRSTDRAFT_TEST_CLI_VERSION: "9.9.9"},
      root: testRepository,
      stdio: "ignore",
    }),
    {message: `the standalone First Draft CLI must be exactly ${cliVersion}.`},
  );
} finally {
  fs.rmSync(temporaryRoot, {force: true, recursive: true});
}

process.stdout.write("First Draft wrapper checks passed.\n");
