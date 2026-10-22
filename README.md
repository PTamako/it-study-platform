# 知学 · 个人学习空间

面向个人使用的手机优先学习平台，技术栈为 Vue 3、TypeScript、Vite、Cloudflare Workers 与 D1。

## 功能模块

- **考试备考**：支持扩展 SG、FE、AP 等资格考试；区分官方真题、授权题目、生成练习题和个人题目。
- **日语与英语**：采用相同的六类学习结构，分别适配语法、读音和发音规则。
- **词典与 IT 术语**：管理中日英术语、例句、缩写和个人生词本。
- **PWA**：支持通过 iPhone Safari 的“分享 → 添加到主屏幕”安装为类 App 入口。

## 本地运行

环境要求：Node.js 20 或更新版本。

```sh
npm install
npm run dev
npm run typecheck
npm run build
```

## Cloudflare 部署准备

- D1 数据库结构位于 `migrations/0001_initial.sql`。
- Worker 配置位于 `wrangler.toml`。部署前先创建自己的 D1 数据库，并把 `database_id` 占位值替换成真实 ID。
- 本地密钥放在被 Git 忽略的 `.dev.vars` 文件中；线上密钥使用 Cloudflare Worker Secrets。
- **不要**把密码、Token、API Key 写进前端代码或提交到 GitHub。

## 题库真实性

当前页面中的词条和表达仅用于演示交互，不代表官方题库。导入考试真题前，应核实来源、使用许可与考试机构的公开规则。官方题目、授权题目、AI 生成练习题必须分别标注。

## 安全与测试

- `.env*`、`.dev.vars`、构建产物和依赖目录均加入了 Git 忽略规则。
- 提交前运行类型检查与生产构建。
- 后续应增加自动化测试和密钥泄漏扫描。
- Worker 当前只开放只读 GET API，数据库尚未初始化时会明确返回错误，不伪装成成功。
