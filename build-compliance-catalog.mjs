// build-compliance-catalog.mjs
// 从 catalog.json 派生 dsh-compliancehub 线级目录（跨境合规 9 个技能）。
// 主 catalog.json 是全量登记层（开放数据层，市场消费）；本线级目录供 dsh-compliancehub 插件分发。
// 用法：node build-compliance-catalog.mjs（需先有 catalog.json）
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const main = JSON.parse(readFileSync(join(__dirname, 'catalog.json'), 'utf8'))
const COMPLIANCE_REPO = 'wwumit/skills-compliance-intl'

const skills = main.skills.filter((s) => s.repo === COMPLIANCE_REPO)
const repos = main.repos.filter((r) => r.fullName === COMPLIANCE_REPO)

const line = {
  schemaVersion: main.schemaVersion,
  disclosureSchemaVersion: main.disclosureSchemaVersion,
  updatedAt: main.updatedAt,
  line: 'compliance',
  skills,
  repos,
}

writeFileSync(join(__dirname, 'catalog-compliance.json'), JSON.stringify(line, null, 2) + '\n')
console.log(`catalog-compliance.json: ${skills.length} skills from ${COMPLIANCE_REPO}`)
