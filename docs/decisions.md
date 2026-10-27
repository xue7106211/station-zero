---
title: Station Zero 决策记录
type: decision
status: active
updated: 2026-10-27
related:
  - index.md
  - progress.md
  - ../AGENTS.md
---

# 决策记录

轻量 ADR 风格：记「为何如此」，细节仍以代码与专题文档为准。

## 2026-10-27 · 仓库卫生

- **背景**：个人产品需要一眼能看懂的 README，以及 PR 上的基础质量门禁。
- **决定**：
  - README 明确「是什么 / 不是什么」、怎么跑、状态为**活跃个人产品**；暂无公开部署地址则不写死 URL。
  - CI 仅跑现有 `npm run lint`、`npm test`、`npm run build`，不引入额外工具链。
  - 新增 `docs/progress.md` 与本文件作最小进度 / 决策骨架；专题方案仍放在 `docs/technical/` 与 `docs/product/`。
- **不做**：本轮不改产品逻辑、数据模型或页面行为。
