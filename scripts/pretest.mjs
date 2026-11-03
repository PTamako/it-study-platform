import { existsSync } from 'node:fs'

// npm test runs without the generator; fail with a useful prerequisite error
// rather than cryptic Node TS-parser and ENOENT test failures.
const major = Number(process.versions.node.split('.')[0])
const issues = []
if (major !== 22) issues.push(`Node.js 22 is required (current: ${process.version}). Run: nvm use 22`)
for (const relative of [
  '../migrations/0081_language_sentence_cards.sql',
  '../migrations/0084_refresh_contextual_bilingual_annotations.sql',
  '../migrations/0087_rebuild_contextual_bilingual_sentence_cards.sql',
  '../migrations/0092_fe_practice_bank.sql',
  '../migrations/0119_fe_growth_phase1_original_80.sql',
  '../migrations/0120_fe_ipa_2019_spring_morning_07_27.sql',
  '../migrations/0129_fe_ipa_2019_spring_am_28_40.sql',
  '../migrations/0130_fe_ipa_2019_spring_am_41_50.sql',
  '../migrations/0132_fe_ipa_2019_spring_am_51_60.sql',
  '../migrations/0122_fe_ipa_2022_sample_training_batch1.sql',
  '../migrations/0123_fe_ipa_2022_sample_completion.sql',
  '../migrations/0126_fe_ipa_exemption_first23.sql',
  '../migrations/0131_fe_exemption_20200614_q07_q10.sql',
]) {
  if (!existsSync(new URL(relative, import.meta.url))) {
    issues.push(`Missing generated fixture: ${relative.slice(3)}`)
  }
}
if (issues.length) {
  console.error('\nTest prerequisites are not ready:\n' + issues.map(issue => '- ' + issue).join('\n'))
  console.error('Run the complete local acceptance workflow: nvm use 22 && bash scripts/check-local.sh\n')
  process.exitCode = 1
} else {
  console.log('Test prerequisites: Node 22 and generated language migrations are ready.')
}
