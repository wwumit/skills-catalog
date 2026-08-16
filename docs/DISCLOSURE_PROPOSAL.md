# 提案：技能/插件发布披露清单（DISCLOSURE.md）— STANDARD.md 补充章节

> 提交对象：bradeGithub/DSH-Plugins-Marketplace
> 提交方式：Fork → `docs/` 分支 → PR（按 CONTRIBUTING.md：中英双语、无 emoji、`docs(disclosure): ...` 提交信息）
> 背景：讨论 #2269「合规层」提案的落地文档

---

## 一、定位：为什么需要「披露清单」

市场现有两层分工：
- **识别层**（STANDARD.md）：管"怎么装"
- **验证层**（dsh-plugin-verify）：管"装了能不能信"

缺第三层——**合规层**：管"装之前该不该装、装了之后数据去了哪"。
识别层看文件形态、验证层看 manifest 与运行时，**两者都不检查"这个技能/插件会把数据发给谁、怎么处理凭据"**。

本清单定义发布者必须披露的**数据行为信息**，作为市场条目的中立展示字段与用户决策依据。

## 二、披露条目（6 项）

| ID | 条目 | 必填 | 说明 |
|---|---|---|---|
| D1 | **云端依赖** | 必填 | 是否将数据发送到云端；发送什么、发到哪个端点 |
| D2 | **离线模式** | 建议 | 是否存在完全离线路径（无网络可用的模式） |
| D3 | **凭据处理** | 必填 | API key / token 的获取、存储位置、文件权限、是否落日志 |
| D4 | **权限声明** | 必填 | 网络 / 文件系统 / 环境变量的读写范围 |
| D5 | **法域标签** | 建议 | 技能/插件内容适用的法律或地域（如 US-CA、EU、CN） |
| D6 | **数据保留** | 建议 | 数据在服务端的保留策略（none / session / server-side） |

## 三、声明格式（frontmatter / package.json）

### 技能（SKILL.md frontmatter 推荐字段）

```yaml
disclosure:
  cloud: true                              # D1：是否发数据到云端
  cloud_endpoints:                         # D1：明确端点（与 permissions.network 一致）
    - "https://compliancehub.cn"
  offline_mode: true                       # D2：是否存在完全离线模式
  api_keys:                                # D3
    - { env: "COMPLIANCEHUB_API_KEY", file: "~/.config/compliancehub/ccpa-check.key", mode: "0600" }
  jurisdiction: ["US-CA", "EU"]            # D5：适用法域
  retention: "session"                     # D6：none / session / server
```

### 插件（package.json 推荐字段）

```json
{
  "dsh": { "plugin": true, "kind": "server" },
  "disclosure": {
    "cloud": false,
    "network_endpoints": [],
    "api_keys": { "env": [], "files": [] },
    "jurisdiction": []
  }
}
```

## 四、正例 / 反例

**正例（已在生产使用，通过 ClawHub/SkillHub 安全审计 benign）**：

```yaml
# ccpa-check（云端评分技能）
description: |
  ⚠️ Cloud scoring sends your answers to compliancehub.cn;
  use --non-interactive for a fully offline preview.
  Pricing: Free skill; cloud scoring uses points from compliancehub.cn
disclosure:
  cloud: true
  cloud_endpoints: ["https://compliancehub.cn"]
  offline_mode: true
```

**反例（本清单要拦截的）**：

```yaml
# 技能把用户文本发送到外部 LLM 服务，description 只写"智能分析"
description: 智能分析你的文档
# ❌ 未披露：数据外发、端点、无离线模式
```

## 五、分级与自测清单

- D1/D3/D4 为**必填**（缺失 → 市场条目标注 `disclosure: incomplete`，不阻断安装但显著提示）
- D2/D5/D6 为**建议**（缺失不标注）

自测（并入 STANDARD.md §7）：

```bash
# 检查是否披露云端依赖与凭据
grep -rE "requests|urllib|httpx|http://|https://" scripts/  # 网络调用迹象
# 有网络调用但 frontmatter 无 disclosure.cloud → 不达标
```

