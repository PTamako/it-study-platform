import re, sqlite3, unittest
from pathlib import Path
source = Path(__file__).resolve().parents[1].joinpath('worker.ts').read_text()
query = re.search(r'`(INSERT INTO language_card_progress \(card_id, mastered, updated_at\).*?ON CONFLICT\(card_id\) DO NOTHING)`', source, re.S).group(1)
class MasteryTests(unittest.TestCase):
 def setUp(self):
  self.db = sqlite3.connect(':memory:')
  self.db.executescript("CREATE TABLE language_cards (id TEXT PRIMARY KEY, content_type TEXT); CREATE TABLE language_card_progress (card_id TEXT PRIMARY KEY, mastered INT, updated_at TEXT); INSERT INTO language_cards VALUES ('a','sentence'), ('wrong','word');")
 def state(self):
  return self.db.execute('SELECT card_id, mastered FROM language_card_progress').fetchall()
 def test_unmaster_before_import_not_overwritten(self):
  self.db.execute("INSERT INTO language_card_progress VALUES ('a',0,CURRENT_TIMESTAMP)")
  self.db.execute(query, ('a',))
  self.assertEqual(self.state(), [('a',0)])
 def test_unmaster_after_import_wins(self):
  self.db.execute(query, ('a',))
  self.db.execute("INSERT INTO language_card_progress VALUES ('a',0,CURRENT_TIMESTAMP) ON CONFLICT(card_id) DO UPDATE SET mastered=0")
  self.assertEqual(self.state(), [('a',0)])
 def test_old_client_true_cannot_resurrect_false(self):
  self.db.execute("INSERT INTO language_card_progress VALUES ('a',0,CURRENT_TIMESTAMP)")
  old_request = re.search(r"'(INSERT INTO language_card_progress \(card_id, mastered, updated_at\) VALUES \(\?, 1, CURRENT_TIMESTAMP\) ON CONFLICT\(card_id\) DO NOTHING)'", source).group(1)
  self.db.execute(old_request, ('a',))
  self.assertEqual(self.state(), [('a',0)])
 def test_new_explicit_toggle_can_remaster(self):
  self.db.execute("INSERT INTO language_card_progress VALUES ('a',0,CURRENT_TIMESTAMP)")
  explicit = re.search(r"'(INSERT INTO language_card_progress \(card_id, mastered, updated_at\) VALUES \(\?, \?, CURRENT_TIMESTAMP\) ON CONFLICT\(card_id\) DO UPDATE SET mastered = excluded.mastered, updated_at = CURRENT_TIMESTAMP)'", source).group(1)
  self.db.execute(explicit, ('a',1))
  self.assertEqual(self.state(), [('a',1)])
 def test_invalid_and_other_content_ignored(self):
  self.db.execute(query, ('wrong',)); self.db.execute(query, ('missing',))
  self.assertEqual(self.state(), [])
if __name__ == '__main__': unittest.main()
