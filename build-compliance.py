#!/usr/bin/env python3
"""build-compliance.py — 生成合规层开放数据层 compliance.json（全量扫描工具定位）。

对齐 verified.json/catalog.json 管线：聚合源 + fullName 映射键 + checkerVersion fail-closed。
扫描任意 curated 技能（当前：catalog/curated.json 列出的全部技能，含 intl 与 domestic 登记层）。

用法: ./.venv/bin/python build-compliance.py [--out compliance.json] [--curated catalog/curated.json]
产物: compliance.json — 每条含 triState（披露三态）/ verdict（整体质量）/ disclosure 摘要 / 问题类别
依赖: skill-compliance（../skills-tools/skills/skill-compliance/scripts/comply.py，零第三方依赖）
"""
import argparse
import datetime
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "catalog"
COMPLY = ROOT / "skills-tools" / "skills" / "skill-compliance" / "scripts" / "comply.py"

# 扫描源：5 仓（3 出境 + 2 国内登记层）
REPOS = ["skills-compliance-intl", "skills-stock", "skills-tools"]
DOMESTIC_REPOS = ["skills-xborder", "skills-domestic"]
INITL = set(REPOS)


def load_curated(path: Path) -> list[str]:
    d = json.loads(path.read_text(encoding="utf-8"))
    return d.get("curated", [])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(CATALOG / "compliance.json"))
    parser.add_argument("--curated", default=str(CATALOG / "curated.json"))
    args = parser.parse_args()

    sys.path.insert(0, str(COMPLY.parent))
    from comply import ComplianceChecker  # type: ignore

    curated = load_curated(Path(args.curated))
    checker_version = "skill-compliance@" + json.loads(
        (COMPLY.parent.parent / "package.json").read_text(encoding="utf-8")
    )["version"]

    skills: dict[str, tuple[str, Path]] = {}
    for repo in REPOS + DOMESTIC_REPOS:
        skills_dir = ROOT / repo / "skills"
        if not skills_dir.is_dir():
            continue
        for name in sorted(p.name for p in skills_dir.iterdir() if p.is_dir()):
            if name in curated and name not in skills:
                skills[name] = (repo, skills_dir / name)

    results = []
    for name, (repo, path) in sorted(skills.items()):
        c = ComplianceChecker(str(path))
        c.run_all()
        sc = c.score()
        disc = c.disclosure_summary or {}
        disc_issues = [i for i in c.issues if i["category"] == "DISCLOSURE"]
        missing_required = any(
            "必填" in i["found"] or "DISCL" in i.get("recommendation", "") for i in disc_issues
        )
        undeclared = any("未声明" in i["found"] for i in disc_issues)
        tri = "missing-required" if missing_required else "undeclared" if undeclared else "ok"
        results.append({
            "fullName": f"wwumit/{repo}",
            "skillFullName": f"wwumit/{repo}/skills/{name}",
            "skill": name,
            "distribution": "intl" if repo in INITL else "domestic",
            "triState": tri,
            "disclosure": {k: disc.get(k) for k in (
                "cloud", "network", "offlineMode", "apiKeys", "jurisdiction", "retention", "pay") if k in disc},
            "verdict": sc["verdict"],
            "redlines": sc["redlines"],
            "high": sc["high"],
            "medium": sc["medium"],
            "low": sc["low"],
            "issueCategories": sorted({i["category"] for i in c.issues}),
            "checkedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })

    out = {
        "schemaVersion": 1,
        "checkerVersion": checker_version,
        "updatedAt": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "results": results,
    }
    out_path = Path(args.out)
    out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    tris = {}
    for r in results:
        tris[r["triState"]] = tris.get(r["triState"], 0) + 1
    print(f"✅ compliance.json 生成: {len(results)} 条 → {out_path}")
    print(f"   checkerVersion: {checker_version} | 三态: {tris}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
