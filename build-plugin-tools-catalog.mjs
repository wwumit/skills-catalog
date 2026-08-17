// build-plugin-tools-catalog.mjs
// 从 catalog.json 派生 dsh-plugin-tools 线级目录（发布质量工具箱 6 技能）。
// 用法：node build-plugin-tools-catalog.mjs（需先有 catalog.json）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const main = JSON.parse(readFileSync(join(__dirname, 'catalog.json'), 'utf8'))
const TOOLS_NAMES = new Set([
  'expert2skill', 'skill-compliance', 'dependency-scan', 'malware-scan',
  'bundle-lint', 'runtime-probe',
])

const skills = main.skills.filter((s) => TOOLS_NAMES.has(s.name))
const repos = main.repos.filter((r) => skills.some((s) => s.repo === r.fullName))

const line = {
  schemaVersion: main.schemaVersion,
  disclosureSchemaVersion: main.disclosureSchemaVersion,
  updatedAt: main.updatedAt,
  line: 'plugin-tools',
  skills,
  repos,
}

writeFileSync(join(__dirname, 'catalog-plugin-tools.json'), JSON.stringify(line, null, 2) + '\n')
console.log(`catalog-plugin-tools.json: ${skills.length} skills -> ${skills.map((s) => s.name).join(', ')}`)
