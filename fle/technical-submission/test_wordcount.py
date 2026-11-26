import unittest
from pathlib import Path

import wordcount


class WordCountTests(unittest.TestCase):
    def test_ignores_comments_and_reports_the_band(self):
        raw = "<!-- secret not counted -->\n# Title\n\n" + "word " * 450
        self.assertEqual(wordcount.count_words(raw), 451)
        self.assertIn("inside the 400-600 band", wordcount.verdict(451))
        self.assertIn("below", wordcount.verdict(20))
        self.assertIn("above", wordcount.verdict(601))

    def test_empty_template_is_below_the_band(self):
        draft = Path(__file__).with_name("draft.md").read_text(encoding="utf-8")
        count = wordcount.count_words(draft)
        self.assertLess(count, 400)
        self.assertIn("below", wordcount.verdict(count))


if __name__ == "__main__":
    unittest.main()
