import { readdir, readFile } from "node:fs/promises"
import { extname, join, relative, resolve } from "node:path"

const root = resolve(process.argv[2] || ".")
const sourceRoots = ["app", "components", "features"].map(directory => join(root, directory))
const forbidden = /[\p{Extended_Pictographic}\u2190-\u21ff\u2705\u2713-\u2716\u274c]/u
const ignoredDirectories = new Set(["node_modules", ".next", "dist", "coverage"])
const violations = []

async function walk(directory) {
  let entries
  try { entries = await readdir(directory, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else if ([".ts", ".tsx"].includes(extname(entry.name))) {
      const lines = (await readFile(path, "utf8")).split("\n")
      lines.forEach((line, index) => { if (forbidden.test(line)) violations.push(`${relative(root, path)}:${index + 1}`) })
    }
  }
}

await Promise.all(sourceRoots.map(walk))
if (violations.length) {
  console.error("Emoji, text arrows, or checkmark glyphs found in UI source:")
  violations.forEach(violation => console.error(`  ${violation}`))
  process.exit(1)
}
console.log("UI glyph check passed")
