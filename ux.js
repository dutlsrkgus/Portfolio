/* 읽기 편하고 쓰기 편한 화면을 위한 움직임·기능 모음
   (참고: 「이거, 이름이 뭐지? 2편 · 움직임과 표현」)
   Count-up · Text Scramble · Marquee · Page Transition(Wipe) · Magnetic Button · 3D Tilt · Confetti
   Dark Mode · Accordion · 검색 + Empty State · 스크롤 진행 바 · 맨 위로 · Reduced Motion
   app.js가 그린 화면 위에 덧붙여 동작하고, 데이터는 건드리지 않습니다. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => !!(RM && RM.matches);
  const finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = { get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} } };

  /* ── Dark Mode: 시스템 설정을 따르되, 고른 모드는 기억 ── */
  const THEME_KEY = 'gahyeon-theme';
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  function paintThemeButtons() {
    const dark = currentTheme() === 'dark';
    document.querySelectorAll('.theme-toggle').forEach((b) => {
      b.setAttribute('aria-pressed', String(dark));
      b.title = dark ? '낮 하늘 모드로 바꾸기' : '밤하늘 모드로 바꾸기';
      const l = b.querySelector('.side-label'); if (l) l.textContent = dark ? '낮 하늘 모드' : '밤하늘 모드';
    });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.theme-toggle'); if (!b) return;
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.add('theme-anim');
    document.documentElement.setAttribute('data-theme', next);
    store.set(THEME_KEY, next);
    paintThemeButtons();
    setTimeout(() => document.documentElement.classList.remove('theme-anim'), 400);
  });
  paintThemeButtons();

  /* ── 스크롤 진행 바 + 맨 위로 ── */
  const bar = $('read-progress'), top = $('to-top');
  function onScroll() {
    const h = document.documentElement.scrollHeight - innerHeight;
    const r = h > 0 ? Math.min(1, scrollY / h) : 0;
    if (bar) bar.style.transform = `scaleX(${r})`;
    if (top) top.classList.toggle('show', scrollY > 600);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce() ? 'auto' : 'smooth' }));

  /* ── Count-up: 숫자가 보이면 0 → 목표 값 (1.6초, ease-out, 천 단위 쉼표) ── */
  function countUp(el) {
    const node = el.firstChild; if (!node || node.nodeType !== 3) return;
    const target = Number(String(node.textContent).replace(/[^0-9.]/g, ''));
    if (!isFinite(target) || target <= 0 || reduce()) return;
    const dur = 1600, t0 = performance.now();
    const fmt = (v) => Math.round(v).toLocaleString('ko-KR');
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(tick); else node.textContent = fmt(target);
    })(t0);
  }
  const countIO = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => ents.forEach((en) => {
    if (en.isIntersecting) { countIO.unobserve(en.target); countUp(en.target); }
  }), { threshold: .6 }) : null;
  function watchCounts() { document.querySelectorAll('.stat-value:not([data-cu])').forEach((el) => { el.setAttribute('data-cu', '1'); if (countIO) countIO.observe(el); }); }

  /* ── Text Scramble: 페이지 제목만 1초 안에 왼쪽부터 확정 ── */
  const GLYPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz*#%&';
  function scramble(el) {
    if (!el || reduce()) return;
    const final = el.dataset.final || el.textContent; el.dataset.final = final;
    const dur = 900, t0 = performance.now();
    clearTimeout(el._scr); el._scr = setTimeout(() => { el.textContent = final; }, dur + 150);   // 탭이 멈춰도 원래 글자로 확정
    (function tick(now) {
      const p = Math.min(1, (now - t0) / dur), fixed = Math.floor(final.length * p);
      el.textContent = final.split('').map((c, i) => (i < fixed || c === ' ' ? c : GLYPH[(Math.random() * GLYPH.length) | 0])).join('');
      if (p < 1) requestAnimationFrame(tick); else el.textContent = final;
    })(t0);
  }
  function onPage() {
    const page = location.hash.slice(1) || 'home';
    const sec = document.querySelector(`.page[data-page="${page}"]:not([hidden]) .page-head .script`);
    scramble(sec);
    watchCounts();
  }
  addEventListener('hashchange', onPage);

  /* ── Page Transition: 하늘색 막이 왼쪽→오른쪽으로 쓸고 지나가는 Wipe (0.5초) ── */
  const PAGES = ['home', 'projects', 'career', 'certs', 'evidence', 'edit'];
  const wipe = $('wipe');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || !wipe || reduce() || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const to = a.getAttribute('href').slice(1);
    if (!PAGES.includes(to) || to === (location.hash.slice(1) || 'home')) return;
    e.preventDefault();
    wipe.classList.remove('out'); wipe.classList.add('in');
    setTimeout(() => {
      location.hash = to;
      wipe.classList.remove('in'); wipe.classList.add('out');
      setTimeout(() => wipe.classList.remove('out'), 300);
    }, 250);
  }, true);

  /* ── Marquee: 수상 내역이 끊김 없이 흐르는 띠 (마우스를 올리면 멈춤, 누르면 프로젝트 열기) ── */
  function buildMarquee() {
    const box = $('award-marquee'); if (!box || !window.PORTFOLIO) return;
    const list = (window.PORTFOLIO.projects || []).filter((p) => p.award && !p.private && !p.example)
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    if (!list.length) { box.hidden = true; return; }
    const items = list.map((p) => `<button class="mq-item" type="button" data-open="${esc(p.id)}"><span class="badge award">${esc(p.award)}</span>${esc(p.title)}</button>`).join('<span class="mq-dot" aria-hidden="true">✦</span>');
    box.innerHTML = `<div class="mq-track"><div class="mq-row">${items}<span class="mq-dot" aria-hidden="true">✦</span></div><div class="mq-row" aria-hidden="true">${items}<span class="mq-dot">✦</span></div></div>`;
    box.querySelectorAll('.mq-row[aria-hidden] button').forEach((b) => b.setAttribute('tabindex', '-1'));
  }

  /* ── Magnetic Button: 커서 쪽으로 최대 8px 끌려오고, 떠나면 스프링처럼 복귀 ── */
  function magnet(el) {
    if (el.dataset.mag) return; el.dataset.mag = '1';
    el.addEventListener('mousemove', (e) => {
      if (reduce()) return;
      const r = el.getBoundingClientRect(), x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${Math.max(-8, Math.min(8, x * .25))}px, ${Math.max(-8, Math.min(8, y * .35))}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }

  /* ── 3D Tilt: 카드가 커서 방향으로 최대 6도 기울기 ── */
  function tilt(el) {
    if (el.dataset.tilt) return; el.dataset.tilt = '1';
    el.addEventListener('mousemove', (e) => {
      if (reduce()) return;
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) translateY(-8px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg)`;
      el.style.setProperty('--gx', `${(px + .5) * 100}%`); el.style.setProperty('--gy', `${(py + .5) * 100}%`);
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  }
  function enhance() {
    if (!finePointer) return;
    document.querySelectorAll('.cta .btn, .next .btn').forEach(magnet);
    document.querySelectorAll('.pcard, .intro-steps li').forEach(tilt);
  }

  /* ── Confetti: ‘수상작’ 필터를 누르면 색종이 80개가 퍼졌다 2초 안에 사라짐 ── */
  function confetti(x, y) {
    if (reduce()) return;
    const cv = document.createElement('canvas'); cv.className = 'confetti'; cv.width = innerWidth; cv.height = innerHeight;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d'), COLORS = ['#3a66f0', '#7aa2ff', '#f7a8c6', '#ffd84d', '#5fbf4c', '#ffffff'];
    const ps = Array.from({ length: 80 }, () => ({ x, y, vx: (Math.random() - .5) * 9, vy: -Math.random() * 11 - 4, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: COLORS[(Math.random() * COLORS.length) | 0] }));
    const t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 2000; ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => { p.vy += .32; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (t < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }
  document.addEventListener('click', (e) => {
    const f = e.target.closest('#filters [data-f="award"]'); if (!f) return;
    const r = f.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top + r.height / 2);
  });

  /* ── Accordion: 경력의 ‘수행 업무 · 성과’ 접고 펼치기 (0.3초) ── */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.acc-btn');
    if (b) { const open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); b.nextElementSibling.classList.toggle('open', open); return; }
    const all = e.target.closest('#acc-all');
    if (all) {
      const open = all.getAttribute('aria-pressed') !== 'true';
      all.setAttribute('aria-pressed', String(open)); all.textContent = open ? '모두 접기' : '모두 펼치기';
      document.querySelectorAll('#timeline .acc-btn').forEach((x) => { x.setAttribute('aria-expanded', String(open)); x.nextElementSibling.classList.toggle('open', open); });
    }
  });

  /* ── 프로젝트 검색 + Empty State ── */
  const q = $('pq');
  function applySearch() {
    const list = $('plist'); if (!list || !q) return;
    const words = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    list.querySelectorAll('li:not(.group-h):not(.empty-row):not(.search-empty)').forEach((li) => {
      const ok = !words.length || words.every((w) => li.textContent.toLowerCase().includes(w));
      li.hidden = !ok; if (ok) shown++;
    });
    list.querySelectorAll('li.group-h').forEach((h) => {
      let n = h.nextElementSibling, any = false;
      while (n && !n.classList.contains('group-h')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
      h.hidden = !any;
    });
    let empty = list.querySelector('.search-empty');
    if (words.length && !shown) {
      if (!empty) { empty = document.createElement('li'); empty.className = 'search-empty'; list.appendChild(empty); }
      empty.innerHTML = `<b>‘${esc(q.value.trim())}’에 맞는 프로젝트가 없어요.</b><span>다른 낱말로 찾아보거나, 위의 분류 버튼을 눌러 보세요.</span>`;
    } else if (empty) empty.remove();
    const note = $('pq-note'); if (note) note.textContent = words.length ? `검색 결과 ${shown}건` : '';
  }
  if (q) { q.addEventListener('input', applySearch); q.addEventListener('keydown', (e) => { if (e.key === 'Escape') { q.value = ''; applySearch(); } }); }

  /* app.js가 화면을 다시 그릴 때마다 기능을 다시 붙여요 */
  const mo = new MutationObserver(() => { enhance(); watchCounts(); applySearch(); });
  ['plist', 'featured', 'stats', 'intro-steps', 'timeline'].forEach((id) => { const el = $(id); if (el) mo.observe(el, { childList: true }); });

  buildMarquee(); enhance(); onPage();
})();
