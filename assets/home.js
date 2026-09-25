/* ============================================================
   首页逻辑
   ============================================================ */
(function () {
  "use strict";

  var KEY_PROGRESS = "ct_progress";
  var KEY_READ = "ct_read";

  var $ = function (id) { return document.getElementById(id); };

  function store(key, val) {
    try {
      if (val === undefined) {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* 隐私模式等，忽略 */ }
    return null;
  }

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  var book = window.BOOK;
  if (!book) {
    document.body.innerHTML =
      '<div class="wrap" style="padding:80px 20px;text-align:center;color:#a8a396">' +
      '数据未加载。请确认 <code>data/book.js</code> 存在。</div>';
    return;
  }

  var chapters = book.chapters || [];

  /* ---------- 基本信息 ---------- */
  document.title = book.title + " — 在线阅读";

  $("coverTitle").textContent = book.coverText || book.title;
  $("bookTitle").textContent = book.title;

  var metaParts = [];
  if (book.author && book.author !== "待填") metaParts.push("著 · " + book.author);
  if (book.genre) metaParts.push(book.genre);
  if (book.status) metaParts.push(book.status);
  metaParts.push(chapters.length + " 章");
  metaParts.push(book.totalWords + " 万字");
  $("bookMeta").innerHTML = metaParts
    .map(function (t) { return '<span>' + t + "</span>"; })
    .join('<span class="dot">/</span>');

  $("bookTags").innerHTML = (book.tags || [])
    .map(function (t) { return '<span class="tag">' + t + "</span>"; })
    .join("");

  var introText = (book.intro || "").trim();
  $("bookIntro").innerHTML = introText
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map(function (p) { return "<p>" + p.replace(/\n/g, "<br>") + "</p>"; })
    .join("");

  /* ---------- 统计 ---------- */
  var lastChapter = chapters.length ? chapters[chapters.length - 1] : { n: 1 };
  var stats = [
    { num: chapters.length, label: "章节" },
    { num: book.totalWords, label: "万字" },
    { num: lastChapter.n, label: "更新至" }
  ];
  $("stats").innerHTML = stats
    .map(function (s) {
      return '<div class="stats__item"><div class="stats__num">' + s.num +
        '</div><div class="stats__label">' + s.label + "</div></div>";
    })
    .join("");

  /* ---------- 目录 ---------- */
  var readList = store(KEY_READ) || [];
  var readSet = {};
  readList.forEach(function (n) { readSet[n] = true; });

  var progress = store(KEY_PROGRESS) || null;
  var currentN = progress && progress.chapter ? progress.chapter : null;

  if (chapters.length) {
    $("tocCount").textContent = "共 " + chapters.length + " 章 · " + book.totalWords + " 万字";
    $("tocList").innerHTML = chapters
      .map(function (c) {
        var cls = "toc__item";
        if (readSet[c.n]) cls += " is-read";
        if (c.n === currentN) cls += " is-current";
        return '<a class="' + cls + '" href="read.html?c=' + c.n + '">' +
          '<span class="toc__num">第 ' + pad3(c.n) + " 章</span>" +
          '<span class="toc__title">' + c.t + "</span>" +
          "</a>";
      })
      .join("");
  } else {
    $("tocList").innerHTML = '<div class="toc__empty">还没有章节，先把稿子放进 章节/ 目录再跑一次生成脚本。</div>';
  }

  /* ---------- 按钮 ---------- */
  var startBtn = $("startBtn");
  var continueBtn = $("continueBtn");

  startBtn.href = "read.html?c=" + (chapters.length ? chapters[0].n : 1);

  if (progress && progress.chapter) {
    var target = chapters.filter(function (c) { return c.n === progress.chapter; })[0];
    var name = target ? "第 " + target.n + " 章 " + target.t : "第 " + progress.chapter + " 章";
    continueBtn.hidden = false;
    continueBtn.textContent = "继续阅读 · " + name;
    continueBtn.href = "read.html?c=" + progress.chapter;
    startBtn.classList.remove("btn--primary");
    startBtn.classList.add("btn--ghost");
    startBtn.textContent = "从头开始";
  }
})();
