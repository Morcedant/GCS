#!/usr/bin/env python3
"""Music for the Legend Dynamics settings: tracks a GM can play at the table, or download.

Each setting keeps its tracks in legend-dynamics/<game>/music/ (western, spaceopera, fantasy, aurora): the audio files,
and tracks.json, which names them, in the order they're listed:

  { "intro": "A sentence or two for the top of the page (optional).",
    "tracks": [ { "file": "the-long-road.mp3", "title": "The Long Road", "mood": "Travel",
                  "use": "For the trail between towns.", "credit": "Composed by …", "license": "…",
                  "loop": true } ] }

Only "file" is needed; the rest is shown when it's there ("loop": the player repeats it by default, for ambience).
An audio file in the folder that tracks.json doesn't list is still put on the page, after the listed ones, titled from
its file name. With no tracks.json at all, every audio file is listed by name.

Add a track (copies it in, converts WAV, FLAC or AIFF to MP3 with ffmpeg, and lists it in tracks.json):

  python3 tools/music.py add <game> <file> [--title T] [--mood M] [--use U] [--credit C] [--license L] [--loop]
  python3 tools/music.py list [<game>]

tools/build-site.py builds the pages from these folders: /<setting>/music/ for each setting that has tracks, and
/music/ for all of them. A setting with no tracks gets no page, so nothing shows until there's something to hear.
"""
import json, pathlib, re, shutil, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LD = ROOT / "legend-dynamics"
GAMES = ["western", "spaceopera", "fantasy", "aurora"]
AUDIO = {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".ogg": "audio/ogg", ".oga": "audio/ogg", ".opus": "audio/ogg", ".wav": "audio/wav", ".flac": "audio/flac"}
CONVERT = {".wav", ".flac", ".aif", ".aiff"}
# Cloudflare Pages serves no file over 25 MiB: bigger tracks are left off the site, with a warning.
MAX_BYTES = 25 * 1024 * 1024


def folder(game):
    return LD / game / "music"


def title_from(name):
    stem = re.sub(r"^\d+[\s._-]+", "", pathlib.Path(name).stem)   # "01 - the long road" → "the long road"
    words = re.sub(r"[_-]+", " ", stem).split()
    small = {"a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"}
    return " ".join(w if w.isupper() else w.lower() if k and w.lower() in small else w[:1].upper() + w[1:] for k, w in enumerate(words)) or name


def duration(path):
    """Seconds, if ffprobe can tell; else None."""
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True, timeout=30)
        return round(float(out.stdout.strip())) if out.returncode == 0 and out.stdout.strip() else None
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return None


def manifest(game):
    p = folder(game) / "tracks.json"
    if not p.exists():
        return {"intro": "", "tracks": []}
    data = json.loads(p.read_text())
    data.setdefault("intro", ""); data.setdefault("tracks", [])
    return data


def tracks(game, warn=print):
    """The setting's tracks, in order: those tracks.json lists (and that exist), then any other audio files by name."""
    d = folder(game)
    if not d.is_dir():
        return []
    m = manifest(game)
    out, seen = [], set()
    files = {p.name: p for p in d.iterdir() if p.is_file() and p.suffix.lower() in AUDIO}
    for t in m["tracks"]:
        f = t.get("file")
        if not f or f not in files:
            warn(f"music: {game}: tracks.json lists {f!r}, which isn't in {d.relative_to(ROOT)}/")
            continue
        seen.add(f); out.append({**t, "path": files[f]})
    for name in sorted(set(files) - seen):
        out.append({"file": name, "path": files[name]})
    keep = []
    for t in out:
        size = t["path"].stat().st_size
        if size > MAX_BYTES:
            warn(f"music: {game}: {t['file']} is {size / 1048576:.1f} MiB; Cloudflare Pages serves 25 MiB at most, so it's left off the site (encode it as MP3 at 192 kbps or less)")
            continue
        t.setdefault("title", title_from(t["file"]))
        t["type"] = AUDIO[t["path"].suffix.lower()]
        t["bytes"] = size
        t["seconds"] = t.get("seconds") or duration(t["path"])
        keep.append(t)
    return keep


def add(game, src, title=None, mood=None, use=None, credit=None, license=None, loop=False):
    if game not in GAMES:
        sys.exit(f"Unknown setting {game!r}: one of {', '.join(GAMES)}")
    src = pathlib.Path(src)
    if not src.is_file():
        sys.exit(f"No such file: {src}")
    d = folder(game); d.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", src.stem).strip("-").lower() or "track"
    if ext in CONVERT:
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg is needed to convert WAV, FLAC or AIFF to MP3 (or convert it yourself, and add the MP3).")
        dest = d / f"{name}.mp3"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-codec:a", "libmp3lame", "-b:a", "192k", str(dest)], check=True)
    elif ext in AUDIO:
        dest = d / f"{name}{ext}"
        shutil.copyfile(src, dest)
    else:
        sys.exit(f"Not an audio file the site plays: {src.name} (MP3, M4A, OGG, Opus, WAV or FLAC)")
    m = manifest(game)
    entry = next((t for t in m["tracks"] if t.get("file") == dest.name), None)
    if not entry:
        entry = {"file": dest.name}; m["tracks"].append(entry)
    for k, v in (("title", title or entry.get("title") or title_from(src.name)), ("mood", mood), ("use", use), ("credit", credit), ("license", license)):
        if v: entry[k] = v
    if loop: entry["loop"] = True
    (d / "tracks.json").write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
    print(f"added {dest.relative_to(ROOT)} ({dest.stat().st_size / 1048576:.1f} MiB) as \"{entry['title']}\"")


def main(argv):
    if len(argv) >= 3 and argv[0] == "add":
        opts, rest, i = {}, argv[1:], 0
        pos = []
        while i < len(rest):
            a = rest[i]
            if a == "--loop": opts["loop"] = True; i += 1
            elif a.startswith("--") and i + 1 < len(rest): opts[a[2:]] = rest[i + 1]; i += 2
            else: pos.append(a); i += 1
        add(pos[0], pos[1], **opts)
    elif argv and argv[0] == "list":
        for g in (argv[1:] or GAMES):
            ts = tracks(g)
            print(f"{g}: {len(ts)} track{'' if len(ts) == 1 else 's'}")
            for t in ts:
                print(f"  {t['title']}  ({t['file']}, {t['bytes'] / 1048576:.1f} MiB{', ' + str(t['seconds']) + 's' if t['seconds'] else ''})")
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
