import os
import shutil
import stat
import subprocess
import tempfile
import unittest
from pathlib import Path


@unittest.skipUnless(os.name != "nt", "Unix launcher tests")
class UnixLauncherTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="fle-coach-unix-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        coach = self.root / "coach"
        coach.mkdir()
        source = Path(__file__).resolve().parent
        for name in ("setup.sh", "start.sh"):
            target = coach / name
            shutil.copyfile(source / name, target)
            target.chmod(target.stat().st_mode | stat.S_IEXEC)

    def run_setup(self, env=None):
        script = self.root / "coach" / "setup.sh"
        return subprocess.run(
            ["/bin/bash", str(script)],
            capture_output=True, text=True, errors="replace", env=env, timeout=120,
            cwd=self.root,
        )

    def test_creates_and_reuses_environment(self):
        first = self.run_setup()
        self.assertEqual(first.returncode, 0, first.stderr)
        python = self.root / ".venv" / "bin" / "python"
        self.assertTrue(python.is_file() or python.is_symlink())
        second = self.run_setup()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("existing", second.stdout)
        server = self.root / "coach" / "server.py"
        server.write_text(
            "import os, sys\n"
            "assert '--open' in sys.argv\n"
            "print('Launcher ready')\n",
            encoding="utf-8",
        )
        env = os.environ.copy()
        launched = subprocess.run(
            ["/bin/bash", str(self.root / "coach" / "start.sh")],
            capture_output=True, text=True, errors="replace", env=env, timeout=120,
            cwd=self.root,
        )
        self.assertEqual(launched.returncode, 0, launched.stderr)
        self.assertIn("Launcher ready", launched.stdout)

    def test_missing_python_gives_instructions(self):
        env = os.environ.copy()
        env["PATH"] = str(self.root)
        result = self.run_setup(env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Python 3.10+", result.stderr)
        self.assertFalse((self.root / ".venv").exists())

    def test_incomplete_environment_is_not_overwritten(self):
        venv = self.root / ".venv"
        venv.mkdir()
        marker = venv / "keep.txt"
        marker.write_text("keep", encoding="utf-8")
        result = self.run_setup()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("will not overwrite", result.stderr)
        self.assertEqual(marker.read_text(encoding="utf-8"), "keep")


if __name__ == "__main__":
    unittest.main()
