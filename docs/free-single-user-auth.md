# 免费单人登录配置（不需要 Zero Trust 或付款信息）

本方案使用现有 Cloudflare Workers + D1，不启用 Cloudflare Zero Trust，不要求银行卡或付款信息。它只是在应用层增加单人登录；不是替代 Cloudflare 边缘网络防护的通用身份平台。

## 配置前提

- Worker 名称：`it-study-platform`
- D1：`it-study-platform-db`
- 只在 Cloudflare Dashboard 的 Worker Settings / Variables and Secrets 中添加 **Secret**，不要把密码写入仓库、`wrangler.toml`、前端或聊天记录。
- `AUTH_PASSWORD`：你自己生成并保存的长密码，至少 16 个字符；建议使用密码管理器生成的随机密码。
- `AUTH_SESSION_SECRET`：独立的至少 32 个随机字符。不要与登录密码相同。
- 两个值都必须选择 Secret，而不是普通明文 Variable。

## 设置步骤

1. 打开 Cloudflare Dashboard → Workers & Pages → `it-study-platform` → Settings → Variables and Secrets。
2. 新增 Secret `AUTH_PASSWORD`，填入你自己的长密码。
3. 新增 Secret `AUTH_SESSION_SECRET`，填入另一段独立随机值。
4. 保存并部署 Worker 新版本后，登录页才会接受登录。未配置时系统会拒绝登录，不会开放个人数据 API。
5. 等待包含 `auth_login_rate_limits` 的 D1 migration 部署成功，再进行失败密码测试。

## 安全行为

- 登录成功后返回签名的 HttpOnly、Secure、SameSite=Strict、Path=/ 会话 Cookie，12 小时过期。
- 个人数据 API 统一要求有效会话；未登录返回 HTTP 401。
- 登录请求要求同源 Origin；错误密码按来源 IP 的 15 分钟时间窗限制，达到 5 次后返回 HTTP 429。限流计数存入 D1，不能只依赖 Worker 内存。
- 登出会清除当前浏览器的 Cookie。当前会话采用无状态签名令牌，因此若 Cookie 被窃取，副本仍可能在有效期内使用，最长至 12 小时过期；需要紧急撤销所有已签发会话时，轮换 `AUTH_SESSION_SECRET` 并部署新版本。密码和会话密钥都不返回给浏览器。
- 健康检查和公开学习内容仍可匿名访问；个人统计、答题历史、语言进度、收藏与每日任务必须登录。

## 验收限制

- 此实现不启用 Zero Trust，也不会产生 Zero Trust 订阅费用；Workers/D1 仍受 Cloudflare 当前免费额度和条款限制。
- 部署前必须确认 D1 migration 与 Worker 构建通过。真实线上未验证前，不应把验收标记为完成。
- 这是单人应用密码门，不适合多用户账户体系；如果将来开放多人使用，应改为独立用户、每用户数据归属和可靠会话管理。
