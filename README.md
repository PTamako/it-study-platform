# 知学 · 个人学习平台

Vue 3 / TypeScript / Vite + Cloudflare Workers (静态网站和 API 共用一个 Worker) + D1 + 按需 Workers AI。手机优先的个人学习平台。

## 目前提供的功能（2026-10-31）

- **SG 信息安全管理考试**：官方已核实的过去问和原创预测题分开显示；练习、错题、掌握状态、A/B 48+12 限时模拟和实战训练。
- **FE 基本情報技術者**：2023～2026 年 IPA 公开题 104 道（A 80、B 24），另有 2019 年旧制度上午原题 12 道；原创和改编题分别标记来源。科目 A 为 60 题／90 分钟，科目 B 为 20 题／100 分钟（算法 16、安全 4）。图示题的人工移动端验收仍待完成。
- **语言学习**：日语和英语各 5,000 张带中文翻译的 Tatoeba 来源句子卡；日常／职场分类、词汇与语法高亮、发音、复习计划和云端掌握状态。数据经构建生成，不能把上游语料的变更误认为人工审核内容。
- **三语词典**：优先使用本地常见词、D1 IT 术语、Jisho 和 Free Dictionary。已登录用户配置 **Google Apps Script + LanguageApp** 私人翻译接口（`GAS_TRANSLATOR_URL`、`GAS_TRANSLATOR_TOKEN`）后优先调用它；接口失败再尝试 MyMemory/Google 非正式备用接口。**无需信用卡或收费 Google Cloud Translation API**。普通查词不调用 Workers AI。未获得译文时，可主动点「AI 补译为中日英」或「AI 辅助解释」，共用日本时间每日 20 次 AI 额度，30 天内相同请求命中缓存不扣次数。
- **词典式阅读布局（优先适配 iPad）**：词头、IPA／假名读音、真实词性、按词性分组的编号释义和例句分层展示；日中英译文独立成区。英语词性的多个来源释义直接使用 Free Dictionary 的 `meanings`，日语使用 Jisho 的 `parts_of_speech`，不根据 Google 机器翻译或 AI 输出猜测词性。手机竖屏单栏，iPad 竖屏宽阅读栏，iPad 横屏在空间允许时双栏并列释义／翻译；读音及收藏按钮保留且触控尺寸不低于 44px。保存到生词本时保留真实词性、释义与例句。句子只显示三语翻译，不捏造单词词性。
- **生词本、进度、每日计划和历史记录**：单用户登录后使用 D1 同步；离线待同步记录优先保全，已同步词条以最新云端快照为准。
- **PWA 和浏览器发音**：提供 iPhone Safari 添加到主屏幕的入口；不缓存个人 API 响应。实际语音由浏览器和系统语音决定，CI 无法替代真机试听。

**考试题源约束**：题源 URL 不等于题目已录入。2019 旧制度试题与 2022 公开样题需要与现行 FE/SG CBT 真题严格区分；2020～2022 CBT 的未公开题不得冒充官方过去问。参见 `docs/fe-question-bank-status.md` 和 `docs/sg-fe-2019-2022-source-coverage.md`。

## 开发与本地验收

要求 Node.js **22.x**（不支持 Node 20）、Python 3.8+，推荐 Python 3.12。首次运行先执行 `npm ci`。

```bash
nvm use 22
npm ci
npm run dev
# 完整验收：生成许可语料/FE 种子、单元测试、类型检查、构建和本地迁移
npm run check:local
```

本地生成的 `0081/0084/0087` 语言迁移和 `0092` FE 种子依赖生成脚本；不要手工编辑或在生产库重放已执行迁移。Tatoeba 下载是不断更新的外部数据源，若要保证**完全可重现的内容**，应使用审定并固定校验值的源数据快照；未锁定前禁止把不同日期的生成结果称为同一固定语料版本。

## Cloudflare 部署

```bash
nvm use 22
npm ci
npm run check:local
npx wrangler d1 migrations apply it-study-platform-db --remote
npx wrangler deploy
```

