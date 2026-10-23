"""Where the fan games' files come from. USS Pelion lives on this branch; Grimm is built on claude/grimm-wild-west,
so its files are read from that branch (this branch's grimm-west/ is an old copy, used only if the branch is missing).
"""
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRANCHES = {"grimm-west/": os.environ.get("GRIMM_BRANCH", "origin/claude/grimm-wild-west")}  # GRIMM_BRANCH: try another branch


def read_bytes(rel):
    for prefix, branch in BRANCHES.items():
        if rel.startswith(prefix):
            r = subprocess.run(["git", "-C", str(ROOT), "show", f"{branch}:{rel}"], capture_output=True)
            if r.returncode == 0:
                return r.stdout
    return (ROOT / rel).read_bytes()


def read_text(rel):
    return read_bytes(rel).decode("utf-8")
