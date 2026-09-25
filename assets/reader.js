/* ============================================================
   阅读页逻辑
   ============================================================ */
(function () {
  "use strict";

  var KEY_PREFS = "ct_prefs";
  var KEY_PROGRESS = "ct_progress";
  var KEY_READ = "ct_read";

  var $ = function (id) { return document.getElementById(id); };
  var pad3 = function (n) { return String(n).padStart(3, "0"); };

  function lsGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  }

  var book = window.BOOK;
  if (!book) {
    $("loading").innerHTML = '数据未加载。请确认 <code>data/book.js</code> 存在。';
    return;
  }

  var chapters = (book.chapters || []).slice();
  var byN = {};
  chapters.forEach(function (c) { byN[c.n] = c; });
  var minN = chapters.length ? chapters[0].n : 1;
  var maxN = chapters.length ? chapters[chapters.length - 1].n : 1;

  /* ---------- 阅读偏好 ---------- */
  var prefs = Object.assign(
    { font: 19, line: 1.95, theme: "paper" },
    lsGet(KEY_PREFS, {}) || {}
  );

  function applyPrefs() {
    document.body.dataset.theme = prefs.theme;
    var root = document.documentElement.style;
    root.setProperty("--rd-fs", prefs.font + "px");
    root.setProperty("--rd-lh", String(prefs.line));
    root.setProperty("--rd-pgap", (prefs.line * 0.46).toFixed(2) + "em");

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content",
        prefs.theme === "night" ? "#15171b" :
        prefs.theme === "sepia" ? "#dfe4d5" : "#f5f1e6");
    }

    syncSeg($("segFont"), prefs.font);
    syncSeg($("segLine"), prefs.line);
    syncSeg($("segTheme"), prefs.theme);
  }

  function syncSeg(box, val) {
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll(".seg__btn"), function (b) {
      var v = b.dataset.v;
      var on = (String(v) === String(val));
      b.classList.toggle("is-on", on);
    });
  }

  function bindSeg(box, key, cast) {
    if (!box) return;
    box.addEventListener("click", function (e) {
      var btn = e.target.closest(".seg__btn");
      if (!btn) return;
      prefs[key] = cast(btn.dataset.v);
      lsSet(KEY_PREFS, prefs);
      applyPrefs();
    });
  }

  bindSeg($("segFont"), "font", Number);
  bindSeg($("segLine"), "line", Number);
  bindSeg($("segTheme"), "theme", String);
  applyPrefs();

  /* ---------- 状态 ---------- */
  var cur = 1;
  var token = 0;

  /* ---------- 目录 ---------- */
  $("drawerBook").textContent = book.title;
  $("drawerCount").textContent = "共 " + chapters.length + " 章";

  $("drawerList").innerHTML = chapters
    .map(function (c) {
      return '<button class="dch" data-n="' + c.n + '">' +
        '<span class="dch__n">' + pad3(c.n) + "</span>" +
        '<span class="dch__t">' + c.t + "</span>" +
        "</button>";
    })
    .join("");

  $("drawerList").addEventListener("click", function (e) {
    var btn = e.target.closest(".dch");
    if (!btn) return;
    closeAll();
    go(Number(btn.dataset.n));
  });

  function markCurrent(n) {
    Array.prototype.forEach.call($("drawerList").querySelectorAll(".dch"), function (b) {
      b.classList.toggle("is-current", Number(b.dataset.n) === n);
    });
    var el = $("drawerList").querySelector('.dch[data-n="' + n + '"]');
    if (el && $("drawer").classList.contains("is-open")) {
      var top = el.offsetTop - $("drawerList").clientHeight / 2 + el.offsetHeight / 2;
      $("drawerList").scrollTop = Math.max(0, top);
    }
  }

  /* ---------- 面板控制 ---------- */
  var mask = $("mask"), drawer = $("drawer"), sheet = $("sheet");

  function openDrawer() {
    closeSheet();
    mask.classList.add("is-open");
    drawer.classList.add("is-open");
    markCurrent(cur);
  }

  function openSheet() {
    drawer.classList.remove("is-open");
    mask.classList.add("is-open");
    sheet.classList.add("is-open");
  }

  function closeSheet() { sheet.classList.remove("is-open"); }

  function closeAll() {
    mask.classList.remove("is-open");
    drawer.classList.remove("is-open");
    closeSheet();
  }

  mask.addEventListener("click", closeAll);
  $("btnToc").addEventListener("click", openDrawer);
  $("btnTocTop").addEventListener("click", openDrawer);
  $("btnDrawerClose").addEventListener("click", closeAll);
  $("btnSet").addEventListener("click", openSheet);
  $("btnSetTop").addEventListener("click", openSheet);

  /* ---------- 章节加载 ---------- */
  function isSeparator(s) {
    if (s.length > 8) return false;
    return /^[\s.·…*＊—\-—_=＊]+$/.test(s) && /[…*—\-_=·]{1,}/.test(s);
  }

  function renderChapter(data) {
    var idx = chapters.map(function (c) { return c.n; }).indexOf(data.n);
    $("chTitle").textContent = "第" + data.n + "章　" + data.t;
    $("headTitle").textContent = "第" + data.n + "章 " + data.t;
    $("chSub").textContent = "《" + book.title + "》 · " +
      (idx + 1) + " / " + chapters.length + " 章 · 约 " +
      Math.round(data.p.reduce(function (a, p) { return a + p.length; }, 0) / 100) / 10 + " 千字";

    $("chBody").innerHTML = data.p
      .map(function (p) {
        return isSeparator(p)
          ? '<p class="is-sep">…</p>'
          : "<p>" + p.replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</p>";
      })
      .join("");

    document.title = "第" + data.n + "章 " + data.t + " — " + book.title;

    // 翻页
    var prevN = data.n > minN ? chapters[idx - 1].n : null;
    var nextN = data.n < maxN ? chapters[idx + 1].n : null;
    setNav(prevN, nextN);

    $("loading").hidden = true;
    $("article").hidden = false;

    markCurrent(data.n);

    // 记录已读
    var read = lsGet(KEY_READ, []) || [];
    if (read.indexOf(data.n) === -1) {
      read.push(data.n);
      lsSet(KEY_READ, read);
    }

    // 恢复 / 重置滚动
    var prog = lsGet(KEY_PROGRESS, null);
    requestAnimationFrame(function () {
      if (prog && prog.chapter === data.n && prog.scroll > 0.015) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: Math.max(0, max * prog.scroll), behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      onScroll();
    });

    // 预取下一章
    if (nextN) {
      var l = document.createElement("link");
      l.rel = "prefetch";
      l.href = "data/ch/" + pad3(nextN) + ".js";
      document.head.appendChild(l);
    }
  }

  function setNav(prevN, nextN) {
    var pv = $("navPrev"), nx = $("navNext");
    pv.classList.toggle("is-off", !prevN);
    nx.classList.toggle("is-off", !nextN);
    $("navPrevName").textContent = prevN ? "第" + prevN + "章 " + (byN[prevN] ? byN[prevN].t : "") : "已是第一章";
    $("navNextName").textContent = nextN ? "第" + nextN + "章 " + (byN[nextN] ? byN[nextN].t : "") : "已是最后一章";
    $("btnPrev").classList.toggle("is-disabled", !prevN);
    $("btnNext").classList.toggle("is-disabled", !nextN);
  }

  function load(n) {
    if (!byN[n]) {
      $("loading").hidden = true;
      $("article").innerHTML = '<div class="err">没有找到第 ' + n + ' 章。<br><a href="index.html">返回书架</a></div>';
      $("article").hidden = false;
      return;
    }
    cur = n;
    var my = ++token;
    $("article").hidden = true;
    $("loading").hidden = false;

    var s = document.createElement("script");
    s.src = "data/ch/" + pad3(n) + ".js";
    s.onload = function () {
      if (my !== token) return;
      var data = window.CHAPTER;
      if (!data) {
        $("loading").innerHTML = "第 " + n + " 章内容为空。";
        return;
      }
      renderChapter(data);
    };
    s.onerror = function () {
      if (my !== token) return;
      $("loading").innerHTML = '第 ' + n + " 章加载失败。<br><a href=\"index.html\">返回书架</a>";
    };
    document.head.appendChild(s);
  }

  function go(n) {
    if (!byN[n] || n === cur) {
      if (!byN[n]) toast(n < minN ? "已经是第一章了" : "已经是最后一章了");
      return;
    }
    try {
      history.pushState({ c: n }, "", "read.html?c=" + n);
    } catch (e) { /* file:// 下不支持，忽略 */ }
    load(n);
  }

  $("navPrev").addEventListener("click", function (e) {
    e.preventDefault();
    var idx = chapters.map(function (c) { return c.n; }).indexOf(cur);
    if (idx > 0) go(chapters[idx - 1].n);
  });
  $("navNext").addEventListener("click", function (e) {
    e.preventDefault();
    var idx = chapters.map(function (c) { return c.n; }).indexOf(cur);
    if (idx > -1 && idx < chapters.length - 1) go(chapters[idx + 1].n);
  });
  $("btnPrev").addEventListener("click", function () {
    var idx = chapters.map(function (c) { return c.n; }).indexOf(cur);
    if (idx > 0) go(chapters[idx - 1].n);
  });
  $("btnNext").addEventListener("click", function () {
    var idx = chapters.map(function (c) { return c.n; }).indexOf(cur);
    if (idx > -1 && idx < chapters.length - 1) go(chapters[idx + 1].n);
  });

  /* ---------- 滚动进度 ---------- */
  var progressBar = $("progressBar");
  var saveTimer = null;

  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    progressBar.style.width = (ratio * 100).toFixed(2) + "%";

    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      lsSet(KEY_PROGRESS, { chapter: cur, scroll: ratio, time: Date.now() });
    }, 260);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  /* ---------- 键盘 ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "ArrowLeft") {
      var idx = chapters.map(function (c) { return c.n; }).indexOf(cur);
      if (idx > 0) go(chapters[idx - 1].n);
    } else if (e.key === "ArrowRight") {
      var i2 = chapters.map(function (c) { return c.n; }).indexOf(cur);
      if (i2 > -1 && i2 < chapters.length - 1) go(chapters[i2 + 1].n);
    } else if (e.key === "Escape") {
      closeAll();
    }
  });

  /* ---------- 点击正文切换工具栏 ---------- */
  var dx = 0, dy = 0, dt = 0;
  $("rdMain").addEventListener("pointerdown", function (e) {
    dx = e.clientX; dy = e.clientY; dt = Date.now();
  });
  $("rdMain").addEventListener("pointerup", function (e) {
    if (Math.abs(e.clientX - dx) > 8 || Math.abs(e.clientY - dy) > 8) return;
    if (Date.now() - dt > 400) return;
    var sel = window.getSelection && String(window.getSelection());
    if (sel && sel.length > 0) return;
    if (e.target.closest && e.target.closest("a,button")) return;
    document.body.classList.toggle("hide-ui");
  });

  /* ---------- 轻提示 ---------- */
  var toastEl = $("toast"), toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-show");
    }, 1600);
  }

  /* ---------- 返回时恢复 ---------- */
  window.addEventListener("popstate", function () {
    var n = getC();
    if (byN[n]) load(n);
  });

  function getC() {
    var m = /[?&]c=(\d+)/.exec(location.search);
    var n = m ? parseInt(m[1], 10) : NaN;
    if (!byN[n]) {
      var prog = lsGet(KEY_PROGRESS, null);
      n = (prog && byN[prog.chapter]) ? prog.chapter : minN;
    }
    return n;
  }

  /* ---------- 启动 ---------- */
  load(getC());
})();
