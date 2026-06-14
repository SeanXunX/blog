import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, "src", "config.ts");

export function formatDateWithOffset(date, offsetHours = 8) {
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

export function getAuthor() {
  try {
    const text = fs.readFileSync(CONFIG_PATH, "utf8");
    const match = text.match(/author:\s*"([^"]+)"/);
    return match?.[1] ?? "Anonymous";
  } catch {
    return "Anonymous";
  }
}

// Derive a title from the file name (without extension). A deliberate file name
// is a more predictable title than the first in-body heading, which is often a
// section header rather than the document title.
export function deriveTitle(filePath) {
  return path.basename(filePath, path.extname(filePath)).trim();
}

// Quote a value only when it would otherwise be invalid or misparsed YAML.
// Simple titles stay bare (matching existing posts), while values containing
// ":", "#", a leading indicator char, reserved words, etc. get double-quoted.
export function yamlString(value) {
  const s = String(value);
  const needsQuoting =
    s === "" ||
    /^[\s>|@`"'%&*!?#:{}[\],-]/.test(s) || // YAML indicator as first char
    /:(\s|$)/.test(s) || // colon that would start a mapping
    /\s#/.test(s) || // inline comment
    /[\n\r\t]/.test(s) ||
    /\s$/.test(s) || // trailing whitespace
    /^(true|false|null|yes|no|on|off|~)$/i.test(s) || // reserved scalars
    /^[-+]?[0-9][0-9.eE+-]*$/.test(s); // would parse as a number
  if (!needsQuoting) return s;
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Build a full frontmatter block matching the shape used across the blog.
export function buildFrontmatter({
  title,
  author = getAuthor(),
  date = formatDateWithOffset(new Date()),
  draft = false,
  tags = ["others"],
  description = "",
}) {
  const yamlTags = tags.length > 0 ? tags : ["others"];
  const safeDescription = description || `Notes about ${title}`;

  return [
    "---",
    `title: ${yamlString(title)}`,
    `author: ${yamlString(author)}`,
    `pubDatetime: ${date}`,
    "featured: false",
    `draft: ${String(draft)}`,
    "tags:",
    ...yamlTags.map(tag => `  - ${yamlString(tag)}`),
    `description: ${yamlString(safeDescription)}`,
    "---",
    "",
    "",
  ].join("\n");
}
