import os
import sys
import tempfile
from pathlib import Path

# DB uji terpisah; harus diset SEBELUM app diimpor.
_tmp = Path(tempfile.mkdtemp()) / "test.db"
os.environ["HH_DATABASE_URL"] = f"sqlite:///{_tmp.as_posix()}"
os.environ["HH_RESEARCH_TOKEN"] = "token-uji"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
