import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const {readAgentSkills} = await import(pathToFileURL(resolve(process.env.DRAWING_BOARD_PATH ?? process.cwd(), ".devcontainer/agent-skills.mjs")));

const [checkout, claude, codex] = process.argv.slice(2);
const skills = readAgentSkills(checkout, { claude, codex });
const probe = mkdtempSync(join(tmpdir(), "drawing-board-claude-discovery-"));
try {
  const config = join(probe, ".claude");
  const root = join(config, "skills");
  mkdirSync(root, { recursive: true });
  for (const skill of skills) symlinkSync(skill.source, join(root, skill.name));
  const log = join(probe, "discovery.log");
  const result = spawnSync("claude", [
    "--init-only", "--setting-sources", "user",
    "--settings", '{"disableAllHooks":true}',
    "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
    "--debug-file", log,
  ], {
    cwd: probe,
    env: { PATH: process.env.PATH, HOME: probe, CLAUDE_CONFIG_DIR: config },
    encoding: "utf8",
    timeout: 30_000,
  });
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  const diagnosticChanged = "Claude discovery diagnostics changed; inspect the installed client and update this probe";
  assert.ok(existsSync(log), diagnosticChanged);
  const debug = readFileSync(log, "utf8");
  const scan = debug.match(/Loading skills from: [^\n]*/)?.[0];
  const catalog = debug.match(/Loaded \d+ unique skills \([^\n]*\)/)?.[0];
  assert.ok(scan && catalog, diagnosticChanged);
  assert.ok(scan.includes(`user=${root}, project=[]`), "Claude must scan the isolated user Skill directory");
  assert.ok(catalog.includes(`user: ${skills.length},`),
    "Claude must discover every installed First Draft Skill without a model turn");
  console.log("Claude Skill catalog: " + skills.map(({ name }) => name).join(", "));
} finally {
  rmSync(probe, { recursive: true, force: true });
}
