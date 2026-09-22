import { readFile } from "node:fs/promises"

const [englishPath, banglaPath] = process.argv.slice(2)

if (!englishPath || !banglaPath) {
  console.error("Usage: node check-locale-parity.mjs <en.json> <bn.json>")
  process.exit(2)
}

const flatten = (value, prefix = "") => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key
  return child && typeof child === "object" && !Array.isArray(child)
    ? flatten(child, path)
    : [path]
})

const [english, bangla] = await Promise.all([
  readFile(englishPath, "utf8").then(JSON.parse),
  readFile(banglaPath, "utf8").then(JSON.parse),
])

const englishKeys = new Set(flatten(english))
const banglaKeys = new Set(flatten(bangla))
const missingBangla = [...englishKeys].filter(key => !banglaKeys.has(key))
const missingEnglish = [...banglaKeys].filter(key => !englishKeys.has(key))

if (missingBangla.length || missingEnglish.length) {
  if (missingBangla.length) console.error(`Missing Bangla keys:\n${missingBangla.join("\n")}`)
  if (missingEnglish.length) console.error(`Missing English keys:\n${missingEnglish.join("\n")}`)
  process.exit(1)
}

console.log(`Locale parity passed (${englishKeys.size} messages).`)
