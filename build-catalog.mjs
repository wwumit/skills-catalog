#!/usr/bin/env node
/**
 * build-catalog.js — 从 3 个发布仓生成 catalog.json（供 dsh-skill-hub 插件消费）
 *
 * 用法: node build-catalog.js [--out catalog.json]
 * 数据源: ../skills-compliance-intl, ../skills-stock, ../skills-tools 的 skills 目录下的 SKILL.md
 * 精选清单: ./curated.json（增删技能只改这个文件）
 * 产物: catalog.json（列表 + 每技能描述/版本/仓库 + 文件清单）
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(__dirname, '..')
const REPOS = ['skills-compliance-intl', 'skills-stock', 'skills-tools']
const GH_OWNER = 'wwumit'

function parseFrontmatter(txt) {
  if (!txt.startsWith('---')) return null
  const end = txt.indexOf('\n---', 3)
  if (end === -1) return null
  const fm = txt.slice(3, end)
  const name = fm.match(/^\s*name:\s*["']?([^\s"']+)/m)?.[1]
  const desc = fm.match(/description:\s*[|>]?\s*\n?\s*([^\n]+)/)?.[1]?.trim()
  return { name, description: desc || '' }
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

const catalog = { schemaVersion: 1, updatedAt: new Date().toISOString(), skills: [] }

for (const repo of REPOS) {
  for (const skill of collectSkills(join(BASE, repo))) {
    if (!curatedNames.has(skill.name)) continue
    const fm = parseFrontmatter(skill.raw)
    catalog.skills.push({
      name: skill.name,
      description: fm?.description || skill.raw.slice(0, 200),
      repo: GH_OWNER + '/' + repo,
      version: skill.version,
      files: skill.files,
    })
  }
}

catalog.skills.sort((a, b) => a.name.localeCompare(b.name))
const out = join(__dirname, 'catalog.json')
writeFileSync(out, JSON.stringify(catalog, null, 2))
console.log(`✅ catalog.json 生成: ${catalog.skills.length} 个精选技能 → ${out}`)
console.log('   类别分布:', catalog.skills.reduce((acc, s) => ((acc[s.repo] = (acc[s.repo] || 0) + 1), acc), {}))
