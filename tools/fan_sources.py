"""Where the fan games' files come from. Both are setting packs on this branch (fan-games/packs/), built by
tools/build-legend.py. Grimm used to be built on claude/grimm-wild-west; its files are read from that branch only if
its pack isn't here.
"""
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BRANCHES = {"grimm-west/": os.environ.get("GRIMM_BRANCH", "origin/claude/grimm-wild-west")}  # GRIMM_BRANCH: try another branch


def read_bytes(rel):
    for prefix, branch in BRANCHES.items():
        # Grimm rebuilt as a setting pack (fan-games/packs/grimm-west) is built on this branch: read it here.
        if rel.startswith(prefix) and not (ROOT / "fan-games" / "packs" / prefix.rstrip("/") / "pack.json").exists():
            r = subprocess.run(["git", "-C", str(ROOT), "show", f"{branch}:{rel}"], capture_output=True)
            if r.returncode == 0:
                return r.stdout
    return (ROOT / rel).read_bytes()


def read_text(rel):
    return read_bytes(rel).decode("utf-8")