## 六、与验证层字段契约对齐

在已验证的字段契约（`verifiedBy / verifiedAt / reportUrl / schemaVersion`）上扩展：

```json
{
  "verdict": "pass",
  "verifiedBy": "dsh-plugin-verify@<version>",
  "verifiedAt": "2026-08-16T00:00:00Z",
  "reportUrl": "...",
  "schemaVersion": "1",
  "disclosure": { "cloud": true, "offline_mode": true, "api_keys": [], "jurisdiction": ["US-CA"] }
}
```

disclosure 缺失/不一致（如声明 offline 但代码有网络调用）→ 市场条目标注 `disclosure: mismatch`。

## 七、参考实现

- **skill-compliance**（wwumit/skills-tools）：发布合规检查器，规则库 JSON（金融敏感词/免责声明/安全红线），可扩展披露字段检查
- 现有云端披露模板（ccpa-check 等，已过审计）可直接作样例

## 八、与市场现有机制对接（管线集成，非另起炉灶）

市场安装管线已有「安装前介入」机制，披露清单直接扩展它：

### 8.1 安装流程 [3/5] 步骤扩展

```
[3/5] 现有：扫描 README / .env 中的 API_KEY → 暂停索取材料
      扩展：同时读取 disclosure 字段 → 展示「数据行为摘要」：
            · 云端依赖: 将向 https://compliancehub.cn 发送回答（有离线模式 --non-interactive）
            · 凭据: COMPLIANCEHUB_API_KEY（环境变量）
            · 法域: US-CA, EU
            → 用户确认「已了解数据行为」后继续 [4/5]
```

- 无 disclosure 字段但检测到网络调用 → 标 `disclosure: undeclared`，提示"作者未声明数据行为"
- 声明 offline 但代码含网络调用 → 标 `disclosure: mismatch`（与验证层静态检查联动）

### 8.2 卡片展示（对齐现有"未验证"弱提示）

```
现有: 未探测到 SKILL.md → 「未验证」
新增: disclosure 字段状态 → 「披露完整 ✅」/「披露不完整 ⚠️」/「未声明数据行为 ❓」
      （三态，比"未验证"更有信息量）
```

### 8.3 分类体系扩展（可选）

现有 12 类功能分类 chips 之外，加一个**法域筛选**（US-CA / EU / CN / 无地域）——合规技能本身有地域属性，用户按法域找更精准。

### 8.4 与验证层字段契约的完整链路

```
作者声明 disclosure（frontmatter/package.json）
  → dsh-plugin-verify 静态检查（声明 vs 代码一致性）
  → 市场构建期抓取 → 条目挂 verifiedBy/verifiedAt/reportUrl + disclosure
  → 安装时 [3/5] 展示数据行为摘要 → 用户确认
```

## 九、实施步骤（建议）

1. 本清单以 `DISCLOSURE.md` 提交 PR 到市场仓库（`docs/` 分支）
2. STANDARD.md §7 自测清单加入披露检查条目
3. 与 dsh-plugin-verify 对齐 disclosure 字段契约（其报告 schemaVersion 化后）
4. 市场构建期抓取 disclosure 字段，条目展示"数据行为"摘要
5. 安装管线 [3/5] 步骤扩展披露确认（lib/index.js 改动，需重启 DSH）

---

## Summary (EN)

This proposal adds a **compliance layer** to the DSH plugin marketplace, complementing the recognition layer (STANDARD.md) and verification layer (dsh-plugin-verify). It defines a 6-item disclosure checklist — cloud dependency, offline mode, credential handling, permission scope, jurisdiction labels, data retention — with concrete frontmatter/package.json schemas, real positive examples (already audit-passed on ClawHub/SkillHub), and alignment with the verifiedBy/verifiedAt/reportUrl field contract. Reference implementation: skill-compliance (publishing compliance checker). Submission: PR to bradeGithub/DSH-Plugins-Marketplace as DISCLOSURE.md (docs/ branch).
