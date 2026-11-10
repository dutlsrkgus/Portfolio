/* 연출 — 사이드바(접기·펼치기·모바일 서랍), 변신 인트로, 차례로 나타나기, 우주 오르골 BGM */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const body = document.body;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} }
  };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = () => window.CharaFx || { mood() {}, wave() {} };

  /* ═════════ 사이드바 ═════════
     데스크톱(1200px~): 펼친 상태가 기본 · 태블릿(768~1199px): 접힌 아이콘 바가 기본 · 모바일(~767px): 햄버거로 여는 서랍 */
  const mqMobile = matchMedia('(max-width: 767px)');
  const mqTablet = matchMedia('(max-width: 1199px)');
  const toggle = $('side-toggle'), menuBtn = $('menu-btn'), backdrop = $('side-backdrop'), side = $('side');
  let pref = store.get('gh-side');           // 'collapsed' | 'expanded' | null(화면 크기에 맞춤)

  function applySide() {
    const mobile = mqMobile.matches;
    if (mobile) {
      body.classList.remove('side-collapsed');
      toggle.querySelector('.side-label').textContent = '메뉴 닫기';
      toggle.setAttribute('aria-expanded', String(body.classList.contains('side-open')));
    } else {
      closeDrawer(true);
      const collapsed = pref ? pref === 'collapsed' : mqTablet.matches;
      body.classList.toggle('side-collapsed', collapsed);
      toggle.querySelector('.side-label').textContent = collapsed ? '사이드바 펼치기' : '사이드바 접기';
      toggle.setAttribute('aria-expanded', String(!collapsed));
      toggle.title = collapsed ? '사이드바 펼치기' : '사이드바 접기';
    }
  }
  function openDrawer() {
    body.classList.add('side-open'); backdrop.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-expanded', 'true');
    const cur = side.querySelector('[aria-current="page"]') || side.querySelector('a');
    if (cur) cur.focus();
  }
  function closeDrawer(silent) {
    if (!body.classList.contains('side-open')) return;
    body.classList.remove('side-open'); backdrop.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    if (!silent) menuBtn.focus();
  }
  toggle.addEventListener('click', () => {
    if (mqMobile.matches) { closeDrawer(); return; }
    pref = body.classList.contains('side-collapsed') ? 'expanded' : 'collapsed';
    store.set('gh-side', pref); applySide();
  });
  menuBtn.addEventListener('click', () => (body.classList.contains('side-open') ? closeDrawer() : openDrawer()));
  backdrop.addEventListener('click', () => closeDrawer());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('side-open')) closeDrawer(); });
  side.addEventListener('click', (e) => { if (mqMobile.matches && e.target.closest('a[href^="#"]')) closeDrawer(true); });
  [mqMobile, mqTablet].forEach((mq) => (mq.addEventListener ? mq.addEventListener('change', applySide) : mq.addListener(applySide)));
  applySide();

  /* 사이드바 미니 프로필 */
  const P = (window.PORTFOLIO && window.PORTFOLIO.profile) || {};
  $('side-mini').innerHTML = window.Chara ? window.Chara.svg() : '';
  $('side-name').textContent = P.name || '';
  $('side-role').textContent = (P.grad || '').replace(/^.*·\s*/, '') || '포트폴리오';

  /* ═════════ 우주 오르골 BGM (Web Audio로 직접 연주하는 오리지널 곡) ═════════ */
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, bus = null, playing = false, timer = null, step = 0, cycle = 0, nextTime = 0;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const EIGHTH = 60 / 66 / 2;                       // 66 BPM, 8분음표
  const BARS = [                                    // Fmaj7 → Em7 → Dm9 → Cmaj7
    { arp: [65, 69, 72, 76, 79, 76, 72, 69], pad: [53, 60, 64] },
    { arp: [64, 67, 71, 74, 76, 74, 71, 67], pad: [52, 59, 62] },
    { arp: [62, 65, 69, 72, 76, 72, 69, 65], pad: [50, 57, 60] },
    { arp: [60, 64, 67, 71, 74, 71, 67, 64], pad: [48, 55, 59] }
  ];
  const MEL_A = [[[0, 84], [3, 81], [6, 79]], [[0, 83], [4, 79], [6, 76]], [[0, 81], [2, 84], [4, 86], [6, 84]], [[0, 79], [2, 83], [4, 84]]];
  const MEL_B = [[[0, 88]], [[2, 86]], [[0, 84], [4, 81]], [[0, 83], [6, 79]]];

  function impulse(sec, decay) {
    const len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function initAudio() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    bus = ctx.createGain(); bus.gain.value = 1;
    const dry = ctx.createGain(); dry.gain.value = .7;
    const rev = ctx.createConvolver(); rev.buffer = impulse(3.4, 2.6);
    const wet = ctx.createGain(); wet.gain.value = .55;
    bus.connect(dry); dry.connect(master); bus.connect(rev); rev.connect(wet); wet.connect(master);
    return true;
  }
  /* 오르골 소리: 맑은 사인파 + 금속성 배음, 빠르게 사라지는 울림 */
  function tine(t, m, vel, out) {
    const f = mtof(m);
    [[1, 1, 2.2], [2, .26, .8], [4.2, .1, .22]].forEach(([mul, amp, dec]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * mul;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp * vel * .22, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + dec);
      o.connect(g); g.connect(out || bus); o.start(t); o.stop(t + dec + .05);
    });
  }
  /* 우주 배경음: 아주 작게 깔리는 부드러운 패드 */
  function pad(t, notes, dur) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(bus);
    notes.forEach((m) => [-4, 4].forEach((det) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = mtof(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.018, t + 1.4); g.gain.setValueAtTime(.018, t + dur - 1); g.gain.linearRampToValueAtTime(0, t + dur + .6);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + .7);
    }));
  }
  function schedule() {
    while (nextTime < ctx.currentTime + .3) {
      const bar = Math.floor(step / 8) % 4, s = step % 8, B = BARS[bar];
      const t = nextTime + (Math.random() - .5) * .012;
      if (s === 0) pad(nextTime, B.pad, EIGHTH * 8);
      const shape = [.75, .45, .5, .42, .55, .4, .46, .38][s];
      if (!(cycle % 4 === 3 && s % 2 === 1)) tine(t, B.arp[s], shape);
      const mel = cycle % 4 === 1 ? MEL_A : cycle % 4 === 2 ? MEL_B : cycle % 4 === 3 ? MEL_A : null;
      if (mel) mel[bar].forEach(([st, m]) => { if (st === s) tine(t + .01, m, .95); });
      step++; if (step % 32 === 0) cycle++;
      nextTime += EIGHTH;
    }
  }
  async function startBgm() {
    if (!initAudio()) { setBgmUI(false, '이 브라우저에서는 소리를 낼 수 없어요'); return; }
    try { await ctx.resume(); } catch (_) {}
    if (playing) return;
    playing = true; step = 0; cycle = 0; nextTime = ctx.currentTime + .15;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(.9, ctx.currentTime + 2.5);
    timer = setInterval(schedule, 60); schedule();
    setBgmUI(true);
  }
  function stopBgm() {
    if (!ctx || !playing) { setBgmUI(false); return; }
    playing = false; clearInterval(timer);
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + .8);
    setBgmUI(false);
  }
  function setBgmUI(on, note) {
    body.classList.toggle('bgm-on', on);
    document.querySelectorAll('.bgm-toggle').forEach((b) => {
      b.setAttribute('aria-pressed', String(on));
      b.title = note || (on ? '우주 오르골 BGM 끄기' : '우주 오르골 BGM 켜기');
      const l = b.querySelector('.side-label'); if (l) l.textContent = on ? '오르골 BGM 끄기' : '오르골 BGM 켜기';
    });
  }
  document.querySelectorAll('.bgm-toggle').forEach((b) => b.addEventListener('click', () => {
    if (playing) { stopBgm(); store.set('gh-bgm', 'off'); } else { startBgm(); store.set('gh-bgm', 'on'); }
  }));
  /* 지난번에 켜 두었다면, 처음 화면을 누르는 순간 다시 켜기 (브라우저는 사용자 동작 없이 소리를 못 내요) */
  if (store.get('gh-bgm') === 'on') {
    const arm = (e) => {
      if (e.target.closest && e.target.closest('.bgm-toggle')) return;
      document.removeEventListener('pointerdown', arm, true); document.removeEventListener('keydown', arm, true);
      startBgm();
    };
    document.addEventListener('pointerdown', arm, true); document.addEventListener('keydown', arm, true);
  }
  setBgmUI(false);
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !playing) return;
    if (document.hidden) ctx.suspend(); else { ctx.resume(); nextTime = Math.max(nextTime, ctx.currentTime + .1); }
  });

  /* 효과음: 휭(바람 소리) + 반짝(오르골 상행) — 사용자가 누른 뒤에만 */
  function whoosh() {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime, len = ctx.sampleRate;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(3800, t + .45); bp.frequency.exponentialRampToValueAtTime(700, t + .95);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.35, t + .35); g.gain.exponentialRampToValueAtTime(.001, t + 1);
    src.connect(bp); bp.connect(g); g.connect(ctx.destination); src.start(t); src.stop(t + 1.05);
  }
  function chime() {
    if (!ctx || ctx.state !== 'running') return;
    const g = ctx.createGain(); g.gain.value = 1.6; g.connect(ctx.destination);
    [79, 83, 86, 91, 95, 98].forEach((m, i) => tine(ctx.currentTime + i * .06, m, .9, g));
  }

  /* ═════════ 변신 인트로 ═════════ */
  const warp = $('warp');
  let warpTimers = [];
  function heroIn() { body.classList.add('hero-in'); setTimeout(startReveal, reduce ? 0 : 1100); }
  function endWarp() {
    warpTimers.forEach(clearTimeout); warpTimers = [];
    warp.classList.remove('play'); warp.classList.add('leave');
    whoosh();
    warpTimers.push(setTimeout(() => {
      warp.hidden = true; warp.classList.remove('leave');
      document.documentElement.classList.remove('warp-boot');
      body.classList.remove('warp-on');
      heroIn(); fx().mood('happy'); fx().wave();
      setTimeout(() => fx().mood('smile'), 1800);
    }, 650));
  }
  function startWarp() {
    if (reduce) { document.documentElement.classList.remove('warp-boot'); heroIn(); return; }
    warpTimers.forEach(clearTimeout); warpTimers = [];
    if (!$('warp-chara').firstChild && window.Chara) $('warp-chara').innerHTML = window.Chara.svg();
    $('warp-burst').innerHTML = Array.from({ length: 22 }, (_, i) => {
      const a = (360 / 22) * i + Math.random() * 10, d = 120 + Math.random() * 160, s = 8 + Math.random() * 14;
      const c = ['#fff', '#fde3a0', '#F8B9D2', '#9CBEFF', '#B9D8FF'][i % 5];
      return `<span style="--a:${a}deg;--d:${d}px;--s:${s}px;--c:${c}"></span>`;
    }).join('');
    body.classList.remove('hero-in');
    body.classList.add('warp-on');
    warp.hidden = false; warp.classList.remove('leave', 'play'); void warp.offsetWidth; warp.classList.add('play');
    fx().mood('surprised');
    warpTimers.push(setTimeout(() => fx().mood('excited'), 900));
    warpTimers.push(setTimeout(() => { fx().mood('love'); chime(); }, 1750));
    warpTimers.push(setTimeout(endWarp, 3000));
  }
  $('warp-skip').addEventListener('click', endWarp);
  $('intro-btn').addEventListener('click', () => {
    if (mqMobile.matches) closeDrawer(true);
    if (location.hash && location.hash !== '#home') location.hash = '#home';
    initAudio(); if (ctx) ctx.resume();
    startWarp();
  });
  const h = location.hash.slice(1);
  if (!h || h === 'home') startWarp(); else { document.documentElement.classList.remove('warp-boot'); heroIn(); }

  /* ═════════ 스크롤하면 차례로 나타나기 ═════════
     인트로가 끝나고 표지가 차례로 내려온 다음부터 관찰을 시작해요 (인트로 뒤에서 미리 끝나 버리지 않도록) */
  let revealStarted = false;
  function startReveal() {
    if (revealStarted) return; revealStarted = true;
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window) || reduce) { items.forEach((el) => el.classList.add('in')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));
  }
})();
