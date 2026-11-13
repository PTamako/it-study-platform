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
