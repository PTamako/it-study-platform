# 静态词典双语例句补全与语义纠错（2026-11-04）

## 范围和实际完成边界

此轮对知学平台 **3,000 日语＋3,000 英语授权学习词条（另各有 10 条平台原创词）** 的例句缺口做来源可核查的增补；并修正可确定的语法、句子分类误标。不会触碰 FE/SG 题库、用户学习进度或生产 D1。

之前离线审计的基线：日语授权词中 50 条缺例句、2,950 条有原文但缺中文例句翻译；英语授权词 3,000 条缺例句、30 条缺词条读音。这些数据是**缺口数量，不是错误词义条目数**。

## 来源明确的补全

1. 构建 `scripts/generate_language_sentence_seed.py` 时，本来就需要读取 Tatoeba 的原始日英句子和直接链接的中文社区译句。复用同一批公开数据，不再下载、查询生产 D1 或调用 AI。
2. `scripts/lexicon_example_matching.py` 使用**实际词形精确匹配**：英文受词边界约束，日文过滤常见黏连/汉字复合词误命中（例如「そいつ」不是「いつ」，「大学校」不是「学校」）。每个词匹配一条易读、直接对应中文句子的源句。
3. 每条匹配的双语句子必须保留其 `https://tatoeba.org/en/sentences/show/<ID>` 出处、原文、中文社区译文。源材料许可依 Tatoeba 公开语料协议；词条释义继续依各自原许可证。
4. 仅填补原来缺少完整双语例句的授权词条，**不会覆盖原来双语信息已经配对完整的条目，也不会伪造音标、词性、声调**。当前的源数据是否包含每个词的合适例句，需由实际 CI 生成报告统计，不能预先保证 6,000 个词全覆盖。
5. 自动匹配的例句专门标为 `source-linked-unreviewed-sense`，UI 明确告诉学习者「社区双语例句的文本有出处，但该词在句中的具体义项尚未逐条审校」。**有出处不等于语义完全准确**。
6. `scripts/build_static_learner_dictionary.py` 从临时源关联数据构建指纹 JSON，浏览器缓存静态词典；不新增 D1 表、迁移、用户数据读取或 Worker 推理费用。
7. 质量审计现在区分 `missingSourceExample`、`missingExampleTranslation`、`missingReading` 和 `linkedExamplesAwaitingSenseReview`，并持续阻断来源假冒、解释结构损坏。

## 本轮确认并修正的语义问题

- 英语 `used to + 原形` 才能在合适上下文表达「过去常常」。`be/get used to + 名词/动名词` 表示「习惯于」；`be used to + 动词` 还可能是被动结构「被用来……」。当源句仅凭词面匹配不能确定时，系统撤销误标，不臆断。
- 日语 `学ぶのは／食べるのが` 的 `の` 是**名词化**，不应全部解释为连接名词的所属助词；无法确认的省略结构宁可不标注。
- 英语 `change trains` 是交通换乘场景，不应仅凭 `change` 一个词归入职场课程；正式职场句仍会由 `meeting / schedule / deadline` 等工作线索识别。

## 尚未能宣称完成的人工校审

自动形式匹配不保证词义或例句语境一致；Tatoeba 的中文翻译由社区贡献，不能自动视为词典权威译文。尤其是英语多义词、日文异读同形词，必须人工核对本义/词性/形态以及句中实际词义；未匹配来源的词条保持缺失提示，严禁编造。

完成标准：全量自动测试 0 结构错误、明确的语义回归测试全绿；分语种公布匹配数、剩余未覆盖数、**尚未人工校审数**。若某些目标未覆盖，不能把「补全全部」标记为成功。

## 运行步骤

- `python scripts/generate_language_sentence_seed.py` —— 使用既有公开语料生成 10,000 张句子卡及同一批来源的临时例句索引。
- `python scripts/build_static_learner_dictionary.py` —— 带来源的词条例句补全并生成指纹词库。
- `node scripts/audit-language-quality.mjs` —— 出具来源/结构质量报告，不接触生产 D1。
- `npm test` —— 语法正反例、来源和回归测试。
- 由 PR CI 核验无误后合并，main 工作流发布，保留生产只读验证。

## 语言校对参考来源

- Cambridge Dictionary — [Used to 与 be used to 的区别](https://dictionary.cambridge.org/grammar/british-grammar/word-choice-used-to-and-be-used-to)。
- Bunpro — [「ものの」完整接续（動詞／い形／な形／名詞）](https://bunpro.jp/ja/grammar_points/%E3%82%82%E3%81%AE%E3%81%AE)。
- Tatoeba — [语料和翻译质量规范](https://en.wiki.tatoeba.org/articles/show/guidelines)。语料配对不构成各语言义项的专业核验。
