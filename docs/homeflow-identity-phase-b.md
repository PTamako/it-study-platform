# 知学 HomeFlow 统一身份 B 阶段（独立登录 API · Draft，未上线）

> 2026-11-13 根据 Google Drive 四应用统一账号开发实施设计书 v1.1。用户有电脑后会亲自完成四 D1/R2 的加密持久备份和隔离恢复；**本分支所有迁移未执行，正式 OAuth 未开启，不合并/部署、不创建 Preview**。

## 已写入 GitHub 的功能

- `migrations/0180_homeflow_identity_isolation.sql`：只追加 HomeFlow 真 user_id、household_id、role、昵称、不可变身份映射、5 分钟原 PWA 授权态、15 分钟密文服务端 session 和 actor audit。保留并避免冲突其他 Chat 的 0177 FE 题库 PR #178；0180 未迁移。
- `worker/homeflow-identity.ts` + `worker/index.ts` 新独立 `/api/homeflow-sso/*` 路由：`status/start/callback/complete/me/logout`；默认关闭，没有 `HOMEFLOW_STUDY_SSO_ENABLED='true'`、`APP_ENV='production'`、严格 HTTPS 正式 origin、独立 32-byte AES 密钥和 HomeFlow Service Binding 均返回 503。此处只支持在原安装 PWA 完成身份验证：
  - `start`：HomeFlow Authorization Code + PKCE S256，原 PWA 保留单独随机一次性续接凭证；既有 owner 首次绑定还需要当下签名有效的知学 12h 旧登录 Cookie。
  - `callback`：Safari 接受一次性 code，AES-GCM 加密暂存，**不向浏览器发送知学登录 Cookie**。
  - `complete`：只由持有续接凭证的原 PWA 完成后端 HomeFlow token/userinfo 核验；owner 首次链接必须在开始/完成同时持有有效旧 Cookie；member 必须等 owner 验证绑定后才能获得**独立空身份**，不从 owner 的昵称或密码推断其学习数据。
  - `me`：HomeFlow backend `/api/oauth/session-introspect` 逐次核验原 HomeFlow source session、家庭、role、用户；Logout/禁用/成员关系变化后拒绝继续使用。身份 Cookie 完全独立 `__Host-study_hf`，仅返回 `study_access:false,requires_stage_e:true`。
  - `logout`：原 PWA 单次撤销身份 session，记录 actor，不清除原旧登录 Cookie。
- **绝不允许新 SSO 身份直接访问旧学习 API**。原 `requireAuth` 仍只验证旧 `__Host-study_session`，其背后所有学习表主键目前均无 user_id；要在 E 阶段无损扩展按用户隔离并完善端侧缓存切换后才实现学习数据访问。
- 新 `scripts/homeflow-sso-isolated.test.mjs`：本地真实 D1 SQLite 测试 HomeFlow 两人授权、首次旧登录、Safari/PWA 一次性续接、无 member 先行、已撤销 source session、角色变化、学习数据不变与无入侵。
- 既有 `scripts/homeflow-identity-foundation.test.mjs` 测试身份与历史互不影响、避免身份重绑/伪造事件。
- `scripts/inline-chinese-dictionary.mjs` 仅对测试装载的 data-URL Worker 旧业务模拟 SSO-disabled 分支，避免试验性独立 OAuth 导入破坏原有 FE、词典、听力等自动测试；生产路由仍使用真实 SSO 模块。

## 生产与下一阶段硬门槛

- 先由用户执行四 D1/R2 的持久加密备份、校验哈希和隔离恢复；之后才可评估 0180 正式迁移、HomeFlow OAuth 客户端回调 allowlist 和必要 Secret、Service Binding。
- E 阶段必须逐张表无损保留 owner 的历史生词、错题、模拟考、听力和语言学习数据，member 的独立空间为空；迁移 `saved_vocabulary_entries_v2(language,term)` 等无 user_id 的当前主键和所有相关 API/文书同步桥接。原学习历史 **不能因为 SSO 身份表出现就自动共享**。
- PWA UI 和真实 iPhone/Safari OAuth 切换、端侧 IndexedDB/LocalStorage 按 user_id 隔离、同步/退出后私有缓存清理，以及单人密码注销改造均未完成。
- CI 最终结果见本 Draft PR #179 最新 GitHub Actions，任何进行中或失败的 CI 不能记作已验收。本开发已提交代码，但没有生产用户启用功能。

## 2026-11-13 Stage E 增量：HomeFlow 双人生词本隔离（Draft，绝不生产迁移）

- 新增 **0181_homeflow_user_vocabulary.sql**：独立 homeflow_saved_vocabulary 表，主键 (homeflow_user_id,language,term)；不同 HomeFlow 用户同语种同词相互独立，保存真实 updated_by_user_id；homeflow_vocabulary_events 仅在更改时写 append-only 审计，历史表 saved_vocabulary_entries_v2 未改也未删除。
- worker/homeflow-identity.ts 的 verifiedStudyActor() 每次经加密新 Session + HomeFlow 后端 source-session introspection 拿到真实 user_id/role；绝不根据昵称、浏览器 payload、旧密码推断，撤销后不能访问。新 worker/homeflow-vocabulary.ts 只使用该 ID 读取/写入新表，支持 20 条内的 indexed cursor 分页、显式收藏、删除 tombstone、相同内容重试不重复 audit。
- 已链接原旧学习数据的 owner 可 POST /api/homeflow-study/vocabulary/legacy/adopt 携带 confirm:true、可选 after 执行有边界的 20 行增量复制；INSERT OR IGNORE 保留已更改/已删除的个人新状态，原 saved_vocabulary_entries_v2 完全不变；member 禁止导入旧数据。新接口 /api/homeflow-study/vocabulary 默认由 HOMEFLOW_STUDY_VOCAB_ENABLED=OFF 关闭，不会使用/改写旧 /api/vocabulary/saved。
- scripts/homeflow-sso-isolated.test.mjs 扩充双账号 SQLite、owner 独占旧历史、member 空新词本、两人同词不同解释、删除/重复请求、失效源会话、越权 audit、默认 OFF/Origin 约束。旧 Worker data-URL 测试装载脚本相应更新；完整 PR CI 请以最新 Actions 结论为准。
- **仍未完成**：其余错误题/模拟考/进度/学习卡/听力/文书同步的 user_id SQL 隔离，PWA 本机缓存/双人界面/旧账无损一键迁移确认及真实端到端测试。新生词本仅是 E 阶段第一个按账号隔离的数据模块，绝不宣称知学两人可以完整使用。
- **用户最新决定**：A=待用户完成，由用户有空时自行备份+恢复；开发者不再执行 A 或反复询问。0180/0181 均未在正式 D1 迁移，HomeFlow 和知学新功能开关 OFF，Draft PR #179 不合并、不部署、不重建 Preview。


