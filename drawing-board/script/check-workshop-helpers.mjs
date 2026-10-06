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
  for (const name of ["auth.sh", "cloudinary.sh", "git-identity.sh", "login.sh", "neon-key.sh", "open.sh", "render-workspace.sh"]) {
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

  // auth.sh reads the First Draft login without printing its token.
  const token = "fixture-firstdraft-token";
  write(path.join(home, ".config/firstdraft/credentials.json"),
    JSON.stringify({ origins: { "https://firstdraft.com": { access_token: token } } }), 0o600);
  result = helper("auth.sh", ["check", "firstdraft"]);
  assert.equal(result.output, "[PASS] firstdraft: signed in\n");
  write(path.join(home, ".config/firstdraft/credentials.json"),
    JSON.stringify({ origins: { "https://staging.firstdraft.com": { access_token: token } } }), 0o600);
  assert.equal(helper("auth.sh", ["check", "firstdraft"]).output, "[FAIL] firstdraft: not signed in\n");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

console.log("Workshop sign-in helper checks passed.");
