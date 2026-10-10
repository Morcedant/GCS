#!/usr/bin/env python3
"""Build a game's Players' Guide from <game>/players-guide.md.

Writes the guide into the creator's "Players' Guide" tab (between the GUIDE markers
in <game>/index.html) and, with --docx, a Word version.

  python3 tools/build-guide.py [--game uss-pelion|grimm-west] [--docx [--reference-doc original.docx]]
"""
import argparse, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Per game: Word file name, heading color, table header fill.
GAMES = {
    "uss-pelion": ("USS_Pelion_Players_Guide.docx", "1B2A4A", "E9EEF6"),
    "grimm-west": ("Grimm_Players_Guide.docx", "4A2A12", "F1E6D2"),
}
SRC = APP = DOCX = None
NAVY, GOLD_FILL = "1B2A4A", "E9EEF6"
START, END = "<!-- GUIDE:START -->", "<!-- GUIDE:END -->"


def pandoc(*args):
    return subprocess.run(["pandoc", str(SRC), *args], check=True, capture_output=True, text=True).stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game", choices=sorted(GAMES), default="uss-pelion", help="which game folder to build")
    ap.add_argument("--docx", action="store_true", help="also write the Word version")
    ap.add_argument("--reference-doc", help="a .docx whose styles the Word version should use")
    a = ap.parse_args()
    global SRC, APP, DOCX, NAVY, GOLD_FILL
    docx_name, NAVY, GOLD_FILL = GAMES[a.game]
    SRC, APP, DOCX = ROOT / a.game / "players-guide.md", ROOT / a.game / "index.html", ROOT / a.game / docx_name

    html = pandoc("-f", "markdown", "-t", "html", "--id-prefix=g-", "--wrap=none")
    app = APP.read_text()
    if START not in app or END not in app:
        sys.exit(f"GUIDE markers missing from {APP}")
    app = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: f"{START}\n{html}{END}", app, flags=re.S)
    APP.write_text(app)
    print(f"updated {APP.relative_to(ROOT)}")

    if a.docx:
        extra = [f"--reference-doc={a.reference_doc}"] if a.reference_doc else []
        subprocess.run(["pandoc", str(SRC), "-o", str(DOCX), *extra], check=True)
        finish_docx(DOCX)
        print(f"wrote {DOCX.relative_to(ROOT)}")


def finish_docx(path):
    """Give pandoc's plain Word output readable tables and a consistent typeface (needs python-docx)."""
    try:
        from docx import Document
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.shared import Pt, RGBColor
    except ImportError:
        print("python-docx not installed; leaving the Word file unstyled")
        return
    doc = Document(str(path))
    def style(name):
        try:
            return doc.styles[name]
        except KeyError:
            return None
    for name in ("Normal", "Body Text", "First Paragraph", "Compact"):
        if (st := style(name)) is not None:
            st.font.name, st.font.size = "Calibri", Pt(10.5)
    for name in ("Title", "Subtitle", "Heading 1", "Heading 2", "Heading 3"):
        if (st := style(name)) is not None:
            st.font.name = "Calibri"
            st.font.color.rgb = RGBColor.from_string(NAVY)
    for table in doc.tables:
        borders = OxmlElement("w:tblBorders")
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
            el = OxmlElement(f"w:{edge}")
            el.set(qn("w:val"), "single"); el.set(qn("w:sz"), "4"); el.set(qn("w:color"), "B8C2D3")
            borders.append(el)
        table._tbl.tblPr.append(borders)
        for r, row in enumerate(table.rows):
            for c, cell in enumerate(row.cells):
                if r == 0:
                    shd = OxmlElement("w:shd")
                    shd.set(qn("w:val"), "clear"); shd.set(qn("w:fill"), GOLD_FILL)
                    cell._tc.get_or_add_tcPr().append(shd)
                for para in cell.paragraphs:
                    for run in para.runs:
                        run.font.size = Pt(9.5)
                        if r == 0 or c == 0:
                            run.font.bold = True
    doc.save(str(path))


if __name__ == "__main__":
    main()
