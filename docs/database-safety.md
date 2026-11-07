# 数据安全与部署约束

- 自动迁移不得清除用户答题、复习、生词本或考试历史。历史 0082 迁移已改为安全的占位 SQL。旧版重置 SQL 仅保留在 `scripts/manual-launch-reset.sql`，**不得加入自动部署流程或在生产 D1 执行**。
- 语言句子 0087 使用 INSERT/ON CONFLICT UPDATE 原位更新，避免 ON DELETE CASCADE 删除 `language_card_reviews` 和 `language_card_progress`。如源语料变化导致旧 ID 留存，应先审核差异、完成可验证的备份与迁移策略，不自动删除。
- 生产 D1 的真实状态尚未通过本轮源代码审查验证。执行远程迁移前，应导出备份并确认有无待执行的历史清理迁移。
- D1 CURRENT_TIMESTAMP 使用 UTC；前端统一明确以 UTC 解析时间，再根据东京当地日历显示。

- `0114_public_dictionary_rate_limits.sql` 只新增计数表及索引，不触及任何用户数据；执行前需确认迁移顺序，在远程 Worker 切换之前先部署该迁移。
- 模考成绩和复盘摘要会在交卷成功后持久化；交卷待同步时保存本机快照，不应将未提交答案提前作为真实成绩。

- 每次生产迁移前，部署工作流必须成功读取并保留 D1 Time Travel 恢复书签；失败则停止迁移，仓库保留 7 天 GitHub Actions 恢复记录。恢复属于覆盖生产数据的危险操作，仅应在单独审核并通知用户后手动执行；书签不能替代长期独立备份。

- 主分支自动生产发布新增 GitHub API 来源校验：仅已合并到 main 的 PR 所生成提交可自动部署；直接推送即使进入 main 也会在部署早期失败。手动 workflow_dispatch 是维护者显式操作。GitHub 分支保护（禁止直接推送、Required CI）仍需要管理员在仓库 Settings 中独立配置；部署保护并不能替代分支保护。