- Worker：`it-study-platform`；生产 D1：`it-study-platform-db`；API 前缀 `/api/*`。
- **Google Apps Script 免费翻译配置**：用户使用自己的普通 Google 账号访问 [script.google.com](https://script.google.com/)，新建一个**独立**的 Apps Script 项目，将仓库的 [`apps-script/Code.gs`](apps-script/Code.gs) 全部复制到编辑器 `Code.gs`。脚本使用内置 `LanguageApp.translate`，**不要额外启用 Google Cloud Translation API、收费结算或绑定银行卡**。
- 在项目 **Project Settings（项目设置）→ Script Properties（脚本属性）** 中新增 `TRANSLATOR_SHARED_SECRET`，值为自己生成的**至少 32 字符高强度随机字符串**。请保存；值不得写入仓库和对话记录。脚本明确拒绝空密钥、错误密钥、过长输入与不支持的语言对。Google Apps Script 个人账号的官方 Translate quota 当前为 **每天 5,000 次调用**，在首次调用后约 24 小时重置（不是 5,000 个完整三语词条）；超额时自动停止并回退免费备用接口。
- 点击 **Deploy → New deployment → Web app**，选择 **Execute as: Me（以本人身份执行）**，**Who has access: Anyone**（任何人均可访问部署 URL），完成 Google 授权后复制以 `https://script.google.com/macros/s/.../exec` 结尾的 Web App URL；**不要使用开发测试专用 `/dev` URL**。Anyone 的公开入口仍被脚本共享密钥保护，建议只把部署 URL 保存在 Cloudflare Worker Secret 中。
- 在 Cloudflare Worker `it-study-platform` 的 **Settings → Variables and Secrets** 配置两个 Secret：`GAS_TRANSLATOR_URL`（Web App `/exec` URL）与 `GAS_TRANSLATOR_TOKEN`（必须与 Apps Script `TRANSLATOR_SHARED_SECRET` 完全一致）。不能把密钥放进 GitHub、前端或 `wrangler.toml` 的 `[vars]`。**两个 Secret 缺一不可**；若脚本未部署、授权失效、密钥不符或 Google 配额耗尽，词典自动切换 MyMemory/Google 免费备用，用户仍可手动点击 Cloudflare AI 补译。
- **隐私与安全边界**：仅已登录查询会请求受密钥保护的脚本；Cloudflare 不向浏览器返回脚本 Secret。Apps Script Web App 地址本身是公开入口，需持续保护密钥。词典查询文本会发送给 Google 翻译服务，不要使用它翻译密码、敏感材料。脚本只调用 `LanguageApp.translate`，不调用任何付费云 API。本变更不需要新的 D1 SQL 迁移，不会清除生词本或学习进度。
- GitHub PR 由 `validate-pr.yml` 验证；合并后 `deploy-cloudflare.yml` 运行同样的数据生成、测试、本地迁移、远程增量迁移、部署及线上检查。
- `ci.yml` 仅保留手动复验，避免 PR 和主分支重复计费运行。PR 验证和生产部署的检查应设置为分支保护的必要条件（在 GitHub Settings 中配置）。
- 必须在 GitHub Actions 中配置 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`；在 Cloudflare Worker Secrets 中配置 **`AUTH_PASSWORD`（≥16 字符）**和**`AUTH_SESSION_SECRET`（≥32 字符）**。不得提交真实密钥。
- 登录：HttpOnly、Secure、SameSite=Strict，12 小时签名会话；登录失败及写入有限流。未登录个人 API 返回 401。同源检验为服务端执行。
- 公共词典：D1 存储 1 分钟期的匿名散列计数（同来源 30 次/分钟），超限返回 429；不保存原始 IP。需要先应用 `0114_public_dictionary_rate_limits.sql` 才能启用此功能。未配置生产认证密钥时用户登录不可用。
- 历史成绩的全量清除不仅有前端二次确认，服务端也要求请求体 `{\"confirmation\":\"清除\"}`；操作不可恢复，执行前需备份。
- 限时模考仅在服务器交卷评分后返回本次试卷答案及解析；**这不是高安全防作弊机制**，因为个人学习的普通练习接口仍可查看题库答案。

**数据保护**：千万不要在正式数据库运行 `scripts/manual-launch-reset.sql`。迁移只做兼容的增量变更，不能删除现有答题、错题、生词本、语言复习、成绩记录。生产数据未完成备份前，不得执行未经审核的破坏性迁移。

## 验证

自动化执行 `npm test`、`npm run build`、本地 D1 migration、`wrangler deploy --dry-run`。部署后检查 `/api/health`、未登录个人 API 的 401 和语言语料完整性。实际生产 D1 的数据量、真机 TTS 和移动端外观仍需独立验收。详细工作清单见 `docs/platform-final-acceptance.md`。
