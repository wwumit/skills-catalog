#!/usr/bin/env node
/**
 * build-catalog.js — 从 3 个发布仓生成 catalog.json（供 dsh-skill-hub 插件消费）
 *
 * 用法: node build-catalog.js [--out catalog.json]
 * 数据源: ../skills-compliance-intl, ../skills-stock, ../skills-tools 的 skills 目录下的 SKILL.md
 * 精选清单: ./curated.json（增删技能只改这个文件）
 * 产物: catalog.json
 *   - 列表 + 每技能描述/版本/仓库 + 文件清单
 *   - fullName（对齐验证层 verified.json 映射键，仓库级）
 *   - skillFullName（技能级完整路径，同仓混合披露时精确匹配用）
 *   - disclosure（开放数据层，camelCase 形态，对齐市场索引字段契约）
 *   - disclosureSchemaVersion（独立 fail-closed 版本）
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(__dirname, '..')
const REPOS = ['skills-compliance-intl', 'skills-stock', 'skills-tools']
const GH_OWNER = 'wwumit'
const DISCLOSURE_SCHEMA_VERSION = '0.2'

function parseFrontmatter(txt) {
  if (!txt.startsWith('---')) return null
  const end = txt.indexOf('\n---', 3)
  if (end === -1) return null
  const fm = txt.slice(3, end)
  const name = fm.match(/^\s*name:\s*["']?([^\s"']+)/m)?.[1]
  const desc = fm.match(/description:\s*[|>]?\s*\n?\s*([^\n]+)/)?.[1]?.trim()
  return { name, description: desc || '', disclosure: parseDisclosure(fm) }
}

/** 解析 SKILL.md frontmatter 中的 disclosure 块（snake_case 声明形态 → camelCase 输出） */
function parseDisclosure(fm) {
  const lines = fm.split('\n')
  const startIdx = lines.findIndex((l) => /^disclosure:\s*$/.test(l))
  if (startIdx === -1) return null
  const block = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const l = lines[i]
    if (/^\S/.test(l) || /^---/.test(l)) break // 顶层键或 frontmatter 结束
    block.push(l)
  }
  const get = (key) => {
    const hit = block.find((l) => l.match(new RegExp(`^\\s{2}${key}:\\s*(.*)$`)))
    return hit ? hit.replace(new RegExp(`^\\s{2}${key}:\\s*`), '').trim() : undefined
  }
  const cloudRaw = get('cloud')
  const networkRaw = get('network')
  const offlineRaw = get('offline_mode')
  const jurisRaw = get('jurisdiction')
  const retention = get('retention')
  // api_keys 列表：缩进 4 空格的 "- env:" 条目，storage 在后续缩进 6 空格行
  const apiKeys = []
  let current = null
  for (const line of block) {
    const envHit = line.match(/^\s{4}-\s*env:\s*["']?([^"'\s]+)/)
    if (envHit) {
      current = { env: envHit[1] }
      apiKeys.push(current)
      continue
    }
    const storageHit = current && line.match(/^\s{6}storage:\s*["']?([^"'\s]+)/)
    if (storageHit) current.storage = storageHit[1]
  }
  const parseArr = (raw) => {
    if (raw === undefined || raw === '[]') return []
    try { return JSON.parse(raw) } catch { return [] }
  }
  return {
    cloud: cloudRaw === 'true',
    network: parseArr(networkRaw),
    offlineMode: offlineRaw === 'true',
    apiKeys,
    jurisdiction: parseArr(jurisRaw),
    retention: retention?.replace(/["']/g, '') || 'none',
  }
}

function collectSkills(repoDir) {
  const skillsDir = join(repoDir, 'skills')
  if (!existsSync(skillsDir)) return []
  return readdirSync(skillsDir)
    .filter((n) => statSync(join(skillsDir, n)).isDirectory())
    .map((name) => {
      const dir = join(skillsDir, name)
      const skillMd = join(dir, 'SKILL.md')
      const pkg = existsSync(join(dir, 'package.json'))
        ? JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8'))
        : {}
      const files = []
      for (const f of readdirSync(dir, { recursive: true })) {
        const p = join(dir, f)
        if (statSync(p).isFile()) files.push(String(f))
      }
      return {
        name,
        version: pkg.version || '0.0.0',
        files: files.filter((f) => !f.includes('.DS_Store')),
        raw: existsSync(skillMd) ? readFileSync(skillMd, 'utf-8') : '',
      }
    })
}

const curated = JSON.parse(readFileSync(join(__dirname, 'curated.json'), 'utf-8'))
const curatedNames = new Set(curated.curated)

const catalog = {
  schemaVersion: 1,
  disclosureSchemaVersion: DISCLOSURE_SCHEMA_VERSION,
  updatedAt: new Date().toISOString(),
  skills: [],
}

for (const repo of REPOS) {
  for (const skill of collectSkills(join(BASE, repo))) {
    if (!curatedNames.has(skill.name)) continue
    const fm = parseFrontmatter(skill.raw)
    catalog.skills.push({
      name: skill.name,
      fullName: GH_OWNER + '/' + repo, // 对齐验证层 fullName 映射键（技能所在发布仓）
      skillFullName: GH_OWNER + '/' + repo + '/skills/' + skill.name, // 技能级完整路径（同仓混合披露时精确匹配用）
      description: fm?.description || skill.raw.slice(0, 200),
      repo: GH_OWNER + '/' + repo,
      version: skill.version,
      disclosure: fm?.disclosure || null,
      files: skill.files,
    })
  }
}

catalog.skills.sort((a, b) => a.name.localeCompare(b.name))

// 仓级聚合披露（第二颗粒度）：cloud:true 优先（fail-safe），与 STANDARD §9 规则一致
function aggregateRepoDisclosures(skills) {
  const byRepo = new Map()
  for (const s of skills) {
    if (!byRepo.has(s.fullName)) byRepo.set(s.fullName, [])
    byRepo.get(s.fullName).push(s)
  }
  const repos = []
  for (const [fullName, items] of byRepo) {
    const cloudSkills = items.filter((i) => i.disclosure?.cloud)
    const localSkills = items.filter((i) => !i.disclosure?.cloud)
    const union = (key) => {
      const set = new Set()
      for (const i of items) {
        const v = i.disclosure?.[key]
        if (Array.isArray(v)) v.forEach((x) => set.add(x))
      }
      return [...set]
    }
    const apiKeys = []
    const seenEnv = new Set()
    for (const i of cloudSkills) {
      for (const k of i.disclosure?.apiKeys || []) {
        if (k.env && !seenEnv.has(k.env)) { seenEnv.add(k.env); apiKeys.push(k) }
      }
    }
    repos.push({
      fullName,
      skillCount: items.length,
      disclosure: {
        cloud: cloudSkills.length > 0,          // 仓内任一云端 → cloud:true（fail-safe）
        network: union('network'),
        offlineMode: items.some((i) => i.disclosure?.offlineMode),
        apiKeys,
        jurisdiction: union('jurisdiction'),
        retention: [...new Set(cloudSkills.map((i) => i.disclosure?.retention).filter(Boolean))],
      },
      cloudSkills: cloudSkills.map((i) => i.name),
      localSkills: localSkills.map((i) => i.name),
    })
  }
  repos.sort((a, b) => a.fullName.localeCompare(b.fullName))
  return repos
}
catalog.repos = aggregateRepoDisclosures(catalog.skills)

const out = join(__dirname, 'catalog.json')
writeFileSync(out, JSON.stringify(catalog, null, 2))
const cloudCount = catalog.skills.filter((s) => s.disclosure?.cloud).length
console.log(`✅ catalog.json 生成: ${catalog.skills.length} 个精选技能 → ${out}`)
console.log(`   disclosureSchemaVersion: ${DISCLOSURE_SCHEMA_VERSION} | 云端披露 ${cloudCount} 个 | 本地披露 ${catalog.skills.length - cloudCount} 个 | 仓级聚合 ${catalog.repos.length} 仓`)
console.log('   类别分布:', catalog.skills.reduce((acc, s) => ((acc[s.repo] = (acc[s.repo] || 0) + 1), acc), {}))
