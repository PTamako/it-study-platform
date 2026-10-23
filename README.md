# 知学 · 个人学习空间

面向个人使用的手机优先学习平台，技术栈为 Vue 3、TypeScript、Vite、Cloudflare Workers 与 D1。

## 功能模块

- **题库与官方题源**：新增 `question_sources` 元数据表与 `/api/question-sources`，按所选考试显示对应官方来源。练习区提供“全部题目 / 官方过去问 / 专项练习 / 授权题目”来源筛选，`/api/questions` 支持 `source=all|official|generated|licensed`。当前官方区域主要提供链接目录，官方题文尚未完整导入；官方筛选为空时会明确提示，不会拿自编题冒充真题。详见 `docs/question-bank-expansion.md`。
- **语言间隔复习**：`/api/language-review` 记录每张语言卡的复习次数、连续记住次数与下次复习时间；记住后按 1、3、7、14 天逐步延长间隔，选择“还不熟”则安排约 10 分钟后重试。需要先应用 `0013_language_spaced_repetition.sql`，并在 D1 迁移完成后部署 Worker。
- **考试备考**：考试列表从 D1 已启用模块动态读取，显示每项考试实际题量。当前 SG 已通过多批迁移接入平台自编练习题，实际题量由 D1 动态计算；FE/AP 在对应题库未接入前不会启动练习。答案会即时判分，并通过 `/api/attempts` 将每次答案写入 D1；可通过 `/api/wrong-questions?track=exam-sg` 按错题频次提取复习题。
- **语言学习**：统一入口后选择日语或英语，从 `language_cards` 表读取课程卡片，支持分类筛选、读音、中文解释、例句、浏览器发音及本地掌握进度。当前内容为平台自编学习资料，已明确标注，不冒充官方课程。
- **中日英互译与 IT 术语词典**：优先检索 D1 `vocabulary` 术语表，提供中日英释义、日语读音与例句；未命中时调用在线英语/日语词典和机器翻译。对“展开/收起、保存、取消、搜索、设置”等常用 UI 词增加 Worker 离线中日英兜底，即使外部翻译源限流也尽量给出结果。在线翻译使用 MyMemory 与 Google 双主机备用，并缓存成功译文 6 小时，以降低重复查询和短暂上游故障的影响；首次遇到上游限流或网络拦截时仍可能失败。对未覆盖的词不捏造结果。支持手动选择源语言、发音、结果来源、最近查询与本地生词收藏。
- **学习计划与今日进度**：每日任务清单、目标分钟数、完成比例；任务完成状态按日期保存在当前设备。
- **实战演练**：`practical_scenarios` 保存情境、选项和评分规则，`/api/scenarios` 返回任务，`POST /api/scenario-attempts` 在 Worker 端判分并把结果保存到 `scenario_attempts`。SG 情景库已分批补充访问控制、钓鱼与事件响应、生产变更、漏洞修补、日志完整性、供应链数据处理等场景；具体数量以 D1 返回为准。所有内容均为平台自编材料，不是官方真题。
- **考试统计与历史成绩**：练习题答案写入 `study_attempts`；实战分数写入 `scenario_attempts`。首页旧的手动成绩与每日任务仍然保存在浏览器 localStorage，不应与云端答题记录混为一谈。
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

3. 将全部表结构、SG 自编练习题、扩充后的技术词库、语言卡片、SG 练习题和实战情境应用到远程 D1（会按迁移编号依序执行，包括 `0007`、`0008`、`0009`、`0010`、`0011`、`0012`、`0013`）：

   ```sh
   npx wrangler d1 migrations apply it-study-platform-db --remote
   ```

4. 部署前端静态资源与 Worker API：

   ```sh
   npx wrangler deploy
   ```

### 通过 Cloudflare 控制台连接 GitHub 自动部署

在 Cloudflare Workers Builds 中只保留一个关联此仓库的生产部署。`wrangler.toml` 的 `name` 固定为 `it-study-platform`，因此本地 `npx wrangler deploy` 与 Git 自动部署都应更新同一个 Worker，而不是另建 `it-study-platform-api`。部署配置变更后，先构建，再部署，并验证主站和 API。若 Cloudflare 中仍留有历史 `it-study-platform-api` Worker，验证主 Worker 正常前请不要删除；确认无流量后再从控制台停用或删除旧服务。

部署前先完成一次远程 D1 迁移。Git 自动部署本身不会自动执行 SQL migration。手机端暂时无法执行远程 D1 迁移时，可以先继续提交 `migrations/*.sql`；待能使用电脑或 Cloudflare 控制台后，再按编号一次性应用所有未执行迁移。迁移使用 `INSERT OR IGNORE` 与固定 ID，重复导入已有种子数据不会重复插入相同 ID。

- `wrangler.toml` 中已配置 Cloudflare D1 数据库 ID。该 ID 不是密码，但请勿把 API Token 等访问凭据提交到仓库。
- 本地密钥放在被 Git 忽略的 `.dev.vars` 文件中；线上密钥使用 Cloudflare Worker Secrets。
- **不要**把密码、Token、API Key 写进前端代码或提交到 GitHub。

## 部署后验证

将下面的 `<WORKER_URL>` 替换为 Cloudflare 分配的 Worker 地址：

- `<WORKER_URL>/`：应显示学习平台页面。
- `<WORKER_URL>/api/health`：D1 初始化成功后应返回 `ok: true`。
- `<WORKER_URL>/api/tracks`：返回已启用的学习模块及每项考试的实际题量。
- `<WORKER_URL>/api/language-cards?lang=ja`：读取日语学习卡；改为 `lang=en` 读取英语课程。
- `<WORKER_URL>/api/dictionary?q=authentication&lang=en`：命中 IT 词库时优先返回专业释义；否则查询普通词典并尝试提供中日英翻译。
- `<WORKER_URL>/api/dictionary?q=hello&lang=en`：应返回在线英文字典结果；如第三方服务未响应，可能返回空结果。
- `<WORKER_URL>/api/dictionary?q=こんにちは&lang=ja`：应返回日语词条/翻译结果。

## 题库真实性

当前页面中的词条和表达仅用于演示交互，不代表官方题库。导入考试真题前，应核实来源、使用许可与考试机构的公开规则。官方题目、授权题目、AI 生成练习题必须分别标注。

## 安全与测试

- `.env*`、`.dev.vars`、构建产物和依赖目录均加入了 Git 忽略规则。
- 提交前运行类型检查与生产构建。
- 后续应增加自动化测试和密钥泄漏扫描。
- Worker 提供只读查询 API，并开放 `/api/attempts` 与 `/api/scenario-attempts` 两个经过字段校验的 POST 写入接口。当前没有用户账号/身份认证，适用于个人测试，不应存放敏感信息；若公开部署给多人使用，必须先加入身份认证、用户隔离、滥用限制与 CSRF/来源策略。
- 当前学习计划勾选状态与手动考试成绩先保存在浏览器 localStorage 中：同一设备、同一浏览器可保留记录，但清理网站数据后会丢失，也不会自动同步到其他设备。后续接入账号/安全的写入 API 后，再迁移到 D1。
