/* ============================================================
   单本书页逻辑（book.html?id=xxx）
   ============================================================ */
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }
  function pad3(n) { return String(n).padStart(3, "0"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  var m = /[?&]id=([^&]+)/.exec(location.search);
  var bookId = m ? decodeURIComponent(m[1]) : null;
  var books = window.BOOKS || [];
  var entry = null;
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === bookId) { entry = books[i]; break; }
  }
  if (!entry) entry = books[0] || null;
  if (!entry) {
    document.body.innerHTML =
      '<div class="wrap" style="padding:80px 20px;text-align:center;color:#a8a396">' +
      '找不到这本书。<br><a href="index.html" style="color:#d9a45b">返回书架</a></div>';
    return;
  }

  var legacy = entry.id === "changtianyouhen";
  var KEY_PROGRESS = legacy ? "ct_progress" : "ct_progress_" + entry.id;
  var KEY_READ = legacy ? "ct_read" : "ct_read_" + entry.id;
  var dir = (entry.dir || "data").replace(/\/$/, "");

  function fail(msg) {
    $("bookMain").innerHTML =
      '<div style="padding:60px 20px;text-align:center;color:#a8a396">' + esc(msg) +
      '<br><a href="index.html" style="color:#d9a45b">返回书架</a></div>';
  }

  var s = document.createElement("script");
  s.src = dir + "/book.js";
  s.onload = function () { init(window.BOOK); };
  s.onerror = function () { fail("书籍数据加载失败，请确认 " + dir + "/book.js 存在。"); };
  document.head.appendChild(s);

  function init(book) {
    if (!book) { fail("书籍数据为空。"); return; }
    var chapters = book.chapters || [];
    var readUrl = function (n) { return "read.html?b=" + encodeURIComponent(entry.id) + "&c=" + n; };

    /* ---------- 基本信息 ---------- */
    document.title = book.title + " — 在线阅读";
    $("crumbBook").textContent = book.title;
    $("coverTitle").textContent = book.coverText || book.title;
    $("coverSeal").textContent = (book.title || "").charAt(0);
    $("bookTitle").textContent = book.title;

    var metaParts = [];
    if (book.author && book.author !== "待填") metaParts.push("著 · " + esc(book.author));
    if (book.genre) metaParts.push(esc(book.genre));
    if (book.status) metaParts.push(esc(book.status));
    metaParts.push(chapters.length + " 章");
    metaParts.push(book.totalWords + " 万字");
    $("bookMeta").innerHTML = metaParts
      .map(function (t) { return "<span>" + t + "</span>"; })
      .join('<span class="dot">/</span>');

    $("bookTags").innerHTML = (book.tags || [])
      .map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; })
      .join("");

    var introText = (book.intro || "").trim();
    $("bookIntro").innerHTML = introText
      .split(/\n\s*\n/)
      .filter(Boolean)
      .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; })
      .join("");

    /* ---------- 统计 ---------- */
    var lastChapter = chapters.length ? chapters[chapters.length - 1] : { n: 1 };
    var stats = [
      { num: chapters.length, label: "章节" },
      { num: book.totalWords, label: "万字" },
      { num: lastChapter.n, label: "更新至" }
    ];
    $("stats").innerHTML = stats
      .map(function (x) {
        return '<div class="stats__item"><div class="stats__num">' + x.num +
          '</div><div class="stats__label">' + x.label + "</div></div>";
      })
      .join("");

    /* ---------- 目录 ---------- */
    var readList = lsGet(KEY_READ, []) || [];
    var readSet = {};
    readList.forEach(function (n) { readSet[n] = true; });

    var progress = lsGet(KEY_PROGRESS, null);
    var currentN = progress && progress.chapter ? progress.chapter : null;

    if (chapters.length) {
      $("tocCount").textContent = "共 " + chapters.length + " 章 · " + book.totalWords + " 万字";
      $("tocList").innerHTML = chapters
        .map(function (c) {
          var cls = "toc__item";
          if (readSet[c.n]) cls += " is-read";
          if (c.n === currentN) cls += " is-current";
          return '<a class="' + cls + '" href="' + readUrl(c.n) + '">' +
            '<span class="toc__num">第 ' + pad3(c.n) + " 章</span>" +
            '<span class="toc__title">' + esc(c.t) + "</span>" +
            "</a>";
        })
        .join("");
    } else {
      $("tocList").innerHTML = '<div class="toc__empty">还没有章节。</div>';
    }

    /* ---------- 按钮 ---------- */
    var startBtn = $("startBtn");
    var continueBtn = $("continueBtn");

    startBtn.href = readUrl(chapters.length ? chapters[0].n : 1);

    if (progress && progress.chapter) {
      var target = null;
      for (var k = 0; k < chapters.length; k++) {
        if (chapters[k].n === progress.chapter) { target = chapters[k]; break; }
      }
      var name = target ? "第 " + target.n + " 章 " + target.t : "第 " + progress.chapter + " 章";
      continueBtn.hidden = false;
      continueBtn.textContent = "继续阅读 · " + name;
      continueBtn.href = readUrl(progress.chapter);
      startBtn.classList.remove("btn--primary");
      startBtn.classList.add("btn--ghost");
      startBtn.textContent = "从头开始";
    }
  }
})();
