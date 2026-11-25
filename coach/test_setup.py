import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


@unittest.skipUnless(os.name == "nt" and shutil.which("powershell.exe"), "Windows PowerShell required")
class SetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="fle-coach-setup-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        coach = self.root / "coach"
        coach.mkdir()
        self.script = coach / "setup.ps1"
        shutil.copyfile(Path(__file__).with_name("setup.ps1"), self.script)
        self.powershell = shutil.which("powershell.exe")

    def run_setup(self, env=None):
        return subprocess.run(
            [self.powershell, "-NoProfile", "-File", str(self.script)],
            capture_output=True, text=True, errors="replace", env=env, timeout=120,
        )

    def test_creates_and_reuses_environment(self):
        first = self.run_setup()
        self.assertEqual(first.returncode, 0, first.stderr)
        python = self.root / ".venv" / "Scripts" / "python.exe"
        self.assertTrue(python.is_file())
        second = self.run_setup()
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertIn("existing", second.stdout)
        coach = self.root / "coach"
        shutil.copyfile(Path(__file__).with_name("start.ps1"), coach / "start.ps1")
        (coach / "server.py").write_text(
            "import os, sys\n"
            "assert os.environ['XAI_API_KEY'] == 'test-xai'\n"
            "assert os.environ['GEMINI_API_KEY'] == 'test-gemini'\n"
            "assert '--open' in sys.argv\n"
            "print('Launcher ready')\n",
            encoding="utf-8",
        )
        env = os.environ.copy()
        env.update({"XAI_API_KEY": "test-xai", "GEMINI_API_KEY": "test-gemini"})
        launched = subprocess.run(
            [self.powershell, "-NoProfile", "-File", str(coach / "start.ps1")],
            capture_output=True, text=True, errors="replace", env=env, timeout=120,
        )
        self.assertEqual(launched.returncode, 0, launched.stderr)
        self.assertIn("Launcher ready", launched.stdout)

    def test_missing_python_gives_instructions(self):
        env = os.environ.copy()
        env["PATH"] = str(self.root)
        result = self.run_setup(env)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("python.org/downloads/windows", result.stderr)
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
