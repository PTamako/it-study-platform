# 知学统一账号 Stage B：安全身份表预备（未上线）

> 2026-11-13 仅完成**生产迁移前的数据库草案和自动测试**。此分支尚不具备可用的 HomeFlow 登录、业务权限隔离或 PWA UI；不得因为它被创建而授权第二位家庭成员访问学习数据。用户将在有电脑后亲自完成生产备份/恢复验证，在此之前**不得执行迁移或合并**。

- 选用 `0180_homeflow_identity_isolation.sql`，为现有未合并的题库 Draft PR #178 所使用的 `0177_fe_exemption_20200614_systems.sql` 保留编号，避免覆盖另一个 Chat 的题库工作。0180 不依赖 0177 表，正式合并次序应在题库 PR/后续迁移编号审查完成后再确认。
- 新表存 HomeFlow 真实 user_id、household_id、role、昵称和账户绑定状态；owner 一家庭仅一个。角色/归属不可更新，禁止通过昵称或 email 重绑历史。
- 新增拟议的 5 分钟一次性 OAuth/原 PWA 续接状态、独立的短期身份会话（服务端加密断言）、身份事件 actor_user_id；**没有启用服务端路由**，没有建立连接，没有在任何旧业务 SQL 接受新的身份会话。
- 不改写 `saved_vocabulary_entries_v2`、错题/考试、学习进度、公共题库、文书同步例句或任何前端缓存。丈夫不应从此功能获得既有 owner 学习数据。
- `scripts/homeflow-identity-foundation.test.mjs` 在内存 SQLite 验证迁移重复执行、旧数据不变、双 owner 不可建立、关联不可更改、没有真实 actor 不得写审计。

## 继续开发前必须完成

1. 用户完成四生产 D1/R2 的加密、持久、可恢复备份和隔离恢复证明，**此前不运行知学 0180 或激活 HomeFlow 开关**。
2. 阶段 B：参考 HomeFlow Draft #305 后端 PKCE 和两个 App 的原 PWA 一次性回传，加入真实受控登录/注销，绝不能继承旧 `AUTH_PASSWORD` 的默认私人学习数据；HomeFlow session-introspect 对每次敏感读取实时校验。
3. 阶段 E：全部个人学习表及 `saved_vocabulary_entries_v2(language,term)` 等复合主键无损迁移为按 user_id 隔离；旧学习数据只归现有 owner，member 新空间为空。个人缓存、学习卡、文书同步必须一并改造、完成同词并发回归后才开 UI。
4. 阶段 F：iPhone Safari/PWA 双人实测、切号端侧缓存隔离后，逐步撤下旧单人密码入口。

**状态**：Stage B schema/test only；Draft，未合并，未迁移，未部署，未改动 Cloudflare 生产或 Preview。
