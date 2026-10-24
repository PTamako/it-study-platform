# Cloudflare Access 安全验收操作说明

本平台目前是个人学习应用，Worker 的部分 API 会读取或修改 D1 中的学习记录。**在启用访问控制并完成验收前，不要把它视为可公开多人使用的服务。**

## 推荐方案：保护整个 Worker

Cloudflare 官方支持直接在 Worker 层启用 Access；这样会同时保护这个 Worker 关联的 `workers.dev` 地址、路由、自定义域名和预览地址，不必只保护首页。

1. 登录 Cloudflare Dashboard，进入 **Workers & Pages**。
2. 选择生产 Worker **it-study-platform**，打开 **Access**（部分界面位于 Settings → Domains & Routes）。
3. 选择 **Protect this Worker behind Access**，流量范围选择 **All traffic**，不要只选 Previews。
4. 设置允许策略：只允许你本人实际使用的、已验证的邮箱地址。不要使用 `Everyone`、开放的邮箱域名或 Bypass 策略。
5. 保存后，先在无痕窗口访问生产 `workers.dev` 地址，确认必须经过 Access 登录；用允许的账号登录后，首页与 API 应可正常访问。
6. 还要检查是否存在更具体的 hostname/path Access 应用或账户级策略；Cloudflare 会按策略优先级应用匹配规则。

官方说明：[Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)。

## 自动部署兼容性（重要）

当前 GitHub Actions 部署流程在部署后会直接请求：

- `/api/health`
- `/api/language-cards?lang=ja`
- `/api/language-cards?lang=en`

如果这些请求都被 Access 保护，未经认证的 GitHub Actions 请求会被重定向到登录页或拒绝，导致部署后的验证失败。因此：

- 不要为了让 CI 通过而给所有人开放整个 Worker。
- 为现有 Access 应用创建 **Service Auth** 策略，并生成 Cloudflare Access Service Token。
- 将客户端 ID 和客户端 Secret 分别保存为 GitHub Actions Secrets：`CF_ACCESS_CLIENT_ID`、`CF_ACCESS_CLIENT_SECRET`；不要写进仓库、前端或日志。
- 确认 PR #37 的工作流改动已合并，并将客户端 ID 和 Secret 分别保存为上面的 GitHub Actions Secrets；然后再启用 Access 并部署。
- 该工作流改造和 Service Token 验证完成前，不要把 PR 合并触发生产部署。

Service Token 应仅用于受保护应用的自动化验证；不要把它注入前端。若以后增加其他公开 API，必须重新评估其是否应该绕过 Access。

## 必须执行的验收

- [ ] 未登录访问 Worker 首页会被 Access 拦截。
- [ ] 未登录直接请求 `/api/dashboard`、`/api/exam-history`、`/api/attempts`、`/api/scenario-attempts`、`/api/language-progress`、`/api/language-review`、`/api/vocabulary/saved`、`/api/daily-tasks`，不能读写个人数据。
- [ ] 使用允许的账号登录后，首页、考试练习、错题、语言学习、收藏等功能正常。
- [ ] 生产 Worker 的所有入口均已保护：`workers.dev`、自定义域名/路由（如有）和预览地址。
- [ ] Service Token 不会出现在前端构建产物、仓库内容、日志或浏览器网络请求中。
- [ ] GitHub Actions 使用 Service Token 成功完成部署后健康检查与日英语言卡片验证。
- [ ] 真实 iPhone Safari 的登录、会话续期和日英语音功能已重新验收。

只有以上相关检查完成后，才能关闭安全阻断 Issue；仅在 Dashboard 中点击启用 Access 还不等于全平台验收通过。
