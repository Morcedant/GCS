"""Version stamps for the built pages.

A page carries a footer like "Version 2026.10.15 · 3f9a2c1". The code is a fingerprint of the page's content
(everything but the stamp), so it changes exactly when the page does; the date is the day it last changed.
Rebuilding an unchanged page keeps its stamp, so a rebuild alone never looks like a new version.

The page marks where the stamp goes with <!-- VERSION:START --><!-- VERSION:END -->.
"""
import datetime, hashlib, pathlib, re

START, END = "<!-- VERSION:START -->", "<!-- VERSION:END -->"
SPAN = re.compile(re.escape(START) + r".*?" + re.escape(END), re.S)
OLD = re.compile(r'data-version-hash="([0-9a-f]+)" data-version-date="([0-9.]+)"')


def stamp(html, old_path=None):
    """Return html with its version footer filled in. old_path: the page as last built, to keep its date."""
    if START not in html:
        return html
    code = hashlib.sha256(SPAN.sub(START + END, html).encode()).hexdigest()[:7]
    date = datetime.datetime.now(datetime.timezone.utc).strftime("%Y.%m.%d")
    try:
        m = OLD.search(pathlib.Path(old_path).read_text()) if old_path else None
        if m and m.group(1) == code:
            date = m.group(2)
    except OSError:
        pass
    footer = (f'<span data-version-hash="{code}" data-version-date="{date}" title="The code changes whenever this page changes.">'
              f"Version {date} · {code}</span>")
    return SPAN.sub(lambda _: START + footer + END, html)
