# -*- coding: utf-8 -*-
"""
把《长天有痕-连载/章节/*.txt》转成网站用的数据文件。

用法：
    python tools/build_data.py

产出：
    data/book.js        书籍元信息 + 章节目录
    data/ch/NNN.js      每章正文（按需加载）

以后写完新章节，重跑这个脚本即可。
"""
import json
import re
import sys
from pathlib import Path

# ---------- 配置 ----------
SRC_DIR = Path(r"C:\Users\Admin\Desktop\长天有痕-连载\章节")
ROOT = Path(__file__).resolve().parent.parent
OUT_DATA = ROOT / "data"
OUT_CH = OUT_DATA / "ch"

BOOK = {
    "title": "长天有痕",
    "author": "待填",          # ← 笔名改这里
    "genre": "东方玄幻",
    "status": "连载中",
    "coverText": "長天有痕",
    "intro": (
        "十五岁的苏玄在云溪镇长大。他点得着命火，天赋不差，"
        "却有一处谁也说不上来的旧伤——命火灰赤，不见于常理。"
        "那年岁考，主家验火，一块测命石碎在众目睽睽之下。"
        "\n\n"
        "养他长大的沈伯只留给他一句话：这管火种用出去的那一天，"
        "就不要再守着这座山了。"
        "\n\n"
        "命火、九纹、藏真经。他要去临河邑，去更大的地方，"
        "去弄明白自己身上到底锁着什么。"
    ),
    "tags": ["少年成长", "命火修行", "慢热", "伏笔流"],
}

CH_RE = re.compile(r"^第(\d+)章[-\s　]*(.+?)\.txt$")


def parse_chapter(path: Path):
    """返回 (num, title, paragraphs)"""
    m = CH_RE.match(path.name)
    if not m:
        return None
    num = int(m.group(1))
    title = m.group(2).strip()

    raw = path.read_text(encoding="utf-8", errors="replace")
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")
    lines = raw.split("\n")

    # 首行通常是「第一章　岁考」，用它校准标题
    body_start = 0
    if lines:
        first = lines[0].strip()
        if re.match(r"^第[一二三四五六七八九十百零\d]+章", first):
            body_start = 1
            parts = re.split(r"[　\s]+", first, maxsplit=1)
            if len(parts) == 2 and parts[1].strip():
                title = parts[1].strip()

    paragraphs = []
    for ln in lines[body_start:]:
        s = ln.strip()
        if not s:
            continue
        paragraphs.append(s)

    return num, title, paragraphs


def main():
    if not SRC_DIR.is_dir():
        print(f"[错误] 找不到章节目录：{SRC_DIR}", file=sys.stderr)
        return 1

    files = sorted(SRC_DIR.glob("*.txt"))
    chapters = []
    for f in files:
        parsed = parse_chapter(f)
        if parsed:
            chapters.append(parsed)
    chapters.sort(key=lambda x: x[0])

    if not chapters:
        print("[错误] 没有解析到任何章节", file=sys.stderr)
        return 1

    OUT_CH.mkdir(parents=True, exist_ok=True)

    # 清理旧数据
    for old in OUT_CH.glob("*.js"):
        old.unlink()

    index = []
    for num, title, paragraphs in chapters:
        chars = sum(len(p) for p in paragraphs)
        index.append({
            "n": num,
            "t": title,
            "c": chars,
            "w": round(chars / 1000, 1),   # 千字
        })
        payload = {"n": num, "t": title, "p": paragraphs}
        js = "window.CHAPTER=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";"
        (OUT_CH / f"{num:03d}.js").write_text(js, encoding="utf-8")

    book = dict(BOOK)
    book["chapters"] = index
    book["totalChars"] = sum(c["c"] for c in index)
    book["totalWords"] = round(book["totalChars"] / 1000, 1)
    book["latest"] = index[-1]["n"] if index else 1

    js = "window.BOOK=" + json.dumps(book, ensure_ascii=False, indent=2) + ";"
    (OUT_DATA / "book.js").write_text(js, encoding="utf-8")

    print(f"OK  章节 {len(index)} 章，合计 {book['totalWords']} 千字")
    print(f"    目录索引 -> {OUT_DATA / 'book.js'}")
    print(f"    正文数据 -> {OUT_CH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
