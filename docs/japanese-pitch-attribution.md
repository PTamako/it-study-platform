# 日语东京式高低音调数据

知学词典的单词级音调信息基于 Kanjium 项目所整理的高低音调资料：

- 项目：https://github.com/mifunetoshiro/kanjium
- 上游维护者：mifunetoshiro；原始音调资料提供者：Uros Mrkobrada（Uros O.）
- 授权：Creative Commons Attribution-ShareAlike 4.0 International（CC BY-SA 4.0）
- 许可：https://creativecommons.org/licenses/by-sa/4.0/
- 数据源：`data/source_files/raw/accents.txt`
- 固定上游版本：`9ebca4589565c696e7c39e089e2e928ad65f678c`

在 `npm run build` 前，`scripts/build-japanese-pitch.mjs` 将上述 TSV 转换为 `public/pitch-accent.json`。生成结果保留日语原词、假名读法和音调下降拍数，并去重与过滤无效数据，属于适用于应用查询的**格式转换版本**。该衍生数据继续按 CC BY-SA 4.0 共享，相关署名和许可说明不得删除。

页面上的音调采用 ⓪（平板）、①（头高）、②～（中高/尾高）样式。部分词有多种合法读法和音调，不同地区、语境、词义也可能影响实际发音；此数据为学习辅助，并非实时语音分析或权威审定。未匹配到**完全相同的词条与假名**时，应用不会推测音调。

音调词表是 Vite 公共静态资源，仅在用户查询到可展示读法的日语单词时按需获取并缓存；不使用 Cloudflare D1 读取、不占用 Google Apps Script 翻译调用和 Workers AI 次数。
