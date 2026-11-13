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


### 本次每日任务隔离最终 CI 核验

- 原 [#179 Validate #43443670594](https://github.com/PTamako/it-study-platform/actions/runs/43443670594) 的失败是 16 个共用旧测试环境无法解析新增 `homeflow-daily-tasks` 相对 import；每日任务的三个真实 SQLite 双账号测试、PWA 隔离测试当时已成功。旧测试 `data:` URL 和临时 `.mts` 都使用 `scripts/inline-chinese-dictionary.mjs` 加载 Worker。
- 提交 `5bd62dd8bfb54e24ad92aba5d0e6c037677c66c2` 只在该测试辅助文件中把 HomeFlow daily import 显式替换成返回 503 的测试替身；未改生产身份授权、旧单用户 API 或新增真实个人 API。
- 最终最新 [**Validate #43444534566**](https://github.com/PTamako/it-study-platform/actions/runs/43444534566) GitHub Actions **completed / success**。实际 job 中 Run automated regression tests、Type-check and build frontend、Validate complete D1 migration chain locally 全部 **success**。最新本轮 Draft 代码 HEAD 为 `5bd62dd8bfb54e24ad92aba5d0e6c037677c66c2`；文档本身后续 commit 需再核对，但不代表生产上架。
- 所有新 SSO/每日任务功能在生产默认 OFF，0180/0181/0182 仍未获执行授权，保留 A=用户本人待完成及所有旧记录原样。后继开发者可继续逐表按 user_id 隔离错题、模拟考、语言卡和个人缓存，不重做每日任务模块。


## 2026-11-13 Stage E 增量：语言卡掌握和间隔复习逐用户隔离

- 此模块继续在 [原 Draft #179](https://github.com/PTamako/it-study-platform/pull/179) 开发，A 阶段仍由用户本人完成。0180/0181/0182/新增的 **0183_homeflow_language_progress.sql** 全部**只保存在 GitHub，未执行生产 D1 迁移**，未开启新登录/课程开关，未部署 Worker、未建 Preview、未合并 PR。
- 新 `homeflow_language_mastery` 和 `homeflow_language_reviews` 以 `(homeflow_user_id,card_id)` 为复合主键；二人同学一张卡也各自有掌握状态、复习次数、正确连续次数、三级记忆反馈和到期时间，CAS `version` 防旧设备覆盖；每次更改通过新 `homeflow_language_events` 记录实际 actor 的匿名卡片摘要/时间和审计动作，数据库触发器禁止冒充其它用户，审计不能删除或修改。**旧表 language_card_progress 与 language_card_reviews 一字不动**。
- 新 `worker/homeflow-language.ts` 用 `verifiedStudyActor` 每次从真实 HomeFlow source-session 核验用户，`HOMEFLOW_STUDY_LANGUAGE_ENABLED` 缺省关闭。独立路由：`/api/homeflow-study/language/status`、`/cards?lang=ja|en&limit=...&after=...`、`/mastery`、`/review`、`/legacy/adopt`；课程文本为已发布公有句子卡，个人进度只能查自己的。正常新身份无法访问旧单用户 /api/language-progress、/api/language-review。
- 三级复习间隔维持原规则：again 10min、hard 6h、remembered 随连续次数 1/3/7/14 日；hard 的 legacy last_result 仍记 again，另用 last_grade=hard 保留真实反馈。每次复习必须附带唯一 `request_id`、当前 `version`；服务端以 actor+SHA256(request_id) 去重、payload hash 防篡改，同一请求网络重试不会重复增加复习次数/审计。
- 老 owner（须已验证绑定旧知学签名 Session）`POST /legacy/adopt` 明确 `confirm:true`，按 `kind:mastery|reviews` 分别独立领取旧掌握/复习表，每次 20 条按卡片 ID 游标分页；先整批校验字段，任何坏行 409 不跳过；用 `INSERT OR IGNORE` 不覆盖 owner 已在新表修改的记录。member 不可领取，旧表只读。
- 新 `src/StudyHomeFlowLanguage.vue` 已挂载已认证的 `StudyHomeFlowAccess.vue`，以 `identity.user_id` keyed remount，支持中日/英语句子卡 12 条分页、掌握按钮、复习三级反馈、同一网络失败提交原样重试、原管理员两种历史明确确认导入；无旧 localStorage/IndexedDB 读写，不让 member 进入未隔离的旧 App 页面。
- 真实双账号 SQLite 回归在 `scripts/homeflow-sso-isolated.test.mjs` 增四组：两人同卡不同掌握/复习、严格 request_id 去重与多端版本冲突、原历史有坏行必须全页拒绝、超过 20 条连续分页和 disabled/撤销/越权校验；PWA 组件隔离用 `scripts/homeflow-pwa-ui.test.mjs` 静态测试。旧模拟 Worker 的 `scripts/inline-chinese-dictionary.mjs` 仅为新语言模块提供 503 禁用替身，不改生产鉴权。
- 代码提交（本次）：`e6b86c6d0f162a33024d02db47f62b8ab8562135`（0183）；`2b725b0ca0827e52bd985c60579677e1cd546858`（后端）；`7fdddb35568260d34a0d94dd0cf52229cc37240c`（路由）；`d8f7b8dc66078f5adfe60132bce9bc38b525d127`（旧测试 loader）；`17c78af4f0445cc8e9e860949c5cd52600ab10e0` 和 `5360f8b71fdb687c74c35c4b1ce4abe02d159bb5`（SQLite 双账号）；`4e2d9bff29e96848e45e3e1acb48629d178598cd`、`08f331b70766f9138515be6855ac4c46ff3fe859`（PWA）；`71c0387da16e206b094b8f0e1af07e02c67fe82b`（挂载）、`a2496361868de40e2a7293f0e91cb57433aca1f3`（UI 安全测试）。
- 第一轮完整 [CI #43447994442](https://github.com/PTamako/it-study-platform/actions/runs/43447994442) **failure**：481/482 项测试通过、仅一项旧 PWA 文案断言还预期“个人学习数据隔离尚未开放”；目前语言卡与每日任务已可独立使用，旧断言需准确表述剩余“考试、错题等仍待隔离”。新语言模块 **4 组 SQLite 全部通过，PWA 新隔离测试通过**。commit `6bac88b4ce8d77111062673e273e68df6e027fff` 已将旧文案断言修正，不改任何业务身份/SQL 逻辑；**下一轮 Validate 仍需核对最终状态，不得先声明全套 CI 成功**。
- 未完成：题目练习/考试历史/错题/语法/听力各类个人表与客户端脱敏缓存隔离；真正跨 App 全链路共享/审批与 iPhone 双人真机验收。不能把当前独立课程面板的完成写成整个知学双账号上线。


## 2026-11-13 Stage E：考试练习、错题、历史和完整模拟交卷隔离

> 原 [Draft PR #179](https://github.com/PTamako/it-study-platform/pull/179) 的下一组**未上线开发**。**A 阶段由用户本人继续备份+恢复验证，开发者不碰生产**：新 `0184_homeflow_exam_progress.sql` 和 `0185_homeflow_mock_exam_submissions.sql` 仅为 GitHub 代码文件，没有执行生产迁移、启用身份/考试功能开关、部署 Cloudflare 或创建 Preview；原有 0180～0183 也保持未上线。

- `0184` 新增 `homeflow_study_attempts`、`homeflow_question_review_state`、`homeflow_exam_history`、不可变 `homeflow_exam_events`；练习/错题/成绩按 `homeflow_user_id` 区分，复合主键、按账号错题和复习索引、准确真实 actor 审计，独立账户历史表不能覆盖别人的题目进度。现有 `study_attempts`、`question_review_state`、`exam_history` 保持原样、绝不迁移覆盖或删除。
- `worker/homeflow-exams.ts` 独立 `GET /api/homeflow-study/exams/{status,questions,wrong,history}` 与 `POST /{attempts,history,legacy/adopt}`；只在 `HOMEFLOW_STUDY_EXAMS_ENABLED=true` 且现有 HomeFlow SSO 正式源会话双向核验全部通过后启用。普通练习分页题目**交卷前不返回答案/解析**；每一条实际 POST 由 Worker 对 D1 标准答案判分，一次 `D1.batch` 原子写入本人答题、复习状态、不可变 actor 事件。重复答题编号重试读取原结果不重复计数，编号与另一答案冲突 409；按本人错题索引查询、成绩分页和显式补录均隔离，两人可各自使用相同编号。
- `/legacy/adopt` 仅原 HomeFlow owner 明确 `confirm:true`、`kind=attempts|reviews|history` 时每页 20 条导入旧个人历史。先读取且校验每条日期、答案 JSON、数量和已答记录；任何损坏返回 409，不跳过坏行；通过 JSON1 将校验后的确切快照作一次 batch `INSERT OR IGNORE`，旧表不改动，不覆盖 owner 已有新状态。旧模拟答题 ID 可能带题目 ID 后缀，允许最多 240 字符而不丢失；member 一律拒绝领取旧 owner 数据。
- `0185` 新增 `homeflow_mock_exam_submissions`（复合 `homeflow_user_id,submission_id`，原始交卷载荷与完整判分回执仅归本人、不可更新删除），不会改变旧 `mock_exam_submissions`。模拟交卷事件归属真实 actor，同一编号仅同一用户内部幂等。
- `worker/homeflow-mock.ts` 新 `/api/homeflow-study/exams/mock/{status,questions,submit}`，**额外**需 `HOMEFLOW_STUDY_MOCK_ENABLED=true`，默认 OFF。用 0128 `mock_question_pool` 的索引/随机 pivot 有界选题，SG 分配 48A+12B、FE A60、FE B 算法16+信息安全4；只有符合题库分布才返回试卷，缺题 409，不制造假题。**交卷前仅返回题目和选项，无正确答案**。提交 60/20 条必须准确、一题一次；Worker 自行从官方 D1 标准答案判分并校验 A/B 分类，单次 D1.batch 原子写本人回执、所有尝试、错题复习 state、成绩与事件；同一交卷超时重试复用原回执不重复记录，同 ID 在不同 HomeFlow 身份相互独立。
- 新手机组件 `src/StudyHomeFlowExams.vue` 提供个人 SG/FE 练题、答题后正确答案、私人错题/成绩分页、补录和原管理员历史确认导入；`src/StudyHomeFlowMock.vue` 提供 5 题/页的 SG/FE A/B 模拟考、作答进度、确认交卷、本人正确答案与解析及同 ID 重试。两个组件都在经过 `StudyHomeFlowAccess.vue` 实际 `identity` 后按 `user_id` keyed remount，**不读取旧 localStorage/IndexedDB 学习进度**，绝不把新 SSO Cookie 当作旧 `/api/mock-exam/submit` 等旧单用户 API 的通行证。未交卷试卷暂存在页面内存，刷新会丢失；离线完整持久续考目前**未实现**。
- 真实 SQLite 双人测试在 `scripts/homeflow-sso-isolated.test.mjs`：各身份相同题目/重复 attempt_id 完全隔离、同编号重复请求只记一次、连续正确三次自动掌握、个人错题不可串用、手工成绩隔离、原历史只归 owner、脏行全批拒绝、旧 ID 长度兼容、审计不可篡改，SG/FE A/B 的真实 60/20 道测试试卷与分布、答案交卷前不可见、全题服务器判分、同一交卷真实 D1 多表原子写入、重试不重计、错误科目/来源/日期拒绝。PWA 静态安全测试也增加账户 keyed、仅新 API/无 legacy cache 的检查。
- 为不破坏旧研究代码的独立模拟 Worker 测试，`scripts/inline-chinese-dictionary.mjs` 仅在老测试 data URL 中用 503 stub 新 Exam/Mock 模块；真实 Worker 仍导入真实安全路由。所有现有 PR 保持 Draft。
- 首批主要 Commit：`09bbcf86d42f5ebb78c72f92b7445ae82662145b`（0184）、`afcb9d69fe7975283f0c98a297d7d75341ed8334`（exam API）、`d8ac1080d7dcc36f6d2d15eea3df84b1dd33cb8f`（exams 路由）、`fd0226035360fb6f7ec120f0f34e6e31b3009172`（旧 mock tests stub）、`db62a6be180ca72ded221155606f6d06dc8c98d6`（SQLite schema fixture）、`251701bae9d4f37d1d35600991dee37cb703dc09`（个人题/错题/成绩双人回归）、`ba2d005987dc39a8f97864026a8cd1976960a8c9`（个人考试 UI）、`a36f70cf04c88aeacd44221988c369119b80752e`（按账号集成）、`4a05ebe10235c09a94d2dba596f964fd137db1ee`（PWA 测试）、`711dc8ab47b1286271904717b7b87ad401102678`（0185）、`85ef790a6884eec0249fb7a2b1aeaa9fa875e60f`（mock API）、`f68b75f7b5e771ab824de59a15f33e04eb3831e5`（mock 路由）、`84456d1a3f78b1b489f9e38202ab58e0e4d38eac`（旧 mock stub）、`a4efbab165ce8052e5ea31d0bb4029653f6e3358`（mock SQLite 题库）、`b9f079eb1fa463b4b5e41432ef92e661aa68ea65`（SG/FE 模拟考回归）、`cd1ce216027e73526c3588e6caf4609d5fbfe0d2`（模拟 UI）、`ec3a281808f22bb87cad97fcb20e88ed27763e46`（独立入口）、`af7aef5e18f3a5ef56dda50cdca1a5b25accdd37`（模拟 UI 隔离断言）、`0fe297a2594b5176af1cd0bcc3ea8bb4adc960b6`（长旧 ID 兼容）、`840783f6a2b757b77a69de66c605d3f58d403ffc`（长 ID 回归）。
- **此处首次记录时最新 GitHub Actions Validate 未得最终结果；不能声称已通过**。下一步必须实际查看最终 CI、修复所有测试/TypeScript/D1 问题，只有成功后才将本模块标记为「代码与自动化测试验收通过」，不能因此自动部署。

尚未完工：原账号模拟交卷**原始 receipt** 的完整迁移（旧答题/错题/考试摘要已可分三类领取）、部分 FE B 题库来源分布差异、跨端断线续考并隔离本地待提交队列、SG/FE 所有真实 iPhone 账户切换验收、剩余听力/语法/词卡相关个人记录分区、四 App 端到端审批。生产禁令和 A 用户备份责任持续有效。


## 2026-11-14 Stage E：每日语法 HomeFlow 个人答案隔离（未上线）

- 继续原 Draft #179、原分支 `feature/homeflow-identity-isolated-20261113`，不合并、不生产部署。用户负责 A 阶段备份恢复；`0180～0187` 仍全部仅是未执行 SQL 文件。未启用 `HOMEFLOW_STUDY_SSO_ENABLED` / `HOMEFLOW_STUDY_GRAMMAR_ENABLED`，新增开关默认 OFF。
- 原私人数据实际源头：`0133_daily_grammar_answers.sql` 的 `daily_grammar_answers(study_date,language,question_id,answer_index,updated_at)`，旧 `/api/grammar-progress` 和 `DailyGrammarLesson.vue` 的 `zhixue:daily-grammar-v1:date:language`/IndexedDB（共用数据库）。这三个旧路径均继续仅由旧学习密码会话授权，绝不可因 HomeFlow SSO 激活而让 member 使用。
- 新 `0187_homeflow_grammar_answers.sql`：`homeflow_grammar_answers` 以 `(homeflow_user_id,study_date,language,question_id)` 为主键，独立每个人的第一次答案、原更新时间与真实 `updated_by_user_id`；`homeflow_grammar_events` 持久不可变地记录实际写入及旧数据领取的 actor 与数量。数据库层拒绝跨人伪写、更新删除、同题同账号不同答案的并发静默忽略。主键复合索引复用，不增加重复 D1 读写索引；旧表不修改不清空。
- `worker/homeflow-grammar.ts` 及 `worker/index.ts`：独立 `GET/POST /api/homeflow-study/grammar`、`GET /status`、`POST /legacy/adopt`。每次读写都先经真正的 HomeFlow HttpOnly Cookie 与后端 source-session introspection，绝不使用浏览器传入 ID 作授权；写请求要求 `expected_user_id` 和真实认证身份相等，从而拒绝 iPhone 切换账号后以新 Cookie 重放旧账号待提交请求。同源 JSON、长度、题号、答案和日期均校验。写入只采用 first-write-wins，不修改原答题。
- 管理员原历史须拥有旧学习会话绑定证明并显式 `confirm:true` 后才能领取；成员返回 403。历史按 `study_date,language,question_id` 稳定游标、每批 20 条、整批先校验；任一损坏整批 409 无写入；同键不同内容拒绝，重入相同内容不重复审计。源原文和旧个人缓存不动，客户端不会自动复制历史。
- 新 `StudyHomeFlowGrammar.vue` 只在 `StudyHomeFlowAccess.vue` 已验证身份、`:key="'grammar:'+identity.user_id"` 的新隔离区挂载，并检查独立后端开关。展示日英双语每日语法三道题、正确反馈、本人服务端进度、管理员手动分页领取；无新 `localStorage/sessionStorage/IndexedDB`、无离线队列，断网明确失败需当前本人在线重试，切号/卸载清空内存状态。**旧 `DailyGrammarLesson.vue` 仍保留旧用户的离线模式，没有被本模块重新分区；整站本地缓存隔离未完成。**
- 自动验证：`scripts/homeflow-sso-isolated.test.mjs` 使用实际 SQLite 两个 HomeFlow 账号和真实 source-session 模拟，覆盖同题不同答案、旧 owner 唯一领取、重复入账和审计、成员越权、错误来源/账号/日期、身份撤销、数据库不可变约束、损坏旧页拒绝和 20+6 分页原文保存；`scripts/homeflow-pwa-ui.test.mjs` 静态检查 user-keyed、关闭门槛、零旧缓存/零旧 API。旧 Worker 数据 URL 测试 loader 只加 503 隔离 stub，不改变生产授权。
- 提交：`33f91daa`（0187 初始）、`4c5d85c4`（Worker）、`e0e396c3`（路由）、`02236c19`（SQLite）、`b6a04340`（PWA）、`1eea0dd9`（集成）、`f2980878`（PWA 测试）、`7525bfb8`（数据库竞争保护）、`9a367a7f`（并发回归）、`3b239bf4`（TS 类型）、`9c09f180`（D1 索引成本）、`7ba73128`（PWA 反馈）、`0e266dba`（旧测试 loader）。**最终 CI 以此后最新 HEAD 的 Actions 结论为准；本段不虚报成功。**
- 尚未完成：每日听力与每日单词隔离、旧 App 全部 localStorage/IndexedDB/离线队列按人隔离、跨账号 PWA 真机和双设备验收、完整发布回滚流程，四应用其他 B～E 功能也均未整体完成。


## 2026-11-14 Stage E：HomeFlow 每日听力个人答案隔离（未上线）

- 接续知学原 [Draft #179](https://github.com/PTamako/it-study-platform/pull/179)、同一 `feature/homeflow-identity-isolated-20261113` 分支，既有 0180～0187 不重做。旧 `0150_daily_listening_answers.sql` 的 `daily_listening_answers` 以 `(study_date,language,scene_id)` 为 PK，没有 `user_id`；旧 `/api/listening-progress`、`DailyListeningPractice.vue`、`zhixue:daily-listening-v1:<date>:<lang>` 和旧 IndexedDB 只保留原本旧单用户权限，绝不让新 SSO Cookie 读取。
- 0188 **未执行** `migrations/0188_homeflow_listening_answers.sql`：`homeflow_listening_answers` 按 `(homeflow_user_id,study_date,language,scene_id)` 存真实 actor 的单题答案；`homeflow_listening_events` 不可变审计 actor、写入/旧历史领取数量。禁止伪 actor、答案 UPDATE/DELETE、审计 UPDATE/DELETE；同 ID 不同答案即便 `INSERT OR IGNORE` 并发也数据库 RAISE，避免导入静默漏数据。复用主键索引降低 D1 写入。
- `worker/homeflow-listening.ts`，仅在 `HOMEFLOW_STUDY_SSO_ENABLED`、正式源 HomeFlow 会话 introspection、额外 `HOMEFLOW_STUDY_LISTENING_ENABLED=true` 完整通过时访问 `/api/homeflow-study/listening` GET/POST、`/status` GET、`/legacy/adopt` POST。额外新开关默认 OFF；每次读写仅用服务端真实 `actor.user_id`。写入必须附 `expected_user_id` 与经核验会话一致，旧账号离线排队写入遇切号则拒绝。同源 JSON/日期/语言/答案/当日 6 天轮换日常+职场场景严格校验，单日限 2 答。
- 原管理员须首次绑定旧个人有效会话证据，**另行点击确认**才能按 `study_date,language,scene_id` 稳定游标每批最多 20 条领取。任何脏行整页 409 拒绝，不能静默跳过或覆盖，新表同键不同答案拒绝，重复领取不新增审计；旧来源和原本离线录音功能不更改，成员不能领取。
- `src/StudyHomeFlowListening.vue` 独立显示两段当日原内容、日英切换、iPhone 用户手势 Web Speech 本机朗读、回答与中文解释、显式 owner 分页旧历史导入。在 `StudyHomeFlowAccess.vue` 经身份验证并以 `:key="'listening:'+identity.user_id"` 重建，只进行本人在线同步。**无**新 localStorage/sessionStorage/IndexedDB/待提交队列、不上传录音；断网请求失败后只能本人主动重试，切换用户时组件卸载清空旧进度并取消当前播放。原旧单用户跟读录音功能在旧 `DailyListeningPractice.vue` 保留，新面板当前不包含录音回听。
- 测试 `scripts/homeflow-sso-isolated.test.mjs` 使用真实 SQLite 两个 HomeFlow 模拟有效后台 session，覆盖夫妻同场景不同答案、旧 owner 唯一领取、重复写入无重复审计、非法日期及轮换场景拒绝、Origin/伪用户拒绝、SSO 失效和默认关闭、数据库不可变/并发冲突、损坏旧记录整页拒绝与 20+7 历史分页无损。UI `scripts/homeflow-pwa-ui.test.mjs` 检查账号 keyed、无旧缓存和录音上传；旧 `scripts/inline-chinese-dictionary.mjs` 仅在旧 data URL 模拟器补 503 stub，不改变真实 Worker 安全 API。
- Commit：`0b0e4fabc888bd9e8c237f294bf7040f1e28ac43` (0188)、`aa4beb9a71283ca3a4ca57ebf6e272d8db3f2052` (Worker)、`ccb167078a30a3ec1d24afce5d78414805c70686` (路由)、`d0220285eca3904603739ce924bb472a6d950003` (SQLite 双账号)、`5b879049459afae0013b72fc29666d592504094a` (PWA)、`b27befd711ceb80ae32d0b0b98f612a9f8f530d1` (身份挂载)、`2b8f6905fbd9780478378007b3296e63a1a6df82` (旧模拟 Worker)、`f0f4e2557bef62bcab18cbf83a6b3a29522c62aa` (UI 静态测试)。
- **本段写入时最新 CI [Validate #43465926474](https://github.com/PTamako/it-study-platform/actions/runs/43465926474) 仍 `in_progress`，不能视为测试通过。** 待确认自动化回归 / Vue build / 本地完整 D1 migration / Worker dry-run 的最终结论。真 iPhone 2 人同机/两设备、断网恢复等测试 **待真机验证**。
- 接下来：先核对最新 CI 最终状态、失败则修正后重跑；然后隔离 `0152_daily_word_reviews`，最后处理共享主 App `localStorage` / IndexedDB / 未完成队列的真正按用户区分。A 阶段备份验收记录仍不等于生产放行；禁止生产 SQL、启用开关、合并/部署/Preview。
