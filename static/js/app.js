/* Carnet Français — small, dependency-free site script. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- header ---------- */
  var toggle = $(".nav-toggle"), nav = $("#nav");
  if (toggle) toggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });
  var themeBtn = $(".theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", function () {
    var root = document.documentElement;
    var dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  });

  /* ---------- filters (courses, books) ---------- */
  $$("[data-filter-group]").forEach(function (group) {
    var target = $('[data-filter-target="' + group.dataset.filterGroup + '"]');
    group.addEventListener("click", function (ev) {
      var chip = ev.target.closest(".chip"); if (!chip) return;
      $$(".chip", group).forEach(function (c) { c.classList.toggle("is-active", c === chip); });
      var f = chip.dataset.filter;
      $$("[data-level]", target).forEach(function (card) { card.hidden = f !== "all" && card.dataset.level !== f; });
    });
  });

  /* ---------- speech ---------- */
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR"; u.rate = 0.9;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^fr/i.test(x.lang); })[0];
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  /* ---------- contact form → mailto ---------- */
  var form = $("[data-contact-form]");
  if (form) {
    var course = new URLSearchParams(location.search).get("course");
    if (course) $("[data-course-subject]", form).value = "Course enquiry: " + course;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var d = new FormData(form);
      var body = d.get("message") + "\n\n— " + d.get("name") + " <" + d.get("email") + ">";
      location.href = "mailto:" + form.dataset.email + "?subject=" + encodeURIComponent(d.get("subject") || "Hello") + "&body=" + encodeURIComponent(body);
    });
  }

  /* ---------- data-driven pages ---------- */
  var page = document.body.dataset.page;
  if (page !== "index" && page !== "learn") return;
  fetch("data/learn.json").then(function (r) { return r.json(); }).then(function (data) {
    if (page === "index") phraseOfDay(data.phrases);
    if (page === "learn") { tabs(); flashcards(data.vocab); conjugation(data.verbs); quiz(data.quiz); }
  }).catch(function () {});

  function phraseOfDay(phrases) {
    var day = Math.floor(Date.now() / 86400000);
    var p = phrases[day % phrases.length];
    $("[data-phrase-fr]").textContent = p.fr;
    $("[data-phrase-en]").textContent = p.en;
    $("[data-speak-phrase]").addEventListener("click", function () { speak(p.fr); });
  }

  function tabs() {
    var all = $$(".tab");
    function show(name) {
      all.forEach(function (t) { var on = t.dataset.tab === name; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on); });
      $$("[data-panel]").forEach(function (p) { p.hidden = p.dataset.panel !== name; });
      store.set("learnTab", name);
    }
    all.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.tab); }); });
    show(store.get("learnTab", "flash"));
  }

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  function flashcards(vocab) {
    var sel = $("[data-flash-topic]"), card = $("[data-flashcard]"), rev = $("[data-flash-reverse]");
    var known = store.get("knownWords", []);
    Array.from(new Set(vocab.map(function (v) { return v.topic; }))).forEach(function (t) {
      var o = document.createElement("option"); o.value = o.textContent = t; sel.appendChild(o);
    });
    var deck = [], cur = null;
    function build() {
      var pool = vocab.filter(function (v) { return sel.value === "all" || v.topic === sel.value; });
      var unknown = pool.filter(function (v) { return known.indexOf(v.fr) < 0; });
      deck = shuffle(unknown.length ? unknown : pool);
      next();
    }
    function next() {
      if (!deck.length) build();
      cur = deck.shift();
      card.classList.remove("is-flipped");
      $("[data-flash-front]").textContent = rev.checked ? cur.en : cur.fr;
      $("[data-flash-back]").textContent = rev.checked ? cur.fr : cur.en;
      $("[data-flash-count]").textContent = deck.length + " left in this round";
      $("[data-flash-known-count]").textContent = known.length;
    }
    card.addEventListener("click", function () { card.classList.toggle("is-flipped"); });
    $("[data-flash-again]").addEventListener("click", function () { deck.push(cur); next(); });
    $("[data-flash-known]").addEventListener("click", function () {
      if (known.indexOf(cur.fr) < 0) { known.push(cur.fr); store.set("knownWords", known); }
      next();
    });
    $("[data-flash-speak]").addEventListener("click", function () { speak(cur.fr); });
    sel.addEventListener("change", build);
    rev.addEventListener("change", function () { deck.unshift(cur); next(); });
    build();
  }

  function conjugation(verbs) {
    var pronouns = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];
    var vSel = $("[data-conj-verb]"), tSel = $("[data-conj-tense]"), formEl = $("[data-conj-form]"), result = $("[data-conj-result]");
    Object.keys(verbs).forEach(function (v) { var o = document.createElement("option"); o.value = o.textContent = v; vSel.appendChild(o); });
    Object.keys(verbs[vSel.value]).forEach(function (t) { var o = document.createElement("option"); o.value = o.textContent = t; tSel.appendChild(o); });
    var lastInput = null;
    function render() {
      formEl.innerHTML = ""; result.textContent = "";
      pronouns.forEach(function (p, i) {
        var label = document.createElement("label");
        var span = document.createElement("span");
        var answer = verbs[vSel.value][tSel.value][i];
        span.textContent = (i === 0 && /^[aeéèêhiouy]/i.test(answer)) ? "j'" : p;
        var input = document.createElement("input");
        input.setAttribute("aria-label", p + " — " + vSel.value + ", " + tSel.value);
        input.dataset.i = i; input.autocapitalize = "off"; input.spellcheck = false;
        input.addEventListener("focus", function () { lastInput = input; });
        label.appendChild(span); label.appendChild(input); formEl.appendChild(label);
      });
    }
    function norm(s) { return s.trim().toLowerCase().replace(/\s+/g, " "); }
    function check() {
      var ok = 0;
      $$("input", formEl).forEach(function (inp) {
        var good = norm(inp.value) === verbs[vSel.value][tSel.value][inp.dataset.i];
        inp.classList.toggle("ok", good); inp.classList.toggle("ko", !good);
        if (good) ok++;
      });
      result.textContent = ok === 6 ? "Parfait ! 6/6 🎉" : ok + "/6 correct — keep going!";
      result.style.color = ok === 6 ? "var(--good)" : "var(--ink)";
    }
    formEl.addEventListener("submit", function (ev) { ev.preventDefault(); check(); });
    formEl.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); check(); } });
    $("[data-conj-check]").addEventListener("click", check);
    $("[data-conj-reveal]").addEventListener("click", function () {
      $$("input", formEl).forEach(function (inp) { inp.value = verbs[vSel.value][tSel.value][inp.dataset.i]; inp.classList.remove("ok", "ko"); });
      result.textContent = "";
    });
    $("[data-conj-random]").addEventListener("click", function () {
      var vs = Object.keys(verbs), ts = Object.keys(verbs[vs[0]]);
      vSel.value = vs[Math.floor(Math.random() * vs.length)];
      tSel.value = ts[Math.floor(Math.random() * ts.length)];
      render();
    });
    var keys = $("[data-accent-keys]");
    "é è ê à â ç î ï ô û ù ë œ".split(" ").forEach(function (ch) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = ch;
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      b.addEventListener("click", function () {
        var inp = lastInput || $("input", formEl); if (!inp) return;
        var s = inp.selectionStart || inp.value.length, en = inp.selectionEnd || s;
        inp.value = inp.value.slice(0, s) + ch + inp.value.slice(en);
        inp.focus(); inp.setSelectionRange(s + 1, s + 1);
      });
      keys.appendChild(b);
    });
    vSel.addEventListener("change", render); tSel.addEventListener("change", render);
    render();
  }

  function quiz(questions) {
    var box = $("[data-quiz]"), i = 0, score = 0, qs = shuffle(questions);
    function levelFor(s, n) { var r = s / n; return r < .3 ? "A1" : r < .5 ? "A2" : r < .7 ? "B1" : r < .9 ? "B2" : "C1"; }
    function render() {
      if (i >= qs.length) {
        var lvl = levelFor(score, qs.length);
        var best = store.get("quizBest", 0); if (score > best) store.set("quizBest", score);
        box.innerHTML = '<div class="card center"><p class="eyebrow">Result</p><h2>' + score + " / " + qs.length + "</h2>" +
          '<p class="lead">Suggested starting level: <strong>' + lvl + "</strong></p>" +
          '<div class="actions center"><a class="btn btn-primary" href="courses.html">See ' + lvl + ' courses</a>' +
          '<button class="btn btn-ghost" data-restart>Try again</button></div></div>';
        $("[data-restart]", box).addEventListener("click", function () { i = 0; score = 0; qs = shuffle(questions); render(); });
        return;
      }
      var q = qs[i];
      box.innerHTML = '<div class="quiz-progress"><i style="width:' + (i / qs.length * 100) + '%"></i></div>' +
        '<p class="muted">Question ' + (i + 1) + " of " + qs.length + '</p><p class="quiz-q" lang="fr"></p><div class="quiz-opts"></div>' +
        '<p class="quiz-explain" aria-live="polite"></p>';
      $(".quiz-q", box).textContent = q.q;
      var opts = $(".quiz-opts", box);
      q.options.forEach(function (o, k) {
        var b = document.createElement("button"); b.className = "quiz-opt"; b.textContent = o; b.lang = "fr";
        b.addEventListener("click", function () {
          var buttons = $$(".quiz-opt", box);
          buttons.forEach(function (x) { x.disabled = true; });
          buttons[q.answer].classList.add("ok");
          if (k === q.answer) score++; else b.classList.add("ko");
          $(".quiz-explain", box).textContent = q.explain;
          var nxt = document.createElement("button"); nxt.className = "btn btn-primary"; nxt.style.marginTop = "14px";
          nxt.textContent = i + 1 < qs.length ? "Next question →" : "See my result";
          nxt.addEventListener("click", function () { i++; render(); });
          box.appendChild(nxt); nxt.focus();
        });
        opts.appendChild(b);
      });
    }
    render();
  }
})();
