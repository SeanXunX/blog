import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const BLOG_ROOT = path.join(ROOT, "src", "data", "blog");
const CONFIG_PATH = path.join(ROOT, "src", "config.ts");

function printHelp() {
  console.log(`Usage:\n  pnpm new:post \"Post Title\" [--dir 子目录] [--tags tag1,tag2] [--desc 描述] [--draft true|false] [--date ISO8601] [--dry-run]\n\nNotes:\n  - 默认 draft 为 true\n  - 默认发布时间为上海时区（+08:00）\n\nExamples:\n  pnpm new:post \"Value Iteration\"\n  pnpm new:post \"策略迭代\" --dir \"强化学习的数学原理\" --tags learning,RL\n`);
}

function formatDateWithOffset(date, offsetHours = 8) {
  const shifted = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const hour = String(shifted.getUTCHours()).padStart(2, "0");
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
  const second = String(shifted.getUTCSeconds()).padStart(2, "0");
  const millisecond = String(shifted.getUTCMilliseconds()).padStart(3, "0");

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}+08:00`;
}

function parseArgs(argv) {
  const options = {
    dir: "",
    tags: ["others"],
    desc: "",
    draft: false,
    date: formatDateWithOffset(new Date()),
    dryRun: false,
  };

  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--help" || current === "-h") {
      options.help = true;
      continue;
    }

    if (current === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (current.startsWith("--")) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new Error(`Missing value for ${current}`);
      }

      if (current === "--dir") {
        options.dir = next;
      } else if (current === "--tags") {
        options.tags = next
          .split(",")
          .map(item => item.trim())
          .filter(Boolean);
      } else if (current === "--desc") {
        options.desc = next.trim();
      } else if (current === "--draft") {
        const value = next.trim().toLowerCase();
        if (value !== "true" && value !== "false") {
          throw new Error("--draft must be true or false");
        }
        options.draft = value === "true";
      } else if (current === "--date") {
        const parsedDate = new Date(next);
        if (Number.isNaN(parsedDate.getTime())) {
          throw new Error("--date must be a valid date string");
        }
        options.date = formatDateWithOffset(parsedDate);
      } else {
        throw new Error(`Unknown option: ${current}`);
      }

      index += 1;
      continue;
    }

    positional.push(current);
  }

  return { positional, options };
}

function sanitizeFileName(input) {
  const value = input
    .trim()
    .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (value.length > 0) return value;

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");

  return `post-${stamp}`;
}

function getAuthor() {
  try {
    const text = fs.readFileSync(CONFIG_PATH, "utf8");
    const match = text.match(/author:\s*"([^"]+)"/);
    return match?.[1] ?? "Anonymous";
  } catch {
    return "Anonymous";
  }
}

function toFrontmatter({ title, author, date, draft, tags, description }) {
  const yamlTags = tags.length > 0 ? tags : ["others"];
  const safeDescription = description || `Notes about ${title}`;

  return `---\ntitle: ${title}\nauthor: ${author}\npubDatetime: ${date}\nfeatured: false\ndraft: ${String(draft)}\ntags:\n${yamlTags.map(tag => `  - ${tag}`).join("\n")}\ndescription: ${safeDescription}\n---\n\n`;
}

function ensureUniquePath(targetPath) {
  if (!fs.existsSync(targetPath)) return targetPath;

  const parsed = path.parse(targetPath);
  let count = 1;
  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name}-${count}${parsed.ext}`);
    if (!fs.existsSync(candidate)) return candidate;
    count += 1;
  }
}

function main() {
  const { positional, options } = parseArgs(process.argv.slice(2));

  if (options.help || positional.length === 0) {
    printHelp();
    process.exit(positional.length === 0 ? 1 : 0);
  }

  const title = positional.join(" ").trim();
  const author = getAuthor();
  const relativeDir = options.dir ? options.dir.trim() : "";
  const targetDir = path.join(BLOG_ROOT, relativeDir);

  const fileName = `${sanitizeFileName(title)}.md`;
  const targetPath = ensureUniquePath(path.join(targetDir, fileName));

  const frontmatter = toFrontmatter({
    title,
    author,
    date: options.date,
    draft: options.draft,
    tags: options.tags,
    description: options.desc,
  });

  const body = `## ${title}\n\n`;

  if (options.dryRun) {
    console.log(`[dry-run] Would create: ${path.relative(ROOT, targetPath)}`);
    console.log(frontmatter + body);
    return;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, frontmatter + body, "utf8");

  console.log(`Created: ${path.relative(ROOT, targetPath)}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
}
