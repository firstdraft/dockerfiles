import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createRequire} from "node:module";
import {parseEnv} from "node:util";

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const {childEnvironment, credentialsPath, hasSavedLogin, run} = require(
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
  const pins = parseEnv(fs.readFileSync(path.join(devcontainerDirectory, "agent-versions.env"), "utf8"));
  const cliVersion = pins.FIRSTDRAFT_CLI_VERSION;
  const production = pins.FIRSTDRAFT_CLI_DEFAULT_API_URL;
  assert.equal(production, "https://firstdraft.com");
  assert.equal(fs.existsSync(path.join(repositoryRoot, ".env.example")), false,
    "First Draft sign-in is the CLI's saved login; no .env token path remains");

  fs.writeFileSync(fakeCli, `#!/usr/bin/env node
const fs = require("node:fs");
const arguments_ = process.argv.slice(2);
const probe = {
  apiUrl: process.env.FIRSTDRAFT_API_URL,
  arguments_,
  tokenPresent: Object.prototype.hasOwnProperty.call(process.env, "FIRSTDRAFT_API_TOKEN"),
  stagingTokenPresent: Object.prototype.hasOwnProperty.call(process.env, "FIRSTDRAFT_STAGING_API_TOKEN"),
  home: process.env.HOME,
};
if (arguments_.length === 1 && arguments_[0] === "--version") {
  fs.writeFileSync(process.env.FIRSTDRAFT_TEST_VERSION_OUTPUT, JSON.stringify(probe));
  process.stdout.write((process.env.FIRSTDRAFT_TEST_CLI_VERSION ?? ${JSON.stringify(cliVersion)}) + "\\n");
  process.exit(0);
}
fs.writeFileSync(process.env.FIRSTDRAFT_TEST_OUTPUT, JSON.stringify(probe));
process.exit(Number(process.env.FIRSTDRAFT_TEST_EXIT ?? 0));
`);
  fs.chmodSync(fakeCli, 0o755);

  const home = path.join(temporaryRoot, "home");
  const testEnvironment = {
    ...process.env,
    HOME: home,
    FIRSTDRAFT_API_TOKEN: "ambient-production-token",
    FIRSTDRAFT_STAGING_API_TOKEN: "ambient-staging-token",
    FIRSTDRAFT_API_URL: "https://wrong.example.com",
    FIRSTDRAFT_TEST_OUTPUT: probeOutput,
    FIRSTDRAFT_TEST_VERSION_OUTPUT: versionProbeOutput,
  };
  const expectedProbe = (arguments_) => ({
    apiUrl: production,
    arguments_,
    tokenPresent: false,
    stagingTokenPresent: false,
    home,
  });

  assert.deepEqual(childEnvironment({FIRSTDRAFT_API_TOKEN: "x", OTHER: "kept"}, production), {
    FIRSTDRAFT_API_URL: production,
    OTHER: "kept",
  });

  // Every command reaches the CLI, which owns authentication through its saved login.
  for (const arguments_ of [["login", "--device"], ["plan", "push"], ["plan", "init", "--name", "Test"]]) {
    const result = await run({
      arguments_,
      downstreamCli: fakeCli,
      environment: testEnvironment,
      root: testRepository,
      stdio: "ignore",
    });
    assert.deepEqual(result, {signal: null, status: 0});
    assert.deepEqual(JSON.parse(fs.readFileSync(probeOutput, "utf8")), expectedProbe(arguments_));
    assert.deepEqual(JSON.parse(fs.readFileSync(versionProbeOutput, "utf8")), expectedProbe(["--version"]));
  }

  const failed = await run({
    arguments_: ["plan", "compile"],
    downstreamCli: fakeCli,
    environment: {...testEnvironment, FIRSTDRAFT_TEST_EXIT: "1"},
    root: testRepository,
    stdio: "ignore",
  });
  assert.deepEqual(failed, {signal: null, status: 1}, "The wrapper must return the CLI's own exit status");

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
  await assert.rejects(
    run({
      arguments_: ["--version"],
      downstreamCli: path.join(temporaryRoot, "missing"),
      environment: testEnvironment,
      root: testRepository,
      stdio: "ignore",
    }),
    /pinned standalone First Draft CLI is missing/,
  );

  // The saved-login check mirrors the CLI's credentials path and never returns the token.
  assert.equal(credentialsPath({HOME: home}), path.join(home, ".config", "firstdraft", "credentials.json"));
  assert.equal(credentialsPath({HOME: home, XDG_CONFIG_HOME: "relative"}),
    path.join(home, ".config", "firstdraft", "credentials.json"));
  const xdg = path.join(temporaryRoot, "xdg");
  assert.equal(credentialsPath({HOME: home, XDG_CONFIG_HOME: xdg}), path.join(xdg, "firstdraft", "credentials.json"));
  assert.equal(hasSavedLogin(production, {HOME: home}), false);
  const writeCredentials = (origins) => {
    const file = credentialsPath({HOME: home});
    fs.mkdirSync(path.dirname(file), {recursive: true, mode: 0o700});
    fs.writeFileSync(file, JSON.stringify({format: "firstdraft.cli-credentials/1", origins}), {mode: 0o600});
  };
  writeCredentials({"https://staging.firstdraft.com": {access_token: "staging", token_type: "Bearer"}});
  assert.equal(hasSavedLogin(production, {HOME: home}), false);
  writeCredentials({[production]: {access_token: " ", token_type: "Bearer"}});
  assert.equal(hasSavedLogin(production, {HOME: home}), false);
  writeCredentials({[production]: {access_token: "fixture-login", token_type: "Bearer"}});
  assert.equal(hasSavedLogin(production, {HOME: home}), true);
  fs.writeFileSync(credentialsPath({HOME: home}), "{not json");
  assert.throws(() => hasSavedLogin(production, {HOME: home}), SyntaxError);
} finally {
  fs.rmSync(temporaryRoot, {force: true, recursive: true});
}

process.stdout.write("First Draft wrapper checks passed.\n");
