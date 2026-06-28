# 批量录入 · 导入数据目录

本目录存放「高清影视之家」等外部来源的**清洗产物**，不将大文件纳入 Git 远端。

## 阶段性存档（2026-06-28）

| 产物 | 路径 | 规模 | 进 Git |
|------|------|------|--------|
| 清洗脚本 | `scripts/clean-import-txt.mjs` | — | 是 |
| 标准化 CSV | `movies-clean.csv` | ~22 MB / 58,086 行 | **否** |
| 待复核 CSV | `movies-needs-review.csv` | 89 行（缺 year，已忽略） | **否** |
| 原始 TXT | `raw/高清影视之家-资源.txt` | ~14 MB | **否** |
| 清洗报告 | `clean-report.txt` | 摘要 | 是 |

源 TXT 原始位置：`Downloads/高清影视之家-集合/高清影视之家-资源.txt`

## 为何不上传云端（Git）

- 单批 CSV + 原始 TXT 约 **36 MB**，且后续全量录入会更大；写入 Git 历史后**无法真正删除**，仓库会持续膨胀。
- 与项目约定一致：`movies.json` 万级规模也不进 Git；批量录入产物属于**可再生的构建/中间数据**，不是源码。
- GitHub 单文件软限制 100 MB；更关键的是 clone/fetch 成本与无必要的版本 diff。

**推荐存放方式：**

1. **本地** — 当前 `data/import/`（本机备份即可）
2. **对象存储** — 若需跨机共享，用 Supabase Storage / R2 / 又拍等私有 bucket（与生产海报策略同族）
3. **Git 只保留** — 清洗脚本 + `clean-report.txt` 摘要 + 本 README

## 重新生成

```bash
# 将源 TXT 放入 raw/ 后执行
node scripts/clean-import-txt.mjs data/import/raw/高清影视之家-资源.txt data/import/movies-clean.csv
```

产出：`movies-clean.csv`、`clean-report.txt`、`clean-issues.csv`、`movies-needs-review.csv`

## 下一步

使用 `movies-clean.csv` 进入 `prepare-staging` → TMDB 消歧 → SQL 同步（见 `docs/technical/bulk-ingestion-checklist-v1.md`）。
