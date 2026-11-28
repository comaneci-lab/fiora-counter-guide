import json
import tempfile
import time
import unittest
from pathlib import Path

import build_data
from fiora_guide import resolve_file


def make_data(root, files):
    (root / 'matchups').mkdir()
    (root / 'categories.json').write_text('{"categories": []}', encoding='utf-8')
    for name, content in files.items():
        (root / 'matchups' / name).write_text(json.dumps(content), encoding='utf-8')


class BuildDataTests(unittest.TestCase):
    def test_merges_and_marks_fresh(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_data(root, {'a.json': {'Ahri': {}}, 'b.json': {'Zed': {}}})
            self.assertTrue(build_data.is_stale(root))
            self.assertEqual(build_data.build(root), 2)
            self.assertFalse(build_data.is_stale(root))
            self.assertEqual(list(json.loads((root / 'matchups.json').read_text(encoding='utf-8'))), ['Ahri', 'Zed'])
            time.sleep(0.02)
            (root / 'matchups' / 'a.json').touch()
            self.assertTrue(build_data.is_stale(root))

    def test_duplicate_key_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            make_data(root, {'a.json': {'Ahri': {}}, 'b.json': {'Ahri': {}}})
            with self.assertRaises(ValueError):
                build_data.build(root)


class ResolveFileTests(unittest.TestCase):
    def test_only_whitelisted_and_no_traversal(self):
        with tempfile.TemporaryDirectory() as tmp:
            app, data = Path(tmp, 'app'), Path(tmp, 'data')
            app.mkdir()
            data.mkdir()
            (app / 'index.html').write_text('x')
            (app / 'secret.txt').write_text('x')
            (data / 'matchups.json').write_text('{}')
            self.assertEqual(resolve_file(app, data, '/'), (app / 'index.html').resolve())
            self.assertEqual(resolve_file(app, data, '/data/matchups.json?x=1'), (data / 'matchups.json').resolve())
            self.assertIsNone(resolve_file(app, data, '/secret.txt'))
            self.assertIsNone(resolve_file(app, data, '/data/../app/index.html'))


if __name__ == '__main__':
    unittest.main()
