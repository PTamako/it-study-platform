# 阶段 B/E：HomeFlow 与旧知学本机缓存隔离（Draft，未上线）

本模块接着知学原 PR #179 和 HomeFlow 主仓库 `docs/four-app-development-handoff.md` §17 开发。保留旧知学单密码逻辑与旧数据，不建新 Cloudflare Preview、D1 或 R2 资源。

## 两种数据域，不做自动认领

- 旧知学数据域：`src/App.vue` 历史 `zhixue:tasks:*`、`exam-records`、`mock-pending`、`practice-pending`、`scenario-pending`、`daily-word-pending` 等 localStorage 没有 HomeFlow user ID，不能因共享 iPhone、昵称或当前 Cookie 就把它们认定属于新成员。本轮不删除、不复制，也不把它们自动同步到新 `/api/homeflow-study/*`。
- HomeFlow 个人数据域：新组件按 `:key="identity.user_id"` 挂载，服务器通过 `verifiedStudyActor` 实时检查本人身份，以 D1 主键 `homeflow_user_id` 隔离。新组件不读取旧本机队列；旧记录的正式复制仅允许 owner 通过服务器 owner-only `/legacy/adopt` 明确确认。
- 旧缓存访问隔离：新增非机密标记 `zhixue:legacy-cache-quarantine-v1`。一旦验证 HomeFlow 身份，旧单人学习界面立即隐藏，旧密码输入清空，旧 hydration generation 失效。HomeFlow 退出且旧 cookie 仍有效，也不自动恢复旧主人空间。只有**再次明确通过旧密码登录**才移除隔离标记。旧数据字节不变；这仍不是完整的逐 key 用户命名空间迁移。
- iPhone PWA 切到前台：HomeFlow 卡片先清空旧身份个人面板，再查询新 `/status` 和 `/me`，并向父组件发出 `identity-changed`；新账号必须通过在线验证才能显示个人内容。

## 六条原始账号校验的 POST 路径

所有新的 SSO 私人写入都要求 `expected_user_id`，并与重新 introspect 的 `actor.user_id` 严格一致，不匹配或缺失立即 `403 ACTOR_CHANGED`，在任何 D1 写入或老数据导入之前拒绝。

| 模块 | 路径 | 写入 |
|---|---|---|
| 考试 | `/api/homeflow-study/exams/attempts` | 答题和错题 |
| 考试 | `/api/homeflow-study/exams/history` | 手动成绩 |
| 考试 | `/api/homeflow-study/exams/legacy/adopt` | 旧考试记录导入 |
| 语言 | `/api/homeflow-study/language/mastery` | 语言卡掌握 |
| 语言 | `/api/homeflow-study/language/review` | 语言复习与连续记忆 |
| 语言 | `/api/homeflow-study/language/legacy/adopt` | 旧语言记录导入 |

PWA `StudyHomeFlowExams.vue` 与 `StudyHomeFlowLanguage.vue` 发起操作时固定原始 `props.userId`，切号或卸载后丢弃迟到回执，原 UUID 幂等机制与 CAS 乐观版本保留。修复了语言卡保存失败后因 `load()` 增加 `epoch` 造成 `busy` 一直不释放的问题。

## 回归和剩余工作

- `scripts/homeflow-sso-isolated.test.mjs` 用真实双人 SQLite 模拟 SSO 与 D1 验证六条跨账号请求及缺失身份被拒绝，拒绝前后私人成绩、记录和审计行数不变。已有成功写入、重试幂等、owner 单独迁移测试继续保留。
- `scripts/homeflow-pwa-ui.test.mjs` 检查新用户的读写身份、客户端切号栅栏、不自动认领旧数据、不删除旧 localStorage 键，以及 Safari/PWA 回到前台重新验证。
- **仍未完成**：旧 `src/App.vue` 的每个 localStorage key、旧版待同步队列和所有 in-flight 操作的真正用户命名空间；任何旧队列都不允许自动复制到新成员账号；两台 iPhone 同机切号/断网/恢复的真机验证待做。
- 阶段 A 的 D1/R2 加密备份与 Mac 本地 SQLite 恢复已经通过，但 Cloudflare 生产恢复/回滚和上线授权没有完成。本 PR 始终 Draft，新 SQL 未执行，功能开关保持 OFF，无生产部署、无 Preview。

注意：最终 CI 应按本 PR 最新 Commit 的 `completed/success` 核验，不得把中间旧 CI 或尚在运行的 CI 冒充已通过。

## 2026-11-14 后续：七项 CI 修复与更多缓存写入栅栏

- 已从 [Validate #43492418101](https://github.com/PTamako/it-study-platform/actions/runs/43492418101) 的**实际 job logs**确认全部七项失败：六项同属于 `scripts/daily-task-runtime.test.mjs` 用 VM 截取 App daily-task 代码，但未向模拟沙箱注入最新 `legacyWritesAllowed()`；另一个是 `scripts/homeflow-pwa-ui.test.mjs` 的旧静态断言无法匹配 `function rolloverDailyTasks() {` 中的空格。没有删除生产行为保护，也没有放宽个人身份安全检查。
- 测试 VM 现在提供真实 `authenticated && !legacyRequiresPassword && !homeflowIdentityUser` 判定，增加 HomeFlow member 与旧密码未确认时都不能滚动/写旧缓存，原 owner 经旧密码明确解锁后仍能正常跨天更新。静态匹配调整为空白字符兼容。**[最新修复 CI #43529836222](https://github.com/PTamako/it-study-platform/actions/runs/43529836222) 已 `completed/success`，精确 HEAD `e61220acef43b858053768af1df477343bd07ea4`**。
- 随后在**同一 Draft #179** 的 `src/App.vue` 继续把 `legacyWritesAllowed()` 加到旧离线任务未提交队列 `persistDailyPending`、考试原地保存 `persistActiveMockExam`、单词进度/待同步快照 `persistDailyWordState`、语言/语法解释翻译、旧每日词语选项与语言场景、个人语言卡掌握/复习、字典浏览历史/收藏、生词本等 watcher/本机写入路径。判定关闭时均**不覆盖旧主人的本机字节**，不是删除或把旧值自动归给当前 HomeFlow member。
- 新运行时 `scripts/homeflow-legacy-cache-runtime.test.mjs` 从 App.vue 提取真实持久化函数放进隔离 VM，验证旧 PWA 明确授权前 `0` 个本机写入、授权后保存、随后切换到 HomeFlow 时无法覆盖考试草稿或离线单词队列。`scripts/homeflow-pwa-ui.test.mjs` 追加所有主要旧 watcher 和数据快照的身份门槛静态核查；需对**后续最新 HEAD** 另行核验完整 CI，不得仅引用上面绿灯基线。
- **依然不能宣称全量 E 完成**：旧 `src/App.vue` 的直接异步网络返回、每个离线队列重试入口/IndexedDB 分区、原 owner 历史全量回填、文书同步词句共享 ID 与真实同一 iPhone 双人/断网 E2E 尚未覆盖。本轮只加访问/持久化防误覆盖栅栏，原 storage 字节保留，Feature Flags OFF，生产 D1/R2/Workers/Pages 未动、Preview 不创建。
