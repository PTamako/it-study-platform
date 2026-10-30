import re, sqlite3, unittest
from pathlib import Path
source = Path(__file__).resolve().parents[1].joinpath('worker/index.ts').read_text()
queries = re.findall(r"'(INSERT INTO daily_task_completions \(task_id, study_date, completed, updated_at\) VALUES \(\?, \?, \?, CURRENT_TIMESTAMP\) ON CONFLICT\(task_id, study_date\) DO (?:NOTHING|UPDATE SET completed = excluded.completed, updated_at = CURRENT_TIMESTAMP))'", source)
class ImportTest(unittest.TestCase):
 def setUp(self):
  self.db = sqlite3.connect(':memory:')
  self.db.execute('CREATE TABLE daily_task_completions (task_id TEXT, study_date TEXT, completed INT, updated_at TEXT, PRIMARY KEY(task_id, study_date))')
  self.insert = next(q for q in queries if q.endswith('DO NOTHING'))
  self.update = next(q for q in queries if 'DO UPDATE' in q)
 def state(self, date='2026-10-29'):
  return self.db.execute('SELECT completed FROM daily_task_completions WHERE task_id=? AND study_date=?', ('x', date)).fetchone()[0]
 def test_user_cancellation_before_legacy_import(self):
  self.db.execute(self.update, ('x','2026-10-29',0))
  self.db.execute(self.insert, ('x','2026-10-29',1))
  self.assertEqual(self.state(), 0)
 def test_user_cancellation_after_legacy_import(self):
  self.db.execute(self.insert, ('x','2026-10-29',1))
  self.db.execute(self.update, ('x','2026-10-29',0))
  self.assertEqual(self.state(), 0)
 def test_dates_do_not_collide(self):
  self.db.execute(self.update, ('x','2026-10-28',1))
  self.db.execute(self.update, ('x','2026-10-29',0))
  self.assertEqual(self.state('2026-10-28'), 1)
  self.assertEqual(self.state(), 0)
if __name__ == '__main__': unittest.main()
