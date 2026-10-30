import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('truncated cached Tatoeba archives auto-repair without touching production data', () => {
  const source = String.raw`
import importlib.util
import io
import tarfile
import tempfile
from pathlib import Path
from unittest.mock import patch

source = Path("scripts/generate_language_sentence_seed.py").resolve()
spec = importlib.util.spec_from_file_location("tatoeba_generator_cache_test", str(source))
gen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gen)

with tempfile.TemporaryDirectory(prefix="tatoeba-cache-test-") as temp:
    root = Path(temp)
    original = root / "original-links.tar.bz2"
    with tarfile.open(str(original), "w:bz2") as archive:
        body = b"1\t2\n3\t4\n"
        member = tarfile.TarInfo("links.csv")
        member.size = len(body)
        archive.addfile(member, io.BytesIO(body))

    cached = root / "links.tar.bz2"
    original_bytes = original.read_bytes()
    cached.write_bytes(original_bytes[:max(24, len(original_bytes) // 3)])
    archive, rows = gen.rows_in_tar(cached, "links.csv", original.as_uri())
    try:
        assert list(rows) == [["1", "2"], ["3", "4"]]
    finally:
        archive.close()
    assert cached.read_bytes() == original_bytes
    assert not list(root.glob("*.part")), "atomic download left unfinished files"

    # A prematurely terminated HTTP response must never be treated as a cache hit.
    class IncompleteResponse:
        headers = {"Content-Length": "100"}
        reads = 0
        def __enter__(self): return self
        def __exit__(self, exc_type, exc, tb): return False
        def read(self, size):
            self.reads += 1
            return b"partial" if self.reads == 1 else b""

    target = root / "incomplete.tar.bz2"
    with patch.object(gen.urllib.request, "urlopen", return_value=IncompleteResponse()):
        try:
            gen.download("https://example.test/incomplete.tar.bz2", target)
        except OSError as error:
            assert "Incomplete Tatoeba download" in str(error), error
        else:
            raise AssertionError("Incomplete download incorrectly succeeded")
    assert not target.exists()
    assert not list(root.glob("*.part"))
`
  const result = spawnSync('python3', ['-c', source], { encoding: 'utf8', timeout: 60000 })
  assert.equal(result.status, 0, [result.stdout, result.stderr].filter(Boolean).join('\n'))
})
