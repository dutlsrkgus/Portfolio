/* 움직임 더하기 — Duration · Delay · Loop · Tooltip · Skeleton Loading · Smooth Transition · Parallax Scrolling
   app.js · fx.js · ux.js가 그린 화면 위에 덧붙여 동작하고, 데이터는 건드리지 않습니다.
   ‘동작 줄이기(Reduced Motion)’를 켠 사람에게는 움직임을 끄고 내용만 바로 보여 줘요. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => !!(RM && RM.matches);
  const finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement, body = document.body;
  const cssMs = (name, fallback) => { const v = parseFloat(getComputedStyle(root).getPropertyValue(name)); return isFinite(v) ? v : fallback; };

  /* ═════════ Duration · Delay ═════════
     data-anim="fade-up|fade|pop" data-dur="700" data-delay="120" → CSS 변수 --d · --dl
     목록(프로젝트·경력·자격증·봉사·증빙)은 칸마다 --i 번호를 붙여 --stagger 만큼씩 늦게 나타나요. */
  function applyTiming(scope) {
    (scope || document).querySelectorAll('[data-dur], [data-delay]').forEach((el) => {
      if (el.dataset.dur) el.style.setProperty('--d', parseFloat(el.dataset.dur) + 'ms');
      if (el.dataset.delay) el.style.setProperty('--dl', parseFloat(el.dataset.delay) + 'ms');
    });
  }
  // 하위 페이지 제목 묶음: 큰 영문 → 제목 → 설명 순서로 90ms씩 늦게
  document.querySelectorAll('.page-head').forEach((h) => {
    Array.from(h.children).forEach((c, i) => {
      if (c.dataset.anim) return;
      c.dataset.anim = 'fade-up'; c.dataset.dur = '600'; c.dataset.delay = String(i * 90);
    });
  });
  applyTiming();

  const LISTS = ['featured', 'plist', 'timeline', 'certs', 'vol', 'evlist'];
  function numberList(list) {
    let i = 0;
    Array.from(list.children).forEach((c) => { if (!c.hidden) c.style.setProperty('--i', i++); });
  }
  const listMO = new MutationObserver((recs) => { new Set(recs.map((r) => r.target)).forEach(numberList); });
  LISTS.forEach((id) => { const el = $(id); if (el) { numberList(el); listMO.observe(el, { childList: true }); } });

  /* ═════════ Loop ═════════
     반복 움직임(별 반짝임·둥실·마퀴·수상 배지 반짝임·스크롤 안내)은 화면 밖이거나 탭이 가려지면 멈춰 둬요. */
  const cover = document.querySelector('.cover');
  if (cover && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => cover.classList.toggle('is-off', !en.isIntersecting)).observe(cover);
  }
  document.addEventListener('visibilitychange', () => root.classList.toggle('tab-hidden', document.hidden));

  /* ═════════ Smooth Transition ═════════
     표지의 ‘Scroll’ 안내를 누르면 소개 영역까지 부드럽게 내려가요. */
  const cue = $('scroll-cue');
  if (cue) cue.addEventListener('click', () => {
    const target = document.querySelector('.main .page[data-page="home"]');
    if (!target) return;
    const y = target.getBoundingClientRect().top + scrollY - 12;
    scrollTo({ top: y, behavior: reduce() ? 'auto' : 'smooth' });
  });

  /* ═════════ Tooltip ═════════
     title 대신 사이트 색에 맞춘 말풍선. 마우스는 --tip-delay(0.4초) 기다렸다가, 키보드 포커스는 바로 보여 줘요.
     한 번 뜬 뒤 0.3초 안에 옆 버튼으로 옮기면 기다리지 않고 바로 바뀝니다(Warm-up). */
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.id = 'motion-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  body.appendChild(tip);
  let tipFor = null, showT = 0, hideT = 0, lastHide = 0;

  function tipText(el) {
    const t = el.getAttribute('title');
    if (t) {                                   // 브라우저 기본 말풍선과 겹치지 않도록 title을 옮겨 둬요
      el.dataset.tip = t; el.removeAttribute('title');
      if (!el.getAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label', t);
    }
    return (el.dataset.tip || '').trim();
  }
  function wanted(el, text) {
    if (!text) return false;
    if (el.closest('.side')) return body.classList.contains('side-collapsed');   // 사이드바는 글자가 숨었을 때만
    return (el.innerText || '').replace(/\s+/g, ' ').trim() !== text;             // 이미 화면에 같은 글자가 보이면 생략
  }
  function place(el) {
    const r = el.getBoundingClientRect(), m = 8;
    const right = !!el.closest('.side');
    tip.style.transform = ''; tip.dataset.pos = right ? 'right' : 'top';
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let x, y;
    if (right) { x = r.right + 10; y = r.top + r.height / 2 - h / 2; }
    else {
      x = r.left + r.width / 2 - w / 2; y = r.top - h - 10;
      if (y < m) { y = r.bottom + 10; tip.dataset.pos = 'bottom'; }
    }
    const cx = Math.max(m, Math.min(innerWidth - w - m, x));
    tip.style.setProperty('--ax', `${Math.max(10, Math.min(w - 10, r.left + r.width / 2 - cx))}px`);
    tip.style.left = cx + 'px'; tip.style.top = Math.max(m, Math.min(innerHeight - h - m, y)) + 'px';
  }
  function showTip(el, now) {
    const text = tipText(el);
    if (!wanted(el, text)) return;
    clearTimeout(showT); clearTimeout(hideT);
    const go = () => {
      tipFor = el; tip.textContent = text; tip.hidden = false; tip.classList.remove('show');
      place(el); el.setAttribute('aria-describedby', tip.id);
      requestAnimationFrame(() => tip.classList.add('show'));
    };
    const warm = performance.now() - lastHide < 300;
    if (now || warm || reduce()) go(); else showT = setTimeout(go, cssMs('--tip-delay', 400));
  }
  function hideTip() {
    clearTimeout(showT);
    if (!tipFor) return;
    tipFor.removeAttribute('aria-describedby'); tipFor = null; lastHide = performance.now();
    tip.classList.remove('show');
    hideT = setTimeout(() => { tip.hidden = true; }, cssMs('--dur-1', 150));
  }
  const TIP_SEL = '[title], [data-tip]';
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest(TIP_SEL);
    if (el && el !== tipFor) { hideTip(); showTip(el); }
  });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest(TIP_SEL);
    if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest(TIP_SEL);
    if (el && el.matches(':focus-visible')) showTip(el, true);
  });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('pointerdown', hideTip, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideTip(); });
  addEventListener('scroll', hideTip, { passive: true });
  addEventListener('resize', hideTip);

  /* ═════════ Skeleton Loading ═════════
     ① 하위 페이지를 처음 열 때 잠깐(0.55초) 뼈대를 보여 주고, 내용이 한 칸씩 나타나요.
     ② 증빙 이미지는 실제로 다 내려받기 전까지 반짝이는 회색 자리를 지켜요. */
  const line = (c) => `<span class="skel skel-line${c ? ' ' + c : ''}"></span>`;
  const card = () => `<div class="skel-card"><span class="skel skel-box"></span>${line('lg')}${line()}${line('sm')}</div>`;
  const row = () => `<div class="skel-row"><span class="skel skel-dot"></span><div>${line('lg')}${line('sm')}</div></div>`;
  const rep = (n, f) => Array.from({ length: n }, f).join('');
  const SKEL = {
    projects: () => `<div class="skel-grid">${rep(3, card)}</div>${rep(4, row)}`,
    career: () => rep(5, row),
    certs: () => `<div class="skel-grid">${rep(6, card)}</div>`,
    evidence: () => rep(6, row)
  };
  const seen = new Set();
  function skeleton(sec) {
    const k = sec.dataset.page;
    if (!SKEL[k] || seen.has(k)) return;
    seen.add(k);
    if (reduce()) return;
    const head = sec.querySelector('.page-head'); if (!head) return;
    const box = document.createElement('div');
    box.className = 'skel-page'; box.setAttribute('aria-hidden', 'true'); box.innerHTML = SKEL[k]();
    head.after(box);
    sec.classList.add('is-loading'); sec.setAttribute('aria-busy', 'true');
    setTimeout(() => { box.remove(); sec.classList.remove('is-loading'); sec.removeAttribute('aria-busy'); }, 550);
  }
  const pages = document.querySelectorAll('.main .page[data-page]');
  const pageMO = new MutationObserver((recs) => recs.forEach((r) => { if (!r.target.hidden) skeleton(r.target); }));
  pages.forEach((s) => { pageMO.observe(s, { attributes: true, attributeFilter: ['hidden'] }); if (!s.hidden) skeleton(s); });

  const markLoaded = (e) => { const t = e.target; if (t && t.classList && t.classList.contains('ev-img')) t.classList.add('is-loaded'); };
  document.addEventListener('load', markLoaded, true);
  document.addEventListener('error', markLoaded, true);   // 깨진 이미지라도 뼈대는 거둬요

  /* ═════════ Parallax Scrolling ═════════
     표지: 글자는 천천히 내려가며 흐려지고, 행성·달·책은 깊이마다 다른 속도로 움직여요 (+ 마우스 방향으로 살짝).
     배경 별은 스크롤의 12% 속도로만 움직여 멀리 있는 느낌을 줘요.
     data-parallax="0.15" 를 붙인 요소는 스크롤한 거리의 15%만큼 뒤처져 천천히 지나가요. */
  document.querySelectorAll('.page-head .script').forEach((el) => { if (!el.dataset.parallax) el.dataset.parallax = '0.18'; });
  const target = { p: 0, mx: 0, my: 0 }, cur = { p: 0, mx: 0, my: 0 };
  let ticking = false;

  function readScroll() {
    const h = cover && !cover.hidden ? cover.offsetHeight : 0;
    target.p = Math.max(0, Math.min(h, scrollY));
    kick();
  }
  function frame() {
    ticking = false;
    if (reduce()) { [cover, root].forEach((n) => n && ['--p', '--mx', '--my', '--sky'].forEach((v) => n.style.removeProperty(v))); return; }
    let moving = false;
    Object.keys(cur).forEach((k) => {           // 목표 값으로 조금씩 다가가는 lerp → 끊김 없이 부드럽게
      const d = target[k] - cur[k];
      if (Math.abs(d) > (k === 'p' ? .1 : .001)) { cur[k] += d * (k === 'p' ? .2 : .08); moving = true; } else cur[k] = target[k];
    });
    if (cover) {
      cover.style.setProperty('--p', cur.p.toFixed(1));
      cover.style.setProperty('--mx', cur.mx.toFixed(3));
      cover.style.setProperty('--my', cur.my.toFixed(3));
    }
    root.style.setProperty('--sky', (-scrollY * .12).toFixed(1));
    document.querySelectorAll('.page:not([hidden]) [data-parallax]').forEach((el) => {
      // 제자리(스크롤 0 또는 화면에 막 들어온 순간)를 기준으로, 내린 거리 × 비율만큼만 뒤처지게
      const docTop = el.getBoundingClientRect().top + scrollY - (parseFloat(el.style.translate.split(' ')[1]) || 0);
      const passed = Math.max(0, scrollY - Math.max(0, docTop - innerHeight));
      el.style.translate = `0 ${(passed * (parseFloat(el.dataset.parallax) || 0)).toFixed(1)}px`;
    });
    if (moving) kick();
  }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

  addEventListener('scroll', readScroll, { passive: true });
  addEventListener('resize', readScroll);
  addEventListener('hashchange', () => setTimeout(readScroll, 300));
  if (cover && finePointer) {
    cover.addEventListener('pointermove', (e) => {
      target.mx = (e.clientX / innerWidth - .5) * 2; target.my = (e.clientY / innerHeight - .5) * 2; kick();
    });
    cover.addEventListener('pointerleave', () => { target.mx = 0; target.my = 0; kick(); });
  }
  if (RM && RM.addEventListener) RM.addEventListener('change', kick);
  readScroll();

  /* ═════════ 프로젝트 자세히 보기: 고정 틀 + Scroll Snap + Parallax ═════════
     긴 7단계 글을 읽기 쉽게:
     ① 제목 줄과 ‘01~07 단계 바로가기’를 위에 고정(Sticky)하고, 지금 읽는 단계를 표시해요 (Scroll Spy + 진행 바).
     ② 단계마다 같은 높이의 틀에 담아 칸 안에서 따로 스크롤 → 일곱 칸의 전체 모양이 한눈에 보여요 (넘치면 ‘전체 보기’로 펼치기).
     ③ 단계 경계 근처에서 멈추면 그 단계 처음에 살짝 맞춰 줘요 (Scroll Snap · proximity — 긴 글은 자유롭게 읽혀요).
     ④ 단계마다 뒤에 깔린 큰 숫자가 글보다 느리게 움직여요 (Parallax). */
  const pdlg = $('pdlg'), pbody = $('pdlg-body');
  if (pdlg && pbody) {
    let secs = [], chips = [], bar = null, active = -1, spyRaf = 0, forced = null;   // forced: 바로가기로 고른 단계(직접 스크롤하기 전까지 유지)
    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => {
      const st = pbody.querySelector('.d-sticky');
      if (st) pdlg.style.setProperty('--sticky-h', st.offsetHeight + 'px');
    }) : null;

    function setActive(i) {
      if (i === active) return;
      active = i;
      chips.forEach((c, k) => { c.classList.toggle('on', k === i); if (k === i) c.setAttribute('aria-current', 'step'); else c.removeAttribute('aria-current'); });
      const c = chips[i], nav = c && c.parentElement;
      if (nav) nav.scrollTo({ left: c.offsetLeft - nav.clientWidth / 2 + c.offsetWidth / 2, behavior: reduce() ? 'auto' : 'smooth' });
    }
    function spy() {
      spyRaf = 0;
      if (!secs.length) return;
      const top = pdlg.getBoundingClientRect().top + (parseFloat(getComputedStyle(pdlg).getPropertyValue('--sticky-h')) || 0);
      const vh = pdlg.clientHeight;
      let cur = 0;
      secs.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        if (r.top - top < 80) cur = i;
        if (!reduce()) s.style.setProperty('--sp', Math.max(-1, Math.min(1, (r.top - top) / vh)).toFixed(3));   // -1(지나감) ~ 1(아직 아래)
      });
      const max = pdlg.scrollHeight - pdlg.clientHeight;
      if (max > 0 && pdlg.scrollTop >= max - 4) cur = secs.length - 1;   // 맨 끝에 닿으면 마지막 단계
      setActive(forced != null ? forced : cur);
      if (bar) bar.style.transform = `scaleX(${max > 0 ? pdlg.scrollTop / max : 1})`;
    }
    pdlg.addEventListener('scroll', () => { if (!spyRaf) spyRaf = requestAnimationFrame(spy); }, { passive: true });
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => pdlg.addEventListener(t, (e) => { if (!(e.target.closest && e.target.closest('.s7-nav'))) forced = null; }, { passive: true }));

    /* 칸마다 따로 스크롤: 본문을 같은 높이의 틀에 담고, 넘치는 칸에만 ‘더 보기’ 안내·진행 바·펼치기 버튼을 달아요 */
    const boxRO = 'ResizeObserver' in window ? new ResizeObserver((ents) => ents.forEach((en) => paintBox(en.target))) : null;
    function paintBox(box) {
      const sec = box.closest('.s7'); if (!sec) return;
      const over = box.scrollHeight - box.clientHeight > 4;
      const open = sec.classList.contains('open');
      box.classList.toggle('more', over);
      box.classList.toggle('at-end', box.scrollTop >= box.scrollHeight - box.clientHeight - 4);
      const max = box.scrollHeight - box.clientHeight;
      sec.style.setProperty('--bp', max > 0 ? (box.scrollTop / max).toFixed(3) : 1);
      const hint = sec.querySelector('.s7-hint'), btn = sec.querySelector('.s7-more');
      if (hint) hint.hidden = !over;
      if (btn) btn.hidden = !over && !open;
      box.tabIndex = over ? 0 : -1;               // 넘칠 때만 키보드(↑↓)로 칸 안을 스크롤
    }
    function setupBoxes() {
      if (boxRO) boxRO.disconnect();
      secs.forEach((sec) => {
        const box = sec.querySelector(':scope > div'), header = sec.querySelector(':scope > header');
        if (!box || box.classList.contains('s7-scroll')) return;
        const title = header && header.querySelector('b') ? header.querySelector('b').textContent : '';
        box.classList.add('s7-scroll'); box.setAttribute('role', 'region'); box.setAttribute('aria-label', title + ' 내용');
        if (header) header.insertAdjacentHTML('beforeend', `<button class="s7-more" type="button" aria-expanded="false" hidden>전체 보기</button>`);
        box.insertAdjacentHTML('afterend', `<div class="s7-hint" aria-hidden="true" hidden><span>스크롤해서 더 보기</span><i></i></div>`);
        box.addEventListener('scroll', () => paintBox(box), { passive: true });
        if (boxRO) { boxRO.observe(box); Array.from(box.children).forEach((c) => boxRO.observe(c)); }   // 영상·글꼴이 늦게 와서 높이가 바뀌어도 다시 계산
        paintBox(box);
      });
    }
    pbody.addEventListener('click', (e) => {
      const b = e.target.closest('.s7-more'); if (!b) return;
      const sec = b.closest('.s7'), box = sec.querySelector('.s7-scroll');
      const open = !sec.classList.contains('open');
      sec.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open)); b.textContent = open ? '틀에 맞추기' : '전체 보기';
      if (!open) { box.scrollTop = 0; sec.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' }); }
      paintBox(box); spy();
    });

    function enhanceProject() {
      const head = pbody.querySelector(':scope > .d-head');
      secs = Array.from(pbody.querySelectorAll('.steps7 > .s7'));
      if (!head || pbody.querySelector('.d-sticky')) return;
      const sticky = document.createElement('div');
      sticky.className = 'd-sticky';
      head.before(sticky); sticky.appendChild(head);
      if (secs.length > 1) {
        const nav = document.createElement('nav');
        nav.className = 's7-nav'; nav.setAttribute('aria-label', '단계 바로가기');
        nav.innerHTML = secs.map((s, i) => {
          const n = s.querySelector('header .n'), b = s.querySelector('header b');
          s.id = 's7-' + i;
          s.insertAdjacentHTML('afterbegin', `<span class="s7-bg" aria-hidden="true">${n ? n.textContent : i + 1}</span>`);
          return `<a href="#s7-${i}" data-s7="${i}"><span>${n ? n.textContent : ''}</span>${b ? b.textContent : ''}</a>`;
        }).join('');
        sticky.appendChild(nav);
        chips = Array.from(nav.querySelectorAll('a'));
      } else chips = [];
      bar = document.createElement('span'); bar.className = 'd-progress'; bar.setAttribute('aria-hidden', 'true');
      sticky.appendChild(bar);
      pdlg.classList.add('has-steps');
      setupBoxes();
      pdlg.style.setProperty('--sticky-h', sticky.offsetHeight + 'px');
      if (ro) { ro.disconnect(); ro.observe(sticky); }
      active = -1; forced = null; pdlg.scrollTop = 0; spy();
    }
    // 단계 바로가기: 주소(#)는 바꾸지 않고 대화상자 안에서만 부드럽게 이동
    pbody.addEventListener('click', (e) => {
      const a = e.target.closest('.s7-nav a'); if (!a) return;
      e.preventDefault(); e.stopPropagation();
      const s = secs[+a.dataset.s7]; if (!s) return;
      forced = +a.dataset.s7; setActive(forced);
      const sh = parseFloat(getComputedStyle(pdlg).getPropertyValue('--sticky-h')) || 0;
      const y = s.getBoundingClientRect().top - pdlg.getBoundingClientRect().top + pdlg.scrollTop - sh;
      pdlg.scrollTo({ top: y, behavior: reduce() ? 'auto' : 'smooth' });
      s.setAttribute('tabindex', '-1'); s.focus({ preventScroll: true });
    }, true);
    new MutationObserver(enhanceProject).observe(pbody, { childList: true });
    pdlg.addEventListener('close', () => { if (ro) ro.disconnect(); if (boxRO) boxRO.disconnect(); });
  }
})();
