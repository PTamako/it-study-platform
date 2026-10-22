# 知学 · 个人学习空间

面向个人使用的手机优先学习平台，技术栈为 Vue 3、TypeScript、Vite、Cloudflare Workers 与 D1。

## 功能模块

- **考试备考**：支持扩展 SG、FE、AP 等资格考试；区分官方真题、授权题目、生成练习题和个人题目。
- **日语与英语**：采用相同的六类学习结构，分别适配语法、读音和发音规则。
- **词典与 IT 术语**：管理中日英术语、例句、缩写和个人生词本。
- **学习计划与今日进度**：每日任务清单、目标分钟数、完成比例；任务完成状态按日期保存在当前设备。
- **考试统计与历史成绩**：手动记录每次练习的考试名称、答对数和总题数，自动计算总体正确率、累计答题量，并展示近 7 天正确率曲线和历史记录。无成绩时显示空状态，不生成虚假数据。
- **PWA**：支持通过 iPhone Safari 的“分享 → 添加到主屏幕”安装为类 App 入口。

## 本地运行

环境要求：Node.js 20 或更新版本。

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

## Cloudflare Workers 部署（前端 + API）

本项目不依赖单独的 Pages 项目。Cloudflare Workers Static Assets 会与 Worker API 一起部署：

- 前端构建目录：`dist/`
- Worker 入口：`worker/index.ts`
- 静态资源绑定：`ASSETS`
- API 路由：`/api/*` 由 Worker 处理；其他请求由静态资源托管处理。
- Vue 单页应用启用 SPA fallback，刷新前端页面路径时回退到 `index.html`。

### 首次部署

1. 在项目根目录安装依赖并构建前端：

   ```sh
   npm ci
   npm run build
   ```

2. 登录 Cloudflare（如尚未授权）：

   ```sh
   npx wrangler login
   ```

3. 将表结构和初始学习模块应用到远程 D1：

   ```sh
   npx wrangler d1 migrations apply it-study-platform-db --remote
   ```

4. 部署前端静态资源与 Worker API：

   ```sh
   npx wrangler deploy
   ```

### 通过 Cloudflare 控制台连接 GitHub 自动部署

在 Cloudflare 的 Workers & Pages / Workers Builds 创建 Worker Git 部署，连接 `PTamako/it-study-platform`。构建命令使用 `npm run build`，部署命令使用 `npx wrangler deploy`。Wrangler 会读取仓库根目录的 `wrangler.toml`。

部署前先完成一次远程 D1 迁移。Git 自动部署本身不会自动执行 SQL migration。

- `wrangler.toml` 中已配置 Cloudflare D1 数据库 ID。该 ID 不是密码，但请勿把 API Token 等访问凭据提交到仓库。
- 本地密钥放在被 Git 忽略的 `.dev.vars` 文件中；线上密钥使用 Cloudflare Worker Secrets。
- **不要**把密码、Token、API Key 写进前端代码或提交到 GitHub。

## 部署后验证

将下面的 `<WORKER_URL>` 替换为 Cloudflare 分配的 Worker 地址：

- `<WORKER_URL>/`：应显示学习平台页面。
- `<WORKER_URL>/api/health`：D1 初始化成功后应返回 `ok: true`。
- `<WORKER_URL>/api/tracks`：应返回学习模块列表。

## 题库真实性

当前页面中的词条和表达仅用于演示交互，不代表官方题库。导入考试真题前，应核实来源、使用许可与考试机构的公开规则。官方题目、授权题目、AI 生成练习题必须分别标注。

## 安全与测试

- `.env*`、`.dev.vars`、构建产物和依赖目录均加入了 Git 忽略规则。
- 提交前运行类型检查与生产构建。
- 后续应增加自动化测试和密钥泄漏扫描。
- Worker 当前只开放只读 GET API，数据库尚未初始化时会明确返回错误，不伪装成成功。
- 当前学习计划勾选状态与手动考试成绩先保存在浏览器 localStorage 中：同一设备、同一浏览器可保留记录，但清理网站数据后会丢失，也不会自动同步到其他设备。后续接入账号/安全的写入 API 后，再迁移到 D1。
