/* ============================================================
   书架首页逻辑（多本书）
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
  function progKey(id) { return id === "changtianyouhen" ? "ct_progress" : "ct_progress_" + id; }

  var books = window.BOOKS || [];
  if (!books.length) {
    document.body.innerHTML =
      '<div class="wrap" style="padding:80px 20px;text-align:center;color:#a8a396">' +
      '书架是空的。请确认 <code>data/books.js</code> 存在。</div>';
    return;
  }

  document.title = "书架 — 在线阅读";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  }

  function metaHtml(b) {
    var parts = [];
    if (b.author && b.author !== "待填") parts.push("著 · " + esc(b.author));
    if (b.genre) parts.push(esc(b.genre));
    if (b.status) parts.push(esc(b.status));
    parts.push(b.chapters + " 章");
    parts.push(b.totalWords + " 万字");
    return parts.map(function (t) { return "<span>" + t + "</span>"; })
      .join('<span class="dot">/</span>');
  }

  function introHtml(b) {
    return String(b.intro || "").trim().split(/\n\s*\n/).filter(Boolean)
      .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; })
      .join("");
  }

  $("shelf").innerHTML = books.map(function (b) {
    var prog = lsGet(progKey(b.id), null);
    var actions;
    if (prog && prog.chapter) {
      actions =
        '<a class="btn btn--primary" href="read.html?b=' + encodeURIComponent(b.id) + "&c=" + prog.chapter + '">继续阅读 · 第 ' + prog.chapter + " 章</a>" +
        '<a class="btn btn--ghost" href="book.html?id=' + encodeURIComponent(b.id) + '">书页目录</a>';
    } else {
      actions =
        '<a class="btn btn--primary" href="book.html?id=' + encodeURIComponent(b.id) + '">进入书页</a>' +
        '<a class="btn btn--ghost" href="read.html?b=' + encodeURIComponent(b.id) + '&c=1">从头开始</a>';
    }
    return '<section class="hero">' +
      '<div class="cover"><h1 class="cover__title">' + esc(b.coverText || b.title) + "</h1>" +
      '<span class="cover__seal">' + esc((b.title || "").charAt(0)) + "</span></div>" +
      '<div class="info">' +
      '<h1 class="info__title">' + esc(b.title) + "</h1>" +
      '<div class="info__meta">' + metaHtml(b) + "</div>" +
      '<div class="tagrow">' + (b.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="intro">' + introHtml(b) + "</div>" +
      '<div class="actions">' + actions + "</div>" +
      "</div></section>";
  }).join("");
})();
