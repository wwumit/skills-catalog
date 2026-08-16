# 生态发布质量规范（DSH Ecosystem Publication Standards）

> 版本：v1.0（2026-08-16）
> 目的：我们的 catalog 被市场消费、规则集被 STANDARD 引用、bundle 被 dshbase 收录——**产物是生态的依赖**。
> 质量要求从"自己看着行"升级为"可被独立检查、可被消费方依赖"。本规范是"规则→检查→评分→报告"
> 引擎在自家发布管线的实例：规则（本规范）→ 检查（skill-compliance + 手动 checklist）→ 评分（门槛判定）→ 报告（catalog/发布记录）。

---

## 一、命名规范（分层命名）

| 产物类型 | 命名原则 | 示例 |
|---|---|---|
| DSH 生态工具/插件（provider、市场服务、开发工具） | 带 `dsh-` 前缀 | `dsh-compliancehub` |
| 通用技能（跨平台分发：ClawHub/SkillHub/DSH） | 功能命名，不带 dsh | `ccpa-check`、`backtest-analyzer`、`skill-compliance` |
| 开放数据层/目录 | 中性命名 | `skills-catalog`、`catalog.json` |

原则：**名字表达"产品是什么"，前缀表达"生态归属"**。技能在 DSH 生态消费但不改通用性；工具是 DSH 专属则显性归属。禁止因"看着生态"全局改名（slug/收录/下载量历史不可逆）。

## 二、发布门槛（每个产物发布前必过）

### 2.1 仓库级（GitHub 仓库）
- [ ] `LICENSE` 文件存在（MIT；GitHub 识别显示 license）
- [ ] `README.md` 存在（功能/用法/披露摘要）
- [ ] topics 含 `dsh-plugin`（DSH 生态收录信号）
- [ ] 仓库级 `CHANGELOG.md` 记录版本演进（如有多个技能，记录技能增删与版本）
- [ ] 仓库公开

### 2.2 技能级（SKILL.md）
- [ ] frontmatter：`name` / `description`（含 Use when / Trigger）/ `version` 合法
- [ ] `disclosure` 块（v0.2，D1/D3/D4 必填 + D2/D5/D6 建议）——**声明与代码一致性**（skill-compliance 检查）
- [ ] `permissions` 块（network / filesystem / env 如实声明）
- [ ] 云端技能：description 固化披露警示行（"⚠️ Cloud scoring sends your answers to …"）+ api_keys.env/storage
- [ ] `CHANGELOG.md`（技能内）
- [ ] 免责声明（金融/合规类技能必须）

### 2.3 插件级（package.json）
- [ ] `dsh` 声明（plugin: true, kind）+ 有 `dsh.bundle.patch`（→ cordis.patch.yml）
- [ ] `main` 入口存在（产物型）或 `scripts.build`（源码型）
- [ ] `@deepseek-ai/*` 宿主包**只在 peerDependencies**（禁止 dependencies/bundledDependencies）
- [ ] 版本已 bump（与上次发布不同）
- [ ] `files` 含 cordis.patch.yml（bundle 层随包分发）

### 2.4 开放数据层（catalog.json）
- [ ] `disclosureSchemaVersion` 顶层声明（fail-closed）
- [ ] 每个条目带 `fullName` + `disclosure` + `skillFullName`（技能级）
- [ ] 仓级 `repos[].cloudSkills`（只列云端，未列出即本地）
- [ ] build 脚本在仓库内可复现（build-catalog.mjs）
- [ ] 双语文档（DISCLOSURE_PROPOSAL.md 等）同步更新

## 三、检查工具（自动化优先）

| 检查 | 工具 | 时机 |
|---|---|---|
| 发布合规（敏感词/免责/安全红线） | `skill-compliance` | 每个技能发布前 |
| 披露完整性 + 声明-代码一致性 + 宿主依赖 | `skill-compliance` v1.4.0（DISCLOSURE/DEPENDENCY） | 每个技能发布前 |
| catalog 生成 | `build-catalog.mjs` | catalog 变更后 |
| 收录门槛 | dshbase/marketplace 的判定（bundle + topic + LICENSE） | 收录申请前 |

## 四、版本与变更纪律

- 语义化版本（semver）：技能/插件 bump 遵循 major.minor.patch
- 每次发布更新：`CHANGELOG.md`（技能级 + 仓库级）→ catalog 重建 → 版本字段同步
- 禁止：不改版本重复发布（市场更新检测依赖 version）
- 变更影响面：改 SKILL.md 内容 → 需重跑 skill-compliance + catalog；改 bundle → 需确认 dshbase/marketplace 判定不变

## 五、三渠道发布顺序（稳定一致）

1. 本地：技能/插件改动 → skill-compliance 检查通过 → 版本 bump + CHANGELOG
2. 推 GitHub：仓库级 LICENSE/README/topics 确认 → push
3. 目录收录：marketplace（skills.json）→ dshbase（插件 issue）→ awesome（如适用）
4. 开放数据层：build-catalog.mjs 重建 → 确认 disclosureSchemaVersion/fullName/disclosure 完整 → push

## 六、质量红线（违反即阻断发布）

- disclosure 缺失或声明与代码不一致（有网络调用却 cloud:false）
- `@deepseek-ai/*` 宿主包进普通 dependencies（遮蔽宿主）
- 无 LICENSE / 无 bundle 清单（dshbase 门槛）
- 版本未 bump 重复发布
- 编造数据/企业/产值/投资额（守公告与市场禁区）

---

## Summary (EN)

Internal publication standards for DSH ecosystem deliverables: layered naming (dsh- prefix for ecosystem tools, functional names for cross-platform skills), mandatory release gates (LICENSE/README/topics at repo level; disclosure+permissions+changelog at skill level; dsh.bundle.patch+peerDependencies at plugin level; schema-versioned catalog), automated checking via skill-compliance and build-catalog.mjs, semver discipline, and a release order (local check → GitHub → directory intake → open data layer). Red lines block release.
