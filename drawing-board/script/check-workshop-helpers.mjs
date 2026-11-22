import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Offline checks for the Codespaces copies of the laptop kit's sign-in helpers. Stubs stand in for
// curl, neonctl and render; no check signs in or reaches a provider.
const repository = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const workshop = path.join(repository, ".devcontainer/workshop");
const temporary = realpathSync(mkdtempSync(path.join(tmpdir(), "drawing-board-workshop-")));
const home = path.join(temporary, "home");
const stubs = path.join(temporary, "stubs");
const write = (file, content, mode = 0o644) => {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content, { mode });
};
const environment = { HOME: home, PATH: `${stubs}:/usr/bin:/bin`, WORKSHOP_NO_OPEN: "1", LC_ALL: "C" };
const helper = (name, args, extra = {}) => {
  const result = spawnSync("bash", [path.join(workshop, name), ...args], {
    cwd: home, env: { ...environment, ...extra }, encoding: "utf8", timeout: 60_000,
  });
  assert.equal(result.error, undefined);
  return { status: result.status, output: result.stdout + result.stderr };
};
const mode = (file) => statSync(file).mode & 0o777;

try {
  mkdirSync(home, { recursive: true });
  for (const name of ["auth.sh", "cloudinary.sh", "firstdraft.sh", "git-identity.sh", "login.sh", "neon-key.sh", "open.sh", "render-workspace.sh"]) {
    const syntax = spawnSync("bash", ["-n", path.join(workshop, name)], { encoding: "utf8" });
    assert.equal(syntax.status, 0, syntax.stderr);
    assert.equal(mode(path.join(workshop, name)) & 0o111, 0o111, `${name} must be executable`);
  }
  const skill = readFileSync(path.join(workshop, "skills/workshop-signin/SKILL.md"), "utf8");
  assert.match(skill, /^---\nname: workshop-signin\n/);
  assert.match(skill, /^disable-model-invocation: true$/m, "Only the attendee starts the sign-in Skill");

  // Cloudinary: the attendee's three pasted values become one private CLOUDINARY_URL, verified
  // over stdin, and the form is deleted. The secret never reaches the output.
  const secret = "fixtureSecretValue123";
  const key = "123456789012345";
  write(path.join(stubs, "curl"), `#!/bin/sh
config="$(cat)"
case "$config" in *"${key}:${secret}"*) ;; *) echo "credentials missing from stdin" >&2; exit 9 ;; esac
case "$*" in *"${secret}"*) echo "secret on the command line" >&2; exit 9 ;; esac
printf '%s' "\${CURL_TEST_STATUS:-200}"
`, 0o755);
  let result = helper("cloudinary.sh", ["open"]);
  assert.match(result.output, /^NOT OPENED: /);
  const form = path.join(home, ".workshop/cloudinary-key.txt");
  assert.equal(mode(form), 0o600);
  assert.equal(mode(path.join(home, ".workshop")), 0o700);
  result = helper("cloudinary.sh", ["save"]);
  assert.match(result.output, /^NEXT: the file needs the cloud name/);
  const formText = readFileSync(form, "utf8")
    .replace(/^CLOUD_NAME=$/m, "CLOUD_NAME=CLOUDINARY_URL=cloudinary://<your_api_key>:<your_api_secret>@fixture-cloud")
    .replace(/^API_KEY=$/m, `API_KEY= ${key} `)
    .replace(/^API_SECRET=$/m, `API_SECRET="${secret}"`);
  writeFileSync(form, formText);
  result = helper("cloudinary.sh", ["save"], { CURL_TEST_STATUS: "401" });
  assert.match(result.output, /^INVALID: Cloudinary did not accept/);
  assert(existsSync(form), "A rejected key keeps the form for correction");
  result = helper("cloudinary.sh", ["save"]);
  assert.match(result.output, /^SAVED: /);
  assert(!result.output.includes(secret));
  assert.equal(existsSync(form), false);
  const saved = path.join(home, ".workshop/cloudinary.env");
  assert.equal(readFileSync(saved, "utf8"), `CLOUDINARY_URL=cloudinary://${key}:${secret}@fixture-cloud\n`);
  assert.equal(mode(saved), 0o600);
  assert.match(helper("cloudinary.sh", ["check"]).output, /^saved in /);
  const app = path.join(temporary, "app");
  write(path.join(app, "config/application.rb"), "");
  result = helper("cloudinary.sh", ["install", app]);
  assert.match(result.output, /^NOT NEEDED: /);
  write(path.join(app, "config/initializers/cloudinary.rb"), "");
  write(path.join(app, ".env.development.local"), "OTHER=kept\nCLOUDINARY_URL=old\n");
  result = helper("cloudinary.sh", ["install", app]);
  assert.match(result.output, /^INSTALLED: /);
  assert(!result.output.includes(secret));
  assert.equal(readFileSync(path.join(app, ".env.development.local"), "utf8"),
    `OTHER=kept\nCLOUDINARY_URL=cloudinary://${key}:${secret}@fixture-cloud\n`);
  assert.equal(mode(path.join(app, ".env.development.local")), 0o600);

  // Neon: the pasted API key reaches neonctl on stdin only. The stub keeps the saved key beside
  // itself and answers 'profile list' and 'me' as neonctl 8 does: an organization key saves, but
  // 'me' cannot read the user, so save keeps the form and asks for a personal key.
  const neonKey = "napi_fixturefixturefixturefixture";
  const neonOrgKey = "napi_orgfixtureorgfixtureorgfixture";
  const neonSaved = path.join(stubs, "neon-saved-key");
  write(path.join(stubs, "neonctl"), `#!/bin/sh
case "$*" in *"${neonKey}"* | *"${neonOrgKey}"*) echo "key on the command line" >&2; exit 9 ;; esac
case "$*" in
  "profile create DEFAULT --api-key -")
    key=$(cat)
    case "$key" in "${neonKey}" | "${neonOrgKey}") printf '%s' "$key" > "${neonSaved}" ;; *) echo "key missing from stdin" >&2; exit 9 ;; esac ;;
  "profile list --output json")
    if [ ! -f "${neonSaved}" ]; then auth=- scope=-
    elif [ "$(cat "${neonSaved}")" = "${neonOrgKey}" ]; then auth="api key" scope="org org-fixture"
    else auth="api key" scope=account; fi
    printf '[{"active":"*","name":"DEFAULT","auth":"%s","scope":"%s"}]\\n' "$auth" "$scope" ;;
  "me --output json")
    [ -f "${neonSaved}" ] || { echo "me while signed out starts a browser sign-in" >&2; exit 9; }
    [ "$(cat "${neonSaved}")" = "${neonOrgKey}" ] && { echo "ERROR: not allowed for organization API keys" >&2; exit 1; }
    echo '{"email":"attendee@example.com"}' ;;
  *) echo "unexpected: $*" >&2; exit 9 ;;
esac
`, 0o755);
  assert.equal(helper("auth.sh", ["check", "neon"]).output, "[FAIL] neon: not signed in\n");
  helper("neon-key.sh", ["open"]);
  const neonForm = path.join(home, ".workshop/neon-key.txt");
  assert.equal(mode(neonForm), 0o600);
  assert.match(helper("neon-key.sh", ["save"]).output, /^NEXT: /);
  writeFileSync(neonForm, readFileSync(neonForm, "utf8").replace(/^NEON_API_KEY=$/m, `NEON_API_KEY=${neonOrgKey}`));
  result = helper("neon-key.sh", ["save"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /^INVALID: .*organization or project API key.*personal key/);
  assert(!result.output.includes(neonOrgKey));
  assert.equal(existsSync(neonForm), true);
  assert.match(helper("auth.sh", ["check", "neon"]).output, /^\[FAIL\] neon: the saved key is an organization or project API key/);
  writeFileSync(neonForm, readFileSync(neonForm, "utf8").replace(/^NEON_API_KEY=.*$/m, `NEON_API_KEY=${neonKey}`));
  result = helper("neon-key.sh", ["save"]);
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /^SAVED: /);
  assert(!result.output.includes(neonKey));
  assert.equal(existsSync(neonForm), false);
  assert.equal(helper("auth.sh", ["check", "neon"]).output, "[PASS] neon: signed in\n");

  // login.sh returns the device link and code while the sign-in keeps waiting in the background.
  write(path.join(stubs, "render"), `#!/bin/sh
echo "Complete login in the Render Dashboard: https://dashboard.render.com/device-authorization/ABCD-EFGH-IJKL-MNOP"
echo "Docs: https://docs.render.com/cli"
exec sleep 30
`, 0o755);
  result = helper("login.sh", ["start", "render"]);
  assert.match(result.output, /^URL: https:\/\/dashboard\.render\.com\/device-authorization\/ABCD-EFGH-IJKL-MNOP$/m);
  assert.match(result.output, /^CODE: ABCD-EFGH-IJKL-MNOP$/m);
  assert.match(result.output, /^WAITING: /m);
  assert.match(helper("login.sh", ["status", "render"]).output, /^WAITING: /);
  assert.match(helper("login.sh", ["stop", "render"]).output, /^STOPPED: /);
  assert.match(helper("login.sh", ["status", "render"]).output, /^ENDED: /);

  // login.sh wait lets an approved device sign-in finish saving before it checks.
  write(path.join(stubs, "revyl"), `#!/bin/sh
case "$1 $2" in
  "auth login") echo "Approve at https://app.revyl.ai/cli/device?code=WXYZ-2345"; sleep 2; touch "${path.join(temporary, "revyl-saved")}" ;;
  "auth status") [ -f "${path.join(temporary, "revyl-saved")}" ] && echo "Authenticated" || echo "Not authenticated" ;;
esac
`, 0o755);
  assert.match(helper("login.sh", ["start", "revyl"]).output, /^URL: https:\/\/app\.revyl\.ai\/cli\/device\?code=WXYZ-2345$/m);
  assert.equal(helper("login.sh", ["wait", "revyl"]).output, "[PASS] revyl: signed in\n");

  // open.sh uses VS Code's $BROWSER helper and reports when there is none.
  write(path.join(stubs, "fake-browser"), `#!/bin/sh\nprintf '%s' "$1" > "${path.join(temporary, "opened")}"\n`, 0o755);
  assert.match(helper("open.sh", ["https://example.com/a"], { BROWSER: path.join(stubs, "fake-browser") }).output, /^OPENED: /);
  assert.equal(readFileSync(path.join(temporary, "opened"), "utf8"), "https://example.com/a");
  assert.match(helper("open.sh", ["https://example.com/a"]).output, /^NOT OPENED: /);

  // First Draft: the helpers run the CLI inside the plugin that 'claude plugin list --json' locates.
  // The stub CLI answers with the CLI's fixed sentences; a file stands in for the person's approval.
  const plugin = path.join(temporary, "plugin-cache/firstdraft/0.10.0");
  const firstdraftState = path.join(temporary, "firstdraft-state");
  write(path.join(stubs, "claude"), `#!/bin/sh
[ "$*" = "plugin list --json" ] || { echo "unexpected: $*" >&2; exit 9; }
if [ -f "${path.join(temporary, "plugin-removed")}" ]; then echo '[]'; exit 0; fi
# A plugin from a local catalog loads in place: Claude Code then reports that folder as readFromFolder.
if [ -f "${path.join(temporary, "plugin-in-place")}" ]; then
  printf '[{"id":"firstdraft@firstdraft-skills","version":"0.10.0","scope":"user","enabled":true,"installPath":"%s","readFromFolder":"%s"}]\\n' "${path.join(temporary, "stale-copy")}" "${plugin}"
  exit 0
fi
printf '[{"id":"firstdraft@firstdraft-skills","version":"0.10.0","scope":"user","enabled":true,"installPath":"%s"}]\\n' "${plugin}"
`, 0o755);
  write(path.join(plugin, "bin/firstdraft"), `#!/bin/sh
state="${firstdraftState}"
origin=https://firstdraft.com
case "$*" in
  start)
    echo "First Draft CLI 0.10.0 with plugin 0.10.0."
    if [ -f "$state/old-cli" ]; then echo "Unknown command." >&2; echo "Run 'firstdraft --help' for usage." >&2; exit 2; fi
    if [ -f "$state/token" ]; then
      echo "This computer has no saved login for $origin."
      echo "FIRSTDRAFT_API_TOKEN is set, so the CLI uses that token in place of any saved login for $origin, and no login is needed."
      if [ -f "$state/outage" ]; then echo '{"error":"account_unavailable","detail":"Try again in a minute."}' >&2; exit 1; fi
      echo "Not logged in: First Draft did not accept FIRSTDRAFT_API_TOKEN. Ask the person to replace it or unset it; while it is set, the CLI uses no saved login."
      echo '{"error":"authentication_required"}' >&2; exit 1
    fi
    if [ -f "$state/saved" ]; then
      echo "This computer has a saved login for $origin."
      if [ -f "$state/outage" ]; then echo '{"error":"account_unavailable","detail":"Try again in a minute."}' >&2; exit 1; fi
      if [ -f "$state/rejected" ]; then
        echo "Not logged in: First Draft did not accept the saved login for $origin."
        echo '{"error":"authentication_required"}' >&2; exit 1
      fi
      echo "Ready: First Draft accepted this computer's login."; exit 0
    fi
    echo "This computer has no saved login for $origin."
    echo "To log in, run 'firstdraft login --no-wait'. It prints a link and a code: show both to the person and ask them to approve the login in their browser."
    echo "When the person says they approved, run 'firstdraft login --finish', then run 'firstdraft start' again."
    echo '{"error":"authentication_required"}' >&2; exit 1 ;;
  "login --no-wait")
    if [ -f "$state/no-link" ]; then echo "To log in to $origin, ask the person to open this link in a browser, and approve:"; exit 0; fi
    touch "$state/waiting"
    echo "To log in to $origin, ask the person to open this link in a browser, check that the page shows the code WXYZ-2345, and approve:"
    echo "$origin/oauth/device?user_code=WXYZ-2345"
    echo "The link and the code expire in 10 minutes, at 2026-11-21 12:10 UTC."
    echo "When the person says they approved, run 'firstdraft login --finish'." ;;
  "login --finish")
    if [ ! -f "$state/waiting" ]; then
      echo "No login is waiting: this computer has no device login for $origin that has not ended."
      echo "Run 'firstdraft start' to see whether this computer is logged in."; exit 1
    fi
    if [ -f "$state/unsaved" ]; then
      echo "First Draft: an update is available (plugin 0.10.1; this setup has plugin 0.10.0). Tell the person the update steps are at https://firstdraft.com/update" >&2
      echo '{"error":"login_failed","detail":"First Draft approved the login, but the CLI could not save it."}' >&2; exit 1
    fi
    if [ ! -f "$state/approved" ]; then
      echo "Still waiting: First Draft has not confirmed that the person approved the login."
      echo "The link and the code expire at 2026-11-21 12:10 UTC. When the person says they approved, run 'firstdraft login --finish' again."; exit 1
    fi
    rm "$state/waiting"; touch "$state/saved"
    echo "Logged in: this computer is now logged in to $origin."
    echo "Run 'firstdraft start' again." ;;
  *) echo "unexpected: $*" >&2; exit 9 ;;
esac
`, 0o755);
  mkdirSync(firstdraftState);
  const noLogin = "[FAIL] firstdraft: This computer has no saved login for https://firstdraft.com.\n";
  const outage = "[FAIL] firstdraft: firstdraft start failed: account_unavailable: Try again in a minute.\n";
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output, noLogin);
  result = helper("login.sh", ["start", "firstdraft"]);
  assert.equal(result.status, 0, result.output);
  assert.equal(result.output, [
    "URL: https://firstdraft.com/oauth/device?user_code=WXYZ-2345",
    "CODE: WXYZ-2345",
    "The link and the code expire in 10 minutes, at 2026-11-21 12:10 UTC.",
    "After the attendee approves it, run: bash ~/.workshop/login.sh wait firstdraft",
  ].join("\n") + "\n", "login.sh prints the link and the code, not the CLI's own next steps");
  assert.equal(helper("login.sh", ["wait", "firstdraft"]).output,
    "Still waiting: First Draft has not confirmed that the person approved the login.\n" + noLogin);
  // A login the CLI could not finish shows its handled error before the check, after any update line.
  writeFileSync(path.join(firstdraftState, "unsaved"), "");
  assert.equal(helper("login.sh", ["wait", "firstdraft"]).output,
    "NOT FINISHED: login_failed: First Draft approved the login, but the CLI could not save it.\n" + noLogin);
  rmSync(path.join(firstdraftState, "unsaved"));
  writeFileSync(path.join(firstdraftState, "approved"), "");
  assert.equal(helper("login.sh", ["wait", "firstdraft"]).output,
    "Logged in: this computer is now logged in to https://firstdraft.com.\n[PASS] firstdraft: signed in\n");
  // Waiting again after the login finished says nothing is waiting, and the check still passes.
  assert.equal(helper("login.sh", ["wait", "firstdraft"]).output,
    "No login is waiting: this computer has no device login for https://firstdraft.com that has not ended.\n" +
    "[PASS] firstdraft: signed in\n");
  assert.match(helper("login.sh", ["status", "firstdraft"]).output, /^usage: login\.sh start\|wait firstdraft$/m);
  // The CLI's link is the line that holds only a URL; without one, start reports no link.
  writeFileSync(path.join(firstdraftState, "no-link"), "");
  result = helper("login.sh", ["start", "firstdraft"]);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /^NO LINK: /);
  rmSync(path.join(firstdraftState, "no-link"));
  // The helper runs the CLI that Claude Code loads, which for a local catalog is the catalog's folder.
  writeFileSync(path.join(temporary, "plugin-in-place"), "");
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output, "[PASS] firstdraft: signed in\n");
  rmSync(path.join(temporary, "plugin-in-place"));
  // A token in the environment that First Draft rejects is the reason, even with no saved login.
  writeFileSync(path.join(firstdraftState, "token"), "");
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output,
    "[FAIL] firstdraft: Not logged in: First Draft did not accept FIRSTDRAFT_API_TOKEN. Ask the person to replace it or unset it; while it is set, the CLI uses no saved login.\n");
  // With only that token and no saved login, an outage is still the reason.
  writeFileSync(path.join(firstdraftState, "outage"), "");
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output, outage);
  rmSync(path.join(firstdraftState, "outage"));
  rmSync(path.join(firstdraftState, "token"));
  // When First Draft does not answer, that and the CLI's advice are the reason, not a missing login.
  writeFileSync(path.join(firstdraftState, "outage"), "");
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output, outage);
  rmSync(path.join(firstdraftState, "outage"));
  writeFileSync(path.join(firstdraftState, "rejected"), "");
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output,
    "[FAIL] firstdraft: Not logged in: First Draft did not accept the saved login for https://firstdraft.com.\n");
  writeFileSync(path.join(firstdraftState, "old-cli"), "");
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output, "[FAIL] firstdraft: firstdraft start failed: Unknown command.\n");
  writeFileSync(path.join(temporary, "plugin-removed"), "");
  result = helper("firstdraft.sh", ["--version"]);
  assert.equal(result.status, 127);
  assert.match(result.output, /^First Draft CLI is unavailable: Claude Code has no First Draft plugin installed\./);
  assert.match(helper("auth.sh", ["check", "firstdraft"]).output, /^\[FAIL\] firstdraft: firstdraft start failed: First Draft CLI is unavailable: /);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log("Workshop sign-in helper checks passed.");
