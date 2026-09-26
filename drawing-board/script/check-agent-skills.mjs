import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const {linkAgentSkills, readAgentSkills, verifyAgentSkills, verifyCodexSkills} =
  await import(pathToFileURL(resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd(), ".devcontainer/agent-skills.mjs")));

const repository = path.resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd());
const temporary = realpathSync(mkdtempSync(path.join(tmpdir(), "firstdraft-agent-skills-")));
const cache = path.join(temporary, "cache");
const roots = { claude: path.join(temporary, "claude"), codex: path.join(temporary, "codex") };
const names = ["create-full-stack-app", "extend-app-ui", "review-ui-consistency"];
const authoringNames = { claude: names[0], codex: "firstdraft:" + names[0] };

function candidate(revision, skillNames) {
  const checkout = path.join(cache, revision);
  mkdirSync(path.join(checkout, ".claude-plugin"), { recursive: true });
  writeFileSync(path.join(checkout, ".claude-plugin", "plugin.json"), JSON.stringify({
    name: "firstdraft",
    skills: skillNames.map((name) => "./skills/" + name),
  }) + "\n");
  for (const name of skillNames) {
    const source = path.join(checkout, "skills", name);
    mkdirSync(path.join(source, "references"), { recursive: true });
    writeFileSync(path.join(source, "SKILL.md"), "---\nname: " + JSON.stringify(name) + "\n---\nFixture\n");
    writeFileSync(path.join(source, "references", "example.md"), "Canonical " + revision + " " + name + "\n");
  }
  return checkout;
}

function codexPrompt(skills) {
  return [{
    content: [{
      type: "input_text",
      text: "<skills_instructions>\n- `r0` = `" + roots.codex + "`\n" +
        skills.map(({ name, codexName }) => "- " + codexName + ": Fixture (file: r0/" + name + "/SKILL.md)").join("\n"),
    }],
  }];
}

