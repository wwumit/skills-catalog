// build-office-catalog.mjs
// 从 catalog.json 派生 dsh-office 线级目录（办公效率：excel2insights + sum2slides-pro）。
// 用法：node build-office-catalog.mjs（需先有 catalog.json）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const main = JSON.parse(readFileSync(join(__dirname, 'catalog.json'), 'utf8'))
const OFFICE_NAMES = new Set(['excel2insights', 'sum2slides-pro'])

const skills = main.skills.filter((s) => OFFICE_NAMES.has(s.name))
const repos = main.repos.filter((r) => skills.some((s) => s.repo === r.fullName))

const line = {
  schemaVersion: main.schemaVersion,
  disclosureSchemaVersion: main.disclosureSchemaVersion,
  updatedAt: main.updatedAt,
  line: 'office',
  skills,
  repos,
}

writeFileSync(join(__dirname, 'catalog-office.json'), JSON.stringify(line, null, 2) + '\n')
console.log(`catalog-office.json: ${skills.length} skills -> ${skills.map((s) => s.name).join(', ')}`)
