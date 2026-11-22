#!/usr/bin/env python3
"""Build the static site into ./public using only the Python standard library.

    python3 build.py            # build into ./public
    python3 build.py --serve    # build, then serve on http://localhost:8000

Edit the JSON files in ./content to change contacts, courses, books and
learning material; edit ./templates for layout and page text.
"""
import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content"
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
OUT = ROOT / "public"

# (file stem, nav label, page title, show in nav)
PAGES = [
    ("index", "Home", None, True),
    ("learn", "Learn", "Practise French", True),
    ("courses", "Courses", "Courses", True),
    ("books", "Books", "Suggested books", True),
    ("tcf", "TCF & App", "The TCF exam and the CarnetTCF app", True),
    ("contact", "Contact", "Contact us", True),
    ("about", "About", "About & open source", True),
    ("404", "", "Page not found", False),
]

e = html.escape


def load(name):
    return json.loads((CONTENT / f"{name}.json").read_text(encoding="utf-8"))


def lookup(ctx, dotted):
    cur = ctx
    for part in dotted.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            raise KeyError(f"Unknown template variable: {dotted}")
    return cur


def render(text, ctx):
    """Replace {{ key }} (escaped) and {{{ key }}} (raw HTML)."""
    def sub(m):
        if m.group(1):
            return str(lookup(ctx, m.group(1)))
        return e(str(lookup(ctx, m.group(2))))

    # single pass, so inserted HTML is never re-scanned
    return re.sub(r"\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}", sub, text)


def tel(number):
    return "tel:" + re.sub(r"[^\d+]", "", number)


def build_fragments(site, courses, books):
    app = site["app"]
    features = "".join(
        f'<div class="card feature"><div class="feature-icon" aria-hidden="true">{e(f["icon"])}</div>'
        f'<h3>{e(f["title"])}</h3><p>{e(f["text"])}</p></div>'
        for f in app["features"]
    )

    store_buttons = "".join(
        f'<a class="btn {cls}" href="{e(url)}">{label}</a>'
        for url, label, cls in [
            (app["app_store_url"], "App Store", "btn-primary"),
            (app["play_store_url"], "Google Play", "btn-primary"),
            (app["web_url"], "Open web app", "btn-ghost"),
        ]
        if url
    )

    # CEFR levels (A1, B1–C1…) first in order, anything else ("All levels") last
    levels = sorted({c["level"] for c in courses}, key=lambda l: (not re.match(r"[ABC][12]", l), l))
    course_filters = '<button class="chip is-active" data-filter="all">All</button>' + "".join(
        f'<button class="chip" data-filter="{e(l)}">{e(l)}</button>' for l in levels
    )
    course_cards = "".join(
        f'<article class="card course" data-level="{e(c["level"])}">'
        f'<span class="badge">{e(c["level"])}</span><h3>{e(c["title"])}</h3>'
        f'<p>{e(c["summary"])}</p><dl class="meta">'
        f'<div><dt>Format</dt><dd>{e(c["format"])}</dd></div>'
        f'<div><dt>Duration</dt><dd>{e(c["duration"])}</dd></div>'
        f'<div><dt>Price</dt><dd>{e(c["price"])}</dd></div></dl>'
        f'<a class="btn btn-ghost" href="contact.html?course={e(c["title"])}">Ask about this course</a></article>'
        for c in courses
    )

    cats = sorted({b["category"] for b in books})
    book_filters = '<button class="chip is-active" data-filter="all">All</button>' + "".join(
        f'<button class="chip" data-filter="{e(c)}">{e(c)}</button>' for c in cats
    )
    book_cards = "".join(
        f'<article class="card book" data-level="{e(b["category"])}">'
        f'<div class="book-spine" aria-hidden="true">{e(b["title"][:1])}</div><div>'
        f'<span class="badge badge-soft">{e(b["category"])} · {e(b["level"])}</span>'
        f'<h3>{e(b["title"])}</h3><p class="author">{e(b["author"])}</p><p>{e(b["note"])}</p></div></article>'
        for b in books
    )

    c = site["contact"]
    phones = "".join(
        f'<li><span>{e(p["label"])}</span><a href="{e(tel(p["number"]))}">{e(p["number"])}</a></li>'
        for p in c["phones"]
    )
    if c.get("whatsapp"):
        wa = re.sub(r"\D", "", c["whatsapp"])
        phones += f'<li><span>WhatsApp</span><a href="https://wa.me/{wa}">{e(c["whatsapp"])}</a></li>'

    social = "".join(f'<a href="{e(s["url"])}">{e(s["label"])}</a>' for s in site["social"])

    return {
        "features_html": features,
        "store_buttons_html": store_buttons,
        "course_filters_html": course_filters,
        "course_cards_html": course_cards,
        "book_filters_html": book_filters,
        "book_cards_html": book_cards,
        "phones_html": phones,
        "social_html": social,
        "course_count": len(courses),
        "book_count": len(books),
    }


def nav_html(active):
    items = []
    for stem, label, _, show in PAGES:
        if not show:
            continue
        cur = ' aria-current="page"' if stem == active else ""
        items.append(f'<li><a href="{stem}.html"{cur}>{e(label)}</a></li>')
    return "".join(items)


def main():
    site = load("site")
    fragments = build_fragments(site, load("courses"), load("books"))

    if OUT.exists():
        shutil.rmtree(OUT)
    shutil.copytree(STATIC, OUT)
    (OUT / "data").mkdir(exist_ok=True)
    shutil.copy(CONTENT / "learn.json", OUT / "data" / "learn.json")

    base = (TEMPLATES / "base.html").read_text(encoding="utf-8")
    for stem, _, title, _ in PAGES:
        ctx = {"site": site, **fragments}
        body = render((TEMPLATES / "pages" / f"{stem}.html").read_text(encoding="utf-8"), ctx)
        page_ctx = {
            **ctx,
            "page_title": f"{title} · {site['name']}" if title else f"{site['name']} — {site['tagline']}",
            "page": stem,
            "nav_html": nav_html(stem),
            "content_html": body,
        }
        (OUT / f"{stem}.html").write_text(render(base, page_ctx), encoding="utf-8")
        print(f"  built {stem}.html")
    print(f"Done → {OUT}")

    if "--serve" in sys.argv:
        import functools
        import http.server

        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(OUT))
        print("Serving on http://localhost:8000 (Ctrl+C to stop)")
        http.server.ThreadingHTTPServer(("", 8000), handler).serve_forever()


if __name__ == "__main__":
    main()
