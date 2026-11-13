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