## 2026-11-13 Stage E 增量：每日任务个人隔离与独立 PWA 面板

> 仍在原 [Draft #179](https://github.com/PTamako/it-study-platform/pull/179) 开发，**仅代码与自动测试**：没有执行 0180/0181/0182 生产 D1 迁移、启用 HomeFlow SSO、合并 PR、部署 Worker 或建立任何 Preview。A 阶段仍由用户自行完成后再另行放行。

- 新增 `migrations/0182_homeflow_user_daily_tasks.sql`：`homeflow_daily_task_progress` 的复合主键 `(homeflow_user_id,study_date,task_id)`，CAS `version`、`updated_by_user_id`、按本人日期查询索引、不可变 `homeflow_daily_task_events`，以及服务端同一 actor 的数据库触发器。原 `daily_task_completions` **零修改、零删除、零重分配**；owner 旧记录只归 owner，member 在新表从空白开始。
- `worker/homeflow-daily-tasks.ts`：新 `/api/homeflow-study/daily-tasks` 用户本人日期列表与 POST 完成状态（含准确日本日期、20 默认/最多 50 条 cursor、version=0 新建/当前 version 修改、重试状态不变不新增审计、旧设备旧版本不能覆盖新进度）；新 `/status` 不读 D1，feature 默认关闭；新 `/legacy/adopt` 仅真实 HomeFlow owner 明确确认后，一页最多 20 条按 `study_date,task_id` 无损复制原有历史，输入原数据无效时全页 409 且零写/游标不前进，旧数据仍原样保留，重复调用 `INSERT OR IGNORE` 不覆盖用户后续改动。所有身份经后台 `verifiedStudyActor()` 获取，禁止客户端自报 actor/role，匿名和已被 HomeFlow 撤销源会话均不可读写。
- `worker/index.ts` 注册全新私有路径，原单用户 `/api/daily-tasks` 和原 App 缓存保持 legacy-only；新 `HOMEFLOW_STUDY_DAILY_PROGRESS_ENABLED` 必须与 `HOMEFLOW_STUDY_SSO_ENABLED` 等同时显式开启，且 `APP_ENV=production`。新页面 **无法**通过 HomeFlow cookie 获得原学习 API 权限。
- `src/StudyHomeFlowDailyTasks.vue` 挂载在已认证 `StudyHomeFlowAccess.vue` 内，按 `identity.user_id` keyed remount；只从当前用户专用 D1 API 查询当天 SG/日语/英语任务，用户主动勾选后服务端保存，iPhone PWA 前台再读取，不写/读 `zhixue:tasks` 等旧共享 localStorage；owner 可点击明确确认的旧历史分页导入，member 没有导入入口。旧普通学习页面暂不做全量多账号放行。
- `scripts/homeflow-sso-isolated.test.mjs` 新真实 SQLite/模拟双 HomeFlow 身份回归：夫妻相同日期/ID 互不影响，owner 旧记录不自动泄漏，成员不可采用旧历史，版本冲突与无变化重试、真实 actor 追踪、不可变审计、损坏旧数据全页拒绝、20 条游标分页、源会话撤销、非法来源/日期/用户 ID 注入；`scripts/homeflow-pwa-ui.test.mjs` 新 PWA 私有缓存/按账号卸载/独立路由门槛测试。
- 首批提交：`6fa428fe0bbad317f1ccd608e761df7c086c417c`、`5099ce60f4a4257a0b9f1427137d35388f561824`、`eacfaade12d573fd9f6c337403b23ae6a423c7e7`、`52bb92d19792cfcc3ac64eae3ad5402058c8d715`、`e950bc9d52b67f252c1bf97a9519404887e1604e`、`bef879e3d4ac1ef80358b80db23d7f2a421f9cc7`、`127612613a4ea2dc05b1313bead51f12c2a63e6a`、`306230e3a4ec5e496eb838f43fceda33c603cd28`、`81ae94ff7eaa217663d8fe43e083de9344ffd314`、`1183a3bd10e48d56056aec9df8ee23169722c391`、`86e6f26b7a2942953bb2fe2512c96dffdff1fe4d`。
- 当前 [CI #43443153465](https://github.com/PTamako/it-study-platform/actions/runs/43443153465) **本记录时 in_progress**；后续必须以最新 Workflow 结果实查。尚未完成：语言卡复习、错题/考试作答、模拟考和每日词/语法/听力等表，旧 App 的 IndexedDB/localStorage 按 user_id 切换与真机两人交替登录。不能因为此每日任务模块通过而声称整个知学个人隔离完成。
