# Language-learning data sources and licensing

The 6,000-card seed migration is generated from pinned open data sources; the generated rows are not placeholders.

## Japanese (3,000 cards)
- **OpenJLPT** at commit \`0d1d3410bec90bd4098a7c72de820543cb4f707c\`, providing Japanese spelling, reading, community JLPT reference level, and Japanese examples. Dataset license: **CC BY-SA 4.0**. Levels are community references, not official JLPT vocabulary lists.
- **Tomoshi open dictionary data**, release \`v2026-10-13\`, provides Chinese glosses for JMdict-derived entries. Its Chinese gloss layer and JMdict-derived data are published under **CC BY-SA 4.0**; attribution includes EDRDG/JMdict and Tomoshi/Y1Z.
- Sources: https://github.com/evanclan/OpenJLPT and https://github.com/tomoshi-app/tomoshi-dict-data/releases/tag/v2026-10-13

## English (3,000 cards)
- **ECDICT** at commit \`bc015ed2e24a7abef49fc6dbbb7fe32c1dadaf8b\`, providing headwords, phonetics, Chinese translations, definitions, and available core/exam tags. License: MIT.
- Source: https://github.com/skywind3000/ECDICT

## Modifications
The generator selects unique headwords, groups them into learning categories, trims long definitions, and imports 3,000 cards per language. Japanese examples remain Japanese; English examples are not mislabeled as Chinese. The Japanese deck is a modified derivative of CC BY-SA data and must retain compatible share-alike terms and upstream attribution when redistributed.
