import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  buildFrontmatter,
  deriveTitle,
  formatDateWithOffset,
  yamlString,
} from "./frontmatter-lib.mjs";

const ROOT = process.cwd();
const BLOG_ROOT = path.join(ROOT, "src", "data", "blog");
const REQUIRED = ["title", "pubDatetime", "description"];

function printHelp() {
  console.log(`Usage:
  node scripts/fill-frontmatter.mjs [files...]   补全指定文件
  node scripts/fill-frontmatter.mjs --all        扫描并补全 src/data/blog 下全部笔记
  node scripts/fill-frontmatter.mjs --staged     补全本次暂存的博客笔记并重新 git add

Fills the required frontmatter (title / pubDatetime / description) only when a
field is missing. Files that already have all required fields are left untouched.
Files whose name starts with "_" are skipped (mirrors the content loader glob).`);
}

// Mirror the content loader glob "**/[^_]*.md" under src/data/blog.
function isBlogMarkdown(relPath) {
  const norm = relPath.split(path.sep).join("/");
  return (
    norm.startsWith("src/data/blog/") &&
    norm.endsWith(".md") &&
    !path.basename(norm).startsWith("_")
  );
}

function walkMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !entry.name.startsWith("_")
    ) {
      out.push(full);
    }
  }
  return out;
}

// Backfill a single file. Returns { changed, added }.
function fillFile(absPath) {
  const original = fs.readFileSync(absPath, "utf8");
  const title = deriveTitle(absPath);

  // No frontmatter block at all -> prepend a complete one.
  if (!original.startsWith("---")) {
    fs.writeFileSync(absPath, buildFrontmatter({ title }) + original, "utf8");
    return { changed: true, added: [...REQUIRED] };
  }

  // Has a frontmatter block -> insert only the missing required keys, leaving
  // everything else byte-for-byte untouched.
  const lines = original.split("\n");
  let close = -1;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") {
      close = i;
      break;
    }
  }
  if (close === -1) {
    // Opening "---" without a close: treat the file as bodied and prepend.
    fs.writeFileSync(absPath, buildFrontmatter({ title }) + original, "utf8");
    return { changed: true, added: [...REQUIRED] };
  }

  const fmLines = lines.slice(1, close);
  const has = key => fmLines.some(line => new RegExp(`^${key}:`).test(line));

  const inserts = [];
  if (!has("title")) inserts.push(`title: ${yamlString(title)}`);
  if (!has("pubDatetime"))
    inserts.push(`pubDatetime: ${formatDateWithOffset(new Date())}`);
  if (!has("description"))
    inserts.push(`description: ${yamlString(`Notes about ${title}`)}`);

  if (inserts.length === 0) return { changed: false, added: [] };

  const next = [...lines.slice(0, close), ...inserts, ...lines.slice(close)];
  fs.writeFileSync(absPath, next.join("\n"), "utf8");
  return { changed: true, added: inserts.map(line => line.split(":")[0]) };
}

function stagedBlogFiles() {
  const out = execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACM", "-z"],
    { encoding: "utf8" }
  );
  return out
    .split("\0")
    .filter(Boolean)
    .filter(isBlogMarkdown)
    .map(rel => path.join(ROOT, rel));
}

function main() {
  const argv = process.argv.slice(2);

  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  let targets;
  let restage = false;

  if (argv.includes("--all")) {
    targets = walkMarkdown(BLOG_ROOT);
  } else if (argv.includes("--staged")) {
    targets = stagedBlogFiles();
    restage = true;
  } else {
    targets = argv
      .filter(arg => !arg.startsWith("--"))
      .map(arg => path.resolve(ROOT, arg))
      .filter(abs => isBlogMarkdown(path.relative(ROOT, abs)));
  }

  const changedPaths = [];
  for (const abs of targets) {
    if (!fs.existsSync(abs)) continue;
    const { changed, added } = fillFile(abs);
    if (changed) {
      changedPaths.push(abs);
      console.log(`✓ ${path.relative(ROOT, abs)} (+${added.join(", ")})`);
    }
  }

  if (changedPaths.length === 0) return;

  if (restage) {
    execFileSync("git", ["add", "--", ...changedPaths], { stdio: "inherit" });
  }

  console.log(`frontmatter: filled ${changedPaths.length} file(s)`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`fill-frontmatter error: ${message}`);
  process.exit(1);
}