try {
  const oneRoot = candidate("1".repeat(40), [names[0]]);
  const threeRoot = candidate("3".repeat(40), names);
  const one = readAgentSkills(oneRoot, authoringNames);
  const three = readAgentSkills(threeRoot, authoringNames);
  assert.deepEqual(three.map(({ name }) => name), names);

  linkAgentSkills(one, roots, cache);
  verifyAgentSkills(one, roots, cache);
  linkAgentSkills(three, roots, cache);
  linkAgentSkills(three, roots, cache);
  verifyAgentSkills(three, roots, cache);
  for (const { name, source } of three) {
    for (const root of Object.values(roots)) {
      assert.equal(realpathSync(path.join(root, name)), source);
      assert.equal(
        readFileSync(path.join(root, name, "references", "example.md"), "utf8"),
        readFileSync(path.join(source, "references", "example.md"), "utf8"),
      );
    }
  }

  verifyCodexSkills(three, roots.codex, codexPrompt(three));
  const aliasedCodexRoot = path.join(temporary, "linked-codex");
  symlinkSync(roots.codex, aliasedCodexRoot, "dir");
  verifyCodexSkills(three, aliasedCodexRoot, codexPrompt(three));
  assert.throws(() => verifyCodexSkills(three, roots.codex, codexPrompt(three.slice(0, 2))), /exactly one/);
  const duplicate = codexPrompt([...three, three[2]]);
  assert.throws(() => verifyCodexSkills(three, roots.codex, duplicate), /exactly one/);
  const unexpectedPath = codexPrompt(three);
  unexpectedPath[0].content[0].text = unexpectedPath[0].content[0].text.replace("r0/extend-app-ui/", "r0/another-skill/");
  assert.throws(() => verifyCodexSkills(three, roots.codex, unexpectedPath), /unexpected path/);

  const independentSkill = path.join(temporary, "independent");
  mkdirSync(independentSkill);
  symlinkSync(independentSkill, path.join(roots.claude, "user-skill"), "dir");
  writeFileSync(path.join(roots.codex, "notes.txt"), "Keep this user file\n");
  linkAgentSkills(one, roots, cache);
  verifyAgentSkills(one, roots, cache);
  for (const root of Object.values(roots)) {
    for (const name of names.slice(1)) assert.equal(lstatSync(path.join(root, name), { throwIfNoEntry: false }), undefined);
  }
  assert.equal(realpathSync(path.join(roots.claude, "user-skill")), independentSkill);
  assert.equal(readFileSync(path.join(roots.codex, "notes.txt"), "utf8"), "Keep this user file\n");

  const aliasedCache = path.join(temporary, "linked-cache");
  symlinkSync(cache, aliasedCache, "dir");
  const aliasedRoots = { claude: path.join(temporary, "alias-claude"), codex: path.join(temporary, "alias-codex") };
  for (const root of Object.values(aliasedRoots)) {
    mkdirSync(root);
    symlinkSync(path.join(aliasedCache, path.basename(oneRoot), "skills", names[0]), path.join(root, names[0]), "dir");
  }
  linkAgentSkills(three, aliasedRoots, aliasedCache);
  verifyAgentSkills(three, aliasedRoots, aliasedCache);
  linkAgentSkills(one, aliasedRoots, aliasedCache);
  verifyAgentSkills(one, aliasedRoots, aliasedCache);

  writeFileSync(path.join(roots.codex, "extend-app-ui"), "Keep existing content\n");
  const prior = readlinkSync(path.join(roots.claude, names[0]));
  assert.throws(() => linkAgentSkills(three, roots, cache), /preserving it/);
  assert.equal(readlinkSync(path.join(roots.claude, names[0])), prior);
  assert.equal(readFileSync(path.join(roots.codex, "extend-app-ui"), "utf8"), "Keep existing content\n");
  assert.equal(existsSync(path.join(roots.claude, "extend-app-ui")), false);
  rmSync(path.join(roots.codex, "extend-app-ui"));
  symlinkSync(independentSkill, path.join(roots.codex, "extend-app-ui"), "dir");
  assert.throws(() => linkAgentSkills(three, roots, cache), /unmanaged symlink/);
  assert.equal(realpathSync(path.join(roots.codex, "extend-app-ui")), independentSkill);
  rmSync(path.join(roots.codex, "extend-app-ui"));

  const malformed = candidate("4".repeat(40), [names[0]]);
  const manifestPath = path.join(malformed, ".claude-plugin", "plugin.json");
  for (const invalidSkills of [["./skills/" + names[0], "./skills/" + names[0]], ["../outside"]]) {
    writeFileSync(manifestPath, JSON.stringify({ name: "firstdraft", skills: invalidSkills }));
    assert.throws(() => readAgentSkills(malformed, authoringNames), /duplicate|unsupported/);
  }
  writeFileSync(manifestPath, JSON.stringify({ name: "firstdraft", skills: ["./skills/" + names[0]] }));
  writeFileSync(path.join(malformed, "skills", names[0], "SKILL.md"), "---\nname: wrong-name\n---\n");
  assert.throws(() => readAgentSkills(malformed, authoringNames), /differs from its directory/);
  assert.throws(() => readAgentSkills(oneRoot, { ...authoringNames, codex: "wrong:" + names[0] }), /differs from the plugin/);

  const commandRoot = candidate("command", names);
  const git = (args) => {
    const result = spawnSync("git", [
      "-c", "core.excludesFile=/dev/null", "-c", "core.hooksPath=/dev/null", "-c", "init.templateDir=", ...args,
    ], { cwd: commandRoot, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git(["init", "--quiet"]);
  git(["add", "."]);
  git(["-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "-c", "commit.gpgsign=false", "commit", "--quiet", "-m", "Fixture"]);
  const revision = git(["rev-parse", "HEAD"]);
  const movedRoot = path.join(cache, revision);
  renameSync(commandRoot, movedRoot);
  const cliArgs = [
    path.join(repository, ".devcontainer", "agent-skills.mjs"), "link",
    "--checkout", movedRoot, "--revision", revision,
    "--claude-root", roots.claude, "--codex-root", roots.codex,
    "--claude-authoring-name", authoringNames.claude, "--codex-authoring-name", authoringNames.codex,
  ];
  const result = spawnSync(process.execPath, cliArgs, { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert(result.stdout.includes(names.join(", ")));
  const wrongRevisionArgs = [...cliArgs];
  wrongRevisionArgs[wrongRevisionArgs.indexOf("--revision") + 1] = "0".repeat(40);
  const wrongRevision = spawnSync(process.execPath, wrongRevisionArgs, { encoding: "utf8" });
  assert.equal(wrongRevision.status, 1);
  assert.match(wrongRevision.stderr, /revision differs from the pin/);

  console.log("Agent Skill linking, upgrade/rollback, preservation, revision, and discovery checks passed.");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
