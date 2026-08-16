# wwumit · 治理驱动的 AI 技能与工具生态

> **品牌**：wwumit — Governance-driven AI skills & tools
> **理念**：规则 → 检查 → 评分 → 报告（治理即基础设施）
> **发布规范**：[ECOSYSTEM_STANDARDS](docs/ECOSYSTEM_STANDARDS.md) · **披露契约**：[DISCLOSURE v0.2](docs/DISCLOSURE_PROPOSAL.md)

## 产品线（一组品牌，多线产物）

| 产品线 | 仓库 | 内容 |
|---|---|---|
| **合规**（compliancehub 系列） | [`skills-compliance-intl`](https://github.com/wwumit/skills-compliance-intl) | CCPA / GDPR / COPPA / HIPAA 合规技能（云端评分 + 本地检查） |
| 合规（插件） | [`dsh-compliancehub`](https://github.com/wwumit/dsh-compliancehub) | 远程合规技能 provider（ctx.skills.list/get，DISCLOSURE v0.2） |
| 合规（检查器） | [`skills-tools`](https://github.com/wwumit/skills-tools) | skill-compliance 发布合规检查器 + 工具类技能 |
| **股票** | [`skills-stock`](https://github.com/wwumit/skills-stock) | 回测、选股、信号、情绪分析技能 |
| **工具/专家** | [`skills-tools`](https://github.com/wwumit/skills-tools) | 专家方法沉淀（expert2skill）、数据分析、演示 |
| **数据层** | [`skills-catalog`](https://github.com/wwumit/skills-catalog) | catalog.json（21 精选技能聚合，技能级+仓级披露开放数据层） |

## 统一质量

- 全部技能：`disclosure`（D1/D3/D4 必填）+ `permissions` 声明，声明-代码一致性由 skill-compliance v1.4.0 自动检查
- 全部仓库：MIT LICENSE + dsh-plugin topic + CHANGELOG
- catalog 双颗粒度：`skills[].disclosure`（技能级）+ `repos[].cloudSkills`（仓级）
- 发布流程：skill-compliance 检查 → 版本 bump → GitHub → 目录收录 → 开放数据层（见 ECOSYSTEM_STANDARDS §五）

## 理念落地

- **披露层**：catalog 开放数据层被 DSH 市场消费（构建期盖章 + 客户端徽章），21 技能全披露
- **检查层**：skill-compliance 规则集被市场 STANDARD §7/§9 引用（机器可读）
- **治理思考**：生态五层（识别/验证/合规/依赖安全/可持续）+ 证据契约统一（治理思考见本地 GOVERNANCE_FRAMEWORK.md）
