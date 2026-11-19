/* ============================================================
   系统解剖学 · 学习站
   纯静态 / 无依赖 / file:// 可直开
   模块：路由 · 间隔重复(SRS) · 背诵 · 做题 · 图解 · 速查 · 设置
   ============================================================ */
(function () {
  'use strict';

  /* ================= 数据 ================= */
  var D = window.ANAT || {};
  var CH = D.chapters || [];
  var CHMAP = {};
  CH.forEach(function (c) { CHMAP[c.id] = c; });

  function clean(arr, test) { return (arr || []).filter(function (x) { return x && test(x); }); }
  var TERMS = clean(D.terms, function (x) { return x.term && x.def; });
  var QA = clean(D.qa, function (x) { return x.q && x.a; });
  var MCQ = clean(D.mcq, function (x) { return x.q && x.opts && x.opts.length >= 2; });
  var FILL = clean(D.fill, function (x) { return x.text && x.text.indexOf('{') >= 0; });
  var VOCAB = clean(D.vocab, function (x) { return x.en && x.zh; });
  var IMAGES = clean(D.images, function (x) { return x.file; });
  var TIPS = clean(D.tips, function (x) { return x.title && x.text; });
  var META = D.meta || {};

  /* ================= 小工具 ================= */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function E(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function chName(id) { return (CHMAP[id] && CHMAP[id].name) || '其他'; }
  function chColor(id) { return (CHMAP[id] && CHMAP[id].color) || '#8d8277'; }
  function chGlyph(id) { return (CHMAP[id] && CHMAP[id].glyph) || '·'; }
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/\s+/g, '')
      .replace(/[，。、；：？！""''（）()《》,.;:?!"'\[\]【】—\-~～]/g, '')
      .toLowerCase();
  }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function fmtDate(d) {
    var w = '日一二三四五六'[d.getDay()];
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 · 周' + w;
  }

  /* ================= 本地存储 ================= */
  var LSKEY = 'anat.v1';
  var S = loadStore();
  function loadStore() {
    var base = { srs: {}, days: {}, wrong: {}, notes: {}, prefs: { theme: 'light', goal: 30 } };
    try {
      var raw = localStorage.getItem(LSKEY);
      if (!raw) return base;
      var o = JSON.parse(raw);
      base.srs = o.srs || {};
      base.days = o.days || {};
      base.wrong = o.wrong || {};
      base.notes = o.notes || {};
      base.prefs = Object.assign({ theme: 'light', goal: 30 }, o.prefs || {});
      return base;
    } catch (e) { return base; }
  }
  var saveT = null;
  function save() {
    clearTimeout(saveT);
    saveT = setTimeout(function () {
      try { localStorage.setItem(LSKEY, JSON.stringify(S)); } catch (e) {}
    }, 100);
  }

  /* ================= 间隔重复 ================= */
  var DAY = 86400000;
  var IVL = [0, 1, 2, 4, 8, 16, 30, 60];
  function keyOf(kind, id) { return kind + ':' + id; }
  function card(kind, id) { return S.srs[keyOf(kind, id)] || null; }
  function isDue(kind, id) {
    var c = card(kind, id);
    return !c || c.d <= Date.now();
  }
  function boxOf(kind, id) {
    var c = card(kind, id);
    return c ? c.b : -1;
  }
  function rate(kind, id, g) {
    var k = keyOf(kind, id);
    var c = S.srs[k] || { b: 0, d: 0, n: 0, ok: 0 };
    c.n++;
    if (g === 3) { c.b = Math.min(7, c.b + 1); c.ok++; c.d = Date.now() + IVL[c.b] * DAY; }
    else if (g === 2) { c.b = Math.max(1, c.b); c.d = Date.now() + Math.max(0.5, IVL[c.b] * 0.5) * DAY; }
    else { c.b = 0; c.d = Date.now() + 15 * 60000; }
    S.srs[k] = c;
    bump('r');
    save();
  }
  function statsToday() {
    var k = dayKey();
    if (!S.days[k]) S.days[k] = { r: 0, q: 0, c: 0 };
    return S.days[k];
  }
  function bump(field, n) {
    var s = statsToday();
    s[field] = (s[field] || 0) + (n == null ? 1 : n);
    save();
  }
  function streak() {
    var n = 0, d = new Date();
    for (var i = 0; i < 400; i++) {
      var s = S.days[dayKey(d)];
      if (s && (s.r || s.q)) n++;
      else if (i > 0) break;
      d = new Date(d.getTime() - DAY);
    }
    return n;
  }

  /* ================= 新手指引 ================= */
  var TOUR = [
    {
      t: '先看「讲解」',
      d: '每章都有一篇写给「上课没听懂」的人看的讲解：模型能直接拖着转，图和模型在同一个卡片里，读到哪看到哪。',
      go: 'learn', btn: '去讲解'
    },
    {
      t: '模型怎么用',
      d: '手指按住拖 = 转，双指捏 = 缩放，点任意一块 = 它叫什么、和哪些名词有关。心脏的外壁默认收起来了，想看就点「心室壁」。',
      go: 'learn', btn: '明白了'
    },
    {
      t: '再背「背诵」',
      d: '卡片里自带可拖动的模型和对照图，看完就点「会了 / 模糊 / 忘了」，系统按记忆曲线安排下次复习。笔记写在卡片下面，随时补。',
      go: 'recite', btn: '去背诵'
    },
    {
      t: '最后做「练习」',
      d: '选择题、填空、默写自动判分，错的进错题本。每天只要完成底部的目标条，期末前一定过一遍。',
      go: 'quiz', btn: '去练习'
    }
  ];
  function maybeTour() {
    if (S.prefs.tour) return;
    var i = 0;
    function step() {
      if (i >= TOUR.length) { S.prefs.tour = 1; save(); return; }
      var s = TOUR[i];
      var el = document.createElement('div');
      el.className = 'tour-hint';
      el.innerHTML = '<p><b>' + E(s.t) + '</b>　' + E(s.d) + '</p>'
        + '<div class="tour-acts">'
        + '<button class="btn btn-primary" data-tnext>' + E(s.btn) + '</button>'
        + '<button class="btn btn-ghost" data-tskip>知道了</button></div>';
      document.body.appendChild(el);
      $('[data-tnext]', el).onclick = function () {
        el.remove(); i++;
        if (s.go) go(s.go, {});
        step();
      };
      $('[data-tskip]', el).onclick = function () {
        el.remove(); S.prefs.tour = 1; save();
      };
    }
    step();
  }

  var toastT = null;
  function toast(msg) {
    var old = $('#toast'); if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'toast'; el.id = 'toast'; el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastT);
    toastT = setTimeout(function () { if (el.parentNode) el.remove(); }, 1900);
  }

  /* ================= 主题 ================= */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'dark' ? '#14161a' : '#f2ede4');
    var b = $('#btn-theme');
    if (b) {
      b.innerHTML = t === 'dark'
        ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/></svg>'
        : '<svg viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z"/></svg>';
    }
    save();
  }

  /* ================= 图标 ================= */
  var ICON = {
    home: '<svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>',
    recite: '<svg viewBox="0 0 24 24"><path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1z"/></svg>',
    quiz: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M8 10.5l2 2 4-4M8 15.5h5"/></svg>',
    atlas: '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l4.5-4.5 3.5 3.5 3-3L20 17"/></svg>',
    ref: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>',
    pen: '<svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16z"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><circle cx="9" cy="10.5" r="1.4"/><path d="M4.5 17l4-4 3 3 2.5-2.5L19 18"/></svg>',
    layers: '<svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"/></svg>'
  };

  var TABS = [
    { id: 'home', label: '今日', icon: 'home' },
    { id: 'recite', label: '背诵', icon: 'recite' },
    { id: 'quiz', label: '练习', icon: 'quiz' },
    { id: 'learn', label: '讲解', icon: 'atlas' },
    { id: 'ref', label: '速查', icon: 'ref' }
  ];

  /* ================= 路由 ================= */
  var viewEl, tabEl;
  var cur = { path: 'home', p: {} };
  var RS = { mode: 'term', chapter: 'all', queue: [], i: 0, stage: 0, cloze: false, needBuild: true };

  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '');
    var parts = h.split('?');
    var p = {};
    (parts[1] || '').split('&').forEach(function (kv) {
      if (!kv) return;
      var a = kv.split('=');
      p[decodeURIComponent(a[0])] = decodeURIComponent(a[1] || '');
    });
    return { path: parts[0] || 'home', p: p };
  }
  function go(path, p) {
    var q = '';
    if (p) {
      q = Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
    }
    location.hash = '#/' + path + (q ? '?' + q : '');
  }
  function renderTabs(active) {
    tabEl.innerHTML = TABS.map(function (t) {
      return '<button class="tab' + (t.id === active ? ' active' : '') + '" data-go="' + t.id + '">'
        + ICON[t.icon] + '<span class="tab-label">' + t.label + '</span></button>';
    }).join('');
  }
  function route() {
    cur = parseHash();
    var okp = TABS.some(function (t) { return t.id === cur.path; }) || cur.path === 'atlas';
    var tab = okp ? cur.path : 'home';
    renderTabs(tab);
    if (AT.viewer) { try { AT.viewer.destroy(); } catch (e) { } AT.viewer = null; }
    if (INLINE.viewer) { try { INLINE.viewer.destroy(); } catch (e) { } INLINE.viewer = null; }
    viewEl.innerHTML = '';
    viewEl.className = 'view';
    if (tab === 'home') viewHome(viewEl);
    else if (tab === 'recite') viewRecite(viewEl);
    else if (tab === 'quiz') viewQuiz(viewEl);
    else if (tab === 'learn') viewLearn(viewEl);
    else if (tab === 'atlas') viewAtlas(viewEl);
    else viewRef(viewEl);
    window.scrollTo(0, 0);
    fxPaint(viewEl);
  }

  /* ================= 首页 ================= */
  function dueCount() {
    var n = 0;
    TERMS.forEach(function (t) { if (isDue('t', t.id)) n++; });
    QA.forEach(function (q) { if (isDue('q', q.id)) n++; });
    return n;
  }
  function masteredOf(kind, list) {
    return list.filter(function (x) { return boxOf(kind, x.id) >= 4; }).length;
  }
  function chapterRows() {
    return CH.map(function (c) {
      var ts = TERMS.filter(function (t) { return t.chapter === c.id; });
      var qs = QA.filter(function (t) { return t.chapter === c.id; });
      var all = ts.length + qs.length;
      if (!all) return null;
      var done = masteredOf('t', ts) + masteredOf('q', qs);
      return { c: c, all: all, done: done, pct: Math.round(done / all * 100) };
    }).filter(Boolean);
  }

  function viewHome(v) {
    var due = dueCount();
    var st = statsToday();
    var goal = S.prefs.goal || 30;
    var mastered = masteredOf('t', TERMS) + masteredOf('q', QA);
    var total = TERMS.length + QA.length;
    var pct = clamp(Math.round(st.r / goal * 100), 0, 100);
    var rows = chapterRows();
    var tip = TIPS.length ? TIPS[(new Date().getDate() + (S.prefs.tipSeed || 0)) % TIPS.length] : null;
    var img = IMAGES.length ? IMAGES[(new Date().getDate() + (S.prefs.imgSeed || 0)) % IMAGES.length] : null;

    v.innerHTML =
      '<section class="hero">'
      + '<svg class="hero-spine" viewBox="0 0 120 220" fill="none" stroke="currentColor" stroke-width="1.5">'
      + '<path d="M64 14 60 38 55 62 52 86 53 110 57 134 62 158 66 180 68 200" stroke-dasharray="2 4" opacity=".8"/>'
      + '<g>'
      + '<ellipse cx="64" cy="14" rx="12" ry="6"/><ellipse cx="60" cy="38" rx="13" ry="6.5"/>'
      + '<ellipse cx="55" cy="62" rx="13.5" ry="6.8"/><ellipse cx="52" cy="86" rx="14" ry="7"/>'
      + '<ellipse cx="53" cy="110" rx="14.5" ry="7.2"/><ellipse cx="57" cy="134" rx="14.5" ry="7.2"/>'
      + '<ellipse cx="62" cy="158" rx="14" ry="7"/><ellipse cx="66" cy="180" rx="12.5" ry="6.3"/>'
      + '<ellipse cx="68" cy="200" rx="11" ry="5.6"/>'
      + '</g></svg>'
      + '<div class="hero-eyebrow">' + E(fmtDate(new Date())) + '</div>'
      + '<h1 class="hero-title home-h1">系统解剖学</h1>'
      + '<div class="hero-sub">护理专业 · 期末复习　<span class="tiny muted">名词 ' + TERMS.length + ' · 简答 ' + QA.length + ' · 选择 ' + MCQ.length + '</span></div>'
      + '<div class="hero-rule"></div>'
      + '<div class="hero-stats">'
      + '<div class="hero-stat"><b>' + due + '</b><span>今日待复习</span></div>'
      + '<div class="hero-stat"><b>' + mastered + '<small style="font-size:12px;color:var(--ink-3)">/' + total + '</small></b><span>已掌握</span></div>'
      + '<div class="hero-stat"><b>' + streak() + '</b><span>连续天数</span></div>'
      + '</div></section>'

      + '<section class="sec"><div class="card pad"><div class="ring-wrap">'
      + '<div class="ring" style="--p:' + pct + '"><span class="ring-val">' + pct + '%</span></div>'
      + '<div class="grow"><div class="row spread"><b style="font-size:14px">今日目标</b><span class="small muted">' + st.r + ' / ' + goal + ' 张</span></div>'
      + '<div class="goal-bar"><i style="width:' + pct + '%"></i></div>'
      + '<div class="small muted" style="margin-top:8px">' + (st.r >= goal ? '今天的目标完成了，休息一下也算学习。' : '还差 ' + (goal - st.r) + ' 张卡片，大约 ' + Math.max(1, Math.ceil((goal - st.r) / 8)) + ' 分钟。') + '</div>'
      + '</div></div></div></section>'

      + '<section class="sec"><div class="sec-hd"><h2 class="sec-title">开始学习</h2></div>'
      + '<div class="quick-grid">'
      + quickBtn('recite', 'book', '背诵卡片', due + ' 张待复习', '')
      + quickBtn('quiz', 'quiz', '做一组题', '选择 / 填空 / 默写', 'vein')
      + quickBtn('learn', 'atlas', '按章讲解', (window.ANAT.lectures || []).length + ' 章图文+模型', 'artery')
      + quickBtn('ref', 'ref', '快速速查', TERMS.length + ' 条名词', '')
      + '</div></section>'

      + '<section class="sec"><div class="sec-hd"><h2 class="sec-title">章节掌握度</h2>'
      + '<span class="sec-more">按正确率累计</span></div><div class="card pad">'
      + rows.map(function (r) {
        return '<div class="ch-row" style="--c:' + chColor(r.c.id) + '">'
          + '<span class="ch-glyph">' + E(r.c.glyph) + '</span>'
          + '<span class="ch-name">' + E(r.c.name) + '</span>'
          + '<span class="ch-bar"><i style="width:' + r.pct + '%"></i></span>'
          + '<span class="ch-num">' + r.done + '/' + r.all + '</span></div>';
      }).join('') + '</div></section>'

      + (tip ? ('<section class="sec"><div class="sec-hd"><h2 class="sec-title">' + (tip.kind === 'pitfall' ? '易错对比' : '记忆口诀') + '</h2>'
        + '<button class="sec-more" data-act="next-tip">换一条</button></div>'
        + '<div class="tip-card"><div class="tip-k">' + (tip.kind === 'pitfall' ? 'PITFALL' : 'MNEMONIC') + ' · ' + E(chName(tip.chapter)) + '</div>'
        + '<h4>' + E(tip.title) + '</h4><p>' + E(tip.text) + '</p>'
        + (tip.note ? '<p class="tiny muted" style="margin-top:8px">' + E(tip.note) + '</p>' : '')
        + '</div></section>') : '')

      + (img ? ('<section class="sec"><div class="sec-hd"><h2 class="sec-title">今日一图</h2>'
        + '<button class="sec-more" data-act="next-img">换一张</button></div>'
        + '<button class="card today" data-act="open-img">'
        + '<span class="today-img"><img src="assets/img/' + E(img.file) + '" alt="" loading="lazy"></span>'
        + '<span class="grow"><b>' + E(img.title) + '</b>'
        + '<span class="small muted today-desc">' + E((img.desc || '').slice(0, 46)) + '</span>'
        + '<span class="tiny" style="color:' + chColor(img.chapter) + '">' + E(chName(img.chapter)) + '</span></span>'
        + '</button></section>') : '')

      + '<section class="sec"><div class="row spread small muted" style="padding:4px 2px 0">'
      + '<span>数据保存在本机浏览器，换设备不会同步。</span>'
      + '<button class="btn btn-ghost" style="min-height:34px;padding:0 8px;font-size:12px" data-act="settings">管理数据</button>'
      + '</div></section>';

    on(v, '[data-go]', 'click', function (e) { go(e.currentTarget.dataset.go); });
    var nt = $('[data-act="next-tip"]', v);
    if (nt) nt.addEventListener('click', function () {
      S.prefs.tipSeed = (S.prefs.tipSeed || 0) + 1; save(); viewHome(v);
    });
    var ni = $('[data-act="next-img"]', v);
    if (ni) ni.addEventListener('click', function () {
      S.prefs.imgSeed = (S.prefs.imgSeed || 0) + 1; save(); viewHome(v);
    });
    var oi = $('[data-act="open-img"]', v);
    if (oi) oi.addEventListener('click', function () { openViewer(IMAGES.indexOf(img)); });
    var sb = $('[data-act="settings"]', v);
    if (sb) sb.addEventListener('click', openSettings);
  }
  function quickBtn(path, icon, title, sub, tone) {
    return '<button class="quick" data-go="' + path + '">'
      + '<span class="quick-ico ' + (tone || '') + '">' + ICON[icon] + '</span>'
      + '<span class="grow"><b>' + E(title) + '</b><span>' + E(sub) + '</span></span></button>';
  }
  function on(root, sel, ev, fn) {
    $$(sel, root).forEach(function (el) { el.addEventListener(ev, fn); });
  }

  /* ================= 背诵 ================= */
  function buildQueue() {
    var pool = RS.mode === 'qa' ? QA : RS.mode === 'tip' ? TIPS : TERMS;
    if (RS.chapter !== 'all') {
      pool = pool.filter(function (x) { return x.chapter === RS.chapter; });
    }
    if (RS.mode === 'tip') {
      RS.queue = shuffle(pool).slice(0, 20);
      RS.i = 0; RS.stage = 0;
      return;
    }
    var kind = RS.mode === 'qa' ? 'q' : 't';
    var now = Date.now(), due = [], fresh = [], later = [];
    pool.forEach(function (x) {
      var c = card(kind, x.id);
      if (!c) fresh.push(x);
      else if (c.d <= now) due.push({ x: x, d: c.d });
      else later.push({ x: x, d: c.d });
    });
    due.sort(function (a, b) { return a.d - b.d; });
    later.sort(function (a, b) { return a.d - b.d; });
    var list = due.map(function (a) { return a.x; }).concat(shuffle(fresh));
    if (list.length < 20) {
      list = list.concat(later.map(function (a) { return a.x; }).slice(0, 20 - list.length));
    }
    RS.queue = list.slice(0, 20);
    RS.i = 0; RS.stage = 0; RS.cloze = false;
  }

  function viewRecite(v) {
    var pool = RS.mode === 'qa' ? QA : RS.mode === 'tip' ? TIPS : TERMS;
    if (RS.needBuild) { buildQueue(); RS.needBuild = false; }
    if (!RS.queue.length) {
      v.innerHTML = segHTML([['term', '名词解释'], ['qa', '问答题'], ['tip', '口诀']], RS.mode)
        + chipsHTML(RS.chapter, chaptersOf(pool))
        + emptyBox('这个分类暂时没有内容', '换一个章节，或去「速查」里看看');
      bindReciteChrome(v);
      return;
    }
    renderRecite(v);
  }

  function renderRecite(v) {
    var mode = RS.mode, chapter = RS.chapter;
    var pool = mode === 'qa' ? QA : mode === 'tip' ? TIPS : TERMS;
    v.innerHTML =
      segHTML([['term', '名词解释'], ['qa', '问答题'], ['tip', '口诀']], mode)
      + chipsHTML(chapter, chaptersOf(pool))
      + '<div id="cardhost"></div>';
    bindReciteChrome(v);
    renderCard(v);
  }
  function segHTML(opts, active) {
    return '<div class="seg">' + opts.map(function (o) {
      return '<button data-mode="' + o[0] + '" class="' + (o[0] === active ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
  }
  function chipsHTML(active, avail) {
    var ok = {};
    (avail && avail.length ? avail : CH.map(function (c) { return c.id; })).forEach(function (id) { ok[id] = 1; });
    var items = [['all', '全部', '#8d8277']];
    CH.forEach(function (c) { if (ok[c.id]) items.push([c.id, c.name, c.color]); });
    return '<div class="chips">' + items.map(function (it) {
      return '<button class="chip ' + (it[0] === active ? 'active' : '') + '" data-ch="' + it[0] + '" style="--c:' + it[2] + '">'
        + '<span class="dot"></span>' + E(it[1]) + '</button>';
    }).join('') + '</div>';
  }
  function chaptersOf(list) {
    var seen = {}, out = [];
    list.forEach(function (x) { if (x && x.chapter && !seen[x.chapter]) { seen[x.chapter] = 1; out.push(x.chapter); } });
    return out;
  }
  function bindReciteChrome(v) {
    on(v, '[data-mode]', 'click', function (e) {
      RS.mode = e.currentTarget.dataset.mode;
      RS.needBuild = true; RS.i = 0; RS.stage = 0;
      viewRecite(v);
    });
    on(v, '[data-ch]', 'click', function (e) {
      RS.chapter = e.currentTarget.dataset.ch;
      RS.needBuild = true; RS.i = 0; RS.stage = 0;
      viewRecite(v);
    });
  }

  function renderCard(v) {
    var host = $('#cardhost', v);
    if (!host) return;
    if (RS.i >= RS.queue.length) { host.innerHTML = reciteDone(); bindDone(v); return; }
    var it = RS.queue[RS.i];
    var n = RS.queue.length;
    var head = '<div class="quiz-top">'
      + '<span class="counter">' + (RS.i + 1) + ' / ' + n + '</span>'
      + '<div class="progress"><i style="width:' + Math.round(RS.i / n * 100) + '%"></i></div>'
      + '<button class="btn btn-ghost" style="min-height:30px;padding:0 6px;font-size:12px" data-act="end">结束</button>'
      + '</div>';

    var body;
    if (RS.mode === 'tip') {
      body = tipCard(it);
    } else if (RS.mode === 'qa') {
      body = qaCard(it);
    } else {
      body = termCard(it);
    }
    host.innerHTML = head + body;
    bindCard(v, it);
  }

  /* 章节 -> 可用 3D 场景 */
  var CHSCENES = {
    intro: ['skull'], osteo: ['skull', 'spine', 'thorax', 'lowerLimb'],
    arthro: ['lowerLimb'], myo: ['lowerLimb'], digest: ['digest'],
    urinary: ['urinary'], male: ['male'], sensory: ['eye'], endocrine: ['endocrine'],
    cardio: ['heart'], resp: ['airway']
  };

  /* 按名字挑最贴题的场景：骨学里有「股骨」就上下肢，没有就颅骨 */
  var SCENE_HINT = [
    { sc: 'lowerLimb', kw: ['股骨', '胫骨', '腓骨', '髌骨', '髋', '股', '膝', '踝', '足', '跖', '坐骨', '耻骨', '髂'] },
    { sc: 'spine', kw: ['椎', '骶', '尾骨', '髓核', '椎间盘'] },
    { sc: 'thorax', kw: ['肋', '胸骨', '胸廓'] },
    { sc: 'skull', kw: ['颅', '额骨', '顶骨', '颞', '枕', '蝶', '筛', '下颌', '颧', '上颌', '鼻骨', '腭', '犁骨', '囟'] },
    { sc: 'heart', kw: ['心', '瓣', '房', '室', '冠状', '主动脉', '腔静脉'] },
    { sc: 'airway', kw: ['气管', '支气管', '喉', '声门'] },
    { sc: 'digest', kw: ['胃', '肠', '肝', '胆', '胰', '食管', '阑尾', '肛', '直肠'] },
    { sc: 'urinary', kw: ['肾', '输尿管', '膀胱', '尿道'] },
    { sc: 'male', kw: ['睾丸', '附睾', '输精管', '前列腺', '精囊', '阴囊', '阴茎'] },
    { sc: 'eye', kw: ['眼球', '角膜', '巩膜', '虹膜', '晶状体', '视网膜', '玻璃体', '房水'] },
    { sc: 'endocrine', kw: ['肾上腺', '垂体', '甲状腺', '胰岛'] }
  ];
  function sceneFor(chapter, name) {
    var list = CHSCENES[chapter] || [];
    if (!list.length) return null;
    if (list.length === 1 && !name) return list[0];
    if (name) {
      for (var i = 0; i < SCENE_HINT.length; i++) {
        var h = SCENE_HINT[i];
        if (list.indexOf(h.sc) < 0) continue;
        for (var j = 0; j < h.kw.length; j++) {
          if (name.indexOf(h.kw[j]) >= 0) return h.sc;
        }
      }
      var best = null, bestScore = 0;
      list.forEach(function (id) {
        var sc = (window.ANAT.m3d && M3D.scene) ? M3D.scene(id) : null;
        if (!sc) return;
        var score = 0;
        sc.parts.forEach(function (p) {
          var bare = p.n.replace(/^(左|右)/, '');
          if (name.indexOf(bare) >= 0 || bare.indexOf(name) >= 0) score += 3;
        });
        if (score > bestScore) { bestScore = score; best = id; }
      });
      // 只有真的对上了部件名/关键词才给模型：宁可不给，也不拿心脏糊弄「掌浅弓」
      if (best) return best;
      return null;
    }
    return list[0];
  }

  /* 知识点旁的「视觉锚点」：可拖动的模型 + 对照图，同一张卡片里 */
  function anchorBar(chapter, name, nkey) {
    var imgs = [], grams = [];
    if (name && name.length >= 2) {
      for (var g = 0; g + 2 <= name.length && g < 6; g++) grams.push(name.substr(g, 2));
    }
    IMAGES.forEach(function (im, k) {
      if (!chapter || im.chapter !== chapter) return;
      var blob = im.title + ' ' + (im.desc || '') + ' '
        + (im.labels || []).map(function (l) { return l.t; }).join(' ');
      var s = 0;
      grams.forEach(function (gr) { if (blob.indexOf(gr) >= 0) s++; });
      if (s) imgs.push({ i: k, s: s });
    });
    imgs.sort(function (a, b) { return b.s - a.s; });
    imgs = imgs.slice(0, 2);
    var hit = true;
    if (!imgs.length) {           /* 名对不上就退到本章图，保证每张卡都有对照 */
      hit = false;
      imgs = imagesOf(chapter, 1).map(function (i) { return { i: i, s: 0 }; });
    }
    var sc = sceneFor(chapter, name);
    if (!imgs.length && !sc) return noteBox(nkey);
    return '<div class="vis">'
      + (sc ? '<div class="vis3d" data-v3d="' + sc + '" data-vn="' + E(name || '') + '"></div>' : '')
      + (imgs.length ? '<div class="visimgs' + (imgs.length === 1 ? ' one' : '') + '">' + imgs.map(function (h) {
        var im = IMAGES[h.i];
        return '<figure class="visimg" data-vimg="' + h.i + '">'
          + '<img src="assets/img/' + E(im.file) + '" alt="' + E(im.title) + '" loading="lazy">'
          + '<figcaption>' + E(im.title) + (hit ? '' : ' · 本章') + '</figcaption></figure>';
      }).join('') + '</div>' : '')
      + '</div>'
      + noteBox(nkey);
  }

  /* 笔记：随时写，自动存 */
  function noteBox(nkey) {
    if (!nkey) return '';
    var val = S.notes[nkey] || '';
    return '<div class="note' + (val ? ' has' : '') + '">'
      + '<div class="note-hd"><span>我的笔记</span><i class="note-dot"></i></div>'
      + '<textarea class="note-ta" data-note="' + E(nkey) + '" rows="2" placeholder="用自己的话记一句 —— 这个结构像什么、老师强调什么">' + E(val) + '</textarea>'
      + '</div>';
  }

  var noteT = null;
  function bindNotes(root) {
    on(root, '[data-note]', 'input', function (e) {
      var el = e.currentTarget, k = el.dataset.note, v = el.value;
      var box = el.parentNode;
      if (v.trim()) box.classList.add('has'); else box.classList.remove('has');
      clearTimeout(noteT);
      noteT = setTimeout(function () {
        if (v.trim()) S.notes[k] = v; else delete S.notes[k];
        save();
      }, 300);
    });
  }

  function termCard(t) {
    var c = card('t', t.id);
    var badge = '<span class="badge">' + E(chName(t.chapter)) + '</span>'
      + (c && c.b >= 4 ? '<span class="badge vein">已掌握</span>' : '')
      + (c && c.b > 0 && c.b < 4 ? '<span class="badge artery">复习中 · L' + c.b + '</span>' : '');
    var ans = RS.stage > 0
      ? '<div class="flash-ans"><div class="row spread" style="margin-bottom:8px">'
        + '<span class="tiny muted">释义' + (RS.cloze ? '（点横线可揭示）' : '') + '</span>'
        + '<button class="btn btn-ghost" style="min-height:28px;padding:0 6px;font-size:11.5px" data-act="cloze">'
        + (RS.cloze ? '显示全文' : '挖空自测') + '</button></div>'
        + '<div class="flash-ans-body">' + defHTML(t, RS.cloze) + '</div>'
        + (t.tags && t.tags.length ? '<div class="row wrap" style="margin-top:12px">' + t.tags.map(function (g) {
          return '<span class="badge">' + E(g) + '</span>';
        }).join('') + '</div>' : '')
        + '</div>'
        + '<div class="rate-row">'
        + '<button class="rate r1" data-rate="1">忘了<small>AGAIN</small></button>'
        + '<button class="rate r2" data-rate="2">模糊<small>HARD</small></button>'
        + '<button class="rate r3" data-rate="3">会了<small>GOOD</small></button>'
        + '</div>'
      : '<button class="btn btn-primary btn-block" data-act="reveal" style="margin-top:18px">显示答案</button>'
        + '<div class="flash-hint">先在脑子里过一遍它的要素，再翻开</div>';

    return '<div class="card flash' + (RS.stage === 0 ? ' flash-front' : '') + '">'
      + '<div class="flash-meta">' + badge + '</div>'
      + '<div class="flash-term">' + E(t.term) + '</div>'
      + (t.en ? '<div class="flash-en">' + E(t.en) + '</div>' : '')
      + anchorBar(t.chapter, t.term, 't:' + t.id)
      + ans + '</div>';
  }

  function defHTML(t, clozeOn) {
    var s = E(t.def);
    var list = (t.clozes || []).filter(function (c) { return c && s.indexOf(E(c)) >= 0; });
    list.sort(function (a, b) { return b.length - a.length; });
    list.forEach(function (c, i) {
      var w = E(c);
      if (clozeOn) {
        var blank = new Array(Math.max(2, Math.min(8, c.length)) + 1).join('＿');
        s = s.replace(w, '<span class="cloze" data-c="' + i + '" data-w="' + w + '">' + blank + '</span>');
      } else {
        s = s.replace(w, '<span class="kw-mark">' + w + '</span>');
      }
    });
    return s;
  }

  function qaCard(q) {
    var stars = q.star ? '★'.repeat(Math.min(3, q.star)) : '';
    var pts = qaPoints(q);
    var shown = Math.min(RS.stage, pts.length);
    var list = pts.slice(0, shown).map(function (p, i) {
      return '<div class="row" style="align-items:flex-start;gap:8px;padding:5px 0">'
        + '<span class="mono tiny" style="color:var(--gold);min-width:16px">' + (i + 1) + '</span>'
        + '<span><b style="font-size:14px">' + E(p.k) + '</b>'
        + (p.t ? ' <span class="small muted">' + E(p.t) + '</span>' : '') + '</span></div>';
    }).join('');

    var controls = '';
    if (RS.stage === 0) {
      controls = '<button class="btn btn-primary btn-block" data-act="reveal" style="margin-top:16px">回忆要点</button>'
        + '<div class="flash-hint">先说一遍，再逐个对要点</div>';
    } else if (shown < pts.length) {
      controls = '<div class="row" style="margin-top:14px;gap:8px">'
        + '<button class="btn grow" data-act="reveal">下一个要点</button>'
        + '<button class="btn btn-ghost" data-act="all">全部显示</button></div>';
    } else {
      controls = '<div class="rate-row">'
        + '<button class="rate r1" data-rate="1">答不全<small>AGAIN</small></button>'
        + '<button class="rate r2" data-rate="2">基本会<small>HARD</small></button>'
        + '<button class="rate r3" data-rate="3">很熟练<small>GOOD</small></button>'
        + '</div>'
        + '<details style="margin-top:12px"><summary class="small muted" style="cursor:pointer">看完整答案</summary>'
        + '<div class="flash-ans" style="border-top:0;padding-top:8px">' + E(q.a) + '</div></details>';
    }

    return '<div class="card flash' + (RS.stage === 0 ? ' flash-front' : '') + '">'
      + '<div class="flash-meta"><span class="badge">' + E(chName(q.chapter)) + '</span>'
      + (stars ? '<span class="star">' + stars + '</span>' : '') + '</div>'
      + '<div class="flash-q">' + E(q.q) + '</div>'
      + anchorBar(q.chapter, q.q.slice(0, 6), 'q:' + q.id)
      + (shown ? '<div class="flash-ans" style="margin-top:10px">' + list + '</div>' : '')
      + controls + '</div>';
  }

  function qaPoints(q) {
    if (q.points && q.points.length) {
      return q.points.filter(function (p) { return p && p.k; }).map(function (p) { return { k: p.k, t: p.t || '' }; });
    }
    return q.a.split(/[，、；。,,;]/).map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length >= 2 && s.length <= 14; }).slice(0, 8)
      .map(function (s) { return { k: s, t: '' }; });
  }

  function tipCard(t) {
    return '<div class="card flash" style="justify-content:center">'
      + '<div class="flash-meta"><span class="badge ' + (t.kind === 'pitfall' ? 'artery' : '') + '">'
      + (t.kind === 'pitfall' ? '易错对比' : '记忆口诀') + '</span><span class="badge">' + E(chName(t.chapter)) + '</span></div>'
      + '<div class="flash-term" style="font-size:21px">' + E(t.title) + '</div>'
      + anchorBar(t.chapter, t.title.slice(0, 6), 'tip:' + (t.title || '').slice(0, 12))
      + '<div class="flash-ans" style="border-top:1px dashed var(--line-2)">'
      + '<div style="font-size:15px;line-height:1.9">' + E(t.text) + '</div>'
      + (t.note ? '<div class="small muted" style="margin-top:10px">' + E(t.note) + '</div>' : '')
      + '</div>'
      + '<button class="btn btn-primary btn-block" data-act="next" style="margin-top:16px">下一条</button>'
      + '</div>';
  }

  function bindCard(v, it) {
    var host = $('#cardhost', v);
    on(host, '[data-act="reveal"]', 'click', function () {
      RS.stage++; renderCard(v);
    });
    on(host, '[data-act="all"]', 'click', function () {
      RS.stage = 99; renderCard(v);
    });
    on(host, '[data-act="cloze"]', 'click', function () {
      RS.cloze = !RS.cloze; renderCard(v);
    });
    on(host, '[data-act="next"]', 'click', function () {
      RS.i++; RS.stage = 0; renderCard(v);
    });
    on(host, '[data-act="end"]', 'click', function () { RS.i = RS.queue.length; renderCard(v); });
    on(host, '.cloze', 'click', function (e) {
      var el = e.currentTarget;
      if (el.dataset.w) el.textContent = el.dataset.w;
      el.classList.add('on');
    });
    on(host, '[data-vimg]', 'click', function (e) { openViewer(+e.currentTarget.dataset.vimg); });
    mountInline(host);
    bindNotes(host);
    on(host, '[data-rate]', 'click', function (e) {
      var g = +e.currentTarget.dataset.rate;
      if (RS.mode === 'tip') { RS.i++; renderCard(v); return; }
      rate(RS.mode === 'qa' ? 'q' : 't', it.id, g);
      RS.i++; RS.stage = 0; RS.cloze = false;
      renderCard(v);
    });
  }
  function reciteDone() {
    var st = statsToday();
    return '<div class="card result">'
      + '<div class="score-big">' + RS.queue.length + '<small> 张</small></div>'
      + '<div class="result-msg">这一组背完了。今天共背 ' + st.r + ' 张卡片。</div>'
      + '<div class="row" style="gap:8px">'
      + '<button class="btn grow" data-act="again">再来一组</button>'
      + '<button class="btn btn-primary grow" data-go="quiz">去做题</button></div>'
      + '<div class="small muted" style="margin-top:14px">下一轮复习会按记忆强度自动安排</div>'
      + '</div>';
  }
  function bindDone(v) {
    on(v, '[data-act="again"]', 'click', function () { RS.needBuild = true; RS.i = 0; viewRecite(v); });
    on(v, '[data-go]', 'click', function (e) { go(e.currentTarget.dataset.go); });
  }

  /* ================= 练习 ================= */
  var QZ = { mode: 'mix', chapter: 'all', items: [], i: 0, right: 0, done: false, answered: false, wrong: [], started: false };

  function newQuiz(v) {
    var pool = { mcq: MCQ.slice(), fill: FILL.slice(), dict: QA.slice() };
    var ch = QZ.chapter;
    if (ch !== 'all') {
      Object.keys(pool).forEach(function (k) {
        pool[k] = pool[k].filter(function (x) { return x.chapter === ch; });
      });
    }
    var items = [];
    function take(kind, n) {
      var src = shuffle(pool[kind]);
      for (var i = 0; i < Math.min(n, src.length); i++) items.push({ kind: kind, x: src[i] });
    }
    if (QZ.mode === 'mix') { take('mcq', 6); take('fill', 3); take('dict', 1); }
    else if (QZ.mode === 'mcq') take('mcq', 10);
    else if (QZ.mode === 'fill') take('fill', 10);
    else if (QZ.mode === 'dict') take('dict', 5);
    items = shuffle(items);
    if (!items.length) { toast('这个分类暂时没有题目'); return false; }
    QZ.items = items; QZ.i = 0; QZ.right = 0; QZ.wrong = []; QZ.done = false; QZ.answered = false; QZ.started = true;
    renderQuiz(v);
    return true;
  }

  function viewQuiz(v) {
    if (!QZ.started) { quizIntro(v); return; }
    renderQuiz(v);
  }
  function quizIntro(v) {
    var pool = QZ.mode === 'mcq' ? MCQ : QZ.mode === 'fill' ? FILL : QZ.mode === 'dict' ? QA : MCQ.concat(FILL, QA);
    var wb = wrongItems();
    v.innerHTML =
      '<section class="sec" style="margin-top:6px"><div class="sec-hd"><h2 class="sec-title">练习</h2>'
      + '<span class="sec-more">' + MCQ.length + ' 选择 · ' + FILL.length + ' 填空 · ' + QA.length + ' 默写</span></div>'
      + '<div class="card pad">'
      + '<div class="small muted" style="margin-bottom:6px">题型</div>'
      + segHTML([['mix', '综合卷'], ['mcq', '最佳选择'], ['fill', '填空'], ['dict', '默写']], QZ.mode)
      + '<div class="small muted" style="margin:14px 0 6px">章节</div>'
      + chipsHTML(QZ.chapter, chaptersOf(pool))
      + '<button class="btn btn-primary btn-block" data-act="start" style="margin-top:14px">开始练习</button>'
      + '<div class="small muted" style="margin-top:12px;text-align:center">综合卷：6 选择 + 3 填空 + 1 默写</div>'
      + '</div>'
      + (wb.length ? ('<button class="btn btn-block" data-act="wrongbook" style="margin-top:10px">错题本 · ' + wb.length + ' 题待重做</button>') : '')
      + '<div class="small muted" style="margin-top:14px;text-align:center">做错的题会自动进错题本，重做对了也不会消失，直到你手动清空</div>'
      + '</section>';
    on(v, '[data-mode]', 'click', function (e) {
      QZ.mode = e.currentTarget.dataset.mode; quizIntro(v);
    });
    on(v, '[data-ch]', 'click', function (e) {
      QZ.chapter = e.currentTarget.dataset.ch; quizIntro(v);
    });
    $('[data-act="start"]', v).addEventListener('click', function () { newQuiz(v); });
    var wbb = $('[data-act="wrongbook"]', v);
    if (wbb) wbb.addEventListener('click', function () {
      var items = wrongItems();
      if (!items.length) return toast('错题本是空的');
      QZ.items = items; QZ.i = 0; QZ.right = 0; QZ.wrong = []; QZ.answered = false;
      QZ.started = true; renderQuiz(v);
    });
  }

  function wrongItems() {
    var out = [];
    Object.keys(S.wrong).forEach(function (k) {
      var a = k.split(':'), id = a[1], kind = a[0];
      var src = kind === 'mcq' ? MCQ : kind === 'fill' ? FILL : QA;
      var x = src.filter(function (y) { return y.id === id; })[0];
      if (x) out.push({ kind: kind, x: x });
    });
    return out;
  }

  function renderQuiz(v) {
    if (QZ.i >= QZ.items.length) { renderResult(v); return; }
    var it = QZ.items[QZ.i];
    var n = QZ.items.length;
    var head = '<div class="quiz-top">'
      + '<span class="counter">' + (QZ.i + 1) + ' / ' + n + '</span>'
      + '<div class="progress"><i style="width:' + Math.round(QZ.i / n * 100) + '%"></i></div>'
      + '<button class="btn btn-ghost" style="min-height:30px;padding:0 6px;font-size:12px" data-act="quit">结束</button>'
      + '</div>';

    var body = '';
    if (it.kind === 'mcq') body = mcqHTML(it.x);
    else if (it.kind === 'fill') body = fillHTML(it.x);
    else body = dictHTML(it.x);

    v.innerHTML = head + body;
    bindQuiz(v, it);
  }

  function mcqHTML(m) {
    var opts = m.opts.map(function (o, i) {
      return '<button class="opt" data-opt="' + i + '"><span class="opt-key">' + 'ABCDE'[i] + '</span><span>' + E(o) + '</span></button>';
    }).join('');
    return '<div class="card pad" style="padding:18px 16px">'
      + '<div class="flash-meta"><span class="badge vein">最佳选择题</span><span class="badge">' + E(chName(m.chapter)) + '</span></div>'
      + '<div class="q-text"><span class="qno">Q' + pad(QZ.i + 1) + '</span>' + E(m.q) + '</div>'
      + '<div class="opts">' + opts + '</div>'
      + '<div id="exp"></div>'
      + '<button class="btn btn-primary btn-block" data-act="next" style="margin-top:14px;display:none">下一题</button>'
      + '</div>';
  }
  function fillHTML(f) {
    var parts = parseFill(f.text);
    var html = parts.map(function (p) {
      if (p.t != null) return E(p.t);
      return '<input class="blank" data-b autocomplete="off" autocapitalize="off" spellcheck="false">';
    }).join('');
    return '<div class="card pad" style="padding:18px 16px">'
      + '<div class="flash-meta"><span class="badge">填空题</span><span class="badge">' + E(chName(f.chapter)) + '</span></div>'
      + '<div class="fill-text">' + html + '</div>'
      + '<div id="exp"></div>'
      + '<button class="btn btn-primary btn-block" data-act="check" style="margin-top:16px">检查答案</button>'
      + '<button class="btn btn-primary btn-block" data-act="next" style="margin-top:14px;display:none">下一题</button>'
      + '</div>';
  }
  function parseFill(text) {
    var parts = [], i = 0, re = /\{([^}]+)\}/g, m;
    while ((m = re.exec(text))) {
      if (m.index > i) parts.push({ t: text.slice(i, m.index) });
      parts.push({ b: m[1].split('|').map(function (s) { return s.trim(); }) });
      i = m.index + m[0].length;
    }
    if (i < text.length) parts.push({ t: text.slice(i) });
    return parts;
  }
  function dictHTML(q) {
    return '<div class="card pad" style="padding:18px 16px">'
      + '<div class="flash-meta"><span class="badge artery">默写</span><span class="badge">' + E(chName(q.chapter)) + '</span>'
      + (q.star ? '<span class="star">' + '★'.repeat(Math.min(3, q.star)) + '</span>' : '') + '</div>'
      + '<div class="q-text"><span class="qno">Q' + pad(QZ.i + 1) + '</span>' + E(q.q) + '</div>'
      + '<textarea class="write-area" id="wa" placeholder="在这里写答案，想到几条写几条……"></textarea>'
      + '<div id="exp"></div>'
      + '<button class="btn btn-primary btn-block" data-act="check" style="margin-top:12px">提交自评</button>'
      + '<button class="btn btn-primary btn-block" data-act="next" style="margin-top:12px;display:none">下一题</button>'
      + '</div>';
  }

  function bindQuiz(v, it) {
    var nextBtn = $('[data-act="next"]', v);
    if (nextBtn) nextBtn.addEventListener('click', function () {
      QZ.i++; QZ.answered = false; renderQuiz(v);
    });
    var quit = $('[data-act="quit"]', v);
    if (quit) quit.addEventListener('click', function () { QZ.started = false; QZ.done = true; renderResult(v); });

    if (it.kind === 'mcq') {
      on(v, '[data-opt]', 'click', function (e) {
        if (QZ.answered) return;
        QZ.answered = true;
        var m = it.x;
        var chosen = +e.currentTarget.dataset.opt;
        var ok = chosen === m.ans;
        $$('[data-opt]', v).forEach(function (b) {
          var i = +b.dataset.opt;
          b.classList.add(i === m.ans ? 'correct' : (i === chosen ? 'wrong' : 'dim'));
        });
        var exp = $('#exp', v);
        if (exp) exp.innerHTML = '<div class="exp"><b>' + (ok ? '答对了' : '正确答案：' + 'ABCDE'[m.ans]) + '</b>'
          + (m.exp ? '　' + E(m.exp) : '') + '</div>';
        score(ok, 'mcq', m.id);
        if (nextBtn) nextBtn.style.display = '';
      });
    } else if (it.kind === 'fill') {
      var checkBtn = $('[data-act="check"]', v);
      if (checkBtn) checkBtn.addEventListener('click', function () {
        if (QZ.answered) return;
        QZ.answered = true;
        var f = it.x;
        var ins = $$('[data-b]', v);
        var blanks = parseFill(f.text).filter(function (p) { return p.b; });
        var allOk = true;
        ins.forEach(function (inp, i) {
          var b = blanks[i];
          var ok = b && b.b.some(function (ans) { return looseEq(inp.value, ans); });
          inp.classList.add(ok ? 'ok' : 'bad');
          inp.disabled = true;
          if (!ok) {
            allOk = false;
            inp.value = (inp.value ? inp.value + ' → ' : '') + b.b[0];
          }
        });
        var exp = $('#exp', v);
        if (exp) exp.innerHTML = '<div class="exp"><b>' + (allOk ? '全部正确' : '有 ' + ins.filter(function (i) { return i.classList.contains('bad'); }).length + ' 个空需要再看一眼') + '</b>　' + (f.exp ? E(f.exp) : '') + '</div>';
        score(allOk, 'fill', f.id);
        if (nextBtn) nextBtn.style.display = '';
      });
    } else {
      var cbtn = $('[data-act="check"]', v);
      if (cbtn) cbtn.addEventListener('click', function () {
        if (QZ.answered) return;
        QZ.answered = true;
        var q = it.x;
        var txt = ($('#wa', v) || {}).value || '';
        var kws = qaPoints(q).map(function (p) { return p.k; });
        var hits = kws.filter(function (k) { return norm(txt).indexOf(norm(k)) >= 0; });
        var ok = kws.length ? hits.length / kws.length >= 0.6 : txt.length > 20;
        var exp = $('#exp', v);
        if (exp) exp.innerHTML = '<div class="exp"><b>要点命中 ' + hits.length + ' / ' + kws.length + '</b>'
          + '<div class="kw-list">' + kws.map(function (k) {
            var hit = hits.indexOf(k) >= 0;
            return '<span class="kw' + (hit ? '' : ' miss') + '">' + (hit ? '✓ ' : '· ') + E(k) + '</span>';
          }).join('') + '</div>'
          + '<details style="margin-top:10px"><summary style="cursor:pointer;font-size:12px;color:var(--vein)">对照标准答案</summary>'
          + '<div style="margin-top:8px;line-height:1.9">' + E(q.a) + '</div></details></div>';
        score(ok, 'dict', q.id);
        if (nextBtn) nextBtn.style.display = '';
      });
    }
  }

  function looseEq(a, b) {
    var x = norm(a), y = norm(b);
    if (!x) return false;
    if (x === y) return true;
    if (x.indexOf(y) >= 0 && y.length >= 2) return true;
    if (y.indexOf(x) >= 0 && x.length >= 2 && x.length / y.length >= 0.6) return true;
    return false;
  }

  function score(ok, kind, id) {
    bump('q');
    if (ok) { bump('c'); QZ.right++; }
    else {
      QZ.wrong.push({ kind: kind, id: id });
      S.wrong[kind + ':' + id] = Date.now();
      if (kind === 'dict') rate('q', id, 1);
      save();
    }
  }

  function renderResult(v) {
    var n = QZ.items.length || 1;
    var pct = Math.round(QZ.right / n * 100);
    var msg = pct >= 90 ? '稳定了，可以去背新的章节。' : pct >= 70 ? '基础可以，错的这几道再看一遍。' : pct >= 50 ? '有一半没记住，建议回到背诵卡片。' : '先把名词解释过一遍再来做题。';
    v.innerHTML = '<div class="card result">'
      + '<div class="score-big">' + pct + '<small>%</small></div>'
      + '<div class="result-msg">' + QZ.right + ' / ' + n + ' 题正确　' + E(msg) + '</div>'
      + (QZ.wrong.length ? '<div style="text-align:left;margin-bottom:16px">'
        + '<div class="small muted" style="margin-bottom:8px">错题（已进错题本）</div>'
        + QZ.wrong.map(function (w) {
          var t = w.kind === 'mcq' ? MCQ.filter(function (x) { return x.id === w.id; })[0]
            : w.kind === 'fill' ? FILL.filter(function (x) { return x.id === w.id; })[0]
              : QA.filter(function (x) { return x.id === w.id; })[0];
          if (!t) return '';
          var label = w.kind === 'mcq' ? t.q : w.kind === 'fill' ? t.text.replace(/[{}]/g, '') : t.q;
          return '<div class="ref-item"><div class="ref-q"><span class="ref-dot"></span><span>' + E(label) + '</span></div></div>';
        }).join('') + '</div>' : '')
      + '<div class="row" style="gap:8px">'
      + '<button class="btn grow" data-act="retry">再来一组</button>'
      + '<button class="btn btn-primary grow" data-act="home">回首页</button></div>'
      + (QZ.wrong.length ? '<button class="btn btn-ghost btn-block" data-act="wrong" style="margin-top:8px">只练错题（' + QZ.wrong.length + '）</button>' : '')
      + '</div>';
    on(v, '[data-act="retry"]', 'click', function () { QZ.started = false; quizIntro(v); });
    on(v, '[data-act="home"]', 'click', function () { QZ.started = false; go('home'); });
    var wb = $('[data-act="wrong"]', v);
    if (wb) wb.addEventListener('click', function () {
      var items = QZ.wrong.map(function (w) {
        var x = w.kind === 'mcq' ? MCQ.filter(function (y) { return y.id === w.id; })[0]
          : w.kind === 'fill' ? FILL.filter(function (y) { return y.id === w.id; })[0]
            : QA.filter(function (y) { return y.id === w.id; })[0];
        return x ? { kind: w.kind, x: x } : null;
      }).filter(Boolean);
      QZ.items = items; QZ.i = 0; QZ.right = 0; QZ.wrong = []; QZ.answered = false;
      renderQuiz(v);
    });
  }

  /* ================= 图解（图片 / 3D） ================= */
  var AT = { chapter: 'all', mode: 'img', scene: 'urinary', sel: -1, viewer: null, iso: false };
  var MOD = { loading: false, queue: [], err: false };

  /* 按需依次加载 three.js → viewer3d.js → m3d.js（不进首屏） */
  function loadM3(cb) {
    if (window.ANAT && window.ANAT.m3d && window.M3D) return cb();
    MOD.queue.push(cb);
    if (MOD.loading) return;
    MOD.loading = true;
    var chain = ['assets/vendor/three.min.js', 'assets/js/viewer3d.js', 'assets/js/data/m3d.js'];
    var i = 0;
    function flush(err) {
      MOD.loading = false;
      if (err) MOD.err = true;
      var q = MOD.queue; MOD.queue = [];
      q.forEach(function (f) { try { f(); } catch (e) { } });
    }
    (function next() {
      if (i >= chain.length) return flush(false);
      var s = document.createElement('script');
      s.src = chain[i++];
      s.async = false;
      s.onload = next;
      s.onerror = function () { flush(true); };
      document.head.appendChild(s);
    })();
  }

  /* 结构名 -> 相关知识（自动匹配，名称越长越准） */
  function relTo(name) {
    var t = [], q = [], im = [];
    if (!name || name.length < 2) return { terms: t, qa: q, imgs: im };
    var bare = name.replace(/^(左|右)/, '');
    var keys = bare !== name ? [name, bare] : [name];
    keys.forEach(function (k) {
      TERMS.forEach(function (x) {
        if (t.indexOf(x) < 0 && (x.term.indexOf(k) >= 0 || (bare.length > 2 && x.term.indexOf(bare) >= 0))) t.push(x);
      });
    });
    if (t.length < 3) {
      keys.forEach(function (k) {
        TERMS.forEach(function (x) { if (t.indexOf(x) < 0 && x.def.indexOf(k) >= 0) t.push(x); });
      });
    }
    keys.forEach(function (k) {
      QA.forEach(function (x) { if (q.indexOf(x) < 0 && x.q.indexOf(k) >= 0) q.push(x); });
    });
    keys.forEach(function (k) {
      IMAGES.forEach(function (x) {
        var blob = x.title + ' ' + (x.desc || '') + ' '
          + (x.labels || []).map(function (l) { return l.t; }).join(' ');
        if (blob.indexOf(k) >= 0 && im.indexOf(IMAGES.indexOf(x)) < 0 && im.length < 3) im.push(IMAGES.indexOf(x));
      });
    });
    return { terms: t.slice(0, 3), qa: q.slice(0, 3), imgs: im };
  }

  /* ================= 讲解页：图文 + 模型同屏 ================= */
  var SCENE_NAME = {
    skull: '颅骨', spine: '脊柱', thorax: '胸廓', lowerLimb: '下肢骨',
    digest: '消化管', urinary: '泌尿', male: '男性生殖', eye: '眼球', endocrine: '内分泌'
  };
  function learnList() { return window.ANAT.lectures || []; }

  function imagesOf(ch, n) {
    var out = [];
    IMAGES.forEach(function (im, k) { if (im.chapter === ch) out.push(k); });
    return out.slice(0, n || 2);
  }

  function mediaCard(ch) {
    var sc = CHSCENES[ch] || [], imgs = imagesOf(ch, 2);
    if (!sc.length && !imgs.length) return '';
    var useId = (AT.lscene && sc.indexOf(AT.lscene) >= 0) ? AT.lscene : sc[0];
    var h = '<div class="card pad" style="margin-bottom:12px">'
      + '<div class="sec-hd"><div class="sec-title">对着看</div>'
      + '<span class="sec-more">模型 / 图谱</span></div>';
    if (sc.length && sc.length > 1) {
      h += '<div class="seg" style="margin-bottom:8px">' + sc.map(function (s) {
        return '<button data-lsc="' + s + '"' + (s === useId ? ' class="on"' : '') + '>'
          + E(SCENE_NAME[s] || s) + '</button>';
      }).join('') + '</div>';
    }
    if (sc.length) {
      h += '<div class="vis3d" data-v3d="' + useId + '" data-vn=""></div>';
    }
    if (imgs.length) {
      h += '<div class="visimgs' + (imgs.length === 1 ? ' one' : '') + '">' + imgs.map(function (idx) {
        var im = IMAGES[idx];
        return '<figure class="visimg" data-vimg="' + idx + '">'
          + '<img src="assets/img/' + E(im.file) + '" alt="' + E(im.title) + '" loading="lazy">'
          + '<figcaption>' + E(im.title) + '</figcaption></figure>';
      }).join('') + '</div>';
    }
    h += '<p class="tiny muted" style="margin:8px 0 0">手指拖动旋转，点结构看名字 —— 图和模型是同一批结构，边看边读下面的讲解。</p>'
      + '</div>';
    return h;
  }

  function viewLearn(v) {
    var L = learnList();
    if (!L.length) {
      v.innerHTML = '<div class="card pad"><p class="lec-p">讲解数据没加载上，检查 assets/js/data/lecture.js 是否存在。</p></div>';
      return;
    }
    var ch = AT.chapter;
    if (!L.some(function (x) { return x.chapter === ch; })) ch = L[0].chapter;
    AT.chapter = ch;
    var lec = L.filter(function (x) { return x.chapter === ch; })[0];
    var c = CHMAP[ch] || { name: ch, glyph: '解' };
    var idx = -1;
    L.forEach(function (x, k) { if (x.chapter === ch) idx = k; });
    var prev = L[idx - 1], next = L[idx + 1];

    var html = '<div class="learn-hd">'
      + '<div class="learn-glyph">' + E(c.glyph || '解') + '</div>'
      + '<div><h2>' + E(lec.title || c.name) + '</h2>'
      + '<p>' + E(c.name) + ' · ' + (lec.sections || []).length + ' 段讲解 · ' + ((lec.pitfalls || []).length) + ' 个易错点</p></div>'
      + '</div>';

    html += '<div class="chips" style="margin-bottom:12px">' + CH.map(function (x) {
      var has = L.some(function (y) { return y.chapter === x.id; });
      return '<button class="chip' + (x.id === ch ? ' active' : '') + '" data-lch="' + x.id + '"'
        + (has ? '' : ' style="opacity:.45"') + '>' + E(x.name) + '</button>';
    }).join('') + '</div>';

    if (lec.hook) html += '<p class="lec-p" style="color:var(--cy);font-size:13px;letter-spacing:.04em">' + E(lec.hook) + '</p>';

    html += mediaCard(ch);

    var secs = lec.sections || [];
    html += '<div class="card pad" style="margin-bottom:12px">';
    secs.forEach(function (s, i) {
      html += '<div class="lec-sec"><h3>' + E(s.h) + '<i>' + ('0' + (i + 1)).slice(-2) + '</i></h3>'
        + '<p class="lec-p">' + E(s.b) + '</p></div>';
    });
    html += '</div>';

    if ((lec.pitfalls || []).length) {
      html += '<div class="card pad" style="margin-bottom:12px">'
        + '<div class="sec-hd"><div class="sec-title">最容易错的地方</div></div>';
      lec.pitfalls.forEach(function (p) {
        html += '<div class="lec-callout warn"><b>' + E(p.t) + '</b><br>' + E(p.d) + '</div>';
      });
      html += '</div>';
    }

    var tips = TIPS.filter(function (t) { return t.chapter === ch; });
    if (tips.length) {
      html += '<div class="card pad" style="margin-bottom:12px">'
        + '<div class="sec-hd"><div class="sec-title">口诀</div></div>';
      tips.forEach(function (t) {
        html += '<div class="lec-callout"><b>' + E(t.title) + '</b><br>' + E(t.text) + '</div>';
      });
      html += '</div>';
    }

    if (lec.exam) {
      html += '<div class="card pad" style="margin-bottom:12px"><div class="sec-hd">'
        + '<div class="sec-title">考试怎么考这章</div></div>'
        + '<p class="lec-p">' + E(lec.exam) + '</p></div>';
    }

    html += '<div class="card pad" style="margin-bottom:12px">'
      + '<div class="sec-hd"><div class="sec-title">这章的笔记</div></div>'
      + noteBox('lec:' + ch) + '</div>';

    html += '<div class="learn-nav">'
      + (prev ? '<button class="btn btn-ghost" data-lgo="' + E(prev.chapter) + '">上一章</button>' : '')
      + (next ? '<button class="btn btn-ghost" data-lgo="' + E(next.chapter) + '">下一章</button>' : '')
      + '</div>';
    html += '<div class="learn-nav">'
      + '<button class="btn btn-primary" data-lrecite="' + E(ch) + '">背这章</button>'
      + '<button class="btn btn-ghost" data-lquiz="' + E(ch) + '">练这章</button>'
      + '</div>';

    v.innerHTML = html;

    on(v, '[data-lch]', 'click', function (e) { AT.chapter = e.currentTarget.dataset.lch; AT.lscene = null; viewLearn(v); window.scrollTo(0, 0); });
    on(v, '[data-lgo]', 'click', function (e) { AT.chapter = e.currentTarget.dataset.lgo; AT.lscene = null; viewLearn(v); window.scrollTo(0, 0); });
    on(v, '[data-lsc]', 'click', function (e) { AT.lscene = e.currentTarget.dataset.lsc; viewLearn(v); });
    on(v, '[data-lrecite]', 'click', function (e) { go('recite', { ch: e.currentTarget.dataset.lrecite }); });
    on(v, '[data-lquiz]', 'click', function (e) { go('quiz', { ch: e.currentTarget.dataset.lquiz }); });
    on(v, '[data-vimg]', 'click', function (e) { openViewer(+e.currentTarget.dataset.vimg); });
    mountInline(v);
    bindNotes(v);
  }

  function viewAtlas(v) {
    var seg = '<div class="seg" style="margin:0 0 12px">'
      + '<button data-mode="img"' + (AT.mode === 'img' ? ' class="on"' : '') + '>图片</button>'
      + '<button data-mode="3d"' + (AT.mode === '3d' ? ' class="on"' : '') + '>3D 模型</button></div>';
    v.innerHTML = '<section class="sec" style="margin-top:6px">'
      + '<div class="sec-hd"><h2 class="sec-title">图解与结构</h2>'
      + '<span class="sec-more">' + (AT.mode === 'img' ? IMAGES.length + ' 张图' : '可旋转模型') + '</span></div>'
      + seg
      + (AT.mode === 'img' ? imgBlock() : modelBlock())
      + '</section>';
    on(v, '[data-mode]', 'click', function (e) {
      AT.mode = e.currentTarget.dataset.mode;
      if (AT.viewer) { try { AT.viewer.destroy(); } catch (x) { } AT.viewer = null; }
      viewAtlas(v);
    });
    if (AT.mode === 'img') {
      on(v, '[data-ch]', 'click', function (e) { AT.chapter = e.currentTarget.dataset.ch; viewAtlas(v); });
      on(v, '[data-img]', 'click', function (e) { openViewer(+e.currentTarget.dataset.img); });
    } else {
      on(v, '[data-scene]', 'click', function (e) {
        AT.scene = e.currentTarget.dataset.scene; AT.sel = -1;
        viewAtlas(v);
      });
      on(v, '[data-part]', 'click', function (e) {
        AT.sel = +e.currentTarget.dataset.part;
        if (AT.viewer) AT.viewer.select(AT.sel);
        paintM3(v);
      });
      on(v, '[data-act="m3-reset"]', 'click', function () {
        if (AT.viewer) AT.viewer.reset();
        AT.sel = -1; AT.iso = false; paintM3(v);
      });
      on(v, '[data-act="m3-iso"]', 'click', function () {
        AT.iso = !AT.iso;
        if (AT.viewer) AT.viewer.isolate(AT.iso);
        paintM3(v);
      });
      on(v, '[data-act="m3-step"]', 'click', function (e) {
        var sc = window.M3D ? M3D.scene(AT.scene) : null;
        if (!sc) return;
        var d = +e.currentTarget.dataset.d;
        var n = sc.parts.length;
        AT.sel = AT.sel < 0 ? (d > 0 ? 0 : n - 1) : (AT.sel + d + n) % n;
        if (AT.viewer) AT.viewer.select(AT.sel);
        paintM3(v);
      });
      mountM3(v);
    }
  }

  function imgBlock() {
    var list = IMAGES.filter(function (im) { return AT.chapter === 'all' || im.chapter === AT.chapter; });
    return chipsHTML(AT.chapter, chaptersOf(IMAGES))
      + (list.length
        ? '<div class="atlas-grid">' + list.map(function (im) {
          var idx = IMAGES.indexOf(im);
          return '<button class="atlas-card" data-img="' + idx + '">'
            + '<div class="atlas-thumb' + (im.type === 'svg' || /\.svg$/i.test(im.file) ? ' svg' : '') + '">'
            + '<img src="assets/img/' + E(im.file) + '" alt="' + E(im.title) + '" loading="lazy"></div>'
            + '<div class="atlas-cap"><b>' + E(im.title) + '</b><span>' + E(chName(im.chapter)) + '</span></div>'
            + '</button>';
        }).join('') + '</div>'
        : '<div class="card empty"><b>还没有图片</b>素材准备中</div>');
  }

  function modelBlock() {
    var scenes = (window.M3D && window.M3D.scenes) ? window.M3D.scenes() : [];
    var hasData = !!(window.ANAT && window.ANAT.m3d);
    if (!scenes.length || !hasData) {
      return '<div class="m3-chips" id="m3scene"><span class="chip on">泌尿系统</span></div>'
        + '<div class="m3-stage" id="m3stage"><span class="m3-hint">正在载入 3D 模型…</span></div>'
        + '<div class="m3-info" id="m3info"></div>';
    }
    var sc = M3D.scene(AT.scene) || scenes[0];
    return '<div class="m3-chips">' + scenes.map(function (s) {
      return '<button class="chip' + (s.id === sc.id ? ' on' : '') + '" data-scene="' + s.id + '">' + E(s.name) + '</button>';
    }).join('') + '</div>'
      + '<div class="m3-stage" id="m3stage"><span class="m3-hint">拖动旋转 · 双指缩放 · 点结构看名字</span></div>'
      + '<div class="m3-note">简化模型：用来记<b>位置和相邻关系</b>，形态细节以教材图谱为准</div>'
      + '<div class="m3-tools">'
      + '<button data-act="m3-reset">复位</button>'
      + '<button data-act="m3-iso" class="' + (AT.iso ? 'on' : '') + '">只看选中</button>'
      + '<button data-act="m3-step" data-d="-1">上一个</button>'
      + '<button data-act="m3-step" data-d="1">下一个</button>'
      + '</div>'
      + '<div class="m3-parts">' + sc.parts.map(function (p, i) {
        return '<button class="m3-part' + (i === AT.sel ? ' on' : '') + '" data-part="' + i + '">' + E(p.n) + '</button>';
      }).join('') + '</div>'
      + '<div class="m3-info" id="m3info"></div>';
  }

  function mountM3(v) {
    var stage = $('#m3stage', v);
    if (!stage) return;
    loadM3(function () {
      if (MOD.err || !window.M3D || !M3D.scenes().length) {
        stage.innerHTML = '<span class="m3-hint">3D 模型没加载上（离线缓存里可能缺 m3d.js），刷新试试</span>';
        return;
      }
      if (!scenesRendered(v)) { viewAtlas(v); return; }
      var sc = M3D.scene(AT.scene);
      if (!sc) return;
      if (AT.viewer) { try { AT.viewer.destroy(); } catch (e) { } AT.viewer = null; }
      AT.viewer = M3D.create(stage, {});
      AT.viewer.load(sc, function (i) { AT.sel = i; paintM3(v); });
      var hint = $('.m3-hint', stage);
      if (hint && AT.viewer.parts.length) hint.parentNode.removeChild(hint);
      if (AT.sel >= 0 && AT.sel < sc.parts.length) AT.viewer.select(AT.sel);
      setTimeout(function () { if (AT.viewer) AT.viewer.resize(); }, 60);
      paintM3(v);
    });
  }

  function scenesRendered(v) { return !!$('[data-scene]', v); }

  function paintM3(v) {
    var box = $('#m3info', v);
    if (!box) return;
    $$('[data-part]', v).forEach(function (b) {
      b.classList.toggle('on', +b.dataset.part === AT.sel);
    });
    var iso = $('[data-act="m3-iso"]', v);
    if (iso) iso.classList.toggle('on', AT.iso);
    var sc = M3D && M3D.scene ? M3D.scene(AT.scene) : null;
    if (!sc || AT.sel < 0 || !sc.parts[AT.sel]) {
      box.innerHTML = '<div class="m3-tip">' + E(sc ? sc.note : '') + '<br>'
        + '<span class="tiny muted">点模型上的结构，或点下面的名字</span></div>';
      return;
    }
    var p = sc.parts[AT.sel];
    var r = relTo(p.n);
    box.innerHTML = '<div class="m3-name">' + E(p.n) + '</div>'
      + '<div class="m3-sub">' + E(sc.name) + ' · 第 ' + (AT.sel + 1) + ' / ' + sc.parts.length + ' 个结构</div>'
      + ((r.terms.length || r.qa.length || r.imgs.length)
        ? '<div class="m3-rel">'
        + r.terms.map(function (t) {
          return '<button class="rel" data-goto-term="' + t.id + '">' + E(t.term) + '</button>';
        }).join('')
        + r.qa.map(function (q) {
          return '<button class="rel" data-goto-qa="' + q.id + '">' + E(q.q.slice(0, 16)) + '</button>';
        }).join('')
        + r.imgs.map(function (i) {
          return '<button class="rel rel-img" data-open-img="' + i + '">图：' + E(IMAGES[i].title.slice(0, 8)) + '</button>';
        }).join('')
        + '</div>'
        : '<div class="tiny muted">这个结构暂时没有对应的名词解释</div>');
    on(v, '[data-goto-term]', 'click', function (e) { openRelTerm(e.currentTarget.dataset.gotoTerm); });
    on(v, '[data-goto-qa]', 'click', function (e) { openRelTerm(e.currentTarget.dataset.gotoQa); });
    on(v, '[data-open-img]', 'click', function (e) { openViewer(+e.currentTarget.dataset.openImg); });
  }

  /* 从图解跳到名词 / 问答 */
  /* 弹窗里的 3D 模型（背诵卡 / 图解都能用） */
  function openScene(id, name) {
    var m = $('#modal');
    m.innerHTML = '<div class="viewer">'
      + '<div class="viewer-bar"><b>3D 模型</b>'
      + '<button class="icon-btn" style="color:#e8e2d6" data-close aria-label="关闭">'
      + '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
      + '<div class="m3-stage" id="m3modal"><span class="m3-hint">正在载入模型…</span></div>'
      + '<div class="m3-info" id="m3minfo" style="padding:12px 16px;min-height:64px"></div>'
      + '</div>';
    document.body.style.overflow = 'hidden';
    m.classList.add('on');
    $('[data-close]', m).addEventListener('click', closeViewer);
    var stage = $('#m3modal', m), info = $('#m3minfo', m);
    var lite = null;
    loadM3(function () {
      if (!window.M3D || !M3D.scenes().length) {
        stage.innerHTML = '<span class="m3-hint">模型没加载上，检查 assets/js/data/m3d.js</span>';
        return;
      }
      var sc = M3D.scene(id) || M3D.scenes()[0];
      lite = M3D.create(stage, {});
      lite.load(sc, function (i) {
        if (i < 0) { info.innerHTML = '<div class="m3-tip">' + E(sc.note || '') + '</div>'; return; }
        var p = sc.parts[i], r = relTo(p.n);
        info.innerHTML = '<div class="m3-name" style="color:#f0eadd">' + E(p.n) + '</div>'
          + '<div class="m3-sub" style="color:#8d8579">' + E(sc.name) + ' · ' + (i + 1) + '/' + sc.parts.length + '</div>'
          + (r.terms.length ? '<div class="m3-rel">' + r.terms.map(function (t) {
            return '<button class="rel" data-goto-term="' + t.id + '">' + E(t.term) + '</button>';
          }).join('') + '</div>' : '');
        on(info, '[data-goto-term]', 'click', function (e) { openRelTerm(e.currentTarget.dataset.gotoTerm); });
      });
      var hint = $('.m3-hint', stage);
      if (hint && lite.parts.length) hint.parentNode.removeChild(hint);
      /* 尽量自动选中与知识点同名的结构 */
      if (name) {
        var best = -1;
        sc.parts.forEach(function (p, k) {
          if (p.n === name) best = k;
          else if (best < 0 && (name.indexOf(p.n) >= 0 || p.n.indexOf(name) >= 0)) best = k;
        });
        if (best >= 0) lite.select(best);
      }
      setTimeout(function () { lite.resize(); }, 60);
      m._viewer = lite;
    });
  }

  /* 卡片里的内嵌 3D：直接拖动，不用点开 */
  var INLINE = { viewer: null };
  function mountInline(host) {
    var box = $('.vis3d', host);
    if (!box) return;
    if (INLINE.viewer) { try { INLINE.viewer.destroy(); } catch (e) { } INLINE.viewer = null; }
    var id = box.dataset.v3d, nm = box.dataset.vn || '';
    var stage = document.createElement('div');
    stage.className = 'm3-stage m3-stage-sm';
    stage.innerHTML = '<span class="m3-hint">载入模型…</span>';
    box.appendChild(stage);
    var tag = document.createElement('div');
    tag.className = 'vis3d-tag';
    tag.textContent = '拖动旋转 · 点结构看名字';
    box.appendChild(tag);
    loadM3(function () {
      if (!window.M3D || !M3D.scenes().length) { stage.innerHTML = '<span class="m3-hint">模型没加载上</span>'; return; }
      var sc = M3D.scene(id);
      if (!sc) { stage.innerHTML = '<span class="m3-hint">这个场景没有模型</span>'; return; }
      var vw = M3D.create(stage, {});
      INLINE.viewer = vw;
      vw.load(sc, function (i) {
        if (i < 0) { tag.textContent = '拖动旋转 · 点结构看名字'; return; }
        var p = sc.parts[i], r = relTo(p.n);
        tag.innerHTML = '<b>' + E(p.n) + '</b>' + (r.terms.length ? ' · ' + E(r.terms[0].term) : '');
      });
      var hint = $('.m3-hint', stage);
      if (hint && vw.parts.length) hint.parentNode.removeChild(hint);
      if (nm) {
        var best = -1;
        sc.parts.forEach(function (p, k) {
          if (p.n === nm) best = k;
          else if (best < 0 && (nm.indexOf(p.n) >= 0 || p.n.indexOf(nm) >= 0)) best = k;
        });
        if (best >= 0) vw.select(best);
      }
      setTimeout(function () { vw.resize(); }, 60);
    });
  }

  function openRelTerm(id) {
    var t = TERMS.filter(function (x) { return x.id === id; })[0];
    var q = QA.filter(function (x) { return x.id === id; })[0];
    var title = t ? t.term : q ? q.q : '';
    var body = t ? t.def : (q ? q.a : '');
    var m = $('#modal');
    m.innerHTML = '<div class="viewer"><div class="viewer-bar"><b>' + E(title) + '</b>'
      + '<button class="icon-btn" style="color:#e8e2d6" data-close aria-label="关闭">'
      + '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
      + '<div class="viewer-foot" style="padding:16px 18px"><div style="line-height:1.85">' + E(body) + '</div></div></div>';
    document.body.style.overflow = 'hidden';
    $('[data-close]', m).addEventListener('click', closeViewer);
  }

  function openViewer(idx) {
    var im = IMAGES[idx];
    if (!im) return;
    var labels = (im.labels || []).map(function (l, i) {
      return '<button class="hotspot" style="left:' + (l.x * 100) + '%;top:' + (l.y * 100) + '%" title="' + E(l.t) + '">'
        + (i + 1) + '<span>' + E(l.t) + '</span></button>';
    }).join('');
    var m = $('#modal');
    m.innerHTML = '<div class="viewer">'
      + '<div class="viewer-bar"><b>' + E(im.title) + '</b>'
      + '<button class="icon-btn" style="color:#e8e2d6" data-close aria-label="关闭">'
      + '<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
      + '<div class="viewer-body"><div class="viewer-stage">'
      + '<img src="assets/img/' + E(im.file) + '" alt="' + E(im.title) + '">' + labels
      + '</div></div>'
      + '<div class="viewer-foot">'
      + '<div style="margin-bottom:6px;color:#9aa1a8;font-family:var(--mono);font-size:10px;letter-spacing:.16em">'
      + E(chName(im.chapter)) + (im.type === 'svg' ? ' · 示意图' : ' · 解剖图') + '</div>'
      + '<div>' + E(im.desc || '') + '</div>'
      + (im.credit ? '<div class="tiny" style="margin-top:8px;color:#7d858c">' + E(im.credit) + '</div>' : '')
      + '</div></div>';
    document.body.style.overflow = 'hidden';
    $('[data-close]', m).addEventListener('click', closeViewer);
    $('.viewer-body', m).addEventListener('click', function (e) {
      if (e.target.tagName === 'IMG') e.target.style.maxHeight = e.target.style.maxHeight === 'none' ? '' : 'none';
    });
  }
  function closeViewer() {
    var m = $('#modal');
    if (m._viewer) { try { m._viewer.destroy(); } catch (e) { } m._viewer = null; }
    m.innerHTML = '';
    m.classList.remove('on');
    document.body.style.overflow = '';
  }

  /* ================= 速查 ================= */
  var RF = { type: 'term', q: '', chapter: 'all', open: {} };
  function viewRef(v) {
    var pool = RF.type === 'vocab' ? VOCAB : RF.type === 'qa' ? QA : TERMS;
    v.innerHTML = '<section class="sec" style="margin-top:6px">'
      + '<div class="sec-hd"><h2 class="sec-title">速查</h2><span class="sec-more" id="rf-count"></span></div>'
      + '<div class="search">' + ICON.ref + '<input id="rf-q" type="search" placeholder="搜名词、释义、英文……" value="' + E(RF.q) + '"></div>'
      + segHTML([['term', '名词解释'], ['qa', '问答题'], ['vocab', '中英术语']], RF.type)
      + chipsHTML(RF.chapter, chaptersOf(pool))
      + '<div class="card pad" id="rf-list" style="padding:4px 14px"></div>'
      + '</section>';
    var input = $('#rf-q', v);
    input.addEventListener('input', function () { RF.q = input.value; renderRefList(v); });
    on(v, '[data-mode]', 'click', function (e) { RF.type = e.currentTarget.dataset.mode; RF.open = {}; viewRef(v); });
    on(v, '[data-ch]', 'click', function (e) { RF.chapter = e.currentTarget.dataset.ch; viewRef(v); });
    renderRefList(v);
  }
  function refNote(k) {
    var n = S.notes[k];
    if (!n) return '';
    return '<div style="margin-top:8px;padding:7px 9px;border-left:2px solid var(--cy);background:rgba(42,212,245,.07);font-size:13px;color:#bcd8ea">'
      + E(n) + '</div>';
  }
  function renderRefList(v) {
    var host = $('#rf-list', v);
    var q = norm(RF.q);
    var ch = RF.chapter;
    var html = '', n = 0;
    if (RF.type === 'vocab') {
      var vs = VOCAB.filter(function (x) {
        return (ch === 'all' || x.chapter === ch) && (!q || norm(x.en + x.zh).indexOf(q) >= 0);
      });
      n = vs.length;
      html = vs.map(function (x) {
        return '<div class="ref-item"><div class="ref-q" style="padding:9px 4px"><span class="ref-term"><b>' + E(x.zh) + '</b><i>' + E(x.en) + '</i></span></div></div>';
      }).join('');
    } else if (RF.type === 'qa') {
      var qs = QA.filter(function (x) {
        return (ch === 'all' || x.chapter === ch) && (!q || norm(x.q + x.a).indexOf(q) >= 0);
      });
      n = qs.length;
      html = qs.map(function (x) {
        var open = !!RF.open[x.id];
        return '<div class="ref-item"><button class="ref-q" data-open="' + E(x.id) + '">'
          + '<span class="ref-dot"></span><span class="grow">' + E(x.q) + '</span>'
          + (x.star ? '<span class="star" style="flex:none">' + '★'.repeat(Math.min(3, x.star)) + '</span>' : '') + '</button>'
          + (open ? '<div class="ref-a">' + E(x.a).replace(/\n/g, '<br>') + refNote('q:' + x.id) + '<div class="tiny muted" style="margin-top:6px">' + E(chName(x.chapter)) + '</div></div>' : '')
          + '</div>';
      }).join('');
    } else {
      var ts = TERMS.filter(function (x) {
        return (ch === 'all' || x.chapter === ch) && (!q || norm(x.term + x.def + (x.en || '')).indexOf(q) >= 0);
      });
      n = ts.length;
      html = ts.map(function (x) {
        var open = !!RF.open[x.id];
        return '<div class="ref-item"><button class="ref-q" data-open="' + E(x.id) + '">'
          + '<span class="ref-dot"></span><span class="grow"><b style="font-family:var(--serif);font-size:14.5px">' + E(x.term) + '</b>'
          + (x.en ? '<span class="tiny muted" style="margin-left:6px">' + E(x.en) + '</span>' : '') + '</span></button>'
          + (open ? '<div class="ref-a">' + E(x.def) + refNote('t:' + x.id) + '</div>' : '')
          + '</div>';
      }).join('');
    }
    host.innerHTML = html || '<div class="empty"><b>没有匹配的条目</b>换个关键词试试</div>';
    var c = $('#rf-count', v); if (c) c.textContent = n + ' 条';
    on(host, '[data-open]', 'click', function (e) {
      var id = e.currentTarget.dataset.open;
      RF.open[id] = !RF.open[id];
      renderRefList(v);
    });
  }

  /* ================= 设置 ================= */
  function openSettings() {
    var m = $('#modal');
    m.innerHTML = '<div class="modal"><div class="modal-mask" data-close></div>'
      + '<div class="sheet"><div class="sheet-grip"></div>'
      + '<h3>设置与数据</h3>'
      + '<div class="sheet-row"><span>深色模式<small>夜里背书记忆更省眼</small></span>'
      + '<button class="btn" data-act="theme" style="min-width:74px">' + (S.prefs.theme === 'dark' ? '已开启' : '已关闭') + '</button></div>'
      + '<div class="sheet-row"><span>每日目标<small>每天背多少张卡片</small></span>'
      + '<div class="row" style="gap:6px"><button class="btn" data-goal="-5">−</button>'
      + '<b style="min-width:38px;text-align:center;font-variant-numeric:tabular-nums">' + (S.prefs.goal || 30) + '</b>'
      + '<button class="btn" data-goal="5">＋</button></div></div>'
      + '<div class="sheet-row"><span>导出学习记录<small>备份成 JSON，可换设备导入</small></span>'
      + '<button class="btn" data-act="export">导出</button></div>'
      + '<div class="sheet-row"><span>导入记录<small>选择之前导出的 JSON</small></span>'
      + '<label class="btn" style="margin:0">导入<input type="file" accept="application/json,.json" id="imp" hidden></label></div>'
      + '<div class="sheet-row"><span>清空进度<small>背过的、错题、连续天数全部归零</small></span>'
      + '<button class="btn" data-act="reset" style="color:var(--bad)">清空</button></div>'
      + '<div class="divider"></div>'
      + '<div class="small muted" style="line-height:1.9">'
      + '内容：名词 ' + TERMS.length + ' · 简答 ' + QA.length + ' · 选择 ' + MCQ.length + ' · 填空 ' + FILL.length + ' · 术语 ' + VOCAB.length + ' · 图 ' + IMAGES.length + '<br>'
      + '题库整理自老师发的复习重点与题库；配图搜集自网络，仅供个人学习使用，勿作他用。<br>'
      + '<span class="mono tiny">' + E(META.version || '1.0') + ' · ' + E(META.updated || '') + '</span>'
      + '</div></div></div>';
    $$('[data-close]', m).forEach(function (el) { el.addEventListener('click', close); });
    function close() { m.innerHTML = ''; document.body.style.overflow = ''; }
    document.body.style.overflow = 'hidden';

    $('[data-act="theme"]', m).addEventListener('click', function () {
      S.prefs.theme = S.prefs.theme === 'dark' ? 'light' : 'dark';
      applyTheme(S.prefs.theme); save();
      this.textContent = S.prefs.theme === 'dark' ? '已开启' : '已关闭';
    });
    $$('[data-goal]', m).forEach(function (b) {
      b.addEventListener('click', function () {
        S.prefs.goal = clamp((S.prefs.goal || 30) + (+b.dataset.goal), 5, 200);
        save();
        b.parentNode.querySelector('b').textContent = S.prefs.goal;
      });
    });
    $('[data-act="export"]', m).addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ srs: S.srs, days: S.days, wrong: S.wrong, prefs: S.prefs }, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '解剖学习记录-' + dayKey() + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      toast('已导出');
    });
    $('#imp', m).addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          if (o.srs) S.srs = o.srs;
          if (o.days) S.days = o.days;
          if (o.wrong) S.wrong = o.wrong;
          if (o.prefs) S.prefs = Object.assign(S.prefs, o.prefs);
          save(); applyTheme(S.prefs.theme || 'light');
          toast('已导入'); close(); route();
        } catch (err) { toast('文件读不出来'); }
      };
      fr.readAsText(f);
    });
    $('[data-act="reset"]', m).addEventListener('click', function () {
      if (!confirm('确定清空全部学习进度？此操作不能撤销。')) return;
      S.srs = {}; S.days = {}; S.wrong = {};
      save(); toast('已清空'); close(); route();
    });
  }

  function emptyBox(title, sub) {
    return '<div class="card empty"><b>' + E(title) + '</b>' + E(sub || '') + '</div>';
  }

  /* ===== 质感层：星空 / 聚光 / 入场（手写，零依赖） ===== */
  var FX = { stars: null };

  function fxStars() {
    if (FX.stars || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var cv = document.createElement('canvas');
    cv.id = 'stars';
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, pts = [];
    function size() {
      w = cv.clientWidth || window.innerWidth;
      h = cv.clientHeight || window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(70, Math.max(26, (w * h) / 16000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * w, y: Math.random() * h,
          r: Math.random() * 1.3 + .35, a: Math.random() * .5 + .12,
          s: Math.random() * .018 + .004, p: Math.random() * 6.28 });
      }
    }
    size();
    window.addEventListener('resize', size);
    var raf, alive = true;
    function draw() {
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.p += p.s;
        var a = p.a * (.55 + .45 * Math.sin(p.p));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = 'rgba(150,225,255,' + a.toFixed(3) + ')';
        ctx.fill();
      }
    }
    draw();
    document.addEventListener('visibilitychange', function () {
      alive = !document.hidden;
      if (alive) draw(); else cancelAnimationFrame(raf);
    });
    FX.stars = cv;
  }

  /* 卡片聚光：指针位置写进 CSS 变量 */
  function fxSpot(root) {
    Array.prototype.forEach.call(root.querySelectorAll('.card'), function (c) {
      if (c.__spot) return;
      c.__spot = 1;
      var s = document.createElement('span');
      s.className = 'spot';
      c.insertBefore(s, c.firstChild);
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      c.addEventListener('pointerdown', function () { c.classList.add('spot-on'); });
      c.addEventListener('pointerleave', function () { c.classList.remove('spot-on'); });
    });
  }

  /* 入场：滚动到就浮现，1.2s 后兜底全显，绝不把人卡在空白里 */
  var REVEAL = null;
  function fxReveal(root) {
    var els = Array.prototype.slice.call(root.querySelectorAll('.card, .learn-hd, .lec-blk'))
      .filter(function (e) { return !e.classList.contains('reveal') && !e.closest('.m3-stage'); });
    if (!els.length) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;
    els.forEach(function (e, i) { e.classList.add('reveal'); });
    REVEAL = REVEAL || new IntersectionObserver(function (list) {
      list.forEach(function (it) {
        if (it.isIntersecting) { it.target.classList.add('in'); REVEAL.unobserve(it.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.02 });
    els.forEach(function (e) { REVEAL.observe(e); });
    setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 1200);
  }

  function fxPaint(root) {
    try { fxSpot(root); fxReveal(root); } catch (e) {}
  }

  /* ================= 启动 ================= */
  function boot() {
    viewEl = $('#view');
    tabEl = $('#tabbar');
    applyTheme(S.prefs.theme || 'light');
    fxStars();

    document.addEventListener('click', function (e) {
      var tab = e.target.closest('.tab');
      if (tab) { go(tab.dataset.go); }
    });

    $('#btn-theme').addEventListener('click', function () {
      S.prefs.theme = S.prefs.theme === 'dark' ? 'light' : 'dark';
      applyTheme(S.prefs.theme);
    });
    $('#btn-settings').addEventListener('click', openSettings);

    if (!location.hash) {
      try { location.hash = '#/home'; } catch (err) {}
    }
    window.addEventListener('hashchange', route);
    route();
    setTimeout(maybeTour, 700);

    document.addEventListener('keydown', function (e) {
      if (location.hash.indexOf('#/recite') !== 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === ' ' || e.key === 'Enter') {
        var r = $('[data-act="reveal"]');
        if (r) { e.preventDefault(); r.click(); }
      }
      if (e.key === '1' || e.key === '2' || e.key === '3') {
        var b = $('[data-rate="' + e.key + '"]');
        if (b) { e.preventDefault(); b.click(); }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
