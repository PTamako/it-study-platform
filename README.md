# 知学 · 个人学习平台

Vue 3 / TypeScript / Vite + Cloudflare Workers (静态网站和 API 共用一个 Worker) + D1 + 按需 Workers AI。手机优先的个人学习平台。

## 目前提供的功能（2026-10-31）

- **SG 信息安全管理考试**：官方已核实的过去问和原创预测题分开显示；练习、错题、掌握状态、A/B 48+12 限时模拟和实战训练。
- **FE 基本情報技術者**：2023～2026 年 IPA 公开题 104 道（A 80、B 24），另有 2019 年旧制度上午原题 12 道；原创和改编题分别标记来源。科目 A 为 60 题／90 分钟，科目 B 为 20 题／100 分钟（算法 16、安全 4）。图示题的人工移动端验收仍待完成。
- **语言学习**：日语和英语各 5,000 张带中文翻译的 Tatoeba 来源句子卡；日常／职场分类、词汇与语法高亮、发音、复习计划和云端掌握状态。数据经构建生成，不能把上游语料的变更误认为人工审核内容。
- **三语词典**：中日英查询、D1 离线 IT 术语、Jisho、Free Dictionary、MyMemory 与 Google 免费翻译备用；普通查词不调用生成式 AI。用户主动点击时可用 Workers AI 生成辅助解析，每个日本日历日最多 20 次新推理（命中缓存不扣次数）。
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
