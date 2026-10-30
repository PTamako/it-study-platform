# 修复分支本地验收

使用 Node.js 22（`nvm use 22`）、Python 3、可联网的 macOS 终端。语料生成需要下载 Tatoeba 许可数据并可能使用本地缓存。

```bash
git fetch origin
git switch fix/audit-data-safety-and-review-time
git pull --ff-only
nvm use 22
npm run check:local
```

推荐直接使用 `npm run check:local`，不要单独把 `npm test` 当成完整验收。`npm test` 只运行测试，不会生成语料或执行构建；如用 Node 26 或缺少迁移文件，测试预检会明确提示先切换 Node 22、运行完整验收。\n\n此脚本依次执行 `npm ci`、语料生成、TypeScript 检查、Node 测试、生产构建和**本地 D1** 完整迁移验证；不会执行 `--remote`、部署 Worker，也不会重置真实学习数据。

手动加做 Worker 打包检查（可选）：

```bash
npx wrangler deploy --dry-run
```

在本地检查通过、修复分支 PR 由你验收之前，不能合并、更不能执行远程数据清理。请把失败时的完整错误日志发回以便精准修复。
